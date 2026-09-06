const express = require("express");
const router = express.Router();
const {
  listEventLogs,
  retryEventLog,
  deleteEventLog,
  bulkDeleteEventLogs,
} = require("../controllers/eventLogController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/", listEventLogs);
router.post("/:id/retry", retryEventLog);
router.post("/bulk-delete", bulkDeleteEventLogs);
router.delete("/:id", deleteEventLog);

module.exports = router;