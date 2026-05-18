"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import { useSocket } from "../hooks/useSocket";
import { convertNumber } from "../constants/data";

// ১. কনটেক্সট তৈরি করা
const OrderContext = createContext();

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ২. প্রোভাইডার কম্পোনেন্ট তৈরি করা
export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const { socket, data: socketData } = useSocket();
  const [dbOrders, setDbOrders] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchWaiting, setSearchWaiting] = useState(false);
  const query = searchQuery.toLowerCase().trim();

  // ---------------- FETCH ALL ORDERS ----------------
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/orders`);
      if (Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------- INITIAL LOAD ----------------
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ---------------- HANDLE ORDER UPDATE (গ্লোবাল মিউটেশন) ----------------
  const handleOrderUpdate = useCallback((data, actionType = "UPDATE") => {
    setOrders((prev) => {
      const currentPrev = Array.isArray(prev) ? prev : [];
      if (actionType === "DELETE") {
        return currentPrev.filter((o) => o?._id !== data);
      }

      const index = currentPrev.findIndex((o) => o?._id === data?._id);
      if (index !== -1) {
        const copy = [...currentPrev];
        copy[index] = data;
        return copy;
      }
      return [data, ...currentPrev];
    });
  }, []);

  // ---------------- REAL-TIME SOCKET UPDATE ----------------
  useEffect(() => {
    if (socketData && socketData._id) {
      handleOrderUpdate(socketData, "UPDATE");
    }
  }, [socketData, handleOrderUpdate]);

  // ---------------- SOCKET SEARCH LISTENER ----------------
  useEffect(() => {
    if (!socket) return;

    const handleSearchResult = (data) => {
      setDbOrders(data?.orders || []);
      setDbLoading(false);
      setSearchWaiting(false);
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
        setSearchWaiting(true);
      } else {
        setDbOrders([]);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [query, fetchSearchFromDB]);

  // ---------------- REAL-TIME WEBHOOK/STATUS CHANGE LISTENER ----------------
  useEffect(() => {
    if (!socket) return;

    const handleOrderStatusChange = (orderData) => {
      setOrders((prevOrders) => {
        const exists = prevOrders.find((o) => o._id === orderData._id);
        if (exists) {
          return prevOrders.map((order) =>
            order._id === orderData._id ? orderData : order,
          );
        } else {
          return [orderData, ...prevOrders];
        }
      });
    };

    socket.on("orderStatusChange", handleOrderStatusChange);

    return () => {
      socket.off("orderStatusChange", handleOrderStatusChange);
    };
  }, [socket]);

  // ---------------- PENDING ORDERS CALCULATION ----------------
  const allPendingOrder = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter(
      (order) =>
        order &&
        order._id &&
        order.orderStatus !== "Booked" &&
        order.orderStatus !== "Cancelled" &&
        order.orderStatus !== "Confirmed",
    );
  }, [orders]);

  // ---------------- FILTERED ORDERS CALCULATION ----------------
  const filteredOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders.filter(Boolean) : [];

    if (query) {
      const localResults = safeOrders.filter((order) => {
        if (!order) return false;
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

      const combined = [...localResults, ...dbOrders.filter(Boolean)];
      return combined.filter(
        (v, i, a) => v && a.findIndex((t) => t?._id === v?._id) === i,
      );
    }

    if (activeStatus === "All") return allPendingOrder;
    return safeOrders.filter((o) => o && o.orderStatus === activeStatus);
  }, [orders, dbOrders, query, activeStatus]);

// ---------------- ATTENTION ORDERS CALCULATION ----------------
  const inportantNotes = useMemo(() => {
  if (!Array.isArray(orders)) return [];
  return orders.filter((order) => order.needsAttention === true);
}, [orders]);

// const inportantNotes = useMemo(() => {
//   if (!Array.isArray(orders)) return [];
  
//   return orders
//     .filter((order) => order && order.needsAttention === true) // প্রথমে ফিল্টার করবে
//     .map((order) => ({
//       _id: order._id, // ড্যাশবোর্ডে লুপ বা ম্যাপ (map) করার সময় unique key হিসেবে ব্যবহারের জন্য ID রাখা ভালো
//       castomerName: order.castomerName,
//       castomerPhone: order.castomerPhone,
//       address: order.address, // আপনার ডাটাবেজে এড্রেস ফিল্ডের নাম (যেমন: address বা customerAddress)
//     }));
// }, [orders]);

  // সব ডেটা এবং ফাংশন একসাথে ভ্যালু হিসেবে পাস করা হচ্ছে
  const value = {
    inportantNotes,
    orders,
    activeStatus,
    setActiveStatus,
    loading,
    dbLoading,
    searchQuery,
    setSearchQuery,
    filteredOrders,
    allPendingOrder,
    handleOrderUpdate,
    fetchOrders,
    searchWaiting,
  };

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
}

// ৩. কাস্টম হুক তৈরি করা যাতে যেকোনো ফাইলে সহজে ব্যবহার করা যায়
export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return context;
}
