"use client";
import React, { useEffect, useState } from "react";
import { MdAddIcCall } from "react-icons/md";
import { toast } from "react-toastify";
import { useSocket } from "@/hooks/useSocket";
import { orderService } from "@/services/orderService";
import DisplayTime from "@/components/common/DisplayTime";
import OrderActivityTimeline from "@/components/orders/OrderActivityTimeline";
import OrderPhoneList from "@/components/orders/OrderPhoneList";
import PreviousOrderModal from "@/components/orders/PreviousOrderModal";
import { copyToClipboard } from "@/utils/copyToClipboard";
import DisplayAgoTime from "../common/DisplayAgoTime";

// এই টাইপগুলো Solve/ব্যর্থ/ট্রাই নেক্সট বাটনের নিজস্ব লগ — এগুলো উপরের মূল নোট
// (lastActivity) হিসেবে দেখানো হবে না, শুধু টাইমলাইনে ও নিচের "সর্বশেষ ট্রাই" লাইনে থাকবে।
const NOTE_ACTION_TYPES = ["Note Solved", "Note Failed", "Try Next"];

function NoteBubble({ order, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // "solve" | "failed" | "try_next" | null
  const [showPreviousOrders, setShowPreviousOrders] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    // ✅ ফিক্স: আগে socket null/undefined চেক ছাড়াই socket.on() কল হতো,
    // যা প্রথম render-এ সকেট এখনো তৈরি না থাকলে ক্র্যাশ করাতে পারতো।
    if (!socket) return;

    const handleOrderUpdated = (data) => {
      if (onUpdate) onUpdate(data.order);
    };

    socket.on("orderUpdated", handleOrderUpdated);
    return () => {
      socket.off("orderUpdated", handleOrderUpdated);
    };
  }, [socket, onUpdate]);

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
  };

  // সমাধান/ব্যর্থ/ট্রাই নেক্সট — তিনটাই এই একটা ফাংশন দিয়ে হ্যান্ডল হয়,
  // ব্যাকএন্ডে activities-এ কে করেছে তা মিনিমাল টেক্সটে লগ হয়ে যায়।
  const handleNoteAction = async (action) => {
    setActionLoading(action);
    try {
      const res = await orderService.noteAction(order._id, action);
      if (res.data?.order && onUpdate) {
        onUpdate(res.data.order);
      }
    } catch (error) {
      console.error("Note action error:", error);
      const message =
        error.response?.data?.message ||
        "নোট আপডেট করতে ব্যর্থ হয়েছে, আবার চেষ্টা করুন।";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  // "Solve/ব্যর্থ/ট্রাই নেক্সট" ক্লিক করলেও উপরের মূল নোট হিসেবে সবসময় সর্বশেষ
  // ব্যবসায়িক অ্যাক্টিভিটি (যেমন Steadfast থেকে আসা স্ট্যাটাস নোট) দেখানো হবে —
  // এই তিনটা অ্যাকশনের নিজস্ব লগ এন্ট্রি মূল ডিসপ্লে থেকে বাদ দিয়ে হিসাব করা হচ্ছে।
  const nonDisplayActivities = order.activities.filter(
    (a) => !NOTE_ACTION_TYPES.includes(a?.type),
  );
  const lastActivity =
    nonDisplayActivities[nonDisplayActivities.length - 1] ||
    order.activities[order.activities.length - 1];
  const lastTryActivity = [...order.activities]
    .reverse()
    .find((a) => a?.type === "Try Next");
  const firstPhone = Array.isArray(order.castomerPhone)
    ? order.castomerPhone[0]
    : order.castomerPhone.split(", ")[0];
  const hasPreviousOrders = Number(order?.courierHistory?.our) > 0;
  const isLoading = actionLoading !== null;

  return (
    <div className="bg-white  rounded-lg shadow-lg p-2 md:p-4 mb-1 border border-gray-400 hover:shadow-xl transition-all duration-300">
      <div
        className={`cursor-pointer  ${isLoading ? "opacity-70 pointer-events-none" : ""}`}
        onClick={() => !isLoading && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1">
          {/* tracking id */}
          <div>
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
                  {order?.courier?.trackingId}
                </p>
              </div>
            )}
          </div>
          {/* our previous history */}
          <div>
            {order?.courierHistory?.our > 0 && (
              <span className="text-xs text-black  font-medium bg-green-300 px-2 py-0.5 rounded-md">
                <span className="text-green-700">
                  {order?.courierHistory?.our}
                </span>
              </span>
            )}
          </div>
          {/* all previous history */}
          <div>
            {order?.courierHistory?.all && (
              <span className="text-xs text-black gap-3 font-medium bg-gray-200 px-2 py-0.5 rounded-lg">
                <span> All </span>
                <span className="text-green-700">
                  {order?.courierHistory?.all?.success}
                </span>
                /
                <span className="text-red-600">
                  {order?.courierHistory?.all?.cancel}
                </span>
              </span>
            ) }
          </div>
          <span>{order.totalCOD}--</span>
          <span className="text-purple-600 pe-2">{order.productCode}</span>
        </div>

        <div className="flex flex-1 gap-2 justify-between items-center my-2">
          <p className="text-sm font-bold text-gray-600 ">
            {lastActivity?.description}
          </p>
        </div>

        <div className="flex justify-between items-center">
          <OrderPhoneList
            castomerPhone={order.castomerPhone}
            onCopy={handleCopy}
          />
          <div className="text-sm font-medium text-purple-500">
            <DisplayTime timeStamp={lastActivity?.timestamp} />
            <DisplayAgoTime timeStamp={lastActivity?.timestamp} />
          </div>
        </div>
      </div>

      <div className="flex justify-start gap-2 border-t border-gray-100 pt-2">
        <div className="flex space-x-2">
          <a
            href={`tel:${firstPhone}`}
            onClick={() => handleCopy(order.castomerPhone)}
            className="py-2 px-4 text-sm rounded-md bg-blue-200 text-blue-600 hover:bg-blue-200 transition duration-150 shadow-md"
            title="সরাসরি কল করুন"
          >
            <MdAddIcCall />
          </a>
        </div>
        {hasPreviousOrders && (
          <button
            onClick={() => setShowPreviousOrders(true)}
            className="text-gray-700 text-xs font-medium py-1.5 px-2 md:px-3 rounded-lg md:rounded-sm shadow-md transition duration-200 cursor-pointer bg-yellow-400 hover:bg-gray-300 hover:shadow-lg"
          >
            আগের অর্ডার
          </button>
        )}
      </div>

      {/* সর্বশেষ কখন "ট্রাই নেক্সট" করা হয়েছিল — মূল নোট টেক্সট আলাদা থাকে, এটা শুধু তথ্য হিসেবে */}
      {lastTryActivity && (
        <div className="flex items-center gap-1 text-[11px] text-orange-500 mt-2 mb-0">
          <span>
            সর্বশেষ ট্রাই: {lastTryActivity.author || "User"} •
          </span>
          <DisplayAgoTime timeStamp={lastTryActivity.timestamp} />
        </div>
      )}

      {/* সমাধান / ব্যর্থ / ট্রাই নেক্সট — এখন নিচে, একসাথে */}
      <div className="flex gap-2 border-t border-gray-100 pt-2 mt-2">
        <button
          onClick={() => handleNoteAction("solve")}
          className="bg-green-700 text-white text-sm px-3 py-1.5 rounded-md flex-1 disabled:opacity-60"
          disabled={isLoading}
        >
          {actionLoading === "solve" ? "..." : "Solve"}
        </button>
        <button
          onClick={() => handleNoteAction("failed")}
          className="bg-red-600 text-white text-sm px-3 py-1.5 rounded-md flex-1 disabled:opacity-60"
          disabled={isLoading}
        >
          {actionLoading === "failed" ? "..." : "ব্যর্থ"}
        </button>
        <button
          onClick={() => handleNoteAction("try_next")}
          className="bg-orange-500 text-white text-sm px-3 py-1.5 rounded-md flex-1 disabled:opacity-60"
          disabled={isLoading}
        >
          {actionLoading === "try_next" ? "..." : "ট্রাই নেক্সট"}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "opacity-100 overflow-auto" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-2 pt-2 border-t border-gray-300">
          <p className="text-xs mb-1">{order.rawInputText}</p>
          <OrderActivityTimeline activities={order.activities} />
        </div>
      </div>

      {showPreviousOrders && (
        <PreviousOrderModal
          order={order}
          onClose={() => setShowPreviousOrders(false)}
        />
      )}
    </div>
  );
}

export default NoteBubble;