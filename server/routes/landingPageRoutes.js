const express = require("express");
const router = express.Router();
const {
  listLandingPages,
  getLandingPage,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
} = require("../controllers/landingPageController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/", listLandingPages);
router.get("/:id", getLandingPage);
router.post("/", createLandingPage);
router.patch("/:id", updateLandingPage);
router.delete("/:id", deleteLandingPage);

module.exports = router;