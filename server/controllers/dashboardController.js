const mongoose = require("mongoose");
const Order = require("../models/Order");

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
      orderStatus: "Delivered",
      "courier.statusUpdatedAt": { $gte: fromDate, $lte: toDate },
    };
    const cancelledFilter = {
      ...ownershipFilter,
      orderStatus: "Cancelled",
      "courier.statusUpdatedAt": { $gte: fromDate, $lte: toDate },
    };

    const [sentAgg, deliveredAgg, cancelledAgg, dailyTrendRaw, mismatches] = await Promise.all([
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
              status: "$orderStatus",
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
        orderStatus: "Delivered",
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

    const totalDeliveryCharge = (delivered.deliveryCharge || 0) + (cancelled.deliveryCharge || 0);
    const netDeduction = totalDeliveryCharge + (delivered.codCharge || 0);

    // চার্টের জন্য প্রতিদিনের ডেটা { date, delivered, cancelled, deliveredAmount }-এ পুনর্গঠন করা
    const trendMap = {};
    dailyTrendRaw.forEach((item) => {
      const date = item._id.date;
      if (!trendMap[date]) {
        trendMap[date] = { date, delivered: 0, cancelled: 0, deliveredAmount: 0 };
      }
      if (item._id.status === "Delivered") {
        trendMap[date].delivered = item.count;
        trendMap[date].deliveredAmount = item.amount || 0;
      } else if (item._id.status === "Cancelled") {
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
        totalDeliveryCharge,
        deliveredDeliveryCharge: delivered.deliveryCharge || 0,
        cancelledDeliveryCharge: cancelled.deliveryCharge || 0,
        totalCodCharge: delivered.codCharge || 0,
        netDeduction,
        mismatchCount: mismatches.length,
      },
      dailyTrend: Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date)),
      mismatches,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return res.status(500).json({ message: "ড্যাশবোর্ড ডেটা আনতে ব্যর্থ হয়েছে।" });
  }
};