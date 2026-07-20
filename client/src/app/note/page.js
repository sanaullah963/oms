"use client";
import NoteBubble from "@/components/orders/NoteBubble";
import React from "react";
import { useOrders } from "@/context/OrderContext";
import DashboardHeader from "@/components/layout/DashboardHeader";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import AuthGuard from "@/components/auth/AuthGuard";

function NotePageContent() {
  const { handleOrderUpdate, inportantNotes } = useOrders();

  return (
    <div className="p-1 md:p-4 bg-gray-100 pb-36">
      <SearchAndMenu />
      <DashboardHeader totalItems={inportantNotes.length} />
      {inportantNotes.map((order) => (
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
