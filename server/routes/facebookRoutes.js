const express = require('express');
const router = express.Router();
const axios = require('axios');
const FacebookComment = require('../models/FacebookComment'); // আপনার মডেল
require("dotenv").config();

const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.FB_PAGE_ID;


// ৭. ডাটাবেজে থাকা সমস্ত কমেন্ট ফ্রন্টএন্ডে নিয়ে আসার API (GET)
router.get('/comments', async (req, res) => {
    console.log('comment');
    try {
        
        const comments = await FacebookComment.find().sort({ createdAt: -1 });
        console.log('commentaaaa',comments);
        res.status(200).json({ success: true, data: comments });
    } catch (error) {
        console.error("❌ Fetch DB Comments Error:", error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch comments from DB' });
    }
});
// ১. Webhook Verification (GET)
router.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'my_secret_oms_token_123';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
});

// ২. Webhook-এর মাধ্যমে রিয়েল-টাইম কমেন্ট রিসিভ এবং ডিবি-তে সেভ করা (POST)
router.post('/webhook', async (req, res) => {
    const body = req.body;
    console.log("🔥 Meta Webhook Hit Successfully Received!", JSON.stringify(body, null, 2));

    if (body.object === 'page') {
        if (body.entry && Array.isArray(body.entry)) {
            for (const entry of body.entry) {
                if (entry.changes && Array.isArray(entry.changes)) {
                    for (const changeItem of entry.changes) {
                        const change = changeItem.value;
                        
                        // নতুন কমেন্ট এসেছে কিনা চেক করা (verb === 'add' এবং আইটেমটি 'comment')
                        if (change && change.item === 'comment' && change.verb === 'add') {
                            
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
                                        message: change.message || '',
                                        status: "active"
                                    },
                                    { upsert: true, new: true, setDefaultsOnInsert: true }
                                );

                                console.log(`💾 Comment Saved to DB: [${savedComment.senderName}] -> ${savedComment.message}`);

                                // সকেট ডট আইও (Socket.io) দিয়ে ফ্রন্টএন্ডে লাইভ পুশ করা
                                const io = req.app.get("io");
                                if (io) {
                                    io.emit('new-facebook-comment', savedComment);
                                    console.log(`🚀 Socket Emitted for comment: ${change.comment_id}`);
                                } else {
                                    console.log("⚠️ Socket.io instance (io) not found in req.app");
                                }

                            } catch (dbError) {
                                console.error("❌ Single Comment Processing/DB Error:", dbError.message);
                                // ডাটাবেজে সেভ হতে সমস্যা হলেও যেন সটলিস্ট ফ্রন্টএন্ডে অন্তত সকেট দিয়ে ডেটা যায় (ফলব্যাক)
                                const io = req.app.get("io");
                                if (io) {
                                    io.emit('new-facebook-comment', {
                                        commentId: change.comment_id,
                                        postId: change.post_id,
                                        senderName: change.from?.name || "Anonymous",
                                        senderId: change.from?.id,
                                        message: change.message || '',
                                        createdAt: new Date()
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        // সব লুপ শেষ হওয়ার পর ফেসবুককে রেসপন্স পাঠানো
        return res.status(200).send('EVENT_RECEIVED');
    }
    return res.sendStatus(404);
});

// ৩. ওএমএস ওয়েবসাইট থেকে কমেন্টের রিপ্লাই দেওয়ার API (POST)
router.post('/reply', async (req, res) => {
    const { commentId, replyMessage } = req.body;

    try {
        const response = await axios.post(`https://graph.facebook.com/v25.0/${commentId}/comments`, {
            message: replyMessage,
            access_token: PAGE_ACCESS_TOKEN
        });

        await FacebookComment.findOneAndUpdate({ commentId }, { isReplied: true });
        res.status(200).json({ success: true, metaData: response.data });
    } catch (error) {
        console.error("❌ Reply Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Failed to send reply to Meta' });
    }
});

// ৪. ওএমএস ওয়েবসাইট থেকে কমেন্ট ডিলিট করার API (DELETE)
router.delete('/comment/:commentId', async (req, res) => {
    const { commentId } = req.params;

    try {
        await axios.delete(`https://graph.facebook.com/v25.0/${commentId}`, {
            params: { access_token: PAGE_ACCESS_TOKEN }
        });

        await FacebookComment.findOneAndUpdate({ commentId }, { status: "deleted" });
        res.status(200).json({ success: true, message: 'Comment deleted successfully from Facebook and DB' });
    } catch (error) {
        console.error("❌ Delete Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Failed to delete comment from Meta' });
    }
});

// ৫. ওএমএস থেকে স্প্যামার কাস্টমারকে পেজ থেকে拦截/ব্লক করার API (POST)
router.post('/block-user', async (req, res) => {
    const { senderId, commentId } = req.body; 

    try {
        await axios.post(`https://graph.facebook.com/v25.0/${PAGE_ID}/blocked`, {
            user: senderId,
            access_token: PAGE_ACCESS_TOKEN
        });

        if (commentId) {
            await axios.delete(`https://graph.facebook.com/v25.0/${commentId}`, {
                params: { access_token: PAGE_ACCESS_TOKEN }
            });
            await FacebookComment.findOneAndUpdate({ commentId }, { status: "deleted" });
        }

        await FacebookComment.updateMany({ senderId }, { isUserBlocked: true });
        res.status(200).json({ success: true, message: 'Spammer successfully blocked from Page' });
    } catch (error) {
        console.error("❌ Block Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Failed to block user on Meta' });
    }
});

module.exports = router;