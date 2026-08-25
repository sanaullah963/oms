const Order = require("../models/Order");
const DraftOrder = require("../models/DraftOrder");
const LandingPage = require("../models/LandingPage");
const { parseOrderDetails } = require("../utils/parser");
const { sendNotificationToApprovedUsers } = require("../utils/webPush");
const {
  emitOrderUpdate,
  emitDraftRemove,
} = require("../utils/socketBroadcast");
const { withLandingPageMeta } = require("../utils/draftOrderView");
const { checkFraudSignals } = require("../utils/fraudDetection");

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

    // const orders = await Order.aggregate([
    //   { $match: ownershipFilter },
    //   // ১. last activity বের করা
    //   {
    //     $addFields: {
    //       lastActivityTime: { $arrayElemAt: ["$activities.timestamp", -1] },
    //     },
    //   },
    //   // ২. filter: Cancelled/Booked শুধু সাম্প্রতিক ২ দিনের, বাকি সব status-এর সবগুলো
    //   {
    //     $match: {
    //       $or: [
    //         {
    //           orderStatus: { $in: ["Booked"] },
    //           lastActivityTime: { $gte: twoDaysAgo },
    //         },
    //         { orderStatus: { $nin: ["Cancelled", "Booked"] } },
    //       ],
    //     },
    //   },
    //   // ৩. সর্বশেষ activity অনুযায়ী সর্ট
    //   { $sort: { lastActivityTime: -1 } },
    // ]);

    const orders = await Order.aggregate([
  { $match: ownershipFilter },
  // ১. last activity বের করা
  {
    $addFields: {
      lastActivityTime: { $arrayElemAt: ["$activities.timestamp", -1] },
    },
  },
  // ২. filter: শেষ ২ দিনের activity, কিন্তু fully-finalized অর্ডার বাদ
  {
    $match: {
      lastActivityTime: { $gte: twoDaysAgo },
      $nor: [
        {
          orderStatus: { $in: ["Cancelled", "Delivered"] },
          "courier.courierStatus": { $in: ["Cancelled", "Delivered"] },
        },
      ],
    },
  },
  // ৩. সর্বশেষ activity অনুযায়ী সর্ট
  { $sort: { lastActivityTime: -1 } },
]);
    console.log("Orders fetched successfully:", orders.length);
    return res.status(200).json(orders || []);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ message: "Failed to fetch orders." });
  }
};

// ইনপুট টেক্সট থেকে একাধিক অর্ডার আলাদা করে প্রতিটির জন্য বেসিক ফিল্ড বের করা
function extractOrdersFromRawText(rawInputText, user) {
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

    // 🔍 ফ্রড/ডুপ্লিকেট ডিটেকশন: ম্যানুয়ালি পেস্ট করা অর্ডারে fingerprint/IP/FB
    // ট্র্যাকিং ডেটা থাকে না, তাই এখানে শুধু ফোন নম্বর ম্যাচিং চেক করা হয় — আগের
    // কোনো অর্ডারে (ল্যান্ডিং পেজ বা ম্যানুয়াল, দুই ক্ষেত্রেই) একই ফোন নম্বর থাকলে
    // ফ্ল্যাগ হবে। কাউকে অটোমেটিক ব্লক করা হয় না।
    for (const order of savedOrders) {
      try {
        const phone = order.castomerPhone?.[0];
        if (!phone) continue;
        const fraudResult = await checkFraudSignals({
          phone,
          excludeOrderId: order._id,
        });
        if (fraudResult.isSuspicious) {
          order.fraudCheck = {
            isSuspicious: true,
            reasons: fraudResult.reasons,
            reviewStatus: "pending",
          };
          await order.save();
        }
      } catch (fraudErr) {
        console.error("Fraud detection error (manual order):", fraudErr);
      }
    }

    if (io) {
      savedOrders.forEach((order) => emitOrderUpdate(io, order));
    }

    // --- Push Notification: নতুন অর্ডার এলে সব approved ইউজারকে জানানো ---
    sendNotificationToApprovedUsers({
      title: "🛒 নতুন অর্ডার এসেছে",
      body:
        savedOrders.length > 1
          ? `${savedOrders.length} orders added by ${req.user.name}`
          : `${savedOrders[0]?.castomerName || "নতুন অর্ডার"} - ৳${savedOrders[0]?.totalCOD} -- added by ${req.user.name}`,
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

    // if (status) {
    //   updateData.$set = { "courier.bookingStatus": status };
    // }
    if (status) {
      updateData.$set = { "courier.courierStatus": status };
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

// --- GET /api/orders/drafts — "ইনকমপ্লিট" (ড্রাফট) অর্ডার লিস্ট ---
// এগুলো এখনো আসল Order না — কাস্টমার ল্যান্ডিং পেজের ফর্ম পূরণ করেছে কিন্তু এখনো
// সাবমিট করেনি। সাবমিট করলেই এটা "completed" হয়ে যায় এবং এই লিস্ট থেকে বাদ পড়ে
// (ততক্ষণে আসল Order আলাদাভাবে orders লিস্টে চলে আসে) — তাই এখানে কখনো ডুপ্লিকেট
// দেখা যাবে না। ল্যান্ডিং পেজ অর্ডারের মতোই এটা শেয়ার্ড কিউ — কোনো নির্দিষ্ট
// মডারেটরের না, তাই admin/moderator সবাই একই লিস্ট দেখে।
exports.getDraftOrders = async (req, res) => {
  try {
    const drafts = await DraftOrder.find({ status: "active" })
      .sort({ lastActivityAt: -1, updatedAt: -1 })
      .limit(200);

    const slugs = [
      ...new Set(drafts.map((draft) => draft.landingPageSlug).filter(Boolean)),
    ];
    const pages = await LandingPage.find({ slug: { $in: slugs } }).select(
      "slug productName productCode price freeDelivery deliveryChargeInsideDhaka deliveryChargeOutsideDhaka productTypes",
    );
    const pageMap = new Map(pages.map((page) => [page.slug, page]));
    const result = drafts.map((draft) =>
      withLandingPageMeta(draft, pageMap.get(draft.landingPageSlug)),
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get draft orders error:", error);
    return res
      .status(500)
      .json({ message: "ড্রাফট অর্ডার আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- DELETE /api/orders/drafts/:id — একটা ড্রাফট ডাটাবেজ থেকে সম্পূর্ণ ডিলিট করা ---
exports.dismissDraftOrder = async (req, res) => {
  try {
    const draft = await DraftOrder.findByIdAndDelete(req.params.id);

    if (!draft) {
      return res.status(404).json({ message: "ড্রাফট খুঁজে পাওয়া যায়নি।" });
    }

    const io = req.app.get("io");
    if (io) emitDraftRemove(io, draft._id);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete draft order error:", error);
    return res
      .status(500)
      .json({ message: "ড্রাফট ডিলিট করতে ব্যর্থ হয়েছে।" });
  }
};
// --- PATCH /api/orders/:id/fraud-review — অ্যাডমিন/মডারেটর একটা অর্ডারের ফ্রড
// ডিটেকশন Badge/Modal দেখে ম্যানুয়ালি সিদ্ধান্ত নেয়: approve (স্বাভাবিক অর্ডার,
// দুশ্চিন্তার কিছু নেই) / ignore (এখনকার মতো উপেক্ষা করো) / block (কাস্টমারকে
// BlockedCustomer লিস্টে যোগ করো, যাতে ভবিষ্যতে ল্যান্ডিং পেজে Popup দেখানো হয়)।
// এখানেই একমাত্র জায়গা যেখানে BlockedCustomer তৈরি হতে পারে — সিস্টেম কখনো নিজে
// থেকে কাউকে ব্লক করে না।
const BlockedCustomer = require("../models/BlockedCustomer");

exports.reviewFraudOrder = async (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'approve' | 'ignore' | 'block'
    if (!["approve", "ignore", "block"].includes(action)) {
      return res
        .status(400)
        .json({ message: "action অবশ্যই approve/ignore/block হতে হবে।" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "অর্ডার খুঁজে পাওয়া যায়নি।" });
    }

    const reviewStatus =
      action === "approve"
        ? "approved"
        : action === "ignore"
          ? "ignored"
          : "blocked";

    order.fraudCheck.reviewStatus = reviewStatus;
    order.fraudCheck.reviewedBy = req.user._id;
    order.fraudCheck.reviewedByName = req.user.name;
    order.fraudCheck.reviewedAt = new Date();
    order.activities.push({
      author: req.user.name,
      type: "Fraud Review",
      description: `ফ্রড ডিটেকশন রিভিউ: ${reviewStatus}${reason ? ` — ${reason}` : ""}`,
    });

    if (action === "block") {
      await BlockedCustomer.create({
        phone: order.castomerPhone?.[0] || null,
        fingerprintHash: order.tracking?.fingerprintHash || null,
        ip: order.tracking?.ip || null,
        fbp: order.tracking?.fbp || null,
        fbc: order.tracking?.fbc || null,
        fbclid: order.tracking?.fbclid || null,
        castomerName: order.castomerName,
        sourceOrderId: order._id,
        reason:
          reason ||
          "Fraud/duplicate detection থেকে ম্যানুয়ালি ব্লক করা হয়েছে",
        blockedBy: req.user._id,
        blockedByName: req.user.name,
      });
    }

    await order.save();

    const io = req.app.get("io");
    if (io) emitOrderUpdate(io, order);

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Review fraud order error:", error);
    return res
      .status(500)
      .json({ message: "ফ্রড রিভিউ সেভ করতে ব্যর্থ হয়েছে।" });
  }
};

// --- GET /api/orders/:id/fraud-matches — Fraud Detection Modal-এর জন্য ম্যাচ হওয়া
// আগের অর্ডারগুলোর বিস্তারিত তথ্য (ডেলিভারি/কুরিয়ার স্ট্যাটাসসহ) রিটার্ন করে। শুধু আইডি
// সেভ থাকে order.fraudCheck.reasons-এ, তাই দেখানোর সময় এখান থেকে পুরো তথ্য আনতে হয়। ---
exports.getFraudMatches = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select("fraudCheck");
    if (!order) {
      return res.status(404).json({ message: "অর্ডার খুঁজে পাওয়া যায়নি।" });
    }

    const reasons = order.fraudCheck?.reasons || [];
    const allIds = [
      ...new Set(reasons.flatMap((r) => (r.matchedOrderIds || []).map(String))),
    ];

    const matchedOrders = await Order.find({ _id: { $in: allIds } })
      // .select(
      //   "castomerName castomerPhone productCode totalCOD orderStatus orderSource courier.courierStatus courier.bookingStatus createdAt",
      // )
      // .sort({ createdAt: -1 })
      // .lean();
      .select(
        "castomerName castomerPhone productCode totalCOD orderStatus orderSource courier.courierStatus courier.courierStatus createdAt",
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ reasons, matchedOrders });
  } catch (error) {
    console.error("Get fraud matches error:", error);
    return res
      .status(500)
      .json({ message: "ম্যাচ হওয়া অর্ডারের তথ্য আনতে ব্যর্থ হয়েছে।" });
  }
};
