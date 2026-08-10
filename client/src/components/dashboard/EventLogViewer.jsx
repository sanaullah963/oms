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

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventLogService.list(statusFilter, eventNameFilter);
      setLogs(res.data.logs);
      setSummary(res.data.summary);
    } catch (err) {
      console.error("Event log fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, eventNameFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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

      {/* --- ফিল্টার --- */}
      <div className="flex gap-2 flex-wrap">
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
                    {log.status === "failed" && (
                      <button
                        onClick={() => handleRetry(log._id)}
                        disabled={retryingId === log._id}
                        className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-medium hover:bg-indigo-200 disabled:opacity-50"
                      >
                        {retryingId === log._id ? "..." : "🔄 Retry"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}