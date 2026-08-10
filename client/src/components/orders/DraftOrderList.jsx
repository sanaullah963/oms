"use client";
import React from "react";
import DraftOrderCard from "./DraftOrderCard";

export default function DraftOrderList({ drafts, loading }) {
  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">ইনকমপ্লিট অর্ডার লোড হচ্ছে...</div>
    );
  }

  if (!drafts || drafts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md mt-4">
        <p className="text-lg font-semibold">🎉 কোনো ইনকমপ্লিট অর্ডার নেই।</p>
        <p className="text-sm mt-1">
          কোনো কাস্টমার ল্যান্ডিং পেজে ফর্ম পূরণ শুরু করে সাবমিট না করা পর্যন্ত এখানে দেখাবে।
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 mb-16">
      {drafts.map((draft) => (
        <DraftOrderCard key={draft?._id} draft={draft} />
      ))}
    </div>
  );
}
