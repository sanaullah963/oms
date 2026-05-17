"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ─── Tracking note classifier ────────────────────────────────────────────────
const NOTE_CATEGORIES = [
  {
    key: "phone_not_received",
    label: "ফোন রিসিভ করেনি",
    color: "#ef4444",
    bg: "#fef2f2",
    border: "#fecaca",
    icon: "📵",
    patterns: [
      /phone.*not.*receiv/i,
      /call.*not.*receiv/i,
      /রিসিভ করেনি/,
      /ফোন ধরেনি/,
      /unreachable/i,
      /not reachable/i,
      /switched off/i,
    ],
  },
  {
    key: "assigned_rider",
    label: "রাইডারে এসাইন",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    icon: "🛵",
    patterns: [/assigned to rider/i, /out for delivery/i, /on the way/i],
  },
  {
    key: "received_hub",
    label: "হাবে পৌঁছেছে",
    color: "#0ea5e9",
    bg: "#f0f9ff",
    border: "#bae6fd",
    icon: "🏭",
    patterns: [
      /received at/i,
      /arrived at/i,
      /consignment has been received/i,
    ],
  },
  {
    key: "in_transit",
    label: "ট্রানজিটে আছে",
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
    icon: "🚚",
    patterns: [/sent to/i, /dispatched/i, /in transit/i, /dispatch id/i],
  },
  {
    key: "delivered",
    label: "ডেলিভারি সম্পন্ন",
    color: "#10b981",
    bg: "#f0fdf4",
    border: "#a7f3d0",
    icon: "✅",
    patterns: [/delivered/i, /ডেলিভারি হয়েছে/, /সফলভাবে/],
  },
  {
    key: "returned",
    label: "ফেরত এসেছে",
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
    icon: "↩️",
    patterns: [/return/i, /ফেরত/, /RTO/i],
  },
  {
    key: "custom_note",
    label: "কাস্টম নোট",
    color: "#ec4899",
    bg: "#fdf4ff",
    border: "#f5d0fe",
    icon: "📝",
    patterns: [/কাস্টমার কে কল/, /নোট/, /note:/i, /রিমার্ক/],
  },
];

function classifyNote(text) {
  if (!text) return null;
  for (const cat of NOTE_CATEGORIES) {
    if (cat.patterns.some((p) => p.test(text))) return cat.key;
  }
  return "other";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function formatBDT(amount) {
  return new Intl.NumberFormat("bn-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        background: "#fff",
        borderRadius: 16,
        padding: "20px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)",
        borderLeft: `4px solid ${color}`,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af" }}>{sub}</div>}
    </div>
  );
}

function StatusBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {count} <span style={{ color: "#d1d5db" }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height: 8, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
            transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
    </div>
  );
}

function NoteCard({ cat, items }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: cat.bg,
        border: `1px solid ${cat.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 20 }}>{cat.icon}</span>
        <span style={{ flex: 1, fontWeight: 600, color: cat.color, fontSize: 14 }}>
          {cat.label}
        </span>
        <span
          style={{
            background: cat.color,
            color: "#fff",
            borderRadius: 99,
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {items.length}
        </span>
        <span style={{ color: cat.color, fontSize: 18, marginLeft: 4 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 14px" }}>
          {items.slice(0, 20).map((item, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 6,
                fontSize: 13,
                color: "#374151",
                border: `1px solid ${cat.border}`,
              }}
            >
              <div style={{ fontWeight: 600, color: "#111", marginBottom: 2 }}>
                {item.order?.castomerName || "—"}{" "}
                <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                  #{item.order?._id?.slice(-6)}
                </span>
              </div>
              <div style={{ color: "#6b7280" }}>{item.noteText}</div>
            </div>
          ))}
          {items.length > 20 && (
            <div style={{ fontSize: 12, color: cat.color, marginTop: 4 }}>
              + আরও {items.length - 20} টি নোট
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/orders`);
      if (Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("অর্ডার লোড করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Stats ──
  const stats = useMemo(() => {
    const safe = orders.filter(Boolean);
    const total = safe.length;
    const todayOrders = safe.filter(
      (o) => isToday(o.createdAt) || isToday(o.updatedAt)
    );
    const totalCOD = safe.reduce((sum, o) => sum + (Number(o.totalCOD) || 0), 0);

    const byStatus = {};
    safe.forEach((o) => {
      const s = o.orderStatus || "Unknown";
      byStatus[s] = (byStatus[s] || 0) + 1;
    });

    return { total, todayOrders, totalCOD, byStatus };
  }, [orders]);

  // ── Note Analysis ──
  const noteAnalysis = useMemo(() => {
    const result = {}; // key → [{order, noteText}]

    orders.filter(Boolean).forEach((order) => {
      // Collect notes from courier tracking updates
      const trackingNotes = order?.courier?.trackingHistory || [];
      const allNoteTexts = [];

      if (Array.isArray(trackingNotes)) {
        trackingNotes.forEach((t) => {
          if (t?.message || t?.note || t?.description) {
            allNoteTexts.push(t.message || t.note || t.description);
          }
        });
      }

      // Also check top-level note fields
      ["note", "notes", "remark", "deliveryNote"].forEach((field) => {
        if (order[field]) allNoteTexts.push(order[field]);
      });

      allNoteTexts.forEach((noteText) => {
        if (!noteText) return;
        const key = classifyNote(noteText) || "other";
        if (!result[key]) result[key] = [];
        result[key].push({ order, noteText });
      });
    });

    return result;
  }, [orders]);

  const STATUS_COLORS = {
    Pending: "#f59e0b",
    Booked: "#3b82f6",
    Confirmed: "#8b5cf6",
    Cancelled: "#ef4444",
    Delivered: "#10b981",
    Returned: "#6b7280",
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 36 }}>⏳</div>
        <div style={{ color: "#6b7280", fontWeight: 500 }}>
          ডেটা লোড হচ্ছে...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fef2f2",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 36 }}>❌</div>
        <div style={{ color: "#ef4444", fontWeight: 600 }}>{error}</div>
        <button
          onClick={fetchOrders}
          style={{
            marginTop: 8,
            padding: "8px 20px",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <Link
          href="/"
          style={{
            background: "#f3f4f6",
            border: "none",
            borderRadius: 8,
            padding: "6px 14px",
            fontWeight: 600,
            color: "#374151",
            cursor: "pointer",
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          ← অর্ডার লিস্ট
        </Link>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#111",
            margin: 0,
            flex: 1,
          }}
        >
          📊 ড্যাশবোর্ড
        </h1>
        <button
          onClick={fetchOrders}
          style={{
            background: "#ecfdf5",
            color: "#059669",
            border: "1px solid #a7f3d0",
            borderRadius: 8,
            padding: "6px 14px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          🔄 রিফ্রেশ
        </button>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* ── Top Stat Cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 28,
          }}
        >
          <StatCard
            icon="📦"
            label="মোট অর্ডার"
            value={stats.total}
            color="#3b82f6"
            delay={0}
          />
          <StatCard
            icon="🕐"
            label="আজকের অর্ডার"
            value={stats.todayOrders.length}
            sub={`মোটের ${stats.total > 0 ? Math.round((stats.todayOrders.length / stats.total) * 100) : 0}%`}
            color="#f59e0b"
            delay={80}
          />
          <StatCard
            icon="💵"
            label="মোট COD"
            value={formatBDT(stats.totalCOD)}
            color="#10b981"
            delay={160}
          />
          <StatCard
            icon="⏳"
            label="পেন্ডিং"
            value={stats.byStatus["Pending"] || 0}
            color="#f59e0b"
            delay={240}
          />
        </div>

        {/* ── Status Breakdown ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 24px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#111",
              marginBottom: 18,
              margin: "0 0 18px 0",
            }}
          >
            📋 স্ট্যাটাস ব্রেকডাউন
          </h2>
          {Object.entries(stats.byStatus).length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 14 }}>কোনো ডেটা নেই।</p>
          ) : (
            Object.entries(stats.byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <StatusBar
                  key={status}
                  label={status}
                  count={count}
                  total={stats.total}
                  color={STATUS_COLORS[status] || "#6366f1"}
                />
              ))
          )}
        </div>

        {/* ── Note Analysis ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 24px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#111",
              margin: "0 0 6px 0",
            }}
          >
            🗒️ ট্র্যাকিং নোট অ্যানালাইসিস
          </h2>
          <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 18 }}>
            কুরিয়ারের আপডেট ও ডেলিভারি ম্যানের নোট ক্যাটাগরি অনুযায়ী
          </p>

          {Object.keys(noteAnalysis).length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 14 }}>
              কোনো নোট/ট্র্যাকিং আপডেট পাওয়া যায়নি।{" "}
              <span style={{ fontSize: 12 }}>
                (নোট ডেটা courier.trackingHistory বা note ফিল্ডে থাকতে হবে)
              </span>
            </p>
          ) : (
            <>
              {NOTE_CATEGORIES.filter((cat) => noteAnalysis[cat.key]?.length).map(
                (cat) => (
                  <NoteCard
                    key={cat.key}
                    cat={cat}
                    items={noteAnalysis[cat.key]}
                  />
                )
              )}
              {noteAnalysis["other"]?.length > 0 && (
                <NoteCard
                  cat={{
                    key: "other",
                    label: "অন্যান্য নোট",
                    color: "#6b7280",
                    bg: "#f9fafb",
                    border: "#e5e7eb",
                    icon: "🔖",
                  }}
                  items={noteAnalysis["other"]}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}