const axios = require("axios");
const Order = require("../models/Order");
const qs = require("qs"); // <-- অত্যন্ত গুরুত্বপূর্ণ
const { json } = require("body-parser");

// number ban to eng
function convertNumber(input) {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  const englishDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  let output = input;
  for (let i = 0; i < banglaDigits.length; i++) {
    output = output.replace(new RegExp(banglaDigits[i], "g"), englishDigits[i]);
  }
  return output;
}
exports.bookSteadfast = async (req, res) => {
  const { orderId } = req.params;

  try {
    // 1)----------------অর্ডার খুঁজে আনা
    const order = await Order.findById(orderId);
    if (!order) {
      return res.json({
        message: "Order not found!",
        status: "error",
      });
    }

    // 2)--------------Validation
    // convert number to english
    order.castomerPhone = convertNumber(order.castomerPhone);
    // check name
    if (
      !order.castomerName ||
      order.castomerName === "" ||
      order.castomerName === "N/A"
    ) {
      return res.json({
        message: `invalit castomer Name: ${order.castomerName}`,
        status: "error",
      });
    } // check phone
    else if (
      !order.castomerPhone ||
      order.castomerPhone === "" ||
      order.castomerPhone === "N/A" ||
      order.castomerPhone.length !== 11 ||
      order.castomerPhone[0] !== "0" ||
      order.castomerPhone[1] !== "1"
    ) {
      return res.json({
        message: `invalit castomer Phone: ${order.castomerPhone}`,
        status: "error",
      });
    }
    // check address
    else if (
      !order.rawInputText ||
      order.rawInputText === "" ||
      order.rawInputText === "N/A"
    ) {
      return res.status(400).json({
        message: `invalit castomer Address: ${order.rawInputText}`,
        status: "error",
      });
    }
    // check totalCOD
    else if (
      !order.totalCOD ||
      order.totalCOD === "" ||
      order.totalCOD === "N/A" ||
      order.totalCOD < 0 ||
      order.totalCOD !== parseInt(order.totalCOD)
    ) {
      return res.json({
        message: `invalit totalCOD: ${order.totalCOD}`,
        status: "error",
      });
    }
    const riderNote = order?.note;
    // 3) API Body তৈরি করা (form-urlencoded)
    const requestData = {
      invoice: order._id.toString(),
      recipient_name: order.castomerName,
      recipient_phone: order.castomerPhone,
      recipient_address: order.rawInputText,
      cod_amount: Number(order.totalCOD),
    };

    // 4)------------Steadfast API
    //https://portal.packzy.com/api/v1
    const response = await axios.post(
      "https://portal.packzy.com/api/v1/create_order",
      requestData,
      {
        headers: {
          // "Content-Type": "application/json",
          "Api-Key": process.env.STEADFAST_API_KEY,
          "Secret-Key": process.env.STEADFAST_SECRET_KEY,
        },
      }
    );
    // check stadefast response status
    if (response?.data?.status !== 200) {
      order.courier.bookingStatus = "Failed";
      order.courier.responseData = response?.data?.message || "Unknown Error";
      await order.save();
      return res.status(400).json({
        message: `booking failed: ${response?.data?.message}`,
        status: "error",
      });
    }

    // 5) Database Update করা
    // order.courier = {
    //   bookingStatus: true,
    //   trackingId: response.data?.tracking_code || "",
    //   merchantOrderId: response.data?.merchant_order_id || "",
    //   bookedAt: new Date(),
    // };
    order.courier = {
      trackingId: response?.data?.consignment?.consignment_id,
      // requestPayload: payload,
      // responseData: steadFastResponse,
      bookedAt: new Date(),
      bookingStatus: "Booked",
    };
    // update activity
    order.activities.push({
      author: "Steadfast",
      type: "Order Booked",
      description: "অর্ডার বুকিং করা হয়েছে",
      // type: "Booked",
      changedAt: new Date(),
    });

    order.orderStatus = "Booked";

    const newUpdatedOrder = await order.save();

    return res.status(200).json({
      message: "Order booked successfully!",
      status: "success",
      data: response.data,
      newUpdatedOrder,
    });
  } catch (error) {
    console.error("Steadfast API Error:", error?.response || error);

    return res.status(500).json({
      message: "Failed to book order!",
      error: error?.response?.data || error.message,
      status: "error",
    });
  }
};

module.exports = exports;
