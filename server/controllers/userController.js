const User = require("../models/User");

// --- GET /api/users (admin only) ---
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash -pushSubscriptions").sort({ createdAt: -1 });
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ message: "ইউজার লিস্ট আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- PATCH /api/users/:id/approve (admin only) --- অনুমোদন দেওয়া/বাতিল করা ---
exports.setApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    if (String(id) === String(req.user._id) && isApproved === false) {
      return res.status(400).json({ message: "নিজের একাউন্ট নিজে বন্ধ করা যাবে না।" });
    }

    const user = await User.findByIdAndUpdate(id, { isApproved: !!isApproved }, { new: true }).select(
      "-passwordHash -pushSubscriptions",
    );
    if (!user) {
      return res.status(404).json({ message: "ইউজার খুঁজে পাওয়া যায়নি।" });
    }

    return res.status(200).json({
      message: isApproved ? "একাউন্ট অনুমোদন করা হয়েছে।" : "একাউন্টের অ্যাক্সেস বন্ধ করা হয়েছে।",
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: "আপডেট করতে ব্যর্থ হয়েছে।" });
  }
};

// --- PATCH /api/users/:id/role (admin only) --- role পরিবর্তন ---
exports.setRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "moderator"].includes(role)) {
      return res.status(400).json({ message: "role অবশ্যই admin অথবা moderator হতে হবে।" });
    }
    if (String(id) === String(req.user._id) && role !== "admin") {
      return res.status(400).json({ message: "নিজের admin অ্যাক্সেস নিজে সরানো যাবে না।" });
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select(
      "-passwordHash -pushSubscriptions",
    );
    if (!user) {
      return res.status(404).json({ message: "ইউজার খুঁজে পাওয়া যায়নি।" });
    }

    return res.status(200).json({ message: "Role আপডেট করা হয়েছে।", user });
  } catch (error) {
    return res.status(500).json({ message: "আপডেট করতে ব্যর্থ হয়েছে।" });
  }
};
