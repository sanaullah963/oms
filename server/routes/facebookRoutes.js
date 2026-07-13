const express = require("express");
const router = express.Router();
const axios = require("axios");
const FacebookComment = require("../models/FacebookComment");
require("dotenv").config();

const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.FB_PAGE_ID;

// ✅ স্টার্টআপে Token চেক — Missing হলে সাথে সাথে জানা যাবে
if (!PAGE_ACCESS_TOKEN) {
  console.error("🚨 CRITICAL: FB_PAGE_ACCESS_TOKEN is missing in .env!");
}
if (!PAGE_ID) {
  console.error("🚨 CRITICAL: FB_PAGE_ID is missing in .env!");
}

// ১. Webhook Verification (GET)
router.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "my_secret_oms_token_123";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook Verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ২. comment recive form FB
router.post("/webhook", async (req, res) => {
  const body = req.body;


  if (body.object === "page") {
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const changeItem of entry.changes) {
            const change = changeItem.value;

            // নতুন কমেন্ট এসেছে কিনা চেক করা (verb === 'add' এবং আইটেমটি 'comment')
            if (change && change.item === "comment" && change.verb === "add") {
              // নিজের পেজের করা কমেন্ট বা কাস্টমারকে দেওয়া ওএমএস রিপ্লাই ইগনোর করা
              if (change.from?.id === PAGE_ID) continue;

              // প্রতিটি কমেন্ট প্রসেসিং আলাদা ট্রাই-ক্যাচ-এ রাখা হলো যাতে একটি ফেল করলে অন্যটি চলে
              try {
                // ডাটাবেজে ডেটা ইনসার্ট অথবা আপডেট করা (Upsert)
                const savedComment = await FacebookComment.findOneAndUpdate(
                  { commentId: change.comment_id },
                  {
                    pageId: PAGE_ID,
                    postId: change.post_id,
                    commentId: change.comment_id,
                    parentId: change.parent_id || null, // সাব-কমেন্ট ট্র্যাকিং
                    senderName: change.from?.name || "Anonymous",
                    senderId: change.from?.id,
                    message: change.message || "",
                    // status: "active"
                  },
                  { upsert: true, new: true, setDefaultsOnInsert: true },
                );

                

                // সকেট ডট আইও (Socket.io) দিয়ে ফ্রন্টএন্ডে লাইভ পুশ করা
                const io = req.app.get("io");
                if (io) {
                  io.emit("new-facebook-comment", savedComment);
                  // console.log(`🚀 Socket Emitted for comment: ${change.comment_id}`);
                } else {
                  console.log(
                    "⚠️ Socket.io instance (io) not found in req.app",
                  );
                }
              } catch (dbError) {
                console.error(
                  "❌ Single Comment Processing/DB Error:",
                  dbError.message,
                );
                // ডাটাবেজে সেভ হতে সমস্যা হলেও যেন সটলিস্ট ফ্রন্টএন্ডে অন্তত সকেট দিয়ে ডেটা যায় (ফলব্যাক)
                const io = req.app.get("io");
                if (io) {
                  io.emit("new-facebook-comment", {
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
      }
    }
    // সব লুপ শেষ হওয়ার পর ফেসবুককে রেসপন্স পাঠানো
    return res.status(200).send("EVENT_RECEIVED");
  }
  return res.sendStatus(404);
});

// ৩. DB থেকে সব কমেন্ট ফ্রন্টএন্ডে পাঠানো (GET)
router.get("/comments", async (req, res) => {
  try {
    const comments = await FacebookComment.find().sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: comments });
  } catch (error) {
    // console.error("❌ Fetch Comments Error:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch comments from DB" });
  }
});

// ৪. নির্দিষ্ট কমেন্টে রিপ্লাই দেওয়া (POST)
router.post("/reply", async (req, res) => {
  const { commentId, replyMessage } = req.body;

  if (!commentId || !replyMessage?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "commentId এবং replyMessage আবশ্যক" });
  }

  // ✅ Token আছে কিনা আগে চেক করো
  if (!PAGE_ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      message: "FB_PAGE_ACCESS_TOKEN missing in server .env file",
    });
  }

  try {
    // ✅ FIX: POST /{comment-id}/comments — এটাই সঠিক reply endpoint
    // access_token অবশ্যই একটি Page Access Token হতে হবে, User Token নয়
    const response = await axios.post(
      `https://graph.facebook.com/v25.0/${commentId}/comments`,
      {
        message: replyMessage,
        access_token: PAGE_ACCESS_TOKEN,
      },
    );

    // DB-তে isReplied আপডেট
    await FacebookComment.findOneAndUpdate({ commentId }, { isReplied: true });

    // console.log(`✅ Reply sent to comment ${commentId}`);
    // console.log(`comment reply response response:`, response.data);
    res.status(200).json({ success: true, metaData: response.data });
  } catch (error) {
    // ✅ Meta-র বিস্তারিত error message লগ করা
    const metaError = error.response?.data?.error;
    console.error("❌ Reply Error:", metaError || error.message);

    // Token সমস্যা হলে সুনির্দিষ্ট message
    if (
      metaError?.code === 3 ||
      metaError?.code === 200 ||
      metaError?.code === 190
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Facebook Page Access Token invalid বা expired। নতুন token সেট করুন।",
        metaError,
      });
    }

    res
      .status(500)
      .json({ success: false, message: "Reply পাঠানো যায়নি", metaError });
  }
});

// ৫. Facebook থেকে কমেন্ট ডিলিট (DELETE)
router.delete("/comment/:commentId", async (req, res) => {
  const { commentId } = req.params;
  try {
    const fbResponse = await axios.delete(
      `https://graph.facebook.com/v25.0/${commentId}`,
      {
        params: {
          access_token: PAGE_ACCESS_TOKEN,
        },
      },
    );

    // console.log(fbResponse.data);

    await FacebookComment.findOneAndUpdate(
      { commentId },
      { status: "deleted", iscommentDeleted: true },
    );

    return res.status(200).json({
      success: true,
      message: "Comment deleted from Facebook and marked in DB",
    });
  } catch (error) {
    const metaError = error.response?.data?.error;
    // console.error("❌ Delete Error:", metaError || error.message);
    if (metaError?.code === 3 || metaError?.code === 190) {
      return res.status(401).json({
        success: false,
        message:
          "Page Access Token সমস্যা। .env ফাইলে সঠিক Page Access Token দিন।",
        metaError,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Delete করা যায়নি",
      metaError,
    });
  }
});

// ৬. ইউজার ব্লক করা (POST)
router.post("/block-user", async (req, res) => {
  const { senderId } = req.body;

  if (!senderId) {
    return res.status(400).json({ success: false, message: "senderId আবশ্যক" });
  }

  if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
    return res.status(500).json({
      success: false,
      message: "FB_PAGE_ACCESS_TOKEN বা FB_PAGE_ID .env-এ missing",
    });
  }

  try {
    // ✅ Meta-র সঠিক Block API format
    // POST /{page-id}/blocked — body-তে data পাঠাতে হবে
  const blockres =  await axios.post(
      `https://graph.facebook.com/v25.0/${PAGE_ID}/blocked`,
      {
        user: senderId,
        access_token: PAGE_ACCESS_TOKEN,
      },
    );

    // console.log(`✅ User ${senderId} blocked. Response:`, blockres.data);

    await FacebookComment.updateMany({ senderId }, { isUserBlocked: true });

    res
      .status(200)
      .json({ success: true, message: "User blocked and DB updated" });
  } catch (error) {
    const metaError = error.response?.data?.error;
    console.error("❌ Block Error:", metaError || error.message);

    if (metaError?.code === 210 || metaError?.code === 190) {
      return res.status(401).json({
        success: false,
        message:
          "Page Access Token সমস্যা। Facebook Page-এর জন্য সঠিক Page Access Token দরকার।",
        metaError,
      });
    }

    res
      .status(500)
      .json({ success: false, message: "Block করা যায়নি", metaError });
  }
});

// ৭. একসাথে ডিলিট + ব্লক (POST)

router.post("/delete-and-block", async (req, res) => {
  const { senderId, commentId } = req.body;
  // console.log('--- Delete & Block Action Started ---', { senderId, commentId });
  if (!senderId) {
    return res.status(400).json({ success: false, error: "senderId আবশ্যক" });
  }

  if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
    return res.status(500).json({
      success: false,
      message: "FB_PAGE_ACCESS_TOKEN বা FB_PAGE_ID .env-এ missing",
    });
  }

  const results = { blocked: false, commentDeleted: false, dbUpdated: false };

  try {
    // ১. ইউজার ব্লক
   const blockres = await axios.post(`https://graph.facebook.com/v25.0/${PAGE_ID}/blocked`, {
      user: senderId,
      access_token: PAGE_ACCESS_TOKEN,
    });
    results.blocked = true;
    // console.log(`✅  blocked respons`,blockres.data);
  } catch (blockError) {
    console.error(
      "⚠️ Block Warning:",
      blockError.response?.data || blockError.message,
    );
    // Block fail করলেও delete চেষ্টা করো
  }

  // ২. কমেন্ট ডিলিট (যদি commentId থাকে)
  if (commentId) {
    try {
      await axios.delete(`https://graph.facebook.com/v25.0/${commentId}`, {
        params: { access_token: PAGE_ACCESS_TOKEN },
      });
      results.commentDeleted = true;
      // console.log(`✅ Comment ${commentId} deleted`);

      // await FacebookComment.findOneAndUpdate({ commentId }, { status: "deleted" });
    } catch (delError) {
      console.error(
        "⚠️ Delete Warning:",
        delError.response?.data || delError.message,
      );
    }
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

  res.status(200).json({
    success: true,
    message: "Action completed",
    results,
  });
});

//✅ ৮. DB  থেকে চিরতরে কমেন্ট মুছে ফেলা (DELETE)

router.delete("/db-comment-delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // id দিয়ে অথবা commentId দিয়ে খোঁজা
    const deleted = await FacebookComment.findOneAndDelete({
      $or: [{ _id: id }, { commentId: id }],
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, error: "Comment DB-তে পাওয়া যায়নি" });
    }

    // console.log(`✅ Comment permanently deleted from DB: ${id}`);
    res
      .status(200)
      .json({ success: true, message: "DB থেকে চিরতরে ডিলিট হয়েছে" });
  } catch (error) {
    // console.error("❌ Hard Delete Error:", error.message);
    res
      .status(500)
      .json({ success: false, error: "DB থেকে delete করা যায়নি" });
  }
});

module.exports = router;
