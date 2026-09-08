"use client";
import React, { useEffect, useState } from "react";
import { dashboardService } from "@/services/dashboardService";
import StatsCards from "./StatsCards";
import DashboardOrderListModal from "./DashboardOrderListModal";

// --- মাস্টার সার্চ/ট্র্যাকিং-পার্সেল পেজে প্রোডাক্ট কোডে ক্লিক করলে এই মডেল ওপেন হয় —
// main dashboard-এর StatsCards পুনর্ব্যবহার করা হয়েছে (একই ডিজাইন, ডেটা শুধু এই
// productCode + বাইরের ডেট রেঞ্জ দিয়ে ফিল্টার করা), তার সাথে একটা আলাদা ক্যান্সেল-রেট কার্ড। ---
export default function ProductFinancialModal({ productCode, from, to, moderatorId, onClose }) {
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drillDown, setDrillDown] = useState(null); // status string, StatsCards-এর onCardClick থেকে

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    dashboardService
      .getProductFinancialSummary(productCode, from, to, moderatorId)
      .then((res) => {
        if (!cancelled) setTotals(res.data.totals);
      })
      .catch((err) => {
        console.error("Product financial summary error:", err);
        if (!cancelled) setError("হিসাব লোড করা যায়নি।");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productCode, from, to, moderatorId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-800">📦 {productCode} — আর্থিক হিসাব</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-3">
          {loading ? (
            <div className="text-center py-16 text-gray-500">লোড হচ্ছে...</div>
          ) : error ? (
            <div className="text-center py-16 text-red-500">{error}</div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-2">
                {new Date(from).toLocaleDateString("bn-BD")} — {new Date(to).toLocaleDateString("bn-BD")}
              </p>

              <StatsCards totals={totals} onCardClick={setDrillDown} />

              {/* --- ক্যান্সেল রেট কার্ড (ডেলিভারড + ক্যান্সেল মিলিয়ে, ফাইনাল সিদ্ধান্ত হওয়া পার্সেলের %) --- */}
              <div className="mt-1 rounded-xl p-3 shadow-sm bg-purple-200 text-purple-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">ক্যান্সেল রেট</span>
                  <span className="text-xl font-bold">
                    {(totals.cancelRate || 0).toLocaleString("bn-BD", { maximumFractionDigits: 1 })}%
                  </span>
                </div>
                <p className="text-[11px] text-purple-600 mt-1">
                  ডেলিভারড ({(totals.deliveredCount || 0).toLocaleString("bn-BD")}) + ক্যান্সেল (
                  {(totals.cancelledCount || 0).toLocaleString("bn-BD")}) — এই দুইয়ের অনুপাতে হিসাব করা,
                  এখনো পেন্ডিং থাকা পার্সেল এই হিসাবে ধরা হয়নি।
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {drillDown && (
        <DashboardOrderListModal
          status={drillDown}
          from={from}
          to={to}
          moderatorId={moderatorId}
          productCode={productCode}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}