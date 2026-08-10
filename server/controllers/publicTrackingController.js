const Session = require("../models/Session");
const DraftOrder = require("../models/DraftOrder");
const LandingPage = require("../models/LandingPage");
const { emitDraftUpdate } = require("../utils/socketBroadcast");

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || null;
}

// undefined ভ্যালিউ বাদ দিয়ে একটা flat update অবজেক্ট বানানো (Mongo-তে ভুলবশত ফিল্ড খালি না করার জন্য)
function buildUpdate(fields) {
  const update = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) update[key] = value;
  });
  return update;
}

// --- POST /api/public/tracking/session — engagement heartbeat/exit আপডেট (upsert) ---
exports.updateSession = async (req, res) => {
  try {
    const {
      sessionId,
      visitorId,
      landingPageSlug,
      timeOnPageSeconds,
      maxScrollDepth,
      clickCount,
      focusCount,
      blurCount,
      visibilityChangeCount,
      isExiting,
      tracking = {},
    } = req.body;

    if (!sessionId || !visitorId) {
      return res.status(400).json({ message: "sessionId ও visitorId আবশ্যক।" });
    }

    const existing = await Session.findOne({ sessionId }).select("_id isReturnVisitor");
    let isReturnVisitor = existing?.isReturnVisitor || false;
    if (!existing) {
      const priorCount = await Session.countDocuments({ visitorId, sessionId: { $ne: sessionId } });
      isReturnVisitor = priorCount > 0;
    }

    const update = buildUpdate({
      visitorId,
      landingPageSlug,
      timeOnPageSeconds,
      maxScrollDepth,
      clickCount,
      focusCount,
      blurCount,
      visibilityChangeCount,
      isReturnVisitor,
      "tracking.fbp": tracking.fbp,
      "tracking.fbc": tracking.fbc,
      "tracking.fbclid": tracking.fbclid,
      "tracking.gclid": tracking.gclid,
      "tracking.utmSource": tracking.utmSource,
      "tracking.utmMedium": tracking.utmMedium,
      "tracking.utmCampaign": tracking.utmCampaign,
      "tracking.referrer": tracking.referrer,
      "tracking.ip": getClientIp(req),
      "tracking.userAgent": req.headers["user-agent"] || undefined,
    });

    if (isExiting) {
      update.exitAt = new Date();
      // সহজ bounce সংজ্ঞা: ১০ সেকেন্ডের কম সময়, কোনো ক্লিক নেই, স্ক্রল ২৫%-এর কম
      update.isBounce =
        (timeOnPageSeconds || 0) < 10 && (clickCount || 0) === 0 && (maxScrollDepth || 0) < 25;
    }

    await Session.findOneAndUpdate({ sessionId }, update, {
      upsert: true,
      setDefaultsOnInsert: true,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Session update error:", error);
    return res.status(500).json({ message: "সেশন আপডেট ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/public/tracking/draft — ফর্ম পূরণ করতে করতে অটো-সেভ (upsert) ---
exports.saveDraftOrder = async (req, res) => {
  try {
    const { sessionId, landingPageSlug, customerName, phone, address, quantity, tracking = {} } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId আবশ্যক।" });
    }
    // নাম/ফোন/ঠিকানা তিনটাই খালি হলে সেভ করার দরকার নেই (অকারণ ড্রাফট এড়ানো)
    if (!customerName && !phone && !address) {
      return res.status(200).json({ success: true, skipped: true });
    }

    const page = landingPageSlug ? await LandingPage.findOne({ slug: landingPageSlug }) : null;
    // --- লক্ষ্য করুন: এখানে ইচ্ছাকৃতভাবে "status" সেট করা হচ্ছে না ---
    // কারণ DraftOrder স্কিমার enum হলো ["active","completed","abandoned"], আগে এখানে
    // ভুলবশত "draft" বসানো হতো যেটা স্কিমার সাথে মেলে না। নতুন ডকুমেন্ট হলে schema default
    // ("active") এমনিতেই বসে যাবে (setDefaultsOnInsert)। আর কাস্টমার সাবমিট করার পর যদি
    // দেরিতে কোনো auto-save রিকোয়েস্ট এসে পড়ে, সেটা যাতে ভুল করে আবার "completed" থেকে
    // "active"-এ ফিরিয়ে না দেয়, তাই নিচের ফিল্টারে completed draft বাদ দেওয়া হয়েছে।
    const update = buildUpdate({
      landingPageSlug,
      name: customerName,
      phone,
      address,
      quantity: quantity || 1,
      productCode: page?.productCode,
      productName: page?.productName,
      lastActivityAt: new Date(),
      "tracking.fbp": tracking.fbp,
      "tracking.fbc": tracking.fbc,
      "tracking.fbclid": tracking.fbclid,
      "tracking.gclid": tracking.gclid,
      "tracking.utmSource": tracking.utmSource,
      "tracking.utmMedium": tracking.utmMedium,
      "tracking.utmCampaign": tracking.utmCampaign,
      "tracking.referrer": tracking.referrer,
      "tracking.ip": getClientIp(req),
      "tracking.userAgent": req.headers["user-agent"] || undefined,
    });

    // completed হয়ে যাওয়া draft-কে যেন ভুলবশত আবার "ইনকমপ্লিট" লিস্টে ফিরিয়ে না আনে
    const draft = await DraftOrder.findOneAndUpdate(
      { sessionId, landingPageSlug, status: { $ne: "completed" } },
      update,
      { upsert: true, setDefaultsOnInsert: true, new: true },
    );

    const io = req.app.get("io");
    if (io && draft) emitDraftUpdate(io, draft);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Draft order save error:", error);
    return res.status(500).json({ message: "ড্রাফট সেভ করতে ব্যর্থ হয়েছে।" });
  }
};