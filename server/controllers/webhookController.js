const Order = require("../models/Order");
const { STEADFAST_WEBHOOK_TOKEN } = require("../config/env");
const { calculateCodCharge } = require("../utils/codCharge");
const { emitOrderUpdate } = require("../utils/socketBroadcast");

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
  /zone not clear/i,
  /dispatch id:\s*\d+/i,
];

// ----------- Steadfast-এর অফিসিয়াল status ফিল্ড (delivery_status webhook-এ আসে) -> আমাদের courierStatus লেবেল ম্যাপিং
// note: সব ভ্যালু lowercase — Order.js স্কিমার enum, steadfastController.js/
// steadfastBulkController.js এবং client (OrderContext.jsx, page.js,
// OrderCard.jsx, FraudDetectionModal.jsx)-এর সাথে মিলিয়ে রাখা।
const STATUS_FIELD_MAP = {
  pending: "pending",
  delivered: "delivered",
  partial_delivered: "partial_delivered",
  cancelled: "cancelled",
  unknown: "unknown",
};
// ----------- note গুরুত্বপূর্ণ কিনা যাচাই -> সবসময় true/false রিটার্ন করে
function classifyNote(text) {
  if (!text) return false;
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
  { label: "assigned", pattern: /(assigned to rider|rider assigned|assigned for delivery)/i },
  { label: "cancelled", pattern: /(Cancelled|cancelled by system)/i },
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
// delivered/partial_delivered/cancelled সবাইকে একই (৪) rank দেওয়া হয়েছে,
// যাতে কুরিয়ার নিজে একটা final status থেকে আরেকটা final status-এ সংশোধন
// করলে (যেমন delivered -> partial_delivered) সেটা এখনও গ্রহণ করা যায়।
const STATUS_RANK = {
  unknown: 0,
  review: 1,
  pending: 2,
  assigned: 3,
  delivered: 4,
  partial_delivered: 4,
  cancelled: 4,
};

// ----------- courier status বের করার মূল ফাংশন
// প্রায়োরিটি: delivery_status webhook-এর অফিসিয়াল `status` ফিল্ড > tracking_message প্যাটার্ন ম্যাচিং
function getCourierStatus(data) {
  const text = data.tracking_message;

  if (data.notification_type === "delivery_status" && data.status) {
    const mapped = STATUS_FIELD_MAP[data.status.toLowerCase()];
    if (mapped) return mapped;
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
  const authHeader = req.headers["authorization"];

  // validation check
  if (!authHeader || authHeader !== `Bearer ${STEADFAST_WEBHOOK_TOKEN}`) {
    console.log("Unauthorized Access: Invalid Token");
    return res.status(401).json({
      status: "error",
      message: "Unauthorized: Invalid Token",
    });
  }

  const noteText = data.tracking_message || "null set by our server";
  const isImportant = classifyNote(noteText);
  const courierLabel = getCourierStatus(data);

  // create new activity
  const newActivity = {
    author: "Steadfast",
    description: data.tracking_message,
    type: data.notification_type,
  };

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

    if (!isDowngrade) {
      setFields["courier.courierStatus"] = courierLabel;
    } else {
      console.log(
        `Steadfast webhook: ignoring status downgrade for consignment ${data.consignment_id} (${currentLabel} -> ${courierLabel})`,
      );
    }

    // --- ফাইন্যান্সিয়াল ড্যাশবোর্ডের জন্য: delivery_status webhook-এ cod_amount ও delivery_charge আসে ---
    // (isDowngrade true হলে courierLabel কখনোই delivered/cancelled/partial_delivered
    // হতে পারে না, কারণ ওগুলো সর্বোচ্চ rank — তাই আলাদা করে isDowngrade চেক লাগছে না)
    const isFinalDeliveryEvent =
      data.notification_type === "delivery_status" &&
      (courierLabel === "delivered" ||
        courierLabel === "cancelled" ||
        courierLabel === "partial_delivered");

    if (isFinalDeliveryEvent) {
      setFields["courier.statusUpdatedAt"] = new Date();
      // setFields.orderStatus = courierLabel; // Order মডেলের orderStatus enum আলাদা (Capitalized) — একসাথে সিঙ্ক করতে চাইলে ম্যাপিং লাগবে

      if (typeof data.delivery_charge !== "undefined") {
        setFields["courier.deliveryCharge"] = Number(data.delivery_charge);
      }

      if (courierLabel === "delivered" || courierLabel === "partial_delivered") {
        const deliveredCodAmount = Number(data.cod_amount || 0);
        setFields["courier.deliveredCodAmount"] = deliveredCodAmount;
        setFields["courier.codChargeAmount"] = calculateCodCharge(
          deliveredCodAmount,
          data.delivery_charge,
        );
      }
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