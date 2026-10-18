"use client";
import { Fragment, useState } from "react";
import { userService } from "@/services/userService";

// permissionRegistry: সার্ভারের config/permissions.js-এর লিস্ট (GET /api/users-এর সাথে আসে) —
// টগলগুলো এখান থেকেই নিজে নিজে তৈরি হয়, নতুন পারমিশন যোগ করলে এখানে কিছু বদলাতে হয় না।
export default function UserManagementTable({
  users,
  currentUserId,
  onRefresh,
  permissionRegistry = [],
}) {
  const [busyId, setBusyId] = useState(null);
  // কোন মডারেটরের পারমিশন প্যানেল খোলা আছে
  const [openPermId, setOpenPermId] = useState(null);
  // সেভ হওয়া পারমিশন (userId → { key: bool }) — onRefresh ছাড়াই UI আপডেট রাখে, তাই প্যানেল বন্ধ হয়ে যায় না
  const [permState, setPermState] = useState({});
  const [permBusyKey, setPermBusyKey] = useState(null); // "<userId>:<permKey>"

  const getPerms = (u) => permState[u._id] || u.permissions || {};

  const handlePermissionToggle = async (userItem, key, nextValue) => {
    const busyKey = `${userItem._id}:${key}`;
    setPermBusyKey(busyKey);
    try {
      const res = await userService.setPermissions(userItem._id, {
        [key]: nextValue,
      });
      console.log(
        "🔐 Permission saved:",
        userItem.name,
        key,
        nextValue,
        res.data?.user?.permissions,
      );
      setPermState((prev) => ({
        ...prev,
        [userItem._id]: res.data.user.permissions,
      }));
    } catch (err) {
      console.error("Permission update error:", err);
      alert(err.response?.data?.message || "পারমিশন আপডেট ব্যর্থ হয়েছে।");
    } finally {
      setPermBusyKey(null);
    }
  };

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
    return (
      <div className="text-center text-gray-500 py-10">
        কোনো ইউজার পাওয়া যায়নি।
      </div>
    );
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
            <th className="py-2 px-3">পারমিশন</th>
            <th className="py-2 px-3">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const perms = getPerms(u);
            const enabledCount = permissionRegistry.filter(
              (p) => perms[p.key],
            ).length;
            const isOpen = openPermId === u._id;
            return (
              <Fragment key={u._id}>
                <tr className="border-b last:border-0">
                  <td className="py-2 px-3 font-medium">
                    {u.name}{" "}
                    {u._id === currentUserId && (
                      <span className="text-xs text-gray-400">(আপনি)</span>
                    )}
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
                    {u.role === "admin" ? (
                      <span className="text-xs text-gray-400">
                        সব অ্যাক্সেস
                      </span>
                    ) : (
                      <button
                        onClick={() => setOpenPermId(isOpen ? null : u._id)}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        🔐 পারমিশন ({enabledCount}/{permissionRegistry.length}){" "}
                        {isOpen ? "▲" : "▼"}
                      </button>
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
                      {busyId === u._id
                        ? "..."
                        : u.isApproved
                          ? "অ্যাক্সেস বন্ধ করুন"
                          : "অনুমোদন দিন"}
                    </button>
                  </td>
                </tr>
                {isOpen && u.role !== "admin" && (
                  <tr className="border-b bg-indigo-50/40">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="text-xs text-gray-500 mb-2">
                        {u.name}-এর অ্যাক্সেস সেটিং — টগল করলেই সাথে সাথে সেভ
                        হয় ও ওই মডারেটরের স্ক্রিনে লাইভ কার্যকর হয়।
                      </div>
                      <div className="space-y-2">
                        {permissionRegistry.map((p) => {
                          const checked = !!perms[p.key];
                          const busy = permBusyKey === `${u._id}:${p.key}`;
                          return (
                            <label
                              key={p.key}
                              className="flex items-start justify-between gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer"
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-gray-800">
                                  {p.label}
                                </span>
                                <span className="block text-xs text-gray-500 mt-0.5">
                                  {p.description}
                                </span>
                              </span>
                              {/* <span className="relative inline-flex items-center shrink-0 mt-1">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={checked}
                              disabled={busy}
                              onChange={(e) => handlePermissionToggle(u, p.key, e.target.checked)}
                            />
                            <span
                              className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-indigo-600 peer-disabled:opacity-50
                              after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white
                              after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"
                            />
                          </span> */}

                              <span className="relative inline-flex items-center shrink-0 mt-1">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={checked}
                                  disabled={busy}
                                  onChange={(e) =>
                                    handlePermissionToggle(
                                      u,
                                      p.key,
                                      e.target.checked,
                                    )
                                  }
                                />

                                <span
                                  onClick={() => {
                                    if (!busy) {
                                      handlePermissionToggle(
                                        u,
                                        p.key,
                                        !checked,
                                      );
                                    }
                                  }}
                                  className={`relative block w-11 h-6 rounded-full transition-colors duration-200 ${
                                    checked ? "bg-indigo-600" : "bg-gray-300"
                                  } ${busy ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                >
                                  <span
                                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                                    style={{
                                      transform: checked
                                        ? "translateX(20px)"
                                        : "translateX(0)",
                                    }}
                                  />
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
