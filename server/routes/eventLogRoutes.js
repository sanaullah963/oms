const express = require("express");
const router = express.Router();
const { listEventLogs, retryEventLog } = require("../controllers/eventLogController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/", listEventLogs);
router.post("/:id/retry", retryEventLog);

module.exports = router;