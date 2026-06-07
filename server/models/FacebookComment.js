// const mongoose = require("mongoose");

// const FacebookCommentSchema = new mongoose.Schema(
//   {
//     paegId: {
//       type: String,
//       required: true,
//       index: true
//     },
//     postId: {
//       type: String,
//       required: true,
//       index: true
//     },
//     commentId: {
//       type: String,
//       required: true,
//       unique: true // একই কমেন্ট যেন বারবার ডুপ্লিকেট সেভ না হয়
//     },
//     parentId: {
//       type: String, // যদি এটি কোনো কমেন্টের ভেতরের রিপ্লাই বা সাব-কমেন্ট হয় তার আইডি
//       default: null
//     },
//     senderName: {
//       type: String,
//       required: true
//     },
//     senderId: {
//       type: String,
//       required: true
//     },
//     message: {
//       type: String,
//       default: ""
//     },
//     status: {
//       type: String,
//       enum: ["active", "deleted", "hidden"], // কমেন্টের বর্তমান অবস্থা ট্র‍্যাক করতে
//       default: "active"
//     },
//     isUserBlocked: {
//       type: Boolean,
//       default: false // এই কাস্টমারকে আপনার ওএমএস থেকে ব্লক করা হয়েছে কিনা
//     },
//     isReplied: {
//       type: Boolean,
//       default: false // আপনি ওয়েবসাইট থেকে রিপ্লাই দিয়েছেন কিনা
//     }
//   },
//   {
//     timestamps: true // এর মাধ্যমে createdAt এবং updatedAt অটোমেটিক ম্যানেজ হবে
//   }
// );

// module.exports = mongoose.model("FacebookComment", FacebookCommentSchema);




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