import { useEffect, useState, useMemo } from "react";
import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const socket = io(API_URL, {
  path: "/socket.io",
  autoConnect: true,
});

export const useSocket = () => {
  const memoizedSocket = useMemo(() => socket, []);

  const [isConnected, setIsConnected] = useState(memoizedSocket.connected);
  const [data, setData] = useState(null); // সার্ভার থেকে আসা নতুন ডেটা ধরার জন্য

  useEffect(() => {
    memoizedSocket.on("connect", () => {
      setIsConnected(true);
      console.log("Socket Connected!");
    });

    memoizedSocket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket Disconnected!");
    });

    // সার্ভার থেকে আসা নতুন অর্ডার ডেটা রিসিভ করা (আপনার সার্ভার কোড অনুযায়ী)
    memoizedSocket.on("new_order_added", (newOrderData) => {
      console.log("Real-time New Order Received:", newOrderData);
      setData(newOrderData); // ডেটা আপডেট করা
    });

    // কম্পোনেন্ট আনমাউন্ট হলে ইভেন্ট লিসেনারগুলো পরিষ্কার করা
    return () => {
      memoizedSocket.off("connect");
      memoizedSocket.off("disconnect");
      memoizedSocket.off("new_order_added");
    };
  }, [memoizedSocket]);

  // socket অবজেক্টটি পাঠানো হয় যাতে ক্লায়েন্ট কম্পোনেন্ট এটি ব্যবহার করে মেসেজ পাঠাতে পারে (যদি প্রয়োজন হয়)
  return { socket: memoizedSocket, isConnected, data };
};
