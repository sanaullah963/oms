const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const axios = require("axios");
const { parseOrderDetails } = require("../utils/parser"); // পরবর্তী ধাপে তৈরি করা হবে
const { bookSteadfast } = require("../controllers/steadfastController");

// --- ১. GET /api/orders - সমস্ত অর্ডার ফেচ করা ---
router.get("/", async (req, res) => {
  try {
    // নতুন অর্ডারগুলি সবার উপরে দেখানোর জন্য createdAt: -1 (Descending) ব্যবহার করা হয়েছে
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
});

// --- ২. POST /api/orders/manual-single - ম্যানুয়াল অর্ডার সেভ করা ---
router.post("/manual-single", async (req, res) => {
  // এখানে io (Socket.IO instance) access করার জন্য app.get('io') ব্যবহার করতে হবে
  const io = req.app.get("io");
  try {
    const { rawInputText, totalCOD, productCode } = req.body;

    // ফ্রন্ট-এন্ড নিশ্চিত করবে যে rawInputText এবং totalCOD আছে
    if (!rawInputText || !totalCOD) {
      return res.status(400).json({
        message: "Raw input text and COD amount are required.",
        status: "error",
      });
    }
    const parsedData = parseOrderDetails(rawInputText);

    // খ. ডেটা যাচাই
    if (
      !parsedData.castomerName ||
      !parsedData.castomerPhone ||
      !parsedData.castomerAddress
    ) {
      return res.status(400).json({
        message:
          "Parsing failed. Please ensure Name, Phone, and Address are present in the text.",
      });
    }

    // গ. নতুন অ্যাক্টিভিটি তৈরি
    const initialActivities = [
      {
        type: "Order Created",
        description: "Manual order created from raw text input.",
      },
      {
        type: "Status Updated",
        description: `Status set to Pending.`,
        details: { newStatus: "Pending" },
      },
    ];


    // ঘ. নতুন অর্ডার ডকুমেন্ট তৈরি ও সেভ
    // console.log("courier histroy", histroy);
    const newOrder = new Order({
      rawInputText,
      castomerName: parsedData.castomerName,
      castomerPhone: parsedData.castomerPhone,
      castomerAddress: parsedData.castomerAddress,
      productCode: productCode, // ফ্রন্ট-এন্ড থেকে বা পার্সিং লজিক থেকে আসবে
      totalCOD: totalCOD,
      activities: initialActivities,
    });
    const savedOrder = await newOrder.save();
    // ঙ. রিয়েল-টাইম আপডেট (ভার্সন ২.০ এর জন্য সেটআপ)
    if (io) {
      io.emit("new_order_added", savedOrder);
    }

    res.status(201).json({
      message: "Order created successfully!",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error saving manual order:", error);
    res.status(500).json({ message: "Server error while processing order." });
  }
});

//--- delete //api/orders/delete/:id
router.delete("/delete/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    // console.log(orderId);

    const deletedOrder = await Order.findByIdAndDelete(orderId);
    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }
    res.status(200).json({ message: "সফলভাবে ডিলিট করা হয়েছে" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Server error while deleting order." });
  }
});

//--- update //api/orders/update-order/:id
router.put("/update-order/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const data = {
      ...req.body,
      $push: {
        activities: {
          description: "address updated",
          type: " Updated",
          changedAt: new Date(),
        },
      },
    };
    const updatedOrder = await Order.findByIdAndUpdate(orderId, data, {
      new: true,
    });
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }
    res
      .status(200)
      .json({ message: "সফলভাবে অপডেট করা হয়েছে", order: updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Server error while updating order." });
  }
});
// steadfast booking 
router.post("/courier/steadfast/:orderId", bookSteadfast);

// status check for steadfast
// --- Steadfast Webhook Endpoint ---
router.post("/webhook/steadfast", async (req, res) => {
    const io = req.app.get("io"); // Socket.io instance
    const { order_id, status, tracking_code } = req.body;

    try {
        // ১. ডাটাবেজে অর্ডারটি খুঁজে বের করে আপডেট করা
        // এখানে 'order_id' হলো আপনার ডাটাবেজের অর্ডার আইডি অথবা ইনভয়েস আইডি যা আপনি বুকিং এর সময় পাঠিয়েছিলেন
        const updatedOrder = await Order.findOneAndUpdate(
            { _id: order_id }, // অথবা আপনার অর্ডারের ইনভয়েস ফিল্ড
            { 
                $set: { "courier.bookingStatus": status, orderCourierStatus: status },
                $push: { 
                    activities: { 
                        type: "Courier Update", 
                        description: `Steadfast Status: ${status}`,
                        changedAt: new Date()
                    } 
                } 
            },
            { new: true }
        );

        if (updatedOrder) {
            // ২. রিয়েল-টাইম ফ্রন্টএন্ড আপডেট (Admin Dashboard এ সরাসরি পরিবর্তন দেখা যাবে)
            if (io) {
                io.emit("orderStatusChange", updatedOrder);
            }
            return res.status(200).json({ success: true, message: "Webhook processed" });
        } else {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;
