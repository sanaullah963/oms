// "use client";
// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { useSocket } from "@/hooks/useSocket";

// import io from 'socket.io-client';

// const FacebookLiveComments = () => {
//     const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/facebook`;
//     const socket = io(process.env.NEXT_PUBLIC_API_URL); // আপনার ব্যাকএন্ড পোর্ট
//   console.log(API_BASE);

// //   const socket = useSocket();
//   const [comments, setComments] = useState([]);
//   const [replyTexts, setReplyTexts] = useState({});
//   const [loading, setLoading] = useState(true); // ডেটা লোডিং স্টেট

//   useEffect(() => {
//     // ১. প্রথমবার পেজ ওপেন করলে ডাটাবেজে থাকা আগের সব কমেন্ট লোড করার ফাংশন
//     const fetchDBComments = async () => {
//       try {
//         const res = await axios.get(`${API_BASE}/comments`);
//         console.log(res.data);
//         if (res.data.success) {
//           setComments(res.data.data);
//         }
//       } catch (err) {
//         console.error("ডাটাবেজ থেকে কমেন্ট লোড করতে ব্যর্থ:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchDBComments();

//     // ২. সকেট থেকে ব্যাকগ্রাউন্ডে আসা রিয়েল-টাইম লাইভ কমেন্ট রিসিভ করা
//     socket.on("new-facebook-comment", (data) => {
//       // যদি লাইভ কমেন্টটি অলরেডি লিস্টে না থাকে, তবেই পুশ করবে (ডুপ্লিকেট প্রোটেকশন)
//       setComments((prevComments) => {
//         const isExist = prevComments.some(
//           (c) => c.commentId === data.commentId,
//         );
//         if (isExist) return prevComments;
//         return [data, ...prevComments];
//       });
//     });

//     return () => {
//       socket.off("new-facebook-comment");
//     };
//   }, []);

//   // কমেন্টের রিপ্লাই দেওয়া (ফেসবুকে)
//   const handleReply = async (commentId) => {
//     const text = replyTexts[commentId];
//     if (!text || !text.trim()) return;

//     try {
//       const res = await axios.post(`${API_BASE}/reply`, {
//         commentId,
//         replyMessage: text,
//       });
//       if (res.data.success) {
//         alert("রিপ্লাই সফলভাবে পাঠানো হয়েছে!");
//         setReplyTexts({ ...replyTexts, [commentId]: "" });
//         setComments(
//           comments.map((c) =>
//             c.commentId === commentId ? { ...c, isReplied: true } : c,
//           ),
//         );
//       }
//     } catch (err) {
//       alert("রিপ্লাই পাঠাতে সমস্যা হয়েছে।");
//     }
//   };

//   // শুধু ফেসবুক পেজ থেকে কমেন্ট ডিলিট করা (ডিবি-তে থাকবে)
//   const handleFacebookDelete = async (commentId) => {
//     if (
//       !window.confirm(
//         "আপনি কি নিশ্চিত যে কমেন্টটি ফেসবুক পেজ থেকে ডিলিট করতে চান? (এটি ডাটাবেজে থেকে যাবে)",
//       )
//     )
//       return;

//     try {
//       const res = await axios.delete(`${API_BASE}/comment/${commentId}`);
//       if (res.data.success) {
//         setComments(
//           comments.map((c) =>
//             c.commentId === commentId ? { ...c, status: "deleted" } : c,
//           ),
//         );
//         alert("ফেসবুক পেজ থেকে কমেন্ট ডিলিট হয়েছে!");
//       }
//     } catch (err) {
//       alert("কমেন্ট ডিলিট করা যায়নি।");
//     }
//   };

//   // একসাথে পেজ থেকে ডিলিট এবং ইউজারকে ব্লক করা (ডিবি-তে থাকবে)
//   const handleBlockAndFacebookDelete = async (commentId, senderId) => {
//     if (!window.confirm("সাবধান! এটি ফেসবুক থেকে কমেন্ট ডিলিট করবে এবং ইউজারকে পেজে ব্লক করবে। নিশ্চিত?")) {
//         return;
//     }

//     try {
//         const res = await axios.post(`${API_BASE}/delete-and-block`, {
//             commentId,
//             senderId,
//         });

//         if (res.data.success) {
//             // ওই নির্দিষ্ট কমেন্ট ডিলিট করা এবং ওই ইউজারের সব কমেন্টকে একসাথে ব্লকড স্টেট দেওয়া
//             setComments((prevComments) =>
//                 prevComments.map((c) => {
//                     // যদি এই নির্দিষ্ট কমেন্টটি হয়, তবে ডিলিট এবং ব্লক দুটোই ট্রু হবে
//                     if (c.commentId === commentId) {
//                         return { ...c, status: "deleted", isUserBlocked: true };
//                     }
//                     // ওই ইউজারের অন্য কোনো কমেন্ট লিস্টে থাকলে সেটিকেও ব্লকড হিসেবে দেখাবে
//                     if (c.senderId === senderId) {
//                         return { ...c, isUserBlocked: true };
//                     }
//                     return c;
//                 })
//             );
//             alert("ইউজারকে ব্লক এবং ফেসবুক থেকে কমেন্ট ডিলিট করা হয়েছে!");
//         }
//     } catch (err) {
//         console.error("Front-end action error:", err);
//         const errorMsg = err.response?.data?.error || "অ্যাকশনটি সম্পন্ন করা যায়নি।";
//         alert(`ভুল: ${errorMsg}`);
//     }
// };

//   // ডাটাবেজ (DB) থেকে চিরতরে কমেন্ট মুছে ফেলার ফাংশন
//   const handleHardDeleteFromDB = async (dbId, commentId) => {
//     if (
//       !window.confirm(
//         "আপনি কি নিশ্চিত যে এই কমেন্টটি ওএমএস ডাটাবেজ থেকে চিরতরে মুছে ফেলতে চান?",
//       )
//     )
//       return;

//     try {
//       const targetId = dbId || commentId;
//       const res = await axios.delete(`${API_BASE}/db-comment/${targetId}`);

//       if (res.data.success) {
//         setComments(
//           comments.filter((c) => c.commentId !== commentId && c._id !== dbId),
//         );
//         alert("ডাটাবেজ থেকে চিরতরে ডিলিট করা হয়েছে!");
//       }
//     } catch (err) {
//       alert("ডাটাবেজ থেকে ডিলিট করা যায়নি।");
//     }
//   };

//   const handleOnlyBlockUser = async (senderId) => {
//     if (!window.confirm("আপনি কি নিশ্চিতভাবে এই ইউজারকে আপনার ফেসবুক পেজ থেকে ব্লক করতে চান?")) {
//         return;
//     }

//     try {
//         // ব্যাকএন্ডের নতুন ডেডিকেটেড রাউটে রিকোয়েস্ট পাঠানো
//         const res = await axios.post(`${API_BASE}/block-user`, {
//             senderId,
//         });

//         if (res.data.success) {
//             // স্টেটে থাকা ওই স্প্যামার ইউজারের সব কমেন্টকে একসাথে ব্লকড হিসেবে মার্ক করা
//             setComments((prevComments) =>
//                 prevComments.map((comment) =>
//                     comment.senderId === senderId
//                         ? { ...comment, isUserBlocked: true }
//                         : comment
//                 )
//             );
//             alert("ইউজারকে সফলভাবে ফেসবুক পেজ থেকে ব্লক করা হয়েছে!");
//         }
//     } catch (err) {
//         console.error("Front-end Block Error:", err);
//         const errorMsg = err.response?.data?.error || "ইউজারকে ব্লক করা সম্ভব হয়নি।";
//         alert(`ভুল: ${errorMsg}`);
//     }
// };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <p className="text-xl font-semibold text-gray-600 animate-pulse">
//           ডাটাবেজ থেকে কমেন্টগুলো লোড হচ্ছে...
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
//       <h1 className="text-2xl font-bold text-blue-600 mb-6 border-b pb-3 flex items-center gap-2">
//         <span className="animate-ping inline-block w-3 h-3 bg-green-500 rounded-full"></span>
//         ফেসবুক লাইভ কমেন্ট ড্যাশবোর্ড (OMS)
//       </h1>

//       {comments.length === 0 ? (
//         <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow-sm border">
//           ডাটাবেজে এবং লাইভে কোনো ফেসবুক কমেন্ট নেই...
//         </div>
//       ) : (
//         <div className="space-y-4">
//           {comments.map((comment) => (
//             <div
//               key={comment._id || comment.commentId}
//               className={`p-5 bg-white rounded-xl shadow-sm border transition hover:shadow-md ${comment.status === "deleted" ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}
//             >
//               {/* ইউজার ডিটেইলস */}
//               <div className="flex justify-between items-center mb-2">
//                 <div className="flex items-center gap-2">
//                   <h3 className="font-semibold text-gray-800 text-lg">
//                     {comment.senderName}
//                   </h3>
//                   {comment.status === "deleted" && (
//                     <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
//                       FB থেকে ডিলিট করা
//                     </span>
//                   )}
//                   {comment.isReplied && (
//                     <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
//                       রিপ্লাইড
//                     </span>
//                   )}
//                 </div>
//                 <span className="text-xs text-gray-400">
//                   {comment.createdAt
//                     ? new Date(comment.createdAt).toLocaleTimeString()
//                     : "Live"}
//                 </span>
//               </div>

//               {/* কমেন্ট টেক্সট */}
//               <p
//                 className={`text-gray-700 bg-gray-100 p-3 rounded-lg mb-4 italic ${comment.status === "deleted" && "line-through text-gray-400"}`}
//               >
//                 "{comment.message}"
//               </p>

//               {/* রিপ্লাই ইনপুট সেকশন */}
//               <div className="flex gap-2 mb-4">
//                 <input
//                   type="text"
//                   placeholder="কমেন্টের রিপ্লাই লিখুন..."
//                   className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
//                   value={replyTexts[comment.commentId] || ""}
//                   onChange={(e) =>
//                     setReplyTexts({
//                       ...replyTexts,
//                       [comment.commentId]: e.target.value,
//                     })
//                   }
//                   disabled={comment.status === "deleted"}
//                 />
//                 <button
//                   onClick={() => handleReply(comment.commentId)}
//                   className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:bg-gray-300"
//                   disabled={comment.status === "deleted"}
//                 >
//                   রিপ্লাই দিন
//                 </button>
//               </div>

//               {/* অ্যাকশন বাটনসমূহ */}
//               <div className="flex justify-between items-center border-t pt-3">
//                 <button
//                   onClick={() =>
//                     handleHardDeleteFromDB(comment._id, comment.commentId)
//                   }
//                   className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-semibold hover:bg-red-800 transition"
//                 >
//                   🗑️ DB থেকে ডিলিট
//                 </button>
//                 <button
//                   onClick={() => handleOnlyBlockUser(comment.senderId)}
//                   disabled={comment.isUserBlocked}
//                   className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-semibold hover:bg-red-800 transition"
//                 >
//                   {comment.isUserBlocked ? " ব্লকড" : "ব্লক করুন"}
//                 </button>

//                 <div className="flex gap-3">
//                   <button
//                     onClick={() => handleFacebookDelete(comment.commentId)}
//                     className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-semibold hover:bg-yellow-600 transition disabled:opacity-50"
//                     disabled={comment.status === "deleted"}
//                   >
//                     শুধু FB থেকে ডিলিট
//                   </button>
//                   <button
//                     onClick={() =>
//                       handleBlockAndFacebookDelete(
//                         comment.commentId,
//                         comment.senderId,
//                       )
//                     }
//                     className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-semibold hover:bg-black transition disabled:opacity-50"
//                     disabled={comment.status === "deleted"}
//                   >
//                     FB ডিলিট ও ইউজার ব্লক
//                   </button>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default FacebookLiveComments;

"use client";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";

const FacebookLiveComments = () => {
  const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/facebook`;
  const socketRef = useRef(null); // ✅ FIX: প্রতি render-এ নতুন socket তৈরি না করে ref ব্যবহার

  const [comments, setComments] = useState([]);
  const [replyTexts, setReplyTexts] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // কোন বাটনে loading চলছে

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Socket + Initial DB Fetch
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    // ✅ FIX: socket একবারই তৈরি হবে
    socketRef.current = io(process.env.NEXT_PUBLIC_API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current.on("connect", () => {
      console.log("🔗 Socket connected:", socketRef.current.id);
    });

    socketRef.current.on("new-facebook-comment", (data) => {
      setComments((prev) => {
        const isExist = prev.some((c) => c.commentId === data.commentId);
        if (isExist) return prev;
        return [data, ...prev];
      });
    });

    // DB থেকে পুরনো কমেন্ট লোড
    const fetchDBComments = async () => {
      try {
        const res = await axios.get(`${API_BASE}/comments`);
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
      socketRef.current?.disconnect();
    };
  }, []);

  // Loading state helper
  const setLoaderFor = (key, value) =>
    setActionLoading((prev) => ({ ...prev, [key]: value }));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // রিপ্লাই দেওয়া
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleReply = async (commentId) => {
    const text = replyTexts[commentId];
    if (!text?.trim()) return alert("রিপ্লাই টেক্সট লিখুন।");

    setLoaderFor(`reply_${commentId}`, true);
    try {
      const res = await axios.post(`${API_BASE}/reply`, {
        commentId,
        replyMessage: text,
      });

      if (res.data.success) {
        alert("✅ রিপ্লাই সফলভাবে পাঠানো হয়েছে!");
        setReplyTexts((prev) => ({ ...prev, [commentId]: "" }));
        setComments((prev) =>
          prev.map((c) =>
            c.commentId === commentId ? { ...c, isReplied: true } : c,
          ),
        );
      }
    } catch (err) {
      const msg = err.response?.data?.error || "রিপ্লাই পাঠাতে সমস্যা।";
      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`reply_${commentId}`, false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // শুধু Facebook থেকে ডিলিট
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleFacebookDelete = async (commentId) => {
    if (!window.confirm("Facebook পেজ থেকে কমেন্ট ডিলিট করবেন? (DB-তে থাকবে)"))
      return;

    setLoaderFor(`del_${commentId}`, true);
    try {
      const res = await axios.delete(`${API_BASE}/comment/${commentId}`);
      if (res.data.success) {
        setComments((prev) =>
          prev.map((c) =>
            c.commentId === commentId ? { ...c, status: "deleted" } : c,
          ),
        );
        alert("✅ Facebook থেকে কমেন্ট ডিলিট হয়েছে!");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "ডিলিট করা যায়নি।";
      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`del_${commentId}`, false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Facebook ডিলিট + ইউজার ব্লক
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleBlockAndFacebookDelete = async (commentId, senderId) => {
    if (
      !window.confirm(
        "এটি Facebook থেকে কমেন্ট ডিলিট করবে এবং ইউজারকে ব্লক করবে। নিশ্চিত?",
      )
    )
      return;

    setLoaderFor(`block_del_${commentId}`, true);
    try {
      const res = await axios.post(`${API_BASE}/delete-and-block`, {
        commentId,
        senderId,
      });

      if (res.data.success) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.commentId === commentId)
              return { ...c, status: "deleted", isUserBlocked: true };
            if (c.senderId === senderId) return { ...c, isUserBlocked: true };
            return c;
          }),
        );
        const r = res.data.results;
        alert(
          `✅ সম্পন্ন!\nব্লক: ${r.blocked ? "হয়েছে" : "হয়নি"}\nডিলিট: ${r.commentDeleted ? "হয়েছে" : "হয়নি"}`,
        );
      }
    } catch (err) {
      const msg = err.response?.data?.error || "অ্যাকশন সম্পন্ন হয়নি।";
      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`block_del_${commentId}`, false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // শুধু ইউজার ব্লক
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleOnlyBlockUser = async (senderId) => {
    if (!window.confirm("এই ইউজারকে Facebook পেজ থেকে ব্লক করবেন?")) return;

    setLoaderFor(`block_${senderId}`, true);
    try {
      const res = await axios.post(`${API_BASE}/block-user`, { senderId });

      if (res.data.success) {
        setComments((prev) =>
          prev.map((c) =>
            c.senderId === senderId ? { ...c, isUserBlocked: true } : c,
          ),
        );
        alert("✅ ইউজারকে সফলভাবে ব্লক করা হয়েছে!");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "ব্লক করা সম্ভব হয়নি।";
      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`block_${senderId}`, false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DB থেকে Hard Delete
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleHardDeleteFromDB = async (dbId, commentId) => {
    // if (
    //   !window.confirm(
    //     "DB থেকে চিরতরে মুছবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।",
    //   )
    // )
    //   return;

    const targetId = dbId || commentId;
    setLoaderFor(`hard_del_${commentId}`, true);
    try {
      const res = await axios.delete(`${API_BASE}/db-comment-delete/${targetId}`);
      if (res.data.success) {
        setComments((prev) =>
          prev.filter((c) => c.commentId !== commentId && c._id !== dbId),
        );
        // alert("✅ DB থেকে চিরতরে ডিলিট হয়েছে!");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "DB থেকে ডিলিট করা যায়নি।";
      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`hard_del_${commentId}`, false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
        <span className="ml-auto text-sm text-gray-400 font-normal">
          মোট: {comments.length}টি
        </span>
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
              className={`p-5 bg-white rounded-xl shadow-sm border transition hover:shadow-md ${
                comment.status === "deleted"
                  ? "border-red-200 bg-red-50/30"
                  : comment.isUserBlocked
                    ? "border-orange-200 bg-orange-50/20"
                    : "border-gray-200"
              }`}
            >
              {/* ইউজার ডিটেইলস */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {comment.senderName}
                  </h3>
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
                  {comment.createdAt
                    ? new Date(comment.createdAt).toLocaleString("bn-BD")
                    : "Live"}
                </span>
              </div>

              {/* কমেন্ট মেসেজ */}
              <p
                className={`text-gray-700 bg-gray-100 p-3 rounded-lg mb-4 ${
                  comment.status === "deleted"
                    ? "line-through text-gray-400 italic"
                    : ""
                }`}
              >
                "{comment.message}"
              </p>

              {/* রিপ্লাই সেকশন */}
              {comment.status !== "deleted" && (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="এই কমেন্টের রিপ্লাই লিখুন..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                    value={replyTexts[comment.commentId] || ""}
                    onChange={(e) =>
                      setReplyTexts((prev) => ({
                        ...prev,
                        [comment.commentId]: e.target.value,
                      }))
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
                    {actionLoading[`reply_${comment.commentId}`]
                      ? "পাঠাচ্ছে..."
                      : "রিপ্লাই দিন"}
                  </button>
                </div>
              )}

              {/* অ্যাকশন বাটন */}
              <div className="flex flex-wrap justify-between items-center gap-2 border-t pt-3">
                {/* DB Hard Delete */}
                <button
                  onClick={() =>
                    handleHardDeleteFromDB(comment._id, comment.commentId)
                  }
                  disabled={actionLoading[`hard_del_${comment.commentId}`]}
                  className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-semibold hover:bg-red-800 transition disabled:opacity-50"
                >
                  {actionLoading[`hard_del_${comment.commentId}`]
                    ? "মুছছে..."
                    : "🗑️ DB থেকে ডিলিট"}
                </button>

                {/* শুধু ব্লক */}
                <button
                  onClick={() => handleOnlyBlockUser(comment.senderId)}
                  disabled={
                    comment.isUserBlocked ||
                    actionLoading[`block_${comment.senderId}`]
                  }
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading[`block_${comment.senderId}`]
                    ? "ব্লক হচ্ছে..."
                    : comment.isUserBlocked
                      ? "🚫 ব্লকড"
                      : "ব্লক করুন"}
                </button>

                <div className="flex gap-2 flex-wrap">
                  {/* শুধু FB ডিলিট */}
                  <button
                    onClick={() => handleFacebookDelete(comment.commentId)}
                    disabled={
                      comment.status === "deleted" ||
                      actionLoading[`del_${comment.commentId}`]
                    }
                    className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-semibold hover:bg-yellow-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {actionLoading[`del_${comment.commentId}`]
                      ? "ডিলিট হচ্ছে..."
                      : "শুধু FB থেকে ডিলিট"}
                  </button>

                  {/* FB ডিলিট + ব্লক */}
                  <button
                    onClick={() =>
                      handleBlockAndFacebookDelete(
                        comment.commentId,
                        comment.senderId,
                      )
                    }
                    disabled={
                      comment.status === "deleted" ||
                      actionLoading[`block_del_${comment.commentId}`]
                    }
                    className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-semibold hover:bg-black transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {actionLoading[`block_del_${comment.commentId}`]
                      ? "প্রসেস হচ্ছে..."
                      : "FB ডিলিট ও ইউজার ব্লক"}
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
