const express = require("express");
const router = express.Router();
const {
  listPages,
  createPage,
  updatePage,
  deletePage,
  getUnmatchedPageIds,
  resyncCommentPageNames,
} = require("../controllers/facebookPageController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/", listPages);
router.post("/", createPage);
router.patch("/:id", updatePage);
router.delete("/:id", deletePage);
router.get("/unmatched-ids", getUnmatchedPageIds);
router.post("/resync-comment-names", resyncCommentPageNames);

module.exports = router;






