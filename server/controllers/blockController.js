const BlockedCustomer = require("../models/BlockedCustomer");

// --- GET /api/blocked-customers — সক্রিয়ভাবে ব্লক করা সব কাস্টমার (admin only) ---
exports.getBlockedCustomers = async (req, res) => {
  try {
    const blocked = await BlockedCustomer.find({ isActive: true })
      .sort({ createdAt: -1 })
      .populate("sourceOrderId", "castomerName productCode totalCOD orderStatus");
    return res.status(200).json({ blocked });
  } catch (error) {
    console.error("Get blocked customers error:", error);
    return res.status(500).json({ message: "ব্লকলিস্ট আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/blocked-customers — ম্যানুয়ালি নতুন কাস্টমার ব্লক করা (admin only) ---
// শুধু phone দিয়েও ব্লক করা যায় (Blocked Customers পেজ থেকে সরাসরি), অথবা
// fingerprint/ip/fbp/fbc/fbclid যোগ করে আরও শক্তভাবে ব্লক করা যায়।
exports.createBlockedCustomer = async (req, res) => {
  try {
    const { phone, fingerprintHash, ip, fbp, fbc, fbclid, castomerName, reason, sourceOrderId } =
      req.body;

    if (!phone && !fingerprintHash && !ip && !fbp && !fbc && !fbclid) {
      return res
        .status(400)
        .json({ message: "অন্তত একটা আইডেন্টিফায়ার (ফোন/ফিঙ্গারপ্রিন্ট/IP/FB) দিতে হবে।" });
    }

    const blocked = await BlockedCustomer.create({
      phone: phone || null,
      fingerprintHash: fingerprintHash || null,
      ip: ip || null,
      fbp: fbp || null,
      fbc: fbc || null,
      fbclid: fbclid || null,
      castomerName: castomerName || null,
      sourceOrderId: sourceOrderId || null,
      reason: reason || null,
      blockedBy: req.user._id,
      blockedByName: req.user.name,
    });

    return res.status(201).json({ success: true, blocked });
  } catch (error) {
    console.error("Create blocked customer error:", error);
    return res.status(500).json({ message: "ব্লক করতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/blocked-customers/from-order/:orderId — একটা অর্ডারের সব
// আইডেন্টিফায়ার (phone/fingerprint/ip/fbp/fbc/fbclid) ব্যবহার করে সরাসরি ব্লক করা
// (Fraud Detection Modal-এর "Block" বাটন এটাই কল করে) ---
exports.blockCustomerFromOrder = async (req, res) => {
  try {
    const Order = require("../models/Order");
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "অর্ডার খুঁজে পাওয়া যায়নি।" });
    }

    const blocked = await BlockedCustomer.create({
      phone: order.castomerPhone?.[0] || null,
      fingerprintHash: order.tracking?.fingerprintHash || null,
      ip: order.tracking?.ip || null,
      fbp: order.tracking?.fbp || null,
      fbc: order.tracking?.fbc || null,
      fbclid: order.tracking?.fbclid || null,
      castomerName: order.castomerName,
      sourceOrderId: order._id,
      reason: req.body?.reason || "Fraud/duplicate detection থেকে ব্লক করা হয়েছে",
      blockedBy: req.user._id,
      blockedByName: req.user.name,
    });

    order.fraudCheck.reviewStatus = "blocked";
    order.fraudCheck.reviewedBy = req.user._id;
    order.fraudCheck.reviewedByName = req.user.name;
    order.fraudCheck.reviewedAt = new Date();
    await order.save();

    return res.status(201).json({ success: true, blocked });
  } catch (error) {
    console.error("Block customer from order error:", error);
    return res.status(500).json({ message: "ব্লক করতে ব্যর্থ হয়েছে।" });
  }
};

// --- PATCH /api/blocked-customers/:id/unblock — আনব্লক করা (soft delete, isActive: false) ---
exports.unblockCustomer = async (req, res) => {
  try {
    const blocked = await BlockedCustomer.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        unblockedBy: req.user._id,
        unblockedByName: req.user.name,
        unblockedAt: new Date(),
      },
      { new: true },
    );
    if (!blocked) {
      return res.status(404).json({ message: "রেকর্ড খুঁজে পাওয়া যায়নি।" });
    }
    return res.status(200).json({ success: true, blocked });
  } catch (error) {
    console.error("Unblock customer error:", error);
    return res.status(500).json({ message: "আনব্লক করতে ব্যর্থ হয়েছে।" });
  }
};
