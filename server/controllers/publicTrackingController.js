const Session = require("../models/Session");
const DraftOrder = require("../models/DraftOrder");
const LandingPage = require("../models/LandingPage");
const { emitDraftUpdate } = require("../utils/socketBroadcast");
const { sendCapiEvent } = require("../utils/metaCapi");
const { withLandingPageMeta } = require("../utils/draftOrderView");

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

    // --- ⚠️ আগে এখানে আলাদা findOne() দিয়ে "existing" চেক করে তারপর নিচে আলাদা
    // findOneAndUpdate({upsert:true}) দিয়ে সেভ করা হতো — এই দুই ধাপের মাঝখানে একটা
    // race window ছিল: প্রায় একই সময়ে একই sessionId নিয়ে দুইটা রিকোয়েস্ট এলে দুটোই
    // "existing" কে null পেত, ফলে দুইবার PageView CAPI পাঠানো হতো (Meta-তে ডাবল API কল,
    // আর দ্বিতীয়টা EventLog-এ duplicate-key এরর দিয়ে সাইলেন্টলি ভেঙে যেত)।
    // এখন findOneAndUpdate({upsert:true, rawResult:true}) দিয়ে একটাই atomic অপারেশনে
    // "এই sessionId নতুন কিনা" বের করা হচ্ছে — race condition আর সম্ভব না। ---
    const upsertResult = await Session.findOneAndUpdate(
      { sessionId },
      { $setOnInsert: { sessionId, visitorId } },
      { upsert: true, setDefaultsOnInsert: true, rawResult: true, new: false },
    );
    const isNewSession = !upsertResult.lastErrorObject?.updatedExisting;
    let isReturnVisitor = upsertResult.value?.isReturnVisitor || false;

    if (isNewSession) {
      const priorCount = await Session.countDocuments({
        visitorId,
        sessionId: { $ne: sessionId },
      });
      isReturnVisitor = priorCount > 0;

      // --- এই সেশনের প্রথম হিট, অর্থাৎ আসল পেজভিউ — সার্ভার-সাইড CAPI PageView পাঠানো হচ্ছে ---
      // ব্রাউজার Pixel-এর PageView অনেক সময় AdBlock/ITP-এর কারণে মিস হয়ে যায়, তাই এটা সেই
      // ইভেন্টের একটা সার্ভার-সাইড ব্যাকআপ/সাপ্লিমেন্ট হিসেবে কাজ করবে। শুধু নতুন সেশনেই
      // পাঠানো হচ্ছে (heartbeat-এ বারবার না), যাতে একই ভিজিটের জন্য বারবার কাউন্ট না হয়।
      sendCapiEvent({
        eventName: "PageView",
        eventId: `pageview_${sessionId}`, // ভবিষ্যতে ব্রাউজার Pixel-এও এই eventId ব্যবহার করলে ডিডুপ হবে
        sessionId,
        eventSourceUrl:
          req.headers["referer"] || req.headers["origin"] || undefined,
        userData: {
          ip: getClientIp(req),
          userAgent: req.headers["user-agent"],
          fbc: tracking.fbc,
          fbp: tracking.fbp,
        },
        customData: {
          contentName: landingPageSlug || undefined,
        },
      }).catch((err) => console.error("Meta CAPI PageView event error:", err));
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
        (timeOnPageSeconds || 0) < 10 &&
        (clickCount || 0) === 0 &&
        (maxScrollDepth || 0) < 25;
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
// ⚠️ ক্লায়েন্ট-সাইডে (OrderSection.jsx) এখন এই API শুধু ফোন নম্বর ভ্যালিড হলেই কল হয়
// (আগে প্রতিটা কিস্ট্রোকেই কল হতো, অসম্পূর্ণ ফোন নম্বর দিয়েও) — তাই এখানে আলাদা করে
// phone ভ্যালিডেশন করার দরকার নেই, ইতিমধ্যে ভ্যালিড ফোন নিয়েই রিকোয়েস্ট আসছে ধরে নেওয়া হয়।
exports.saveDraftOrder = async (req, res) => {
  try {
    const {
      sessionId,
      visitorId,
      landingPageSlug,
      customerName,
      phone,
      address,
      quantity,
      productTypeId,
      deliveryArea,
      tracking = {},
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId আবশ্যক।" });
    }
    // নাম/ফোন/ঠিকানা তিনটাই খালি হলে সেভ করার দরকার নেই (অকারণ ড্রাফট এড়ানো)
    if (!customerName && !phone && !address) {
      return res.status(200).json({ success: true, skipped: true });
    }

    const page = landingPageSlug
      ? await LandingPage.findOne({ slug: landingPageSlug })
      : null;
    // productTypeId দেওয়া থাকলে সেই প্যাকেজের লেবেল ক্যাশ করে রাখা হচ্ছে (ড্যাশবোর্ডে
    // দেখানোর জন্য, প্রতিবার LandingPage lookup এড়াতে)
    const selectedType =
      productTypeId && page?.productTypes?.length
        ? page.productTypes.id(productTypeId)
        : null;

    // --- লক্ষ্য করুন: এখানে ইচ্ছাকৃতভাবে "status" সেট করা হচ্ছে না ---
    // কারণ DraftOrder স্কিমার enum হলো ["active","completed","abandoned"], আগে এখানে
    // ভুলবশত "draft" বসানো হতো যেটা স্কিমার সাথে মেলে না। নতুন ডকুমেন্ট হলে schema default
    // ("active") এমনিতেই বসে যাবে (setDefaultsOnInsert)। আর কাস্টমার সাবমিট করার পর যদি
    // দেরিতে কোনো auto-save রিকোয়েস্ট এসে পড়ে, সেটা যাতে ভুল করে আবার "completed" থেকে
    // "active"-এ ফিরিয়ে না দেয়, তাই নিচের ফিল্টারে completed draft বাদ দেওয়া হয়েছে।
    const update = buildUpdate({
      landingPageSlug,
      visitorId,
      name: customerName,
      phone,
      address,
      quantity: quantity || 1,
      productTypeId,
      productTypeLabel: selectedType?.label,
      deliveryArea: deliveryArea === "outside" ? "outside" : undefined,
      productName: page?.productName,
      lastActivityAt: new Date(),
      "tracking.fbp": tracking.fbp,
      "tracking.fbc": tracking.fbc,
      "tracking.fbclid": tracking.fbclid,
      "tracking.gclid": tracking.gclid,
      "tracking.utmSource": tracking.utmSource,
      "tracking.utmMedium": tracking.utmMedium,
      "tracking.utmCampaign": tracking.utmCampaign,
      "tracking.utmTerm": tracking.utmTerm,
      "tracking.utmContent": tracking.utmContent,
      "tracking.referrer": tracking.referrer,
      "tracking.ip": getClientIp(req),
      "tracking.userAgent": req.headers["user-agent"] || undefined,
      "tracking.fingerprintHash": tracking.fingerprintHash,
    });

    // completed হয়ে যাওয়া draft-কে যেন ভুলবশত আবার "ইনকমপ্লিট" লিস্টে ফিরিয়ে না আনে
    const draft = await DraftOrder.findOneAndUpdate(
      { sessionId, landingPageSlug, status: { $ne: "completed" } },
      update,
      { upsert: true, setDefaultsOnInsert: true, new: true },
    );

    const io = req.app.get("io");
    if (io && draft) emitDraftUpdate(io, withLandingPageMeta(draft, page));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Draft order save error:", error);
    return res.status(500).json({ message: "ড্রাফট সেভ করতে ব্যর্থ হয়েছে।" });
  }
};
