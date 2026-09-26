"use client";
import React, { useState } from "react";
import { toast } from "react-toastify";
import DraftOrderCard from "./DraftOrderCard";
import { useOrders } from "@/context/OrderContext";

export default function DraftOrderList({ drafts, loading }) {
  const { fetchDraftCourierHistoryBulk } = useOrders();

  // ✅ একসাথে একাধিক ড্রাফট সিলেক্ট করে বাল্ক "History" নেওয়ার জন্য (OrderList-এর
  // selectMode/selectedIds প্যাটার্নের হুবহু কপি)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkHistoryLoading, setBulkHistoryLoading] = useState(false);

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

  // --- সিলেক্ট মোড অন/অফ (অফ করলে সিলেকশনও ক্লিয়ার হয়ে যায়) ---
  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds([]);
  };

  const handleToggleSelect = (draftId) => {
    setSelectedIds((prev) =>
      prev.includes(draftId) ? prev.filter((id) => id !== draftId) : [...prev, draftId],
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(drafts.map((draft) => draft._id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // --- সিলেক্টেড ড্রাফটগুলোর জন্য একবারে (একটাই রিকোয়েস্টে) কুরিয়ার হিস্ট্রি ফেচ ---
  const handleBulkHistory = async () => {
    if (selectedIds.length === 0) return;
    setBulkHistoryLoading(true);
    try {
      const response = await fetchDraftCourierHistoryBulk(selectedIds);
      const updatedDrafts = response.data?.drafts || [];
      toast.success(`${updatedDrafts.length}টা ড্রাফটের হিস্ট্রি আপডেট হয়েছে`);
      setSelectedIds([]);
    } catch (error) {
      const message =
        error.response?.data?.message || "বাল্ক হিস্ট্রি আনতে ব্যর্থ হয়েছে।";
      toast.error(message);
      console.error("Bulk draft history error:", error);
    } finally {
      setBulkHistoryLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-3 mb-16">
      {/* ✅ একাধিক ড্রাফট সিলেক্ট করে বাল্ক অ্যাকশন নেওয়ার টগল + টুলবার */}
      <div className="flex items-center gap-2">
        <button
          className={`text-sm px-3 py-1.5 rounded-md border ${
            selectMode
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-700 border-gray-300"
          }`}
          onClick={toggleSelectMode}
        >
          {selectMode ? "সিলেক্ট বাতিল" : "একাধিক সিলেক্ট"}
        </button>
      </div>

      {selectMode && (
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-2">
          <span className="text-sm text-gray-600">{selectedIds.length}টা সিলেক্টেড</span>
          <button
            className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700"
            onClick={handleSelectAll}
          >
            সব সিলেক্ট
          </button>
          <button
            className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700"
            onClick={handleClearSelection}
          >
            ক্লিয়ার
          </button>
          <button
            className="text-xs px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleBulkHistory}
            disabled={selectedIds.length === 0 || bulkHistoryLoading}
          >
            {bulkHistoryLoading ? "লোডিং..." : "সিলেক্টেডগুলোর হিস্ট্রি"}
          </button>
        </div>
      )}

      {drafts.map((draft) => (
        <DraftOrderCard
          key={draft?._id}
          draft={draft}
          selectMode={selectMode}
          isSelected={selectedIds.includes(draft._id)}
          onToggleSelect={handleToggleSelect}
        />
      ))}
    </div>
  );
}