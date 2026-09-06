"use client";
import { useState, useEffect, useCallback } from "react";
import { eventLogService } from "@/services/eventLogService";

const STATUS_STYLE = {
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

const EVENT_NAMES = ["Purchase", "Lead", "InitiateCheckout", "ViewContent", "PageView"];

export default function EventLogViewer() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, sent: 0, failed: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [eventNameFilter, setEventNameFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventLogService.list(statusFilter, eventNameFilter, page, limit);
      setLogs(res.data.logs);
      setSummary(res.data.summary);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Event log fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, eventNameFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ফিল্টার বদলালে প্রথম পাতায় ফিরে যাওয়া
  useEffect(() => {
    setPage(1);
  }, [statusFilter, eventNameFilter]);

  // পাতা/ফিল্টার বদলালে আগের সিলেকশন সাফ হয়ে যাবে
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter, eventNameFilter]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleRetry = async (id) => {
    setRetryingId(id);
    try {
      const res = await eventLogService.retry(id);
      alert(`✅ ${res.data.message}`);
      fetchLogs();
    } catch (err) {
      alert(`❌ ${err.response?.data?.message || "Retry ব্যর্থ হয়েছে।"}`);
    } finally {
      setRetryingId(null);
    }
  };

  // --- ম্যানুয়ালি একটা ইভেন্ট লগ ডিলিট করা ---
  const handleDelete = async (id) => {
    if (!window.confirm("এই ইভেন্ট লগটি স্থায়ীভাবে ডিলিট করতে চান?")) return;
    setDeletingId(id);
    try {
      await eventLogService.remove(id);
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (logs.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchLogs();
      }
    } catch (err) {
      console.error("Event log delete error:", err);
      alert("ইভেন্ট লগ ডিলিট করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = logs.length > 0 && logs.every((l) => selectedIds.has(l._id));

  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        logs.forEach((l) => next.delete(l._id));
      } else {
        logs.forEach((l) => next.add(l._id));
      }
      return next;
    });
  };

  // --- চেকবক্স দিয়ে সিলেক্ট করা একাধিক ইভেন্ট লগ একসাথে ডিলিট করা ---
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`নির্বাচিত ${ids.length}টি ইভেন্ট লগ স্থায়ীভাবে ডিলিট করতে চান?`)) return;
    setBulkDeleting(true);
    try {
      await eventLogService.removeMany(ids);
      setSelectedIds(new Set());
      if (ids.length >= logs.length && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchLogs();
      }
    } catch (err) {
      console.error("Bulk delete event logs error:", err);
      alert("বাল্ক ডিলিট করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBulkDeleting(false);
    }
  };

  // --- নাম্বারড পেজিনেশন — বর্তমান পাতার আশেপাশে ২টা করে + শুরু/শেষ, বাকিটা "..." ---
  const getPageNumbers = () => {
    const pages = [];
    const windowSize = 2;
    const start = Math.max(1, page - windowSize);
    const end = Math.min(totalPages, page + windowSize);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* --- সামারি কার্ড --- */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 text-green-700 rounded-xl p-3 text-center">
          <div className="text-xl font-bold">{summary.sent || 0}</div>
          <div className="text-xs">✅ সফল</div>
        </div>
        <div className="bg-red-50 text-red-700 rounded-xl p-3 text-center">
          <div className="text-xl font-bold">{summary.failed || 0}</div>
          <div className="text-xs">❌ ব্যর্থ</div>
        </div>
        <div className="bg-yellow-50 text-yellow-700 rounded-xl p-3 text-center">
          <div className="text-xl font-bold">{summary.pending || 0}</div>
          <div className="text-xs">⏳ পেন্ডিং</div>
        </div>
      </div>

      {/* --- ফিল্টার + বাল্ক-ডিলিট --- */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
        >
          <option value="">সব স্ট্যাটাস</option>
          <option value="sent">সফল</option>
          <option value="failed">ব্যর্থ</option>
          <option value="pending">পেন্ডিং</option>
        </select>
        <select
          value={eventNameFilter}
          onChange={(e) => setEventNameFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
        >
          <option value="">সব ইভেন্ট</option>
          {EVENT_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {bulkDeleting ? "ডিলিট হচ্ছে..." : `🗑️ নির্বাচিত ${selectedIds.size}টি ডিলিট করুন`}
          </button>
        )}
      </div>

      {/* --- লিস্ট --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">লোড হচ্ছে...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">কোনো ইভেন্ট পাওয়া যায়নি।</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="py-2 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="py-2 px-3">ইভেন্ট</th>
                <th className="py-2 px-3">কাস্টমার</th>
                <th className="py-2 px-3">স্ট্যাটাস</th>
                <th className="py-2 px-3">এরর</th>
                <th className="py-2 px-3">সময়</th>
                <th className="py-2 px-3">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b last:border-0">
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(log._id)}
                      onChange={() => toggleOne(log._id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-3 font-medium">{log.eventName}</td>
                  <td className="py-2 px-3 text-gray-600">
                    {log.order?.castomerName || "-"}
                    {log.order?.totalCOD ? ` (৳${log.order.totalCOD})` : ""}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[log.status]}`}
                    >
                      {log.status}
                    </span>
                    {log.retryCount > 0 && (
                      <span className="text-[10px] text-gray-400 ml-1">
                        (retry: {log.retryCount})
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-red-500 text-xs max-w-[220px] truncate" title={log.errorMessage}>
                    {log.errorMessage || "-"}
                  </td>
                  <td className="py-2 px-3 text-gray-400 text-xs">
                    {new Date(log.createdAt).toLocaleString("bn-BD")}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1.5 items-center">
                      {log.status === "failed" && (
                        <button
                          onClick={() => handleRetry(log._id)}
                          disabled={retryingId === log._id}
                          className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-medium hover:bg-indigo-200 disabled:opacity-50"
                        >
                          {retryingId === log._id ? "..." : "🔄 Retry"}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(log._id)}
                        disabled={deletingId === log._id}
                        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {deletingId === log._id ? "..." : "🗑️"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- নাম্বারড পেজিনেশন --- */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-700 text-sm disabled:opacity-40"
          >
            ← আগের
          </button>
          {getPageNumbers().map((p, idx) =>
            p === "..." ? (
              <span key={`dots-${idx}`} className="px-2 text-gray-400 text-sm">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`min-w-[2rem] px-2.5 py-1.5 rounded-md text-sm font-medium ${
                  p === page
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-700 text-sm disabled:opacity-40"
          >
            পরের →
          </button>
        </div>
      )}
    </div>
  );
}