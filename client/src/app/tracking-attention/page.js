"use client";
import TrackingAttentionCard from "@/components/orders/TrackingAttentionCard";
import React from "react";
import { ToastContainer } from "react-toastify";
import { useOrders } from "@/context/OrderContext";
import DashboardHeader from "@/components/layout/DashboardHeader";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import AuthGuard from "@/components/auth/AuthGuard";
import { convertNumber } from "@/utils/numberUtils";

function TrackingAttentionPageContent() {
  const { handleOrderUpdate, trackingAttentionOrders, searchQuery } = useOrders();

  // সার্চ থাকলে এই লিস্টের মধ্যেই লোকাল ফিল্টার (নাম/ফোন/ID/ঠিকানা)
  const query = searchQuery.toLowerCase().trim();
  const visibleOrders = query
    ? trackingAttentionOrders.filter((order) => {
        const fields = [
          order?._id,
          order?.castomerName,
          convertNumber(order?.castomerPhone),
          order?.productCode,
          order?.rawInputText,
          order?.courier?.trackingId,
        ];
        return fields.some((f) => f && String(f).toLowerCase().includes(query));
      })
    : trackingAttentionOrders;

  return (
    <div className="p-1 md:p-4 bg-gray-100 pb-36">
      <ToastContainer autoClose={1500} />
      {/* scope অচেনা রাখা হয়েছে — "orders" না হওয়ায় DB সার্চ চলে না, শুধু লোকাল ফিল্টার */}
      <SearchAndMenu scope="trackingAttention" />
      <DashboardHeader totalItems={visibleOrders.length} />
      {visibleOrders.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          {query
            ? "কোনো অর্ডার পাওয়া যায়নি।"
            : "ট্র্যাকিং যাচাই করার মতো কোনো অর্ডার নেই।"}
        </div>
      )}
      {visibleOrders.map((order) => (
        <TrackingAttentionCard
          key={order?._id}
          order={order}
          onUpdate={handleOrderUpdate}
        />
      ))}
    </div>
  );
}

export default function TrackingAttentionPage() {
  return (
    <AuthGuard>
      <TrackingAttentionPageContent />
    </AuthGuard>
  );
}
