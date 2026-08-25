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
import { draftOrderService } from "@/services/draftOrderService";
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
  const [draftOrders, setDraftOrders] = useState([]);
  const [draftLoading, setDraftLoading] = useState(true);
  const query = searchQuery.toLowerCase().trim();

  // ---------------- FETCH ALL ORDERS ----------------
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderService.getAll();
      console.log(res.data);
      if (Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------- FETCH ইনকমপ্লিট/ড্রাফট অর্ডার ----------------
  const fetchDraftOrders = useCallback(async () => {
    setDraftLoading(true);
    try {
      const res = await draftOrderService.getAll();
      if (Array.isArray(res.data)) {
        setDraftOrders(res.data);
      }
    } catch (err) {
      console.error("Fetch draft orders error:", err);
    } finally {
      setDraftLoading(false);
    }
  }, []);

  // ---------------- INITIAL LOAD ----------------
  // ✅ লগইন কনফার্ম হওয়ার আগে fetch করা হয় না — নাহলে প্রতিবার অ্যাপ লোড হওয়ার সময়
  // লগইন করার আগেই একটা নিশ্চিত 401 এরর হতো।
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchOrders();
    fetchDraftOrders();
  }, [authLoading, isAuthenticated, fetchOrders, fetchDraftOrders]);

  // ---------------- ইনকমপ্লিট অর্ডার রিয়েল-টাইম আপডেট (নতুন ড্রাফট/আপডেট হলে) ----------------
  useEffect(() => {
    if (!socket) return;

    const handleDraftUpdate = (draft) => {
      setDraftOrders((prev) => {
        const index = prev.findIndex((d) => d?._id === draft?._id);
        if (index !== -1) {
          const copy = [...prev];
          copy[index] = draft;
          return copy;
        }
        return [draft, ...prev];
      });
    };

    // কাস্টমার সাবমিট করলে (draft "completed" হয়ে গেলে) অথবা ম্যানুয়ালি বাতিল করলে
    // "ইনকমপ্লিট" লিস্ট থেকে সরিয়ে দেওয়া হয় — আসল অর্ডারটা এতক্ষণে orderStatusChange
    // ইভেন্ট দিয়ে আলাদাভাবে চলে এসেছে, তাই এখানে কোনো ডুপ্লিকেট থাকে না।
    const handleDraftRemove = (draftId) => {
      setDraftOrders((prev) => prev.filter((d) => d?._id !== draftId));
    };

    socket.on("draftOrderUpdate", handleDraftUpdate);
    socket.on("draftOrderRemove", handleDraftRemove);

    return () => {
      socket.off("draftOrderUpdate", handleDraftUpdate);
      socket.off("draftOrderRemove", handleDraftRemove);
    };
  }, [socket]);

  // --- একটা ড্রাফট ম্যানুয়ালি ডিলিট করা (optimistic UI আপডেট) ---
  const deleteDraftOrder = useCallback(async (draftId) => {
    setDraftOrders((prev) => prev.filter((d) => d?._id !== draftId));
    try {
      await draftOrderService.remove(draftId);
    } catch (err) {
      console.error("Delete draft order error:", err);
      fetchDraftOrders();
    }
  }, [fetchDraftOrders]);

  // --- ড্রাফট এডিট করে সার্ভারে সেভ ---
  const updateDraftOrder = useCallback(async (draftId, data) => {
    const res = await draftOrderService.update(draftId, data);
    if (res?.data?.draft) {
      setDraftOrders((prev) =>
        prev.map((draft) =>
          draft?._id === draftId ? res.data.draft : draft,
        ),
      );
    }
    return res;
  }, []);

  // --- ড্রাফটকে Pending queue-তে কনভার্ট ---
  const convertDraftOrder = useCallback(async (draftId, data = {}) => {
    const res = await draftOrderService.convert(draftId, data);
    // Socket সাধারণত order/draft remove আপডেট করে দেবে। Socket unavailable হলে
    // fallback হিসেবে দুই লিস্টই fresh করা হচ্ছে।
    await Promise.all([fetchOrders(), fetchDraftOrders()]);
    return res;
  }, [fetchOrders, fetchDraftOrders]);

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
        order.orderStatus !== "Delivered" &&
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

    // "Review" ট্যাবটি Order Status নয়; এটি courier.courierStatus-এর উপর নির্ভর করে।
    // কুরিয়ারে বুক করার পর courier status "Review" হলে এই ট্যাবে অর্ডারটি দেখাবে।
    if (activeStatus === "Review") {
      return safeOrders.filter(
        (o) => o?.courier?.courierStatus === "Review",
      );
    }

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
    draftOrders,
    draftLoading,
    deleteDraftOrder,
    updateDraftOrder,
    convertDraftOrder,
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