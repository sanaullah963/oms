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

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-600">
          📋 সব সেশন ({total.toLocaleString("bn-BD")}টি)
        </h3>
        <div className="flex gap-2">
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
                <th className="py-2 px-3">সময়</th>
                <th className="py-2 px-3">ল্যান্ডিং পেজ</th>
                <th className="py-2 px-3">পেজে সময়</th>
                <th className="py-2 px-3">স্ক্রল</th>
                <th className="py-2 px-3">ক্লিক</th>
                <th className="py-2 px-3">সোর্স</th>
                <th className="py-2 px-3">স্ট্যাটাস</th>
                <th className="py-2 px-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s._id} className="border-b last:border-0">
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-3 flex items-center justify-between text-sm border-t border-gray-100">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 disabled:opacity-40"
          >
            ← আগের
          </button>
          <span className="text-xs text-gray-500">
            পাতা {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 disabled:opacity-40"
          >
            পরের →
          </button>
        </div>
      )}
    </div>
  );
}