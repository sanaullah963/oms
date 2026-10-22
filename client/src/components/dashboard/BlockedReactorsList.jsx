"use client";

import React, { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { facebookService } from "@/services/facebookService";
import { formatDate, formatTime } from "@/utils/dateUtils";
import { showToast } from "@/lib/toast";

const REACTION_EMOJI = {
  haha: "😆",
  angry: "😡",
};

// --- haha/angry রিয়েক্ট দিলে যেসব ফেসবুক ইউজার সিস্টেম নিজে থেকে ব্লক করে দিয়েছে,
// তাদের লিস্ট — রিয়েল-টাইম আপডেট (socket) + ম্যানুয়ালি ডিলিট করার সুবিধা সহ। ---
export default function BlockedReactorsList() {
  const { socket } = useSocket();
  const [reactors, setReactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [unblockingId, setUnblockingId] = useState(null);
  // একসাথে ডিলিটের জন্য সিলেক্ট করা আইডি
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const allSelected = reactors.length > 0 && reactors.every((r) => selectedIds.has(r._id));

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(reactors.map((r) => r._id)));
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`সিলেক্ট করা ${ids.length}টি রেকর্ড লিস্ট থেকে ডিলিট করবেন? (Facebook-এর ব্লক এতে সরবে না)`)) return;

    setBulkDeleting(true);
    try {
      await facebookService.bulkDeleteBlockedReactors(ids);
      setReactors((prev) => prev.filter((r) => !selectedIds.has(r._id)));
      setSelectedIds(new Set());
      showToast(`${ids.length}টি রেকর্ড ডিলিট হয়েছে`);
    } catch (err) {
      console.error("Bulk delete blocked reactors error:", err);
      showToast("ডিলিট করা যায়নি");
    } finally {
      setBulkDeleting(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleNew = (data) => {
      setReactors((prev) => {
        const isExist = prev.some((r) => r._id === data._id);
        if (isExist) return prev;
        return [data, ...prev];
      });
    };

    const handleUpdated = (data) => {
      setReactors((prev) => prev.map((r) => (r._id === data._id ? data : r)));
    };

    socket.on("new-blocked-reactor", handleNew);
    socket.on("blocked-reactor-updated", handleUpdated);

    const fetchReactors = async () => {
      try {
        const res = await facebookService.getBlockedReactors();
        if (res.data.success) {
          setReactors(res.data.data);
        }
      } catch (err) {
        console.error("Blocked reactors fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReactors();

    return () => {
      socket.off("new-blocked-reactor", handleNew);
      socket.off("blocked-reactor-updated", handleUpdated);
    };
  }, [socket]);

  const handleDelete = async (id) => {
    if (!confirm("এই রেকর্ডটা লিস্ট থেকে ডিলিট করবেন? (Facebook-এর ব্লক এতে সরবে না)")) return;

    setDeletingId(id);
    try {
      await facebookService.deleteBlockedReactor(id);
      setReactors((prev) => prev.filter((r) => r._id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      showToast("ডিলিট হয়েছে");
    } catch (err) {
      console.error("Delete blocked reactor error:", err);
      showToast("ডিলিট করা যায়নি");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnblock = async (id) => {
    if (!confirm("এই ইউজারকে Facebook-এ আনব্লক করবেন?")) return;

    setUnblockingId(id);
    try {
      const res = await facebookService.unblockReactor(id);
      if (res.data.success) {
        setReactors((prev) => prev.map((r) => (r._id === id ? res.data.data : r)));
        showToast("আনব্লক করা হয়েছে");
      }
    } catch (err) {
      console.error("Unblock reactor error:", err);
      showToast(err.response?.data?.message || err.response?.data?.error || "আনব্লক করা যায়নি");
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
      <div className="mb-3">
        <h2 className="font-bold text-gray-800">😡 রিয়েক্ট-ব্লক তালিকা</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          কোনো পোস্টে haha বা angry রিয়েক্ট দিলে সেই ইউজারকে এখানে সাথে সাথে অটো-ব্লক করে রাখা হয়।
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 text-sm">লোড হচ্ছে...</div>
      ) : reactors.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">এখনো কেউ ব্লক হয়নি।</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <button
              onClick={toggleAll}
              className="text-xs px-3 py-1.5 rounded-md border border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
            >
              {allSelected ? "সব আনসিলেক্ট" : `সব সিলেক্ট (${reactors.length})`}
            </button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs text-gray-600">{selectedIds.size}টি সিলেক্টেড</span>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  {bulkDeleting ? "ডিলিট হচ্ছে..." : `🗑️ সিলেক্টেড ডিলিট (${selectedIds.size})`}
                </button>
              </>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="সব সিলেক্ট"
                    className="cursor-pointer"
                  />
                </th>
                <th className="py-2 px-3">নাম</th>
                <th className="py-2 px-3">রিয়েকশন</th>
                <th className="py-2 px-3">পেজ</th>
                <th className="py-2 px-3">FB ব্লক স্ট্যাটাস</th>
                <th className="py-2 px-3">সময়</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {reactors.map((r) => (
                <tr
                  key={r._id}
                  className={`border-b last:border-0 hover:bg-gray-50 ${selectedIds.has(r._id) ? "bg-indigo-50/60" : ""}`}
                >
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r._id)}
                      onChange={() => toggleOne(r._id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-3 font-medium">
                    {r.profileLink ? (
                      <a
                        href={r.profileLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {r.name}
                      </a>
                    ) : (
                      r.name
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {REACTION_EMOJI[r.reactionType] || ""} {r.reactionType}
                  </td>
                  <td className="py-2 px-3 text-gray-500">{r.pageName}</td>
                  <td className="py-2 px-3">
                    {!r.isActive ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-gray-100 text-gray-600">
                        আনব্লক করা হয়েছে
                      </span>
                    ) : r.blockedOnFacebook ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-green-100 text-green-700">
                        ব্লক সফল
                      </span>
                    ) : (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-red-100 text-red-700"
                        title={r.blockError || ""}
                      >
                        ব্যর্থ
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                    {formatDate(r.createdAt)} {formatTime(r.createdAt)}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    {r.isActive && r.blockedOnFacebook && (
                      <button
                        onClick={() => handleUnblock(r._id)}
                        disabled={unblockingId === r._id}
                        className="text-xs px-2 py-1 rounded-md border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 cursor-pointer mr-1.5"
                      >
                        {unblockingId === r._id ? "..." : "আনব্লক"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(r._id)}
                      disabled={deletingId === r._id}
                      className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 cursor-pointer"
                    >
                      {deletingId === r._id ? "..." : "ডিলিট"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}