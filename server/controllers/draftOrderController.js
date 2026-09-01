const DraftOrder = require("../models/DraftOrder");
const LandingPage = require("../models/LandingPage");
const {
  emitDraftRemove,
  emitDraftUpdate,
} = require("../utils/socketBroadcast");
const { withLandingPageMeta } = require("../utils/draftOrderView");
const { createLandingOrder } = require("../utils/landingOrderCreation");

const PHONE_REGEX = /^01[3-9]\d{8}$/;

// callStatus এর জন্য বৈধ ইনপুট ভ্যালু — "reopen" স্কিমাতে নেই, এটা শুধু
// callStatus-কে আবার "none"-এ ফিরিয়ে নেওয়ার একটা বিশেষ নির্দেশ (ভুল করে
// cancel/talked করে ফেললে বা কাস্টমার আবার যোগাযোগ করলে ব্যবহার করার জন্য)
const CALL_STATUS_INPUTS = [
  "no_answer",
  "phone_off",
  "talked",
  "cancelled",
  "reopen",
];

// --- PATCH /api/orders/drafts/:id — এডমিন ড্রাফট এডিট করে সেভ করে (কনভার্ট না করেই,
// শুধু তথ্য ঠিক করার জন্য — যেমন কাস্টমার ফোনে ঠিকানা বদলাতে বললে) ---
exports.updateDraftOrder = async (req, res) => {
  try {
    const { name, phone, address, quantity, productTypeId, deliveryArea } =
      req.body;

    if (phone !== undefined && !PHONE_REGEX.test(String(phone).trim())) {
      return res.status(400).json({
        message: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (013-019, মোট ১১ ডিজিট)।",
      });
    }

    const existingDraft = await DraftOrder.findById(req.params.id);
    if (!existingDraft) {
      return res.status(404).json({ message: "ড্রাফট খুঁজে পাওয়া যায়নি।" });
    }

    const page = await LandingPage.findOne({
      slug: existingDraft.landingPageSlug,
      isActive: true,
    });
    if (!page) {
      return res
        .status(404)
        .json({ message: "এই ড্রাফটের ল্যান্ডিং পেজটি এখন সক্রিয় নেই।" });
    }

    if (quantity !== undefined) {
      const qty = parseInt(quantity, 10);
      if (!Number.isInteger(qty) || qty < 1) {
        return res
          .status(400)
          .json({ message: "সঠিক quantity নির্বাচন করুন।" });
      }
    }

    const effectiveProductTypeId =
      productTypeId !== undefined ? productTypeId : existingDraft.productTypeId;
    const effectiveDeliveryArea =
      deliveryArea !== undefined ? deliveryArea : existingDraft.deliveryArea;
    if (page.productTypes?.length > 0) {
      if (
        !effectiveProductTypeId ||
        !page.productTypes.id(effectiveProductTypeId)
      ) {
        return res
          .status(400)
          .json({ message: "সঠিক প্রোডাক্ট টাইপ/প্যাকেজ নির্বাচন করুন।" });
      }
      const selectedType = page.productTypes.id(effectiveProductTypeId);
      if (
        selectedType.freeDelivery === false &&
        !["inside", "outside"].includes(effectiveDeliveryArea)
      ) {
        return res
          .status(400)
          .json({ message: "ডেলিভারি এলাকা নির্বাচন করা আবশ্যক।" });
      }
    } else if (
      page.freeDelivery === false &&
      !["inside", "outside"].includes(effectiveDeliveryArea)
    ) {
      return res
        .status(400)
        .json({ message: "ডেলিভারি এলাকা নির্বাচন করা আবশ্যক।" });
    }

    const draft = await DraftOrder.findByIdAndUpdate(
      req.params.id,
      {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(quantity !== undefined && {
          quantity: Math.max(1, parseInt(quantity, 10) || 1),
        }),
        ...(productTypeId !== undefined && { productTypeId }),
        ...(deliveryArea !== undefined && { deliveryArea }),
        lastActivityAt: new Date(),
      },
      { new: true },
    );

    if (!draft) {
      return res.status(404).json({ message: "ড্রাফট খুঁজে পাওয়া যায়নি।" });
    }

    const enrichedDraft = withLandingPageMeta(draft, page);
    const io = req.app.get("io");
    if (io) emitDraftUpdate(io, enrichedDraft);

    return res.status(200).json({ success: true, draft: enrichedDraft });
  } catch (error) {
    console.error("Update draft order error:", error);
    return res
      .status(500)
      .json({ message: "ড্রাফট আপডেট করতে ব্যর্থ হয়েছে।" });
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

    if (!name?.trim() || !address?.trim()) {
      return res.status(400).json({ message: "নাম ও সম্পূর্ণ ঠিকানা আবশ্যক।" });
    }
    if (!PHONE_REGEX.test(String(phone).trim())) {
      return res.status(400).json({
        message: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (013-019, মোট ১১ ডিজিট)।",
      });
    }

    const page = await LandingPage.findOne({
      slug: draft.landingPageSlug,
      isActive: true,
    });
    if (!page) {
      return res
        .status(404)
        .json({ message: "এই ড্রাফটের ল্যান্ডিং পেজটি এখন সক্রিয় নেই।" });
    }

    const qty = parseInt(quantity, 10);
    if (qty < 1) {
      return res.status(400).json({ message: "সঠিক quantity নির্বাচন করুন।" });
    }

    if (page.productTypes?.length > 0) {
      if (!productTypeId) {
        return res
          .status(400)
          .json({ message: "প্রোডাক্ট টাইপ/প্যাকেজ নির্বাচন করা আবশ্যক।" });
      }
      const selectedType = page.productTypes.id(productTypeId);
      if (!selectedType) {
        return res
          .status(400)
          .json({
            message:
              "নির্বাচিত প্রোডাক্ট টাইপ/প্যাকেজটি এই ল্যান্ডিং পেইজে নেই।",
          });
      }
      if (
        selectedType.freeDelivery === false &&
        !["inside", "outside"].includes(deliveryArea)
      ) {
        return res
          .status(400)
          .json({ message: "ডেলিভারি এলাকা নির্বাচন করা আবশ্যক।" });
      }
    } else if (
      page.freeDelivery === false &&
      !["inside", "outside"].includes(deliveryArea)
    ) {
      return res
        .status(400)
        .json({ message: "ডেলিভারি এলাকা নির্বাচন করা আবশ্যক।" });
    }

    const io = req.app.get("io");

    let order;
    try {
      const result = await createLandingOrder({
        page,
        name,
        phone,
        address,
        quantity: qty,
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
        return res
          .status(creationError.statusCode)
          .json({ message: creationError.message });
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

// --- PATCH /api/orders/drafts/:id/call-status — কাস্টমারকে কল করার পর কী হলো তা
// লগ করার জন্য (কল ধরেনি / ফোন বন্ধ / কথা হয়েছে-কাস্টম নোট / বাতিল)। "cancelled"
// সেট হলে draft-টা ডিলিট হয় না, শুধু getDraftOrders-এর ডিফল্ট লিস্ট থেকে বাদ পড়ে
// যায় (দেখুন orderController.getDraftOrders)। "reopen" পাঠালে callStatus আবার
// "none"-এ ফিরে যায় (ভুল করে বাতিল হয়ে গেলে বা কাস্টমার আবার যোগাযোগ করলে)। ---
exports.updateDraftCallStatus = async (req, res) => {
  try {
    const { callStatus, note } = req.body;

    if (!CALL_STATUS_INPUTS.includes(callStatus)) {
      return res
        .status(400)
        .json({ message: "সঠিক কল স্ট্যাটাস নির্বাচন করুন।" });
    }

    // "কথা হয়েছে" স্ট্যাটাসের মূল উদ্দেশ্যই হলো কী কথা হয়েছে সেটা কাস্টমভাবে
    // লিখে রাখা, তাই নোট ছাড়া এই স্ট্যাটাস সেভ হতে দেওয়া হয় না।
    if (callStatus === "talked" && !note?.trim()) {
      return res
        .status(400)
        .json({ message: "কাস্টমারের সাথে কী কথা হয়েছে তা লিখুন।" });
    }

    const draft = await DraftOrder.findById(req.params.id);
    if (!draft) {
      return res.status(404).json({ message: "ড্রাফট খুঁজে পাওয়া যায়নি।" });
    }

    const isReopen = callStatus === "reopen";
    const nextStatus = isReopen ? "none" : callStatus;

    draft.callStatus = nextStatus;
    draft.lastCallAt = new Date();

    if (isReopen) {
      draft.callNote = null;
    } else {
      draft.callNote = note?.trim() || null;
      draft.callAttempts = (draft.callAttempts || 0) + 1;
      draft.callLogs.push({
        status: callStatus,
        note: note?.trim() || null,
        by: req.user?.name || null,
        at: new Date(),
      });
    }

    await draft.save();

    const page = await LandingPage.findOne({
      slug: draft.landingPageSlug,
    });
    const enrichedDraft = withLandingPageMeta(draft, page);

    const io = req.app.get("io");
    if (io) {
      if (nextStatus === "cancelled") {
        // বাতিল হলে "ইনকমপ্লিট" লিস্ট থেকে সরে যাবে (ডিলিট হয় না, রিওপেন করা যায়)
        emitDraftRemove(io, draft._id);
      } else {
        emitDraftUpdate(io, enrichedDraft);
      }
    }

    return res.status(200).json({ success: true, draft: enrichedDraft });
  } catch (error) {
    console.error("Update draft call status error:", error);
    return res
      .status(500)
      .json({ message: "কল স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে।" });
  }
};