"use client";
import React, { useEffect, useState } from "react";
import { MdAddIcCall } from "react-icons/md";
import { useSocket } from "@/hooks/useSocket";
import { orderService } from "@/services/orderService";
import { dahsbOrderActionButton } from "@/constants/orderConstants";
import DisplayTime from "@/components/common/DisplayTime";
import OrderActivityTimeline from "@/components/orders/OrderActivityTimeline";
import OrderPhoneList from "@/components/orders/OrderPhoneList";
import { copyToClipboard } from "@/utils/copyToClipboard";
import DisplayAgoTime from "../common/DisplayAgoTime";

function NoteBubble({ order, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleSolve = async () => {
    setLoading(true);
    try {
      const res = await orderService.markAttentionResolved(order._id);
      if (res.data && onUpdate) {
        onUpdate(res.data);
      }
    } catch (error) {
      console.error("Solve error:", error);
    } finally {
      setLoading(false);
    }
  };

  const lastActivity = order.activities[order.activities.length - 1];
  const firstPhone = Array.isArray(order.castomerPhone)
    ? order.castomerPhone[0]
    : order.castomerPhone.split(", ")[0];

  return (
    <div className="bg-white  rounded-lg shadow-lg p-2 md:p-4 mb-1 border border-gray-300 hover:shadow-xl transition-all duration-300">
      <div
        className={`cursor-pointer  ${loading ? "opacity-70 pointer-events-none" : ""}`}
        onClick={() => !loading && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1">
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
          <div>
            {order?.courierHistory?.our > 0 && (
              <span className="text-xs text-black  font-medium bg-green-300 px-2 py-0.5 rounded-md">
                <span className="text-green-700">{order?.courierHistory?.our}</span>
              </span>
            )}
          </div>
          <span>-- {order.totalCOD} --</span>
          <span className="text-purple-600 pe-2">{order.productCode}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSolve();
            }}
            className="bg-green-700 text-white px-3 rounded-md flex-1 max-w-48"
            disabled={loading}
          >
            {loading ? "..." : "Solve"}
          </button>
        </div>

        <div className="flex flex-1 gap-2 justify-between items-center my-2">
          <p className="text-sm font-bold text-gray-600 ">{lastActivity?.description}</p>
        </div>

        <div className="flex justify-between items-center">
          <OrderPhoneList castomerPhone={order.castomerPhone} onCopy={handleCopy} />
          <div className="text-sm font-medium text-purple-500">
            <DisplayTime timeStamp={lastActivity?.timestamp} />
            <DisplayAgoTime timeStamp={lastActivity?.timestamp} />
          </div>
        </div>
      </div>

      <div className="flex justify-start gap-2 border-t border-gray-100 ">
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
        {dahsbOrderActionButton.map((shortcut, index) => (
          <button
            key={index}
            onClick={() => handleCopy(shortcut.value)}
            className="text-gray-700 text-xs font-medium py-1.5 px-2 md:px-3 rounded-lg  md:rounded-sm shadow-md transition duration-200  cursor-pointer bg-yellow-400 hover:bg-gray-300 hover:shadow-lg "
          >
            {shortcut.label}
          </button>
        ))}
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
    </div>
  );
}

export default NoteBubble;
