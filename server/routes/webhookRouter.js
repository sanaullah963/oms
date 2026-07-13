// const express = require("express");
// const router = express.Router();
// require("dotenv").config();
// const Order = require("../models/Order");

// // ----------- note ignore patterns
// const IGNORE_PATTERNS = [
//   /consignment sent to .+ dispatch id/i,
//   /consignment has been received at/i,
//   /Consignment sent to .+/i,
//   /^Consignment sent to .+/i,
//   /policestation:.+to.+/i,
//   /received at fulfillment warehouse/i,
//   /sent to fulfillment warehouse/i,
//   /received at .+ hub/i,
//   /null set by /i,
//   /sent to .+ hub/i,
//   /zone not clear/i,
//   /dispatch id:\s*\d+/i,
// ];

// // ----------- courier status check patterns
// const COURIER_STATUS_PATTERNS = [
//   {
//     label: "Pending",
//     pattern: /(Pending|processing for delivery)/i,
//   },
//   {
//     label: "Assigned",
//     pattern: /Assigned to rider/i,
//   },
//   {
//     label: "Cancelled",
//     pattern: /(Cancelled|cancelled by system)/i,
//   },
//   {
//     label: "Delivered",
//     pattern: /Delivered/i,
//   },
// ];

// // ----------- courier status check function
// function getCourierLabel(text) { //COURIER_STATUS_PATTERNS
//   const matchedStatus = COURIER_STATUS_PATTERNS.find((item) =>
//     item.pattern.test(text),
//   );
//   return matchedStatus ? matchedStatus.label : "Unknown";
// }

// function classifyNote(text) { //IGNORE_PATTERNS
//   if (!text) return null;

//   // প্রথমে ignore check — যদি noise হয় skip
//   const shouldIgnore = IGNORE_PATTERNS.some((p) => p.test(text));
//   // true = ignore
//   if (shouldIgnore) return null;
//   else return true;
// }

// router.post("/steadfast", async (req, res) => {
//   const data = req.body;
//   const io = req.app.get("io");
//   const authHeader = req.headers["authorization"];
//   const mySecretToken = process.env.STEADFAST_WEBHOOK_TOKEN;

//   // validation check
//   if (!authHeader || authHeader !== `Bearer ${mySecretToken}`) {
//     console.log("Unauthorized Access: Invalid Token");
//     return res.status(401).json({
//       status: "error",
//       message: "Unauthorized: Invalid Token",
//     });
//   }

//   // classify note
//   const noteText = data.tracking_message || "null set by our server";
//   const classification = classifyNote(noteText); // true = important, false = ignore
//   const couierLabel = getCourierLabel(noteText);
//   // Activity object — সবসময় save হবে
//   const newActivity = {
//     author: "Steadfast",
//     description: data.tracking_message,
//     type: data.notification_type,
//   };
//   const updateObj = {
//     $push: { activities: newActivity },
//   };
//   updateObj.$set = {};
//   //set needsAttention true
//   if (classification) {
//     updateObj.$set = { needsAttention: true };
//   }
//   //srt couier status
//   if (couierLabel) {
//     updateObj.$set["courier.courierStatus"] = couierLabel;
//   }
//   try {
//     const updatedOrder = await Order.findOneAndUpdate(
//       { "courier.trackingId": data.consignment_id },
//       updateObj,
//       { new: true },
//     );

//     if (updatedOrder && io) {
//       io.emit("orderStatusChange", updatedOrder);
//     }
//     res.status(200).json({
//       status: "success",
//       message: "Webhook received successfully.",
//     });
//   } catch (error) {
//     console.log(error);
//   }
// });
// module.exports = router;




const express = require("express");
const router = express.Router();
require("dotenv").config();
const Order = require("../models/Order");

// ----------- note ignore patterns
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

// ----------- steadfast এর অফিসিয়াল status ফিল্ড (delivery_status webhook এ আসে) -> আমাদের courierStatus লেবেল ম্যাপিং
const STATUS_FIELD_MAP = {
  pending: "Pending",
  delivered: "Delivered",
  partial_delivered: "Partial Delivered",
  cancelled: "Cancelled",
  unknown: "Unknown",
};

// ----------- tracking_message এর উপর ভিত্তি করে courier status বের করার fallback প্যাটার্ন
// (tracking_update webhook এ কোনো status ফিল্ড থাকে না, শুধু tracking_message থাকে)
const COURIER_STATUS_PATTERNS = [
  {
    label: "Pending",
    pattern: /(Pending|processing for delivery)/i,
  },
  {
    label: "Assigned",
    pattern: /Assigned to rider/i,
  },
  {
    label: "Cancelled",
    pattern: /(Cancelled|cancelled by system)/i,
  },
  {
    label: "Delivered",
    pattern: /Delivered/i,
  },
];

// ----------- note গুরুত্বপূর্ণ কিনা যাচাই -> সবসময় true/false রিটার্ন করে
function classifyNote(text) {
  if (!text) return false;
  const shouldIgnore = IGNORE_PATTERNS.some((p) => p.test(text));
  return !shouldIgnore; // true = গুরুত্বপূর্ণ, false = ignorable
}

// ----------- courier status বের করার মূল ফাংশন
// প্রায়োরিটি: delivery_status webhook এর অফিসিয়াল `status` ফিল্ড > tracking_message প্যাটার্ন ম্যাচিং
function getCourierStatus(data) {
  const text = data.tracking_message;

  if (data.notification_type === "delivery_status" && data.status) {
    const mapped = STATUS_FIELD_MAP[data.status.toLowerCase()];
    if (mapped) return mapped;
  }

  if (!text) return "Unknown";
  const matchedStatus = COURIER_STATUS_PATTERNS.find((item) =>
    item.pattern.test(text),
  );
  return matchedStatus ? matchedStatus.label : "Unknown";
}

router.post("/steadfast", async (req, res) => {
  const data = req.body;
  const io = req.app.get("io");
  const authHeader = req.headers["authorization"];
  const mySecretToken = process.env.STEADFAST_WEBHOOK_TOKEN;

  // validation check
  if (!authHeader || authHeader !== `Bearer ${mySecretToken}`) {
    console.log("Unauthorized Access: Invalid Token");
    return res.status(401).json({
      status: "error",
      message: "Unauthorized: Invalid Token",
    });
  }
  console.log('steadfast webhook response',data);
  const noteText = data.tracking_message || "null set by our server";
  const isImportant = classifyNote(noteText); // true/false — কখনো null না
  const courierLabel = getCourierStatus(data);

  // Activity সবসময় save হবে, classification যাই হোক না কেন
  const newActivity = {
    author: "Steadfast",
    description: data.tracking_message,
    type: data.notification_type,
  };

  const updateObj = {
    $push: { activities: newActivity },
    $set: {
      needsAttention: isImportant, // explicit true/false
      "courier.courierStatus": courierLabel,
    },
  };

  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { "courier.trackingId": data.consignment_id },
      updateObj,
      { new: true },
    );

    if (updatedOrder && io) {
      io.emit("orderStatusChange", updatedOrder);
    }
    res.status(200).json({
      status: "success",
      message: "Webhook received successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
});

module.exports = router;