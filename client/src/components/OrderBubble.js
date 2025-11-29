"use client";

import React, { useState } from "react";
import axios from "axios";
import { useSocket } from "../hooks/useSocket";
import { STATUS_SHORTCUTS,ACTIVITY_STATUS_COLORS,formatTime } from "../constants/data";


// API Endpoint Configuration
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/orders`;






// --- ২. কাস্টম Modal কম্পোনেন্ট ---
const CustomModal = ({ isVisible, type, message, onConfirm, onCancel }) => {
  if (!isVisible) return null;

  const isConfirm = type === "confirm";
  const title = isConfirm
    ? "নিশ্চিত করুন"
    : message.startsWith("ত্রুটি")
    ? "ত্রুটি!"
    : "সফল!";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all duration-300 scale-100">
        <h3
          className={`text-lg font-bold mb-3 ${
            isConfirm || message.startsWith("ত্রুটি")
              ? "text-red-600"
              : "text-green-600"
          }`}
        >
          {title}
        </h3>
        <p className="text-gray-700 mb-6 text-sm">{message}</p>

        <div className="flex justify-end space-x-3">
          {isConfirm && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              না, ফিরে যান
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white font-semibold transition ${
              isConfirm
                ? "bg-red-600 hover:bg-red-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isConfirm ? "হ্যাঁ, নিশ্চিত" : "ঠিক আছে"}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- Custom Modal শেষ ---

export default function OrderBubble({ order, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  // const { socket, isConnected } = useSocket();

  // Modal State
  const [modal, setModal] = useState({
    isVisible: false,
    type: "", // 'alert' or 'confirm'
    message: "",
    action: null, // Function to run on confirm
  });

  // Helper function to show modal/message
  const showMessage = (type, message, action = null) => {
    setModal({
      isVisible: true,
      type,
      message,
      action,
    });
  };

  // Modal বন্ধ করার জন্য
  const closeModal = () => {
    setModal({ isVisible: false, type: "", message: "", action: null });
  };

  // --- স্ট্যাটাস আপডেট করার ফাংশন ---
  const handleStatusUpdate = async (shortcut) => {
    setLoading(true);
    const { key, note } = shortcut;
    // console.log(order._id)

    try {
      socket.emit("updateStatus", {
        orderId: order._id,
        newStatus: key,
        note: note,
      });
      socket.on("statusUpdated", (data) => {
        console.log(data);
        if (onUpdate) {
          onUpdate(data.order);
        }

      });
    } catch (error) {
      console.log(error);
    }

    setLoading(false);
  };

  // ডিলিট লজিক
  const executeDelete = async () => {
    setLoading(true);
    console.log(order._id);
    // Modal Hide করা হচ্ছে না, কারণ এটি executeDelete() এর পরে closeModal() এর মাধ্যমে বন্ধ হবে

    try {
     const delResponse = await axios.delete(`${API_BASE}/delete/${order._id}`);

      if (onUpdate) {
        // 'DELETE' ইভেন্ট দিয়ে প্যারেন্ট কম্পোনেন্টকে জানানো
        onUpdate(order._id, "DELETE");
      }
      showMessage(
        "alert",
        delResponse?.data?.message,
        // "সফলভাবে ডিলিট করা হয়েছে: অর্ডারটি লিস্ট থেকে সরানো হলো।",
        null
      );
    } catch (error) {
      console.error("Failed to delete order:", error);
      // showMessage("alert", "ত্রুটি: অর্ডার ডিলিট করা ব্যর্থ হয়েছে।", null);
    } finally {
      setLoading(false);
    }
  };

  // --- অর্ডার ডিলিট করার হ্যান্ডেলার (কনফার্মেশন চাইবে) ---
  const handleDeleteOrder = () => {
    showMessage(
      "confirm",
      "আপনি কি নিশ্চিত যে আপনি এই অর্ডারটি ডিলিট করতে চান? এই অ্যাকশনটি অপরিবর্তনীয়।",
      executeDelete
    );
  };

  // অ্যাক্টিভিটি টাইমলাইন তৈরি (নতুনটি উপরে)
  const sortedActivities = [...(order.activities || [])].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  // --- অ্যাকশন বাটন লজিক (নাম্বার ও টেক্সট কপি) ---
  const handleCopy = (text, message) => {
    // Iframe এর মধ্যে document.execCommand('copy') বেশি নির্ভরযোগ্য
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      showMessage("alert", message, null);
    } catch (err) {
      console.error("Copy failed:", err);
      showMessage("alert", "ত্রুটি: কপি করতে ব্যর্থ হয়েছে।", null);
    }
  };

  // সম্পূর্ণ অর্ডার টেক্সট (কপি করার জন্য)
  const orderText = `নাম: ${order.castomerName}\nফোন: ${order.castomerPhone}\nঠিকানা: ${order.castomerAddress}\nCOD: ${order.totalCOD} Taka\nSKU: ${order.productCode}`;

  // স্ট্যাটাস কালার ডাইনামিকালি সেট করা
  const statusColor =
    order.orderStatus === "Pending"
      ? "text-yellow-600 bg-yellow-100"
      : "text-green-600 bg-green-100";

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-4 mb-4 border border-gray-200 hover:shadow-xl transition-all duration-300">
        <div
          className={`cursor-pointer ${
            loading ? "opacity-70 pointer-events-none" : ""
          }`}
          onClick={() => !loading && setIsExpanded(!isExpanded)}
        >
          <div className="flex justify-between items-start mb-2">
            {/* স্ট্যাটাস ও আইডি */}
            <div className="flex flex-col">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}
              >
                {order.orderStatus}
              </span>
              <span className="text-sm text-gray-500 mt-1">
                ID: #{order._id?.slice(-6) || "N/A"}
              </span>
            </div>
            {/* টাইমস্ট্যাম্প */}
            <span className="text-xs text-gray-500 font-medium">
              {formatTime(order.createdAt)}
            </span>
          </div>

          {/* পার্স করা মূল তথ্য */}
          <p className="text-base font-bold text-gray-800">
            {order.castomerName} | {order.totalCOD} টাকা
          </p>
          <p className="text-sm font-medium text-blue-600 hover:underline">
            📞 {order.castomerPhone}
          </p>
          <p className="text-xs text-gray-600 truncate mt-1">
            ঠিকানা: {order.castomerAddress || "পাওয়া যায়নি"}
          </p>
        </div>

        {/* --- অ্যাকশন বাটন সেকশন --- */}
        <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
          {/* বাম দিকের বাটন: কপি, কল */}
          <div className="flex space-x-2">
            <button
              className="p-2 text-sm rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition duration-150 shadow-md"
              onClick={() =>
                handleCopy(order.castomerPhone, "ফোন নম্বর কপি করা হয়েছে!")
              }
              title="ফোন নম্বর কপি"
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
                className="feather feather-copy"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <a
              href={`tel:${order.castomerPhone}`}
              className="p-2 text-sm rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition duration-150 shadow-md"
              title="সরাসরি কল করুন"
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
                className="feather feather-phone"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6.7-6.7A19.79 19.79 0 0 1 2 4.18 2 2 0 0 1 3.16 2h3a2 2 0 0 1 2 1.72v3.25a2 2 0 0 1-1.25 1.83 1.5 1.5 0 0 0-.25.13 10.9 10.9 0 0 0 5.43 5.43 1.5 1.5 0 0 0 .13-.25 2 2 0 0 1 1.83-1.25h3.25A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </a>
            <button
              className="p-2 text-sm rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition duration-150 shadow-md"
              onClick={() =>
                handleCopy(orderText, "সম্পূর্ণ অর্ডার টেক্সট কপি করা হয়েছে!")
              }
              title="সম্পূর্ণ অর্ডার কপি"
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
                className="feather feather-file-text"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </button>
          </div>

          {/* ডান দিকের বাটন: অর্ডার ডিলিট */}
          <button
            className="cursor-pointer flex items-center space-x-1 px-3 py-1.5 text-xs rounded-full bg-red-500 text-white hover:bg-red-600 transition duration-150 font-medium shadow-md"
            onClick={handleDeleteOrder}
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
              className="feather feather-trash-2"
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span>ডিলিট</span>
          </button>
        </div>

        {/* --- কলাপসিবল ডিটেইলস সেকশন --- */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mt-4 pt-4 border-t border-gray-300">
            {/* শর্টকাট স্ট্যাটাস বাটন */}
            <h4 className="text-xs font-semibold mb-3 text-gray-700 uppercase tracking-wider">
              দ্রুত স্ট্যাটাস আপডেট:
            </h4>
            <div className="flex flex-wrap gap-2 mb-6">
              {STATUS_SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut.key}
                  onClick={() => handleStatusUpdate(shortcut)}
                  className={`text-white text-xs font-medium py-1.5 px-3 rounded-full shadow-md transition duration-200 cursor-pointer ${
                    shortcut.color
                  } ${
                    loading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:ring-2 ring-offset-1 ring-opacity-50"
                  }`}
                  disabled={loading}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>

            {/* টাইমলাইন এবং নোট সেকশন */}
            <h4 className="text-xs font-semibold mb-3 text-gray-700 uppercase tracking-wider">
              অ্যাক্টিভিটি টাইমলাইন:
            </h4>
            <div className="space-y-4">
              {sortedActivities.map((activity, index) => (
                <div key={index} className="flex items-start text-xs">
                  <span
                    className={`w-1/4 flex-shrink-0 font-bold ${
                      ACTIVITY_STATUS_COLORS[activity.type] || "text-gray-500"
                    }`}
                  >
                    {formatTime(activity.timestamp)}
                  </span>
                  <div className="w-3/4 pl-3 border-l-2 border-dashed border-gray-200">
                    <p className="font-semibold text-gray-800">
                      {activity.type}
                    </p>
                    <p className="text-gray-600 mt-0.5">
                      {activity.details?.description ||
                        activity.description ||
                        activity.note ||
                        "নোট নেই"}
                    </p>
                  </div>
                </div>
              ))}
              {sortedActivities.length === 0 && (
                <p className="text-xs text-gray-500 italic">
                  এই অর্ডারের জন্য কোনো অ্যাক্টিভিটি রেকর্ড করা হয়নি।
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* কাস্টম Modal রেন্ডার করা */}
      <CustomModal
        isVisible={modal.isVisible}
        type={modal.type}
        message={modal.message}
        // কনফার্ম হলে modal.action (যদি confirm type হয়) অথবা closeModal (যদি alert type হয়) কল হবে
        onConfirm={modal.type === "confirm" ? modal.action : closeModal}
        onCancel={closeModal}
      />
    </>
  );
}
