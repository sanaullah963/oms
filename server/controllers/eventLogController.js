const EventLog = require("../models/EventLog");
const { retryEvent } = require("../utils/metaCapi");

// --- GET /api/event-logs?status=&eventName=&page=&limit= (admin only) ---
exports.listEventLogs = async (req, res) => {
  try {
    const { status, eventName, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (eventName) filter.eventName = eventName;

    const [logs, total, summaryAgg] = await Promise.all([
      EventLog.find(filter)
        .populate("order", "castomerName castomerPhone totalCOD")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      EventLog.countDocuments(filter),
      EventLog.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const summary = { pending: 0, sent: 0, failed: 0 };
    summaryAgg.forEach((s) => {
      summary[s._id] = s.count;
    });

    return res.status(200).json({ logs, total, page: Number(page), summary });
  } catch (error) {
    console.error("List event logs error:", error);
    return res.status(500).json({ message: "ইভেন্ট লগ আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/event-logs/:id/retry (admin only) ---
exports.retryEventLog = async (req, res) => {
  try {
    const result = await retryEvent(req.params.id);
    if (result.success) {
      return res.status(200).json({ message: "ইভেন্ট পুনরায় সফলভাবে পাঠানো হয়েছে।" });
    }
    return res.status(400).json({ message: `ব্যর্থ: ${result.error}` });
  } catch (error) {
    console.error("Retry event log error:", error);
    return res.status(500).json({ message: "Retry করতে ব্যর্থ হয়েছে।" });
  }
};