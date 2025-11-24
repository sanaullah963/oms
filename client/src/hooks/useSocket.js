import { useEffect, useState, useMemo } from "react";
import { io } from "socket.io-client";

// কনফিগারেশন: API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// সকেট অবজেক্টটি তৈরি করুন। এটি অ্যাপ্লিকেশনের লাইফটাইমে একবারই তৈরি হবে।
// io() কলটি ফাইলের স্কোপে রাখা হয়েছে, কিন্তু এটি শুধুমাত্র ক্লায়েন্ট সাইডে ইমপোর্ট হওয়া উচিত।
const socket = io(API_URL, {
  // নিশ্চিত করুন যে সকেট শুধুমাত্র API URL-এ কানেক্ট করছে
  path: "/socket.io",
  autoConnect: true,
});

export const useSocket = () => {
  // useMemo ব্যবহার করে socket ইনস্ট্যান্স পাস করলে ensure করা যায় যে এটি পরিবর্তন হবে না
  const memoizedSocket = useMemo(() => socket, []);

  const [isConnected, setIsConnected] = useState(memoizedSocket.connected);
  const [data, setData] = useState(null); // সার্ভার থেকে আসা নতুন ডেটা ধরার জন্য

  useEffect(() => {
    // কানেকশন স্ট্যাটাস ম্যানেজ করা
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
