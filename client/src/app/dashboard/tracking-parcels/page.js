"use client";
import { useState, useEffect, useCallback } from "react";
import { trackingParcelService } from "@/services/trackingParcelService";
import { useAuth } from "@/context/AuthContext";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import AuthGuard from "@/components/auth/AuthGuard";
import ModeratorSelector from "@/components/dashboard/ModeratorSelector";
import TrackingParcelStatsCards from "@/components/dashboard/TrackingParcelStatsCards";
import TrackingParcelCard from "@/components/orders/TrackingParcelCard";
import { getPresetRange } from "@/utils/dateRangeUtils";

const STATUS_LABELS = {
  pending: "⏳ পেন্ডিং পার্সেল",
  assigned: "🚚 এসাইন পার্সেল",
  review: "🔎 ইন-রিভিউ পার্সেল",
  partial_delivered: "📦 আংশিক ডেলিভারড পার্সেল",
  delivered: "✅ ডেলিভারড পার্সেল",
  cancelled: "❌ ক্যান্সেলড পার্সেল",
};

// --- এই পেজের নিজস্ব তারিখ প্রিসেট (বুক হওয়ার তারিখ অনুযায়ী ফিল্টার করে) ---
const DATE_PRESETS = [
  { key: "all", label: "সব সময়" },
  { key: "today", label: "আজ" },
  { key: "yesterday", label: "গতকাল" },
  { key: "3d", label: "৩ দিন" },
  { key: "custom", label: "নির্দিষ্ট তারিখ" },
];

const PAGE_SIZE = 20;

function TrackingParcelPageContent() {
  const { isAdmin } = useAuth();
  const [moderatorId, setModeratorId] = useState(null);

  const [datePreset, setDatePreset] = useState("all");
  const [customDate, setCustomDate] = useState("");

  const [counts, setCounts] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [activeStatus, setActiveStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState("");

  // --- সিলেক্ট করা প্রিসেট থেকে প্রকৃত from/to বের করা ("সব সময়" হলে undefined,
  // অর্থাৎ ব্যাকএন্ডে কোনো তারিখ-ফিল্টার যাবে না) ---
  const activeRange =
    datePreset === "all"
      ? { from: undefined, to: undefined }
      : datePreset === "custom"
        ? { from: customDate || undefined, to: customDate || undefined }
        : getPresetRange(datePreset);

  // --- কার্ডের কাউন্ট আনা ---
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await trackingParcelService.getSummary(
        isAdmin ? moderatorId : undefined,
        activeRange.from,
        activeRange.to,
      );
      setCounts(res.data.counts);
    } catch (err) {
      console.error("Tracking parcel summary error:", err);
    } finally {
      setSummaryLoading(false);
    }
  }, [moderatorId, isAdmin, activeRange.from, activeRange.to]);

  // --- সিলেক্ট করা স্ট্যাটাস + পেজের পার্সেল লিস্ট আনা ---
  const fetchOrders = useCallback(async () => {
    if (!activeStatus) return;
    setOrdersLoading(true);
    setError("");
    try {
      const res = await trackingParcelService.getOrders(
        activeStatus,
        isAdmin ? moderatorId : undefined,
        activeRange.from,
        activeRange.to,
        page,
        PAGE_SIZE,
      );
      return res.data;
    } catch (err) {
      console.error("Tracking parcel orders error:", err);
      throw err;
    }
  }, [activeStatus, moderatorId, isAdmin, activeRange.from, activeRange.to, page]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // ট্যাব বা তারিখ-রেঞ্জ বদলালে পেজ ১-এ রিসেট করা হয়, নাহলে ৩ নম্বর পেজে থেকে অন্য
  // ট্যাবে গেলে খালি লিস্ট দেখাবে
  useEffect(() => {
    setPage(1);
  }, [activeStatus, activeRange.from, activeRange.to]);

  // --- দ্রুত ট্যাব/পেজ বদলালে পুরনো (দেরিতে আসা) রিকোয়েস্টের রেসপন্স যেন নতুনটাকে
  // ওভাররাইট করতে না পারে, সেজন্য cancelled flag দিয়ে race-condition গার্ড করা হলো ---
  useEffect(() => {
    let cancelled = false;
    setOrdersLoading(true);
    setError("");

    fetchOrders()
      .then((data) => {
        if (cancelled) return;
        setOrders(data.orders || []);
        setTotalOrders(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {
        if (!cancelled) setError("লিস্ট লোড করা যায়নি।");
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchOrders]);

  return (
    <div className="p-2 md:p-6 bg-gray-100 min-h-screen">
      <SearchAndMenu />

      <div className="max-w-4xl mx-auto mt-3 space-y-4 pb-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">🚚 ট্র্যাকিং পার্সেল</h1>
          {isAdmin && <ModeratorSelector selectedModeratorId={moderatorId} onChange={setModeratorId} />}
        </div>

        {/* --- তারিখ ফিল্টার --- */}
        <div className="flex items-center gap-2 flex-wrap">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setDatePreset(p.key)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium border transition cursor-pointer ${
                datePreset === p.key
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
          {datePreset === "custom" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="text-xs border border-gray-300 rounded-md px-2 py-1.5"
            />
          )}
        </div>

        {summaryLoading ? (
          <div className="text-center py-8 text-gray-500">লোড হচ্ছে...</div>
        ) : (
          <TrackingParcelStatsCards
            counts={counts}
            activeStatus={activeStatus}
            onCardClick={setActiveStatus}
          />
        )}

        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-2">
            {STATUS_LABELS[activeStatus] || "পার্সেল"} — {totalOrders.toLocaleString("bn-BD")}টি
          </h2>

          {ordersLoading ? (
            <div className="text-center py-10 text-gray-500">পার্সেল লোড হচ্ছে...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-gray-400">এই তালিকায় কোনো পার্সেল নেই।</div>
          ) : (
            <>
              <div className="space-y-2">
                {orders.map((order) => (
                  <TrackingParcelCard key={order._id} order={order} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    ← আগের
                  </button>
                  <span className="text-sm text-gray-600">
                    পৃষ্ঠা {page.toLocaleString("bn-BD")} / {totalPages.toLocaleString("bn-BD")}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    পরের →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrackingParcelPage() {
  return (
    <AuthGuard>
      <TrackingParcelPageContent />
    </AuthGuard>
  );
}