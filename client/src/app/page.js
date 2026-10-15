"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import OrderList from "@/components/orders/OrderList";
import DraftOrderList from "@/components/orders/DraftOrderList";
import ManualOrderInput from "@/components/orders/ManualOrderInput";
import { STATUS_TABS } from "@/constants/orderConstants";
import { useOrders } from "@/context/OrderContext";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import AuthGuard from "@/components/auth/AuthGuard";
import { formatDate } from "@/utils/dateUtils";
import { dashboardService } from "@/services/dashboardService";
const date = new Date();

// হেডারের তিনটা কাউন্টার বাটন (Attention Notes / Tracking Notes / Comments)
const COUNTER_BUTTONS = [
  {
    key: "attention",
    label: "Notes",
    title: "Attention Notes",
    href: "/note",
    color: "bg-red-500",
  },
  {
    key: "tracking",
    label: "Tracking",
    title: "Tracking Notes",
    href: "/tracking-attention",
    color: "bg-amber-500",
  },
  {
    key: "comments",
    label: "Comments",
    title: "Comments",
    href: "/comment",
    color: "bg-blue-500",
  },
];

function HomePageContent() {
  const {
    orders,
    activeStatus,
    setActiveStatus,
    loading,
    searchQuery,
    filteredOrders,
    allPendingOrder,
    handleOrderUpdate,
    setSearchQuery,
    searchWaiting,
    draftOrders,
    filteredDraftOrders,
    draftLoading,
  } = useOrders();

  // "Incomplete" ট্যাবে থাকলে সার্চবক্স ড্রাফট অর্ডারের মধ্যে খুঁজবে, নাহলে আগের মতোই
  // মূল অর্ডার লিস্টে
  const searchScope = activeStatus === "Incomplete" ? "drafts" : "orders";

  const [isAnimating, setIsAnimating] = useState(false);

  // ---------------- কাউন্টার (Attention / Tracking / Comments) ----------------
  // অর্ডার লোড শেষ হওয়ার পরেই, শুধু একবার, ব্যাকগ্রাউন্ডে আনা হয় — অর্ডার লোডিং এর জন্য
  // অপেক্ষা করে না। এরর হলে চুপচাপ উপেক্ষা (ব্যাজ লুকানো থাকে), অন্য কিছুতে প্রভাব নেই।
  const [counters, setCounters] = useState(null);
  const countersRequested = useRef(false);

  useEffect(() => {
    if (loading || countersRequested.current) return;
    countersRequested.current = true;
    dashboardService
      .getAttentionCounts()
      .then((res) => {
        if (res?.data) setCounters(res.data);
      })
      .catch((err) => console.error("Counters error:", err));
  }, [loading]);

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
  // time and date
  const day = new Intl.DateTimeFormat("bn-BD", {
    weekday: "long",
  }).format(date);

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-100">
      <header className="px-1 py-0 md:p-3 bg-white border-b border-gray-200 shadow-md flex-shrink-0 z-10">
        <div className=" flex items-center gap-2">
          <span className="text-purple-700 text-xs md:text-sm">{day}</span>
          <span className=" text-xs md:text-sm">{formatDate(date)}</span>

          {/* কাউন্টার বাটন — ছোট, মোবাইলে জায়গা কম নেয়; সংখ্যা আসার আগে ব্যাজ দেখায় না */}
          <div className="ms-auto flex items-center gap-1.5">
            {COUNTER_BUTTONS.map((btn) => {
              const count = counters?.[btn.key];
              return (
                <Link
                  key={btn.key}
                  href={btn.href}
                  title={btn.title}
                  className="relative inline-flex bg-green-200 border border-gray-300 text-gray-700 text-xs md:text-sm font-semibold p-1 rounded-sm "
                >
                  {btn.label} {count > 0 &&  count }

                 
                </Link>
              );
            })}
          </div>
        </div>
        <SearchAndMenu scope={searchScope} />

        <div className="flex overflow-x-auto w-auto gap-0.5 md:gap-2 whitespace-nowrap mt-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStatus(tab.key)}
              className={getButtonClasses(tab.key)}
            >
              {`${tab.label} ${
                tab.key === "Incomplete"
                  ? draftOrders.length
                  : tab.key === "All"
                    ? allPendingOrder.length
                    : tab.key === "Review"
                      ? orders.filter(
                          (o) => o?.courier?.courierStatus === "review",
                        ).length
                      : orders.filter((o) => o?.orderStatus === tab.key).length
              }`}
            </button>
          ))}
        </div>

        <div className="ms-2 text-purple-500 font-bold mt-1">
          {searchScope === "orders" && searchWaiting && <p>Searching...</p>}
          {searchQuery && (
            <p>
              {searchScope === "drafts"
                ? filteredDraftOrders.length
                : filteredOrders.length}{" "}
              Result{" "}
            </p>
          )}
        </div>
      </header>

      <div
        className={`flex-1 overflow-y-auto p-1.5 md:p-4 bg-gray-100 pb-36 
          ${isAnimating ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"}
        `}
      >
        {activeStatus === "Incomplete" ? (
          <DraftOrderList
            drafts={searchQuery ? filteredDraftOrders : draftOrders}
            loading={draftLoading}
          />
        ) : loading ? (
          <div className="text-center py-10 text-gray-500">
            অর্ডার লোড হচ্ছে...
          </div>
        ) : (
          <OrderList
            orders={filteredOrders}
            onOrderUpdate={handleOrderUpdate}
            activeStatus={activeStatus}
            setSearchQuery={setSearchQuery}
          />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-1 py-2 bg-white border-t border-gray-200 shadow-2xl z-20">
        <ManualOrderInput onUpdate={handleOrderUpdate} />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <HomePageContent />
    </AuthGuard>
  );
}
