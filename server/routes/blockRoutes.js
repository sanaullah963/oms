const express = require("express");
const router = express.Router();
const {
  getBlockedCustomers,
  createBlockedCustomer,
  blockCustomerFromOrder,
  unblockCustomer,
} = require("../controllers/blockController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/", getBlockedCustomers);
router.post("/", createBlockedCustomer);
router.post("/from-order/:orderId", blockCustomerFromOrder);
router.patch("/:id/unblock", unblockCustomer);

module.exports = router;
