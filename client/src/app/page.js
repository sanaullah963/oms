"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  const { socket, data: socketData } = useSocket();
  const [isAnimating, setIsAnimating] = useState(false);

  // ---------------- DB search state ----------------
  const [dbOrders, setDbOrders] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.toLowerCase().trim();

  // ---------------- SWIPE REFS (NEW) ----------------
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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

  // ---------------- SOCKET SEARCH LISTENER ----------------
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

  useEffect(() => {
    setIsAnimating(true);
    const t = setTimeout(() => setIsAnimating(false), 180);
    return () => clearTimeout(t);
  }, [activeStatus]);
  // ---------------- SWIPE HANDLERS (NEW) ----------------
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) < 50) return;

    const currentIndex = STATUS_TABS.findIndex(
      (tab) => tab.key === activeStatus,
    );

    if (diff > 0 && currentIndex < STATUS_TABS.length - 1) {
      setActiveStatus(STATUS_TABS[currentIndex + 1].key);
    }

    if (diff < 0 && currentIndex > 0) {
      setActiveStatus(STATUS_TABS[currentIndex - 1].key);
    }
  };

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

      const combined = [...localResults, ...dbOrders];
      return combined.filter(
        (v, i, a) => a.findIndex((t) => t._id === v._id) === i,
      );
    }

    if (activeStatus === "All") return allPendingOrder;
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
          <div className="flex-1 mr-4">
            <div className="relative">
              <input
                type="text"
                placeholder="নাম, ফোন, বা অর্ডার ID দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-2 py-1 border border-gray-300 rounded-md focus:ring-indigo-200 focus:border-indigo-200 transition duration-150 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500"
                  onClick={() => setSearchQuery("")}
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

        <div className="flex overflow-x-auto w-auto gap-0.5 md:gap-2 whitespace-nowrap">
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

      {/* Main Content Area */}
      <div
        className={`flex-1 overflow-y-auto p-1.5 md:p-4 bg-gray-100 pb-36
    transition-all duration-200 ease-out
    ${isAnimating ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"}
  `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            অর্ডার লোড হচ্ছে...
          </div>
        ) : (
          <OrderList
            orders={filteredOrders}
            onOrderUpdate={handleOrderUpdate}
          />
        )}
      </div>

      {/* input section Fixed Bottom Input */}
      <div className="fixed bottom-0 left-0 right-0 px-1 py-2 bg-white border-t border-gray-200 shadow-2xl z-20">
        <ManualInput onUpdate={handleOrderUpdate} />
      </div>
    </div>
  );
}
