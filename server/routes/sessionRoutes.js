const express = require("express");
const router = express.Router();
const {
  getSessionSummary,
  listSessions,
  deleteSession,
  bulkDeleteSessions,
} = require("../controllers/sessionController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/summary", getSessionSummary);
router.get("/", listSessions);
router.post("/bulk-delete", bulkDeleteSessions);
router.delete("/:id", deleteSession);

module.exports = router;