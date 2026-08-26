"use client";
import React, { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { facebookService } from "@/services/facebookService";

const FacebookLiveComments = () => {
  const { socket } = useSocket();
  const [comments, setComments] = useState([]);
  const [replyTexts, setReplyTexts] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // কোন বাটনে loading চলছে

  // --- Socket দিয়ে নতুন কমেন্ট শোনা + DB থেকে পুরনো কমেন্ট লোড ---
  useEffect(() => {
    if (!socket) return;

    const handleNewComment = (data) => {
      setComments((prev) => {
        const isExist = prev.some((c) => c.commentId === data.commentId);
        if (isExist) return prev;
        return [data, ...prev];
      });
    };

    socket.on("new-facebook-comment", handleNewComment);

    const fetchDBComments = async () => {
      try {
        const res = await facebookService.getComments();
        if (res.data.success) setComments(res.data.data);
      } catch (err) {
        console.error("কমেন্ট লোড ব্যর্থ:", err);
        alert("কমেন্ট লোড করা যায়নি। সার্ভার চলছে কিনা দেখুন।");
      } finally {
        setLoading(false);
      }
    };
    fetchDBComments();

    return () => {
      socket.off("new-facebook-comment", handleNewComment);
    };
  }, [socket]);

  const setLoaderFor = (key, value) =>
    setActionLoading((prev) => ({ ...prev, [key]: value }));

  // --- DB থেকে চিরতরে ডিলিট ---
  const handleHardDeleteFromDB = async (dbId, commentId) => {
    const targetId = dbId || commentId;
    setLoaderFor(`hard_del_${commentId}`, true);
    try {
      const res = await facebookService.hardDeleteFromDb(targetId);
      if (res.data.success) {
        setComments((prev) => prev.filter((c) => c.commentId !== commentId && c._id !== dbId));
      }
    } catch (err) {
      const msg = err.response?.data?.error || "DB থেকে ডিলিট করা যায়নি।";
      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`hard_del_${commentId}`, false);
    }
  };

  // --- রিপ্লাই দেওয়া ---
  const handleReply = async (commentId) => {
    const text = replyTexts[commentId];
    if (!text?.trim()) return alert("রিপ্লাই টেক্সট লিখুন।");

    setLoaderFor(`reply_${commentId}`, true);
    try {
      const res = await facebookService.reply(commentId, text);
      if (res.data.success) {
        alert("✅ রিপ্লাই সফলভাবে পাঠানো হয়েছে!");
        setReplyTexts((prev) => ({ ...prev, [commentId]: "" }));
        setComments((prev) =>
          prev.map((c) => (c.commentId === commentId ? { ...c, isReplied: true } : c)),
        );
      }
    } catch (err) {
      const msg = err.response?.data?.message || "রিপ্লাই পাঠাতে সমস্যা।";
      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`reply_${commentId}`, false);
    }
  };

  // --- শুধু Facebook থেকে ডিলিট ---
  const handleFacebookDelete = async (commentId) => {
    setLoaderFor(`del_${commentId}`, true);
    try {
      const res = await facebookService.deleteFromFacebook(commentId);
      if (res.data.success) {
        setComments((prev) =>
          prev.map((c) => (c.commentId === commentId ? { ...c, status: "deleted" } : c)),
        );
        alert("✅ Facebook থেকে কমেন্ট ডিলিট হয়েছে!");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "ডিলিট করা যায়নি।";
      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`del_${commentId}`, false);
    }
  };

  // --- Facebook ডিলিট + ইউজার ব্লক ---
  const handleBlockAndFacebookDelete = async (commentId, senderId) => {
    setLoaderFor(`block_del_${commentId}`, true);
    try {
      const res = await facebookService.deleteAndBlock(commentId, senderId);
      if (res.data.success) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.commentId === commentId) return { ...c, status: "deleted", isUserBlocked: true };
            if (c.senderId === senderId) return { ...c, isUserBlocked: true };
            return c;
          }),
        );
        const r = res.data.results;
        alert(
          `✅ ব্লক: ${r.blocked ? "✅" : "❌"}\nডিলিট: ${r.commentDeleted ? "✅" : "❌"}`,
        );
      }
    } catch (err) {
      const msg = err.response?.data?.error || "অ্যাকশন সম্পন্ন হয়নি।";
      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`block_del_${commentId}`, false);
    }
  };

  // --- শুধু ইউজার ব্লক ---
  const handleOnlyBlockUser = async (senderId, commentId) => {
    setLoaderFor(`block_${senderId}`, true);
    try {
      const res = await facebookService.blockUser(senderId, commentId);
      if (res.data.success) {
        setComments((prev) =>
          prev.map((c) => (c.senderId === senderId ? { ...c, isUserBlocked: true } : c)),
        );
        alert("✅ ইউজারকে সফলভাবে ব্লক করা হয়েছে!");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "ব্লক করা সম্ভব হয়নি।";
      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`block_${senderId}`, false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl font-semibold text-gray-600 animate-pulse">
          ডাটাবেজ থেকে কমেন্টগুলো লোড হচ্ছে...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 py-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-blue-600 mb-6 border-b pb-3 flex items-center gap-2">
        <span className="animate-ping inline-block w-3 h-3 bg-green-500 rounded-full"></span>
        Ms beauty
        <span className="ml-auto text-sm text-gray-400 font-normal">মোট: {comments.length}টি</span>
      </h1>

      {comments.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow-sm border">
          এখনো কোনো কমেন্ট নেই...
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment._id || comment.commentId}
              className={`p-2 bg-gray-200 rounded-md shadow-sm border transition hover:shadow-md ${
                comment.status === "deleted"
                  ? "border-red-200 bg-red-50/30"
                  : comment.isUserBlocked
                    ? "border-orange-200 bg-orange-50/20"
                    : "border-gray-200"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-800 text-lg">{comment.senderName}</h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    📄 {comment?.pageName }
                  </span>
                  {comment.status === "deleted" && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                      FB থেকে ডিলিট
                    </span>
                  )}
                  {comment.isUserBlocked && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                      🚫 ব্লকড
                    </span>
                  )}
                  {comment.isReplied && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
                      ✅ রিপ্লাইড
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {comment.createdAt ? new Date(comment.createdAt).toLocaleString("bn-BD") : "Live"}
                </span>
              </div>

              {comment.pageName === "Unknown Page" && (
                <div className="text-[11px] bg-gray-900 text-green-300 font-mono rounded-md px-2 py-1.5 mb-2 overflow-x-auto">
                  🔍 pageId(সেভড): {comment.pageId || "-"} | entry.id: {comment.debugRawEntryId || "-"} | post_id: {comment.debugRawPostId || "-"} | post_id প্রিফিক্স: {comment.debugPostIdPrefix || "-"}
                </div>
              )}

              <p
                className={`text-gray-700 bg-gray-100 p-3 rounded-lg mb-4 ${
                  comment.status === "deleted" ? "line-through text-gray-400 italic" : ""
                }`}
              >
                "{comment.message}"
              </p>

              {comment.status !== "deleted" && (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="এই কমেন্টের রিপ্লাই লিখুন..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                    value={replyTexts[comment.commentId] || ""}
                    onChange={(e) =>
                      setReplyTexts((prev) => ({ ...prev, [comment.commentId]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleReply(comment.commentId);
                    }}
                  />
                  <button
                    onClick={() => handleReply(comment.commentId)}
                    disabled={actionLoading[`reply_${comment.commentId}`]}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {actionLoading[`reply_${comment.commentId}`] ? "sending..." : "Reply"}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap justify-between items-center gap-2 border-t pt-3">
                <button
                  onClick={() => handleHardDeleteFromDB(comment._id, comment.commentId)}
                  disabled={actionLoading[`hard_del_${comment.commentId}`]}
                  className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-semibold hover:bg-red-800 transition disabled:opacity-50"
                >
                  {actionLoading[`hard_del_${comment.commentId}`] ? "মুছছে..." : "🗑️ DB থেকে ডিলিট"}
                </button>

                <button
                  onClick={() => handleOnlyBlockUser(comment.senderId, comment.commentId)}
                  disabled={comment.isUserBlocked || actionLoading[`block_${comment.senderId}`]}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading[`block_${comment.senderId}`]
                    ? "ব্লক হচ্ছে..."
                    : comment.isUserBlocked
                      ? "🚫 ব্লকড"
                      : "ব্লক করুন"}
                </button>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleFacebookDelete(comment.commentId)}
                    disabled={comment.status === "deleted" || actionLoading[`del_${comment.commentId}`]}
                    className="coursor-pointer px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-semibold hover:bg-yellow-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {actionLoading[`del_${comment.commentId}`] ? "ডিলিট হচ্ছে..." : "শুধু FB থেকে ডিলিট"}
                  </button>

                  <button
                    onClick={() => handleBlockAndFacebookDelete(comment.commentId, comment.senderId)}
                    disabled={
                      comment.status === "deleted" || actionLoading[`block_del_${comment.commentId}`]
                    }
                    className="coursor-pointer hover:bg-gray-600 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-semibold  transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {actionLoading[`block_del_${comment.commentId}`] ? "প্রসেস হচ্ছে..." : "FB ডিলিট ও ইউজার ব্লক"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default FacebookLiveComments;