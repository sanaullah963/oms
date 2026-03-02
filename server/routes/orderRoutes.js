const express = require("express");
const router = express.Router();
const axios = require("axios");
const Order = require("../models/Order");
const { parseOrderDetails } = require("../utils/parser"); // পরবর্তী ধাপে তৈরি করা হবে
const { bookSteadfast } = require("../controllers/steadfastController");

router.get("/", async (req, res) => {
  try {
    // ১. সঠিক টাইমজোন মেইনটেইন করে ৩ দিন আগের সময় বের করা
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 1);
    // const query = {
    //   $or: [
    //     {
    //       orderStatus: { $in: ["Cancelled", "Booked"] },
    //       // createdAt: { $gte: threeDaysAgo }, // শুধুমাত্র ৩ দিনের ডেটা
    //       "activities[activities.length - 1].tmestamp": { $gte: threeDaysAgo },
    //     },
    //     {
    //       orderStatus: { $nin: ["Cancelled", "Booked"] }, // বাকি সব স্ট্যাটাসের সব ডেটা
    //     },
    //   ],
    // };

    const orders = await Order.aggregate([
      // 1️⃣ last activity বের করা
      {
        $addFields: {
          lastActivityTime: {
            $arrayElemAt: ["$activities.timestamp", -1],
          },
        },
      },

      // 2️⃣ filter
      {
        $match: {
          $or: [
            {
              orderStatus: { $in: ["Cancelled", "Booked"] },
              lastActivityTime: { $gte: threeDaysAgo },
            },
            {
              orderStatus: { $nin: ["Cancelled", "Booked"] },
            },
          ],
        },
      },

      // 3️⃣ sort by last activity
      {
        $sort: {
          lastActivityTime: -1,
        },
      },
    ]); // সর্ট করা;

    // ৪. যদি কোনো ডেটা না পাওয়া যায়
    if (!orders || orders.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
});

// --- ২. POST /api/orders/manual-single - ম্যানুয়াল অর্ডার সেভ করা ---
router.post("/manual-single", async (req, res) => {
  const io = req.app.get("io");
  
  try {
    const { rawInputText } = req.body;
    console.log("request for add order--");
    if (!rawInputText) {
      return res.status(400).json({
        message: "Raw input text are required.",
        status: "error",
      });
    }
    const multipleOrdersPattern =
      /\[\d{1,2}\/\d{1,2},\s\d{1,2}:\d{2}\s(?:AM|PM|am|pm)\]\s[^:]+:\s?/g; //for multiple order

    // multipleOrders === orderBlocks
    let multipleOrders = rawInputText
      .split(multipleOrdersPattern)
      .filter((content) => content.trim().length > 5);

    if (multipleOrders.length === 0) {
      multipleOrders = [rawInputText];
    }

    const ordersToSave = [];

    multipleOrders.map((order, index) => {
      const Splitwords = order.trim().split(/\s+/); //for cod and product code
      const totalCOD =
        Splitwords.length >= 1 ? Splitwords[Splitwords.length - 1] : "0"; //for cod
      const productCode =
        Splitwords.length >= 2 ? Splitwords[Splitwords.length - 2] : "empty";
      const parsedData = parseOrderDetails(order); //parce order details

      // খ. ডেটা যাচাই

      if (parsedData.castomerName && parsedData.castomerPhone) {
        ordersToSave.push({
          rawInputText: order,
          castomerName: parsedData.castomerName,
          castomerPhone: parsedData.castomerPhone,
          productCode: productCode,
          totalCOD: totalCOD,
          activities: [
            {
              type: "Order Created",
              description:
                multipleOrders.length > 1
                  ? "Bulk created"
                  : "Manual single created",
            },
          ],
        });
      }
    });

    // ৪. যদি কোনো বৈধ অর্ডার না পাওয়া যায়
    if (ordersToSave.length === 0) {
      return res.status(400).json({
        message:
          "Parsing failed. Could not identify valid order in the provided text.",
      });
    }

    const savedOrder = await Order.insertMany(ordersToSave);
    if (io) {
      savedOrder.forEach((order) => {
        io.emit("orderStatusChange", order);
      });
    }

    res.status(201).json({
      message: `${savedOrder.length} orders created`,
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

// --------steadfast booking
router.post("/courier/steadfast/:orderId", bookSteadfast);

// status check for steadfast
// --- Steadfast Webhook Endpoint ---
router.post("/webhook/steadfast", async (req, res) => {

  const io = req.app.get("io"); // Socket.io instance
  const {
    consignment_id,
    invoice,
    status,
    notification_type,
    tracking_message,
  } = req.body;

  try {
    // --- 1.  Update  object for MongoDB ---
    const updateData = {
      $push: {
        activities: {
          actor: "Steadfast",
          type: notification_type,
          description: tracking_message,
        },
      },
    };

    if (status) {
      // undefined, null, "", false সব falsey হিসেবে কাজ করবে
      updateData.$set = {
        "courier.bookingStatus": status,
      };
    }

    const updatedOrder = await Order.findOneAndUpdate(
      {
        $or: [{ _id: invoice }, { "courier.trackingId": consignment_id }],
      },
      updateData,
      { new: true },
    );
    console.log("updatedOrder=======", updatedOrder);
    if (updatedOrder) {
      // ২. রিয়েল-টাইম ফ্রন্টএন্ড আপডেট (Admin Dashboard এ সরাসরি পরিবর্তন দেখা যাবে)
      if (io) {
        io.emit("orderStatusChange", updatedOrder);
      }
      return res
        .status(200)
        .json({ success: true, message: "Webhook processed" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
