const express = require("express");
const router = express.Router();
const { getCustomerTimeline } = require("../controllers/customerController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/timeline", getCustomerTimeline);

module.exports = router;