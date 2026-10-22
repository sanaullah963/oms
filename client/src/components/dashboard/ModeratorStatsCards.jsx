// ============================================================================
// ModeratorStatsCards — মডারেটরের জন্য স্ট্যাট কার্ড: শুধু পার্সেলের সংখ্যা, কোনো টাকার হিসাব নেই।
// (অ্যাডমিনের টাকাসহ কার্ড: StatsCards.jsx)
// ============================================================================
const CARDS = [
  { key: "sent", label: "পাঠিয়েছি", countKey: "sentCount", style: "bg-blue-100 text-blue-800", num: "text-blue-900" },
  { key: "pending", label: "পেন্ডিং পার্সেল", countKey: "pendingCount", style: "bg-amber-100 text-amber-700", num: "text-amber-900" },
  { key: "delivered", label: "ডেলিভারড", countKey: "deliveredCount", style: "bg-green-100 text-green-700", num: "text-green-900" },
  { key: "cancelled", label: "ক্যান্সেল", countKey: "cancelledCount", style: "bg-red-100 text-red-700", num: "text-red-900" },
];

export default function ModeratorStatsCards({ totals, onCardClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {CARDS.map((c) => (
        <button
          key={c.key}
          onClick={() => onCardClick?.(c.key)}
          className={`rounded-xl p-3 shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-center gap-3 ${c.style}`}
        >
          <span className="text-sm font-medium">{c.label}</span>
          <span className={`text-2xl font-bold ${c.num}`}>
            {(totals?.[c.countKey] || 0).toLocaleString("bn-BD")}
          </span>
        </button>
      ))}
    </div>
  );
}
