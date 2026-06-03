"use client";
import React, { useState, useEffect } from "react";
import OrderList from "../components/OrderList";
import ManualInput from "../components/ManualInput";
import { STATUS_TABS } from "../constants/data";
import Link from "next/link";
import { useOrders } from "../context/OrderContext"; // কাস্টম হুক ইমপোর্ট

export default function Page() {
  const {
    orders,
    activeStatus,
    setActiveStatus,
    loading,
    searchQuery,
    setSearchQuery,
    filteredOrders,
    allPendingOrder,
    handleOrderUpdate,
    inportantNotes,
    searchWaiting,
  } = useOrders();

  const [isAnimating, setIsAnimating] = useState(false);

  // অ্যানিমেশন ইফেক্ট (এটি লোকাল UI এর জন্য, তাই এখানেই থাকবে)
  useEffect(() => {
    setIsAnimating(true);
    const t = setTimeout(() => setIsAnimating(false), 180);
    return () => clearTimeout(t);
  }, [activeStatus]);


  const getButtonClasses = (status) => {
    const base =
      "md:px-4 p-1 md:py-2 font-semibold cursor-pointer text-sm rounded-md transition";
    return activeStatus === status
      ? `${base} bg-green-600 text-white`
      : `${base} bg-gray-200 text-gray-700`;
  };
  const countAttention = inportantNotes.length;
  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-100">
          <Link href="/comment">----------comment-----</Link>
      <header className="p-1 md:p-3 bg-white border-b border-gray-200 shadow-md flex-shrink-0 z-10">
        {/* ----------সার্চ বার ও ড্যাশবোর্ড বাটন -----------*/}
        <div className="flex justify-between ">
          <div className="flex-1 mr-4">
            <div className="relative">
              <input
                type="text"
                placeholder="নাম, ফোন, বা অর্ডার ID দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-2 py-1 border border-gray-300 rounded-md focus:ring-indigo-200 focus:border-indigo-200 transition duration-11 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 my-0.5 flex items-center text-gray-100 bg-red-400 rounded-md px-2"
                  onClick={() => setSearchQuery("")}
                >
                  X
                </button>
              )}
            </div>
          </div>

          {/* Dashboard button */}
          <Link
            href="/dashboard"
            className="relative bg-green-700 px-2 text-lg text-green-100 mb-1 md:mb-2 rounded-sm flex items-center gap-1"
          >
            Dashboard
            {countAttention > 0 && (
              <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-xs font-bold rounded-lg w-5 h-5 flex items-center justify-center leading-none">
              {countAttention}
            </span>
            )}
          </Link>
        </div>

        {/* -----------স্ট্যাটাস ট্যাব সেকশন -------------*/}
        <div className="flex overflow-x-auto w-auto gap-0.5 md:gap-2 whitespace-nowrap mt-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStatus(tab.key)}
              className={getButtonClasses(tab.key)}
            >
              {`${tab.label} ${
                tab.key === "All"
                  ? allPendingOrder.length
                  : orders.filter((o) => o?.orderStatus === tab.key).length
              }`}
            </button>
          ))}
        </div>

          {/* seatch result counter */}
        <div className="ms-2 text-purple-500 font-bold mt-1">
          {searchWaiting && <p>Searching...</p>}
          {searchQuery && <p>{filteredOrders.length} Result </p>}
        </div>
      </header>

      {/* মেইন কন্টেন্ট এরিয়া */}
      <div
        className={`flex-1 overflow-y-auto p-1.5 md:p-4 bg-gray-100 pb-36 
          ${isAnimating ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"}
        `}
      >
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            অর্ডার লোড হচ্ছে...
          </div>
        ) : (
          <OrderList
            orders={filteredOrders}
            onOrderUpdate={handleOrderUpdate} // OrderBubble-এর জন্য গ্লোবাল আপডেট ফাংশন প্রপ্স হিসেবে পাস হচ্ছে
            activeStatus={activeStatus}
          />
        )}
      </div>

      {/* ম্যানুয়াল ইনপুট সেকশন */}
      <div className="fixed bottom-0 left-0 right-0 px-1 py-2 bg-white border-t border-gray-200 shadow-2xl z-20">
        <ManualInput onUpdate={handleOrderUpdate} />
      </div>
    </div>
  );
}
