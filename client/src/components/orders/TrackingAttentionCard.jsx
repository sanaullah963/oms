"use client";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { orderService } from "@/services/orderService";
import DisplayTime from "@/components/common/DisplayTime";
import DisplayAgoTime from "@/components/common/DisplayAgoTime";
import OrderActivityTimeline from "@/components/orders/OrderActivityTimeline";
import OrderPhoneList from "@/components/orders/OrderPhoneList";
import { copyToClipboard } from "@/utils/copyToClipboard";

// সর্বশেষ Steadfast ট্র্যাকিং মেসেজ — activities-এর description থেকে (webhookController
// buildActivity-তে author: "Steadfast", description: data.tracking_message সেভ করে)
function getLatestSteadfastActivity(activities) {
  const list = Array.isArray(activities) ? activities : [];
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]?.author === "Steadfast" && list[i]?.description) return list[i];
  }
  return list[list.length - 1];
}

function TrackingAttentionCard({ order, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const latest = getLatestSteadfastActivity(order.activities);

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
  };

  // সার্ভারে courierTrackingAttention=false সেভ হলে তবেই লিস্ট থেকে সরবে
  // (onUpdate → OrderContext.handleOrderUpdate → trackingAttentionOrders থেকে বাদ)
  const handleTrackingOk = async () => {
    setLoading(true);
    try {
      const res = await orderService.trackingOk(order._id);
      if (res.data?.order && onUpdate) onUpdate(res.data.order);
    } catch (error) {
      console.error("Tracking OK error:", error);
      toast.error(
        error.response?.data?.message ||
          "Tracking OK করতে ব্যর্থ হয়েছে, আবার চেষ্টা করুন।",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-2 md:p-4 mb-1 border border-gray-400 hover:shadow-xl transition-all duration-300">
      <div
        className={`cursor-pointer ${loading ? "opacity-70 pointer-events-none" : ""}`}
        onClick={() => !loading && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {order?.courier?.trackingId && (
            <div className="text-sm font-medium flex items-center">
              <p>ID : </p>
              <p
                className="text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(order.courier.trackingId);
                }}
              >
                {order.courier.trackingId}
              </p>
            </div>
          )}
          <span className="text-sm font-bold text-gray-800">
            {order.castomerName}
          </span>
          <span className="text-sm">{order.totalCOD}--</span>
          <span className="text-purple-600 text-sm pe-2">
            {order.productCode}
          </span>
        </div>

        {/* সর্বশেষ Steadfast ট্র্যাকিং মেসেজ */}
        <div className="my-2 bg-amber-50 border border-amber-200 rounded-md p-2">
          <p className="text-xs text-amber-700 font-medium mb-0.5">
            Steadfast ট্র্যাকিং মেসেজ
          </p>
          <p className="text-sm font-bold text-gray-700">
            {latest?.description || "—"}
          </p>
          <div className="text-xs font-medium text-purple-500 mt-1">
            <DisplayTime timeStamp={latest?.timestamp} />
            <DisplayAgoTime timeStamp={latest?.timestamp} />
          </div>
        </div>

        {/* ডেলিভারি ঠিকানা — অর্ডারে আলাদা address ফিল্ড নেই, ঠিকানা rawInputText-এই থাকে */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-2 mb-2">
          <p className="text-xs text-gray-500 font-medium mb-0.5">
            ডেলিভারি ঠিকানা
          </p>
          <p className="text-xs text-gray-800 whitespace-pre-wrap break-words">
            {order.rawInputText}
          </p>
        </div>

        <OrderPhoneList
          castomerPhone={order.castomerPhone}
          onCopy={handleCopy}
        />
      </div>

      <div className="flex gap-2 border-t border-gray-100 pt-2 mt-2">
        <button
          onClick={handleTrackingOk}
          className="bg-green-700 text-white text-sm px-3 py-1.5 rounded-md flex-1 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "..." : "Tracking OK"}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "opacity-100 overflow-auto" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-2 pt-2 border-t border-gray-300">
          <OrderActivityTimeline activities={order.activities} />
        </div>
      </div>
    </div>
  );
}

export default TrackingAttentionCard;
