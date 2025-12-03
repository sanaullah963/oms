"use client";
import React, { useState, useEffect, useCallback, useMemo, use } from "react";
import axios from "axios";
import OrderList from "../components/OrderList";
import ManualInput from "../components/ManualInput";
import { useSocket } from "../hooks/useSocket";
import { convertNumber, STATUS_TABS } from "../constants/data";
import ClipboardCopy from "@/components/Copy";
import Copy from "@/components/Copy";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.toLowerCase().trim();
  const [show, setShow] = useState(false);
  const { data: socketData } = useSocket();

  // --- Core Functions: সমস্ত অর্ডার ফেচ করা ---
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      // Optionally set an error state here
    } finally {
      setLoading(false);
    }
  }, []);

  // --- State Management: আপডেট বা ডিলিট হ্যান্ডেল করা ---
  const handleOrderUpdate = useCallback((data, actionType = "UPDATE") => {
    setOrders((prevOrders) => {
      if (actionType === "DELETE") {
        // অর্ডারের id অনুযায়ী ফিল্টার করে সরিয়ে দেওয়া
        return prevOrders.filter((order) => order?._id !== data);
      }
      // যদি UPDATE হয়
      const index = prevOrders?.findIndex((o) => o?._id === data?._id);
      if (index !== -1) {
        // বিদ্যমান অর্ডারটি আপডেট করা
        const newOrders = [...prevOrders];
        newOrders[index] = data;
        return newOrders;
      } else {
        // যদি নতুন অর্ডার হয় (যেমন ManualInput থেকে বা Socket এর মাধ্যমে)
        return [data, ...prevOrders];
      }
    });
  }, []);

  // --- Effects: Initial Load ---
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // --- Effects: Socket.IO রিয়েল-টাইম আপডেট ---
  useEffect(() => {
    if (socketData && socketData._id) {
      // নতুন ডেটা পেলে (Socket Hook থেকে) তা লিস্টে আপডেট/যোগ করা
      console.log("Applying socket data update...");
      handleOrderUpdate(socketData, "UPDATE");
    }
  }, [socketData, handleOrderUpdate]);

  // --- Render Logic ---
  // const filteredOrders = orders.filter(
  //   (order) => order.orderStatus === activeStatus
  // );

  const filteredOrders = useMemo(() => {
    // 1. যদি সার্চ কোয়েরি থাকে, তবে স্ট্যাটাস নির্বিশেষে সকল অর্ডারে সার্চ হবে
    if (query) {
      return orders.filter((order) => {
        const enNunber = convertNumber(order?.castomerPhone);
        const searchableFields = [
          order?._id,
          order?.castomerName,
          // order?.castomerPhone,
          enNunber,
          order?.productCode,
          order?.totalCOD,
          order?.rawInputText,
          order?.courier?.trackingId,
        ];

        return searchableFields.some((field) => {
          if (field) {
            // স্ট্রিং-এ রূপান্তর করে সার্চ করা
            const fieldStr = String(field).toLowerCase();
            return fieldStr.includes(query);
          }
          return false;
        });
      });
    }
    // 2. যদি সার্চ কোয়েরি খালি থাকে, তবে শুধুমাত্র বর্তমান activeStatus অনুযায়ী ফিল্টার করা হবে
    else {
      return orders.filter((order) => order.orderStatus === activeStatus);
    }
  }, [orders, activeStatus, searchQuery]);

  // ডাইনামিক বাটন ক্লাস তৈরি
  const getButtonClasses = (status) => {
    const base =
      "md:px-4 p-1 md:py-2 font-semibold text-sm rounded-md transition-colors duration-200 w-auto";
    if (activeStatus === status) {
      return `${base} text-white shadow-lg bg-green-600 hover:bg-green-700 `;
    }
    return `${base} bg-gray-200 text-gray-700 hover:bg-gray-300`;
  };
  const handeelcopy = async () => {
    console.log("copied");
    await navigator.clipboard.writeText("01328951929");
    setShow(true);
    setTimeout(() => {
      setShow(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-50">
      {/* Header / Status Tabs */}
      <header className="p-1 md:p-3 bg-white border-b border-gray-200 shadow-md flex-shrink-0 z-10">
        {/* search bar */}
        <button onClick={() => handeelcopy()}>click</button>
        <Copy show={show} />
        <div className="flex justify-between ">
          {/* search bar input box */}
          <div className="flex-1 mr-4">
            <div className="relative">
              <input
                type="text"
                placeholder="নাম, ফোন, বা অর্ডার ID দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-2 py-1 border border-gray-300 rounded-md focus:ring-indigo-200 focus:border-indigo-200 transition duration-150 text-sm"
              />
              {/* clear search button */}
              {searchQuery && (
                <button
                  type="button"
                  // Positioning the button absolutely inside the relative container
                  className="absolute cursor-pointer  inset-y-0 right-0 flex items-center pr-2 text-gray-500 hover:text-gray-900 focus:outline-none"
                  // Function to clear the input field
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search query"
                >
                  {/* 'X' icon or character */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <h1 className="text-lg font-extrabold text-indigo-700 mb-1 md:mb-2">
            <span> অর্ডার</span>
            <span className="text-green-700 text-2xl ml-2 font-mono">
              {orders?.length}
            </span>
          </h1>
        </div>

        <div
          className="flex overflow-x-auto  w-auto gap-0.5 md:gap-2 whitespace-nowrap"
          style={{
            // Firefox-এর জন্য hide scrollbar
            scrollbarWidth: "none",
            // IE এবং Edge-এর জন্য hide scrollbar
            msOverflowStyle: "none",
          }}
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStatus(tab.key)}
              className={getButtonClasses(tab.key)}
            >
              {`${tab.label} ${
                orders.filter((o) => o.orderStatus === tab.key).length
              }`}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area: Order List */}
      <div className="flex-1 overflow-y-auto p-1.5 md:p-4 bg-gray-100 pb-36">
        {" "}
        {/* pb-36 for bottom padding above fixed input */}
        {loading ? (
          // Loading Spinner when loding
          <div className="text-center py-10 text-gray-500">
            <svg
              className="animate-spin h-8 w-8 text-indigo-500 mx-auto"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="mt-3 text-lg">অর্ডার লোড হচ্ছে...</p>
          </div>
        ) : (
          <>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md mt-4">
                <p className="text-lg font-semibold">
                  এই স্ট্যাটাসে কোনো অর্ডার নেই।
                </p>
              </div>
            )}

            {/* onOrderUpdate prop টি OrderList এর মাধ্যমে পাস করা হলো */}
            <OrderList
              orders={filteredOrders}
              onOrderUpdate={handleOrderUpdate} // স্ট্যাটাস বা ডিলিট আপডেট হ্যান্ডেল করার জন্য
            />
          </>
        )}
      </div>

      {/* Fixed Bottom Input Area */}
      <div className="fixed bottom-0 left-0 right-0 px-1 py-2  bg-white border-t border-gray-200 shadow-2xl z-20">
        <ManualInput onUpdate={handleOrderUpdate} />
      </div>
    </div>
  );
}
