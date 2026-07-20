// import { useEffect, useState, useMemo } from "react";
// import { io } from "socket.io-client";
// import { API_URL } from "@/services/api";

// const socket = io(API_URL, {
//   path: "/socket.io",
//   autoConnect: true,
// });

// export const useSocket = () => {
//   const memoizedSocket = useMemo(() => socket, []);
//   const [isConnected, setIsConnected] = useState(memoizedSocket.connected);
//   const [data, setData] = useState(null); // সার্ভার থেকে আসা নতুন ডেটা ধরার জন্য

//   useEffect(() => {
//     memoizedSocket.on("connect", () => {
//       setIsConnected(true);
//       console.log("Socket Connected!");
//     });

//     memoizedSocket.on("disconnect", () => {
//       setIsConnected(false);
//       console.log("Socket Disconnected!");
//     });

//     // সার্ভার থেকে আসা নতুন অর্ডার ডেটা রিসিভ করা
//     memoizedSocket.on("new_order_added", (newOrderData) => {
//       setData(newOrderData);
//     });

//     return () => {
//       memoizedSocket.off("connect");
//       memoizedSocket.off("disconnect");
//       memoizedSocket.off("new_order_added");
//     };
//   }, []);

//   return { socket: memoizedSocket, isConnected, data };
// };



import { useEffect, useState, useMemo } from "react";
import { io } from "socket.io-client";
import { API_URL, TOKEN_STORAGE_KEY } from "@/services/api";

// ✅ সার্ভার এখন socket connection-এও JWT টোকেন যাচাই করে (io.use middleware), তাই
// autoConnect বন্ধ রেখে টোকেন রেডি হওয়ার পর AuthContext থেকে connectSocketWithAuth() কল করে সংযোগ করা হয়।
const socket = io(API_URL, {
  path: "/socket.io",
  autoConnect: false,
});

// --- লগইন সফল হওয়ার পর (বা অ্যাপ লোডে টোকেন থাকলে) কল করা হয় ---
export function connectSocketWithAuth() {
  if (typeof window === "undefined") return;
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return;

  socket.auth = { token };
  if (socket.connected) {
    socket.disconnect();
  }
  socket.connect();
}

// --- লগআউট করলে কল করা হয় ---
export function disconnectSocket() {
  socket.disconnect();
}

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

    memoizedSocket.on("connect_error", (err) => {
      console.log("Socket connect error:", err.message);
    });

    // সার্ভার থেকে আসা নতুন অর্ডার ডেটা রিসিভ করা
    memoizedSocket.on("new_order_added", (newOrderData) => {
      setData(newOrderData);
    });

    return () => {
      memoizedSocket.off("connect");
      memoizedSocket.off("disconnect");
      memoizedSocket.off("connect_error");
      memoizedSocket.off("new_order_added");
    };
  }, []);

  return { socket: memoizedSocket, isConnected, data };
};
