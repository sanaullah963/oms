"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/context/AuthContext";
import { orderService } from "@/services/orderService";
import { convertNumber } from "@/utils/numberUtils";

const OrderContext = createContext();

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [dbOrders, setDbOrders] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchWaiting, setSearchWaiting] = useState(false);
  const query = searchQuery.toLowerCase().trim();

  // ---------------- FETCH ALL ORDERS ----------------
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderService.getAll();
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
  // ✅ লগইন কনফার্ম হওয়ার আগে fetch করা হয় না — নাহলে প্রতিবার অ্যাপ লোড হওয়ার সময়
  // লগইন করার আগেই একটা নিশ্চিত 401 এরর হতো।
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchOrders();
  }, [authLoading, isAuthenticated, fetchOrders]);

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
        }
        return [orderData, ...prevOrders];
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
  }, [orders, dbOrders, query, activeStatus, allPendingOrder]);

  // ---------------- ATTENTION ORDERS CALCULATION ----------------
  const inportantNotes = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((order) => order.needsAttention === true);
  }, [orders]);

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

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return context;
}
