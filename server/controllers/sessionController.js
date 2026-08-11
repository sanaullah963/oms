const Session = require("../models/Session");

// --- ইউরল কোয়েরি থেকে from/to ডেট রেঞ্জ বের করা (ডিফল্ট: শেষ ৭ দিন) —
// dashboardController.js-এর getDateRange-এর মতোই প্যাটার্ন ---
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

// --- সোর্স নাম বের করা: utmSource থাকলে সেটা, না থাকলে referrer-এর ডোমেইন, কিছুই না থাকলে "Direct" ---
function extractSourceExpr() {
  return {
    $cond: [
      { $ne: ["$tracking.utmSource", null] },
      "$tracking.utmSource",
      {
        $cond: [
          { $ne: ["$tracking.referrer", null] },
          {
            $arrayElemAt: [
              { $split: [{ $arrayElemAt: [{ $split: ["$tracking.referrer", "//"] }, 1] }, "/"] },
              0,
            ],
          },
          "Direct",
        ],
      },
    ],
  };
}

// --- GET /api/sessions/summary?from=&to=&landingPageSlug= (admin only) ---
exports.getSessionSummary = async (req, res) => {
  try {
    const { fromDate, toDate } = getDateRange(req);
    const { landingPageSlug } = req.query;

    const match = { entryAt: { $gte: fromDate, $lte: toDate } };
    if (landingPageSlug) match.landingPageSlug = landingPageSlug;

    const [totalsAgg, dailyTrendRaw, byLandingPage, bySource] = await Promise.all([
      // --- সামারি সংখ্যা (মোট সেশন, বাউন্স, রিটার্ন ভিজিটর, গড় সময়/স্ক্রল) ---
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            bounceCount: { $sum: { $cond: ["$isBounce", 1, 0] } },
            returnVisitorCount: { $sum: { $cond: ["$isReturnVisitor", 1, 0] } },
            avgTimeOnPageSeconds: { $avg: "$timeOnPageSeconds" },
            avgScrollDepth: { $avg: "$maxScrollDepth" },
            totalClicks: { $sum: "$clickCount" },
          },
        },
      ]),
      // --- চার্টের জন্য দৈনিক সেশন ও বাউন্স ট্রেন্ড ---
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$entryAt" } },
            sessions: { $sum: 1 },
            bounces: { $sum: { $cond: ["$isBounce", 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // --- কোন ল্যান্ডিং পেজে কতগুলো সেশন ---
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $ifNull: ["$landingPageSlug", "অজানা"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // --- কোন সোর্স (UTM/referrer) থেকে কতগুলো সেশন ---
      Session.aggregate([
        { $match: match },
        { $project: { source: extractSourceExpr() } },
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const totals = totalsAgg[0] || {
      totalSessions: 0,
      bounceCount: 0,
      returnVisitorCount: 0,
      avgTimeOnPageSeconds: 0,
      avgScrollDepth: 0,
      totalClicks: 0,
    };

    return res.status(200).json({
      totals: {
        totalSessions: totals.totalSessions,
        bounceCount: totals.bounceCount,
        bounceRate: totals.totalSessions ? (totals.bounceCount / totals.totalSessions) * 100 : 0,
        returnVisitorCount: totals.returnVisitorCount,
        returnVisitorRate: totals.totalSessions
          ? (totals.returnVisitorCount / totals.totalSessions) * 100
          : 0,
        avgTimeOnPageSeconds: Math.round(totals.avgTimeOnPageSeconds || 0),
        avgScrollDepth: Math.round(totals.avgScrollDepth || 0),
        totalClicks: totals.totalClicks,
      },
      dailyTrend: dailyTrendRaw.map((d) => ({ date: d._id, sessions: d.sessions, bounces: d.bounces })),
      byLandingPage: byLandingPage.map((d) => ({ slug: d._id, count: d.count })),
      bySource: bySource.map((d) => ({ source: d._id, count: d.count })),
    });
  } catch (error) {
    console.error("Get session summary error:", error);
    return res.status(500).json({ message: "সেশন সামারি আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- GET /api/sessions?from=&to=&landingPageSlug=&isBounce=&isReturnVisitor=&page=&limit= (admin only) ---
exports.listSessions = async (req, res) => {
  try {
    const { fromDate, toDate } = getDateRange(req);
    const { landingPageSlug, isBounce, isReturnVisitor, page = 1, limit = 25 } = req.query;

    const filter = { entryAt: { $gte: fromDate, $lte: toDate } };
    if (landingPageSlug) filter.landingPageSlug = landingPageSlug;
    if (isBounce === "true") filter.isBounce = true;
    if (isBounce === "false") filter.isBounce = false;
    if (isReturnVisitor === "true") filter.isReturnVisitor = true;

    const [sessions, total] = await Promise.all([
      Session.find(filter)
        .sort({ entryAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      Session.countDocuments(filter),
    ]);

    return res.status(200).json({ sessions, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error("List sessions error:", error);
    return res.status(500).json({ message: "সেশন লিস্ট আনতে ব্যর্থ হয়েছে।" });
  }
};