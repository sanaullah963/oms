const Order = require("../models/Order");
const { sendNotificationToApprovedUsers } = require("./webPush");
const { emitOrderUpdate } = require("./socketBroadcast");
const { sendCapiEvent } = require("./metaCapi");
const { checkFraudSignals } = require("./fraudDetection");

/**
 * একটা লিডিং পেজ (page ডকুমেন্ট) ও কাস্টমার-ইনপুট থেকে আসল Order তৈরি করে —
 * origin: "landing_page" সহ, যাতে পরে অ্যাডমিন "Confirmed" করলে Purchase CAPI
 * ইভেন্ট ঠিকভাবে পাঠানো যায়। submitPublicOrder (কাস্টমার নিজে সাবমিট করলে) এবং
 * draftOrderController.convertDraftToOrder (অ্যাডমিন ড্রাফট থেকে কনভার্ট করলে) —
 * দুই জায়গাতেই এই একই ফাংশন ব্যবহার হয়, যাতে pricing/tracking/fraud/CAPI লজিক
 * দুইবার আলাদাভাবে লিখে ভুল হওয়ার/অসামঞ্জস্য তৈরি হওয়ার ঝুঁকি না থাকে।
 *
 * থ্রো করে { statusCode, message } আকারের এরর — কলার সেটা catch করে res পাঠাবে।
 */
async function createLandingOrder({
  page,
  name,
  phone,
  address,
  quantity,
  deliveryArea,
  productTypeId,
  tracking = {},
  clientIp,
  userAgent,
  createdBy = null,
  sourceLabel = "ল্যান্ডিং পেজ থেকে",
  io = null,
}) {
  const PHONE_REGEX = /^01[3-9]\d{8}$/;

  if (!name || !phone || !address) {
    throw { statusCode: 400, message: "নাম, ফোন নম্বর ও ঠিকানা আবশ্যক।" };
  }
  if (!PHONE_REGEX.test(phone)) {
    throw {
      statusCode: 400,
      message: "সঠিক ফোন নম্বর দিন (উদাহরণ: 01XXXXXXXXX)।",
    };
  }
  if (!page) {
    throw { statusCode: 404, message: "এই পেজটি এখন সক্রিয় নেই।" };
  }

  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1) {
    throw { statusCode: 400, message: "সঠিক quantity দিন।" };
  }

  // --- ইউনিট প্রাইস ও ডেলিভারি রুল — productTypes থাকলে সেই টাইপ অনুযায়ী, নাহলে
  // page-এর top-level রুল (submitPublicOrder-এর সাথে হুবহু একই লজিক) ---
  let unitPrice = page.price;
  let productTypeLabel = null;
  let freeDeliveryRule = page.freeDelivery;
  let insideChargeRule = page.deliveryChargeInsideDhaka;
  let outsideChargeRule = page.deliveryChargeOutsideDhaka;

  if (page.productTypes && page.productTypes.length > 0) {
    const selectedType = page.productTypes.id(productTypeId);
    if (!productTypeId) {
      throw {
        statusCode: 400,
        message: "প্রোডাক্ট টাইপ/প্যাকেজ নির্বাচন করা আবশ্যক।",
      };
    }
    if (!selectedType) {
      throw {
        statusCode: 400,
        message: "সঠিক প্রোডাক্ট টাইপ/প্যাকেজ নির্বাচন করুন।",
      };
    }
    unitPrice = selectedType.price;
    productTypeLabel = selectedType.label;
    freeDeliveryRule = selectedType.freeDelivery;
    insideChargeRule = selectedType.deliveryChargeInsideDhaka;
    outsideChargeRule = selectedType.deliveryChargeOutsideDhaka;
  }

  const area = deliveryArea === "outside" ? "outside" : "inside";
  let deliveryCharge = 0;
  if (!freeDeliveryRule && !["inside", "outside"].includes(deliveryArea)) {
    throw { statusCode: 400, message: "ডেলিভারি এলাকা নির্বাচন করা আবশ্যক।" };
  }
  if (!freeDeliveryRule) {
    const rawCharge = area === "outside" ? outsideChargeRule : insideChargeRule;
    deliveryCharge = Math.max(0, Number(rawCharge) || 0);
  }

  const totalCOD = unitPrice * qty + deliveryCharge;
  const productLabelSuffix = productTypeLabel ? ` (${productTypeLabel})` : "";

  const order = await Order.create({
    rawInputText: `${name}\n${phone}\n${address}\nProduct: ${page.productName}${productLabelSuffix} x${qty}\nDelivery: ৳${deliveryCharge} (${area === "outside" ? "ঢাকার বাইরে" : "ঢাকার ভেতরে"})`,
    castomerName: name,
    castomerPhone: [phone],
    productCode: page.productCode,
    totalCOD,
    orderSource: page.productCode,
    origin: "landing_page", // ✅ শুধু এই ফ্ল্যাগ থাকলেই Confirm করার সময় Purchase CAPI ইভেন্ট যাবে
    createdBy,
    activities: [
      {
        type: "Order Created",
        description: `${sourceLabel} — "${page.productName}${productLabelSuffix}" (${qty}টি)`,
      },
    ],
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
      ip: clientIp || tracking.ip || null,
      userAgent: userAgent || tracking.userAgent || null,
      fingerprintHash: tracking.fingerprintHash || null,
    },
  });

  // 🔍 ফ্রড/ডুপ্লিকেট ডিটেকশন ফ্ল্যাগ (ব্লক করে না, শুধু ড্যাশবোর্ডে দেখানোর জন্য)
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

  if (io) emitOrderUpdate(io, order);

  sendNotificationToApprovedUsers({
    title: "🛒 নতুন অর্ডার (ল্যান্ডিং পেজ)",
    body: `${name} - "${page.productName}" x${qty} - ৳${totalCOD}`,
    url: "/",
  }).catch((err) => console.error("Landing order notification error:", err));

  // --- Lead ইভেন্ট — কাস্টমার নিজে সাবমিট করলে সাথে সাথেই, অ্যাডমিন draft থেকে
  // কনভার্ট করলে এই মুহূর্তেই (এতদিন কোনো Lead ইভেন্টই যায়নি, কারণ ফর্ম কখনো
  // সাবমিট হয়নি) — দুই ক্ষেত্রেই Lead ইভেন্ট পাঠানো যুক্তিসঙ্গত ---
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

  return { order, totalCOD };
}

module.exports = { createLandingOrder };
