const CARD_CONFIG = [
  { key: "sentCount", label: "মোট পাঠানো পার্সেল", color: "bg-blue-50 text-blue-700", icon: "📦" },
  { key: "deliveredCount", label: "ডেলিভারড", color: "bg-green-50 text-green-700", icon: "✅" },
  { key: "cancelledCount", label: "ক্যান্সেলড", color: "bg-red-50 text-red-700", icon: "❌" },
  {
    key: "sentAmount",
    label: "মোট COD এমাউন্ট (পাঠানো)",
    color: "bg-purple-50 text-purple-700",
    icon: "৳",
    isAmount: true,
  },
];

export default function StatsCards({ totals }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {CARD_CONFIG.map((c) => (
        <div key={c.key} className={`rounded-xl p-4 shadow-sm ${c.color}`}>
          <div className="text-2xl mb-1">{c.icon}</div>
          <div className="text-xl font-bold">
            {c.isAmount ? `৳${(totals[c.key] || 0).toLocaleString("bn-BD")}` : (totals[c.key] || 0).toLocaleString("bn-BD")}
          </div>
          <div className="text-xs font-medium mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
