"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function TrendChart({ dailyTrend }) {
  if (!dailyTrend || dailyTrend.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-center h-72 text-gray-400 text-sm">
        এই সময়সীমায় কোনো ডেটা নেই
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">📈 দৈনিক ডেলিভারি ও ক্যান্সেল ট্রেন্ড</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dailyTrend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="delivered" name="ডেলিভারড" fill="#16a34a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="cancelled" name="ক্যান্সেলড" fill="#dc2626" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
