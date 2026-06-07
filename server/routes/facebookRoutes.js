// const express = require('express');
// const router = express.Router();
// const axios = require('axios');
// const FacebookComment = require('../models/FacebookComment'); // আপনার মডেল
// require("dotenv").config();

// const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
// const PAGE_ID = process.env.FB_PAGE_ID;


// // ৭. done ডাটাবেজে থাকা সমস্ত কমেন্ট ফ্রন্টএন্ডে নিয়ে আসার API (GET)
// router.get('/comments', async (req, res) => {
//     console.log('comment');
//     try {
        
//         const comments = await FacebookComment.find().sort({ createdAt: -1 });
//         console.log('commentaaaa',comments);
//         res.status(200).json({ success: true, data: comments });
//     } catch (error) {
//         console.error("❌ Fetch DB Comments Error:", error.message);
//         res.status(500).json({ success: false, error: 'Failed to fetch comments from DB' });
//     }
// });
// // ১. Webhook Verification (GET)
// router.get('/webhook', (req, res) => {
//     const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'my_secret_oms_token_123';
//     const mode = req.query['hub.mode'];
//     const token = req.query['hub.verify_token'];
//     const challenge = req.query['hub.challenge'];

//     if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
//         return res.status(200).send(challenge);
//     }
//     return res.sendStatus(403);
// });

// // ২. Webhook-এর মাধ্যমে রিয়েল-টাইম কমেন্ট রিসিভ এবং ডিবি-তে সেভ করা (POST)
// router.post('/webhook', async (req, res) => {
//     const body = req.body;
//     console.log("🔥 Meta Webhook Hit Successfully Received!", JSON.stringify(body, null, 2));

//     if (body.object === 'page') {
//         if (body.entry && Array.isArray(body.entry)) {
//             for (const entry of body.entry) {
//                 if (entry.changes && Array.isArray(entry.changes)) {
//                     for (const changeItem of entry.changes) {
//                         const change = changeItem.value;
                        
//                         // নতুন কমেন্ট এসেছে কিনা চেক করা (verb === 'add' এবং আইটেমটি 'comment')
//                         if (change && change.item === 'comment' && change.verb === 'add') {
                            
//                             // নিজের পেজের করা কমেন্ট বা কাস্টমারকে দেওয়া ওএমএস রিপ্লাই ইগনোর করা
//                             if (change.from?.id === PAGE_ID) continue;

//                             // প্রতিটি কমেন্ট প্রসেসিং আলাদা ট্রাই-ক্যাচ-এ রাখা হলো যাতে একটি ফেল করলে অন্যটি চলে
//                             try {
//                                 // ডাটাবেজে ডেটা ইনসার্ট অথবা আপডেট করা (Upsert)
//                                 const savedComment = await FacebookComment.findOneAndUpdate(
//                                     { commentId: change.comment_id },
//                                     {
//                                         pageId: PAGE_ID,
//                                         postId: change.post_id,
//                                         commentId: change.comment_id,
//                                         parentId: change.parent_id || null, // সাব-কমেন্ট ট্র্যাকিং
//                                         senderName: change.from?.name || "Anonymous",
//                                         senderId: change.from?.id,
//                                         message: change.message || '',
//                                         status: "active"
//                                     },
//                                     { upsert: true, new: true, setDefaultsOnInsert: true }
//                                 );

//                                 console.log(`💾 Comment Saved to DB: [${savedComment.senderName}] -> ${savedComment.message}`);

//                                 // সকেট ডট আইও (Socket.io) দিয়ে ফ্রন্টএন্ডে লাইভ পুশ করা
//                                 const io = req.app.get("io");
//                                 if (io) {
//                                     io.emit('new-facebook-comment', savedComment);
//                                     console.log(`🚀 Socket Emitted for comment: ${change.comment_id}`);
//                                 } else {
//                                     console.log("⚠️ Socket.io instance (io) not found in req.app");
//                                 }

//                             } catch (dbError) {
//                                 console.error("❌ Single Comment Processing/DB Error:", dbError.message);
//                                 // ডাটাবেজে সেভ হতে সমস্যা হলেও যেন সটলিস্ট ফ্রন্টএন্ডে অন্তত সকেট দিয়ে ডেটা যায় (ফলব্যাক)
//                                 const io = req.app.get("io");
//                                 if (io) {
//                                     io.emit('new-facebook-comment', {
//                                         commentId: change.comment_id,
//                                         postId: change.post_id,
//                                         senderName: change.from?.name || "Anonymous",
//                                         senderId: change.from?.id,
//                                         message: change.message || '',
//                                         createdAt: new Date()
//                                     });
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         }
//         // সব লুপ শেষ হওয়ার পর ফেসবুককে রেসপন্স পাঠানো
//         return res.status(200).send('EVENT_RECEIVED');
//     }
//     return res.sendStatus(404);
// });

// // ৩. ওএমএস ওয়েবসাইট থেকে কমেন্টের রিপ্লাই দেওয়ার API (POST)
// router.post('/reply', async (req, res) => {
//     const { commentId, replyMessage } = req.body;

//     try {
//         const response = await axios.post(`https://graph.facebook.com/v25.0/${commentId}/comments`, {
//             message: replyMessage,
//             access_token: PAGE_ACCESS_TOKEN
//         });

//         await FacebookComment.findOneAndUpdate({ commentId }, { isReplied: true });
//         res.status(200).json({ success: true, metaData: response.data });
//     } catch (error) {
//         console.error("❌ Reply Error:", error.response?.data || error.message);
//         res.status(500).json({ success: false, error: 'Failed to send reply to Meta' });
//     }
// });

// // ৪. ওএমএস ওয়েবসাইট থেকে কমেন্ট ডিলিট করার API (DELETE)
// router.delete('/comment/:commentId', async (req, res) => {
//     const { commentId } = req.params;

//     try {
//         await axios.delete(`https://graph.facebook.com/v25.0/${commentId}`, {
//             params: { access_token: PAGE_ACCESS_TOKEN }
//         });

//         await FacebookComment.findOneAndUpdate({ commentId }, { status: "deleted" });
//         res.status(200).json({ success: true, message: 'Comment deleted successfully from Facebook and DB' });
//     } catch (error) {
//         console.error("❌ Delete Error:", error.response?.data || error.message);
//         res.status(500).json({ success: false, error: 'Failed to delete comment from Meta' });
//     }
// });



// // ৫. ওএমএস থেকে স্প্যামার কাস্টমারকে পেজ থেকে拦截/ব্লক করার API (POST)
// router.post('/delete-and-block', async (req, res) => {
//     const { senderId, commentId } = req.body; 
//     console.log('--- Delete & Block Action Started ---', { senderId, commentId });

//     if (!senderId) {
//         return res.status(400).json({ success: false, error: 'senderId is required' });
//     }

//     try {
//         // ১. টোকেন প্রিফিক্স কনসোল করা সুরক্ষার জন্য
//         console.log("Active Page Token:", PAGE_ACCESS_TOKEN ? PAGE_ACCESS_TOKEN.substring(0, 15) + "..." : "Missing");

//         // ২. ইউজার ব্লকিং ইউআরএল তৈরি (সরাসরি কোয়েরি প্যারামিটারে সম্পূর্ণ ডেটা পাঠানো)
//         // মেটা এই ডিরেক্ট ইউআরএল মেথডটি সবচেয়ে নিখুঁতভাবে রিড করতে পারে
//         const blockUrl = `https://graph.facebook.com/v25.0/${PAGE_ID}/blocked?user=${senderId}&access_token=${PAGE_ACCESS_TOKEN}`;

//         await axios.post(blockUrl, {}, {
//             headers: { 'Content-Type': 'application/json' }
//         });
//         console.log(`✅ User ${senderId} successfully blocked on Facebook.`);

//         // ৩. নির্দিষ্ট কমেন্ট আইডি থাকলে সেটি ফেসবুক থেকে ডিলিট করা
//         if (commentId) {
//             try {
//                 await axios.delete(`https://graph.facebook.com/v25.0/${commentId}`, {
//                     params: { access_token: PAGE_ACCESS_TOKEN }
//                 });
//                 console.log(`✅ Comment ${commentId} successfully deleted from Facebook.`);
                
//                 // ডাটাবেজে কমেন্ট স্ট্যাটাস আপডেট করা
//                 await FacebookComment.findOneAndUpdate({ commentId }, { status: "deleted" });
//             } catch (fbDelError) {
//                 console.error("⚠️ FB Comment Delete Warning:", fbDelError.response?.data || fbDelError.message);
//             }
//         }

//         // ৪. ডাটাবেজে ইউজারের সব কমেন্টে ব্লকড স্ট্যাটাস আপডেট
//         await FacebookComment.updateMany({ senderId }, { isUserBlocked: true });

//         res.status(200).json({ 
//             success: true, 
//             message: 'Spammer successfully blocked and comment deleted' 
//         });

//     } catch (error) {
//         console.error("❌ Block & Delete Meta Error Details:", error.response?.data || error.message);
//         res.status(500).json({ 
//             success: false, 
//             error: 'Failed to complete action on Meta',
//             metaError: error.response?.data 
//         });
//     }
// });


// // ওএমএস থেকে স্প্যামার কাস্টমারকে পেজ থেকে ব্লক করার ডেডিকেটেড API (POST)
// router.post('/block-user', async (req, res) => {
//     const { senderId } = req.body; 
//     console.log('--- FB Block Request Received ---', { senderId });

//     if (!senderId) {
//         return res.status(400).json({ success: false, error: 'senderId is required' });
//     }

//     try {
//         // ১. মেটা পেজের ব্লক এন্ডপয়েন্ট ইউআরএল তৈরি (কোয়েরি স্ট্রিং ফরম্যাট)
//         const blockUrl = `https://graph.facebook.com/v25.0/${PAGE_ID}/blocked?user=${senderId}&access_token=${PAGE_ACCESS_TOKEN}`;
//         // console.log("🚀 FB Block URL:", blockUrl);
//         // ২. ফেসবুকে রিকোয়েস্ট পাঠানো
//         await axios.post(blockUrl, {}, {
//             headers: { 'Content-Type': 'application/json' }
//         });
//         console.log(`✅ User ${senderId} successfully blocked on Facebook.`);

//         // ৩. আপনার ডাটাবেজে ওই ইউজারের যত কমেন্ট আছে সবগুলোকে ব্লকড হিসেবে আপডেট করা
//         await FacebookComment.updateMany(
//             { senderId }, 
//             { isUserBlocked: true }
//         );

//         res.status(200).json({ 
//             success: true, 
//             message: 'User successfully blocked from Facebook Page and updated in DB' 
//         });

//     } catch (error) {
//         console.error("❌ Facebook Block API Error:", error.response?.data || error.message);
//         res.status(500).json({ 
//             success: false, 
//             error: 'Failed to block user on Meta',
//             metaError: error.response?.data 
//         });
//     }
// });

// module.exports = router;



























const express = require('express');
const router = express.Router();
const axios = require('axios');
const FacebookComment = require('../models/FacebookComment');
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


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ১. Webhook Verification (GET)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'my_secret_oms_token_123';
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("✅ Webhook Verified");
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
});


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ২. Webhook — রিয়েল-টাইম ইভেন্ট রিসিভ (POST)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/webhook', async (req, res) => {
    const body = req.body;
    console.log("🔥 Webhook Received:", JSON.stringify(body, null, 2));

    if (body.object !== 'page') return res.sendStatus(404);

    for (const entry of body.entry || []) {
        for (const changeItem of entry.changes || []) {
            const change = changeItem.value;

            // ✅ FIX: শুধুমাত্র comment item এবং verb === 'add' হলেই প্রসেস করো
            // reaction, like, edit ইভেন্টগুলো এখন আর ট্রিগার করবে না
            if (!change || change.item !== 'comment' || change.verb !== 'add') {
                console.log(`⏭️ Skipping non-comment event: item=${change?.item}, verb=${change?.verb}`);
                continue;
            }

            // নিজের পেজের কমেন্ট ইগনোর
            if (change.from?.id === PAGE_ID) {
                console.log("⏭️ Skipping own page comment");
                continue;
            }

            try {
                const savedComment = await FacebookComment.findOneAndUpdate(
                    { commentId: change.comment_id },
                    {
                        pageId: PAGE_ID,           // ✅ FIX: pageId (আগে paegId ছিল)
                        postId: change.post_id,
                        commentId: change.comment_id,
                        parentId: change.parent_id || null,
                        senderName: change.from?.name || "Anonymous",
                        senderId: change.from?.id,
                        message: change.message || '',
                        status: "active"
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                console.log(`💾 Comment Saved: [${savedComment.senderName}] → ${savedComment.message}`);

                const io = req.app.get("io");
                if (io) {
                    io.emit('new-facebook-comment', savedComment);
                    console.log(`🚀 Socket Emitted: ${change.comment_id}`);
                }
            } catch (dbError) {
                console.error("❌ DB Save Error:", dbError.message);
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

    return res.status(200).send('EVENT_RECEIVED');
});


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ৩. DB থেকে সব কমেন্ট ফ্রন্টএন্ডে পাঠানো (GET)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/comments', async (req, res) => {
    try {
        const comments = await FacebookComment.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: comments });
    } catch (error) {
        console.error("❌ Fetch Comments Error:", error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch comments from DB' });
    }
});


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ৪. নির্দিষ্ট কমেন্টে রিপ্লাই দেওয়া (POST)
// ✅ FIX: এখন সঠিক Graph API endpoint ব্যবহার করা হচ্ছে
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/reply', async (req, res) => {
    const { commentId, replyMessage } = req.body;

    if (!commentId || !replyMessage?.trim()) {
        return res.status(400).json({ success: false, error: 'commentId এবং replyMessage আবশ্যক' });
    }

    // ✅ Token আছে কিনা আগে চেক করো
    if (!PAGE_ACCESS_TOKEN) {
        return res.status(500).json({ 
            success: false, 
            error: 'FB_PAGE_ACCESS_TOKEN missing in server .env file' 
        });
    }

    try {
        // ✅ FIX: POST /{comment-id}/comments — এটাই সঠিক reply endpoint
        // access_token অবশ্যই একটি Page Access Token হতে হবে, User Token নয়
        const response = await axios.post(
            `https://graph.facebook.com/v25.0/${commentId}/comments`,
            {
                message: replyMessage,
                access_token: PAGE_ACCESS_TOKEN   // Page Access Token
            }
        );

        // DB-তে isReplied আপডেট
        await FacebookComment.findOneAndUpdate(
            { commentId },
            { isReplied: true }
        );

        console.log(`✅ Reply sent to comment ${commentId}`);
        res.status(200).json({ success: true, metaData: response.data });

    } catch (error) {
        // ✅ Meta-র বিস্তারিত error message লগ করা
        const metaError = error.response?.data?.error;
        console.error("❌ Reply Error:", metaError || error.message);

        // Token সমস্যা হলে সুনির্দিষ্ট message
        if (metaError?.code === 3 || metaError?.code === 200 || metaError?.code === 190) {
            return res.status(401).json({ 
                success: false, 
                error: 'Facebook Page Access Token invalid বা expired। নতুন token সেট করুন।',
                metaError
            });
        }

        res.status(500).json({ success: false, error: 'Reply পাঠানো যায়নি', metaError });
    }
});


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ৫. Facebook থেকে কমেন্ট ডিলিট (DELETE)
// ✅ FIX: Token validation যোগ করা হয়েছে
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.delete('/comment/:commentId', async (req, res) => {
    const { commentId } = req.params;

    if (!PAGE_ACCESS_TOKEN) {
        return res.status(500).json({ success: false, error: 'FB_PAGE_ACCESS_TOKEN missing' });
    }

    try {
        await axios.delete(`https://graph.facebook.com/v25.0/${commentId}`, {
            params: { access_token: PAGE_ACCESS_TOKEN }
        });

        await FacebookComment.findOneAndUpdate({ commentId }, { status: "deleted" });

        console.log(`✅ Comment ${commentId} deleted from Facebook`);
        res.status(200).json({ success: true, message: 'Comment deleted from Facebook and marked in DB' });

    } catch (error) {
        const metaError = error.response?.data?.error;
        console.error("❌ Delete Error:", metaError || error.message);

        if (metaError?.code === 3 || metaError?.code === 190) {
            return res.status(401).json({ 
                success: false, 
                error: 'Page Access Token সমস্যা। .env ফাইলে সঠিক Page Access Token দিন।',
                metaError
            });
        }

        res.status(500).json({ success: false, error: 'Delete করা যায়নি', metaError });
    }
});


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ৬. ইউজার ব্লক করা (POST)
// ✅ FIX: Token validation + সঠিক API format
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/block-user', async (req, res) => {
    const { senderId } = req.body;

    if (!senderId) {
        return res.status(400).json({ success: false, error: 'senderId আবশ্যক' });
    }

    if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
        return res.status(500).json({ 
            success: false, 
            error: 'FB_PAGE_ACCESS_TOKEN বা FB_PAGE_ID .env-এ missing' 
        });
    }

    try {
        // ✅ Meta-র সঠিক Block API format
        // POST /{page-id}/blocked — body-তে data পাঠাতে হবে
        const blockResponse = await axios.post(
            `https://graph.facebook.com/v25.0/${PAGE_ID}/blocked`,
            {
                user: senderId,
                access_token: PAGE_ACCESS_TOKEN
            }
        );

        console.log(`✅ User ${senderId} blocked. Response:`, blockResponse.data);

        await FacebookComment.updateMany({ senderId }, { isUserBlocked: true });

        res.status(200).json({ success: true, message: 'User blocked and DB updated' });

    } catch (error) {
        const metaError = error.response?.data?.error;
        console.error("❌ Block Error:", metaError || error.message);

        if (metaError?.code === 210 || metaError?.code === 190) {
            return res.status(401).json({ 
                success: false, 
                error: 'Page Access Token সমস্যা। Facebook Page-এর জন্য সঠিক Page Access Token দরকার।',
                metaError
            });
        }

        res.status(500).json({ success: false, error: 'Block করা যায়নি', metaError });
    }
});


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ৭. একসাথে ডিলিট + ব্লক (POST)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/delete-and-block', async (req, res) => {
    const { senderId, commentId } = req.body;

    if (!senderId) {
        return res.status(400).json({ success: false, error: 'senderId আবশ্যক' });
    }

    if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
        return res.status(500).json({ 
            success: false, 
            error: 'FB_PAGE_ACCESS_TOKEN বা FB_PAGE_ID .env-এ missing' 
        });
    }

    const results = { blocked: false, commentDeleted: false, dbUpdated: false };

    try {
        // ১. ইউজার ব্লক
        await axios.post(
            `https://graph.facebook.com/v25.0/${PAGE_ID}/blocked`,
            {
                user: senderId,
                access_token: PAGE_ACCESS_TOKEN
            }
        );
        results.blocked = true;
        console.log(`✅ User ${senderId} blocked`);

    } catch (blockError) {
        console.error("⚠️ Block Warning:", blockError.response?.data || blockError.message);
        // Block fail করলেও delete চেষ্টা করো
    }

    // ২. কমেন্ট ডিলিট (যদি commentId থাকে)
    if (commentId) {
        try {
            await axios.delete(`https://graph.facebook.com/v25.0/${commentId}`, {
                params: { access_token: PAGE_ACCESS_TOKEN }
            });
            results.commentDeleted = true;
            console.log(`✅ Comment ${commentId} deleted`);

            await FacebookComment.findOneAndUpdate({ commentId }, { status: "deleted" });
        } catch (delError) {
            console.error("⚠️ Delete Warning:", delError.response?.data || delError.message);
        }
    }

    // ৩. DB-তে ইউজারের সব কমেন্ট blocked মার্ক করা
    try {
        await FacebookComment.updateMany({ senderId }, { isUserBlocked: true });
        results.dbUpdated = true;
    } catch (dbErr) {
        console.error("⚠️ DB Update Warning:", dbErr.message);
    }

    res.status(200).json({
        success: true,
        message: 'Action completed',
        results
    });
});


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ৮. DB থেকে চিরতরে কমেন্ট মুছে ফেলা (DELETE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.delete('/db-comment-delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // id দিয়ে অথবা commentId দিয়ে খোঁজা
        const deleted = await FacebookComment.findOneAndDelete({
            $or: [{ _id: id }, { commentId: id }]
        });

        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Comment DB-তে পাওয়া যায়নি' });
        }

        console.log(`✅ Comment permanently deleted from DB: ${id}`);
        res.status(200).json({ success: true, message: 'DB থেকে চিরতরে ডিলিট হয়েছে' });

    } catch (error) {
        console.error("❌ Hard Delete Error:", error.message);
        res.status(500).json({ success: false, error: 'DB থেকে delete করা যায়নি' });
    }
});


module.exports = router;