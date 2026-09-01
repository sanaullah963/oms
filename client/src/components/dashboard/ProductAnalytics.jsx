"use client";
import { useState, useEffect, useCallback } from "react";
import { dashboardService } from "@/services/dashboardService";
import { getPresetRange } from "@/utils/dateRangeUtils";
import DateRangeFilter from "./DateRangeFilter";
import DashboardOrderListModal from "./DashboardOrderListModal";

// --- প্রোডাক্ট কার্ডের ৪টা স্ট্যাটাস চিপ কনফিগ ---
const METRICS = [
  { key: "sent", label: "পাঠানো", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
  { key: "delivered", label: "ডেলিভারড", color: "bg-green-50 text-green-700 hover:bg-green-100" },
  { key: "cancelled", label: "ক্যান্সেলড", color: "bg-red-50 text-red-700 hover:bg-red-100" },
  { key: "pending", label: "পেন্ডিং", color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
];

export default function ProductAnalytics({ moderatorId, isAdmin }) {
  const [preset, setPreset] = useState("today");
  const [customRange, setCustomRange] = useState(null);
  const [singleDate, setSingleDate] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drillDown, setDrillDown] = useState(null); // { status, productCode }

  const activeRange =
    preset === "custom" && customRange
      ? customRange
      : preset === "singleDate" && singleDate
        ? { from: singleDate, to: singleDate }
        : getPresetRange(preset);

  const fetchProductSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await dashboardService.getProductSummary(
        activeRange.from,
        activeRange.to,
        isAdmin ? moderatorId : undefined,
      );
      setProducts(res.data.products || []);
    } catch (err) {
      console.error("Product summary fetch error:", err);
      setError("প্রোডাক্ট এনালিটিক্স লোড করা যায়নি।");
    } finally {
      setLoading(false);
    }
  }, [activeRange.from, activeRange.to, moderatorId, isAdmin]);

  useEffect(() => {
    fetchProductSummary();
  }, [fetchProductSummary]);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h2 className="text-sm font-semibold text-gray-600">📦 প্রোডাক্ট-ভিত্তিক এনালিটিক্স</h2>
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
        <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100">
          লোড হচ্ছে...
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-500 bg-white rounded-xl border border-gray-100">
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100">
          এই সময়ে কোনো প্রোডাক্টের অর্ডার পাওয়া যায়নি।
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-4">প্রোডাক্ট কোড</th>
                {METRICS.map((m) => (
                  <th key={m.key} className="py-2 px-4">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.productCode} className="border-b last:border-0">
                  <td className="py-2 px-4 font-semibold text-gray-800">{p.productCode}</td>
                  {METRICS.map((m) => {
                    const count = p[`${m.key}Count`] || 0;
                    const amount = p[`${m.key}Amount`] || 0;
                    return (
                      <td key={m.key} className="py-2 px-4">
                        <button
                          onClick={() =>
                            setDrillDown({ status: m.key, productCode: p.productCode })
                          }
                          disabled={count === 0}
                          className={`rounded-md px-2 py-1 text-left transition ${
                            count === 0
                              ? "text-gray-300 cursor-not-allowed"
                              : `cursor-pointer ${m.color}`
                          }`}
                        >
                          <div className="font-bold">{count.toLocaleString("bn-BD")}</div>
                          <div className="text-[11px]">৳{amount.toLocaleString("bn-BD")}</div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drillDown && (
        <DashboardOrderListModal
          status={drillDown.status}
          from={activeRange.from}
          to={activeRange.to}
          moderatorId={isAdmin ? moderatorId : undefined}
          productCode={drillDown.productCode}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}
