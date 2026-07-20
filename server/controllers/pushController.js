const User = require("../models/User");
const { VAPID_PUBLIC_KEY } = require("../config/env");

// --- GET /api/push/vapid-public-key (পাবলিক, ক্লায়েন্টের সাবস্ক্রাইব করার জন্য দরকার) ---
exports.getVapidPublicKey = (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(500).json({ message: "VAPID public key সার্ভারে সেট করা নেই।" });
  }
  return res.status(200).json({ publicKey: VAPID_PUBLIC_KEY });
};

// --- POST /api/push/subscribe (প্রোটেক্টেড) ---
exports.subscribe = async (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({ message: "সঠিক subscription অবজেক্ট দেওয়া হয়নি।" });
    }

    const user = await User.findById(req.user._id);
    const alreadyExists = user.pushSubscriptions.some(
      (s) => s.endpoint === subscription.endpoint,
    );

    if (!alreadyExists) {
      user.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      });
      await user.save();
    }

    return res.status(200).json({ message: "নোটিফিকেশন সাবস্ক্রিপশন সফল হয়েছে।" });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return res.status(500).json({ message: "সাবস্ক্রাইব করতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/push/unsubscribe (প্রোটেক্টেড) ---
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: "endpoint প্রয়োজন।" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { pushSubscriptions: { endpoint } },
    });

    return res.status(200).json({ message: "আনসাবস্ক্রাইব করা হয়েছে।" });
  } catch (error) {
    return res.status(500).json({ message: "আনসাবস্ক্রাইব করতে ব্যর্থ হয়েছে।" });
  }
};
