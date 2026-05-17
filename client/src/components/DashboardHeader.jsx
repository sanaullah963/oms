
import Link from 'next/link'
import React from 'react'

function DashboardHeader() {
  return (
    <header style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "12px 20px", display: "flex", alignItems: "center",
        gap: 12, position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <Link href="/" style={{ background: "#f3f4f6", borderRadius: 8, padding: "6px 14px", fontWeight: 600, color: "#374151", fontSize: 14, textDecoration: "none" }}>
          ← অর্ডার লিস্ট
        </Link>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "#111", margin: 0, flex: 1 }}>
          📊 ড্যাশবোর্ড
        </h1>
        {/* {attentionCount > 0 && (
          <span style={{ background: "#ef4444", color: "#fff", borderRadius: 99, padding: "4px 12px", fontSize: 13, fontWeight: 700 }}>
            🔔 {attentionCount} আনরিড
          </span>
        )} */}
        <button  style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", borderRadius: 8, padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
          🔄 রিফ্রেশ
        </button>
      </header>
  )
}

export default DashboardHeader