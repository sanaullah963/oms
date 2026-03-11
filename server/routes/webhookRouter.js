const express = require("express");
const router = express.Router();
require("dotenv").config();
const Order = require("../models/Order");


router.post("/steadfast", async (req, res) => {
  const data = req.body; // Steadfast এখান থেকে ডাটা পাঠাবে
  const io = req.app.get("io");
  console.log("Steadfast Data Received:", data);
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


  // এখানে আপনার ডাটাবেজ আপডেট করার লজিক লিখুন

  const updatedOrder = await Order.findOneAndUpdate(
    { "courier.trackingId": data.consignment_id },
    {
      // $set: { orderStatus: data.status },
      $push: {
        activities: {
          actor: "Steadfast",
          description: data.tracking_message,
          type: existingOrder.orderStatus,
        },
      },
    },
    { new: true },
  );
  console.log("Updated Order:", updatedOrder);
  // ৩. রিয়েল-টাইম আপডেট (Socket.IO)
  if (updatedOrder && io) {
    io.emit("orderStatusChange", updatedOrder);
  }

  // অবশ্যই একটি 200 OK রেসপন্স পাঠাতে হবে
  res.status(200).json({
    status: "success",
    message: "Webhook received successfully.",
  });
});

module.exports = router;
