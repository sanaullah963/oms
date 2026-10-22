"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// requiredPermission="some.key" দিলে (config/permissions.js-এর রেজিস্ট্রির key) পেজটা শুধু ওই পারমিশন-ওয়ালা
// (বা admin) দেখতে পারবে — যেকোনো নতুন পেজ/URL এভাবে আটকানো যায়। সার্ভারের API-ও আলাদাভাবে
// requirePermission("some.key") দিয়ে আটকাতে হবে (এটা শুধু UI গার্ড)।
// redirectTo: adminOnly ব্যর্থ হলে কোথায় পাঠানো হবে (ডিফল্ট "/")
export default function AuthGuard({
  children,
  adminOnly = false,
  requiredPermission = null,
  redirectTo = "/",
}) {
  const { user, loading, isAuthenticated, isAdmin, can } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (adminOnly && !isAdmin) {
      router.replace(redirectTo);
      return;
    }
    if (requiredPermission && !can(requiredPermission)) {
      console.log(`🚫 Page blocked — missing permission: ${requiredPermission}`);
      router.replace("/");
    }
  }, [loading, isAuthenticated, isAdmin, adminOnly, requiredPermission, can, router, redirectTo]);

  if (
    loading ||
    !isAuthenticated ||
    (adminOnly && !isAdmin) ||
    (requiredPermission && !can(requiredPermission))
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500">
        লোড হচ্ছে...
      </div>
    );
  }

  return children;
}
