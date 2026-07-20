const User = require("../models/User");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");

const PHONE_REGEX = /^\d{11}$/;

function toSafeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    isApproved: user.isApproved,
    createdAt: user.createdAt,
  };
}

// --- POST /api/auth/signup ---
exports.signup = async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ message: "নাম, ফোন নম্বর ও পাসওয়ার্ড দেওয়া আবশ্যক।" });
    }
    if (!PHONE_REGEX.test(phone)) {
      return res.status(400).json({ message: "ফোন নম্বর ১১ ডিজিটের হতে হবে।" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টারের হতে হবে।" });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ message: "এই ফোন নম্বর দিয়ে আগেই একাউন্ট খোলা হয়েছে।" });
    }

    const passwordHash = await hashPassword(password);

    // প্রথম ইউজারকে স্বয়ংক্রিয়ভাবে admin ও approved করে দেওয়া হয় (যাতে কেউ একাউন্ট approve করার জন্য থাকে)
    const isFirstUser = (await User.countDocuments()) === 0;

    const user = await User.create({
      name,
      phone,
      passwordHash,
      role: isFirstUser ? "admin" : "moderator",
      isApproved: isFirstUser,
    });

    return res.status(201).json({
      message: isFirstUser
        ? "প্রথম একাউন্ট হিসেবে আপনি স্বয়ংক্রিয়ভাবে Admin হয়ে গেছেন। এখন লগইন করুন।"
        : "একাউন্ট তৈরি হয়েছে। এডমিন অনুমোদন করলে আপনি লগইন করতে পারবেন।",
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "একাউন্ট তৈরি করতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/auth/login ---
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: "ফোন নম্বর ও পাসওয়ার্ড দিন।" });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ message: "ফোন নম্বর বা পাসওয়ার্ড সঠিক নয়।" });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "ফোন নম্বর বা পাসওয়ার্ড সঠিক নয়।" });
    }

    if (!user.isApproved) {
      return res
        .status(403)
        .json({ message: "আপনার একাউন্ট এখনো এডমিন অনুমোদন করেননি। একটু অপেক্ষা করুন।" });
    }

    const token = signToken({ userId: user._id, role: user.role });

    return res.status(200).json({ token, user: toSafeUser(user) });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "লগইন করতে ব্যর্থ হয়েছে।" });
  }
};

// --- GET /api/auth/me (প্রোটেক্টেড) ---
exports.getMe = async (req, res) => {
  return res.status(200).json({ user: toSafeUser(req.user) });
};
