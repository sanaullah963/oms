const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");

// --- লগইন থাকা বাধ্যতামূলক করে (Authorization: Bearer <token>) ---
async function protect(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "লগইন প্রয়োজন।" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ message: "ইউজার খুঁজে পাওয়া যায়নি।" });
    }
    if (!user.isApproved) {
      return res.status(403).json({ message: "আপনার একাউন্ট এখনো এডমিন অনুমোদন করেননি।" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "টোকেন সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে।" });
  }
}

// --- শুধু admin role হলে যেতে দেওয়া (protect-এর পরে ব্যবহার করতে হবে) ---
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "এই অংশে শুধু এডমিন অ্যাক্সেস করতে পারবে।" });
  }
  next();
}

module.exports = { protect, adminOnly };
