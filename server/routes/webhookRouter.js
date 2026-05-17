const express = require("express");
const router = express.Router();
require("dotenv").config();
const Order = require("../models/Order");

// ----------- note ignore patterns
const IGNORE_PATTERNS = [
  /consignment sent to .+ dispatch id/i,
  /consignment has been received at/i,
  /Consignment sent to /i,
  /policestation:.+to.+/i,
  /received at fulfillment warehouse/i,
  /sent to fulfillment warehouse/i,
  /received at .+ hub/i,
  /null set by /i,
  /sent to .+ hub/i,
  /zone not clear/i,
  /dispatch id:\s*\d+/i,
];

// ----------- courier status check patterns
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

// ----------- courier status check function
function getCourierLabel(text) {
  const matchedStatus = COURIER_STATUS_PATTERNS.find((item) =>
    item.pattern.test(text),
  );
  return matchedStatus ? matchedStatus.label : "Unknown";
}

// ----------- note important patterns
function classifyNote(text) {
  if (!text) return null;

  // প্রথমে ignore check — যদি noise হয় skip
  const shouldIgnore = IGNORE_PATTERNS.some((p) => p.test(text));
  // true = ignore
  if (shouldIgnore) return null;
  else return true;
}

router.post("/steadfast", async (req, res) => {
  const data = req.body; // Steadfast এখান থেকে ডাটা পাঠাবে
  const io = req.app.get("io");
  // console.log("Steadfast Data Received:-----------", data);
  // check token
  // not check for testing
  const authHeader = req.headers["authorization"];
  const mySecretToken =
    process.env.STEADFAST_WEBHOOK_TOKEN ||
    "msbeauty_webhook_token_for_website_184307";

  // যদি টোকেন না মিলে তবে রিকোয়েস্ট রিজেক্ট করে দেওয়া ভালো
  if (!authHeader || authHeader !== `Bearer ${mySecretToken}`) {
    console.log("Unauthorized Access: Invalid Token");
    return res.status(401).json({
      status: "error",
      message: "Unauthorized: Invalid Token",
    });
  }

  // classify note
  const noteText = data.tracking_message || "null set by our server";
  const classification = classifyNote(noteText); // true = important, false = ignore
  const couierLabel = getCourierLabel(noteText);
  // Activity object — সবসময় save হবে
  const newActivity = {
    author: "Steadfast",
    description: data.tracking_message,
    type: data.notification_type,
  };
  const updateObj = {
    $push: { activities: newActivity },
  };
  updateObj.$set = {};
  //set needsAttention true
  if (classification) {
    updateObj.$set = { needsAttention: true };
  }
  //srt couier status
  if (couierLabel) {
    updateObj.$set["courier.courierStatus"] = couierLabel;
  }
  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { "courier.trackingId": data.consignment_id },
      updateObj,
      // {
      //   // $set: { orderStatus: data.status },
      //   $push: {
      //     activities: {
      //       author: "Steadfast",
      //       description: data.tracking_message,
      //       type: data.notification_type,
      //     },
      //   },
      // },
      { new: true },
    );
    // ৩. রিয়েল-টাইম আপডেট (Socket.IO)
    if (updatedOrder && io) {
      io.emit("orderStatusChange", updatedOrder);
    }
    res.status(200).json({
      status: "success",
      message: "Webhook received successfully.",
    });
  } catch (error) {
    console.log(error);
  }
});
module.exports = router;
