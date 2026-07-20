"use client";
import { useState } from "react";
import { userService } from "@/services/userService";

export default function UserManagementTable({ users, currentUserId, onRefresh }) {
  const [busyId, setBusyId] = useState(null);

  const handleApprovalToggle = async (userItem) => {
    setBusyId(userItem._id);
    try {
      await userService.setApproval(userItem._id, !userItem.isApproved);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "আপডেট ব্যর্থ হয়েছে।");
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = async (userItem, newRole) => {
    setBusyId(userItem._id);
    try {
      await userService.setRole(userItem._id, newRole);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "আপডেট ব্যর্থ হয়েছে।");
    } finally {
      setBusyId(null);
    }
  };

  if (!users || users.length === 0) {
    return <div className="text-center text-gray-500 py-10">কোনো ইউজার পাওয়া যায়নি।</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b bg-gray-50">
            <th className="py-2 px-3">নাম</th>
            <th className="py-2 px-3">ফোন</th>
            <th className="py-2 px-3">Role</th>
            <th className="py-2 px-3">স্ট্যাটাস</th>
            <th className="py-2 px-3">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} className="border-b last:border-0">
              <td className="py-2 px-3 font-medium">
                {u.name} {u._id === currentUserId && <span className="text-xs text-gray-400">(আপনি)</span>}
              </td>
              <td className="py-2 px-3 text-blue-600">{u.phone}</td>
              <td className="py-2 px-3">
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u, e.target.value)}
                  disabled={busyId === u._id || u._id === currentUserId}
                  className="border border-gray-300 rounded px-2 py-1 text-xs disabled:opacity-50"
                >
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="py-2 px-3">
                {u.isApproved ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    ✅ সক্রিয়
                  </span>
                ) : (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    ⏳ অপেক্ষমাণ
                  </span>
                )}
              </td>
              <td className="py-2 px-3">
                <button
                  onClick={() => handleApprovalToggle(u)}
                  disabled={busyId === u._id || u._id === currentUserId}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition disabled:opacity-50 ${
                    u.isApproved
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {busyId === u._id ? "..." : u.isApproved ? "অ্যাক্সেস বন্ধ করুন" : "অনুমোদন দিন"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
