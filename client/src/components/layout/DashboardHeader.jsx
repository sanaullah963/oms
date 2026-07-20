import Link from "next/link";
import React from "react";

function DashboardHeader({ totalItems }) {
  return (
    <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <Link
        href="/"
        className="bg-gray-100 rounded-lg px-3.5 py-1.5 font-semibold text-gray-700 text-sm no-underline"
      >
        ← অর্ডার লিস্ট
      </Link>
      <h1 className="text-[17px] font-bold text-[#111111] m-0 flex-1">📊 {totalItems}</h1>

      <button className="bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg px-3.5 py-1.5 font-semibold cursor-pointer text-[13px]">
        🔄 রিফ্রেশ
      </button>
    </header>
  );
}

export default DashboardHeader;
