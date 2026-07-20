"use client";
import { useState, useEffect } from "react";
import { userService } from "@/services/userService";

export default function ModeratorSelector({ selectedModeratorId, onChange }) {
  const [moderators, setModerators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService
      .list()
      .then((res) => {
        setModerators(res.data.users.filter((u) => u.role === "moderator" && u.isApproved));
      })
      .catch((err) => console.error("Moderator list fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || moderators.length === 0) return null;

  return (
    <select
      value={selectedModeratorId || ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="px-3 py-1.5 text-sm rounded-md font-medium bg-white text-gray-700 border border-gray-300"
    >
      <option value="">🌐 সব অর্ডার (সবার)</option>
      {moderators.map((m) => (
        <option key={m._id} value={m._id}>
          👤 {m.name} ({m.phone})
        </option>
      ))}
    </select>
  );
}





