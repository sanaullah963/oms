"use client";
import { useState, useEffect, useCallback } from "react";
import { sessionService } from "@/services/sessionService";

function formatSeconds(sec = 0) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}ম ${s}সে` : `${s}সে`;
}

export default function SessionTable({ from, to }) {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [bounceFilter, setBounceFilter] = useState("");
  const [returnFilter, setReturnFilter] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const limit = 20;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sessionService.list({
        from,
        to,
        page,
        limit,
        isBounce: bounceFilter || undefined,
        isReturnVisitor: returnFilter || undefined,
      });
      setSessions(res.data.sessions || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Session list fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [from, to, page, bounceFilter, returnFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ফিল্টার বদলালে প্রথম পাতায় ফিরে যাওয়া
  useEffect(() => {
    setPage(1);
  }, [bounceFilter, returnFilter, from, to]);

  // পাতা/ফিল্টার বদলালে আগের সিলেকশন সাফ হয়ে যাবে (ভুল আইডি ধরে না থাকার জন্য)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, bounceFilter, returnFilter, from, to]);

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = sessions.length > 0 && sessions.every((s) => selectedIds.has(s._id));

  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        sessions.forEach((s) => next.delete(s._id));
      } else {
        sessions.forEach((s) => next.add(s._id));
      }
      return next;
    });
  };

  // --- চেকবক্স দিয়ে সিলেক্ট করা একাধিক সেশন একসাথে ডিলিট করা ---
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`নির্বাচিত ${ids.length}টি সেশন স্থায়ীভাবে ডিলিট করতে চান?`)) return;
    setBulkDeleting(true);
    try {
      await sessionService.removeMany(ids);
      setSelectedIds(new Set());
      // এই পাতার সব আইটেম ডিলিট হয়ে গেলে (আর প্রথম পাতা না হলে) আগের পাতায় ফিরে যাওয়া
      if (ids.length >= sessions.length && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchSessions();
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      window.alert("বাল্ক ডিলিট করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBulkDeleting(false);
    }
  };

  // --- ম্যানুয়ালি একটা সেশন ডিলিট করা ---
  const handleDelete = async (id) => {
    if (!window.confirm("এই সেশনটি স্থায়ীভাবে ডিলিট করতে চান?")) return;
    setDeletingId(id);
    try {
      await sessionService.remove(id);
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // এই পেজে এটাই শেষ আইটেম হলে (আর প্রথম পাতা না হলে) আগের পাতায় ফিরে যাওয়া,
      // নাহলে বর্তমান পাতাই আবার fetch করা — যাতে টেবিল সবসময় সঠিক ডেটা দেখায়
      if (sessions.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchSessions();
      }
    } catch (err) {
      console.error("Session delete error:", err);
      window.alert("সেশন ডিলিট করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-600">
          📋 সব সেশন ({total.toLocaleString("bn-BD")}টি)
        </h3>
        <div className="flex gap-2 items-center flex-wrap">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {bulkDeleting
                ? "ডিলিট হচ্ছে..."
                : `🗑️ নির্বাচিত ${selectedIds.size}টি ডিলিট করুন`}
            </button>
          )}
          <select
            value={bounceFilter}
            onChange={(e) => setBounceFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white"
          >
            <option value="">সব (বাউন্স/নন-বাউন্স)</option>
            <option value="true">শুধু বাউন্স</option>
            <option value="false">শুধু নন-বাউন্স</option>
          </select>
          <select
            value={returnFilter}
            onChange={(e) => setReturnFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white"
          >
            <option value="">সব ভিজিটর</option>
            <option value="true">শুধু রিটার্ন ভিজিটর</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">লোড হচ্ছে...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">কোনো সেশন পাওয়া যায়নি।</div>
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
                <th className="py-2 px-3">সময়</th>
                <th className="py-2 px-3">ল্যান্ডিং পেজ</th>
                <th className="py-2 px-3">পেজে সময়</th>
                <th className="py-2 px-3">স্ক্রল</th>
                <th className="py-2 px-3">ক্লিক</th>
                <th className="py-2 px-3">সোর্স</th>
                <th className="py-2 px-3">স্ট্যাটাস</th>
                <th className="py-2 px-3">IP</th>
                <th className="py-2 px-3">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s._id} className="border-b last:border-0">
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s._id)}
                      onChange={() => toggleOne(s._id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(s.entryAt).toLocaleString("bn-BD")}
                  </td>
                  <td className="py-2 px-3 font-medium">{s.landingPageSlug || "-"}</td>
                  <td className="py-2 px-3">{formatSeconds(s.timeOnPageSeconds)}</td>
                  <td className="py-2 px-3">{s.maxScrollDepth || 0}%</td>
                  <td className="py-2 px-3">{s.clickCount || 0}</td>
                  <td className="py-2 px-3 text-xs text-gray-500">
                    {s.tracking?.utmSource || (s.tracking?.referrer ? "Referral" : "Direct")}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1 flex-wrap">
                      {s.isBounce && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                          বাউন্স
                        </span>
                      )}
                      {s.isReturnVisitor && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          রিটার্ন
                        </span>
                      )}
                      {!s.isBounce && !s.isReturnVisitor && (
                        <span className="text-[10px] text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-400">{s.tracking?.ip || "-"}</td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => handleDelete(s._id)}
                      disabled={deletingId === s._id}
                      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deletingId === s._id ? "..." : "🗑️ ডিলিট"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-3 flex items-center justify-center gap-1 flex-wrap border-t border-gray-100">
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