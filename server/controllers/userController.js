const User = require("../models/User");
const {
  PERMISSION_LIST,
  getEffectivePermissions,
  validatePermissionPatch,
  applyPermissionChanges,
} = require("../config/permissions");
const { syncUserSocketRooms } = require("../utils/socketRooms");

// ইউজার ডকুমেন্ট → ক্লায়েন্টকে পাঠানোর অবজেক্ট (চূড়ান্ত পারমিশন ম্যাপসহ)
function withEffectivePermissions(userDoc) {
  const obj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  obj.permissions = getEffectivePermissions(userDoc);
  return obj;
}

// --- GET /api/users (admin only) ---
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash -pushSubscriptions").sort({ createdAt: -1 });
    // permissionRegistry: অ্যাডমিন UI-র টগলগুলো এই লিস্ট থেকেই তৈরি হয় (config/permissions.js)
    return res.status(200).json({
      users: users.map(withEffectivePermissions),
      permissionRegistry: PERMISSION_LIST,
    });
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

    // role বদলালে লাইভ সকেটের রুমও বদলাতে হবে (admin ↔ moderator), নাহলে রিকানেক্ট না করা পর্যন্ত পুরনো রুমেই থাকত
    await syncUserSocketRooms(req.app.get("io"), user);

    return res.status(200).json({ message: "Role আপডেট করা হয়েছে।", user: withEffectivePermissions(user) });
  } catch (error) {
    return res.status(500).json({ message: "আপডেট করতে ব্যর্থ হয়েছে।" });
  }
};

// --- PATCH /api/users/:id/permissions (admin only) --- মডারেটরের পারমিশন সেট করা ---
// body: { permissions: { "orders.viewOthers": true, "courierNotes.viewAll": false } }
// শুধু পাঠানো key গুলো বদলায়, বাকিগুলো যেমন ছিল তেমন থাকে।
exports.setPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const check = validatePermissionPatch(req.body?.permissions);
    if (!check.ok) {
      return res.status(400).json({ message: check.message });
    }

    const user = await User.findById(id).select("-passwordHash -pushSubscriptions");
    if (!user) {
      return res.status(404).json({ message: "ইউজার খুঁজে পাওয়া যায়নি।" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin সবসময় সব অ্যাক্সেস পায় — পারমিশন বদলানোর দরকার নেই।" });
    }

    user.permissions = applyPermissionChanges(user, check.changes);
    await user.save();

    console.log(
      `🔐 Permissions updated by ${req.user.name} for ${user.name} (${user._id}):`,
      JSON.stringify(getEffectivePermissions(user)),
    );

    // লাইভ কানেকশনের সকেট-রুম আপডেট + ক্লায়েন্টকে "permissionsChanged" ইভেন্ট
    await syncUserSocketRooms(req.app.get("io"), user);

    return res.status(200).json({ message: "পারমিশন আপডেট করা হয়েছে।", user: withEffectivePermissions(user) });
  } catch (error) {
    console.error("setPermissions error:", error);
    return res.status(500).json({ message: "পারমিশন আপডেট করতে ব্যর্থ হয়েছে।" });
  }
};

// --- DELETE /api/users/:id (admin only) --- ইউজার ডাটাবেজ থেকে স্থায়ীভাবে ডিলিট ---
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(id) === String(req.user._id)) {
      return res.status(400).json({ message: "নিজের একাউন্ট নিজে ডিলিট করা যাবে না।" });
    }

    const user = await User.findById(id).select("-passwordHash -pushSubscriptions");
    if (!user) {
      return res.status(404).json({ message: "ইউজার খুঁজে পাওয়া যায়নি।" });
    }

    // সিস্টেম যেন অ্যাডমিনশূন্য না হয়ে যায়
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ message: "সর্বশেষ অ্যাডমিন একাউন্ট ডিলিট করা যাবে না।" });
      }
    }

    await User.deleteOne({ _id: id });

    console.log(`🗑️ User deleted by ${req.user.name}: ${user.name} (${user._id})`);

    // লাইভ কানেকশন থাকলে কেটে দেওয়া (টোকেন থাকলেও protect মিডলওয়্যার পরের রিকোয়েস্টে ৪০১ দেবে)
    try {
      const io = req.app.get("io");
      if (io) io.in(`user:${user._id}`).disconnectSockets(true);
    } catch (e) {
      console.error("deleteUser socket disconnect error:", e);
    }

    return res.status(200).json({ message: `"${user.name}" ইউজার ডিলিট করা হয়েছে।`, id: user._id });
  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({ message: "ইউজার ডিলিট করতে ব্যর্থ হয়েছে।" });
  }
};