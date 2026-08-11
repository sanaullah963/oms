"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import DateRangeFilter from "@/components/dashboard/DateRangeFilter";
import { sessionService } from "@/services/sessionService";
import SessionStatsCards from "@/components/dashboard/SessionStatsCards";
import SessionTrendChart from "@/components/dashboard/SessionTrendChart";
import {
  SessionLandingPageChart,
  SessionSourceChart,
} from "@/components/dashboard/SessionBreakdownCharts";
import SessionTable from "@/components/dashboard/SessionTable";

function toISODate(date) {
  return date.toISOString().split("T")[0];
}

// --- প্রিসেট (আজ/গতকাল/৭দিন/৩০দিন/১বছর) থেকে from-to ডেট বের করা — dashboard/page.js-এর মতোই ---
function getPresetRange(preset) {
  const to = new Date();
  const from = new Date();
  switch (preset) {
    case "today":
      break;
    case "yesterday":
      from.setDate(from.getDate() - 1);
      to.setDate(to.getDate() - 1);
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

function SessionAnalyticsContent() {
  const [preset, setPreset] = useState("7d");
  const [customRange, setCustomRange] = useState(null);
  const [singleDate, setSingleDate] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      const res = await sessionService.getSummary(activeRange.from, activeRange.to);
      setData(res.data);
    } catch (err) {
      console.error("Session summary fetch error:", err);
      setError("সেশন অ্যানালিটিক্স লোড করা যায়নি। সার্ভার চলছে কিনা দেখুন।");
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
            <Link href="/dashboard" className="text-sm text-indigo-600 font-medium">
              ← ড্যাশবোর্ড
            </Link>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">
              📈 ল্যান্ডিং পেজ এনগেজমেন্ট অ্যানালিটিক্স
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeRange.from === activeRange.to
                ? `📆 ${activeRange.from}`
                : `📆 ${activeRange.from} — ${activeRange.to}`}{" "}
              — অর্ডার না করা ভিজিটরসহ সবার এনগেজমেন্ট এখানে দেখা যায়
            </p>
          </div>
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

        {loading ? (
          <div className="text-center py-16 text-gray-500">লোড হচ্ছে...</div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : (
          data && (
            <>
              <SessionStatsCards totals={data.totals} />

              <SessionTrendChart dailyTrend={data.dailyTrend} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SessionLandingPageChart byLandingPage={data.byLandingPage} />
                <SessionSourceChart bySource={data.bySource} />
              </div>

              <SessionTable from={activeRange.from} to={activeRange.to} />
            </>
          )
        )}
      </div>
    </div>
  );
}

export default function SessionAnalyticsPage() {
  return (
    <AuthGuard adminOnly>
      <SessionAnalyticsContent />
    </AuthGuard>
  );
}