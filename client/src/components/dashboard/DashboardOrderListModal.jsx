"use client";
import React, { useEffect, useState } from "react";
import { dashboardService } from "@/services/dashboardService";
import { copyToClipboard } from "@/utils/copyToClipboard";
import { formatDate, formatTime } from "@/utils/dateUtils";
import TrackingActivityTimeline from "@/components/orders/TrackingActivityTimeline";

const TITLE_MAP = {
  sent: "📦 পাঠানো পার্সেল",
  delivered: "✅ ডেলিভারড পার্সেল",
  cancelled: "❌ ক্যান্সেলড পার্সেল",
  pending: "⏳ পেন্ডিং পার্সেল",
};

const COURIER_STATUS_COLOR_MAP = {
  pending: "bg-amber-300 text-blue-900",
  assigned: "bg-blue-300 text-blue-900",
  review: "bg-purple-300 text-purple-900",
  partial_delivered: "bg-orange-300 text-orange-900",
  delivered: "bg-green-300 text-green-900",
  cancelled: "bg-red-300 text-red-900",
  unknown: "bg-gray-200 text-gray-700",
};

export default function DashboardOrderListModal({
  status,
  from,
  to,
  moderatorId,
  productCode,
  onClose,
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setExpandedId(null);
    dashboardService
      .getOrders(status, from, to, moderatorId, productCode)
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
  }, [status, from, to, moderatorId, productCode]);

  const title = TITLE_MAP[status] || "পার্সেল";

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
            {title}
            {productCode ? ` — ${productCode}` : ""} — {orders.length}টি
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
                  <th className="py-2 px-4">#</th>
                  <th className="py-2 px-4">নাম</th>
                  <th className="py-2 px-4">ফোন</th>
                  <th className="py-2 px-4">COD</th>
                  <th className="py-2 px-4">Tracking ID</th>
                  <th className="py-2 px-4">Product code</th>
                  <th className="py-2 px-4">Order Status</th>
                  <th className="py-2 px-4">Courier Status</th>
                  <th className="py-2 px-4">যোগ করেছেন</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, index) => {
                  const isExpanded = expandedId === o._id;
                  return (
                    <React.Fragment key={o._id}>
                      {/* row */}
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : o._id)}
                        className={`border-b last:border-0 cursor-pointer hover:bg-gray-50 ${
                          isExpanded ? "bg-indigo-50" : ""
                        }`}
                      >
                        <td className="py-2 px-4 text-gray-400">
                          <span className="inline-block w-3 text-gray-400">
                            {isExpanded ? "▾" : "▸"}
                          </span>{" "}
                          {index + 1}
                        </td>
                        <td className="py-2 px-4 font-medium">{o.castomerName}</td>
                        <td
                          className="py-2 px-4 text-blue-600 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(
                              Array.isArray(o.castomerPhone) ? o.castomerPhone[0] : o.castomerPhone,
                            );
                          }}
                        >
                          {Array.isArray(o.castomerPhone) ? o.castomerPhone[0] : o.castomerPhone}
                        </td>
                        <td className="py-2 px-4">৳{o.totalCOD}</td>
                        <td
                          className="py-2 px-4 text-blue-600 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(o.courier?.trackingId);
                          }}
                        >
                          {o.courier?.trackingId || "-"}
                        </td>
                        <td className="py-2 px-4 text-gray-500">{o.productCode || "-"}</td>
                        <td className="py-2 px-4 text-gray-500">{o.orderStatus || "-"}</td>
                        <td className="py-2 px-4 text-gray-500">{o.courier?.courierStatus || "-"}</td>
                        <td className="py-2 px-4 text-gray-500">{o.createdByName || "-"}</td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b last:border-0 bg-gray-50">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-indigo-100 text-indigo-700">
                                {o.orderStatus}
                              </span>
                              {o.productCode && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-purple-100 text-purple-700">
                                  {o.productCode}
                                </span>
                              )}
                              {o.courier?.courierStatus && (
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${
                                    COURIER_STATUS_COLOR_MAP[o.courier.courierStatus] ||
                                    COURIER_STATUS_COLOR_MAP.unknown
                                  }`}
                                >
                                  {o.courier.courierStatus}
                                </span>
                              )}
                              {o.courier?.statusUpdatedAt && (
                                <span className="text-xs text-gray-500">
                                  আপডেট: {formatDate(o.courier.statusUpdatedAt)}{" "}
                                  {formatTime(o.courier.statusUpdatedAt)}
                                </span>
                              )}
                            </div>

                            {o.rawInputText && (
                              <p className="text-xs text-gray-600 mb-1 whitespace-pre-wrap">
                                {o.rawInputText}
                              </p>
                            )}
                            {o.permanentNote && (
                              <p className="text-sm text-red-700 mb-1">{o.permanentNote}</p>
                            )}
                            {o.note && (
                              <p className="text-xs text-gray-600 mb-1">নোট: {o.note}</p>
                            )}

                            <TrackingActivityTimeline activities={o.activities} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
