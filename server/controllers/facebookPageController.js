// const FacebookPage = require("../models/FacebookPage");
// const FacebookComment = require("../models/FacebookComment");

// function maskToken(token) {
//   if (!token || token.length < 10) return "••••••••";
//   return `${token.slice(0, 6)}••••••••${token.slice(-4)}`;
// }

// function toSafePage(page) {
//   return {
//     _id: page._id,
//     pageId: page.pageId,
//     pageName: page.pageName,
//     isActive: page.isActive,
//     maskedToken: maskToken(page.pageAccessToken),
//     createdAt: page.createdAt,
//     updatedAt: page.updatedAt,
//   };
// }

// // --- GET /api/facebook-pages (admin only) ---
// exports.listPages = async (req, res) => {
//   try {
//     const pages = await FacebookPage.find().sort({ createdAt: -1 });
//     return res.status(200).json({ pages: pages.map(toSafePage) });
//   } catch (error) {
//     return res.status(500).json({ message: "পেজ লিস্ট আনতে ব্যর্থ হয়েছে।" });
//   }
// };

// // --- POST /api/facebook-pages (admin only) ---
// exports.createPage = async (req, res) => {
//   try {
//     const { pageId, pageName, pageAccessToken } = req.body;
//     if (!pageId || !pageName || !pageAccessToken) {
//       return res
//         .status(400)
//         .json({ message: "pageId, pageName ও pageAccessToken — তিনটাই আবশ্যক।" });
//     }

//     const exists = await FacebookPage.findOne({ pageId });
//     if (exists) {
//       return res.status(409).json({ message: "এই Page ID দিয়ে আগেই একটা এন্ট্রি আছে।" });
//     }

//     const page = await FacebookPage.create({ pageId, pageName, pageAccessToken });
//     return res.status(201).json({ message: "পেজ যোগ করা হয়েছে।", page: toSafePage(page) });
//   } catch (error) {
//     console.error("Create facebook page error:", error);
//     return res.status(500).json({ message: "পেজ যোগ করতে ব্যর্থ হয়েছে।" });
//   }
// };

// // --- PATCH /api/facebook-pages/:id (admin only) --- নাম/টোকেন/সক্রিয়তা আপডেট ---
// exports.updatePage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { pageName, pageAccessToken, isActive } = req.body;

//     const update = {};
//     if (pageName !== undefined) update.pageName = pageName;
//     if (pageAccessToken !== undefined && pageAccessToken.trim() !== "") {
//       update.pageAccessToken = pageAccessToken;
//     }
//     if (isActive !== undefined) update.isActive = isActive;

//     const page = await FacebookPage.findByIdAndUpdate(id, update, { new: true });
//     if (!page) {
//       return res.status(404).json({ message: "পেজ খুঁজে পাওয়া যায়নি।" });
//     }

//     return res.status(200).json({ message: "আপডেট করা হয়েছে।", page: toSafePage(page) });
//   } catch (error) {
//     return res.status(500).json({ message: "আপডেট করতে ব্যর্থ হয়েছে।" });
//   }
// };

// // --- DELETE /api/facebook-pages/:id (admin only) ---
// exports.deletePage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const page = await FacebookPage.findByIdAndDelete(id);
//     if (!page) {
//       return res.status(404).json({ message: "পেজ খুঁজে পাওয়া যায়নি।" });
//     }
//     return res.status(200).json({ message: "পেজ মুছে ফেলা হয়েছে।" });
//   } catch (error) {
//     return res.status(500).json({ message: "মুছতে ব্যর্থ হয়েছে।" });
//   }
// };

// // --- GET /api/facebook-pages/unmatched-ids (admin only) ---
// // ডায়াগনস্টিক: FacebookComment-এ থাকা কোন pageId গুলো বর্তমান FacebookPage লিস্টের কোনোটার
// // সাথে মিলছে না — এটা দেখে dashboard-এ সেভ করা Page ID-র সাথে হুবহু মিলিয়ে ভুল ধরা যাবে।
// exports.getUnmatchedPageIds = async (req, res) => {
//   try {
//     const knownPageIds = (await FacebookPage.find().select("pageId")).map((p) => p.pageId);
//     const distinctCommentPageIds = await FacebookComment.distinct("pageId");

//     const unmatched = distinctCommentPageIds.filter((id) => !knownPageIds.includes(id));

//     return res.status(200).json({ unmatchedPageIds: unmatched, knownPageIds });
//   } catch (error) {
//     return res.status(500).json({ message: "চেক করতে ব্যর্থ হয়েছে।" });
//   }
// };

// // --- POST /api/facebook-pages/resync-comment-names (admin only) ---
// // পুরনো কমেন্টগুলোর pageId-ই ভুল সেভ হয়ে থাকতে পারে (entry.id ভুল আসার কারণে), তাই আগে
// // প্রতিটা কমেন্টের সেভ করা postId ("{page_id}_{post_suffix}") থেকে সঠিক pageId recompute করে
// // ঠিক করা হয়, তারপর সেই সঠিক pageId দিয়ে pageName রিফ্রেশ করা হয়।
// exports.resyncCommentPageNames = async (req, res) => {
//   try {
//     const pages = await FacebookPage.find();
//     const pageMap = new Map(pages.map((p) => [p.pageId, p.pageName]));

//     const comments = await FacebookComment.find().select("_id postId pageId pageName");
//     let fixedPageIdCount = 0;
//     let fixedNameCount = 0;

//     for (const comment of comments) {
//       if (!comment.postId || !comment.postId.includes("_")) continue;

//       const correctPageId = comment.postId.split("_")[0];
//       const correctPageName = pageMap.get(correctPageId) || "Unknown Page";

//       const needsPageIdFix = comment.pageId !== correctPageId;
//       const needsNameFix = comment.pageName !== correctPageName;

//       if (needsPageIdFix || needsNameFix) {
//         await FacebookComment.updateOne(
//           { _id: comment._id },
//           { pageId: correctPageId, pageName: correctPageName },
//         );
//         if (needsPageIdFix) fixedPageIdCount += 1;
//         if (needsNameFix) fixedNameCount += 1;
//       }
//     }

//     return res.status(200).json({
//       message: `${fixedPageIdCount}টি কমেন্টের pageId এবং ${fixedNameCount}টির pageName ঠিক করা হয়েছে।`,
//       fixedPageIdCount,
//       fixedNameCount,
//     });
//   } catch (error) {
//     console.error("Resync error:", error);
//     return res.status(500).json({ message: "Resync করতে ব্যর্থ হয়েছে।" });
//   }
// };













const FacebookPage = require("../models/FacebookPage");
const FacebookComment = require("../models/FacebookComment");

function maskToken(token) {
  if (!token || token.length < 10) return "••••••••";
  return `${token.slice(0, 6)}••••••••${token.slice(-4)}`;
}

function toSafePage(page) {
  return {
    _id: page._id,
    pageId: page.pageId,
    pageName: page.pageName,
    isActive: page.isActive,
    maskedToken: maskToken(page.pageAccessToken),
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

// --- GET /api/facebook-pages (admin only) ---
exports.listPages = async (req, res) => {
  try {
    const pages = await FacebookPage.find().sort({ createdAt: -1 });
    return res.status(200).json({ pages: pages.map(toSafePage) });
  } catch (error) {
    return res.status(500).json({ message: "পেজ লিস্ট আনতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/facebook-pages (admin only) ---
exports.createPage = async (req, res) => {
  try {
    const { pageId, pageName, pageAccessToken } = req.body;
    if (!pageId || !pageName || !pageAccessToken) {
      return res
        .status(400)
        .json({ message: "pageId, pageName ও pageAccessToken — তিনটাই আবশ্যক।" });
    }

    const exists = await FacebookPage.findOne({ pageId });
    if (exists) {
      return res.status(409).json({ message: "এই Page ID দিয়ে আগেই একটা এন্ট্রি আছে।" });
    }

    const page = await FacebookPage.create({ pageId, pageName, pageAccessToken });
    return res.status(201).json({ message: "পেজ যোগ করা হয়েছে।", page: toSafePage(page) });
  } catch (error) {
    console.error("Create facebook page error:", error);
    return res.status(500).json({ message: "পেজ যোগ করতে ব্যর্থ হয়েছে।" });
  }
};

// --- PATCH /api/facebook-pages/:id (admin only) --- নাম/টোকেন/সক্রিয়তা আপডেট ---
exports.updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const { pageName, pageAccessToken, isActive } = req.body;

    const update = {};
    if (pageName !== undefined) update.pageName = pageName;
    if (pageAccessToken !== undefined && pageAccessToken.trim() !== "") {
      update.pageAccessToken = pageAccessToken;
    }
    if (isActive !== undefined) update.isActive = isActive;

    const page = await FacebookPage.findByIdAndUpdate(id, update, { new: true });
    if (!page) {
      return res.status(404).json({ message: "পেজ খুঁজে পাওয়া যায়নি।" });
    }

    return res.status(200).json({ message: "আপডেট করা হয়েছে।", page: toSafePage(page) });
  } catch (error) {
    return res.status(500).json({ message: "আপডেট করতে ব্যর্থ হয়েছে।" });
  }
};

// --- DELETE /api/facebook-pages/:id (admin only) ---
exports.deletePage = async (req, res) => {
  try {
    const { id } = req.params;
    const page = await FacebookPage.findByIdAndDelete(id);
    if (!page) {
      return res.status(404).json({ message: "পেজ খুঁজে পাওয়া যায়নি।" });
    }
    return res.status(200).json({ message: "পেজ মুছে ফেলা হয়েছে।" });
  } catch (error) {
    return res.status(500).json({ message: "মুছতে ব্যর্থ হয়েছে।" });
  }
};

// --- GET /api/facebook-pages/unmatched-ids (admin only) ---
// ডায়াগনস্টিক: FacebookComment-এ থাকা কোন pageId গুলো বর্তমান FacebookPage লিস্টের কোনোটার
// সাথে মিলছে না — এটা দেখে dashboard-এ সেভ করা Page ID-র সাথে হুবহু মিলিয়ে ভুল ধরা যাবে।
exports.getUnmatchedPageIds = async (req, res) => {
  try {
    const knownPageIds = (await FacebookPage.find().select("pageId")).map((p) => p.pageId);
    const distinctCommentPageIds = await FacebookComment.distinct("pageId");

    const unmatched = distinctCommentPageIds.filter((id) => !knownPageIds.includes(id));

    return res.status(200).json({ unmatchedPageIds: unmatched, knownPageIds });
  } catch (error) {
    return res.status(500).json({ message: "চেক করতে ব্যর্থ হয়েছে।" });
  }
};

// --- POST /api/facebook-pages/resync-comment-names (admin only) ---
// পুরনো কমেন্টগুলোর pageId-ই ভুল সেভ হয়ে থাকতে পারে (entry.id ভুল আসার কারণে), তাই আগে
// প্রতিটা কমেন্টের সেভ করা postId ("{page_id}_{post_suffix}") থেকে সঠিক pageId recompute করে
// ঠিক করা হয়, তারপর সেই সঠিক pageId দিয়ে pageName রিফ্রেশ করা হয়।
exports.resyncCommentPageNames = async (req, res) => {
  try {
    const pages = await FacebookPage.find();
    const pageMap = new Map(pages.map((p) => [p.pageId, p.pageName]));

    const comments = await FacebookComment.find().select("_id postId pageId pageName");
    let fixedPageIdCount = 0;
    let fixedNameCount = 0;

    for (const comment of comments) {
      if (!comment.postId || !comment.postId.includes("_")) continue;

      const correctPageId = comment.postId.split("_")[0];
      const correctPageName = pageMap.get(correctPageId) || "Unknown Page";

      const needsPageIdFix = comment.pageId !== correctPageId;
      const needsNameFix = comment.pageName !== correctPageName;

      if (needsPageIdFix || needsNameFix) {
        await FacebookComment.updateOne(
          { _id: comment._id },
          { pageId: correctPageId, pageName: correctPageName },
        );
        if (needsPageIdFix) fixedPageIdCount += 1;
        if (needsNameFix) fixedNameCount += 1;
      }
    }

    return res.status(200).json({
      message: `${fixedPageIdCount}টি কমেন্টের pageId এবং ${fixedNameCount}টির pageName ঠিক করা হয়েছে।`,
      fixedPageIdCount,
      fixedNameCount,
    });
  } catch (error) {
    console.error("Resync error:", error);
    return res.status(500).json({ message: "Resync করতে ব্যর্থ হয়েছে।" });
  }
};