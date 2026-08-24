const LandingPage = require("../models/LandingPage");
const DraftOrder = require("../models/DraftOrder");
const { emitDraftRemove } = require("../utils/socketBroadcast");
const { checkBlocked } = require("../utils/fraudDetection");
const { createLandingOrder } = require("../utils/landingOrderCreation");

const PHONE_REGEX = /^01\d{9}$/;

// --- রিকোয়েস্ট থেকে আসল কাস্টমার IP বের করা (প্রক্সি/লোড-ব্যালেন্সারের পেছনে থাকলেও) ---
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || null;
}

// --- GET /api/public/landing-pages/:slug — কাস্টমার-facing পেজের কনফিগ ---
exports.getPublicLandingPage = async (req, res) => {
  try {
    const page = await LandingPage.findOne({
      slug: req.params.slug,
      isActive: true,
    });
    if (!page) {
      return res
        .status(404)
        .json({ message: "এই পেজটি খুঁজে পাওয়া যায়নি বা বন্ধ আছে।" });
    }
    return res.status(200).json({ page });
  } catch (error) {
    return res.status(500).json({ message: "পেজ লোড করতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/public/landing-pages/:slug/order — কাস্টমার অর্ডার সাবমিট করলে ---
exports.submitPublicOrder = async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      quantity,
      deliveryArea,
      productTypeId,
      honeypot,
      tracking = {},
    } = req.body;

    // 🛡️ বট প্রোটেকশন: এই ফিল্ডটা মানুষের জন্য UI-তে দেখানো হবে না, শুধু বট এটা পূরণ করবে
    if (honeypot) {
      return res.status(200).json({ success: true }); // বটকে বোঝানো হবে না যে ব্লক করা হয়েছে
    }

    if (!name || !phone || !address) {
      return res
        .status(400)
        .json({ message: "নাম, ফোন নম্বর ও ঠিকানা আবশ্যক।" });
    }
    if (!PHONE_REGEX.test(phone)) {
      return res
        .status(400)
        .json({ message: "সঠিক ফোন নম্বর দিন (উদাহরণ: 01XXXXXXXXX)।" });
    }

    const page = await LandingPage.findOne({
      slug: req.params.slug,
      isActive: true,
    });
    if (!page) {
      return res.status(404).json({ message: "এই পেজটি এখন সক্রিয় নেই।" });
    }

    const clientIp = getClientIp(req);

    // 🚫 ম্যানুয়ালি ব্লক করা কাস্টমার কিনা চেক করা (phone/fingerprint/ip/fbp/fbc/fbclid —
    // যেকোনো একটা ম্যাচ করলেই ব্লক ধরা হবে)। অটোমেটিক ব্লক-লিস্টে কেউ কখনো যোগ হয় না,
    // এই লিস্টে শুধু অ্যাডমিন ম্যানুয়ালি (Fraud Modal বা Blocked Customers পেজ থেকে) যোগ করে।
    const blockedRecord = await checkBlocked({
      phone,
      fingerprintHash: tracking.fingerprintHash || null,
      ip: clientIp,
      fbp: tracking.fbp || null,
      fbc: tracking.fbc || null,
      fbclid: tracking.fbclid || null,
    });

    if (blockedRecord) {
      return res.status(403).json({
        blocked: true,
        message:
          "আপনার অর্ডারটি এই মুহূর্তে গ্রহণ করা যাচ্ছে না। অনুগ্রহ করে হোয়াটসঅ্যাপে যোগাযোগ করুন।",
      });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const io = req.app.get("io");

    // --- pricing/order-creation/fraud-flag/notification/Lead-CAPI — সব লজিক এখন
    // শেয়ার্ড ফাংশনে (server/utils/landingOrderCreation.js), যেটা draft-to-order
    // কনভার্শনেও (draftOrderController.js) একই রকমভাবে ব্যবহার হয় ---
    let order, totalCOD;
    try {
      const result = await createLandingOrder({
        page,
        name,
        phone,
        address,
        quantity: qty,
        deliveryArea,
        productTypeId,
        tracking,
        clientIp,
        userAgent: req.headers["user-agent"],
        createdBy: null, // ল্যান্ডিং পেজের অর্ডার কোনো নির্দিষ্ট মডারেটরের না — সবার শেয়ার্ড পেন্ডিং কিউতে যাবে
        sourceLabel: "ল্যান্ডিং পেজ থেকে অর্ডার এসেছে",
        io,
      });
      order = result.order;
      totalCOD = result.totalCOD;
    } catch (creationError) {
      if (creationError.statusCode) {
        return res
          .status(creationError.statusCode)
          .json({ message: creationError.message });
      }
      throw creationError;
    }

    // --- একই সেশনের draft (যদি থাকে) সরাসরি ডিলিট করা — অর্ডার তো এতক্ষণে আসল Order
    // হিসেবে তৈরি হয়ে গেছে, তাই DraftOrder-এ আলাদা করে "completed" রেকর্ড রাখার দরকার
    // নেই। এতে "ইনকমপ্লিট" আর আসল অর্ডার — দুই জায়গায় কখনো একই কাস্টমারের তথ্য থাকবে না। ---
    if (tracking.sessionId) {
      DraftOrder.findOneAndDelete({
        sessionId: tracking.sessionId,
        landingPageSlug: page.slug,
        status: { $ne: "completed" },
      })
        .then((draft) => {
          if (draft && io) emitDraftRemove(io, draft._id);
        })
        .catch((err) => console.error("Draft delete error:", err));
    }

    return res.status(201).json({
      success: true,
      message:
        "অর্ডার সফলভাবে সম্পন্ন হয়েছে! শীঘ্রই আপনার সাথে যোগাযোগ করা হবে।",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Public landing order error:", error);
    return res
      .status(500)
      .json({ message: "অর্ডার করতে ব্যর্থ হয়েছে, আবার চেষ্টা করুন।" });
  }
};
