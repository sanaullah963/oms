"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import LandingPageManager from "@/components/dashboard/LandingPageManager";
import { landingPageService } from "@/services/landingPageService";

function LandingPagesContent() {
  const [pages, setPages] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await landingPageService.list();
      setPages(res.data.pages);
      setActiveCount(res.data.activeCount);
    } catch (err) {
      console.error("Landing pages fetch error:", err);
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <Link href="/dashboard" className="text-sm text-indigo-600 font-medium">
              ← ড্যাশবোর্ড
            </Link>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">
              🖥️ ল্যান্ডিং পেজ ম্যানেজমেন্ট
            </h1>
          </div>
          <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1.5 rounded-full">
            {activeCount}টি সক্রিয় পেজ
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">লোড হচ্ছে...</div>
        ) : (
          <LandingPageManager pages={pages} onRefresh={fetchPages} />
        )}
      </div>
    </div>
  );
}

export default function LandingPagesPage() {
  return (
    <AuthGuard adminOnly>
      <LandingPagesContent />
    </AuthGuard>
  );
}