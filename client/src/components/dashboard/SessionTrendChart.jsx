"use client";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function SessionTrendChart({ dailyTrend }) {
  if (!dailyTrend || dailyTrend.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-center h-72 text-gray-400 text-sm">
        এই সময়সীমায় কোনো সেশন ডেটা নেই
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">📈 দৈনিক সেশন ও বাউন্স ট্রেন্ড</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={dailyTrend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="sessions" name="মোট সেশন" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="bounces"
            name="বাউন্স"
            stroke="#dc2626"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}