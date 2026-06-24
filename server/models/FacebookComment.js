

const mongoose = require("mongoose");

const FacebookCommentSchema = new mongoose.Schema(
  {
    pageId: {               // ✅ FIX: "paegId" → "pageId" (typo ঠিক করা হয়েছে)
      type: String,
      required: true,
      index: true
    },
    postId: {
      type: String,
      required: true,
      index: true
    },
    commentId: {
      type: String,
      required: true,
      unique: true
    },
    parentId: {
      type: String,
      default: null
    },
    senderName: {
      type: String,
      required: true
    },
    senderId: {
      type: String,
      required: true
    },
    message: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["active", "deleted", "hidden"],
      default: "active"
    },
    isUserBlocked: {
      type: Boolean,
      default: false
    },
    iscommentDeleted: {
      type: Boolean,
      default: false
    },
    isReplied: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("FacebookComment", FacebookCommentSchema);