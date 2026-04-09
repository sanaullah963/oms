// require("dotenv").config();
require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
// const Order = require("../models/Order"); // তোমার model path
const Order = require("../models/Order")

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("---Connected to MongoDB...");

    // ১. সব অর্ডার থেকে শুধুমাত্র ফোন নম্বরগুলো খুঁজে বের করা
    // এখানে 'phone' এর জায়গায় আপনার মডেলের আসল ফিল্ডের নাম দিন (যেমন: customerPhone বা mobile)
    const orders = await Order.find({});

    console.log("--- All Phone Numbers ---");
    orders.forEach((order, index) => {
      if (order.castomerPhone) {
        console.log(`${index + 1}: ${Array.isArray(order.castomerPhone)}`);
      }
    });


    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();