const axios = require("axios");
const Order = require("../models/Order");
const qs = require("qs"); // <-- অত্যন্ত গুরুত্বপূর্ণ
const { json } = require("body-parser");

// // number ban to eng
// function convertNumber(input) {
//   const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
//   const englishDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

//   let output = input;
//   for (let i = 0; i < banglaDigits.length; i++) {
//     output = output.replace(new RegExp(banglaDigits[i], "g"), englishDigits[i]);
//   }
//   return output;
// }
// exports.bookSteadfast = async (req, res) => {
//   const { orderId } = req.params;

//   try {
//     // 1)----------------অর্ডার খুঁজে আনা
//     let alternative_phone = "";
//     const order = await Order.findById(orderId);
//     console.log(' order', order);
//     if (!order) {
//       return res.json({
//         message: "Order not found!",
//         status: "error",
//       });
//     }

//     // 2)--------------Validation
//     // convert number to english
//     console.log("order.castomerPhone", order.castomerPhone);
//     console.log("order.castomerPhone.length", order.castomerPhone.length);
//     if (Array.isArray(order.castomerPhone)) {

//       // if (order.castomerPhone.length > 1) {
//         order.castomerPhone = convertNumber(order.castomerPhone[0]);
//         // alternative_phone = convertNumber(order.castomerPhone[1]);
//       // } else {
//         // order.castomerPhone = convertNumber(order.castomerPhone[0]);
//       }
//     // } 
//     else {
//       order.castomerPhone = convertNumber(order.castomerPhone.split(", ")[0]);
//     }

//     // check name
//     console.log("order.castomerName", order);
//     if (
//       !order.castomerName ||
//       order.castomerName === "" ||
//       order.castomerName === "N/A"
//     ) {
//       console.log("order.castomerName", order.castomerName);
//       return res.json({
//         message: `invalit castomer Name: ${order.castomerName}`,
//         status: "error",
//       });
//     } // check phone
//     else if (
//       !order.castomerPhone ||
//       order.castomerPhone === "" ||
//       order.castomerPhone === "N/A" ||
//       order.castomerPhone.length !== 11 ||
//       order.castomerPhone[0] !== "0" ||
//       order.castomerPhone[1] !== "1"
//     ) {
//       console.log("order.castomerPhone", order.castomerPhone);
//       return res.json({
//         message: `invalit castomer Phone: ${order.castomerPhone}`,
//         status: "error",
//       });
//     }
//     // check address
//     else if (
//       !order.rawInputText ||
//       order.rawInputText === "" ||
//       order.rawInputText === "N/A"
//     ) {
//       console.log("order.rawInputText", order.rawInputText);
//       return res.status(400).json({
//         message: `invalit castomer Address: ${order.rawInputText}`,
//         status: "error",
//       });
//     }
//     // check totalCOD
//     else if (
//       !order.totalCOD ||
//       order.totalCOD === "" ||
//       order.totalCOD === "N/A" ||
//       order.totalCOD < 0 ||
//       order.totalCOD !== parseInt(order.totalCOD)
//     ) {
//       console.log("order.totalCOD", order.totalCOD);
//       return res.json({
//         message: `invalit totalCOD: ${order.totalCOD}`,
//         status: "error",
//       });
//     }
//     const riderNote = order?.note;
//     // 3) API Body তৈরি করা (form-urlencoded)
//     const requestData = {
//       invoice: order._id.toString(),
//       recipient_name: order.castomerName,
//       recipient_phone: order.castomerPhone,
//       recipient_address: order.rawInputText,
//       cod_amount: Number(order.totalCOD),
//     };
// console.log('requestData',requestData);
//     // 4)------------Steadfast API
//     //https://portal.packzy.com/api/v1

//     const response = await axios.post(
//       `${process.env.STEADFAST_API_URL}/create_order`,
//       requestData,
//       {
//         headers: {
//           // "Content-Type": "application/json",
//           "Api-Key": process.env.STEADFAST_API_KEY,
//           "Secret-Key": process.env.STEADFAST_SECRET_KEY,
//         },
//       },
//     );

//     console.log("response", response.data);

//     // check stadefast response status
//     if (response?.data?.status !== 200) {
//       order.courier.bookingStatus = "Failed";
//       order.courier.responseData = response?.data?.message || "Unknown Error";
//       await order.save();
//       return res.status(400).json({
//         message: `booking failed: ${response?.data?.message}`,
//         status: "error",
//       });
//     }

//     order.courier = {
//       trackingId: response?.data?.consignment?.consignment_id,
//       bookedAt: new Date(),
//       bookingStatus: "Booked",
//     };
//     // update activity
//     order.activities.push({
//       author: "Steadfast",
//       type: "Order Booked",
//       description: "অর্ডার বুকিং হয়েছে",
//       changedAt: new Date(),
//     });

//     order.orderStatus = "Booked";
//     const newUpdatedOrder = await order.save();

//     return res.status(200).json({
//       message: "Order booked successfully!",
//       status: "success",
//       data: response.data,
//       newUpdatedOrder,
//     });
//   } catch (error) {
//     console.error("Steadfast API Error:", error?.response || error);

//     return res.status(500).json({
//       message: "Failed to book order!",
//       error: error?.response?.data || error.message,
//       status: "error",
//     });
//   }
// };

// module.exports = exports;





// const axios = require("axios");
// const Order = require("../models/Order");

// বাংলা নম্বর থেকে ইংরেজিতে রূপান্তর করার ফাংশন
function convertNumber(input) {
  if (!input) return "";
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  const englishDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  let output = input.toString();
  for (let i = 0; i < banglaDigits.length; i++) {
    output = output.replace(new RegExp(banglaDigits[i], "g"), englishDigits[i]);
  }
  return output;
}

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

    // ২) ফোন নম্বর হ্যান্ডেল করা (যেহেতু এটি এখন Array)
    // আমরা অ্যারের প্রথম নম্বরটি নিব এবং সেটি ইংরেজিতে কনভার্ট করব
    let primaryPhone = "";
    if (Array.isArray(order.castomerPhone) && order.castomerPhone.length > 0) {
      primaryPhone = convertNumber(order.castomerPhone[0]);
    } else if (typeof order.castomerPhone === "string") {
      primaryPhone = convertNumber(order.castomerPhone);
    }
    console.log("order.castomerPhone", order.castomerPhone);
    // ৩) ভ্যালিডেশন চেক
    // নাম চেক
    if (!order.castomerName || order.castomerName.trim() === "" || order.castomerName === "N/A") {
      return res.json({
        message: `Invalid Customer Name: ${order.castomerName}`,
        status: "error",
      });
    }

    // ফোন নম্বর চেক (১১ ডিজিট এবং ০১ দিয়ে শুরু হতে হবে)
    // if (
    //   !primaryPhone ||
    //   primaryPhone.length !== 11 ||
    //   !primaryPhone.startsWith("01")
    // ) {
    //   return res.json({
    //     message: `Invalid Customer Phone: ${primaryPhone || "Empty"}`,
    //     status: "error",
    //   });
    // }

    // অ্যাড্রেস চেক
    // if (!order.rawInputText || order.rawInputText.trim() === "") {
    //   return res.status(400).json({
    //     message: "Customer address (rawInputText) is required.",
    //     status: "error",
    //   });
    // }

    // COD চেক (নিশ্চিত করা যে এটি একটি ভ্যালিড পজিটিভ নাম্বার)
    // const codAmount = Number(order.totalCOD);
    // if (isNaN(codAmount) || codAmount < 0) {
    //   return res.json({
    //     message: `Invalid totalCOD: ${order.totalCOD}`,
    //     status: "error",
    //   });
    // }

    // ৪) API Body তৈরি করা
    console.log("primaryPhone", primaryPhone);
    const requestData = {
      // recipient_phone: order.castomerPhone,
      invoice: order._id.toString(),
      recipient_name: order.castomerName,
      recipient_phone: primaryPhone,
      recipient_address: order.rawInputText,
      cod_amount: Number(order.totalCOD),
      note: order.note || "" 
    };

    // ৫) Steadfast API কল
    const response = await axios.post(
      `${process.env.STEADFAST_API_URL}/create_order`,
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          "Api-Key": process.env.STEADFAST_API_KEY,
          "Secret-Key": process.env.STEADFAST_SECRET_KEY,
        },
      }
    );
    console.log("response", response.data);
    // ৬) রেসপন্স চেক এবং ডাটাবেজ আপডেট
    if (response?.data?.status !== 200) {
      order.courier = {
        bookingStatus: "Failed",
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
      bookingStatus: "Booked",
    };

    order.activities.push({
      author: "Steadfast",
      type: "Order Booked",
      description: `অর্ডার বুকিং হয়েছে (Tracking ID: ${response?.data?.consignment?.consignment_id})`,
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