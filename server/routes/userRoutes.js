const express = require("express");
const router = express.Router();
const { listUsers, setApproval, setRole, setPermissions } = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/", listUsers);
router.patch("/:id/approve", setApproval);
router.patch("/:id/role", setRole);
router.patch("/:id/permissions", setPermissions);

module.exports = router;
