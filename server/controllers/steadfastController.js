const axios = require("axios");
const Order = require("../models/Order");
const convertNumber = require("../utils/convertNumber");
const {
  STEADFAST_API_URL,
  STEADFAST_API_KEY,
  STEADFAST_SECRET_KEY,
} = require("../config/env");

exports.bookSteadfast = async (req, res) => {
  const { orderId } = req.params;

  try {
    // ১) অর্ডার খুঁজে আনা
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        message: "Order not found!",
        status: "error",
      });
    }

    // ২) ফোন নম্বর হ্যান্ডেল করা (Array বা string উভয় ফরম্যাট সাপোর্ট)
    let primaryPhone = "";
    if (Array.isArray(order.castomerPhone) && order.castomerPhone.length > 0) {
      primaryPhone = convertNumber(order.castomerPhone[0]);
    } else if (typeof order.castomerPhone === "string") {
      primaryPhone = convertNumber(order.castomerPhone);
    }

    // ৩) ভ্যালিডেশন চেক
    if (
      !order.castomerName ||
      order.castomerName.trim() === "" ||
      order.castomerName === "N/A"
    ) {
      return res.json({
        message: `Invalid Customer Name: ${order.castomerName}`,
        status: "error",
      });
    }

    // ৪) API Body তৈরি করা
    const requestData = {
      invoice: order._id.toString(),
      recipient_name: order.castomerName,
      recipient_phone: primaryPhone,
      recipient_address: order.rawInputText,
      cod_amount: Number(order.totalCOD),
      note: order.note || "",
    };

    // ৫) Steadfast API কল
    const response = await axios.post(`${STEADFAST_API_URL}/create_order`, requestData, {
      headers: {
        "Content-Type": "application/json",
        "Api-Key": STEADFAST_API_KEY,
        "Secret-Key": STEADFAST_SECRET_KEY,
      },
    });

    // ৬) রেসপন্স চেক এবং ডাটাবেজ আপডেট
    if (response?.data?.status !== 200) {
      order.orderStatus = "Booking Failed"
      order.courier = {
        // bookingStatus: "Failed",
        responseData: response?.data?.message || "Unknown Error",
      };
      await order.save();

      return res.status(400).json({
        message: `Booking failed: ${response?.data?.message}`,
        status: "error",
      });
    }

    // সফল হলে ডাটাবেজ আপডেট
    order.courier = {
      trackingId: response?.data?.consignment?.consignment_id,
      bookedAt: new Date(),
      // bookingStatus: "Booked",
      courierStatus: "Review",
    };

    order.activities.push({
      author: "Steadfast",
      type: "Order Booked",
      description: `অর্ডার বুকিং হয়েছে (Tracking ID: ${response?.data?.consignment?.consignment_id})`,
      changedAt: new Date(),
    });
    order.orderStatus = "Booked";
    const newUpdatedOrder = await order.save();

    // ৭) সাকসেস রেসপন্স
    return res.status(200).json({
      message: "Order booked successfully!",
      status: "success",
      trackingId: order.courier.trackingId,
      data: response.data,
      newUpdatedOrder,
    });
  } catch (error) {
    console.error("Steadfast API Error:", error.response?.data || error.message);

    return res.status(500).json({
      message: "Server error during Steadfast booking!",
      error: error.response?.data || error.message,
      status: "error",
    });
  }
};