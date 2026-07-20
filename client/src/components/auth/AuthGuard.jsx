"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuthGuard({ children, adminOnly = false }) {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (adminOnly && !isAdmin) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, isAdmin, adminOnly, router]);

  if (loading || !isAuthenticated || (adminOnly && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500">
        লোড হচ্ছে...
      </div>
    );
  }

  return children;
}
