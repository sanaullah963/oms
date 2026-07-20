"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import FacebookPageManager from "@/components/dashboard/FacebookPageManager";
import { facebookPageService } from "@/services/facebookPageService";

function FacebookPagesContent() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await facebookPageService.list();
      setPages(res.data.pages);
    } catch (err) {
      console.error("Facebook pages fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return (
    <div className="p-2 md:p-6 bg-gray-100 min-h-screen">
      <SearchAndMenu />
      <div className="max-w-4xl mx-auto mt-3 space-y-4 pb-10">
        <div>
          <Link href="/dashboard" className="text-sm text-indigo-600 font-medium">
            ← ড্যাশবোর্ড
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">
            📄 Facebook পেজ ম্যানেজমেন্ট
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            প্রতিটা পেজের নিজস্ব Access Token এখানে যোগ/আপডেট করুন — নাহলে ওই পেজের কমেন্টে রিপ্লাই/ব্লক/ডিলিট কাজ করবে না।
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">লোড হচ্ছে...</div>
        ) : (
          <FacebookPageManager pages={pages} onRefresh={fetchPages} />
        )}
      </div>
    </div>
  );
}

export default function FacebookPagesPage() {
  return (
    <AuthGuard adminOnly>
      <FacebookPagesContent />
    </AuthGuard>
  );
}