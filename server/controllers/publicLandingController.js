const LandingPage = require("../models/LandingPage");
const Order = require("../models/Order");
const DraftOrder = require("../models/DraftOrder");
const { sendNotificationToApprovedUsers } = require("../utils/webPush");
const { emitOrderUpdate, emitDraftRemove } = require("../utils/socketBroadcast");
const { sendCapiEvent } = require("../utils/metaCapi");
const { checkFraudSignals, checkBlocked } = require("../utils/fraudDetection");

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
    const page = await LandingPage.findOne({ slug: req.params.slug, isActive: true });
    if (!page) {
      return res.status(404).json({ message: "এই পেজটি খুঁজে পাওয়া যায়নি বা বন্ধ আছে।" });
    }
    return res.status(200).json({ page });
  } catch (error) {
    return res.status(500).json({ message: "পেজ লোড করতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/public/landing-pages/:slug/order — কাস্টমার অর্ডার সাবমিট করলে ---
exports.submitPublicOrder = async (req, res) => {
  try {
    const { name, phone, address, quantity, honeypot, tracking = {} } = req.body;

    // 🛡️ বট প্রোটেকশন: এই ফিল্ডটা মানুষের জন্য UI-তে দেখানো হবে না, শুধু বট এটা পূরণ করবে
    if (honeypot) {
      return res.status(200).json({ success: true }); // বটকে বোঝানো হবে না যে ব্লক করা হয়েছে
    }

    if (!name || !phone || !address) {
      return res.status(400).json({ message: "নাম, ফোন নম্বর ও ঠিকানা আবশ্যক।" });
    }
    if (!PHONE_REGEX.test(phone)) {
      return res.status(400).json({ message: "সঠিক ফোন নম্বর দিন (উদাহরণ: 01XXXXXXXXX)।" });
    }

    const page = await LandingPage.findOne({ slug: req.params.slug, isActive: true });
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
    const totalCOD = page.price * qty;

    const order = await Order.create({
      rawInputText: `${name}\n${phone}\n${address}\nProduct: ${page.productName} x${qty}`,
      castomerName: name,
      castomerPhone: [phone],
      productCode: page.productCode,
      totalCOD,
      orderSource: page.productCode,
      origin: "landing_page", // ✅ শুধু এই ফ্ল্যাগ থাকলেই Confirm করার সময় Purchase CAPI ইভেন্ট যাবে
      createdBy: null, // ল্যান্ডিং পেজের অর্ডার কোনো নির্দিষ্ট মডারেটরের না — সবার শেয়ার্ড পেন্ডিং কিউতে যাবে
      activities: [
        {
          type: "Order Created",
          description: `ল্যান্ডিং পেজ থেকে অর্ডার এসেছে — "${page.productName}" (${qty}টি)`,
        },
      ],
      // --- Meta Pixel/CAPI-এর জন্য অ্যাট্রিবিউশন ডেটা সংরক্ষণ (এখনই Purchase পাঠানো হচ্ছে না,
      // শুধু ডেটা সেভ রাখা হচ্ছে — এডমিন "Confirmed" করলে তখন এই ডেটা দিয়ে Purchase পাঠানো হবে) ---
      tracking: {
        sessionId: tracking.sessionId || null,
        landingPageSlug: page.slug,
        fbp: tracking.fbp || null,
        fbc: tracking.fbc || null,
        fbclid: tracking.fbclid || null,
        gclid: tracking.gclid || null,
        utmSource: tracking.utmSource || null,
        utmMedium: tracking.utmMedium || null,
        utmCampaign: tracking.utmCampaign || null,
        utmTerm: tracking.utmTerm || null,
        utmContent: tracking.utmContent || null,
        referrer: tracking.referrer || null,
        ip: clientIp,
        userAgent: req.headers["user-agent"] || null,
        fingerprintHash: tracking.fingerprintHash || null,
      },
    });

    // 🔍 ফ্রড/ডুপ্লিকেট ডিটেকশন: আগের কোনো Order-এর সাথে Phone/Fingerprint/IP/Facebook
    // ম্যাচ করে কিনা খুঁজে বের করে অর্ডারের সাথে সেভ করে রাখা হয় — কাউকে অটোমেটিক
    // ব্লক করা হয় না, শুধু ড্যাশবোর্ডে Badge/Modal-এ দেখানোর জন্য ফ্ল্যাগ করা হয়।
    try {
      const fraudResult = await checkFraudSignals({
        phone,
        fingerprintHash: order.tracking.fingerprintHash,
        ip: order.tracking.ip,
        fbp: order.tracking.fbp,
        fbc: order.tracking.fbc,
        fbclid: order.tracking.fbclid,
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
      console.error("Fraud detection error:", fraudErr);
    }

    const io = req.app.get("io");
    if (io) emitOrderUpdate(io, order);

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

    sendNotificationToApprovedUsers({
      title: "🛒 নতুন অর্ডার (ল্যান্ডিং পেজ)",
      body: `${name} - "${page.productName}" x${qty} - ৳${totalCOD}`,
      url: "/",
    }).catch((err) => console.error("Landing order notification error:", err));

    // --- এই মুহূর্তে শুধু "Lead" ইভেন্ট পাঠানো হয় (ফর্ম সাবমিট করেছে) —
    // "Purchase" ইভেন্ট পাঠানো হবে না, সেটা এডমিন ম্যানুয়ালি "Confirmed" করলেই পাঠানো হবে ---
    sendCapiEvent({
      eventName: "Lead",
      orderId: order._id,
      sessionId: order.tracking.sessionId,
      userData: {
        phone,
        ip: order.tracking.ip,
        userAgent: order.tracking.userAgent,
        fbc: order.tracking.fbc,
        fbp: order.tracking.fbp,
      },
      customData: {
        value: totalCOD,
        contentName: page.productName,
        contentIds: [page.productCode],
        numItems: qty,
      },
    }).catch((err) => console.error("Meta CAPI Lead event error:", err));

    return res.status(201).json({
      success: true,
      message: "অর্ডার সফলভাবে সম্পন্ন হয়েছে! শীঘ্রই আপনার সাথে যোগাযোগ করা হবে।",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Public landing order error:", error);
    return res.status(500).json({ message: "অর্ডার করতে ব্যর্থ হয়েছে, আবার চেষ্টা করুন।" });
  }
};