"use client";

function formatSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}ম ${s}সে` : `${s}সে`;
}

export default function SessionStatsCards({ totals }) {
  const cards = [
    {
      key: "totalSessions",
      icon: "👥",
      label: "মোট সেশন (ভিজিট)",
      value: (totals.totalSessions || 0).toLocaleString("bn-BD"),
      color: "bg-blue-100 text-blue-700",
    },
    {
      key: "bounceRate",
      icon: "🚪",
      label: "বাউন্স রেট",
      value: `${(totals.bounceRate || 0).toFixed(1)}%`,
      sub: `${(totals.bounceCount || 0).toLocaleString("bn-BD")}টি বাউন্স`,
      color: "bg-red-100 text-red-700",
    },
    {
      key: "returnVisitorRate",
      icon: "🔁",
      label: "রিটার্ন ভিজিটর",
      value: `${(totals.returnVisitorRate || 0).toFixed(1)}%`,
      sub: `${(totals.returnVisitorCount || 0).toLocaleString("bn-BD")}জন`,
      color: "bg-purple-100 text-purple-700",
    },
    {
      key: "avgTimeOnPageSeconds",
      icon: "⏱️",
      label: "গড় সময় পেজে",
      value: formatSeconds(totals.avgTimeOnPageSeconds || 0),
      color: "bg-amber-100 text-amber-700",
    },
    {
      key: "avgScrollDepth",
      icon: "📜",
      label: "গড় স্ক্রল ডেপথ",
      value: `${totals.avgScrollDepth || 0}%`,
      color: "bg-green-100 text-green-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.key} className={`rounded-xl p-4 shadow-sm ${c.color}`}>
          <div className="text-2xl mb-1">{c.icon}</div>
          <div className="text-xl font-bold">{c.value}</div>
          <div className="text-xs font-medium mt-1">{c.label}</div>
          {c.sub && <div className="text-[10px] opacity-70 mt-0.5">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}