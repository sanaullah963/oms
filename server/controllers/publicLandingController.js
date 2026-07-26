const LandingPage = require("../models/LandingPage");
const Order = require("../models/Order");
const { sendNotificationToApprovedUsers } = require("../utils/webPush");
const { emitOrderUpdate } = require("../utils/socketBroadcast");

const PHONE_REGEX = /^01\d{9}$/;

// --- GET /api/public/landing-pages/:slug — কাস্টমার-facing পেজের কনফিগ ---
exports.getPublicLandingPage = async (req, res) => {
  try {
    const page = await LandingPage.findOne({ slug: req.params.slug, isActive: true });
    if (!page) {
      return res.status(404).json({ message: "এই পেজটি খুঁজে পাওয়া যায়নি বা বন্ধ আছে।" });
    }
    return res.status(200).json({ page });
  } catch (error) {
    return res.status(500).json({ message: "পেজ লোড করতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/public/landing-pages/:slug/order — কাস্টমার অর্ডার সাবমিট করলে ---
exports.submitPublicOrder = async (req, res) => {
  try {
    const { name, phone, address, quantity, honeypot } = req.body;

    // 🛡️ বট প্রোটেকশন: এই ফিল্ডটা মানুষের জন্য UI-তে দেখানো হবে না, শুধু বট এটা পূরণ করবে
    if (honeypot) {
      return res.status(200).json({ success: true }); // বটকে বোঝানো হবে না যে ব্লক করা হয়েছে
    }

    if (!name || !phone || !address) {
      return res.status(400).json({ message: "নাম, ফোন নম্বর ও ঠিকানা আবশ্যক।" });
    }
    if (!PHONE_REGEX.test(phone)) {
      return res.status(400).json({ message: "সঠিক ফোন নম্বর দিন (উদাহরণ: 01XXXXXXXXX)।" });
    }

    const page = await LandingPage.findOne({ slug: req.params.slug, isActive: true });
    if (!page) {
      return res.status(404).json({ message: "এই পেজটি এখন সক্রিয় নেই।" });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const totalCOD = page.price * qty;

    const order = await Order.create({
      rawInputText: `${name}\n${phone}\n${address}\nProduct: ${page.productName} x${qty}`,
      castomerName: name,
      castomerPhone: [phone],
      productCode: page.productCode,
      totalCOD,
      orderSource: page.productCode,
      createdBy: null, // ল্যান্ডিং পেজের অর্ডার কোনো নির্দিষ্ট মডারেটরের না — সবার শেয়ার্ড পেন্ডিং কিউতে যাবে
      activities: [
        {
          type: "Order Created",
          description: `ল্যান্ডিং পেজ থেকে অর্ডার এসেছে — "${page.productName}" (${qty}টি)`,
        },
      ],
    });

    const io = req.app.get("io");
    if (io) emitOrderUpdate(io, order);

    sendNotificationToApprovedUsers({
      title: "🛒 নতুন অর্ডার (ল্যান্ডিং পেজ)",
      body: `${name} - "${page.productName}" x${qty} - ৳${totalCOD}`,
      url: "/",
    }).catch((err) => console.error("Landing order notification error:", err));

    return res.status(201).json({
      success: true,
      message: "অর্ডার সফলভাবে সম্পন্ন হয়েছে! শীঘ্রই আপনার সাথে যোগাযোগ করা হবে।",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Public landing order error:", error);
    return res.status(500).json({ message: "অর্ডার করতে ব্যর্থ হয়েছে, আবার চেষ্টা করুন।" });
  }
};