const express = require("express");
const router = express.Router();
const { getDashboardSummary, getDashboardOrders } = require("../controllers/dashboardController");

router.get("/summary", getDashboardSummary);
router.get("/orders", getDashboardOrders);

module.exports = router;