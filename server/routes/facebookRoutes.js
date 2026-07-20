const express = require("express");
const router = express.Router();
const facebookController = require("../controllers/facebookController");

router.get("/webhook", facebookController.verifyWebhook);
router.post("/webhook", facebookController.receiveWebhookEvent);//get webhook
router.get("/comments", facebookController.getComments);
router.post("/reply", facebookController.replyToComment);
router.delete("/comment/:commentId", facebookController.deleteFacebookComment);
router.post("/block-user", facebookController.blockUser);
router.post("/delete-and-block", facebookController.deleteAndBlock);
router.delete("/db-comment-delete/:id", facebookController.hardDeleteComment);

module.exports = router;