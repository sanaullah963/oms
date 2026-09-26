"use client";
import React, { useState } from "react";
import { toast } from "react-toastify";
import OrderCard from "./OrderCard";
import { groupOrdersByDate, groupOrdersByLastUpdatedDate, multupleOrderCheck } from "@/utils/orderHelpers";
import { formatDate } from "@/utils/dateUtils";
import ToggleSwitch from "@/components/common/ToggleSwitch";
import { orderService } from "@/services/orderService";

export default function OrderList({ orders, onOrderUpdate, activeStatus, setSearchQuery }) {
  const [sortByLast, setSortByLast] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ একসাথে একাধিক অর্ডার সিলেক্ট করে বাল্ক অ্যাকশন (আপাতত শুধু "History") নেওয়ার জন্য
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkHistoryLoading, setBulkHistoryLoading] = useState(false);
  const groupedOrders = React.useMemo(() => {
    if (!orders) return {};
    return sortByLast ? groupOrdersByLastUpdatedDate(orders) : groupOrdersByDate(orders);
  }, [orders, sortByLast]);

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md mt-4">
        <p className="text-lg font-semibold">🔍 কোনো অর্ডার পাওয়া যায়নি।</p>
      </div>
    );
  }

  const handleOrderSort = (value) => {
    setSortByLast(value);
  };

  // --- একসাথে সব কনফার্মড অর্ডার Steadfast-এ বুকিং করা ---
  const handleBulkInput = async () => {
    setLoading(true);
    try {
      const orderIds = orders.map((order) => order._id);
      if (!orderIds.length) return;
      await orderService.bookSteadfastBulk(orderIds);
    } catch (error) {
      console.error("Bulk booking error:", error);
    } finally {
      setLoading(false);
    }
  };

  const duplicatePhones = multupleOrderCheck(orders);
  const sortedDates = Object.keys(groupedOrders);

  // --- সিলেক্ট মোড অন/অফ (অফ করলে সিলেকশনও ক্লিয়ার হয়ে যায়) ---
  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds([]);
  };

  const handleToggleSelect = (orderId) => {
    setSelectedIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(orders.map((order) => order._id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // --- সিলেক্টেড অর্ডারগুলোর জন্য একবারে (একটাই রিকোয়েস্টে) কুরিয়ার হিস্ট্রি ফেচ ---
  const handleBulkHistory = async () => {
    if (selectedIds.length === 0) return;
    setBulkHistoryLoading(true);
    try {
      const response = await orderService.getCourierHistoryBulk(selectedIds);
      const updatedOrders = response.data?.orders || [];
      updatedOrders.forEach((order) => onOrderUpdate(order));
      toast.success(`${updatedOrders.length}টা অর্ডারের হিস্ট্রি আপডেট হয়েছে`);
      setSelectedIds([]);
    } catch (error) {
      const message =
        error.response?.data?.message || "বাল্ক হিস্ট্রি আনতে ব্যর্থ হয়েছে।";
      toast.error(message);
      console.error("Bulk history error:", error);
    } finally {
      setBulkHistoryLoading(false);
    }
  };

// console.log(orders)
  return (
    <div className="flex flex-col space-y-4 mb-16">
      {/* একই ফোন নম্বরে একাধিক পেন্ডিং অর্ডার থাকলে দেখানো */}
      <div className="flex flex-wrap gap-2 cursor-pointer">
        {Object.entries(duplicatePhones).map(([phoneNumber, count]) => (
          <div
            key={phoneNumber}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-gray-900 border border-gray-800 rounded-md"
            onClick={() => {
              setSearchQuery(phoneNumber);
              navigator.clipboard.writeText(phoneNumber);
            }}
          >
            <span className="text-sm font-medium text-gray-200 tracking-wide">{phoneNumber}</span>
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs font-bold text-amber-400">
              {count}
            </span>
          </div>
        ))}
      </div>

      <ToggleSwitch
        storageKey="sort_order_by_date"
        onValue={handleOrderSort}
        offText="অ্যাড করার সময় অনুসারে"
        onText="সর্বশেষ অপডেট অনুসারে"
      />

      {activeStatus === "Confirmed" && (
        <button
          className="bg-green-600 text-white px-4 py-2 rounded-md"
          onClick={handleBulkInput}
          disabled={loading}
        >
          {loading ? "লোডিং..." : "BUlK  INPUT"}
        </button>
      )}

      {/* ✅ একাধিক অর্ডার সিলেক্ট করে বাল্ক অ্যাকশন নেওয়ার টগল + টুলবার */}
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

      {sortedDates.map((date) => (
        <div key={date}>
          <div className="relative flex justify-center my-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200" />
            </div>
            <span className="relative z-10 bg-green-700 text-gray-50 text-sm font-medium px-4 py-1.5 rounded-full shadow-md">
              {formatDate(date)}
            </span>
          </div>

          <div className="flex flex-col space-y-3">
            {groupedOrders[date].map((order) => (
              <OrderCard
                key={order?._id}
                order={order}
                onUpdate={onOrderUpdate}
                setSearchQuery={setSearchQuery}
                selectMode={selectMode}
                isSelected={selectedIds.includes(order._id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}