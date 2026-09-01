"use client";

import React, { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { facebookService } from "@/services/facebookService";

const FacebookLiveComments = () => {
  const { socket } = useSocket();

  const [comments, setComments] = useState([]);
  const [replyTexts, setReplyTexts] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

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

        if (res.data.success) {
          setComments(res.data.data);
        }
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
    setActionLoading((prev) => ({
      ...prev,
      [key]: value,
    }));

  // DB থেকে ডিলিট
  const handleHardDeleteFromDB = async (dbId, commentId) => {
    const targetId = dbId || commentId;

    setLoaderFor(`hard_del_${commentId}`, true);

    try {
      const res = await facebookService.hardDeleteFromDb(targetId);

      if (res.data.success) {
        setComments((prev) =>
          prev.filter((c) => c.commentId !== commentId && c._id !== dbId),
        );
      }
    } catch (err) {
      const msg = err.response?.data?.error || "DB থেকে ডিলিট করা যায়নি।";

      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`hard_del_${commentId}`, false);
    }
  };

  // Reply
  const handleReply = async (commentId) => {
    const text = replyTexts[commentId];

    if (!text?.trim()) {
      return alert("রিপ্লাই টেক্সট লিখুন।");
    }

    setLoaderFor(`reply_${commentId}`, true);

    try {
      const res = await facebookService.reply(commentId, text);

      if (res.data.success) {
        alert("✅ রিপ্লাই সফলভাবে পাঠানো হয়েছে!");

        setReplyTexts((prev) => ({
          ...prev,
          [commentId]: "",
        }));

        setComments((prev) =>
          prev.map((c) =>
            c.commentId === commentId
              ? {
                  ...c,
                  isReplied: true,
                }
              : c,
          ),
        );
      }
    } catch (err) {
      const msg = err.response?.data?.message || "রিপ্লাই পাঠাতে সমস্যা।";

      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`reply_${commentId}`, false);
    }
  };

  // Facebook থেকে Delete
  const handleFacebookDelete = async (commentId) => {
    setLoaderFor(`del_${commentId}`, true);

    try {
      const res = await facebookService.deleteFromFacebook(commentId);

      if (res.data.success) {
        setComments((prev) =>
          prev.map((c) =>
            c.commentId === commentId
              ? {
                  ...c,
                  status: "deleted",
                }
              : c,
          ),
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

  // Facebook Delete + Block
  const handleBlockAndFacebookDelete = async (commentId, senderId) => {
    setLoaderFor(`block_del_${commentId}`, true);

    try {
      const res = await facebookService.deleteAndBlock(commentId, senderId);

      if (res.data.success) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.commentId === commentId) {
              return {
                ...c,
                status: "deleted",
                isUserBlocked: true,
              };
            }

            if (c.senderId === senderId) {
              return {
                ...c,
                isUserBlocked: true,
              };
            }

            return c;
          }),
        );

        const r = res.data.results;

        alert(
          `✅ ব্লক: ${r.blocked ? "✅" : "❌"}\nডিলিট: ${
            r.commentDeleted ? "✅" : "❌"
          }`,
        );
      }
    } catch (err) {
      const msg = err.response?.data?.error || "অ্যাকশন সম্পন্ন হয়নি।";

      alert(`❌ ${msg}`);
    } finally {
      setLoaderFor(`block_del_${commentId}`, false);
    }
  };

  // শুধু Block
  const handleOnlyBlockUser = async (senderId, commentId) => {
    setLoaderFor(`block_${senderId}`, true);

    try {
      const res = await facebookService.blockUser(senderId, commentId);

      if (res.data.success) {
        setComments((prev) =>
          prev.map((c) =>
            c.senderId === senderId
              ? {
                  ...c,
                  isUserBlocked: true,
                }
              : c,
          ),
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

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <p className="text-sm font-medium text-gray-500">
            ডাটাবেজ থেকে কমেন্টগুলো লোড হচ্ছে...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h8M8 14h5m-9 5l2.5-2.5A2 2 0 018.914 16H17a4 4 0 004-4V8a4 4 0 00-4-4H7a4 4 0 00-4 4v4a4 4 0 001 2.732V19z"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-800">
                Facebook Comments
              </h1>

              <p className="text-xs text-slate-400">Live comment management</p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-100 px-3 py-2 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Total
            </p>

            <p className="text-lg font-bold text-slate-700">
              {comments.length}
            </p>
          </div>
        </div>

        {comments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
              💬
            </div>

            <p className="font-medium text-slate-600">এখনো কোনো কমেন্ট নেই</p>

            <p className="mt-1 text-xs text-slate-400">
              নতুন Facebook comment এখানে দেখা যাবে।
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment, index) => {
              const isDeleted = comment.status === "deleted";

              const isBlocked = comment.isUserBlocked;

              const isReplied = comment.isReplied;

              // return (
              //   <div
              //     key={comment._id || comment.commentId}
              //     className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
              //       isDeleted
              //         ? "border-red-200"
              //         : isBlocked
              //           ? "border-orange-200"
              //           : "border-slate-200"
              //     }`}
              //   >
              //     {/* Top Header */}
              //     <div className="border-b border-slate-100 px-4 py-3">
              //       <div className="flex flex-wrap items-center gap-2">
              //         {/* Serial */}
              //         <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-bold text-slate-500">
              //           #{String(index + 1).padStart(2, "0")}
              //         </span>

              //         {/* Page Name */}
              //         <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1">
              //           <svg
              //             className="h-3.5 w-3.5 text-blue-600"
              //             fill="currentColor"
              //             viewBox="0 0 24 24"
              //           >
              //             <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.926-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              //           </svg>

              //           <span className="text-xs font-semibold text-blue-700">
              //             {comment.pageName || "Unknown Page"}
              //           </span>
              //         </div>

              //         {/* Actions Already Taken */}
              //         <div className="flex flex-wrap items-center gap-1.5">
              //           {isReplied && (
              //             <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              //               <span>✓</span>
              //               Replied
              //             </span>
              //           )}

              //           {isDeleted && (
              //             <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
              //               <span>✓</span>
              //               FB Deleted
              //             </span>
              //           )}

              //           {isBlocked && (
              //             <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
              //               <span>✓</span>
              //               Blocked
              //             </span>
              //           )}

              //           {!isReplied && !isDeleted && !isBlocked && (
              //             <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-400">
              //               No action yet
              //             </span>
              //           )}
              //         </div>

              //         {/* Time */}
              //         <span className="ml-auto text-[11px] font-medium text-slate-400">
              //           {comment.createdAt
              //             ? new Date(comment.createdAt).toLocaleString(
              //                 "bn-BD",
              //                 {
              //                   dateStyle: "short",
              //                   timeStyle: "short",
              //                 },
              //               )
              //             : "Live"}
              //         </span>
              //       </div>
              //     </div>

              //     {/* Content */}
              //     <div className="px-4 py-4">
              //       {/* Customer */}
              //       <div className="mb-2 flex items-center gap-2">
              //         <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
              //           {comment.senderName?.charAt(0)?.toUpperCase() || "U"}
              //         </div>

              //         <div className="min-w-0">
              //           <h3 className="truncate text-sm font-bold text-slate-800">
              //             {comment.senderName || "Unknown Customer"}
              //           </h3>

              //           <p className="text-[10px] text-slate-400">
              //             Facebook User
              //           </p>
              //         </div>
              //       </div>

              //       {/* Unknown Page Debug */}
              //       {comment.pageName === "Unknown Page" && (
              //         <div className="mb-3 overflow-x-auto rounded-xl bg-slate-900 px-3 py-2 font-mono text-[10px] text-green-300">
              //           pageId: {comment.pageId || "-"} | entry.id:{" "}
              //           {comment.debugRawEntryId || "-"} | post_id:{" "}
              //           {comment.debugRawPostId || "-"} | prefix:{" "}
              //           {comment.debugPostIdPrefix || "-"}
              //         </div>
              //       )}

              //       {/* Comment */}
              //       <div
              //         className={`rounded-xl border px-4 py-3 ${
              //           isDeleted
              //             ? "border-red-100 bg-red-50/50"
              //             : "border-slate-100 bg-slate-50"
              //         }`}
              //       >
              //         <p
              //           className={`text-sm leading-6 ${
              //             isDeleted
              //               ? "italic text-slate-400 line-through"
              //               : "text-slate-700"
              //           }`}
              //         >
              //           {comment.message
              //             ? `"${comment.message}"`
              //             : "No comment text"}
              //         </p>
              //       </div>

              //       {/* Reply */}
              //       {!isDeleted && (
              //         <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              //           <input
              //             type="text"
              //             placeholder="এই কমেন্টের রিপ্লাই লিখুন..."
              //             value={replyTexts[comment.commentId] || ""}
              //             onChange={(e) =>
              //               setReplyTexts((prev) => ({
              //                 ...prev,
              //                 [comment.commentId]: e.target.value,
              //               }))
              //             }
              //             onKeyDown={(e) => {
              //               if (e.key === "Enter") {
              //                 handleReply(comment.commentId);
              //               }
              //             }}
              //             className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              //           />

              //           <button
              //             onClick={() => handleReply(comment.commentId)}
              //             disabled={actionLoading[`reply_${comment.commentId}`]}
              //             className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              //           >
              //             {actionLoading[`reply_${comment.commentId}`] ? (
              //               <>
              //                 <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              //                 Sending...
              //               </>
              //             ) : (
              //               <>
              //                 <span>↩</span>
              //                 Reply
              //               </>
              //             )}
              //           </button>
              //         </div>
              //       )}
              //     </div>

              //     {/* Action Bar */}
              //     <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
              //       <div className="flex flex-wrap gap-2">
              //         {/* DB Delete */}
              //         <button
              //           onClick={() =>
              //             handleHardDeleteFromDB(comment._id, comment.commentId)
              //           }
              //           disabled={
              //             actionLoading[`hard_del_${comment.commentId}`]
              //           }
              //           className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              //         >
              //           {actionLoading[`hard_del_${comment.commentId}`] ? (
              //             "মুছছে..."
              //           ) : (
              //             <>
              //               <span>🗑</span>
              //               DB Delete
              //             </>
              //           )}
              //         </button>

              //         {/* Facebook Delete */}
              //         <button
              //           onClick={() => handleFacebookDelete(comment.commentId)}
              //           disabled={
              //             isDeleted || actionLoading[`del_${comment.commentId}`]
              //           }
              //           className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
              //         >
              //           {actionLoading[`del_${comment.commentId}`] ? (
              //             "ডিলিট হচ্ছে..."
              //           ) : (
              //             <>
              //               <span>🗑</span>
              //               FB Delete
              //             </>
              //           )}
              //         </button>

              //         {/* Block */}
              //         <button
              //           onClick={() =>
              //             handleOnlyBlockUser(
              //               comment.senderId,
              //               comment.commentId,
              //             )
              //           }
              //           disabled={
              //             isBlocked ||
              //             actionLoading[`block_${comment.senderId}`]
              //           }
              //           className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-white px-3 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
              //         >
              //           {actionLoading[`block_${comment.senderId}`] ? (
              //             "ব্লক হচ্ছে..."
              //           ) : (
              //             <>
              //               <span>🚫</span>
              //               {isBlocked ? "Blocked" : "Block User"}
              //             </>
              //           )}
              //         </button>

              //         {/* Delete + Block */}
              //         <button
              //           onClick={() =>
              //             handleBlockAndFacebookDelete(
              //               comment.commentId,
              //               comment.senderId,
              //             )
              //           }
              //           disabled={
              //             isDeleted ||
              //             actionLoading[`block_del_${comment.commentId}`]
              //           }
              //           className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 text-xs font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              //         >
              //           {actionLoading[`block_del_${comment.commentId}`] ? (
              //             "প্রসেস হচ্ছে..."
              //           ) : (
              //             <>
              //               <span>🚫</span>
              //               Delete & Block
              //             </>
              //           )}
              //         </button>
              //       </div>
              //     </div>
              //   </div>
              // );

              return (
                <div
                  key={comment._id || comment.commentId}
                  className={`
    group relative overflow-hidden rounded-2xl border bg-white
    shadow-sm transition-all duration-200
    hover:-translate-y-[1px] hover:shadow-lg
    ${
      isDeleted
        ? "border-red-200"
        : isBlocked
          ? "border-orange-200"
          : isReplied
            ? "border-emerald-200"
            : "border-indigo-100"
    }
  `}
                >
                  {/* Colored left accent */}
                  <div
                    className={`
      absolute left-0 top-0 h-full w-1
      ${
        isDeleted
          ? "bg-gradient-to-b from-red-400 to-rose-600"
          : isBlocked
            ? "bg-gradient-to-b from-orange-400 to-amber-500"
            : isReplied
              ? "bg-gradient-to-b from-emerald-400 to-green-600"
              : "bg-gradient-to-b from-blue-400 via-indigo-500 to-purple-500"
      }
    `}
                  />

                  {/* ================= HEADER ================= */}
                  <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/40 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Serial */}
                      <span
                        className="
          flex h-8 min-w-8 items-center justify-center
          rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600
          px-2 text-xs font-bold text-white
          shadow-sm shadow-indigo-200
        "
                      >
                        #{String(index + 1).padStart(2, "0")}
                      </span>

                      {/* Facebook Page */}
                      <div
                        className="
          inline-flex items-center gap-1.5
          rounded-lg border border-blue-100
          bg-blue-50 px-2.5 py-1.5
        "
                      >
                        <div
                          className="
            flex h-5 w-5 items-center justify-center
            rounded-md bg-blue-600
            text-[10px] font-bold text-white
          "
                        >
                          f
                        </div>

                        <span className="text-xs font-bold text-blue-700">
                          {comment.pageName || "Unknown Page"}
                        </span>
                      </div>

                      {/* Statuses */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isReplied && (
                          <span
                            className="
              inline-flex items-center gap-1
              rounded-full border border-emerald-200
              bg-gradient-to-r from-emerald-50 to-green-50
              px-2.5 py-1
              text-[11px] font-bold text-emerald-700
            "
                          >
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">
                              ✓
                            </span>
                            Replied
                          </span>
                        )}

                        {isDeleted && (
                          <span
                            className="
              inline-flex items-center gap-1
              rounded-full border border-red-200
              bg-gradient-to-r from-red-50 to-rose-50
              px-2.5 py-1
              text-[11px] font-bold text-red-600
            "
                          >
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">
                              ✓
                            </span>
                            FB Deleted
                          </span>
                        )}

                        {isBlocked && (
                          <span
                            className="
              inline-flex items-center gap-1
              rounded-full border border-orange-200
              bg-gradient-to-r from-orange-50 to-amber-50
              px-2.5 py-1
              text-[11px] font-bold text-orange-600
            "
                          >
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] text-white">
                              ✓
                            </span>
                            Blocked
                          </span>
                        )}

                        {!isReplied && !isDeleted && !isBlocked && (
                          <span
                            className="
              rounded-full border border-slate-200
              bg-slate-50 px-2.5 py-1
              text-[11px] font-medium text-slate-400
            "
                          >
                            No action yet
                          </span>
                        )}
                      </div>

                      {/* Time */}
                      <span
                        className="
          ml-auto rounded-lg bg-white/80
          px-2 py-1 text-[10px] font-medium
          text-slate-400 shadow-sm
        "
                      >
                        {comment.createdAt
                          ? new Date(comment.createdAt).toLocaleString(
                              "bn-BD",
                              {
                                dateStyle: "short",
                                timeStyle: "short",
                              },
                            )
                          : "Live"}
                      </span>
                    </div>
                  </div>

                  {/* ================= CONTENT ================= */}
                  <div className="px-4 py-4">
                    {/* Customer */}
                    <div className="mb-3 flex items-center gap-2.5">
                      {/* Avatar */}
                      <div
                        className="
          flex h-10 w-10 shrink-0 items-center justify-center
          rounded-xl
          bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500
          text-sm font-bold text-white
          shadow-md shadow-indigo-200
        "
                      >
                        {comment.senderName?.charAt(0)?.toUpperCase() || "U"}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-800">
                          {comment.senderName || "Unknown Customer"}
                        </h3>

                        <div className="mt-0.5 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                          <p className="text-[10px] font-medium text-slate-400">
                            Facebook User
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Comment */}
                    <div
                      className={`
        relative overflow-hidden rounded-xl border px-4 py-3.5
        ${
          isDeleted
            ? "border-red-100 bg-gradient-to-br from-red-50 to-rose-50/40"
            : "border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-white"
        }
      `}
                    >
                      {/* Quote decoration */}
                      <div
                        className="
          absolute -right-2 -top-5
          text-7xl font-serif font-bold
          text-indigo-100/70
        "
                      >
                        ”
                      </div>

                      <p
                        className={`
          relative z-10 text-sm leading-6
          ${
            isDeleted
              ? "italic text-slate-400 line-through"
              : "font-medium text-slate-700"
          }
        `}
                      >
                        {comment.message
                          ? `"${comment.message}"`
                          : "No comment text"}
                      </p>
                    </div>

                    {/* Reply */}
                    {!isDeleted && (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          placeholder="এই কমেন্টের রিপ্লাই লিখুন..."
                          value={replyTexts[comment.commentId] || ""}
                          onChange={(e) =>
                            setReplyTexts((prev) => ({
                              ...prev,
                              [comment.commentId]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleReply(comment.commentId);
                            }
                          }}
                          className="            h-10 min-w-0 flex-1 rounded-xl
           border border-indigo-100
            bg-indigo-50/30 px-3
            text-sm text-slate-700
            outline-none transition-all
            placeholder:text-slate-400
            focus:border-indigo-400
            focus:bg-white
            focus:ring-4 focus:ring-indigo-100
          "
                        />

                        <button
                          onClick={() => handleReply(comment.commentId)}
                          disabled={actionLoading[`reply_${comment.commentId}`]}
                          className="
            inline-flex h-10 items-center justify-center
            gap-2 rounded-xl
            bg-gradient-to-r from-blue-600 to-indigo-600
            px-5 text-sm font-bold text-white
            shadow-md shadow-indigo-200
            transition-all
            hover:-translate-y-0.5
            hover:from-blue-700 hover:to-indigo-700
            hover:shadow-lg
            disabled:cursor-not-allowed
            disabled:bg-slate-300
            disabled:shadow-none
          "
                        >
                          {actionLoading[`reply_${comment.commentId}`] ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <span className="text-base">↩</span>
                              Reply
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ================= ACTION BAR ================= */}
                  <div
                    className="
      border-t border-slate-100
      bg-gradient-to-r from-slate-50 via-white to-slate-50
      px-4 py-3
    "
                  >
                    <div className="flex flex-wrap gap-2">
                      {/* DB Delete */}
                      <button
                        onClick={() =>
                          handleHardDeleteFromDB(comment._id, comment.commentId)
                        }
                        disabled={
                          actionLoading[`hard_del_${comment.commentId}`]
                        }
                        className="
          inline-flex h-9 items-center justify-center gap-1.5
          rounded-lg border border-red-200
          bg-red-50/60 px-3
          text-xs font-bold text-red-600
          transition-all
          hover:border-red-300
          hover:bg-red-100
          disabled:opacity-40
        "
                      >
                        <span>🗑</span>
                        DB Delete
                      </button>

                      {/* FB Delete */}
                      <button
                        onClick={() => handleFacebookDelete(comment.commentId)}
                        disabled={
                          isDeleted || actionLoading[`del_${comment.commentId}`]
                        }
                        className="
          inline-flex h-9 items-center justify-center gap-1.5
          rounded-lg border border-amber-200
          bg-amber-50/60 px-3
          text-xs font-bold text-amber-600
          transition-all
          hover:border-amber-300
          hover:bg-amber-100
          disabled:opacity-40
        "
                      >
                        <span>🗑</span>
                        FB Delete
                      </button>

                      {/* Block */}
                      <button
                        onClick={() =>
                          handleOnlyBlockUser(
                            comment.senderId,
                            comment.commentId,
                          )
                        }
                        disabled={
                          isBlocked ||
                          actionLoading[`block_${comment.senderId}`]
                        }
                        className="
          inline-flex h-9 items-center justify-center gap-1.5
          rounded-lg border border-orange-200
          bg-orange-50/60 px-3
          text-xs font-bold text-orange-600
          transition-all
          hover:border-orange-300
          hover:bg-orange-100
          disabled:opacity-40
        "
                      >
                        <span>🚫</span>
                        {isBlocked ? "Blocked" : "Block User"}
                      </button>

                      {/* Delete + Block */}
                      <button
                        onClick={() =>
                          handleBlockAndFacebookDelete(
                            comment.commentId,
                            comment.senderId,
                          )
                        }
                        disabled={
                          isDeleted ||
                          actionLoading[`block_del_${comment.commentId}`]
                        }
                        className="
          inline-flex h-9 items-center justify-center gap-1.5
          rounded-lg
          bg-gradient-to-r from-rose-600 to-red-600
          px-3 text-xs font-bold text-white
          shadow-sm shadow-red-200
          transition-all
          hover:-translate-y-0.5
          hover:from-rose-700 hover:to-red-700
          hover:shadow-md
          disabled:opacity-40
        "
                      >
                        <span>🚫</span>
                        Delete & Block
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacebookLiveComments;
