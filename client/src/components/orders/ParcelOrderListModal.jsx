"use client";
import React, { useEffect, useMemo, useState } from "react";
import { dashboardService } from "@/services/dashboardService";
import { trackingParcelService } from "@/services/trackingParcelService";
import { copyToClipboard } from "@/utils/copyToClipboard";
import { formatDate, formatTime } from "@/utils/dateUtils";
import TrackingActivityTimeline from "@/components/orders/TrackingActivityTimeline";
import DisplayAgoTime from "../common/DisplayAgoTime";

// ============================================================================
// ParcelOrderListModal — পার্সেল/অর্ডারের টেবিল-মডাল (row ক্লিক করলে এক্সপান্ড হয়ে
// অ্যাক্টিভিটি/নোট দেখায়)। আগে এটা দুটো আলাদা কম্পোনেন্ট ছিল:

// দুটোর UI একই; শুধু ডেটা কোন API থেকে আসবে সেটাই আলাদা, তাই সেটা `source` প্রপ দিয়ে ঠিক হয়।
//
// প্রপ:
//   source      "dashboard" | "tracking"   (ডিফল্ট "dashboard")
//   status      dashboard: sent/delivered/cancelled/pending
//               tracking:  pending/assigned/review/partial_delivered/delivered/cancelled/unknown
//   from, to    তারিখ-রেঞ্জ (YYYY-MM-DD)
//   moderatorId (ঐচ্ছিক)
//   productCode (ঐচ্ছিক — শুধু source="dashboard"-এ কাজ করে, সার্ভারের /api/dashboard/orders ফিল্টার করে)
//   onClose     মডাল বন্ধ করার ফাংশন
//
// নতুন কোনো ডেটা-সোর্স যোগ করতে চাইলে নিচের FETCHERS-এ একটা এন্ট্রি যোগ করলেই হবে।
// ============================================================================

const TITLE_MAP = {
  // dashboard
  sent: "📦 পাঠানো পার্সেল",
  // dashboard + tracking
  pending: "⏳ পেন্ডিং পার্সেল",
  delivered: "✅ ডেলিভারড পার্সেল",
  cancelled: "❌ ক্যান্সেলড পার্সেল",
  cancel_request: "📨 ক্যান্সেল রিকোয়েস্ট পার্সেল",
  cancel_parcel_pending: "⏳ ক্যান্সেল (রিটার্ন পেন্ডিং) পার্সেল",
  // tracking
  assigned: "🚚 এসাইন পার্সেল",
  review: "🔎 ইন-রিভিউ পার্সেল",
  partial_delivered: "📦 আংশিক ডেলিভারড পার্সেল",
  unknown: "পার্সেল",
};

const COURIER_STATUS_COLOR_MAP = {
  pending: "bg-amber-300 text-blue-900",
  assigned: "bg-blue-300 text-blue-900",
  cancel_request: "bg-pink-300 text-pink-900",
  cancel_parcel_pending: "bg-rose-300 text-rose-900",
  review: "bg-purple-300 text-purple-900",
  partial_delivered: "bg-orange-300 text-orange-900",
  delivered: "bg-green-300 text-green-900",
  cancelled: "bg-red-300 text-red-900",
  unknown: "bg-gray-200 text-gray-700",
};

// source অনুযায়ী কোন সার্ভিস কীভাবে কল হবে। দুটোর আর্গুমেন্টের ক্রম আলাদা (আগের কোড যেমন ছিল তেমনই)।
const FETCHERS = {
  dashboard: ({ status, from, to, moderatorId, productCode }) =>
    dashboardService.getOrders(status, from, to, moderatorId, productCode),
  tracking: ({ status, from, to, moderatorId }) =>
    trackingParcelService.getOrders(status, moderatorId, from, to),
};

// sortable কলামের কনফিগ — key দিয়ে সর্ট-ভ্যালু বের হয়
const SORT_VALUE = {
  trackingId: (o) => o.courier?.trackingId || "",
  productCode: (o) => o.productCode || "",
  totalCOD: (o) => o.totalCOD || 0,
  lastUpdated: (o) => {
    const last = o.activities?.[o.activities.length - 1];
    return last?.timestamp ? new Date(last.timestamp).getTime() : 0;
  },
};
const NUMERIC_SORT_KEYS = ["totalCOD", "lastUpdated"];

// হেডারের সর্ট বাটন সহ কলাম-টাইটেল
function SortableTh({ label, sortKey, title, sortConfig, onToggle }) {
  const active = sortConfig.key === sortKey;
  return (
    <th className="py-2 px-4">
      <span className="inline-flex items-center gap-1">
        {label}
        <button
          onClick={() => onToggle(sortKey)}
          title={title}
          className={`cursor-pointer rounded-sm px-1 ${
            active
              ? "text-indigo-600 font-bold"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {active ? (sortConfig.direction === "asc" ? "▲" : "▼") : "⇅"}
        </button>
      </span>
    </th>
  );
}

export default function ParcelOrderListModal({
  source = "dashboard",
  status,
  from,
  to,
  moderatorId,
  productCode,
  onClose,
}) {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(null); // সার্ভার total পাঠালে (tracking) সেটা, নাহলে orders.length
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  // --- কলাম অনুযায়ী সর্ট — শুধু লোড হওয়া ডেটার উপর, ক্লায়েন্ট-সাইডেই। একই কলামে আবার
  // ক্লিক করলে asc/desc টগল হয় ---
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const sortedOrders = useMemo(() => {
    const getValue = SORT_VALUE[sortConfig.key];
    if (!getValue) return orders;

    const isNumeric = NUMERIC_SORT_KEYS.includes(sortConfig.key);
    const sorted = [...orders].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      return isNumeric ? va - vb : va.localeCompare(vb, "bn");
    });
    return sortConfig.direction === "asc" ? sorted : sorted.reverse();
  }, [orders, sortConfig]);
console.log("sortedOrders", sortedOrders);
  // ভুল source পাঠালে (টাইপো) ক্র্যাশ না করে এরর মেসেজ দেখায় — এফেক্টের ভেতরে স্টেট বদলানো লাগে না
  const fetcher = FETCHERS[source];

  useEffect(() => {
    if (!fetcher) {
      console.error(`ParcelOrderListModal: অচেনা source "${source}"`);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setExpandedId(null);

    fetcher({ status, from, to, moderatorId, productCode })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.data?.orders || []);
        setTotal(typeof res.data?.total === "number" ? res.data.total : null);
      })
      .catch((err) => {
        console.error("Parcel order list error:", err);
        if (!cancelled) setError("লিস্ট লোড করা যায়নি।");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source, fetcher, status, from, to, moderatorId, productCode]);

  const title = TITLE_MAP[status] || "পার্সেল";
  const count = total ?? orders.length;
  const showLoading = loading && !!fetcher;
  const errorMessage = fetcher ? error : "লিস্ট লোড করা যায়নি।";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-800">
            {title}
            {productCode ? ` — ${productCode}` : ""} —{" "}
            {count.toLocaleString("bn-BD")}টি
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {showLoading ? (
            <div className="text-center py-16 text-gray-500">লোড হচ্ছে...</div>
          ) : errorMessage ? (
            <div className="text-center py-16 text-red-500">{errorMessage}</div>
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
                  <SortableTh
                    label="Tracking ID"
                    sortKey="trackingId"
                    title="Tracking ID অনুযায়ী সর্ট করুন"
                    sortConfig={sortConfig}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Product code"
                    sortKey="productCode"
                    title="একই প্রোডাক্ট কোডের অর্ডারগুলো একত্রে গ্রুপ করুন"
                    sortConfig={sortConfig}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="COD"
                    sortKey="totalCOD"
                    title="COD এমাউন্ট অনুযায়ী সর্ট করুন"
                    sortConfig={sortConfig}
                    onToggle={toggleSort}
                  />
                  <th className="py-2 px-4">Order status</th>
                  <th className="py-2 px-4">Courier status</th>
                  <th className="py-2 px-4">যোগ করেছেন</th>
                  <SortableTh
                    label="Last updated"
                    sortKey="lastUpdated"
                    title="সময় অনুযায়ী সর্ট করুন"
                    sortConfig={sortConfig}
                    onToggle={toggleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((o, index) => {
                  const isExpanded = expandedId === o._id;
                  const phone = Array.isArray(o.castomerPhone)
                    ? o.castomerPhone[0]
                    : o.castomerPhone;
                  const lastActivity = o.activities?.[o.activities.length - 1];
                  return (
                    <React.Fragment key={o._id}>
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
                        <td className="py-2 px-4 font-medium">
                          {o.castomerName}
                        </td>
                        <td
                          className="py-2 px-4 text-blue-600 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(phone);
                          }}
                        >
                          {phone}
                        </td>
                        <td
                          className="py-2 px-4 text-blue-600 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(o.courier?.trackingId);
                          }}
                        >
                          {o.courier?.trackingId || "-"}
                        </td>
                        <td className="py-2 px-4 text-gray-500">
                          {o.productCode || "-"}
                        </td>
                        <td className="py-2 px-4">৳{o.totalCOD}</td>
                        <td className="py-2 px-4 text-gray-500">
                          {o.orderStatus || "-"}
                        </td>
                        <td className="py-2 px-4 text-gray-500">
                          {o.courier?.courierStatus || "-"}
                        </td>
                        <td className="py-2 px-4 text-gray-500 text-center">
                          {o.createdByName || "-"}
                        </td>
                        <td className="py-2 px-4 text-gray-500">
                          <DisplayAgoTime
                            timeStamp={lastActivity?.timestamp || "-"}
                          />
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b last:border-0 bg-gray-50">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
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
                                    COURIER_STATUS_COLOR_MAP[
                                      o.courier.courierStatus
                                    ] || COURIER_STATUS_COLOR_MAP.unknown
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

                            {/* rawInputText শুধু /api/dashboard/orders পাঠায়; tracking API পাঠায় না — তাই ওখানে নিজে থেকেই লুকানো থাকে */}
                            {o.rawInputText && (
                              <p className="text-xs text-gray-600 mb-1 whitespace-pre-wrap">
                                {o.rawInputText}
                              </p>
                            )}
                            {o.permanentNote && (
                              <p className="text-sm text-red-700 mb-1">
                                {o.permanentNote}
                              </p>
                            )}
                            {o.note && (
                              <p className="text-xs text-gray-600 mb-1">
                                নোট: {o.note}
                              </p>
                            )}

                            <TrackingActivityTimeline
                              activities={o.activities}
                            />
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
