// --- courier.courierStatus অনুযায়ী কার্ড কনফিগ (order: pending/assigned আগে, যেহেতু
// এগুলোই দৈনন্দিন ফলো-আপের জন্য সবচেয়ে বেশি গুরুত্বপূর্ণ) ---
const STATUS_CARDS = [
  { key: "pending", label: "পেন্ডিং পার্সেল", icon: "⏳", color: "bg-amber-100 text-amber-800" },
  { key: "assigned", label: "এসাইন পার্সেল", icon: "🚚", color: "bg-blue-100 text-blue-800" },
  { key: "review", label: "ইন-রিভিউ", icon: "🔎", color: "bg-purple-100 text-purple-800" },
  {
    key: "partial_delivered",
    label: "আংশিক ডেলিভারড",
    icon: "📦",
    color: "bg-orange-100 text-orange-800",
  },
  { key: "delivered", label: "ডেলিভারড", icon: "✅", color: "bg-green-100 text-green-800" },
  { key: "cancelled", label: "ক্যান্সেলড", icon: "❌", color: "bg-red-100 text-red-800" },
];

export default function TrackingParcelStatsCards({ counts, activeStatus, onCardClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {STATUS_CARDS.map((card) => {
        const isActive = activeStatus === card.key;
        return (
          <button
            key={card.key}
            onClick={() => onCardClick?.(card.key)}
            className={`text-left rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col items-center justify-center gap-1 ${card.color} ${
              isActive ? "ring-2 ring-offset-1 ring-indigo-500" : ""
            }`}
          >
            <div className="text-xl">{card.icon}</div>
            <div className="text-xl font-bold">
              {(counts?.[card.key]?.count || 0).toLocaleString("bn-BD")}
            </div>
            <div className="text-xs font-medium text-center">{card.label}</div>
          </button>
        );
      })}
    </div>
  );
}
