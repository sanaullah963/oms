const mongoose = require("mongoose");
const Order = require("../models/Order");

// --- courier.courierStatus এনামের সাথে মিলিয়ে (models/Order.js দেখুন) ---
const COURIER_STATUSES = [
  "unknown",
  "review",
  "pending",
  "assigned",
  "delivered",
  "partial_delivered",
  "cancelled",
];

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// --- মডারেটর হলে সবসময় নিজের অর্ডারে সীমাবদ্ধ, এডমিন চাইলে ?moderatorId= দিয়ে নির্দিষ্ট
// মডারেটরের অর্ডার দেখতে পারবে, নাহলে সব অর্ডার দেখবে (dashboardController.js-এর সাথে
// consistency বজায় রাখা হয়েছে) ---
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

// --- ঐচ্ছিক তারিখ-রেঞ্জ (আজ/গতকাল/৩দিন/নির্দিষ্ট তারিখ ইত্যাদি) — ?from=&to= না দিলে
// কোনো তারিখ-সীমাবদ্ধতা ছাড়াই সব পার্সেল দেখাবে (ডিফল্টে "সব সময়") ---
//
// bug fix: আগে `new Date(dateStr).setHours(...)` ব্যবহার হতো, যেটা সার্ভারের লোকাল
// টাইমজোন (সাধারণত UTC, যেমন Vercel-এ) দিয়ে দিনের শুরু/শেষ ঠিক করত। কিন্তু ক্লায়েন্ট
// (dateRangeUtils.js -> toISODate) তারিখটা toISOString() দিয়ে UTC-তে বানায়। ফলাফলে
// বাংলাদেশ (UTC+6) থেকে রাত ১২টা-ভোর ৬টার মধ্যে "আজ" প্রিসেট বাছলে ভুল দিন
// (UTC-তে তখনও "গতকাল") ব্যাকএন্ডে চলে যেত, আর ব্যাকএন্ড সেই তারিখটাকেও ভুল সময়ে
// (UTC মধ্যরাত থেকে) কাউন্ট করত — ফলে বাংলাদেশের সকাল ৬টা পর্যন্ত বুক হওয়া পার্সেল
// "আজ" ট্যাবে না দেখিয়ে "গতকাল" ট্যাবে দেখাত। এখন YYYY-MM-DD স্ট্রিংটাকে সবসময়
// বাংলাদেশ সময় (+06:00) অনুযায়ী দিনের শুরু/শেষ হিসেবে পার্স করা হচ্ছে, সার্ভার
// যেই টাইমজোনেই চলুক না কেন রেজাল্ট একই থাকবে।
const BD_OFFSET = "+06:00";

function toBDStartOfDay(dateStr) {
  return new Date(`${dateStr}T00:00:00.000${BD_OFFSET}`);
}

function toBDEndOfDay(dateStr) {
  return new Date(`${dateStr}T23:59:59.999${BD_OFFSET}`);
}

// --- আজকের তারিখ বাংলাদেশ সময় অনুযায়ী YYYY-MM-DD ফরম্যাটে (সার্ভার UTC-তে চললেও ঠিক থাকে) ---
function todayBD() {
  return new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function getOptionalDateRange(req) {
  const { from, to } = req.query;
  if (!from && !to) return null;

  const toStr = to || todayBD();
  const fromStr = from || toStr;

  return { fromDate: toBDStartOfDay(fromStr), toDate: toBDEndOfDay(toStr) };
}

// --- শুধু কুরিয়ারে বুক হওয়া (trackingId আছে) অর্ডারই "ট্র্যাকিং পার্সেল" —
// বুক না হওয়া অর্ডারের courierStatus ডিফল্ট "unknown" থাকে, সেগুলো এখানে গণনার
// দরকার নেই (নাহলে "unknown" বাকেটে হাজারো অপ্রাসঙ্গিক অর্ডার চলে আসবে)। তারিখ
// ফিল্টার দেওয়া থাকলে courier.bookedAt (কবে বুক করা হয়েছে) অনুযায়ী স্কোপ করা হয় ---
function baseTrackingFilter(req) {
  const filter = {
    ...getOwnershipFilter(req),
    "courier.trackingId": { $ne: null },
  };

  const dateRange = getOptionalDateRange(req);
  if (dateRange) {
    filter["courier.bookedAt"] = { $gte: dateRange.fromDate, $lte: dateRange.toDate };
  }

  return filter;
}

// --- GET /api/tracking-parcels/summary?moderatorId=&from=&to= ---
// প্রতিটা courier status অনুযায়ী কতগুলো পার্সেল আছে, কার্ডে দেখানোর জন্য
exports.getTrackingParcelSummary = async (req, res) => {
  try {
    const filter = baseTrackingFilter(req);

    const agg = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$courier.courierStatus",
          count: { $sum: 1 },
          totalCOD: { $sum: "$totalCOD" },
        },
      },
    ]);

    const counts = {};
    COURIER_STATUSES.forEach((status) => {
      counts[status] = { count: 0, totalCOD: 0 };
    });
    agg.forEach((row) => {
      const key = row._id || "unknown";
      counts[key] = { count: row.count, totalCOD: row.totalCOD || 0 };
    });

    return res.status(200).json({ counts });
  } catch (error) {
    console.error("Tracking parcel summary error:", error);
    return res.status(500).json({ message: "ট্র্যাকিং পার্সেল সামারি আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- GET /api/tracking-parcels/orders?status=pending&moderatorId=&from=&to=&page=&limit= ---
// কার্ডে ক্লিক করলে সংশ্লিষ্ট স্ট্যাটাসের পার্সেল/অর্ডারগুলো (অ্যাক্টিভিটিসহ), পেজিনেটেড
exports.getTrackingParcelOrders = async (req, res) => {
  try {
    const { status } = req.query;
    if (!COURIER_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ message: `status প্যারামিটার সঠিক নয় (${COURIER_STATUSES.join("/")})।` });
    }

    const filter = {
      ...baseTrackingFilter(req),
      "courier.courierStatus": status,
    };

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE),
    );
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select(
          "castomerName castomerPhone totalCOD productCode orderStatus courier activities createdByName permanentNote note",
        )
        .sort({ "courier.statusUpdatedAt": -1, "courier.bookedAt": -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      orders,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Tracking parcel orders list error:", error);
    return res.status(500).json({ message: "লিস্ট আনতে ব্যর্থ হয়েছে।" });
  }
};
