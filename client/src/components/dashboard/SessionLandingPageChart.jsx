"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["#4f46e5", "#16a34a", "#f59e0b", "#dc2626", "#0891b2", "#9333ea", "#db2777", "#65a30d"];

export function SessionLandingPageChart({ byLandingPage }) {
  if (!byLandingPage || byLandingPage.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-center h-72 text-gray-400 text-sm">
        কোনো ডেটা নেই
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">🖥️ কোন ল্যান্ডিং পেজে কত সেশন</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={byLandingPage} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis dataKey="slug" type="category" tick={{ fontSize: 11 }} width={110} />
          <Tooltip />
          <Bar dataKey="count" name="সেশন" fill="#4f46e5" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SessionSourceChart({ bySource }) {
  const data = (bySource || []).map((d) => ({ name: d.source || "Direct", value: d.count }));

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-center h-72 text-gray-400 text-sm">
        কোনো ডেটা নেই
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">📣 কোন সোর্স/UTM থেকে ভিজিটর</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
            {data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}