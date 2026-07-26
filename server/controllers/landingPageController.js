const LandingPage = require("../models/LandingPage");
const Order = require("../models/Order");

const SLUG_REGEX = /^[a-z0-9-]+$/;

// --- GET /api/landing-pages (admin only) — লিস্ট + প্রতিটার মোট অর্ডার সংখ্যা ---
exports.listLandingPages = async (req, res) => {
  try {
    const pages = await LandingPage.find().sort({ createdAt: -1 });

    const orderCounts = await Order.aggregate([
      { $match: { orderSource: { $in: pages.map((p) => p.productCode) } } },
      { $group: { _id: "$orderSource", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(orderCounts.map((o) => [o._id, o.count]));

    const result = pages.map((p) => ({
      ...p.toObject(),
      totalOrders: countMap.get(p.productCode) || 0,
    }));

    return res.status(200).json({
      pages: result,
      activeCount: pages.filter((p) => p.isActive).length,
    });
  } catch (error) {
    return res.status(500).json({ message: "ল্যান্ডিং পেজ লিস্ট আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- GET /api/landing-pages/:id (admin only) — এডিট ফর্মের জন্য পুরো ডেটা ---
exports.getLandingPage = async (req, res) => {
  try {
    const page = await LandingPage.findById(req.params.id);
    if (!page) return res.status(404).json({ message: "পেজ খুঁজে পাওয়া যায়নি।" });
    return res.status(200).json({ page });
  } catch (error) {
    return res.status(500).json({ message: "পেজ আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/landing-pages (admin only) ---
exports.createLandingPage = async (req, res) => {
  try {
    const { slug, productName, productCode, price } = req.body;

    if (!slug || !productName || !productCode || !price) {
      return res
        .status(400)
        .json({ message: "slug, productName, productCode, price — সবগুলো আবশ্যক।" });
    }
    if (!SLUG_REGEX.test(slug)) {
      return res.status(400).json({
        message: "Slug শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন (-) দিয়ে হতে হবে।",
      });
    }

    const exists = await LandingPage.findOne({ slug });
    if (exists) {
      return res.status(409).json({ message: "এই slug দিয়ে আগেই একটা পেজ আছে।" });
    }

    const page = await LandingPage.create(req.body);
    return res.status(201).json({ message: "ল্যান্ডিং পেজ তৈরি হয়েছে।", page });
  } catch (error) {
    console.error("Create landing page error:", error);
    return res.status(500).json({ message: "পেজ তৈরি করতে ব্যর্থ হয়েছে।" });
  }
};

// --- PATCH /api/landing-pages/:id (admin only) ---
exports.updateLandingPage = async (req, res) => {
  try {
    const { slug } = req.body;
    if (slug && !SLUG_REGEX.test(slug)) {
      return res.status(400).json({
        message: "Slug শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন (-) দিয়ে হতে হবে।",
      });
    }
    if (slug) {
      const exists = await LandingPage.findOne({ slug, _id: { $ne: req.params.id } });
      if (exists) {
        return res.status(409).json({ message: "এই slug দিয়ে আগেই একটা পেজ আছে।" });
      }
    }

    const page = await LandingPage.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!page) return res.status(404).json({ message: "পেজ খুঁজে পাওয়া যায়নি।" });

    return res.status(200).json({ message: "আপডেট করা হয়েছে।", page });
  } catch (error) {
    console.error("Update landing page error:", error);
    return res.status(500).json({ message: "আপডেট করতে ব্যর্থ হয়েছে।" });
  }
};

// --- DELETE /api/landing-pages/:id (admin only) ---
exports.deleteLandingPage = async (req, res) => {
  try {
    const page = await LandingPage.findByIdAndDelete(req.params.id);
    if (!page) return res.status(404).json({ message: "পেজ খুঁজে পাওয়া যায়নি।" });
    return res.status(200).json({ message: "পেজ মুছে ফেলা হয়েছে।" });
  } catch (error) {
    return res.status(500).json({ message: "মুছতে ব্যর্থ হয়েছে।" });
  }
};