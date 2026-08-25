const axios = require("axios");
const Order = require("../models/Order");
const { emitOrderUpdate } = require("../utils/socketBroadcast");
const {
  STEADFAST_API_URL,
  STEADFAST_API_KEY,
  STEADFAST_SECRET_KEY,
} = require("../config/env");

exports.bookSteadfastBulk = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { orders_ids } = req.body;

    if (!orders_ids || !Array.isArray(orders_ids) || orders_ids.length === 0) {
      return res
        .status(400)
        .json({ message: "অর্ডার আইডি গুলো সঠিকভাবে পাঠানো হয়নি" });
    }

    // ১. ডাটাবেজ থেকে অর্ডারগুলো খুঁজে বের করা
    const orders = await Order.find({ _id: { $in: orders_ids } });

    if (orders.length === 0) {
      return res.status(404).json({ message: "কোন অর্ডার পাওয়া যায়নি" });
    }

    // ২. Steadfast ডকুমেন্টেশন অনুযায়ী ডাটা ফরম্যাট করা
    const bulkData = orders.map((order) => ({
      invoice: order._id.toString(),
      recipient_name: order.castomerName || "N/A",
      recipient_address: order.rawInputText || "N/A",
      recipient_phone: order.castomerPhone[0],
      cod_amount: order.totalCOD || 0,
      note: order.note || "",
    }));

    // ৩. Steadfast API-তে রিকোয়েস্ট পাঠানো
    const response = await axios.post(
      `${STEADFAST_API_URL}/create_order/bulk-order`,
      { data: JSON.stringify(bulkData) },
      {
        headers: {
          "Api-Key": STEADFAST_API_KEY,
          "Secret-Key": STEADFAST_SECRET_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    const { data, status } = response.data;

    // ৪. রেসপন্স হ্যান্ডেল করা
    if (status !== 200) {
      return res.status(400).json({
        message: "Booking failed- stead fast error",
        status: "error",
      });
    }

    // ৫. প্রতিটি অর্ডারকে তার নতুন courier তথ্য দিয়ে মিলিয়ে আপডেট করা
    // ✅ ফিক্স: আগে নেস্টেড .map(async...) ব্যবহার করে await ছাড়া রেখে দেওয়া হয়েছিল, ফলে
    // response পাঠানোর আগে সব order আপডেট শেষ হওয়ার নিশ্চয়তা ছিল না (race condition)।
    const orderMap = new Map(orders.map((order) => [order._id.toString(), order]));

    for (const newOrder of data) {
      const existingOrder = orderMap.get(newOrder.invoice);
      if (!existingOrder) continue;

      existingOrder.courier = {
        trackingId: newOrder?.consignment_id,
        bookedAt: new Date(),
        // bookingStatus: "Booked",
        courierStatus: "Review",
      };
      existingOrder.activities.push({
        author: "Steadfast",
        type: "Bulk Order Booked",
        description: `অর্ডার বুকিং হয়েছে (Tracking ID: ${newOrder?.consignment_id})`,
        changedAt: new Date(),
      });
      existingOrder.orderStatus = "Booked";
    }

    const newUpdatedOrders = await Promise.all(orders.map((order) => order.save()));

    newUpdatedOrders.forEach((order) => {
      emitOrderUpdate(io, order);
    });

    return res.status(200).json({
      message: "বুকিং হয়েছে",
      status: "success",
      newUpdatedOrders,
    });
  } catch (error) {
    console.error("Steadfast Bulk Booking Error:", error);
    return res.status(500).json({
      message: "বুকিং করার সময় সমস্যা হয়েছে",
      status: "error",
    });
  }
};
