const mongoose = require("mongoose");
const Order = require("../models/Order");
const FacebookComment = require("../models/FacebookComment");
const { courierNotesScope } = require("../utils/orderScope");

// --- ইউরল কোয়েরি থেকে from/to ডেট রেঞ্জ বের করা (ডিফল্ট: শেষ ৭ দিন) ---
function getDateRange(req) {
  const { from, to } = req.query;

  const toDate = to ? new Date(to) : new Date();
  toDate.setHours(23, 59, 59, 999);

  let fromDate;
  if (from) {
    fromDate = new Date(from);
  } else {
    fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - 6);
  }
  fromDate.setHours(0, 0, 0, 0);

  return { fromDate, toDate };
}

// --- মডারেটর হলে সবসময় নিজের অর্ডারে সীমাবদ্ধ, এডমিন চাইলে ?moderatorId= দিয়ে নির্দিষ্ট
// মডারেটরের অর্ডার দেখতে পারবে, নাহলে সব অর্ডার দেখবে ---
function getOwnershipFilter(req) {
  if (req.user.role === "moderator") {
    return { createdBy: req.user._id };
  }
  const { moderatorId } = req.query;
  if (moderatorId && mongoose.Types.ObjectId.isValid(moderatorId)) {
    return { createdBy: new mongoose.Types.ObjectId(moderatorId) };
  }
  return {};
}

// --- GET /api/dashboard/summary?from=&to=&moderatorId= ---
exports.getDashboardSummary = async (req, res) => {
  try {
    const { fromDate, toDate } = getDateRange(req);
    const ownershipFilter = getOwnershipFilter(req);

    const sentFilter = {
      ...ownershipFilter,
      "courier.bookedAt": { $gte: fromDate, $lte: toDate },
    };
    const deliveredFilter = {
      ...ownershipFilter,
      // orderStatus: "Delivered",
      "courier.courierStatus": "delivered",
      "courier.statusUpdatedAt": { $gte: fromDate, $lte: toDate },
    };
    const cancelledFilter = {
      ...ownershipFilter,
      // orderStatus: "Cancelled",
      "courier.courierStatus": "cancelled",
      "courier.statusUpdatedAt": { $gte: fromDate, $lte: toDate },
    };
    // --- এই রেঞ্জে বুক হয়েছে কিন্তু এখনো ডেলিভারড/ক্যান্সেলড হয়নি এমন পার্সেল ---
    const pendingFilter = {
      ...ownershipFilter,
      "courier.trackingId": { $ne: null },
      "courier.bookedAt": { $gte: fromDate, $lte: toDate },
      "courier.courierStatus": { $nin: ["delivered", "cancelled"] },
    };

    const [sentAgg, deliveredAgg, cancelledAgg, pendingAgg, dailyTrendRaw, mismatches] =
      await Promise.all([
      // মোট পাঠানো (বুকড) পার্সেল
      Order.aggregate([
        { $match: sentFilter },
        { $group: { _id: null, count: { $sum: 1 }, totalCOD: { $sum: "$totalCOD" } } },
      ]),
      // মোট ডেলিভারড পার্সেল ও আর্থিক হিসাব
      Order.aggregate([
        { $match: deliveredFilter },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            deliveredAmount: { $sum: "$courier.deliveredCodAmount" },
            deliveryCharge: { $sum: "$courier.deliveryCharge" },
            codCharge: { $sum: "$courier.codChargeAmount" },
          },
        },
      ]),
      // মোট ক্যান্সেলড পার্সেল ও তার ডেলিভারি চার্জ
      Order.aggregate([
        { $match: cancelledFilter },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            deliveryCharge: { $sum: "$courier.deliveryCharge" },
          },
        },
      ]),
      // মোট পেন্ডিং পার্সেল (বুক হয়েছে, এখনো ডেলিভারড/ক্যান্সেলড হয়নি) ও তার COD এমাউন্ট
      Order.aggregate([
        { $match: pendingFilter },
        { $group: { _id: null, count: { $sum: 1 }, totalCOD: { $sum: "$totalCOD" } } },
      ]),
      // চার্টের জন্য দৈনিক ট্রেন্ড (delivered/cancelled)
      Order.aggregate([
        {
          $match: {
            ...ownershipFilter,
            "courier.statusUpdatedAt": { $gte: fromDate, $lte: toDate },
            orderStatus: { $in: ["Delivered", "Cancelled"] },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$courier.statusUpdatedAt" } },
              status: "$courier.courierStatus",
            },
            count: { $sum: 1 },
            amount: { $sum: "$courier.deliveredCodAmount" },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),
      // COD mismatch: ডেলিভারড কিন্তু কুরিয়ারের cod_amount আর আমাদের totalCOD না মেলা
      Order.find({
        ...ownershipFilter,
        "courier.courierStatus": "delivered",
        "courier.statusUpdatedAt": { $gte: fromDate, $lte: toDate },
        $expr: { $ne: ["$totalCOD", "$courier.deliveredCodAmount"] },
      }).select(
        "castomerName castomerPhone totalCOD courier.deliveredCodAmount courier.trackingId courier.statusUpdatedAt createdByName",
      ),
    ]);

    const sent = sentAgg[0] || { count: 0, totalCOD: 0 };
    const delivered = deliveredAgg[0] || {
      count: 0,
      deliveredAmount: 0,
      deliveryCharge: 0,
      codCharge: 0,
    };
    const cancelled = cancelledAgg[0] || { count: 0, deliveryCharge: 0 };
    const pending = pendingAgg[0] || { count: 0, totalCOD: 0 };

    const totalDeliveryCharge = (delivered.deliveryCharge || 0) + (cancelled.deliveryCharge || 0);
    const netDeduction = totalDeliveryCharge + (delivered.codCharge || 0);

    // চার্টের জন্য প্রতিদিনের ডেটা { date, delivered, cancelled, deliveredAmount }-এ পুনর্গঠন করা
    const trendMap = {};
    dailyTrendRaw.forEach((item) => {
      const date = item._id.date;
      if (!trendMap[date]) {
        trendMap[date] = { date, delivered: 0, cancelled: 0, deliveredAmount: 0 };
      }
      if (item._id.status === "delivered") {
        trendMap[date].delivered = item.count;
        trendMap[date].deliveredAmount = item.amount || 0;
      } else if (item._id.status === "cancelled") {
        trendMap[date].cancelled = item.count;
      }
    });

    return res.status(200).json({
      range: { from: fromDate, to: toDate },
      scope: {
        role: req.user.role,
        moderatorId: req.query.moderatorId || null,
      },
      totals: {
        sentCount: sent.count,
        sentAmount: sent.totalCOD,
        deliveredCount: delivered.count,
        deliveredAmount: delivered.deliveredAmount || 0,
        cancelledCount: cancelled.count,
        pendingCount: pending.count,
        pendingAmount: pending.totalCOD,
        totalDeliveryCharge,
        deliveredDeliveryCharge: delivered.deliveryCharge || 0,
        cancelledDeliveryCharge: cancelled.deliveryCharge || 0,
        totalCodCharge: delivered.codCharge || 0,
        netDeduction,
        mismatchCount: mismatches.length,
        mainBalanceAfterCosting: (delivered.deliveredAmount || 0) - netDeduction,
      },
      dailyTrend: Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date)),
      mismatches,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return res.status(500).json({ message: "ড্যাশবোর্ড ডেটা আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- GET /api/dashboard/product-financial-summary?productCode=&from=&to=&moderatorId= ---
// একটা নির্দিষ্ট productCode-এর জন্য getDashboardSummary-এর মতোই আর্থিক হিসাব (টোটাল পাঠানো,
// ডেলিভারি চার্জ, COD চার্জ, ক্যান্সেল চার্জ, নেট ব্যালেন্স) — মূল getDashboardSummary ফাংশনটা
// অপরিবর্তিত রেখে (ঐটা main dashboard-এ ব্যবহার হয়, রিস্ক এড়াতে টাচ করিনি), এখানে একই
// অ্যাগ্রিগেশন প্যাটার্ন productCode ফিল্টার যোগ করে আলাদাভাবে লেখা হয়েছে। ---
exports.getProductFinancialSummary = async (req, res) => {
  try {
    const { productCode } = req.query;
    if (!productCode) {
      return res.status(400).json({ message: "productCode আবশ্যক।" });
    }

    const { fromDate, toDate } = getDateRange(req);
    const ownershipFilter = getOwnershipFilter(req);
    const productFilter = { productCode };

    const sentFilter = {
      ...ownershipFilter,
      ...productFilter,
      "courier.bookedAt": { $gte: fromDate, $lte: toDate },
    };
    const deliveredFilter = {
      ...ownershipFilter,
      ...productFilter,
      "courier.courierStatus": "delivered",
      "courier.statusUpdatedAt": { $gte: fromDate, $lte: toDate },
    };
    const cancelledFilter = {
      ...ownershipFilter,
      ...productFilter,
      "courier.courierStatus": "cancelled",
      "courier.statusUpdatedAt": { $gte: fromDate, $lte: toDate },
    };
    const pendingFilter = {
      ...ownershipFilter,
      ...productFilter,
      "courier.trackingId": { $ne: null },
      "courier.bookedAt": { $gte: fromDate, $lte: toDate },
      "courier.courierStatus": { $nin: ["delivered", "cancelled"] },
    };

    const [sentAgg, deliveredAgg, cancelledAgg, pendingAgg] = await Promise.all([
      Order.aggregate([
        { $match: sentFilter },
        { $group: { _id: null, count: { $sum: 1 }, totalCOD: { $sum: "$totalCOD" } } },
      ]),
      Order.aggregate([
        { $match: deliveredFilter },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            deliveredAmount: { $sum: "$courier.deliveredCodAmount" },
            deliveryCharge: { $sum: "$courier.deliveryCharge" },
            codCharge: { $sum: "$courier.codChargeAmount" },
          },
        },
      ]),
      Order.aggregate([
        { $match: cancelledFilter },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            deliveryCharge: { $sum: "$courier.deliveryCharge" },
          },
        },
      ]),
      Order.aggregate([
        { $match: pendingFilter },
        { $group: { _id: null, count: { $sum: 1 }, totalCOD: { $sum: "$totalCOD" } } },
      ]),
    ]);

    const sent = sentAgg[0] || { count: 0, totalCOD: 0 };
    const delivered = deliveredAgg[0] || {
      count: 0,
      deliveredAmount: 0,
      deliveryCharge: 0,
      codCharge: 0,
    };
    const cancelled = cancelledAgg[0] || { count: 0, deliveryCharge: 0 };
    const pending = pendingAgg[0] || { count: 0, totalCOD: 0 };

    const totalDeliveryCharge = (delivered.deliveryCharge || 0) + (cancelled.deliveryCharge || 0);
    const netDeduction = totalDeliveryCharge + (delivered.codCharge || 0);

    // --- ডেলিভারি+ক্যান্সেল মিলিয়ে (যেসব পার্সেলের ফাইনাল সিদ্ধান্ত হয়ে গেছে) কত % ক্যান্সেল ---
    const decidedCount = (delivered.count || 0) + (cancelled.count || 0);
    const cancelRate = decidedCount > 0 ? ((cancelled.count || 0) / decidedCount) * 100 : 0;

    return res.status(200).json({
      productCode,
      range: { from: fromDate, to: toDate },
      totals: {
        sentCount: sent.count,
        sentAmount: sent.totalCOD,
        deliveredCount: delivered.count,
        deliveredAmount: delivered.deliveredAmount || 0,
        cancelledCount: cancelled.count,
        pendingCount: pending.count,
        pendingAmount: pending.totalCOD,
        totalDeliveryCharge,
        deliveredDeliveryCharge: delivered.deliveryCharge || 0,
        cancelledDeliveryCharge: cancelled.deliveryCharge || 0,
        totalCodCharge: delivered.codCharge || 0,
        netDeduction,
        mainBalanceAfterCosting: (delivered.deliveredAmount || 0) - netDeduction,
        cancelRate,
      },
    });
  } catch (error) {
    console.error("Product financial summary error:", error);
    return res.status(500).json({ message: "প্রোডাক্ট আর্থিক হিসাব আনতে ব্যর্থ হয়েছে।" });
  }
};
// কার্ডে ক্লিক করলে সংশ্লিষ্ট পার্সেলগুলোর লিস্ট দেখানোর জন্য (প্রোডাক্ট এনালিটিক্স কার্ড থেকেও
// একই এন্ডপয়েন্ট ব্যবহার হয়, শুধু ঐচ্ছিক productCode ফিল্টার যোগ হয়)
exports.getDashboardOrders = async (req, res) => {
  try {
    const { status, productCode } = req.query;
    const { fromDate, toDate } = getDateRange(req);
    const ownershipFilter = getOwnershipFilter(req);

    const filter = { ...ownershipFilter };
    if (status === "sent") {
      filter["courier.bookedAt"] = { $gte: fromDate, $lte: toDate };
    } else if (status === "delivered") {
      // note: আগে এখানে orderStatus === "Delivered" চেক করা হতো, কিন্তু
      // orderStatus কখনো "Delivered"-এ সেট হয় না (webhookController.js-এ ওই
      // sync লাইনটা কমেন্ট করা আছে) — তাই সামারি কাউন্টের সাথে মিলিয়ে এখন
      // courier.courierStatus দিয়েই ফিল্টার করা হচ্ছে (getDashboardSummary-এর
      // deliveredFilter-এর সাথে হুবহু এক থাকতে হবে, নাহলে কাউন্ট আর লিস্ট
      // আবার আলাদা হয়ে যাবে)
      filter["courier.courierStatus"] = "delivered";
      filter["courier.statusUpdatedAt"] = { $gte: fromDate, $lte: toDate };
    } else if (status === "cancelled") {
      filter["courier.courierStatus"] = "cancelled";
      filter["courier.statusUpdatedAt"] = { $gte: fromDate, $lte: toDate };
    } else if (status === "pending") {
      // getDashboardSummary-এর pendingFilter-এর সাথে হুবহু এক থাকতে হবে
      filter["courier.trackingId"] = { $ne: null };
      filter["courier.bookedAt"] = { $gte: fromDate, $lte: toDate };
      filter["courier.courierStatus"] = { $nin: ["delivered", "cancelled"] };
    } else {
      return res
        .status(400)
        .json({ message: "status প্যারামিটার সঠিক নয় (sent/delivered/cancelled/pending)।" });
    }

    if (productCode) {
      filter.productCode = productCode;
    }

    const orders = await Order.find(filter)
      .select(
        "castomerName castomerPhone totalCOD productCode orderStatus courier activities rawInputText note permanentNote createdByName createdAt",
      )
      .sort({ "courier.statusUpdatedAt": -1, "courier.bookedAt": -1 })
      .limit(500);

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Dashboard orders list error:", error);
    return res.status(500).json({ message: "লিস্ট আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- GET /api/dashboard/product-summary?from=&to=&moderatorId= ---
// নির্দিষ্ট তারিখ-রেঞ্জে প্রতিটা productCode অনুযায়ী কয়টা পাঠানো/ডেলিভারড/ক্যান্সেলড/পেন্ডিং
// হয়েছে ও তার টাকার এমাউন্ট — নতুন প্রোডাক্ট-ভিত্তিক এনালিটিক্স সেকশনের জন্য
exports.getProductSummary = async (req, res) => {
  try {
    const { fromDate, toDate } = getDateRange(req);
    const ownershipFilter = getOwnershipFilter(req);

    const sentFilter = {
      ...ownershipFilter,
      "courier.bookedAt": { $gte: fromDate, $lte: toDate },
    };
    const deliveredFilter = {
      ...ownershipFilter,
      "courier.courierStatus": "delivered",
      "courier.statusUpdatedAt": { $gte: fromDate, $lte: toDate },
    };
    const cancelledFilter = {
      ...ownershipFilter,
      "courier.courierStatus": "cancelled",
      "courier.statusUpdatedAt": { $gte: fromDate, $lte: toDate },
    };
    const pendingFilter = {
      ...ownershipFilter,
      "courier.trackingId": { $ne: null },
      "courier.bookedAt": { $gte: fromDate, $lte: toDate },
      "courier.courierStatus": { $nin: ["delivered", "cancelled"] },
    };

    const groupByProduct = (amountField) => [
      { $group: { _id: "$productCode", count: { $sum: 1 }, amount: { $sum: amountField } } },
    ];

    const [sentAgg, deliveredAgg, cancelledAgg, pendingAgg] = await Promise.all([
      Order.aggregate([{ $match: sentFilter }, ...groupByProduct("$totalCOD")]),
      Order.aggregate([
        { $match: deliveredFilter },
        ...groupByProduct("$courier.deliveredCodAmount"),
      ]),
      Order.aggregate([{ $match: cancelledFilter }, ...groupByProduct("$totalCOD")]),
      Order.aggregate([{ $match: pendingFilter }, ...groupByProduct("$totalCOD")]),
    ]);

    // --- সব agg থেকে productCode-ভিত্তিক ম্যাপে একসাথে জোড়া লাগানো ---
    const productMap = {};
    const ensure = (code) => {
      const key = code || "N/A";
      if (!productMap[key]) {
        productMap[key] = {
          productCode: key,
          sentCount: 0,
          sentAmount: 0,
          deliveredCount: 0,
          deliveredAmount: 0,
          cancelledCount: 0,
          cancelledAmount: 0,
          pendingCount: 0,
          pendingAmount: 0,
        };
      }
      return productMap[key];
    };

    sentAgg.forEach((row) => {
      const p = ensure(row._id);
      p.sentCount = row.count;
      p.sentAmount = row.amount || 0;
    });
    deliveredAgg.forEach((row) => {
      const p = ensure(row._id);
      p.deliveredCount = row.count;
      p.deliveredAmount = row.amount || 0;
    });
    cancelledAgg.forEach((row) => {
      const p = ensure(row._id);
      p.cancelledCount = row.count;
      p.cancelledAmount = row.amount || 0;
    });
    pendingAgg.forEach((row) => {
      const p = ensure(row._id);
      p.pendingCount = row.count;
      p.pendingAmount = row.amount || 0;
    });

    const products = Object.values(productMap).sort((a, b) => b.sentCount - a.sentCount);

    return res.status(200).json({
      range: { from: fromDate, to: toDate },
      products,
    });
  } catch (error) {
    console.error("Product summary error:", error);
    return res.status(500).json({ message: "প্রোডাক্ট এনালিটিক্স আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- GET /api/dashboard/attention-counts — হোমপেজের Attention/Tracking/Comments ব্যাজের জন্য
// শুধু তিনটা সংখ্যা (কোনো তালিকা না)। গণনার ফিল্টার বিদ্যমান লজিকের সাথে মেলানো:
//  - Attention/Tracking: orderController.getOrders-এর একই নিয়ম (মডারেটরের জন্য নিজের+ownerless
//    অর্ডার; কুরিয়ারের ফাইনাল স্ট্যাটাস বাদ; Cancelled/Delivered/Booked হলে শেষ ২ দিনের
//    activity) — যাতে ব্যাজ আর /note ও /tracking-attention পেজের তালিকা একই সংখ্যা দেখায়।
//  - Comments: কমেন্ট পেজে "No action yet" দেখানো কমেন্ট (active, reply/delete/block হয়নি) ---
exports.getAttentionCounts = async (req, res) => {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // ✅ কুরিয়ার-নোট স্কোপ (utils/orderScope.js): নিজের+মালিকহীন, অথবা courierNotes.viewAll /
    // orders.viewOthers পারমিশন থাকলে সব — যাতে ব্যাজের সংখ্যা /note ও /tracking-attention পেজের তালিকার সাথে মেলে
    const ownershipFilter = courierNotesScope(req.user);

    const [orderAgg, comments] = await Promise.all([
      Order.aggregate([
        { $match: ownershipFilter },
        // আগে ফ্ল্যাগ দিয়ে ছেঁকে নেওয়া হয় — অর্ডারের বিশাল অংশ এখানেই বাদ পড়ে
        {
          $match: {
            $or: [{ needsAttention: true }, { courierTrackingAttention: true }],
          },
        },
        {
          $match: {
            "courier.courierStatus": {
              $nin: ["cancelled", "delivered", "partial_delivered"],
            },
          },
        },
        {
          $addFields: {
            lastActivityTime: { $arrayElemAt: ["$activities.timestamp", -1] },
          },
        },
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
        {
          $group: {
            _id: null,
            attention: {
              $sum: { $cond: [{ $eq: ["$needsAttention", true] }, 1, 0] },
            },
            tracking: {
              $sum: {
                $cond: [{ $eq: ["$courierTrackingAttention", true] }, 1, 0],
              },
            },
          },
        },
      ]),
      FacebookComment.countDocuments({
        status: "active",
        isReplied: false,
        isUserBlocked: false,
        iscommentDeleted: false,
      }),
    ]);

    return res.status(200).json({
      attention: orderAgg[0]?.attention || 0,
      tracking: orderAgg[0]?.tracking || 0,
      comments,
    });
  } catch (error) {
    console.error("Attention counts error:", error);
    return res.status(500).json({ message: "কাউন্টার আনতে ব্যর্থ হয়েছে।" });
  }
};
