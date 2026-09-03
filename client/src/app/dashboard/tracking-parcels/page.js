"use client";
import { useState, useEffect, useCallback } from "react";
import { trackingParcelService } from "@/services/trackingParcelService";
import { useAuth } from "@/context/AuthContext";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import AuthGuard from "@/components/auth/AuthGuard";
import ModeratorSelector from "@/components/dashboard/ModeratorSelector";
import TrackingParcelStatsCards from "@/components/dashboard/TrackingParcelStatsCards";
import TrackingParcelOrderListModal from "@/components/orders/TrackingParcelOrderListModal";
import { getPresetRange } from "@/utils/dateRangeUtils";
import ProductAnalytics from "@/components/dashboard/ProductAnalytics";

// --- এই পেজের নিজস্ব তারিখ প্রিসেট (বুক হওয়ার তারিখ অনুযায়ী ফিল্টার করে) ---
const DATE_PRESETS = [
  { key: "all", label: "সব সময়" },
  { key: "today", label: "আজ" },
  { key: "yesterday", label: "গতকাল" },
  { key: "3d", label: "৩ দিন" },
  { key: "custom", label: "নির্দিষ্ট তারিখ" },
];

function TrackingParcelPageContent() {
  const { isAdmin } = useAuth();
  const [moderatorId, setModeratorId] = useState(null);

  const [datePreset, setDatePreset] = useState("all");
  const [customDate, setCustomDate] = useState("");

  const [counts, setCounts] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // --- কার্ডে ক্লিক করলে সংশ্লিষ্ট স্ট্যাটাসের টেবিল-মডাল খোলে (ড্যাশবোর্ডের drill-down প্যাটার্নের মতো) ---
  const [drillDownStatus, setDrillDownStatus] = useState(null);

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

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="p-2 md:p-6 bg-gray-100 min-h-screen">
      <SearchAndMenu />

      <div className="max-w-4xl mx-auto mt-3 space-y-4 pb-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            🚚 ট্র্যাকিং পার্সেল
          </h1>
          {isAdmin && (
            <ModeratorSelector
              selectedModeratorId={moderatorId}
              onChange={setModeratorId}
            />
          )}
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
            activeStatus={drillDownStatus}
            onCardClick={setDrillDownStatus}
          />
        )}
      </div>
      <div className="max-w-4xl mx-auto mt-3 space-y-4 pb-10">
        <ProductAnalytics moderatorId={moderatorId} isAdmin={isAdmin} />
      </div>
      {drillDownStatus && (
        <TrackingParcelOrderListModal
          status={drillDownStatus}
          moderatorId={isAdmin ? moderatorId : undefined}
          from={activeRange.from}
          to={activeRange.to}
          onClose={() => setDrillDownStatus(null)}
        />
      )}
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
