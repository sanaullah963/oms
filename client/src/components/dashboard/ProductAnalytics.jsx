"use client";
import { useState, useEffect, useCallback } from "react";
import { dashboardService } from "@/services/dashboardService";
import { getPresetRange } from "@/utils/dateRangeUtils";
import DateRangeFilter from "./DateRangeFilter";
// import DashboardOrderListModal from "./DashboardOrderListModal";
import ParcelOrderListModal from "@/components/orders/ParcelOrderListModal";
import ProductFinancialModal from "./ProductFinancialModal";

// --- প্রোডাক্ট কার্ডের ৪টা স্ট্যাটাস চিপ কনফিগ ---
const METRICS = [
  { key: "sent", label: "পাঠানো", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
  { key: "delivered", label: "ডেলিভারড", color: "bg-green-50 text-green-700 hover:bg-green-100" },
  { key: "cancelled", label: "ক্যান্সেলড", color: "bg-red-50 text-red-700 hover:bg-red-100" },
  { key: "pending", label: "পেন্ডিং", color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
];

// --- পার্সেন্টেজ হিসাব: "পাঠানো" (কুরিয়ারে দেওয়া পার্সেল) = ১০০% ধরে ---
// sentCount ০ হলে ভাগ করা যায় না, তাই null রিটার্ন করা হয়
const calcPercent = (count, sentCount) => {
  if (!sentCount) return null;
  return (count / sentCount) * 100;
};

// ১ দশমিক ঘর পর্যন্ত, বাংলা সংখ্যায় (যেমন: ৭৬.৯%) — পূর্ণসংখ্যা হলে দশমিক ছাড়া (১০০%)
const formatPercent = (value) => {
  if (value === null) return "—";
  return `${value.toLocaleString("bn-BD", { maximumFractionDigits: 1 })}%`;
};

export default function ProductAnalytics({ moderatorId, isAdmin }) {
  const [preset, setPreset] = useState("today");
  const [customRange, setCustomRange] = useState(null);
  const [singleDate, setSingleDate] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drillDown, setDrillDown] = useState(null); // { status, productCode }
  const [financialModalProduct, setFinancialModalProduct] = useState(null); // productCode string

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
      const list = res.data.products || [];
      setProducts(list);
      // ডায়াগনস্টিক: delivered/cancelled হয় statusUpdatedAt দিয়ে, sent হয় bookedAt দিয়ে —
      // তাই কোনো স্ট্যাটাস sent-এর চেয়ে বেশি হলে পার্সেন্টেজ ১০০%-এর উপরে যেতে পারে
      console.log("[ProductAnalytics] products loaded:", list.length, "range:", activeRange);
      list.forEach((p) => {
        METRICS.forEach((m) => {
          const c = p[`${m.key}Count`] || 0;
          if (m.key !== "sent" && c > (p.sentCount || 0)) {
            console.log(
              `[ProductAnalytics] ${p.productCode}: ${m.key}=${c} > sent=${p.sentCount || 0} (>100%)`,
            );
          }
        });
      });
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
                  <td className="py-2 px-4 font-semibold text-gray-800">
                    {isAdmin ? (
                      <button
                        onClick={() => setFinancialModalProduct(p.productCode)}
                        className="text-indigo-600 hover:underline cursor-pointer hover:bg-blue-100 p-2 rounded-md"
                        title="আর্থিক হিসাব দেখুন"
                      >
                        {p.productCode}
                      </button>
                    ) : (
                      // মডারেটর: আর্থিক হিসাবের মডাল নেই, শুধু কোড
                      <span className="text-indigo-600 p-2">{p.productCode}</span>
                    )}
                  </td>
                  {METRICS.map((m) => {
                    const count = p[`${m.key}Count`] || 0;
                    const amount = p[`${m.key}Amount`] || 0;
                    const percent = calcPercent(count, p.sentCount || 0);
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
                          {isAdmin && (
                            <div className="text-[11px]">৳{amount.toLocaleString("bn-BD")}</div>
                          )}
                          <div className="text-[11px] font-semibold opacity-80 mt-0.5">
                            {formatPercent(percent)}
                          </div>
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
        <ParcelOrderListModal
          source="dashboard"
          status={drillDown.status}
          from={activeRange.from}
          to={activeRange.to}
          moderatorId={isAdmin ? moderatorId : undefined}
          productCode={drillDown.productCode}
          onClose={() => setDrillDown(null)}
        />
      )}

      {isAdmin && financialModalProduct && (
        <ProductFinancialModal
          productCode={financialModalProduct}
          from={activeRange.from}
          to={activeRange.to}
          moderatorId={isAdmin ? moderatorId : undefined}
          onClose={() => setFinancialModalProduct(null)}
        />
      )}
    </div>
  );
}