"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = { delivered: "#16a34a", cancelled: "#dc2626" };

export default function StatusPieChart({ totals }) {
  const data = [
    { name: "ডেলিভারড", value: totals.deliveredCount || 0, color: COLORS.delivered },
    { name: "ক্যান্সেলড", value: totals.cancelledCount || 0, color: COLORS.cancelled },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-center h-72 text-gray-400 text-sm">
        এই সময়সীমায় কোনো ডেটা নেই
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">🥧 স্ট্যাটাস বিভাজন</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
