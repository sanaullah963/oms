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
const { buildActivity, logActivity } = require("../utils/activityLogger");
const mongoose = require("mongoose");
const axios = require("axios");
const convertNumber = require("../utils/convertNumber");
const { BDCOURIER_SECRET_KEY } = require("../config/env");

// প্যাটার্ন: একাধিক অর্ডার আলাদা করার জন্য (WhatsApp/Messenger টাইমস্ট্যাম্প ট্যাগ)
const MULTIPLE_ORDERS_PATTERN =
  /\[\d{1,2}\/\d{1,2},\s\d{1,2}:\d{2}\s(?:AM|PM|am|pm)\]\s[^:]+:\s?/g;

// --- GET /api/orders/master-search?q=... - পার্সেল ID (_id), courier.trackingId, বা ফোন
// নম্বর দিয়ে সরাসরি খুঁজে সব ম্যাচিং অর্ডার একসাথে রিটার্ন করে (মাস্টার সার্চ পেজের জন্য) ---
exports.masterSearchOrders = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      return res.status(200).json({ orders: [] });
    }

    const ownershipFilter =
      req.user.role === "moderator"
        ? { $or: [{ createdBy: req.user._id }, { createdBy: null }] }
        : {};

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const orConditions = [
      { "courier.trackingId": { $regex: regex } },
      { castomerPhone: { $regex: regex } },
    ];

    // q যদি বৈধ MongoDB ObjectId হয়, তাহলে _id দিয়েও (পার্সেল/অর্ডার ID) খোঁজা হবে
    if (mongoose.Types.ObjectId.isValid(q)) {
      orConditions.push({ _id: q });
    }

    const orders = await Order.find({
      $and: [ownershipFilter, { $or: orConditions }],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Master search error:", error);
    return res.status(500).json({ message: "সার্চ করতে ব্যর্থ হয়েছে।" });
  }
};

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
    //   // ২. filter: শেষ ২ দিনের activity, কিন্তু fully-finalized অর্ডার বাদ
    //   {
    //     $match: {
    //       lastActivityTime: { $gte: twoDaysAgo },
    //       $nor: [
    //         {
    //           orderStatus: { $in: ["Cancelled", "Delivered"] },
    //           "courier.courierStatus": {
    //             $in: ["cancelled", "delivered", "partial_delivered"],
    //           },
    //         },
    //       ],
    //     },
    //   },
    //   // ৩. সর্বশেষ activity অনুযায়ী সর্ট
    //   { $sort: { lastActivityTime: -1 } },
    // ]);

    //  const orders = await Order.aggregate([
    //       { $match: ownershipFilter },
    //       {
    //         $match: {
    //           "courier.courierStatus": {
    //             $nin: ["cancelled", "delivered", "partial_delivered"],
    //           },
    //         },
    //       },
    //       // ২. last activity বের করা
    //       {
    //         $addFields: {
    //           lastActivityTime: { $arrayElemAt: ["$activities.timestamp", -1] },
    //         },
    //       },
    //       // ৩. orderStatus "Cancelled"/"Delivered" হলে শুধু শেষ ২ দিনের মধ্যে activity
    //       // থাকলেই পাঠানো হবে (পুরোনো হয়ে গেলে ড্যাশবোর্ড থেকে সরে যাবে)। এর বাইরে বাকি
    //       // সব orderStatus-এর অর্ডার কোনো টাইম-লিমিট ছাড়াই সবসময় পাঠানো হবে।
    //       {
    //         $match: {
    //           $or: [
    //             { orderStatus: { $nin: ["Cancelled", "Delivered"] } },
    //             {
    //               orderStatus: { $in: ["Cancelled", "Delivered"] },
    //               lastActivityTime: { $gte: twoDaysAgo },
    //             },
    //           ],
    //         },
    //       },
    //       // ৪. সর্বশেষ activity অনুযায়ী সর্ট
    //       { $sort: { lastActivityTime: -1 } },
    //     ]);

    const orders = await Order.aggregate([
      { $match: ownershipFilter },
      // ১. courier.courierStatus চূড়ান্তভাবে শেষ (cancelled/delivered/partial_delivered)
      // হলে সেই অর্ডার আর ফ্রন্টএন্ডে পাঠানো হবে না — orderStatus যাই থাকুক না কেন,
      // কুরিয়ারের ফাইনাল স্ট্যাটাসই এখানে সিদ্ধান্ত নেয়।
      {
        $match: {
          "courier.courierStatus": {
            $nin: ["cancelled", "delivered", "partial_delivered"],
          },
        },
      },
      // ২. last activity বের করা
      {
        $addFields: {
          lastActivityTime: { $arrayElemAt: ["$activities.timestamp", -1] },
        },
      },
      // ৩. orderStatus "Cancelled"/"Delivered"/"Booked" হলে শুধু শেষ ২ দিনের মধ্যে
      // activity থাকলেই পাঠানো হবে (পুরোনো হয়ে গেলে ড্যাশবোর্ড থেকে সরে যাবে)। এর
      // বাইরে বাকি সব orderStatus-এর অর্ডার কোনো টাইম-লিমিট ছাড়াই সবসময় পাঠানো হবে।
      {
        $match: {
          $or: [
            { orderStatus: { $nin: ["Cancelled", "Delivered", "Booked"] } },
            {
              orderStatus: { $in: ["Cancelled", "Delivered", "Booked"] },
              lastActivityTime: { $gte: twoDaysAgo },
            },
          ],
        },
      },
      // ৪. সর্বশেষ activity অনুযায়ী সর্ট
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
          buildActivity({
            author: user.name,
            type: "Order Created",
            description:
              rawOrders.length > 1
                ? `Bulk created by ${user.name}`
                : `Manual single created by ${user.name}`,
          }),
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

// --- PATCH /api/orders/:id/master-edit — মাস্টার সার্চ থেকে সীমিত কিছু ফিল্ড এডিট করা।
// ⚠️ শুধু নিচের whitelist-এর ফিল্ডগুলোই এডিট হবে — req.body-এর বাকি সব কিছু (fbp/fbc/fbclid/
// ip/userAgent/fingerprintHash/courier.responseData/fraudCheck ইত্যাদি) সম্পূর্ণ ignore করা হয়,
// এমনকি কেউ ইচ্ছাকৃতভাবে সেই ফিল্ড পাঠালেও এই ফাংশন সেগুলো পড়েই না — এটা blacklist না,
// whitelist দিয়ে করা হয়েছে যাতে ভবিষ্যতে Order মডেলে নতুন sensitive ফিল্ড যোগ হলেও সেটা
// এই এন্ডপয়েন্ট দিয়ে ফাঁক গলে এডিট হয়ে না যায়। প্রতিটা বদলানো ফিল্ডের জন্য আলাদা activity
// এন্ট্রি (কে/কবে/কোনটা/আগে কী ছিল/এখন কী হলো) — এটাই এডিট-হিস্ট্রি/audit log। ---
const MASTER_EDIT_ORDER_STATUS = [
  "Pending",
  "confirmed",
  "released",
  "Delivered",
  "Cancelled",
  "Booked",
  "Scheduled",
  "Booking Failed",
  // --- STATUS_SHORTCUTS (OrderCard.jsx) থেকে সেট হওয়া স্ট্যাটাসগুলো, যা আগে এখানে ছিল না ---
  "Confirmed",
  "Call Not Received",
  "Phone Off",
  "Custom",
];
const MASTER_EDIT_COURIER_STATUS = [
  "unknown",
  "review",
  "pending",
  "assigned",
  "delivered",
  "partial_delivered",
  "cancelled",
];

exports.masterEditOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "অর্ডারটি খুঁজে পাওয়া যায়নি।" });
    }

    const editorName = req.user?.name || "Unknown";
    const changes = []; // প্রতিটা আসল পরিবর্তনের রেকর্ড — activities-এ পুশ হবে

    const recordChange = (field, oldValue, newValue) => {
      changes.push({ field, oldValue, newValue });
    };

    // --- ১. castomerName ---
    if (
      typeof req.body.castomerName === "string" &&
      req.body.castomerName.trim() &&
      req.body.castomerName.trim() !== order.castomerName
    ) {
      recordChange(
        "castomerName",
        order.castomerName,
        req.body.castomerName.trim(),
      );
      order.castomerName = req.body.castomerName.trim();
    }

    // --- ২. castomerPhone (array) ---
    if (Array.isArray(req.body.castomerPhone)) {
      const cleaned = req.body.castomerPhone
        .map((p) => String(p).trim())
        .filter(Boolean);
      const oldJoined = (order.castomerPhone || []).join(",");
      const newJoined = cleaned.join(",");
      if (cleaned.length > 0 && oldJoined !== newJoined) {
        recordChange("castomerPhone", order.castomerPhone, cleaned);
        order.castomerPhone = cleaned;
      }
    }

    // --- ৩. productCode ---
    if (
      typeof req.body.productCode === "string" &&
      req.body.productCode.trim() &&
      req.body.productCode.trim() !== order.productCode
    ) {
      recordChange(
        "productCode",
        order.productCode,
        req.body.productCode.trim(),
      );
      order.productCode = req.body.productCode.trim();
    }

    // --- ৪. rawInputText (ঠিকানাসহ — এখন যেভাবে সেভ থাকে সেভাবেই ফ্রি-টেক্সট) ---
    if (
      typeof req.body.rawInputText === "string" &&
      req.body.rawInputText.trim() &&
      req.body.rawInputText !== order.rawInputText
    ) {
      recordChange("rawInputText", order.rawInputText, req.body.rawInputText);
      order.rawInputText = req.body.rawInputText;
    }

    // --- ৫. orderStatus ("প্রোডাক্ট স্ট্যাটাস") — ড্রপডাউন, schema enum অনুযায়ী ---
    if (
      req.body.orderStatus !== undefined &&
      req.body.orderStatus !== order.orderStatus
    ) {
      if (!MASTER_EDIT_ORDER_STATUS.includes(req.body.orderStatus)) {
        return res.status(400).json({ message: "orderStatus-এর মান সঠিক না।" });
      }
      recordChange("orderStatus", order.orderStatus, req.body.orderStatus);
      order.orderStatus = req.body.orderStatus;
    }

    // --- ৬. courier.courierStatus — ড্রপডাউন, schema enum অনুযায়ী ---
    if (
      req.body.courierStatus !== undefined &&
      req.body.courierStatus !== order.courier?.courierStatus
    ) {
      if (!MASTER_EDIT_COURIER_STATUS.includes(req.body.courierStatus)) {
        return res
          .status(400)
          .json({ message: "courierStatus-এর মান সঠিক না।" });
      }
      recordChange(
        "courier.courierStatus",
        order.courier?.courierStatus,
        req.body.courierStatus,
      );
      order.courier.courierStatus = req.body.courierStatus;
    }

    // --- ৭. courier.trackingId — কুরিয়ারের কনসাইনমেন্ট/ট্র্যাকিং আইডি ---
    if (
      typeof req.body.trackingId === "string" &&
      req.body.trackingId.trim() &&
      req.body.trackingId.trim() !== (order.courier?.trackingId || "")
    ) {
      recordChange(
        "courier.trackingId",
        order.courier?.trackingId,
        req.body.trackingId.trim(),
      );
      order.courier.trackingId = req.body.trackingId.trim();
    }

    // --- ৮-১০. কুরিয়ার থেকে আসা ফাইন্যান্সিয়াল ফিল্ড (আগে শুধু ওয়েবহুক দিয়েই সেট হতো,
    // এখন ম্যানুয়ালি ভুল হলে মাস্টার সার্চ থেকে সংশোধন করা যাবে — COD মিসম্যাচ/হিসাব
    // ঠিক করার জন্য দরকার হয় মাঝেমধ্যে) ---
    const courierNumberFields = [
      ["deliveredCodAmount", "courier.deliveredCodAmount"],
      ["deliveryCharge", "courier.deliveryCharge"],
      ["codChargeAmount", "courier.codChargeAmount"],
    ];
    for (const [bodyKey, fieldLabel] of courierNumberFields) {
      if (req.body[bodyKey] !== undefined && req.body[bodyKey] !== "") {
        const newVal = Number(req.body[bodyKey]);
        if (Number.isNaN(newVal) || newVal < 0) {
          return res
            .status(400)
            .json({ message: `${fieldLabel}-এর মান সঠিক না।` });
        }
        const courierKey = bodyKey; // courier.<courierKey>
        if (newVal !== order.courier?.[courierKey]) {
          recordChange(fieldLabel, order.courier?.[courierKey], newVal);
          order.courier[courierKey] = newVal;
        }
      }
    }

    // --- ১১. totalCOD ---
    if (
      req.body.totalCOD !== undefined &&
      req.body.totalCOD !== "" &&
      Number(req.body.totalCOD) !== order.totalCOD
    ) {
      const newTotal = Number(req.body.totalCOD);
      if (Number.isNaN(newTotal) || newTotal < 0) {
        return res.status(400).json({ message: "totalCOD-এর মান সঠিক না।" });
      }
      recordChange("totalCOD", order.totalCOD, newTotal);
      order.totalCOD = newTotal;
    }

    // --- ১২. needsAttention (হ্যাঁ/না) ---
    if (
      req.body.needsAttention !== undefined &&
      Boolean(req.body.needsAttention) !== Boolean(order.needsAttention)
    ) {
      recordChange(
        "needsAttention",
        order.needsAttention,
        Boolean(req.body.needsAttention),
      );
      order.needsAttention = Boolean(req.body.needsAttention);
    }

    // --- ১৩. permanentNote ---
    if (
      typeof req.body.permanentNote === "string" &&
      req.body.permanentNote !== (order.permanentNote || "")
    ) {
      recordChange(
        "permanentNote",
        order.permanentNote,
        req.body.permanentNote,
      );
      order.permanentNote = req.body.permanentNote;
    }

    if (changes.length === 0) {
      return res.status(200).json({ message: "কোনো পরিবর্তন হয়নি।", order });
    }

    // --- একটাই activity এন্ট্রিতে সব পরিবর্তন — কে করেছে, কী কী বদলেছে (details-এ পুরো ডিফ) ---
    await logActivity(
      order,
      {
        author: editorName,
        type: "Master Search Edit",
        description: `${editorName} ${changes.map((c) => c.field).join(", ")} পরিবর্তন করেছেন`,
        details: { changes },
      },
      { save: false },
    );

    const savedOrder = await order.save();

    const io = req.app.get("io");
    if (io) emitOrderUpdate(io, savedOrder);

    return res
      .status(200)
      .json({ message: "সফলভাবে আপডেট হয়েছে।", order: savedOrder });
  } catch (error) {
    console.error("Master edit order error:", error);
    return res.status(500).json({ message: "এডিট করতে ব্যর্থ হয়েছে।" });
  }
};

// --- PATCH /api/orders/:id/activity-edit — মাস্টার সার্চ থেকে activities লগের একটা
// নির্দিষ্ট এন্ট্রির description (নোট টেক্সট) ইন্ডিভিজুয়ালি এডিট করা। যেমন: Steadfast
// থেকে ভুল/অস্পষ্ট কোনো নোট এসে থাকলে সেটা ঠিক করে দেওয়া। activities অ্যারে থেকে
// কখনো এন্ট্রি ডিলিট/রিঅর্ডার হয় না (শুধু push হয়), তাই array index দিয়েই স্থিরভাবে
// রেফারেন্স করা যায় — প্রতিটা এন্ট্রির আলাদা _id নেই।
// ⚠️ শুধু description এডিট করা যায়, type নয় — type ("Note Solved", "Try Next",
// "Master Search Edit" ইত্যাদি) ফ্রন্টএন্ডের একাধিক জায়গায় (NoteBubble.jsx-এর
// NOTE_ACTION_TYPES ফিল্টার, activity timeline আইকন/স্টাইল) লজিক্যালি ব্যবহার হয় —
// সেটা এডিটযোগ্য করলে ভুলবশত UI ভেঙে যাওয়ার ঝুঁকি থাকে। আসল edit-history নিজেই
// activities-এ একটা নতুন "Activity Edited" এন্ট্রি হিসেবে (আগে/পরে সহ) লগ হয়। ---
exports.masterEditActivity = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "অর্ডারটি খুঁজে পাওয়া যায়নি।" });
    }

    const activityIndex = Number(req.body.activityIndex);
    const newDescription =
      typeof req.body.description === "string" ? req.body.description.trim() : "";

    if (!Number.isInteger(activityIndex) || activityIndex < 0) {
      return res.status(400).json({ message: "activityIndex সঠিক না।" });
    }
    if (!order.activities[activityIndex]) {
      return res
        .status(404)
        .json({ message: "এই ইনডেক্সে কোনো অ্যাক্টিভিটি নেই।" });
    }
    if (!newDescription) {
      return res.status(400).json({ message: "description খালি রাখা যাবে না।" });
    }

    const target = order.activities[activityIndex];
    const oldDescription = target.description;

    if (oldDescription === newDescription) {
      return res.status(200).json({ message: "কোনো পরিবর্তন হয়নি।", order });
    }

    target.description = newDescription;
    order.markModified("activities");

    const editorName = req.user?.name || "Unknown";
    await logActivity(
      order,
      {
        author: editorName,
        type: "Activity Edited",
        description: `${editorName} একটা পুরনো নোট এডিট করেছেন (${target.type || "?"})`,
        details: { activityIndex, field: "description", oldDescription, newDescription },
      },
      { save: false },
    );

    const savedOrder = await order.save();

    const io = req.app.get("io");
    if (io) emitOrderUpdate(io, savedOrder);

    return res
      .status(200)
      .json({ message: "নোট সফলভাবে এডিট হয়েছে।", order: savedOrder });
  } catch (error) {
    console.error("Master edit activity error:", error);
    return res.status(500).json({ message: "নোট এডিট করতে ব্যর্থ হয়েছে।" });
  }
};

// --- PUT /api/orders/update-order/:id ---
exports.updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const data = {
      ...req.body,
      $push: {
        activities: buildActivity({
          description: "address updated",
          type: " Updated",
          author: req.user?.name,
        }),
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

// --- Note বাবলের তিনটা অ্যাকশন বাটনের জন্য কনফিগ ---
// solve/failed দুটোই needsAttention false করে দেয় (নোট লিস্ট থেকে সরে যায়),
// শুধু অ্যাক্টিভিটি লগে টাইপ আলাদা থাকে যাতে পরে বোঝা যায় কীভাবে শেষ হয়েছিল।
// try_next needsAttention true-ই রাখে (আবার ট্রাই করতে হবে বলে নোট লিস্টে থেকে যায়)।
// description এখন একটু বিস্তারিত রাখা হয়েছে (এক-দুই শব্দের বদলে পূর্ণ বাক্য) —
// যাতে পরে অন্য কেউ টাইমলাইন দেখলে ঠিক কী হয়েছিল সেটা স্পষ্ট বুঝতে পারে। কে করেছে
// সেটা আলাদা `author` ফিল্ডেই থাকে (buildActivity/logActivity, timeline-এ দেখানো হয়)।
const NOTE_ACTION_CONFIG = {
  solve: {
    type: "Note Solved",
    description: "নোটটি সমাধান করা হয়েছে।",
    needsAttention: false,
  },
  failed: {
    type: "Note Failed",
    description:
      "নোটটি সমাধান করা যায়নি, ব্যর্থ হিসেবে বন্ধ করা হয়েছে।",
    needsAttention: false,
  },
  try_next: {
    type: "Try Next",
    description:
      "কাস্টমারকে রিচ করা যায়নি, পরে আবার চেষ্টা করা হবে।",
    needsAttention: true,
  },
};

// --- PATCH /api/orders/:id/note-action  { action: "solve" | "failed" | "try_next" } ---
exports.noteAction = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { action } = req.body;
    const io = req.app.get("io");

    const config = NOTE_ACTION_CONFIG[action];
    if (!config) {
      return res.status(400).json({ message: "অবৈধ action।" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    order.needsAttention = config.needsAttention;
    await logActivity(
      order,
      {
        type: config.type,
        description: config.description,
        author: req.user?.name,
      },
      { save: false },
    );
    await order.save();

    if (io) emitOrderUpdate(io, order);
    return res.status(200).json({ order });
  } catch (error) {
    console.error("Note action error:", error);
    // ✅ ValidationError হলে (যেমন পুরনো কোনো Steadfast activity-তে description
    // মিসিং থেকে গিয়ে থাকলে) generic মেসেজের বদলে আসল কারণটা ফ্রন্টএন্ডে পাঠানো
    // হচ্ছে, যাতে টোস্টে স্পেসিফিক এরর দেখা যায় এবং ডিবাগ করা সহজ হয়।
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: `এই অর্ডারের ডেটায় সমস্যা আছে, সেভ করা যায়নি: ${error.message}`,
      });
    }
    return res
      .status(500)
      .json({ message: "Server error while updating note." });
  }
};

// --- PATCH /api/orders/:id/note — OrderCard-এর নোট সেকশন থেকে কল হয় (আগে
// socket.emit("addNote") দিয়ে হতো, এখন প্লেইন HTTP দিয়ে — socket কানেক্টেড থাক বা
// না থাক কাজ করবে)। আপডেটেড অর্ডার সব কানেক্টেড ক্লায়েন্টে broadcast করা হয় যেন অন্য
// ইউজাররাও রিয়েল-টাইমে নোটটা দেখতে পায় (আগে socket ভার্সনে এই broadcast ছিলই না) ---
exports.addNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (typeof note !== "string") {
      return res.status(400).json({ message: "note ফিল্ড আবশ্যক।" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { note },
      { new: true },
    );
    if (!updatedOrder) {
      return res.status(404).json({ message: "অর্ডার খুঁজে পাওয়া যায়নি।" });
    }

    const io = req.app.get("io");
    if (io) emitOrderUpdate(io, updatedOrder);

    return res.status(200).json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Error adding note:", error);
    return res.status(500).json({ message: "নোট যোগ করতে ব্যর্থ হয়েছে।" });
  }
};

// --- GET /api/orders/:id/previous-orders — এই কাস্টমারের (ফোন নম্বর মিলিয়ে) আগের
// অর্ডারগুলো তার সর্বশেষ স্ট্যাটাসসহ ফেরত দেয় (Note বাবলের "আগের অর্ডার" মডেলের জন্য) ---
exports.getPreviousOrders = async (req, res) => {
  try {
    const currentOrder = await Order.findById(req.params.id).select("castomerPhone");
    if (!currentOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    const phones = currentOrder.castomerPhone || [];
    if (phones.length === 0) {
      return res.status(200).json({ previousOrders: [] });
    }

    const previousOrders = await Order.find({
      _id: { $ne: currentOrder._id },
      castomerPhone: { $in: phones },
    })
      .select(
        "castomerName castomerPhone totalCOD orderStatus productCode courier.courierStatus courier.trackingId activities",
      )
      .sort({ _id: -1 })
      .limit(20);

    return res.status(200).json({ previousOrders });
  } catch (error) {
    console.error("Previous orders fetch error:", error);
    return res
      .status(500)
      .json({ message: "আগের অর্ডার আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- PATCH /api/orders/:id/fix-cod-mismatch — ড্যাশবোর্ডের COD গরমিল টেবিল থেকে,
// আমাদের totalCOD-কে কুরিয়ারের ডেলিভারড COD amount দিয়ে সেট করে দেয়। এরপর
// getDashboardSummary-এর mismatch কুয়েরিতে (totalCOD !== courier.deliveredCodAmount)
// আর ম্যাচ করবে না, তাই অর্ডারটা মিসম্যাচ লিস্ট থেকে নিজে থেকেই বাদ পড়ে যায়। ---
exports.fixCodMismatch = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "অর্ডার খুঁজে পাওয়া যায়নি।" });
    }

    const deliveredAmount = order.courier?.deliveredCodAmount;
    if (deliveredAmount === null || deliveredAmount === undefined) {
      return res
        .status(400)
        .json({ message: "এই অর্ডারে কুরিয়ারের ডেলিভারড COD এমাউন্ট নেই।" });
    }

    const oldCOD = order.totalCOD;
    order.totalCOD = deliveredAmount;
    await logActivity(
      order,
      {
        type: "COD Updated",
        author: req.user?.name,
        description: `COD গরমিল ঠিক করা হয়েছে — ৳${oldCOD} থেকে ৳${deliveredAmount}-তে পরিবর্তন করা হয়েছে (কুরিয়ারের ডেলিভারড COD অনুযায়ী)।`,
      },
      { save: false },
    );
    await order.save();

    const io = req.app.get("io");
    if (io) emitOrderUpdate(io, order);

    return res.status(200).json({ message: "COD আপডেট করা হয়েছে।", order });
  } catch (error) {
    console.error("Fix COD mismatch error:", error);
    return res.status(500).json({ message: "COD আপডেট করা যায়নি।" });
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

    await logActivity(
      order,
      {
        author: req.user.name,
        type: "Status Updated",
        description: activityDescription,
      },
      { save: false },
    );

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
        activities: buildActivity({
          author: "Steadfast",
          type: notification_type,
          description: tracking_message || "empty",
        }),
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
    // callStatus "cancelled" মানে অনেকবার চেষ্টা করেও কাস্টমারকে ধরা/কনফার্ম করা
    // যায়নি বলে এডমিন নিজে বাতিল করেছে — এগুলো ডাটাবেজে থেকে যায় (ডিলিট হয় না)
    // কিন্তু ডিফল্টভাবে "ইনকমপ্লিট" লিস্টে আর লোড হয় না। ?includeCancelled=1
    // দিলে সেগুলোও দেখা যায় (রিভিউ/রিওপেন করার জন্য)।
    const includeCancelled = req.query.includeCancelled === "1";
    const filter = includeCancelled
      ? { status: "active" }
      : { status: "active", callStatus: { $ne: "cancelled" } };

    const drafts = await DraftOrder.find(filter)
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
    await logActivity(
      order,
      {
        author: req.user.name,
        type: "Fraud Review",
        description: `ফ্রড ডিটেকশন রিভিউ: ${reviewStatus}${reason ? ` — ${reason}` : ""}`,
      },
      { save: false },
    );

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
      .select(
        "castomerName castomerPhone productCode totalCOD orderStatus orderSource courier.courierStatus courier.courierStatus activities",
      )
      .sort({ _id: -1 })
      .lean();

    return res.status(200).json({ reasons, matchedOrders });
  } catch (error) {
    console.error("Get fraud matches error:", error);
    return res
      .status(500)
      .json({ message: "ম্যাচ হওয়া অর্ডারের তথ্য আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/orders/:id/courier-history — OrderCard-এর "History" বাটনে ক্লিক
// করলে কল হয়। আগে এটা socket ("allCourierHistory" emit → "distributecourierHistory"
// দিয়ে রেজাল্ট ফেরত) দিয়ে হতো, এখন প্লেইন HTTP request/response দিয়ে করা হচ্ছে —
// socket কানেক্টেড থাক বা না থাক কাজ করবে। bdcourier.com API দিয়ে castomerPhone-এর
// প্রতিটা নম্বর চেক করে সব কুরিয়ার মিলিয়ে success/cancel count বের করে, order.courierHistory.all-এ
// সেভ করে, আপডেটেড অর্ডারটাই রেসপন্সে ফেরত দেয় (ফ্রন্টএন্ড এটা existing onUpdate/handleOrderUpdate
// দিয়েই লিস্টে বসিয়ে দেবে, আলাদা কোনো নতুন মেকানিজম লাগে না)।
exports.getCourierHistory = async (req, res) => {
  try {
    const orderDoc = await Order.findById(req.params.id);
    if (!orderDoc) {
      return res.status(404).json({ message: "অর্ডারটি খুঁজে পাওয়া যায়নি।" });
    }

    // ⚠️ গুরুত্বপূর্ণ: `orderDoc.courierHistory?.all` দিয়ে সরাসরি চেক করা যাবে না —
    // Order.js স্কিমায় courierHistory.all একটা nested object path (আলাদা কোনো
    // Schema/subdocument না), তাই Mongoose in-memory ডকুমেন্টে এটা সবসময় একটা
    // "phantom" খালি {} অবজেক্ট হিসেবে থাকে — DB-তে আসলে কখনো সেট না হলেও।
    // (এই খালি {} শুধু JSON সিরিয়ালাইজেশনের সময় minimize:true-এর কারণে বাদ পড়ে
    // যায়, তাই ফ্রন্টএন্ড ঠিকমতো falsy পায় — কিন্তু এখানে সার্ভার-সাইডে এখনো
    // সিরিয়ালাইজ হয়নি।) তাই {} vs আসল ডেটার পার্থক্য বুঝতে লিফ-ভ্যালু (success)
    // সরাসরি চেক করা হচ্ছে — এটাই আসল "আগে থেকে ফেচ করা আছে কিনা" প্রশ্নের সঠিক উত্তর দেয়।
    const alreadyFetched = orderDoc.courierHistory?.all?.success !== undefined;

    if (alreadyFetched) {
      return res.status(200).json({ order: orderDoc, success: true });
    }

    if (!Array.isArray(orderDoc.castomerPhone) || orderDoc.castomerPhone.length === 0) {
      return res
        .status(400)
        .json({ message: "এই অর্ডারে কোনো ফোন নম্বর নেই।" });
    }

    const count = { success: 0, cancel: 0 };

    await Promise.all(
      orderDoc.castomerPhone.map(async (phone) => {
        const engNum = convertNumber(phone);
        const bdRes = await axios
          .post(
            "https://bdcourier.com/api/courier-check",
            { phone: engNum },
            { headers: { Authorization: `Bearer ${BDCOURIER_SECRET_KEY}` } },
          )
          .catch((err) => {
            console.error("bdcourier API error:", err.message);
            return null;
          });
        if (bdRes?.data) {
          count.success += bdRes.data?.courierData?.summary?.success_parcel || 0;
          count.cancel += bdRes.data?.courierData?.summary?.cancelled_parcel || 0;
        }
      }),
    );

    const updatedOrder = await Order.findByIdAndUpdate(
      orderDoc._id,
      {
        $set: {
          "courierHistory.all.success": count.success,
          "courierHistory.all.cancel": count.cancel,
        },
      },
      { new: true },
    );

    return res.status(200).json({ order: updatedOrder, success: true });
  } catch (error) {
    console.error("Get courier history error:", error);
    return res
      .status(500)
      .json({ message: "কুরিয়ার হিস্ট্রি আনতে ব্যর্থ হয়েছে।" });
  }
};