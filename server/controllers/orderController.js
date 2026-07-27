const Order = require("../models/Order");
const { parseOrderDetails } = require("../utils/parser");
const { sendNotificationToApprovedUsers } = require("../utils/webPush");
const { emitOrderUpdate } = require("../utils/socketBroadcast");

// প্যাটার্ন: একাধিক অর্ডার আলাদা করার জন্য (WhatsApp/Messenger টাইমস্ট্যাম্প ট্যাগ)
const MULTIPLE_ORDERS_PATTERN =
  /\[\d{1,2}\/\d{1,2},\s\d{1,2}:\d{2}\s(?:AM|PM|am|pm)\]\s[^:]+:\s?/g;

// --- GET /api/orders - সব অর্ডার লিস্ট করা (মডারেটর শুধু নিজের তৈরি অর্ডার দেখবে) ---
exports.getOrders = async (req, res) => {
  try {
    // সঠিক টাইমজোন মেইনটেইন করে ২ দিন আগের সময় বের করা
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    // ✅ মডারেটর হলে শুধু নিজের তৈরি অর্ডার দেখতে পাবে, এডমিন সব দেখবে
    // মডারেটর নিজের তৈরি অর্ডার + "মালিকহীন" অর্ডার (যেমন ল্যান্ডিং পেজ থেকে আসা, যেটা
    // কোনো নির্দিষ্ট মডারেটরের না, শেয়ার্ড পেন্ডিং কিউ হিসেবে সবাই দেখবে) — দুটোই দেখবে
    const ownershipFilter =
      req.user.role === "moderator"
        ? { $or: [{ createdBy: req.user._id }, { createdBy: null }] }
        : {};

    const orders = await Order.aggregate([
      { $match: ownershipFilter },
      // ১. last activity বের করা
      {
        $addFields: {
          lastActivityTime: { $arrayElemAt: ["$activities.timestamp", -1] },
        },
      },
      // ২. filter: Cancelled/Booked শুধু সাম্প্রতিক ২ দিনের, বাকি সব status-এর সবগুলো
      {
        $match: {
          $or: [
            {
              orderStatus: { $in: ["Cancelled", "Booked"] },
              lastActivityTime: { $gte: twoDaysAgo },
            },
            { orderStatus: { $nin: ["Cancelled", "Booked"] } },
          ],
        },
      },
      // ৩. সর্বশেষ activity অনুযায়ী সর্ট
      { $sort: { lastActivityTime: -1 } },
    ]);

    return res.status(200).json(orders || []);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ message: "Failed to fetch orders." });
  }
};

// ইনপুট টেক্সট থেকে একাধিক অর্ডার আলাদা করে প্রতিটির জন্য বেসিক ফিল্ড বের করা
function extractOrdersFromRawText(rawInputText,user) {
  let rawOrders = rawInputText
    .split(MULTIPLE_ORDERS_PATTERN)
    .filter((content) => content.trim().length >= 11);

  if (rawOrders.length === 0) {
    rawOrders = [rawInputText];
  }

  const ordersToSave = [];

  rawOrders.forEach((order) => {
    const words = order.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    const isLastWordNumber = /^\d+$/.test(lastWord);
    const totalCOD = isLastWordNumber
      ? lastWord.length < 6
        ? lastWord
        : "0"
      : "0";
    const productCode = words.length >= 2 ? words[words.length - 2] : "empty";
    const parsedData = parseOrderDetails(order);

    if (parsedData.castomerName && parsedData.castomerPhone) {
      ordersToSave.push({
        rawInputText: order,
        castomerName: parsedData.castomerName,
        castomerPhone: parsedData.castomerPhone,
        productCode,
        totalCOD,
        activities: [
          {
            author: user.name,
            type: "Order Created",
            description:
              rawOrders.length > 1
                ? `Bulk created by ${user.name}`
                : `Manual single created by ${user.name}`,
          },
        ],
      });
    }
  });

  return ordersToSave;
}

// একই ফোন নম্বরে আগে কতগুলো অর্ডার হয়েছে তা বের করে প্রতিটি অর্ডারে courierHistory.our সেট করা
async function attachCourierHistory(ordersToSave) {
  const phoneNumbers = ordersToSave.flatMap((o) => o.castomerPhone);

  const historyData = await Order.aggregate([
    { $unwind: "$castomerPhone" },
    { $match: { castomerPhone: { $in: phoneNumbers } } },
    { $group: { _id: "$castomerPhone", count: { $sum: 1 } } },
  ]);

  const historyMap = {};
  historyData.forEach((item) => {
    historyMap[item._id] = item.count;
  });

  return ordersToSave.map((order) => {
    let totalPreviousCount = 0;
    order.castomerPhone.forEach((num) => {
      totalPreviousCount += historyMap[num] || 0;
    });
    return {
      ...order,
      courierHistory: { our: totalPreviousCount.toString() },
    };
  });
}

// --- POST /api/orders/manual-single - ম্যানুয়াল অর্ডার সেভ করা ---
exports.createManualOrder = async (req, res) => {
  const io = req.app.get("io");

  try {
    const { rawInputText } = req.body;
    if (!rawInputText) {
      return res.status(400).json({
        message: "Raw input text are required.",
        status: "error",
      });
    }
    // activities
    const ordersToSave = extractOrdersFromRawText(rawInputText, req.user);

    if (ordersToSave.length === 0) {
      return res.status(400).json({
        message:
          "Parsing failed. Could not identify valid order in the provided text.",
      });
    }

    const ordersWithHistory = await attachCourierHistory(ordersToSave);

    // ✅ কে অর্ডারটা তৈরি করেছে তা সেভ করা (মডারেটরের visibility filter করার জন্য দরকার)
    const ordersWithOwner = ordersWithHistory.map((order) => ({
      ...order,
      createdBy: req.user._id,
      createdByName: req.user.name,
    }));

    const savedOrders = await Order.insertMany(ordersWithOwner);
    if (io) {
      savedOrders.forEach((order) => emitOrderUpdate(io, order));
    }

    // --- Push Notification: নতুন অর্ডার এলে সব approved ইউজারকে জানানো ---
    sendNotificationToApprovedUsers({
      title: "🛒 নতুন অর্ডার এসেছে",
      body:
        savedOrders.length > 1
          ? `${savedOrders.length}টি নতুন অর্ডার তৈরি হয়েছে।`
          : `${savedOrders[0]?.castomerName || "নতুন অর্ডার"} - ৳${savedOrders[0]?.totalCOD}`,
      url: "/",
    }).catch((err) => console.error("Order notification error:", err));

    return res.status(201).json({
      message: `${savedOrders.length} orders created`,
      order: savedOrders,
    });
  } catch (error) {
    console.error("Error saving manual order:", error);
    return res
      .status(500)
      .json({ message: "Server error while processing order." });
  }
};

// --- DELETE /api/orders/delete/:id ---
exports.deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const deletedOrder = await Order.findByIdAndDelete(orderId);
    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }
    return res.status(200).json({ message: "সফলভাবে ডিলিট করা হয়েছে" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return res
      .status(500)
      .json({ message: "Server error while deleting order." });
  }
};

// --- PUT /api/orders/update-order/:id ---
exports.updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const data = {
      ...req.body,
      $push: {
        activities: {
          description: "address updated",
          type: " Updated",
          changedAt: new Date(),
        },
      },
    };
    const updatedOrder = await Order.findByIdAndUpdate(orderId, data, {
      new: true,
    });
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }
    return res
      .status(200)
      .json({ message: "সফলভাবে অপডেট করা হয়েছে", order: updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    return res
      .status(500)
      .json({ message: "Server error while updating order." });
  }
};

// --- PATCH /api/orders/update-need-attention/:id ---
exports.updateNeedAttention = async (req, res) => {
  try {
    const orderId = req.params.id;
    const io = req.app.get("io");

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { needsAttention: false },
      { new: true },
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (io) emitOrderUpdate(io, updatedOrder);
    return res.status(200).json({ updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    return res
      .status(500)
      .json({ message: "Server error while updating order." });
  }
};

// --- PATCH /api/orders/order-schedule/:orderId ---
exports.scheduleOrder = async (req, res) => {
  const io = req.app.get("io");
  const { orderId } = req.params;
  const { scheduledDate, noteText } = req.body;

  if (!scheduledDate) {
    return res
      .status(400)
      .json({ status: false, message: "অনুগ্রহ করে একটি সঠিক তারিখ দিন।" });
  }
  if (!orderId) {
    return res.status(400).json({ status: false, message: "order id missing" });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ status: false, message: "অর্ডারটি খুঁজে পাওয়া যায়নি।" });
    }

    const formattedDate = new Date(scheduledDate);
    if (isNaN(formattedDate.getTime())) {
      return res
        .status(400)
        .json({ status: false, message: "তারিখের ফরম্যাটটি সঠিক নয়।" });
    }

    order.orderStatus = "Scheduled";
    order.scheduledDate = formattedDate;

    const displayDate = formattedDate.toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const activityDescription =
      noteText && noteText.trim() !== ""
        ? `অর্ডারটি ${displayDate} তারিখের জন্য শিডিউল করা হয়েছে। নোট: ${noteText}`
        : `অর্ডারটি ${displayDate} তারিখের জন্য শিডিউল করা হয়েছে।`;

    order.activities.push({
      actor: req.user.name,
      type: "Status Updated",
      description: activityDescription,
      changedAt: new Date(),
    });

    const updatedOrder = await order.save();

    if (io) emitOrderUpdate(io, updatedOrder);

    return res.status(200).json({
      status: true,
      message: "অর্ডারটি সফলভাবে শিডিউল করা হয়েছে!",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error scheduling order:", error);
    return res
      .status(500)
      .json({ message: "সার্ভার ত্রুটি! আবার চেষ্টা করুন।" });
  }
};

// --- POST /api/orders/webhook/steadfast (booking-time webhook, orderRoutes-এ ছিল) ---
exports.steadfastBookingWebhook = async (req, res) => {
  const io = req.app.get("io");
  const {
    consignment_id,
    invoice,
    status,
    notification_type,
    tracking_message,
  } = req.body;

  try {
    const updateData = {
      $push: {
        activities: {
          author: "Steadfast",
          type: notification_type,
          description: tracking_message,
        },
      },
    };

    if (status) {
      updateData.$set = { "courier.bookingStatus": status };
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { $or: [{ _id: invoice }, { "courier.trackingId": consignment_id }] },
      updateData,
      { new: true },
    );

    if (updatedOrder) {
      if (io) emitOrderUpdate(io, updatedOrder);
      return res
        .status(200)
        .json({ success: true, message: "Webhook processed" });
    }

    return res.status(404).json({ success: false, message: "Order not found" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
