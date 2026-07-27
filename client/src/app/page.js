"use client";
import React, { useState, useEffect } from "react";
import OrderList from "@/components/orders/OrderList";
import ManualOrderInput from "@/components/orders/ManualOrderInput";
import { STATUS_TABS } from "@/constants/orderConstants";
import { useOrders } from "@/context/OrderContext";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import AuthGuard from "@/components/auth/AuthGuard";
const date = new Date();

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
  } = useOrders();

  const [isAnimating, setIsAnimating] = useState(false);

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
  const formattedDate = new Intl.DateTimeFormat({
    day: "numeric",
    month: "numeric",
    year: "2-digit",
  }).format(date);
  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-100">
      <header className="px-1 py-0 md:p-3 bg-white border-b border-gray-200 shadow-md flex-shrink-0 z-10">
        <div className=" flex gap-3">
          <span className="text-purple-700 text-xs md:text-sm">{day}</span>
          <span className=" text-xs md:text-sm">{formattedDate}</span>
        </div>
        <SearchAndMenu />

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

        <div className="ms-2 text-purple-500 font-bold mt-1">
          {searchWaiting && <p>Searching...</p>}
          {searchQuery && <p>{filteredOrders.length} Result </p>}
        </div>
      </header>

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
