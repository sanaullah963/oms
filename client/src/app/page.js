"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import OrderList from "../components/OrderList";
import ManualInput from "../components/ManualInput";
import { useSocket } from "../hooks/useSocket";
import { convertNumber, STATUS_TABS } from "../constants/data";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);

  // ---------------- DB search state ----------------
  const [dbOrders, setDbOrders] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.toLowerCase().trim();

  const { socket, data: socketData } = useSocket();

  // ---------------- FETCH ALL ORDERS ----------------
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/orders`);
      setOrders(res.data);
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------- SOCKET SEARCH LISTENER (ONCE) ----------------
  useEffect(() => {
    if (!socket) return;

    const handleSearchResult = (data) => {
      setDbOrders(data?.orders || []);
      setDbLoading(false);
    };

    socket.on("searchResult", handleSearchResult);

    return () => {
      socket.off("searchResult", handleSearchResult);
    };
  }, [socket]);

  // ---------------- EMIT SEARCH QUERY ----------------
  const fetchSearchFromDB = useCallback(
    (q) => {
      if (!q || !socket?.connected) {
        setDbOrders([]);
        return;
      }
      setDbLoading(true);
      socket.emit("searchQuery", q);
    },
    [socket],
  );

  // ---------------- DEBOUNCE SEARCH ----------------
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        fetchSearchFromDB(query);
      } else {
        setDbOrders([]);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [query, fetchSearchFromDB]);

  // ---------------- HANDLE ORDER UPDATE ----------------
  const handleOrderUpdate = useCallback((data, actionType = "UPDATE") => {
    setOrders((prev) => {
      if (actionType === "DELETE") {
        return prev.filter((o) => o?._id !== data);
      }

      const index = prev.findIndex((o) => o?._id === data?._id);
      if (index !== -1) {
        const copy = [...prev];
        copy[index] = data;
        return copy;
      }
      return [data, ...prev];
    });
  }, []);

  // ---------------- INITIAL LOAD ----------------
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ---------------- REAL-TIME SOCKET UPDATE ----------------
  useEffect(() => {
    if (socketData && socketData._id) {
      handleOrderUpdate(socketData, "UPDATE");
    }
  }, [socketData, handleOrderUpdate]);

  // ---------------- PENDING ORDERS ----------------
  let allPendingOrder = orders?.filter(
    (order) =>
      order.orderStatus !== "Booked" && order.orderStatus !== "Cancelled",
  );
  // ---------------- FILTERED ORDERS ----------------
  const filteredOrders = useMemo(() => {
    if (query) {
      const localResults = orders.filter((order) => {
        const enNumber = convertNumber(order?.castomerPhone);
        const fields = [
          order?._id,
          order?.castomerName,
          enNumber,
          order?.productCode,
          order?.totalCOD,
          order?.rawInputText,
          order?.courier?.trackingId,
        ];

        return fields.some((f) => f && String(f).toLowerCase().includes(query));
      });

      // merge local + db result (remove duplicate)
      const combined = [...localResults, ...dbOrders];
      return combined.filter(
        (v, i, a) => a.findIndex((t) => t._id === v._id) === i,
      );
    }
    if (activeStatus === "All") {
      return allPendingOrder;
    }
    return orders.filter((o) => o.orderStatus === activeStatus);
  }, [orders, dbOrders, query, activeStatus]);

  // ---------------- BUTTON STYLE ----------------
  const getButtonClasses = (status) => {
    const base =
      "md:px-4 p-1 md:py-2 font-semibold text-sm rounded-md transition";
    return activeStatus === status
      ? `${base} bg-green-600 text-white`
      : `${base} bg-gray-200 text-gray-700`;
  };

  // ---------------- UI ----------------
  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-50">
      {/* Header / Status Tabs */}
      <header className="p-1 md:p-3 bg-white border-b border-gray-200 shadow-md flex-shrink-0 z-10">
        {/* search bar */}
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
                  className="absolute cursor-pointer  inset-y-0 right-0 flex items-center pr-2 text-gray-500 hover:text-gray-900"
                  // Function to clear the input field
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search query"
                >
                  X
                </button>
              )}
            </div>
          </div>
          <h1 className="text-lg font-extrabold text-indigo-700 mb-1 md:mb-2">
            <span> অর্ডার</span>
            <span className="text-green-700 text-2xl ml-2 font-mono">
              {allPendingOrder.length}
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
                tab.key === "All"
                  ? allPendingOrder.length
                  : orders.filter((o) => o.orderStatus === tab.key).length
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
            {/* {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md mt-4">
                <p className="text-lg font-semibold">
                  এই স্ট্যাটাসে কোনো অর্ডার নেই।
                </p>
              </div>
            )} */}

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
