"use client";
import React, { useState } from "react";
import axios from "axios";
import { useSocket } from "../hooks/useSocket";
import { ToastContainer, toast } from "react-toastify";
import {
  STATUS_SHORTCUTS,
  ACTIVITY_STATUS_COLORS,
  formatTime,
} from "../constants/data";

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

export default function OrderBubble({ order, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- নতুন স্টেট: এডিটিং মোড এবং ফর্ম ডেটা ---
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    castomerName: order.castomerName,
    castomerPhone: order.castomerPhone,
    castomerAddress: order.castomerAddress,
    totalCOD: order.totalCOD,
    productCode: order.productCode,
    rawInputText: order.rawInputText,
  });

  const { socket, isConnected } = useSocket();

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

  // --- ফর্ম ডেটা হ্যান্ডেলার ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "totalCOD" ? Number(value) : value,
    }));
  };

  // --- অর্ডার আপডেট করার ফাংশন ---
  const handleUpdateOrder = async () => {
    setLoading(true);
    // ইনপুট ভ্যালিডেশন
    if (
      !formData.castomerName ||
      !formData.castomerPhone ||
      !formData.castomerAddress ||
      !formData.totalCOD ||
      !formData.productCode
    ) {
      // showMessage("alert", "ত্রুটি: সবগুলি ফিল্ড পূরণ করা আবশ্যক।", null);
      toast.error("সবগুলি ফিল্ড পূরণ করুন");
      setLoading(false);
      return;
    }

    try {
      // নতুন আপডেট এন্ডপয়েন্ট ব্যবহার করা
      const response = await axios.put(
        `${API_BASE}/update-order/${order._id}`,
        formData
      );
      if (response.status !== 200) {
        toast.error("অর্ডারটি আপডেট করার সময় ত্রুটি হয়েছে।");
        setLoading(false);
        return;
      }
      // প্যারেন্ট কম্পোনেন্টকে নতুন অর্ডার ডেটা দিয়ে আপডেট করা
      if (onUpdate) {
        onUpdate(response.data.order);
      }

      // showMessage("alert", response.data.message, null);
      toast.success(response.data.message);
      setIsEditing(false); // এডিটিং মোড থেকে বের হয়ে আসা
    } catch (error) {
      console.error("Failed to update order:", error);
      const errorMessage =
        error.response?.data?.message ||
        "সার্ভার এরর: অর্ডার আপডেট করা ব্যর্থ হয়েছে।";
      showMessage("alert", `ত্রুটি: ${errorMessage}`, null);
    } finally {
      setLoading(false);
    }
  };

  // --- স্ট্যাটাস আপডেট করার ফাংশন ---
  const handleStatusUpdate = async (shortcut) => {
    setLoading(true);
    const { key, note } = shortcut;

    try {
      socket.emit("updateStatus", {
        orderId: order._id,
        newStatus: key,
        note: note,
      });

      socket.on("statusUpdated", (data) => {
        // console.log(data);
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
  const handleCopy = (text) => {
    // Iframe এর মধ্যে document.execCommand('copy') বেশি নির্ভরযোগ্য
    try {
      // click to copy data
      navigator.clipboard.writeText(text);
      toast.success(`${text} --> কপি হয়েছে`);
    } catch (err) {
      console.error("Copy failed:", err);
      showMessage("alert", "ত্রুটি: কপি করতে ব্যর্থ হয়েছে।", null);
    }
  };

  // ----- কুরিয়ার বুকিং এর জন্য চূড়ান্ত API কল ফাংশন ---
  const executeCourierBooking = async () => {
    setLoading(true);
    try {
      // নতুন সার্ভার এন্ডপয়েন্ট: POST /api/orders/:id/courier-booking
      const response = await axios.post(
        `${API_BASE}/courier/steadfast/${order._id}`
      );
      const { newUpdatedOrder, data, status, message } = response.data;
      //response.data.data for consinment
      //response.data
      // console.log("after send response", data);
      // console.log("new order", response.data);

      if (status === "success") {
        // const trackingId = response.data.trackingId;
        toast.success(
          `Steadfast বুকিং সফল! ট্র্যাকিং ID: ${newUpdatedOrder?.courier?.trackingId}`
        );
        if (onUpdate) {
          // সার্ভার থেকে আসা আপডেট হওয়া অর্ডারটি দিয়ে স্টেট আপডেট করুন
          onUpdate(newUpdatedOrder);
        }
      } else {
        // সার্ভার-সাইড কাস্টম এরর (যেমন: Steadfast এরর)
        toast.error(message);
      }
    } catch (error) {
      console.error("Courier Booking Failed:", error);
      // সার্ভার এরর মেসেজ দেখান
      const serverError =
        error.response?.data?.message ||
        "সার্ভার এরর। বুকিং করতে ব্যর্থ হয়েছে।";
      showMessage("alert", `ত্রুটি: ${serverError}`, null);
    } finally {
      setLoading(false);
    }
  };

  // ------ booking handel
  const handelBooking = () => {
    if (order.orderStatus === "Confirmed") {
      executeCourierBooking();
    } else if (order.orderStatus === "Booked") {
      showMessage("alaert", "অর্ডারটি আগে বুকিং করা", null);
      return;
    } else {
      showMessage("alert", "অর্ডারটি আগে কনফর্ম করুন", null);

      return;
    }
  };
  // সম্পূর্ণ অর্ডার টেক্সট (কপি করার জন্য)
  const orderText = order?.rawInputText;

  // স্ট্যাটাস কালার ডাইনামিকালি সেট করা
  const statusColor =
    order.orderStatus === "Pending"
      ? "text-yellow-600 bg-yellow-100"
      : order.orderStatus === "Confirmed" || order.orderStatus === "Booked"
      ? "text-green-600 bg-green-100"
      : order.orderStatus === "Cancelled"
      ? "text-red-600 bg-red-100"
      : "text-indigo-600 bg-indigo-100";

  return (
    <>
      <div className="bg-white  rounded-lg shadow-lg p-2 md:p-4 mb-1 border border-gray-300 hover:shadow-xl transition-all duration-300">
        {/* --- অর্ডার ডিসপ্লে / এডিট মোড --- */}
        {isEditing ? (
          // --- এডিট মোড (ফর্ম) ---
          <div className="space-y-1.5">
            <h4 className="text-lg font-bold text-indigo-700">
              অর্ডার এডিট করুন
            </h4>
            {/* Raw Input Text */}
            <label htmlFor="rawInputText" className="text-sm">
              Raw Text
            </label>
            <textarea
              name="rawInputText"
              value={formData.rawInputText}
              onChange={handleFormChange}
              placeholder="RAW ইনপুট টেক্সট (ঐচ্ছিক)"
              rows="4"
              className=" w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
              disabled={loading}
            />
            {/* কাস্টমার নাম */}
            <label htmlFor="name" className="text-sm">
              Name
            </label>
            <input
              type="text"
              name="castomerName"
              value={formData.castomerName}
              onChange={handleFormChange}
              placeholder="কাস্টমার নাম"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading}
            />
            {/* কাস্টমার ফোন */}
            <label htmlFor="phone" className="text-sm">
              Phone
            </label>
            <input
              type="tel"
              name="castomerPhone"
              value={formData.castomerPhone}
              onChange={handleFormChange}
              placeholder="কাস্টমার ফোন"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading}
            />
            {/* COD */}
            <label htmlFor="totalCOD" className="text-sm">
              COD
            </label>
            <input
              type="number"
              name="totalCOD"
              value={formData.totalCOD}
              onChange={handleFormChange}
              placeholder="COD টাকা"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading}
            />
            {/* Product Code */}
            <label htmlFor="productCode" className="text-sm">
              Product Code
            </label>
            <input
              type="text"
              name="productCode"
              value={formData.productCode}
              onChange={handleFormChange}
              placeholder="পণ্য কোড (SKU)"
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading}
            />
            {/* ঠিকানা */}
            <label htmlFor="address" className="text-sm">
              Address
            </label>
            <textarea
              name="castomerAddress"
              value={formData.castomerAddress}
              onChange={handleFormChange}
              placeholder="কাস্টমার ঠিকানা"
              rows="2"
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading}
            />

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => setIsEditing(false)}
                className="cursor-pointer px-4 py-2 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                disabled={loading}
              >
                বাতিল
              </button>
              <button
                onClick={handleUpdateOrder}
                className={`cursor-pointer px-4 py-2 text-sm rounded-lg text-white font-semibold transition ${
                  loading
                    ? "bg-indigo-400"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
                disabled={loading}
              >
                {loading ? "সেভ হচ্ছে..." : "পরিবর্তন সেভ করুন"}
              </button>
            </div>
          </div>
        ) : (
          // --- ডিসপ্লে মোড 
          <>
            <div
              className={`cursor-pointer ${
                loading ? "opacity-70 pointer-events-none" : ""
              }`}
              onClick={() => !loading && setIsExpanded(!isExpanded)}
            >
              <div className="flex justify-between items-start mb-1">
                {/* স্ট্যাটাস ও আইডি */}
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${statusColor}`}
                  >
                    {order.orderStatus}
                  </span>
                </div>
                {/* টাইমস্ট্যাম্প */}
                <span className="text-xs text-gray-500 font-medium">
                  {formatTime(order.createdAt)}
                </span>
              </div>

              {/* পার্স করা মূল তথ্য */}
              <p className="text-sm font-bold text-gray-800">
                {order.castomerName} | {order.totalCOD} | code:{" "}
                {order.productCode}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-blue-600 hover:underline">
                  {order.castomerPhone}
                </p>
                ।
                <p className="text-sm font-medium text-blue-600 hover:underline">
                  {/* {order.castomerPhone} */}
                  Alt number
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-1 h-10">
                {order?.rawInputText || "পাওয়া যায়নি"}
              </p>
            </div>

            {/* --- অ্যাকশন বাটন সেকশন --- */}
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-100">
              {/* বাম দিকের বাটন: কপি, কল, এডিট */}
              <div className="flex space-x-2">
                {/* ফোন number কপি */}
                <button
                  className="p-2 cursor-pointer text-sm rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition duration-150 shadow-md"
                  onClick={() => handleCopy(order.castomerPhone)}
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
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                {/* call and number copy */}
                <a
                  href={`tel:${order.castomerPhone}`}
                  onClick={() =>
                    navigator.clipboard.writeText(order.castomerPhone)
                  }
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
                {/* rawInput text copy */}
                <button
                  className="p-2 cursor-pointer text-sm rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition duration-150 shadow-md"
                  onClick={() => handleCopy(order?.rawInputText)}
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

                {/* --- এডিট বাটন (নতুন) --- */}
                <button
                  className="p-2 cursor-pointer text-sm rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition duration-150 shadow-md"
                  onClick={(e) => {
                    e.stopPropagation(); // Bubbling বন্ধ করা
                    setIsEditing(true);
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
                    className="feather feather-edit-2"
                  >
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                </button>
                {/* booking button */}
                <button
                  className="p-2 cursor-pointer text-sm rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition duration-150 shadow-md"
                  onClick={() => handelBooking(order)}
                  title="সম্পূর্ণ অর্ডার কপি"
                  disabled={loading}
                >
                  {/* <svg
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
                  </svg> */}
                  Booking
                </button>
              </div>
              {/* ডান দিকের বাটন*/}

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
                {/* <span>ডিলিট</span> */}
              </button>
            </div>

            {/* --- কলাপসিবল ডিটেইলস সেকশন --- */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="mt-2 pt-2 border-t border-gray-300">
                {/* শর্টকাট স্ট্যাটাস বাটন */}
                {order?.courier?.trackingId && (
                  <div className="text-sm font-medium flex items-center gap-1">
                    <p>SteadFast id : </p>
                    <p className="text-blue-600 hover:underline"
                    onClick={() =>( navigator.clipboard.writeText(order.courier.trackingId), toast.success("কপি হয়েছে : "+order.courier.trackingId))}
                    >
                      {order?.courier?.trackingId}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-1  mb-6">
                  {STATUS_SHORTCUTS.map((shortcut) => (
                    <button
                      key={shortcut.key}
                      onClick={() => handleStatusUpdate(shortcut)}
                      className={`text-white text-xs font-medium py-1.5 px-2 md:px-3 rounded-lg  md:rounded-full shadow-md transition duration-200  cursor-pointer ${
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
                          ACTIVITY_STATUS_COLORS[activity.type] ||
                          "text-gray-500"
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
                        {/* {order?.orderStatus === "Booked" &&
                          order?.courier?.trackingId && (
                            <p>ট্র্যাকিং আইডি: {order.courier.trackingId}</p>
                          )} */}
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
          </>
        )}
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
      <ToastContainer />
    </>
  );
}
