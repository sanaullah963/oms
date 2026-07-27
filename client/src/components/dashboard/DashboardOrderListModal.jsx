"use client";
import { useEffect, useState } from "react";
import { dashboardService } from "@/services/dashboardService";
import { copyToClipboard } from "@/utils/copyToClipboard";

const TITLE_MAP = {
  sent: "📦 পাঠানো পার্সেল",
  delivered: "✅ ডেলিভারড পার্সেল",
  cancelled: "❌ ক্যান্সেলড পার্সেল",
};

export default function DashboardOrderListModal({
  status,
  from,
  to,
  moderatorId,
  onClose,
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    dashboardService
      .getOrders(status, from, to, moderatorId)
      .then((res) => {
        if (!cancelled) setOrders(res.data.orders);
      })
      .catch((err) => {
        console.error("Dashboard order list error:", err);
        if (!cancelled) setError("লিস্ট লোড করা যায়নি।");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, from, to, moderatorId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-800">
            {TITLE_MAP[status] || "পার্সেল"} — {orders.length}টি
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-16 text-gray-500">লোড হচ্ছে...</div>
          ) : error ? (
            <div className="text-center py-16 text-red-500">{error}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              এই তালিকায় কোনো পার্সেল নেই।
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 px-4">নাম</th>
                  <th className="py-2 px-4">ফোন</th>
                  <th className="py-2 px-4">COD</th>
                  <th className="py-2 px-4">Tracking ID</th>
                  <th className="py-2 px-4">যোগ করেছেন</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b last:border-0">
                    <td className="py-2 px-4 font-medium">{o.castomerName}</td>
                    <td
                      className="py-2 px-4 text-blue-600 cursor-pointer"
                      onClick={() => copyToClipboard(o.castomerPhone[0])}
                    >
                      {Array.isArray(o.castomerPhone)
                        ? o.castomerPhone[0]
                        : o.castomerPhone}
                    </td>
                    <td className="py-2 px-4">৳{o.totalCOD}</td>
                    <td className="py-2 px-4 text-blue-600 cursor-pointer" onClick={() => copyToClipboard(o.courier?.trackingId)}>
                      {o.courier?.trackingId || "-"}
                    </td>
                    <td className="py-2 px-4 text-gray-500">
                      {o.createdByName || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
