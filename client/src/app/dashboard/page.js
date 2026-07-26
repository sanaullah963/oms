"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { dashboardService } from "@/services/dashboardService";
import { useAuth } from "@/context/AuthContext";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import AuthGuard from "@/components/auth/AuthGuard";
import DateRangeFilter from "@/components/dashboard/DateRangeFilter";
// import ModeratorSelector from "@/components/dashboard/ModeratorSelector";
import ModeratorSelector from "@/components/dashboard/ModeratorSelector";
import StatsCards from "@/components/dashboard/StatsCards";
import FinancialSummary from "@/components/dashboard/FinancialSummary";
import TrendChart from "@/components/dashboard/TrendChart";
import StatusPieChart from "@/components/dashboard/StatusPieChart";
import MismatchTable from "@/components/dashboard/MismatchTable";

function toISODate(date) {
  return date.toISOString().split("T")[0];
}

// --- প্রিসেট (আজ/৭দিন/৩০দিন/১বছর) থেকে from-to ডেট বের করা ---
function getPresetRange(preset) {
  const to = new Date();
  const from = new Date();
  switch (preset) {
    case "today":
      break;
    case "7d":
      from.setDate(from.getDate() - 6);
      break;
    case "30d":
      from.setDate(from.getDate() - 29);
      break;
    case "1y":
      from.setFullYear(from.getFullYear() - 1);
      break;
    default:
      break;
  }
  return { from: toISODate(from), to: toISODate(to) };
}

function DashboardPageContent() {
  const { isAdmin } = useAuth();
  const [preset, setPreset] = useState("7d");
  const [customRange, setCustomRange] = useState(null);
  const [moderatorId, setModeratorId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeRange = preset === "custom" && customRange ? customRange : getPresetRange(preset);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await dashboardService.getSummary(
        activeRange.from,
        activeRange.to,
        isAdmin ? moderatorId : undefined,
      );
      setData(res.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("ড্যাশবোর্ড ডেটা লোড করা যায়নি। সার্ভার চলছে কিনা দেখুন।");
    } finally {
      setLoading(false);
    }
  }, [activeRange.from, activeRange.to, moderatorId, isAdmin]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const title = !isAdmin ? "📊 আপনার অর্ডারের এনালাইসিস" : "📊 ড্যাশবোর্ড";

  return (
    <div className="p-2 md:p-6 bg-gray-100 min-h-screen">
      <SearchAndMenu />

      <div className="max-w-6xl mx-auto mt-3 space-y-5 pb-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                <Link
                  href="/dashboard/users"
                  className="px-3 py-1.5 text-sm rounded-md font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                >
                  👥 ইউজার ম্যানেজমেন্ট
                </Link>
                <Link
                  href="/dashboard/landing-pages"
                  className="px-3 py-1.5 text-sm rounded-md font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                >
                  landing page management
                </Link>
                <Link
                  href="/dashboard/facebook-pages"
                  className="px-3 py-1.5 text-sm rounded-md font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                >
                  📄 Facebook পেজ
                </Link>
                <ModeratorSelector selectedModeratorId={moderatorId} onChange={setModeratorId} />
              </>
            )}
            <DateRangeFilter
              preset={preset}
              onPresetChange={setPreset}
              customRange={customRange}
              onCustomRangeChange={(range) => {
                setCustomRange(range);
                setPreset("custom");
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
              <StatsCards totals={data.totals} />
              <FinancialSummary totals={data.totals} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TrendChart dailyTrend={data.dailyTrend} />
                <StatusPieChart totals={data.totals} />
              </div>

              <MismatchTable mismatches={data.mismatches} />
            </>
          )
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardPageContent />
    </AuthGuard>
  );
}