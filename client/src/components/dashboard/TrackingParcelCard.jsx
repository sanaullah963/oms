"use client";
import React from "react";
import OrderPhoneList from "./OrderPhoneList";
import DisplayTime from "@/components/common/DisplayTime";
import TrackingActivityTimeline from "../orders/TrackingActivityTimeline";
import { copyToClipboard } from "@/utils/copyToClipboard";

// --- OrderCard.jsx-এর সাথে সামঞ্জস্যপূর্ণ কালার ম্যাপ ---
const STATUS_COLOR_MAP = {
  Pending: "text-yellow-600 bg-yellow-100",
  Confirmed: "text-green-600 bg-green-200",
  Booked: "text-green-600 bg-green-200",
  Cancelled: "text-red-600 bg-red-100",
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

function getStatusColor(status) {
  return STATUS_COLOR_MAP[status] || "text-indigo-600 bg-indigo-100";
}

// --- ট্র্যাকিং পার্সেল পেজের অর্ডার কার্ড — মূল OrderCard.jsx-এর ভিজ্যুয়াল ডিজাইনের
// আদলে তৈরি (স্ট্যাটাস ব্যাজ, কাস্টমার ইনফো, ফোন লিস্ট), কিন্তু এখানে read-only —
// কোনো এডিট/স্ট্যাটাস-বদলানোর অ্যাকশন নেই, শুধু ট্র্যাকিং তথ্য + অ্যাক্টিভিটি টাইমলাইন ---
export default function TrackingParcelCard({ order }) {
  if (!order) return null;

  const statusColor = getStatusColor(order.orderStatus);
  const courierStatus = order?.courier?.courierStatus;
  const courierColor = COURIER_STATUS_COLOR_MAP[courierStatus] || COURIER_STATUS_COLOR_MAP.unknown;
  const lastUpdated = order?.courier?.statusUpdatedAt || order?.courier?.bookedAt;

  return (
    <div className="bg-white rounded-lg shadow-lg p-2 md:p-4 border border-gray-300 hover:shadow-xl transition-all duration-300 mb-1">
      {/* স্ট্যাটাস রো */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${statusColor}`}>
            {order.orderStatus}
          </span>

          {courierStatus && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${courierColor}`}>
              {courierStatus}
            </span>
          )}
        </div>
        <div className="text-xs font-medium flex flex-col">
          <DisplayTime timeStamp={lastUpdated} />
        </div>
      </div>

      <p className="text-sm font-bold text-gray-800">
        <span> {order.castomerName} </span> --
        <span> {order.totalCOD} </span> --
        <span className="text-purple-600"> {order.productCode} </span>
      </p>

      {/* phone number list */}
      <OrderPhoneList castomerPhone={order.castomerPhone} />

      {order?.courier?.trackingId && (
        <div className="text-sm font-medium flex items-center gap-1 mt-1">
          <p className="text-gray-500">SteadFast ID :</p>
          <p
            className="text-blue-600 cursor-pointer"
            onClick={() => copyToClipboard(order.courier.trackingId)}
          >
            {order.courier.trackingId}
          </p>
        </div>
      )}

      {order?.createdByName && (
        <p className="text-xs text-gray-500 mt-0.5">যোগ করেছেন: {order.createdByName}</p>
      )}

      {order?.permanentNote && (
        <p className="text-sm text-red-700 mt-1">{order.permanentNote}</p>
      )}

      {order?.note && <p className="text-xs text-gray-600 mt-1">নোট: {order.note}</p>}

      {/* সর্বশেষ ২/৩টা অ্যাক্টিভিটি, "আরও দেখুন" চাপলে বাকিগুলো */}
      <TrackingActivityTimeline activities={order.activities} />
    </div>
  );
}