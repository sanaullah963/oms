"use client";
import NoteBubble from "@/components/NoteBubble";
import React from "react";
import { useOrders } from "@/context/OrderContext";
import DashboardHeader from "@/components/DashboardHeader";

  // const sortedDates = Object.keys(groupedOrders);

function page() {
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
  } = useOrders();
  console.log("inportantNotes", inportantNotes);
  //inportant Notes sent order array
  return (
    <div className="p-1.5 md:p-4 bg-gray-100 pb-36">
      <DashboardHeader />
      {
        inportantNotes.map((order) => (
          <NoteBubble key={order?._id} order={order} onUpdate={handleOrderUpdate} />
        ))
      }
    </div>
  );
}

export default page;


function StatusBar({ label, count, total, barColor }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-3.5">
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">
          {count} <span className="text-gray-300">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

