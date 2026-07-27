import React from "react";
import { MdAddIcCall } from "react-icons/md";
import { FaCheckCircle } from "react-icons/fa";
import { copyToClipboard } from "@/utils/copyToClipboard";

function OrderActions({
  order,
  loading,
  isCopied,
  setIsCopied,
  onEdit,
  onBooking,
  onSchedule,
  onDelete,
}) {
  const firstPhone = Array.isArray(order.castomerPhone)
    ? order.castomerPhone[0]
    : order.castomerPhone?.split(", ")[0];

  return (
    <div className="flex justify-between mt-1 pt-1 border-t border-gray-100">
      {/* বাম দিকের বাটন: কপি, কল, এডিট */}
      <div className="flex space-x-2">
        {/* call action button */}
        <a
          href={`tel:${firstPhone}`}
          onClick={() => copyToClipboard(order.castomerPhone)}
          className="py-2 px-4 text-sm rounded-md flex items-center bg-blue-300 text-blue-600 hover:bg-blue-200 transition duration-150 shadow-md"
          title="সরাসরি কল করুন"
        >
          <MdAddIcCall />
        </a>
        {/* row text copy button */}
        <button
          className={`py-2 px-4 cursor-pointer text-sm rounded-md transition duration-150 shadow-md ${
            isCopied
              ? "bg-green-200 text-green-600 hover:bg-green-300"
              : "bg-gray-300 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={() => {
            copyToClipboard(order?.rawInputText);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
          }}
          disabled={loading || isCopied}
        >
          {isCopied ? (
            <FaCheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          )}
        </button>
        {/* edit button */}
        <button
          className="p-2 cursor-pointer text-sm rounded-md flex items-center bg-green-300 text-green-600 hover:bg-green-200 transition duration-150 shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="অর্ডার এডিট করুন"
          disabled={loading}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </button>
        {/* booking button if order is confirmed */}
        {order?.orderStatus === "Confirmed" && (
          <button
            className="p-2 cursor-pointer text-sm rounded-md bg-yellow-300 text-gray-600 hover:bg-gray-200 transition duration-150 shadow-md"
            onClick={onBooking}
            disabled={loading}
          >
            Booking
          </button>
        )}
        {/* order schedule button */}
        <button
          className="p-2 cursor-pointer text-sm rounded-md flex items-center bg-green-300 text-gray-900 hover:bg-green-400 transition duration-150 shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onSchedule();
          }}
          title="অর্ডার Schedule করুন"
          disabled={loading}
        >
          Schedule
        </button>
      </div>

      {/* ডান দিকের বাটন */}
      <button
        className="cursor-pointer flex items-center space-x-1 px-3 py-1.5 text-xs rounded-full bg-red-500 text-white hover:bg-red-600 transition duration-150 font-medium shadow-md"
        onClick={onDelete}
        title="অর্ডার ডিলিট করুন"
        disabled={loading}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    </div>
  );
}

export default OrderActions;
