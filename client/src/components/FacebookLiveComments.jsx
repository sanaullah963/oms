"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSocket } from "@/hooks/useSocket";

import io from 'socket.io-client';

const FacebookLiveComments = () => {
    const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/facebook`;
    const socket = io(process.env.NEXT_PUBLIC_API_URL); // আপনার ব্যাকএন্ড পোর্ট
  console.log(API_BASE);

//   const socket = useSocket();
  const [comments, setComments] = useState([]);
  const [replyTexts, setReplyTexts] = useState({});
  const [loading, setLoading] = useState(true); // ডেটা লোডিং স্টেট

  useEffect(() => {
    // ১. প্রথমবার পেজ ওপেন করলে ডাটাবেজে থাকা আগের সব কমেন্ট লোড করার ফাংশন
    const fetchDBComments = async () => {
      try {
        const res = await axios.get(`${API_BASE}/comments`);
        console.log(res.data);
        if (res.data.success) {
          setComments(res.data.data);
        }
      } catch (err) {
        console.error("ডাটাবেজ থেকে কমেন্ট লোড করতে ব্যর্থ:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDBComments();

    // ২. সকেট থেকে ব্যাকগ্রাউন্ডে আসা রিয়েল-টাইম লাইভ কমেন্ট রিসিভ করা
    socket.on("new-facebook-comment", (data) => {
      // যদি লাইভ কমেন্টটি অলরেডি লিস্টে না থাকে, তবেই পুশ করবে (ডুপ্লিকেট প্রোটেকশন)
      setComments((prevComments) => {
        const isExist = prevComments.some(
          (c) => c.commentId === data.commentId,
        );
        if (isExist) return prevComments;
        return [data, ...prevComments];
      });
    });

    return () => {
      socket.off("new-facebook-comment");
    };
  }, []);

  // কমেন্টের রিপ্লাই দেওয়া (ফেসবুকে)
  const handleReply = async (commentId) => {
    const text = replyTexts[commentId];
    if (!text || !text.trim()) return;

    try {
      const res = await axios.post(`${API_BASE}/reply`, {
        commentId,
        replyMessage: text,
      });
      if (res.data.success) {
        alert("রিপ্লাই সফলভাবে পাঠানো হয়েছে!");
        setReplyTexts({ ...replyTexts, [commentId]: "" });
        setComments(
          comments.map((c) =>
            c.commentId === commentId ? { ...c, isReplied: true } : c,
          ),
        );
      }
    } catch (err) {
      alert("রিপ্লাই পাঠাতে সমস্যা হয়েছে।");
    }
  };

  // শুধু ফেসবুক পেজ থেকে কমেন্ট ডিলিট করা (ডিবি-তে থাকবে)
  const handleFacebookDelete = async (commentId) => {
    if (
      !window.confirm(
        "আপনি কি নিশ্চিত যে কমেন্টটি ফেসবুক পেজ থেকে ডিলিট করতে চান? (এটি ডাটাবেজে থেকে যাবে)",
      )
    )
      return;

    try {
      const res = await axios.delete(`${API_BASE}/comment/${commentId}`);
      if (res.data.success) {
        setComments(
          comments.map((c) =>
            c.commentId === commentId ? { ...c, status: "deleted" } : c,
          ),
        );
        alert("ফেসবুক পেজ থেকে কমেন্ট ডিলিট হয়েছে!");
      }
    } catch (err) {
      alert("কমেন্ট ডিলিট করা যায়নি।");
    }
  };

  // একসাথে পেজ থেকে ডিলিট এবং ইউজারকে ব্লক করা (ডিবি-তে থাকবে)
  const handleBlockAndFacebookDelete = async (commentId, senderId) => {
    if (
      !window.confirm(
        "সাবধান! এটি ফেসবুক থেকে কমেন্ট ডিলিট করবে এবং ইউজারকে পেজে ব্লক করবে। নিশ্চিত?",
      )
    )
      return;

    try {
      const res = await axios.post(`${API_BASE}/block-user`, {
        commentId,
        senderId,
      });
      if (res.data.success) {
        setComments(
          comments.map((c) =>
            c.commentId === commentId
              ? { ...c, status: "deleted", isUserBlocked: true }
              : c,
          ),
        );
        alert("ইউজারকে ব্লক এবং ফেসবুক থেকে কমেন্ট ডিলিট করা হয়েছে!");
      }
    } catch (err) {
      alert("অ্যাকশনটি সম্পন্ন করা যায়নি।");
    }
  };

  // ডাটাবেজ (DB) থেকে চিরতরে কমেন্ট মুছে ফেলার ফাংশন
  const handleHardDeleteFromDB = async (dbId, commentId) => {
    if (
      !window.confirm(
        "আপনি কি নিশ্চিত যে এই কমেন্টটি ওএমএস ডাটাবেজ থেকে চিরতরে মুছে ফেলতে চান?",
      )
    )
      return;

    try {
      const targetId = dbId || commentId;
      const res = await axios.delete(`${API_BASE}/db-comment/${targetId}`);

      if (res.data.success) {
        setComments(
          comments.filter((c) => c.commentId !== commentId && c._id !== dbId),
        );
        alert("ডাটাবেজ থেকে চিরতরে ডিলিট করা হয়েছে!");
      }
    } catch (err) {
      alert("ডাটাবেজ থেকে ডিলিট করা যায়নি।");
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
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-blue-600 mb-6 border-b pb-3 flex items-center gap-2">
        <span className="animate-ping inline-block w-3 h-3 bg-green-500 rounded-full"></span>
        ফেসবুক লাইভ কমেন্ট ড্যাশবোর্ড (OMS)
      </h1>

      {comments.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow-sm border">
          ডাটাবেজে এবং লাইভে কোনো ফেসবুক কমেন্ট নেই...
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment._id || comment.commentId}
              className={`p-5 bg-white rounded-xl shadow-sm border transition hover:shadow-md ${comment.status === "deleted" ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}
            >
              {/* ইউজার ডিটেইলস */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {comment.senderName}
                  </h3>
                  {comment.status === "deleted" && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                      FB থেকে ডিলিট করা
                    </span>
                  )}
                  {comment.isReplied && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
                      রিপ্লাইড
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {comment.createdAt
                    ? new Date(comment.createdAt).toLocaleTimeString()
                    : "Live"}
                </span>
              </div>

              {/* কমেন্ট টেক্সট */}
              <p
                className={`text-gray-700 bg-gray-100 p-3 rounded-lg mb-4 italic ${comment.status === "deleted" && "line-through text-gray-400"}`}
              >
                "{comment.message}"
              </p>

              {/* রিপ্লাই ইনপুট সেকশন */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="কমেন্টের রিপ্লাই লিখুন..."
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  value={replyTexts[comment.commentId] || ""}
                  onChange={(e) =>
                    setReplyTexts({
                      ...replyTexts,
                      [comment.commentId]: e.target.value,
                    })
                  }
                  disabled={comment.status === "deleted"}
                />
                <button
                  onClick={() => handleReply(comment.commentId)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:bg-gray-300"
                  disabled={comment.status === "deleted"}
                >
                  রিপ্লাই দিন
                </button>
              </div>

              {/* অ্যাকশন বাটনসমূহ */}
              <div className="flex justify-between items-center border-t pt-3">
                <button
                  onClick={() =>
                    handleHardDeleteFromDB(comment._id, comment.commentId)
                  }
                  className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-semibold hover:bg-red-800 transition"
                >
                  🗑️ DB থেকে ডিলিট
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleFacebookDelete(comment.commentId)}
                    className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-semibold hover:bg-yellow-600 transition disabled:opacity-50"
                    disabled={comment.status === "deleted"}
                  >
                    শুধু FB থেকে ডিলিট
                  </button>
                  <button
                    onClick={() =>
                      handleBlockAndFacebookDelete(
                        comment.commentId,
                        comment.senderId,
                      )
                    }
                    className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-semibold hover:bg-black transition disabled:opacity-50"
                    disabled={comment.status === "deleted"}
                  >
                    FB ডিলিট ও ইউজার ব্লক
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
