"use client";
import NoteBubble from "@/components/orders/NoteBubble";
import React from "react";
import { useOrders } from "@/context/OrderContext";
import DashboardHeader from "@/components/layout/DashboardHeader";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import AuthGuard from "@/components/auth/AuthGuard";

function NotePageContent() {
  const { handleOrderUpdate, inportantNotes, filteredImportantNotes, searchQuery } =
    useOrders();

  // সার্চ থাকলে ফিল্টার করা নোট দেখাবে, নাহলে সবগুলো নোট
  const visibleNotes = searchQuery ? filteredImportantNotes : inportantNotes;

  return (
    <div className="p-1 md:p-4 bg-gray-100 pb-36">
      <SearchAndMenu scope="notes" />
      <DashboardHeader totalItems={visibleNotes.length} />
      {searchQuery && visibleNotes.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          কোনো নোট পাওয়া যায়নি।
        </div>
      )}
      {visibleNotes.map((order) => (
        <NoteBubble key={order?._id} order={order} onUpdate={handleOrderUpdate} />
      ))}
    </div>
  );
}

export default function NotePage() {
  return (
    <AuthGuard>
      <NotePageContent />
    </AuthGuard>
  );
}