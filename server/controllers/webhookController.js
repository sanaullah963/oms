const crypto = require("crypto");
const Order = require("../models/Order");
const { STEADFAST_WEBHOOK_TOKEN } = require("../config/env");
const { calculateCodCharge } = require("../utils/codCharge");
const { emitOrderUpdate } = require("../utils/socketBroadcast");
const { buildActivity } = require("../utils/activityLogger");

// ----------- note ignore patterns (noise/অপ্রয়োজনীয় tracking message বাদ দেওয়ার জন্য)
const IGNORE_PATTERNS = [
  /consignment sent to .+ dispatch id/i,
  /consignment has been received at/i,
  /Consignment sent to .+/i,
  /^Consignment sent to .+/i,
  /policestation:.+to.+/i,
  /received at fulfillment warehouse/i,
  /sent to fulfillment warehouse/i,
  /received at .+ hub/i,
  /null set by /i,
  /sent to .+ hub/i,
  // /zone not clear/i,
  /dispatch id:\s*\d+/i,
];

// ----------- এই প্যাটার্ন মিললে needsAttention সবসময় true (IGNORE_PATTERNS-এর আগে চেক হয়)
const IMPORTANT_OVERRIDE_PATTERNS = [
  /rider\s*note/i, // Rider note: "..." / Rider Note: "..."
  /delivery attempt failed/i,
  /receiver could not be reached/i,
];

// ----------- courierTrackingAttention: শুধু পার্সেল মুভমেন্ট/ওয়্যারহাউজ মেসেজে true হবে
// (tracking_update webhook-এ + মেসেজ নিচের দুই ফরম্যাটের একটা হলে)
//   "Consignment has been received at BHANGA - FARIDPUR WAREHOUSE."
//   "Consignment has been received at CHARKAUA (BARISHAL)."
//   "Consignment has been received at BARISHAL SHORTING CENTER"
//   "Consignment sent to CHITTAGONG WAREHOUSE. Dispatch ID: 18427806"
//   "Consignment sent to ANWARA (CTG). Dispatch ID: 18446774"
const TRACKING_ATTENTION_PATTERNS = [
  /^\s*consignment has been received at\s+\S/i,
  /^\s*consignment sent to\s+\S/i,
];

function isTrackingAttentionMessage(text) {
  if (!text) return false;
  return TRACKING_ATTENTION_PATTERNS.some((p) => p.test(text));
}

// ----------- Steadfast-এর অফিসিয়াল status ফিল্ড (delivery_status webhook-এ আসে) -> আমাদের courierStatus লেবেল ম্যাপিং
// note: সব ভ্যালু lowercase — Order.js স্কিমার enum, steadfastController.js/
// steadfastBulkController.js এবং client (OrderContext.jsx, page.js,
// OrderCard.jsx, FraudDetectionModal.jsx)-এর সাথে মিলিয়ে রাখা।
//note: Steadfast-এর অফিসিয়াল "cancelled" আর সরাসরি আমাদের "cancelled" হয় না —
// কুরিয়ার ক্যান্সেল করলেও পার্সেলটা এখনো আমাদের হাতে ফেরত আসেনি, তাই আগে
// "cancel_parcel_pending"-এ যায়। চূড়ান্ত "cancelled" শুধু রিটার্ন মেসেজ
// (CANCEL_FLOW_PATTERNS) পেলেই সেট হয়।
const STATUS_FIELD_MAP = {
  pending: "pending",
  delivered: "delivered",
  partial_delivered: "partial_delivered",
  // cancelled: "cancelled",
  cancelled: "cancel_parcel_pending",
  unknown: "unknown",
};

// ----------- Cancel flow: tracking_message দেখে আমাদের নিজস্ব ২টা ধাপ + চূড়ান্ত cancelled
// (cancel_request এবং cancel_parcel_pending Steadfast অফিসিয়ালি পাঠায় না —
// এগুলো শুধু আমাদের ডাটাবেজের লেবেল)। এই প্যাটার্নগুলো অফিসিয়াল `status`
// ফিল্ডের আগে চেক করা হয়, কারণ "Consignment status has been updated as Cancelled"
// মেসেজটা অফিসিয়াল status: "cancelled"-এর সাথেই আসে।
//   ধাপ ১: "Consignment ID#305133315 cancellation request has been sent."          -> cancel_request
//   ধাপ ২: "Consignment has been cancelled by system." /
//          "Consignment status has been updated as Cancelled"                       -> cancel_parcel_pending
//   ধাপ ৩: "Consignment Return status has been updated to Processing"              -> cancelled (চূড়ান্ত)
// ধাপ ৩-এ ইচ্ছা করেই "Processing" বাদ দিয়ে শুধু "Return status has been updated to"
// ধরা হয়েছে — নাহলে পরে "Return ... Delivered" টাইপ মেসেজ এলে সেটা নিচের সাধারণ
// /Delivered/ প্যাটার্নে পড়ে ভুল করে "delivered" হয়ে যেত।
const CANCEL_FLOW_PATTERNS = [
  { label: "cancelled", pattern: /return status has been updated to/i },
  { label: "cancel_request", pattern: /cancellation request has been sent/i },
  {
    label: "cancel_parcel_pending",
    pattern: /(cancelled by system|status has been updated as cancelled)/i,
  },
];

// delivered/partial_delivered হয়ে যাওয়া পার্সেলকে cancel flow-এর মেসেজ যেন উল্টে না দেয়
// (partial delivery-র পরেও রিটার্ন মেসেজ আসতে পারে)
const DELIVERED_FINAL_LABELS = ["delivered", "partial_delivered"];
// ----------- note গুরুত্বপূর্ণ কিনা যাচাই -> সবসময় true/false রিটার্ন করে
function classifyNote(text) {
  if (!text) return false;
  // রাইডার নোট / ডেলিভারি ফেইল টাইপ মেসেজে অন্য কোনো ignore প্যাটার্ন (যেমন
  // "Consignment sent to ... Dispatch ID") মিশে থাকলেও এটা সবসময় গুরুত্বপূর্ণ
  if (IMPORTANT_OVERRIDE_PATTERNS.some((p) => p.test(text))) return true;
  const shouldIgnore = IGNORE_PATTERNS.some((p) => p.test(text));
  return !shouldIgnore; // true = গুরুত্বপূর্ণ, false = ignorable
}

// ----------- tracking_message-এর উপর ভিত্তি করে courier status বের করার fallback প্যাটার্ন
const COURIER_STATUS_PATTERNS = [
  { label: "pending", pattern: /(Pending|processing for delivery)/i },
  // Steadfast-এর অফিসিয়াল status ফিল্ডে কখনো "assigned" আসে না — শুধু
  // tracking_update মেসেজের টেক্সট থেকে অনুমান করা হয়, তাই একাধিক সম্ভাব্য
  // ওয়ার্ডিং রাখা হলো (তবুও এটা Steadfast-এর ডকুমেন্টেড কন্ট্র্যাক্ট না,
  // ওরা মেসেজ বদলালে এই প্যাটার্নও আপডেট করতে হবে)
  {
    label: "assigned",
    pattern: /(assigned to rider|rider assigned|assigned for delivery)/i,
  },
  // { label: "cancelled", pattern: /(Cancelled|cancelled by system)/i },
  // note: অন্য কোনো "cancelled" ওয়ার্ডিং এলেও সরাসরি চূড়ান্ত "cancelled" নয় —
  // সেটাও cancel_parcel_pending-এ যাবে (চূড়ান্ত cancelled শুধু CANCEL_FLOW_PATTERNS-এর রিটার্ন মেসেজে)
  {
    label: "cancel_parcel_pending",
    pattern: /(Cancelled|cancelled by system)/i,
  },
  // "delivered" প্যাটার্নের আগে চেক করতে হবে, কারণ "partially delivered"
  // টেক্সটেও "Delivered" শব্দটা থাকে
  { label: "partial_delivered", pattern: /partial(ly)?[\s-]?deliver(ed)?/i },
  { label: "delivered", pattern: /Delivered/i },
];

// ----------- courierStatus regression প্রতিরোধের জন্য rank ম্যাপ
// Steadfast-এর webhook সবসময় পাঠানো ক্রমেই পৌঁছায় তার গ্যারান্টি নেই।
// দেরিতে আসা একটা পুরনো tracking_update (যেমন "pending") একটা ইতিমধ্যে
// delivered/cancelled হয়ে যাওয়া অর্ডারকে আবার pending-এ ফিরিয়ে দিতে পারে —
// এটা ঠেকাতেই rank ব্যবহার করা হচ্ছে। rank কম হলে courierStatus স্কিপ হবে,
// কিন্তু activity/note সবসময়ই সেভ হবে (নিচে দেখুন)।
// delivered/partial_delivered/cancelled সবাইকে একই (৬) rank দেওয়া হয়েছে,
// যাতে কুরিয়ার নিজে একটা final status থেকে আরেকটা final status-এ সংশোধন
// করলে (যেমন delivered -> partial_delivered) সেটা এখনও গ্রহণ করা যায়।
// cancel flow: cancel_request(৪) -> cancel_parcel_pending(৫) -> cancelled(৬)।
// ফলে দেরিতে আসা পুরনো মেসেজ (যেমন cancelled হয়ে যাওয়ার পর আবার "cancelled by system"
// বা "pending") স্ট্যাটাস পিছিয়ে দিতে পারবে না, আবার cancel_request/cancel_parcel_pending
// থেকে delivered (ক্যান্সেল রিজেক্ট হয়ে ডেলিভারি হলে) যাওয়াও আটকাবে না।
const STATUS_RANK = {
  unknown: 0,
  review: 1,
  pending: 2,
  assigned: 3,
  cancel_request: 4,
  cancel_parcel_pending: 5,
  delivered: 6,
  partial_delivered: 6,
  cancelled: 6,
};

// ----------- courier status বের করার মূল ফাংশন
// প্রায়োরিটি: cancel flow মেসেজ প্যাটার্ন > delivery_status webhook-এর অফিসিয়াল `status` ফিল্ড > tracking_message প্যাটার্ন ম্যাচিং
function getCourierStatus(data) {
  const text = data.tracking_message;
  // --- ১. cancel flow (cancel_request / cancel_parcel_pending / চূড়ান্ত cancelled) ---
  if (text) {
    const cancelStep = CANCEL_FLOW_PATTERNS.find((item) =>
      item.pattern.test(text),
    );
    if (cancelStep) {
      console.log(
        `Steadfast webhook: cancel-flow message matched -> ${cancelStep.label} (consignment ${data.consignment_id}, type ${data.notification_type}, official status ${data.status}, message "${text}")`,
      );
      return cancelStep.label;
    }
  }

  // --- ২. অফিসিয়াল status ফিল্ড ---
  if (data.notification_type === "delivery_status" && data.status) {
    const mapped = STATUS_FIELD_MAP[data.status.toLowerCase()];
    if (mapped) {
      if (String(data.status).toLowerCase() === "cancelled") {
        console.log(
          `Steadfast webhook: official status "cancelled" -> ${mapped} (consignment ${data.consignment_id}; চূড়ান্ত cancelled-এর জন্য রিটার্ন মেসেজ লাগবে)`,
        );
      }
      return mapped;
    }
  }

  if (!text) return "unknown";
  const matchedStatus = COURIER_STATUS_PATTERNS.find((item) =>
    item.pattern.test(text),
  );
  return matchedStatus ? matchedStatus.label : "unknown";
}

// --- POST /api/webhook/steadfast ---
exports.handleSteadfastWebhook = async (req, res) => {
  const data = req.body;
  const io = req.app.get("io");

  // ----------- validation check
  // note: Steadfast আগে Authorization: Bearer <token> পাঠাতো, এখন তাদের নতুন
  // ডকুমেন্টেশন অনুযায়ী X-Signature হেডারে raw body-র HMAC-SHA256 পাঠায়।
  // এই মেথড বদলের কারণেই আগের Bearer check সবসময় fail করে 401 দিচ্ছিল, ফলে
  // tracking note/activity কিছুই সেভ হচ্ছিল না।
  const signature = req.headers["x-signature"];

  if (!signature || !req.rawBody) {
    console.log("Unauthorized Access: Missing Signature or Raw Body");
    return res.status(401).json({
      status: "error",
      message: "Unauthorized: Invalid Signature",
    });
  }

  let isValidSignature = false;
  try {
    const expectedSignature = crypto
      .createHmac("sha256", STEADFAST_WEBHOOK_TOKEN)
      .update(req.rawBody)
      .digest("hex");

    const givenBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");

    isValidSignature =
      givenBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(givenBuf, expectedBuf);
  } catch (err) {
    // malformed signature header (non-hex ইত্যাদি) হলে Buffer.from() throw করতে পারে
    isValidSignature = false;
  }

  if (!isValidSignature) {
    console.log("Unauthorized Access: Invalid Signature");
    return res.status(401).json({
      status: "error",
      message: "Unauthorized: Invalid Signature",
    });
  }

  // ----------- Steadfast raw response log (সিগনেচার ভ্যালিড হওয়ার পরে)
  // তারিখ ও সময় বাংলাদেশ টাইমে (Asia/Dhaka), যেমন: 24/10/2026, 10:53:12 pm
  const logTime = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    hour12: true,
  });
  console.log(`[STEADFAST WEBHOOK] [${logTime}] ${JSON.stringify(data)}`);

  const noteText = data.tracking_message || "null-set by our server";
  const isImportant = classifyNote(noteText); //true = গুরুত্বপূর্ণ, false = ignorable
  const courierLabel = getCourierStatus(data);

  // ----------- অ্যাক্টিভিটি লগের সময় — আমাদের সার্ভারে webhook পৌঁছানোর মুহূর্ত
  // (new Date()) না নিয়ে, Steadfast তাদের পেলোডে যে সময় status আপডেট হয়েছে সেই
  // `updated_at` পাঠায় সেটাই ব্যবহার করা হচ্ছে — এতে টাইমলাইনে আসল সময়টাই থাকে,
  // নেটওয়ার্ক/রিট্রাই ডিলের কারণে দেরিতে webhook পৌঁছালেও সময় ভুল দেখায় না।
  // পেলোডে `updated_at` না থাকলে বা invalid হলে বর্তমান সময়েই fallback করে।
  const parsedUpdatedAt = data.updated_at ? new Date(data.updated_at) : null;
  const activityTimestamp =
    parsedUpdatedAt && !Number.isNaN(parsedUpdatedAt.getTime())
      ? parsedUpdatedAt
      : new Date();

  // create new activity
  const newActivity = buildActivity({
    author: "Steadfast",
    description: data.tracking_message,
    timestamp: activityTimestamp,
    // type: data.notification_type,
  });

  const setFields = {
    needsAttention: isImportant,
  };

  try {
    // বর্তমান courierStatus আগে থেকে জেনে নেওয়া হচ্ছে, যাতে একটা দেরিতে আসা/
    // out-of-order webhook ইতিমধ্যে সেট হওয়া উঁচু-rank স্ট্যাটাসকে ডাউনগ্রেড
    // করে দিতে না পারে
    const existingOrder = await Order.findOne(
      { "courier.trackingId": data.consignment_id },
      { "courier.courierStatus": 1 },
    ).lean();

    const currentLabel = existingOrder?.courier?.courierStatus || "unknown";
    const currentRank = STATUS_RANK[currentLabel] ?? 0;
    const newRank = STATUS_RANK[courierLabel] ?? 0;
    const isDowngrade = newRank < currentRank;

    // চূড়ান্ত "cancelled" (রিটার্ন মেসেজ) আর delivered/partial_delivered-এর rank সমান,
    // তাই rank দিয়ে আটকায় না — আলাদা করে আটকানো হচ্ছে
    const isBlockedByDelivered =
      courierLabel === "cancelled" &&
      DELIVERED_FINAL_LABELS.includes(currentLabel);
    const shouldSkipStatus = isDowngrade || isBlockedByDelivered;

    // --- Courier Tracking Attention ---
    // true হবে শুধু: notification_type === "tracking_update" এবং মেসেজ ওয়্যারহাউজ/
    // মুভমেন্ট ফরম্যাটের (isTrackingAttentionMessage)। প্রতিটা নতুন মিল-করা আপডেটে
    // আবার true (অ্যাডমিন "Tracking OK" দেওয়ার পরেও)।
    // এই webhook-এর পরে অর্ডারের কার্যকর courierStatus cancel_parcel_pending হলে
    // ট্র্যাকিং মনিটরিং লাগে না — তাই true তো হবেই না, আগের true থাকলেও false হবে।
    const effectiveStatus = shouldSkipStatus ? currentLabel : courierLabel;
    if (effectiveStatus === "cancel_parcel_pending") {
      setFields.courierTrackingAttention = false;
    } else if (
      data.notification_type === "tracking_update" &&
      isTrackingAttentionMessage(data.tracking_message)
    ) {
      setFields.courierTrackingAttention = true;
    }

    if (!shouldSkipStatus) {
      setFields["courier.courierStatus"] = courierLabel;
      console.log(
        `Steadfast webhook: courierStatus ${currentLabel} -> ${courierLabel} for consignment ${data.consignment_id}`,
      );
      setFields["courier.courierStatus"] = courierLabel;
    } else {
      console.log(
        `Steadfast webhook: ignoring status change for consignment ${data.consignment_id} (${currentLabel} -> ${courierLabel}, ${isBlockedByDelivered ? "delivered order cancel-flow দিয়ে উল্টানো যাবে না" : "downgrade"})`,
      );
    }

    // --- ফাইন্যান্সিয়াল ড্যাশবোর্ডের জন্য: delivery_status webhook-এ cod_amount ও delivery_charge আসে ---
    const isDeliveryStatusEvent = data.notification_type === "delivery_status";

    // delivered/partial_delivered: আগের মতোই (delivery_status webhook-এই)
    const isDeliveredFinalEvent =
      isDeliveryStatusEvent &&
      (courierLabel === "delivered" || courierLabel === "partial_delivered");

    // চূড়ান্ত cancelled: রিটার্ন মেসেজ tracking_update হিসেবেও আসতে পারে, তাই
    // notification_type চেক করা হচ্ছে না — শুধু স্ট্যাটাস সত্যিই বসেছে কিনা দেখা হচ্ছে।
    // ড্যাশবোর্ডের cancelled কাউন্ট statusUpdatedAt দিয়ে ডেট-ফিল্টার হয়, তাই
    // এটা এখন "চূড়ান্ত cancelled হওয়ার সময়" নির্দেশ করবে।
    const isCancelFinalEvent =
      !shouldSkipStatus && courierLabel === "cancelled";

    // Steadfast-এর অফিসিয়াল delivery_status "cancelled"-এ delivery_charge আসে, কিন্তু আমাদের
    // স্ট্যাটাস তখন cancel_parcel_pending — চার্জটা তখনই সেভ রাখতে হবে, নাহলে পরে
    // রিটার্ন মেসেজ (যেটায় delivery_charge নাও থাকতে পারে) এলে চার্জ হারিয়ে যাবে।
    // (delivered/partial_delivered অর্ডারের চার্জ যেন ক্যান্সেল ইভেন্ট ওভাররাইট না করে সেটাও আটকানো)
    const isOfficialCancelEvent =
      isDeliveryStatusEvent &&
      String(data.status || "").toLowerCase() === "cancelled" &&
      !DELIVERED_FINAL_LABELS.includes(currentLabel);

    if (isDeliveredFinalEvent || isCancelFinalEvent) {
      setFields["courier.statusUpdatedAt"] = new Date();
      // setFields.orderStatus = courierLabel; // Order মডেলের orderStatus enum আলাদা (Capitalized) — একসাথে সিঙ্ক করতে চাইলে ম্যাপিং লাগবে

      if (isCancelFinalEvent) {
        console.log(
          `Steadfast webhook: consignment ${data.consignment_id} চূড়ান্তভাবে cancelled — statusUpdatedAt সেট হলো`,
        );
      }
    }
    if (
      (isDeliveredFinalEvent || isCancelFinalEvent || isOfficialCancelEvent) &&
      isDeliveryStatusEvent &&
      typeof data.delivery_charge !== "undefined"
    ) {
      setFields["courier.deliveryCharge"] = Number(data.delivery_charge);
    }

    if (isDeliveredFinalEvent) {
      const deliveredCodAmount = Number(data.cod_amount || 0);
      setFields["courier.deliveredCodAmount"] = deliveredCodAmount;
      setFields["courier.codChargeAmount"] = calculateCodCharge(
        deliveredCodAmount,
        data.delivery_charge,
      );
    }
    const updateObj = {
      $push: { activities: newActivity },
      $set: setFields,
    };

    const updatedOrder = await Order.findOneAndUpdate(
      { "courier.trackingId": data.consignment_id },
      updateObj,
      { new: true },
    );

    if (updatedOrder && io) {
      emitOrderUpdate(io, updatedOrder);
    }
    return res.status(200).json({
      status: "success",
      message: "Webhook received successfully.",
    });
  } catch (error) {
    console.error("Steadfast webhook error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};