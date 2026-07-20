// const axios = require("axios");
// const FacebookComment = require("../models/FacebookComment");
// const { FB_VERIFY_TOKEN } = require("../config/env");
// const {
//   getAllActivePageIds,
//   getPageById,
//   getPageTokenForComment,
// } = require("../utils/facebookPages");

// const GRAPH_API_BASE = "https://graph.facebook.com/v25.0";

// // --- GET /api/facebook/webhook - Webhook Verification ---
// exports.verifyWebhook = (req, res) => {
//   const mode = req.query["hub.mode"];
//   const token = req.query["hub.verify_token"];
//   const challenge = req.query["hub.challenge"];

//   if (mode && token && mode === "subscribe" && token === FB_VERIFY_TOKEN) {
//     console.log("✅ Webhook Verified");
//     return res.status(200).send(challenge);
//   }
//   return res.sendStatus(403);
// };

// // --- POST /api/facebook/webhook - Facebook থেকে কমেন্ট রিসিভ করা (একাধিক পেজ সাপোর্ট করে) ---
// exports.receiveWebhookEvent = async (req, res) => {
//   const body = req.body;

//   if (body.object !== "page") {
//     return res.sendStatus(404);
//   }

//   if (body.entry && Array.isArray(body.entry)) {
//     // ✅ ফিক্স: আগে সব কমেন্টে হার্ডকোড করা একটামাত্র env pageId বসানো হতো, ফলে
//     // একাধিক পেজ থেকে কমেন্ট এলেও সবগুলো ভুলভাবে একই pageId হিসেবে সেভ হতো।
//     // এখন Facebook-এর পাঠানো আসল entry.id (যেই পেজ থেকে কমেন্ট এসেছে) ব্যবহার হয়।
//     const knownPageIds = await getAllActivePageIds();

//     for (const entry of body.entry) {
//       if (!entry.changes || !Array.isArray(entry.changes)) continue;

//       for (const changeItem of entry.changes) {
//         const change = changeItem.value;

//         // নতুন কমেন্ট এসেছে কিনা চেক করা
//         if (!(change && change.item === "comment" && change.verb === "add")) continue;

//         // ✅ ফিক্স: entry.id কিছু ক্ষেত্রে (একাধিক পেজ একই App/Business-এর আন্ডারে থাকলে)
//         // ভুল/একই ID দিয়ে দেয়। কিন্তু Facebook-এর post_id সবসময় "{page_id}_{post_suffix}"
//         // ফরম্যাটে আসে — এটা থেকে বের করা page ID অনেক বেশি নির্ভরযোগ্য, তাই এটাই প্রাইমারি সোর্স।
//         const postIdPageId = change.post_id ? change.post_id.split("_")[0] : null;
//         const actualPageId = postIdPageId || entry.id;

//         // আমাদের নিজেদের কোনো পেজ থেকে করা কমেন্ট/রিপ্লাই হলে ইগনোর করা (নাহলে নিজের রিপ্লাইও নতুন কমেন্ট হিসেবে দেখাবে)
//         if (knownPageIds.includes(change.from?.id)) continue;

//         const io = req.app.get("io");
//         try {
//           const page = await getPageById(actualPageId);

//           if (!page) {
//             // 🔍 ডায়াগনস্টিক: entry.id ও post_id থেকে বের করা ID — দুটো লগ করা হচ্ছে তুলনার জন্য।
//             console.warn(
//               `⚠️ Facebook Page match failed — entry.id: "${entry.id}", post_id থেকে বের করা pageId: "${postIdPageId}", ব্যবহৃত হয়েছে: "${actualPageId}" — এটা কোনো সক্রিয় পেজের সাথে মিলছে না।`,
//             );
//           }

//           const savedComment = await FacebookComment.findOneAndUpdate(
//             { commentId: change.comment_id },
//             {
//               pageId: actualPageId,
//               pageName: page?.pageName || "Unknown Page",
//               postId: change.post_id,
//               commentId: change.comment_id,
//               parentId: change.parent_id || null,
//               senderName: change.from?.name || "Anonymous",
//               senderId: change.from?.id,
//               message: change.message || "",
//             },
//             { upsert: true, new: true, setDefaultsOnInsert: true },
//           );

//           if (io) io.emit("new-facebook-comment", savedComment);
//         } catch (dbError) {
//           console.error("❌ Single Comment Processing/DB Error:", dbError.message);
//           // ডাটাবেজে সেভ হতে সমস্যা হলেও ফ্রন্টএন্ডে অন্তত সকেট দিয়ে ডেটা যাক (ফলব্যাক)
//           if (io) {
//             io.emit("new-facebook-comment", {
//               pageId: actualPageId,
//               commentId: change.comment_id,
//               postId: change.post_id,
//               senderName: change.from?.name || "Anonymous",
//               senderId: change.from?.id,
//               message: change.message || "",
//               createdAt: new Date(),
//             });
//           }
//         }
//       }
//     }
//   }

//   return res.status(200).send("EVENT_RECEIVED");
// };

// // --- GET /api/facebook/comments ---
// exports.getComments = async (req, res) => {
//   try {
//     const comments = await FacebookComment.find().sort({ createdAt: -1 });
//     return res.status(200).json({ success: true, data: comments });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ success: false, error: "Failed to fetch comments from DB" });
//   }
// };

// // --- POST /api/facebook/reply ---
// exports.replyToComment = async (req, res) => {
//   const { commentId, replyMessage } = req.body;

//   if (!commentId || !replyMessage?.trim()) {
//     return res
//       .status(400)
//       .json({ success: false, message: "commentId এবং replyMessage আবশ্যক" });
//   }

//   const { comment, page, error } = await getPageTokenForComment(commentId);
//   if (error) {
//     return res.status(400).json({ success: false, message: error });
//   }

//   try {
//     const response = await axios.post(`${GRAPH_API_BASE}/${commentId}/comments`, {
//       message: replyMessage,
//       access_token: page.pageAccessToken,
//     });

//     comment.isReplied = true;
//     await comment.save();

//     return res.status(200).json({ success: true, metaData: response.data });
//   } catch (error) {
//     const metaError = error.response?.data?.error;
//     console.error("❌ Reply Error:", metaError || error.message);

//     if ([3, 200, 190].includes(metaError?.code)) {
//       return res.status(401).json({
//         success: false,
//         message: `"${page.pageName}" পেজের Access Token invalid বা expired। '/dashboard/facebook-pages' থেকে নতুন token সেট করুন।`,
//         metaError,
//       });
//     }

//     return res
//       .status(500)
//       .json({ success: false, message: "Reply পাঠানো যায়নি", metaError });
//   }
// };

// // --- DELETE /api/facebook/comment/:commentId - Facebook থেকে কমেন্ট ডিলিট ---
// exports.deleteFacebookComment = async (req, res) => {
//   const { commentId } = req.params;

//   const { comment, page, error } = await getPageTokenForComment(commentId);
//   if (error) {
//     return res.status(400).json({ success: false, message: error });
//   }

//   try {
//     await axios.delete(`${GRAPH_API_BASE}/${commentId}`, {
//       params: { access_token: page.pageAccessToken },
//     });

//     comment.status = "deleted";
//     comment.iscommentDeleted = true;
//     await comment.save();

//     return res.status(200).json({
//       success: true,
//       message: "Comment deleted from Facebook and marked in DB",
//     });
//   } catch (error) {
//     const metaError = error.response?.data?.error;
//     if ([3, 190].includes(metaError?.code)) {
//       return res.status(401).json({
//         success: false,
//         message: `"${page.pageName}" পেজের Access Token সমস্যা। '/dashboard/facebook-pages' থেকে নতুন token দিন।`,
//         metaError,
//       });
//     }
//     return res.status(500).json({ success: false, message: "Delete করা যায়নি", metaError });
//   }
// };

// // --- POST /api/facebook/block-user --- (commentId দিয়ে বোঝা হয় কোন পেজ থেকে ব্লক করতে হবে) ---
// exports.blockUser = async (req, res) => {
//   const { senderId, commentId } = req.body;

//   if (!senderId || !commentId) {
//     return res.status(400).json({ success: false, message: "senderId ও commentId আবশ্যক" });
//   }

//   const { page, error } = await getPageTokenForComment(commentId);
//   if (error) {
//     return res.status(400).json({ success: false, message: error });
//   }

//   try {
//     await axios.post(`${GRAPH_API_BASE}/${page.pageId}/blocked`, {
//       user: senderId,
//       access_token: page.pageAccessToken,
//     });

//     await FacebookComment.updateMany({ senderId }, { isUserBlocked: true });

//     return res
//       .status(200)
//       .json({ success: true, message: "User blocked and DB updated" });
//   } catch (error) {
//     const metaError = error.response?.data?.error;
//     console.error("❌ Block Error:", metaError || error.message);

//     if ([210, 190].includes(metaError?.code)) {
//       return res.status(401).json({
//         success: false,
//         message: `"${page.pageName}" পেজের Access Token সমস্যা।`,
//         metaError,
//       });
//     }

//     return res.status(500).json({ success: false, message: "Block করা যায়নি", metaError });
//   }
// };

// // --- POST /api/facebook/delete-and-block ---
// exports.deleteAndBlock = async (req, res) => {
//   const { senderId, commentId } = req.body;

//   if (!senderId || !commentId) {
//     return res.status(400).json({ success: false, error: "senderId ও commentId আবশ্যক" });
//   }

//   const { page, error } = await getPageTokenForComment(commentId);
//   if (error) {
//     return res.status(400).json({ success: false, message: error });
//   }

//   const results = { blocked: false, commentDeleted: false, dbUpdated: false };

//   // ১. ইউজার ব্লক
//   try {
//     await axios.post(`${GRAPH_API_BASE}/${page.pageId}/blocked`, {
//       user: senderId,
//       access_token: page.pageAccessToken,
//     });
//     results.blocked = true;
//   } catch (blockError) {
//     console.error("⚠️ Block Warning:", blockError.response?.data || blockError.message);
//     // Block fail করলেও delete চেষ্টা করা হবে
//   }

//   // ২. কমেন্ট ডিলিট
//   try {
//     await axios.delete(`${GRAPH_API_BASE}/${commentId}`, {
//       params: { access_token: page.pageAccessToken },
//     });
//     results.commentDeleted = true;
//   } catch (delError) {
//     console.error("⚠️ Delete Warning:", delError.response?.data || delError.message);
//   }

//   // ৩. DB-তে ইউজারের সব কমেন্ট blocked মার্ক করা
//   try {
//     await FacebookComment.updateMany(
//       { senderId },
//       { isUserBlocked: true, status: "deleted", iscommentDeleted: true },
//     );
//     results.dbUpdated = true;
//   } catch (dbErr) {
//     console.error("⚠️ DB Update Warning:", dbErr.message);
//   }

//   return res.status(200).json({ success: true, message: "Action completed", results });
// };

// // --- DELETE /api/facebook/db-comment-delete/:id - DB থেকে চিরতরে কমেন্ট মুছে ফেলা ---
// exports.hardDeleteComment = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const deleted = await FacebookComment.findOneAndDelete({
//       $or: [{ _id: id }, { commentId: id }],
//     });

//     if (!deleted) {
//       return res.status(404).json({ success: false, error: "Comment DB-তে পাওয়া যায়নি" });
//     }

//     return res.status(200).json({ success: true, message: "DB থেকে চিরতরে ডিলিট হয়েছে" });
//   } catch (error) {
//     return res.status(500).json({ success: false, error: "DB থেকে delete করা যায়নি" });
//   }
// };




const axios = require("axios");
const FacebookComment = require("../models/FacebookComment");
const { FB_VERIFY_TOKEN } = require("../config/env");
const {
  getAllActivePageIds,
  getPageById,
  getPageTokenForComment,
} = require("../utils/facebookPages");

const GRAPH_API_BASE = "https://graph.facebook.com/v25.0";

// --- GET /api/facebook/webhook - Webhook Verification ---
exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === FB_VERIFY_TOKEN) {
    console.log("✅ Webhook Verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// --- POST /api/facebook/webhook - Facebook থেকে কমেন্ট রিসিভ করা (একাধিক পেজ সাপোর্ট করে) ---
exports.receiveWebhookEvent = async (req, res) => {
  const body = req.body;
  console.log("🎉 Webhook Event Received",body);
  if (body.object !== "page") {
    return res.sendStatus(404);
  }

  if (body.entry && Array.isArray(body.entry)) {
    const knownPageIds = await getAllActivePageIds();

    for (const entry of body.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;

      // 🔍 ডায়াগনস্টিক: প্রতিটা entry-র সম্পূর্ণ raw JSON টার্মিনালে দেখানো হচ্ছে, যাতে
      // Facebook আসলে কী কী field পাঠাচ্ছে তা সরাসরি চোখে দেখে যাচাই করা যায় (অনুমান না করে)।
      // console.log("🏷️  [fb-page-debug-v2] RAW Facebook webhook entry:", JSON.stringify(entry, null, 2));

      for (const changeItem of entry.changes) {
        const change = changeItem.value;

        // নতুন কমেন্ট এসেছে কিনা চেক করা
        if (!(change && change.item === "comment" && change.verb === "add")) continue;

        const rawEntryId = entry.id || null;
        const rawPostId = change.post_id || null;
        const postIdPrefix = rawPostId ? rawPostId.split("_")[0] : null;
        const actualPageId = postIdPrefix || rawEntryId;

        console.log(
          `🔎 Page ID সোর্স তুলনা — entry.id: "${rawEntryId}" | post_id: "${rawPostId}" | post_id প্রিফিক্স: "${postIdPrefix}" | ব্যবহৃত হচ্ছে: "${actualPageId}"`,
        );

        // আমাদের নিজেদের কোনো পেজ থেকে করা কমেন্ট/রিপ্লাই হলে ইগনোর করা (নাহলে নিজের রিপ্লাইও নতুন কমেন্ট হিসেবে দেখাবে)
        if (knownPageIds.includes(change.from?.id)) continue;

        const io = req.app.get("io");
        try {
          const page = await getPageById(actualPageId);

          if (!page) {
            console.warn(
              `⚠️ Facebook Page match failed — ব্যবহৃত pageId: "${actualPageId}" — এটা কোনো সক্রিয় পেজের সাথে মিলছে না। knownPageIds: ${JSON.stringify(knownPageIds)}`,
            );
          }

          const savedComment = await FacebookComment.findOneAndUpdate(
            { commentId: change.comment_id },
            {
              pageId: actualPageId,
              pageName: page?.pageName || "Unknown Page",
              postId: change.post_id,
              commentId: change.comment_id,
              parentId: change.parent_id || null,
              senderName: change.from?.name || "Anonymous",
              senderId: change.from?.id,
              message: change.message || "",
              debugRawEntryId: rawEntryId,
              debugRawPostId: rawPostId,
              debugPostIdPrefix: postIdPrefix,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );

          if (io) io.emit("new-facebook-comment", savedComment);
        } catch (dbError) {
          console.error("❌ Single Comment Processing/DB Error:", dbError.message);
          // ডাটাবেজে সেভ হতে সমস্যা হলেও ফ্রন্টএন্ডে অন্তত সকেট দিয়ে ডেটা যাক (ফলব্যাক)
          if (io) {
            io.emit("new-facebook-comment", {
              pageId: actualPageId,
              commentId: change.comment_id,
              postId: change.post_id,
              senderName: change.from?.name || "Anonymous",
              senderId: change.from?.id,
              message: change.message || "",
              createdAt: new Date(),
            });
          }
        }
      }
    }
  }

  return res.status(200).send("EVENT_RECEIVED");
};

// --- GET /api/facebook/comments ---
exports.getComments = async (req, res) => {
  try {
    const comments = await FacebookComment.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: comments });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch comments from DB" });
  }
};

// --- POST /api/facebook/reply ---
exports.replyToComment = async (req, res) => {
  const { commentId, replyMessage } = req.body;

  if (!commentId || !replyMessage?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "commentId এবং replyMessage আবশ্যক" });
  }

  const { comment, page, error } = await getPageTokenForComment(commentId);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  try {
    const response = await axios.post(`${GRAPH_API_BASE}/${commentId}/comments`, {
      message: replyMessage,
      access_token: page.pageAccessToken,
    });

    comment.isReplied = true;
    await comment.save();

    return res.status(200).json({ success: true, metaData: response.data });
  } catch (error) {
    const metaError = error.response?.data?.error;
    console.error("❌ Reply Error:", metaError || error.message);

    if ([3, 200, 190].includes(metaError?.code)) {
      return res.status(401).json({
        success: false,
        message: `"${page.pageName}" পেজের Access Token invalid বা expired। '/dashboard/facebook-pages' থেকে নতুন token সেট করুন।`,
        metaError,
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Reply পাঠানো যায়নি", metaError });
  }
};

// --- DELETE /api/facebook/comment/:commentId - Facebook থেকে কমেন্ট ডিলিট ---
exports.deleteFacebookComment = async (req, res) => {
  const { commentId } = req.params;

  const { comment, page, error } = await getPageTokenForComment(commentId);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  try {
    await axios.delete(`${GRAPH_API_BASE}/${commentId}`, {
      params: { access_token: page.pageAccessToken },
    });

    comment.status = "deleted";
    comment.iscommentDeleted = true;
    await comment.save();

    return res.status(200).json({
      success: true,
      message: "Comment deleted from Facebook and marked in DB",
    });
  } catch (error) {
    const metaError = error.response?.data?.error;
    if ([3, 190].includes(metaError?.code)) {
      return res.status(401).json({
        success: false,
        message: `"${page.pageName}" পেজের Access Token সমস্যা। '/dashboard/facebook-pages' থেকে নতুন token দিন।`,
        metaError,
      });
    }
    return res.status(500).json({ success: false, message: "Delete করা যায়নি", metaError });
  }
};

// --- POST /api/facebook/block-user --- (commentId দিয়ে বোঝা হয় কোন পেজ থেকে ব্লক করতে হবে) ---
exports.blockUser = async (req, res) => {
  const { senderId, commentId } = req.body;

  if (!senderId || !commentId) {
    return res.status(400).json({ success: false, message: "senderId ও commentId আবশ্যক" });
  }

  const { page, error } = await getPageTokenForComment(commentId);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  try {
    await axios.post(`${GRAPH_API_BASE}/${page.pageId}/blocked`, {
      user: senderId,
      access_token: page.pageAccessToken,
    });

    await FacebookComment.updateMany({ senderId }, { isUserBlocked: true });

    return res
      .status(200)
      .json({ success: true, message: "User blocked and DB updated" });
  } catch (error) {
    const metaError = error.response?.data?.error;
    console.error("❌ Block Error:", metaError || error.message);

    if ([210, 190].includes(metaError?.code)) {
      return res.status(401).json({
        success: false,
        message: `"${page.pageName}" পেজের Access Token সমস্যা।`,
        metaError,
      });
    }

    return res.status(500).json({ success: false, message: "Block করা যায়নি", metaError });
  }
};

// --- POST /api/facebook/delete-and-block ---
exports.deleteAndBlock = async (req, res) => {
  const { senderId, commentId } = req.body;

  if (!senderId || !commentId) {
    return res.status(400).json({ success: false, error: "senderId ও commentId আবশ্যক" });
  }

  const { page, error } = await getPageTokenForComment(commentId);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  const results = { blocked: false, commentDeleted: false, dbUpdated: false };

  // ১. ইউজার ব্লক
  try {
    await axios.post(`${GRAPH_API_BASE}/${page.pageId}/blocked`, {
      user: senderId,
      access_token: page.pageAccessToken,
    });
    results.blocked = true;
  } catch (blockError) {
    console.error("⚠️ Block Warning:", blockError.response?.data || blockError.message);
    // Block fail করলেও delete চেষ্টা করা হবে
  }

  // ২. কমেন্ট ডিলিট
  try {
    await axios.delete(`${GRAPH_API_BASE}/${commentId}`, {
      params: { access_token: page.pageAccessToken },
    });
    results.commentDeleted = true;
  } catch (delError) {
    console.error("⚠️ Delete Warning:", delError.response?.data || delError.message);
  }

  // ৩. DB-তে ইউজারের সব কমেন্ট blocked মার্ক করা
  try {
    await FacebookComment.updateMany(
      { senderId },
      { isUserBlocked: true, status: "deleted", iscommentDeleted: true },
    );
    results.dbUpdated = true;
  } catch (dbErr) {
    console.error("⚠️ DB Update Warning:", dbErr.message);
  }

  return res.status(200).json({ success: true, message: "Action completed", results });
};

// --- DELETE /api/facebook/db-comment-delete/:id - DB থেকে চিরতরে কমেন্ট মুছে ফেলা ---
exports.hardDeleteComment = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await FacebookComment.findOneAndDelete({
      $or: [{ _id: id }, { commentId: id }],
    });

    if (!deleted) {
      return res.status(404).json({ success: false, error: "Comment DB-তে পাওয়া যায়নি" });
    }

    return res.status(200).json({ success: true, message: "DB থেকে চিরতরে ডিলিট হয়েছে" });
  } catch (error) {
    return res.status(500).json({ success: false, error: "DB থেকে delete করা যায়নি" });
  }
};
