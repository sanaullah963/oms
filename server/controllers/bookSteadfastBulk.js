const axios = require("axios");
const Order = require("../models/Order");

exports.bookSteadfastBulk = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { orders_ids } = req.body;


    if (!orders_ids || !Array.isArray(orders_ids) || orders_ids.length === 0) {
      return res
        .status(400)
        .json({ message: "অর্ডার আইডি গুলো সঠিকভাবে পাঠানো হয়নি" });
    }

    // ১. ডাটাবেজ থেকে অর্ডারগুলো খুঁজে বের করা (অর্ডার আইডির ভিত্তিতে)
    const orders = await Order.find({ _id: { $in: orders_ids } });

    if (orders.length === 0) {
      return res.status(404).json({ message: "কোন অর্ডার পাওয়া যায়নি" });
    }

    // ২. Steadfast ডকুমেন্টেশন অনুযায়ী ডাটা ফরম্যাট করা
    const bulkData = orders.map((order) => ({
      invoice: order._id.toString(), // আপনার মডেল অনুযায়ী ফিল্ড নেম দিন
      recipient_name: order.castomerName || "N/A",
      recipient_address: order.rawInputText || "N/A",
      recipient_phone: order.castomerPhone[0],
      cod_amount: order.totalCOD || 0,
      note: order.note || "",
    }));

    // ৩. Steadfast API তে রিকোয়েস্ট পাঠানো
    const response = await axios.post(
      `${process.env.STEADFAST_API_URL}/create_order/bulk-order`,
      {
        data: JSON.stringify(bulkData), // ডকুমেন্টেশন অনুযায়ী JSON encoded array
      },
      {
        headers: {
          "Api-Key": process.env.STEADFAST_API_KEY,
          "Secret-Key": process.env.STEADFAST_SECRET_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    const { data, status } = response.data; //data=array

    // ৪. রেসপন্স হ্যান্ডেল করা
    if (status !== 200) {
      data.map((orderError) => {});
      return res.status(400).json({
        message: `Booking failed- stead fast error`,
        status: "error",
      });
    }


    data.map(async (NewOrder) => {
      orders.map(async (OldOrder) => {
        if (NewOrder.invoice === OldOrder._id.toString()) {
          OldOrder.courier = {
            trackingId: NewOrder?.consignment_id,
            bookedAt: new Date(),
            bookingStatus: "Booked",
          };
          OldOrder.activities.push({
            author: "Steadfast",
            type: "Bulk Order Booked",
            description: `অর্ডার বুকিং হয়েছে (Tracking ID: ${NewOrder?.consignment_id})`,
            changedAt: new Date(),
          });
          OldOrder.orderStatus = "Booked";
        }
      });
    });//end map
    // save all orders
    const newUpdatedOrders = await Promise.all(
      orders.map((order) => order.save()),
    );

    newUpdatedOrders.forEach((order) => {
  io.emit("orderStatusChange", order);
});


    return res.status(200).json({
      message: "বুকিং হয়েছে",
      status: "success",
      newUpdatedOrders,
    });
  } catch (error) {
    console.error("Steadfast Bulk Booking Error:", error);
    res.status(500).json({
      message: "বুকিং করার সময় সমস্যা হয়েছে",
      status: "error",
    });
  }
};
