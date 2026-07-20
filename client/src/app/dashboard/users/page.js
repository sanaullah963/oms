"use client";
import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/services/userService";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import UserManagementTable from "@/components/dashboard/UserManagementTable";
import Link from "next/link";

function UsersPageContent() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list();
      setUsers(res.data.users);
    } catch (err) {
      console.error("User list fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const pendingCount = users.filter((u) => !u.isApproved).length;

  return (
    <div className="p-2 md:p-6 bg-gray-100 min-h-screen">
      <SearchAndMenu />
      <div className="max-w-4xl mx-auto mt-3 space-y-4 pb-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <Link href="/dashboard" className="text-sm text-indigo-600 font-medium">
              ← ড্যাশবোর্ড
            </Link>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">👥 ইউজার ম্যানেজমেন্ট</h1>
          </div>
          {pendingCount > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-sm font-semibold px-3 py-1.5 rounded-full">
              {pendingCount}টি একাউন্ট অনুমোদনের অপেক্ষায়
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">লোড হচ্ছে...</div>
        ) : (
          <UserManagementTable users={users} currentUserId={user?._id} onRefresh={fetchUsers} />
        )}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <AuthGuard adminOnly>
      <UsersPageContent />
    </AuthGuard>
  );
}
