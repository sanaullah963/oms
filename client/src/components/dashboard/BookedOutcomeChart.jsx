"use client";
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { dashboardService } from "@/services/dashboardService";

// --- স্ট্যাকের নিচ থেকে উপরের ক্রমে: ডেলিভারড → আংশিক → চলমান → ক্যান্সেলড ---
const SEGMENTS = [
  { key: "delivered", label: "ডেলিভারড", color: "#16a34a" },
  { key: "partial", label: "আংশিক ডেলিভারড", color: "#3b82f6" },
  { key: "inProgress", label: "চলমান", color: "#ca8a04" },
  { key: "cancelled", label: "ক্যান্সেলড", color: "#dc2626" },
];

const pct = (n, total) => (total ? (n / total) * 100 : 0);
const fmtNum = (n) => (n || 0).toLocaleString("bn-BD");
const fmtPct = (v) => `${v.toLocaleString("bn-BD", { maximumFractionDigits: 1 })}%`;

// "2026-10-22" → "২২ অক্টো" (UTC ধরে, যাতে ব্রাউজারের টাইমজোনে দিন সরে না যায়)
const shortDate = (dateStr) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

// --- বারের সবুজ (ডেলিভারড) অংশের ভেতরে ওই দিনের ডেলিভারি % লেখা ---
// জায়গা কম হলে (সরু বার / ছোট অংশ) লেবেল দেখানো হয় না — হোভার করলে টুলটিপে পাওয়া যাবে
function DeliveredPctLabel({ x, y, width, height, index, days }) {
  const d = days[index];
  if (!d || !d.total || height < 14 || width < 18) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      textAnchor="middle"
      dominantBaseline="central"
      fill="#fff"
      fontSize={width < 26 ? 9 : 11}
      fontWeight={600}
    >
      {`${Math.round(d.deliveredPct).toLocaleString("bn-BD")}%`}
    </text>
  );
}

function DayTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-xs min-w-[190px]">
      <div className="font-semibold text-gray-800 mb-1">{shortDate(d.date)}</div>
      <div className="text-gray-500 mb-2">মোট বুক করা: {fmtNum(d.total)}টা (১০০%)</div>
      {SEGMENTS.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-3 py-0.5">
          <span className="flex items-center gap-1.5 text-gray-700">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className={s.key === "delivered" ? "font-bold" : ""}>
            {fmtNum(d[s.key])} · {fmtPct(pct(d[s.key], d.total))}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function BookedOutcomeChart({ from, to, moderatorId, isAdmin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false; // দ্রুত ফিল্টার বদলালে পুরনো রেসপন্স যেন নতুনটাকে ওভাররাইট না করে
    (async () => {
      setLoading(true);
      setError("");
      try {
        // console.log("[BookedOutcomeChart] fetch:", { from, to, moderatorId: isAdmin ? moderatorId : undefined });
        const res = await dashboardService.getBookedOutcome(
          from,
          to,
          isAdmin ? moderatorId : undefined,
        );
        if (ignore) return;
        // console.log("[BookedOutcomeChart] response:", res.data?.totals, "days:", res.data?.days?.length);
        setData(res.data);
      } catch (err) {
        if (ignore) return;
        console.error("[BookedOutcomeChart] fetch error:", err);
        setError("বুকিং আউটকাম চার্ট লোড করা যায়নি।");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [from, to, moderatorId, isAdmin]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center py-16 text-gray-500 text-sm">
        লোড হচ্ছে...
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center py-16 text-red-500 text-sm">
        {error}
      </div>
    );
  }
  if (!data || !data.totals || data.totals.total === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center py-16 text-gray-400 text-sm">
        এই সময়সীমায় কুরিয়ারে কোনো পার্সেল বুক হয়নি।
      </div>
    );
  }

  // প্রতিদিনের ডেলিভারি % আগে থেকেই হিসাব করে রাখা (লেবেল/টুলটিপ দুটোতেই লাগে)
  const days = data.days.map((d) => ({
    ...d,
    label: shortDate(d.date),
    deliveredPct: pct(d.delivered, d.total),
  }));
  const { totals } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ---------- বাঁ পাশ: দিনভিত্তিক স্ট্যাকড বার ---------- */}
      <div className="lg:col-span-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-700">📦 প্রতিদিন কতগুলো পার্সেল বুক হয়েছে</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {SEGMENTS.map((s) => (
              <span key={s.key} className="flex items-center gap-1 text-[11px] text-gray-600">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">
          প্রতিটা দিনের পার্সেল এখন পর্যন্ত কী অবস্থায় আছে সেই অনুযায়ী রং করা। সবুজ অংশের ভেতরের % = ওই দিনের
          বুক করা পার্সেলের কত শতাংশ ডেলিভারড।
        </p>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={days} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={14} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<DayTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
            {SEGMENTS.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="outcome"
                fill={s.color}
                radius={i === SEGMENTS.length - 1 ? [3, 3, 0, 0] : 0}
              >
                {s.key === "delivered" && (
                  <LabelList content={(props) => <DeliveredPctLabel {...props} days={days} />} />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ---------- ডান পাশ: সামগ্রিক সারসংক্ষেপ ---------- */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 self-start">
        <h3 className="text-sm font-semibold text-gray-700">🎯 শেষ পর্যন্ত কী হলো</h3>
        <p className="text-[11px] text-gray-400 mt-0.5 mb-3">
          {fmtNum(totals.total)}টা পার্সেল বুক হয়েছে ({data.days.length} দিনে)
        </p>

        <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-100 mb-4">
          {SEGMENTS.map((s) => {
            const w = pct(totals[s.key], totals.total);
            return w > 0 ? (
              <div key={s.key} style={{ width: `${w}%`, background: s.color }} title={`${s.label}: ${fmtPct(w)}`} />
            ) : null;
          })}
        </div>

        <div className="space-y-2">
          {SEGMENTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-700">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="flex items-baseline gap-3">
                <span className="font-bold text-gray-800">{fmtNum(totals[s.key])}</span>
                <span className="text-xs text-gray-400 w-12 text-right">
                  {fmtPct(pct(totals[s.key], totals.total))}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
