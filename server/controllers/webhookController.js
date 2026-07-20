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
const STATUS_FIELD_MAP = {
  pending: "Pending",
  delivered: "Delivered",
  partial_delivered: "Partial Delivered",
  cancelled: "Cancelled",
  unknown: "Unknown",
};

// ----------- tracking_message-এর উপর ভিত্তি করে courier status বের করার fallback প্যাটার্ন
const COURIER_STATUS_PATTERNS = [
  { label: "Pending", pattern: /(Pending|processing for delivery)/i },
  { label: "Assigned", pattern: /Assigned to rider/i },
  { label: "Cancelled", pattern: /(Cancelled|cancelled by system)/i },
  { label: "Delivered", pattern: /Delivered/i },
];

// ----------- note গুরুত্বপূর্ণ কিনা যাচাই -> সবসময় true/false রিটার্ন করে
function classifyNote(text) {
  if (!text) return false;
  const shouldIgnore = IGNORE_PATTERNS.some((p) => p.test(text));
  return !shouldIgnore; // true = গুরুত্বপূর্ণ, false = ignorable
}

// ----------- courier status বের করার মূল ফাংশন
// প্রায়োরিটি: delivery_status webhook-এর অফিসিয়াল `status` ফিল্ড > tracking_message প্যাটার্ন ম্যাচিং
function getCourierStatus(data) {
  const text = data.tracking_message;

  if (data.notification_type === "delivery_status" && data.status) {
    const mapped = STATUS_FIELD_MAP[data.status.toLowerCase()];
    if (mapped) return mapped;
  }

  if (!text) return "Unknown";
  const matchedStatus = COURIER_STATUS_PATTERNS.find((item) => item.pattern.test(text));
  return matchedStatus ? matchedStatus.label : "Unknown";
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

  const newActivity = {
    author: "Steadfast",
    description: data.tracking_message,
    type: data.notification_type,
  };

  const setFields = {
    needsAttention: isImportant,
    "courier.courierStatus": courierLabel,
  };

  // --- ফাইন্যান্সিয়াল ড্যাশবোর্ডের জন্য: delivery_status webhook-এ cod_amount ও delivery_charge আসে ---
  const isFinalDeliveryEvent =
    data.notification_type === "delivery_status" &&
    (courierLabel === "Delivered" || courierLabel === "Cancelled");

  if (isFinalDeliveryEvent) {
    setFields["courier.statusUpdatedAt"] = new Date();
    setFields.orderStatus = courierLabel; // "Delivered" | "Cancelled" (Order মডেলের enum-এ আগে থেকেই আছে)

    if (typeof data.delivery_charge !== "undefined") {
      setFields["courier.deliveryCharge"] = Number(data.delivery_charge);
    }

    if (courierLabel === "Delivered") {
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

  try {
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