"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { dashboardService } from "@/services/dashboardService";
import { useAuth } from "@/context/AuthContext";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import AuthGuard from "@/components/auth/AuthGuard";
import DateRangeFilter from "@/components/dashboard/DateRangeFilter";
import ModeratorStatsCards from "@/components/dashboard/ModeratorStatsCards";
import ParcelOrderListModal from "@/components/orders/ParcelOrderListModal";
import TrendChart from "@/components/dashboard/TrendChart";
import StatusPieChart from "@/components/dashboard/StatusPieChart";
import BookedOutcomeChart from "@/components/dashboard/BookedOutcomeChart";
import { getPresetRange } from "@/utils/dateRangeUtils";

// ============================================================================
// মডারেটর ড্যাশবোর্ড (/moderator-dashboard)
// মেইন ড্যাশবোর্ডের মতোই (নিজের অর্ডারের স্কোপে), কিন্তু কোনো টাকার হিসাব নেই — শুধু সংখ্যা।
// ⚠️ UI লুকানো যথেষ্ট না: সার্ভারও (dashboardController) মডারেটরের রেসপন্স থেকে আর্থিক ফিল্ড বাদ দেয়।
// ============================================================================
function ModeratorDashboardContent() {
  const { isAdmin } = useAuth();
  const [preset, setPreset] = useState("7d");
  const [customRange, setCustomRange] = useState(null);
  const [singleDate, setSingleDate] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drillDownStatus, setDrillDownStatus] = useState(null);

  const activeRange =
    preset === "custom" && customRange
      ? customRange
      : preset === "singleDate" && singleDate
        ? { from: singleDate, to: singleDate }
        : getPresetRange(preset);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // মডারেটরের ক্ষেত্রে moderatorId পাঠানো হয় না — সার্ভার নিজেই নিজের অর্ডারে সীমাবদ্ধ করে
      const res = await dashboardService.getSummary(activeRange.from, activeRange.to, undefined);
      // console.log("[ModeratorDashboard] summary totals:", res.data?.totals);
      setData(res.data);
    } catch (err) {
      console.error("Moderator dashboard fetch error:", err);
      setError("ড্যাশবোর্ড ডেটা লোড করা যায়নি। সার্ভার চলছে কিনা দেখুন।");
    } finally {
      setLoading(false);
    }
  }, [activeRange.from, activeRange.to]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="p-2 md:p-6 bg-gray-100 min-h-screen">
      <SearchAndMenu />

      <div className="max-w-6xl mx-auto mt-3 space-y-5 pb-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
              📊 {isAdmin ? "মডারেটর ড্যাশবোর্ড (প্রিভিউ)" : "আপনার অর্ডারের এনালাইসিস"}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeRange.from === activeRange.to
                ? `📆 ${activeRange.from}`
                : `📆 ${activeRange.from} — ${activeRange.to}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard/tracking-parcels"
              className="px-3 py-1.5 text-sm rounded-md font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            >
              🚚 ট্র্যাকিং পার্সেল
            </Link>
            <DateRangeFilter
              preset={preset}
              onPresetChange={setPreset}
              customRange={customRange}
              onCustomRangeChange={(range) => {
                setCustomRange(range);
                setPreset("custom");
              }}
              onSingleDateChange={(date) => {
                setSingleDate(date);
                setPreset("singleDate");
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">লোড হচ্ছে...</div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : (
          data && (
            <>
              <ModeratorStatsCards totals={data.totals} onCardClick={setDrillDownStatus} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TrendChart dailyTrend={data.dailyTrend} />
                <StatusPieChart totals={data.totals} />
              </div>
            </>
          )
        )}

        <BookedOutcomeChart
          from={activeRange.from}
          to={activeRange.to}
          moderatorId={undefined}
          isAdmin={false}
        />
      </div>

      {drillDownStatus && (
        <ParcelOrderListModal
          source="dashboard"
          status={drillDownStatus}
          from={activeRange.from}
          to={activeRange.to}
          moderatorId={undefined}
          onClose={() => setDrillDownStatus(null)}
        />
      )}
    </div>
  );
}

export default function ModeratorDashboardPage() {
  return (
    <AuthGuard>
      <ModeratorDashboardContent />
    </AuthGuard>
  );
}
