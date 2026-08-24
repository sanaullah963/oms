const DraftOrder = require("../models/DraftOrder");
const LandingPage = require("../models/LandingPage");
const { emitDraftRemove } = require("../utils/socketBroadcast");
const { createLandingOrder } = require("../utils/landingOrderCreation");

// --- PATCH /api/orders/drafts/:id — এডমিন ড্রাফট এডিট করে সেভ করে (কনভার্ট না করেই,
// শুধু তথ্য ঠিক করার জন্য — যেমন কাস্টমার ফোনে ঠিকানা বদলাতে বললে) ---
exports.updateDraftOrder = async (req, res) => {
  try {
    const { name, phone, address, quantity, productTypeId, deliveryArea } = req.body;

    const draft = await DraftOrder.findByIdAndUpdate(
      req.params.id,
      {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(quantity !== undefined && { quantity: Math.max(1, parseInt(quantity, 10) || 1) }),
        ...(productTypeId !== undefined && { productTypeId }),
        ...(deliveryArea !== undefined && { deliveryArea }),
      },
      { new: true },
    );

    if (!draft) {
      return res.status(404).json({ message: "ড্রাফট খুঁজে পাওয়া যায়নি।" });
    }

    return res.status(200).json({ success: true, draft });
  } catch (error) {
    console.error("Update draft order error:", error);
    return res.status(500).json({ message: "ড্রাফট আপডেট করতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/orders/drafts/:id/convert — একটা ড্রাফট (ইনকমপ্লিট) অর্ডারকে আসল
// Order-এ (Pending queue-তে) কনভার্ট করা। ব্যবহার: কাস্টমার ফর্ম আংশিক পূরণ করে
// সাবমিট না করেই চলে গেছে, অ্যাডমিন কল করে অর্ডার কনফার্ম করেছে — এই বাটনে ক্লিক
// করলে ম্যানুয়ালি নতুন অর্ডার না লিখে draft-এর সব তথ্য (নাম/ফোন/ঠিকানা/tracking
// ডেটাসহ) দিয়ে সরাসরি Pending queue-তে চলে যাবে, origin: "landing_page" সহ —
// ফলে পরে "Confirmed" করলে Meta Purchase CAPI ইভেন্ট ঠিকভাবে পাঠানো যাবে
// (ম্যানুয়ালি নতুন করে লিখলে এই attribution ডেটা হারিয়ে যেত)। ---
exports.convertDraftToOrder = async (req, res) => {
  try {
    const draft = await DraftOrder.findById(req.params.id);
    if (!draft) {
      return res.status(404).json({ message: "ড্রাফট খুঁজে পাওয়া যায়নি।" });
    }

    // body-তে এডিট করা ভ্যালু থাকলে সেটাই প্রায়োরিটি পাবে (কনভার্ট করার ঠিক আগে
    // এডমিন কিছু ঠিক করে থাকতে পারে), নাহলে draft-এ যা সেভ আছে তাই ব্যবহার হবে
    const name = req.body.name ?? draft.name;
    const phone = req.body.phone ?? draft.phone;
    const address = req.body.address ?? draft.address;
    const quantity = req.body.quantity ?? draft.quantity;
    const productTypeId = req.body.productTypeId ?? draft.productTypeId;
    const deliveryArea = req.body.deliveryArea ?? draft.deliveryArea;

    const page = await LandingPage.findOne({ slug: draft.landingPageSlug, isActive: true });
    if (!page) {
      return res.status(404).json({ message: "এই ড্রাফটের ল্যান্ডিং পেজটি এখন সক্রিয় নেই।" });
    }

    const io = req.app.get("io");

    let order;
    try {
      const result = await createLandingOrder({
        page,
        name,
        phone,
        address,
        quantity,
        deliveryArea,
        productTypeId,
        tracking: {
          sessionId: draft.sessionId,
          fbp: draft.tracking?.fbp,
          fbc: draft.tracking?.fbc,
          fbclid: draft.tracking?.fbclid,
          gclid: draft.tracking?.gclid,
          utmSource: draft.tracking?.utmSource,
          utmMedium: draft.tracking?.utmMedium,
          utmCampaign: draft.tracking?.utmCampaign,
          utmTerm: draft.tracking?.utmTerm,
          utmContent: draft.tracking?.utmContent,
          referrer: draft.tracking?.referrer,
          ip: draft.tracking?.ip,
          userAgent: draft.tracking?.userAgent,
          fingerprintHash: draft.tracking?.fingerprintHash,
        },
        clientIp: draft.tracking?.ip,
        userAgent: draft.tracking?.userAgent,
        createdBy: null, // ল্যান্ডিং পেজ অর্ডারের মতোই শেয়ার্ড পেন্ডিং কিউতে যাবে
        sourceLabel: `ইনকমপ্লিট অর্ডার থেকে কনভার্ট করা হয়েছে (${req.user?.name || "অ্যাডমিন"})`,
        io,
      });
      order = result.order;
    } catch (creationError) {
      if (creationError.statusCode) {
        return res.status(creationError.statusCode).json({ message: creationError.message });
      }
      throw creationError;
    }

    // draft-এ completedOrder রেফারেন্স রেখে ডিলিট (submitPublicOrder-এর মতোই আচরণ —
    // ইনকমপ্লিট লিস্ট আর পেন্ডিং লিস্টে একই কাস্টমার দুই জায়গায় থাকবে না)
    await DraftOrder.findByIdAndDelete(draft._id);
    if (io) emitDraftRemove(io, draft._id);

    return res.status(201).json({
      success: true,
      message: "ড্রাফট থেকে অর্ডার তৈরি হয়েছে, এখন Pending তালিকায় আছে।",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Convert draft to order error:", error);
    return res.status(500).json({ message: "কনভার্ট করতে ব্যর্থ হয়েছে।" });
  }
};