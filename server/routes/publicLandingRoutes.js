const express = require("express");
const router = express.Router();
const {
  getPublicLandingPage,
  submitPublicOrder,
} = require("../controllers/publicLandingController");

router.get("/:slug", getPublicLandingPage);
router.post("/:slug/order", submitPublicOrder);

module.exports = router;