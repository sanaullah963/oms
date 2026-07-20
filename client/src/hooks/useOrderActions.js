"use client";
import { useEffect, useCallback, useState } from "react";
import { useSocket } from "./useSocket";
import { orderService } from "@/services/orderService";

export function useOrderActions(order, onUpdate) {
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ✅ সব socket event listener একবারই (mount/unmount-এ) রেজিস্টার হয় —
  // আগে প্রতিটা action function-এর ভেতরে আলাদা করে socket.on() কল হতো।
  useEffect(() => {
    if (!socket) return;

    const handleOrderUpdated = (data) => {
      if (data?.order && onUpdate) onUpdate(data.order);
    };
    const handleStatusUpdated = (data) => {
      if (data?.success && data?.order && onUpdate) onUpdate(data.order);
    };
    const handleNoteAdded = (data) => {
      if (data?.updatedOrder && onUpdate) onUpdate(data.updatedOrder);
    };
    const handleCourierHistoryResult = (data) => {
      setHistoryLoading(false);
      if (data?.success && data?.result && onUpdate) {
        onUpdate(data.result);
      }
    };

    socket.on("orderUpdated", handleOrderUpdated);
    socket.on("statusUpdated", handleStatusUpdated);
    socket.on("noteAdded", handleNoteAdded);
    socket.on("distributecourierHistory", handleCourierHistoryResult);

    return () => {
      socket.off("orderUpdated", handleOrderUpdated);
      socket.off("statusUpdated", handleStatusUpdated);
      socket.off("noteAdded", handleNoteAdded);
      socket.off("distributecourierHistory", handleCourierHistoryResult);
    };
  }, [socket, onUpdate]);

  // --- স্ট্যাটাস আপডেট (কনফার্ম, বাতিল ইত্যাদি শর্টকাট বাটন) ---
  const updateStatus = useCallback(
    (shortcut, noteText) => {
      if (!socket) return;
      const note = noteText || shortcut?.note;
      if (shortcut.copyText) {
        navigator.clipboard.writeText(shortcut.copyText);
      }
      socket.emit("updateStatus", { orderId: order._id, newStatus: shortcut.key, note });
    },
    [socket, order._id],
  );

  // --- কমেন্ট/নোট যোগ করা ---
  const addNote = useCallback(
    (noteText) => {
      if (!socket) return;
      socket.emit("addNote", { orderId: order._id, note: noteText });
    },
    [socket, order._id],
  );

  // --- কাস্টমারের সব কুরিয়ারের হিস্ট্রি আনা ---
  const fetchCourierHistory = useCallback(() => {
    if (!socket || order?.courierHistory?.all) return;
    setHistoryLoading(true);
    socket.emit("allCourierHistory", { orderId: order._id });
  }, [socket, order]);

  // --- অর্ডার আপডেট (এডিট ফর্ম সেভ) ---
  const updateOrder = useCallback(
    async (formData) => {
      setLoading(true);
      try {
        const response = await orderService.update(order._id, formData);
        if (onUpdate) onUpdate(response.data.order);
        return { success: true, data: response.data };
      } catch (error) {
        const message =
          error.response?.data?.message || "সার্ভার এরর: অর্ডার আপডেট করা ব্যর্থ হয়েছে।";
        return { success: false, message };
      } finally {
        setLoading(false);
      }
    },
    [order._id, onUpdate],
  );

  // --- অর্ডার ডিলিট ---
  const deleteOrder = useCallback(async () => {
    setLoading(true);
    try {
      const response = await orderService.remove(order._id);
      if (onUpdate) onUpdate(order._id, "DELETE");
      return { success: true, message: response?.data?.message };
    } catch (error) {
      return { success: false, message: "ত্রুটি: অর্ডার ডিলিট করা ব্যর্থ হয়েছে।" };
    } finally {
      setLoading(false);
    }
  }, [order._id, onUpdate]);

  // --- Steadfast-এ কুরিয়ার বুকিং ---
  const bookCourier = useCallback(async () => {
    setLoading(true);
    try {
      const response = await orderService.bookSteadfast(order._id);
      const { newUpdatedOrder, status } = response.data;
      if (status === "success" && onUpdate) {
        onUpdate(newUpdatedOrder);
      }
      return { success: status === "success" };
    } catch (error) {
      const message =
        error.response?.data?.message || "সার্ভার এরর। বুকিং করতে ব্যর্থ হয়েছে।";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [order._id, onUpdate]);

  // --- অর্ডার শিডিউল করা ---
  const scheduleOrder = useCallback(
    async (date, note) => {
      const response = await orderService.schedule(order._id, date, note);
      return response.data;
    },
    [order._id],
  );

  // --- অ্যাটেনশন নোট সমাধান করা (needsAttention: false) ---
  const resolveAttention = useCallback(async () => {
    setLoading(true);
    try {
      const response = await orderService.markAttentionResolved(order._id);
      if (response.data && onUpdate) onUpdate(response.data);
    } finally {
      setLoading(false);
    }
  }, [order._id, onUpdate]);

  return {
    loading,
    historyLoading,
    updateStatus,
    addNote,
    fetchCourierHistory,
    updateOrder,
    deleteOrder,
    bookCourier,
    scheduleOrder,
    resolveAttention,
  };
}
