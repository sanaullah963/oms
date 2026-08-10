"use client";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import EventLogViewer from "@/components/dashboard/EventLogViewer";

function EventLogsContent() {
  return (
    <div className="p-2 md:p-6 bg-gray-100 min-h-screen">
      <SearchAndMenu />
      <div className="max-w-4xl mx-auto mt-3 space-y-4 pb-10">
        <div>
          <Link href="/dashboard" className="text-sm text-indigo-600 font-medium">
            ← ড্যাশবোর্ড
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">
            📡 Meta Pixel/CAPI Event Log
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Purchase, Lead ইত্যাদি ইভেন্ট Meta-তে পাঠানোর ইতিহাস — ব্যর্থ হলে এখান থেকে আবার পাঠানো যাবে।
          </p>
        </div>

        <EventLogViewer />
      </div>
    </div>
  );
}

export default function EventLogsPage() {
  return (
    <AuthGuard adminOnly>
      <EventLogsContent />
    </AuthGuard>
  );
}