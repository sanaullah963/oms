"use client";
import React, { useState, useCallback } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import OrderFullDetail from "@/components/orders/OrderFullDetail";
import { orderService } from "@/services/orderService";
import Link from "next/link";

function SearchPageContent() {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const runSearch = useCallback(async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError("");
    try {
      const res = await orderService.masterSearch(q);
      setOrders(res.data?.orders || []);
      setSearched(true);
    } catch (err) {
      console.error("Master search error:", err);
      setError("সার্চ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="px-3 py-3 bg-white border-b border-gray-200 shadow-md sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-gray-800">🔍 মাস্টার সার্চ</h1>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            ← ফিরে যান
          </Link>
        </div>

        <form onSubmit={runSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="পার্সেল/অর্ডার ID, ট্র্যাকিং ID, বা ফোন নম্বর লিখুন..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-200 focus:border-indigo-200 text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {loading ? "খোঁজা হচ্ছে..." : "সার্চ করুন"}
          </button>
        </form>
      </header>

      <div className="p-3 max-w-3xl mx-auto">
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-md mb-3 text-sm">
            {error}
          </div>
        )}

        {searched && !loading && orders.length === 0 && !error && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md mt-4">
            <p className="text-lg font-semibold">😕 কোনো অর্ডার পাওয়া যায়নি।</p>
          </div>
        )}

        {orders.length > 0 && (
          <>  <div className="flex justify-between">
            <p className="text-sm text-gray-500 mb-2">
              {orders.length} টা অর্ডার পাওয়া গেছে
            </p>
            <button className="text-sm text-gray-800 bg-red-300 px-4 py-2 font-semibold cursor-pointer rounded-lg " onClick={() => setQuery("")}>clear</button>
          </div>
            
            <div className="flex flex-col space-y-3">
              {orders.map((order) => (
                <OrderFullDetail key={order._id} order={order} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <AuthGuard>
      <SearchPageContent />
    </AuthGuard>
  );
}