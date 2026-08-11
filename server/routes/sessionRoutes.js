const express = require("express");
const router = express.Router();
const { getSessionSummary, listSessions } = require("../controllers/sessionController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/summary", getSessionSummary);
router.get("/", listSessions);

module.exports = router;