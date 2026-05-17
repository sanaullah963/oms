// "use client";
// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import axios from "axios";
// import OrderList from "../components/OrderList";
// import ManualInput from "../components/ManualInput";
// import { useSocket } from "../hooks/useSocket";
// import { convertNumber, STATUS_TABS } from "../constants/data";
// import Link from "next/link";
// const API_URL = process.env.NEXT_PUBLIC_API_URL;

// export default function Page() {

//   const [orders, setOrders] = useState([]);
//   const [activeStatus, setActiveStatus] = useState("Pending");
//   const [loading, setLoading] = useState(true);
//   const { socket, data: socketData } = useSocket();
//   const [isAnimating, setIsAnimating] = useState(false);
//   const [dbOrders, setDbOrders] = useState([]);
//   const [dbLoading, setDbLoading] = useState(false);
//   const [searchQuery, setSearchQuery] = useState("");
//   const query = searchQuery.toLowerCase().trim();


//   // ---------------- FETCH ALL ORDERS ----------------
//   const fetchOrders = useCallback(async () => {
//     setLoading(true);
//     try {
//       const res = await axios.get(`${API_URL}/api/orders`);
//       if (Array.isArray(res.data)) {
//         setOrders(res.data);
//       }
//     } catch (err) {
//       console.error("Fetch orders error:", err);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   // ---------------- SOCKET SEARCH LISTENER ----------------
//   // console.log('socket', socket)
//   // console.log('socketData', socketData)
//   useEffect(() => {
//     if (!socket) return;

//     const handleSearchResult = (data) => {
//       setDbOrders(data?.orders || []);
//       setDbLoading(false);
//     };

//     socket.on("searchResult", handleSearchResult);

//     return () => {
//       socket.off("searchResult", handleSearchResult);
//     };
//   }, [socket]);

//   // ---------------- EMIT SEARCH QUERY ----------------
//   const fetchSearchFromDB = useCallback(
//     (q) => {
//       if (!q || !socket?.connected) {
//         setDbOrders([]);
//         return;
//       }
//       setDbLoading(true);
//       socket.emit("searchQuery", q);
//     },
//     [socket],
//   );

//   // ---------------- DEBOUNCE SEARCH ----------------
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       if (query) {
//         fetchSearchFromDB(query);
//       } else {
//         setDbOrders([]);
//       }
//     }, 600);

//     return () => clearTimeout(timer);
//   }, [query, fetchSearchFromDB]);

//   // ---------------- HANDLE ORDER UPDATE ----------------
//   const handleOrderUpdate = useCallback((data, actionType = "UPDATE") => {
//     setOrders((prev) => {
//       const currentPrev = Array.isArray(prev) ? prev : [];
//       if (actionType === "DELETE") {
//         return currentPrev.filter((o) => o?._id !== data);
//       }

//       const index = currentPrev.findIndex((o) => o?._id === data?._id);
//       if (index !== -1) {
//         const copy = [...currentPrev];
//         copy[index] = data;
//         return copy;
//       }
//       return [data, ...currentPrev];
//     });
//   }, []);

//   // ---------------- INITIAL LOAD ----------------
//   useEffect(() => {
//     fetchOrders();
//   }, [fetchOrders]);

//   // ---------------- REAL-TIME SOCKET UPDATE ----------------
//   useEffect(() => {
//     if (socketData && socketData._id) {
//       handleOrderUpdate(socketData, "UPDATE");
//     }
//   }, [socketData, handleOrderUpdate]);

//   useEffect(() => {
//     setIsAnimating(true);
//     const t = setTimeout(() => setIsAnimating(false), 180);
//     return () => clearTimeout(t);
//   }, [activeStatus]);

//   useEffect(() => {
//     if (!socket) return;

//     // Webhook বা অন্য কোথাও থেকে স্ট্যাটাস চেঞ্জ হলে এটি কাজ করবে
//     const handleOrderStatusChange = (orderData) => {
//       setOrders((prevOrders) => {
//         // চেক করুন এই আইডি-র অর্ডার অলরেডি লিস্টে আছে কি না
//         const exists = prevOrders.find((o) => o._id === orderData._id);

//         if (exists) {
//           // যদি থাকে, তবে স্ট্যাটাস আপডেট করুন
//           return prevOrders.map((order) =>
//             order._id === orderData._id ? orderData : order,
//           );
//         } else {
//           // যদি না থাকে (মানে নতুন অর্ডার), তবে লিস্টের শুরুতে যোগ করুন
//           return [orderData, ...prevOrders];
//         }
//       });
//     };

//     socket.on("orderStatusChange", handleOrderStatusChange);

//     return () => {
//       socket.off("orderStatusChange", handleOrderStatusChange);
//     };
//   }, [socket]);



//   // ---------------- PENDING ORDERS ----------------
//   let allPendingOrder = useMemo(() => {
//     if (!Array.isArray(orders)) return [];
//     return orders.filter(
//       (order) =>
//         order &&
//         order._id &&
//         order.orderStatus !== "Booked" &&
//         order.orderStatus !== "Cancelled" &&
//         order.orderStatus !== "Confirmed",
//     );
//   }, [orders]);

//   // ---------------- FILTERED ORDERS ----------------
//   const filteredOrders = useMemo(() => {
//     const safeOrders = Array.isArray(orders) ? orders.filter(Boolean) : [];

//     if (query) {
//       const localResults = safeOrders.filter((order) => {
//         if (!order) return false; //
//         const enNumber = convertNumber(order?.castomerPhone);
//         const fields = [
//           order?._id,
//           order?.castomerName,
//           enNumber,
//           order?.productCode,
//           order?.totalCOD,
//           order?.rawInputText,
//           order?.courier?.trackingId,
//         ];

//         return fields.some((f) => f && String(f).toLowerCase().includes(query));
//       });

//       const combined = [...localResults, ...dbOrders.filter(Boolean)];
//       return combined.filter(

//         (v, i, a) => v && a.findIndex((t) => t?._id === v?._id) === i,
//       );
//     }

//     if (activeStatus === "All") return allPendingOrder;
//     return safeOrders.filter((o) => o && o.orderStatus === activeStatus);
//   }, [orders, dbOrders, query, activeStatus]);

//   // ---------------- BUTTON STYLE ----------------
//   const getButtonClasses = (status) => {
//     const base =
//       "md:px-4 p-1 md:py-2 font-semibold text-sm rounded-md transition";
//     return activeStatus === status
//       ? `${base} bg-green-600 text-white`
//       : `${base} bg-gray-200 text-gray-700`;
//   };

//   // ---------------- UI ----------------
//   return (
//     <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-1">
//       <header className="p-1 md:p-3 bg-white border-b border-gray-200 shadow-md flex-shrink-0 z-10">
//         {/* search bar */}
//         <div className="flex justify-between ">
//           <div className="flex-1 mr-4">
//             <div className="relative">
//               <input
//                 type="text"
//                 placeholder="নাম, ফোন, বা অর্ডার ID দিয়ে খুঁজুন..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full pl-2 py-1 border border-gray-300 rounded-md focus:ring-indigo-200 focus:border-indigo-200 transition duration-11 text-sm"
//               />
//               {searchQuery && (
//                 <button
//                   type="button"
//                   className="absolute inset-y-0 right-0.75 my-0.5 flex items-center text-gray-10 bg-red-400 rounded-md px-2"
//                   onClick={() => setSearchQuery("")}
//                 >
//                   X
//                 </button>
//               )}
//             </div>
//           </div>

//           {/* Dashboard button — attentionCount badge সহ */}
//           <Link
//             href="/dashboard"
//             className="relative bg-green-700 px-2 text-lg text-green-100 mb-1 md:mb-2 rounded-sm flex items-center gap-1"
//           >
//             Dashboard
//             {/* {attentionCount > 0 && ( */}
//               <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none">
//                 {/* {attentionCount > 99 ? "99+" : attentionCount} */} 10
//               </span>
//             {/* )} */}
//           </Link>
//         </div>

//         {/* status bar section */}
//         <div className="flex overflow-x-auto w-auto gap-0.5 md:gap-2 whitespace-nowrap">
//           {STATUS_TABS.map((tab) => (
//             <button
//               key={tab.key}
//               onClick={() => setActiveStatus(tab.key)}
//               className={getButtonClasses(tab.key)}
//             >
//               {`${tab.label} ${
//                 tab.key === "All"
//                   ? allPendingOrder.length
//                   : orders.filter((o) => o.orderStatus === tab.key).length
//               }`}
//             </button>
//           ))}
//         </div>
        
//         <div className="ms-2 text-purple-500 font-bold">
//           {searchQuery && <p>{filteredOrders.length} Result </p>}
//           {/* <p>all search result 0</p> */}
//         </div>
//       </header>

//       {/* Main Content Area */}
//       <div
//         className={`flex-1 overflow-y-auto p-1.5 md:p-4 bg-gray-100 pb-36
//     ${isAnimating ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"}
//   `}
//       >
//         {loading ? (
//           <div className="text-center py-10 text-gray-10">
//             অর্ডার লোড হচ্ছে...
//           </div>
//         ) : (
//           <OrderList
//             orders={filteredOrders}
//             onOrderUpdate={handleOrderUpdate}
//             activeStatus={activeStatus}
//           />
//         )}
//       </div>

//       {/* manual input order  */}
//       <div className="fixed bottom-0 left-0 right-0 px-1 py-2 bg-white border-t border-gray-200 shadow-2xl z-20">
//         <ManualInput onUpdate={handleOrderUpdate} />
//       </div>
//     </div>
//   );
// }







"use client";
import React, { useState, useEffect } from "react";
import OrderList from "../components/OrderList";
import ManualInput from "../components/ManualInput";
import { STATUS_TABS } from "../constants/data";
import Link from "next/link";
import { useOrders } from "../context/OrderContext"; // কাস্টম হুক ইমপোর্ট

export default function Page() {
  // গ্লোবাল কন্টেক্সট থেকে প্রয়োজনীয় সবকিছু এক লাইনে নিয়ে আসা হলো
  const {
    orders,
    activeStatus,
    setActiveStatus,
    loading,
    searchQuery,
    setSearchQuery,
    filteredOrders,
    allPendingOrder,
    handleOrderUpdate
  } = useOrders();

  const [isAnimating, setIsAnimating] = useState(false);

  // অ্যানিমেশন ইফেক্ট (এটি লোকাল UI এর জন্য, তাই এখানেই থাকবে)
  useEffect(() => {
    setIsAnimating(true);
    const t = setTimeout(() => setIsAnimating(false), 180);
    return () => clearTimeout(t);
  }, [activeStatus]);

  // বাটন স্টাইল ফাংশন
  const getButtonClasses = (status) => {
    const base = "md:px-4 p-1 md:py-2 font-semibold text-sm rounded-md transition";
    return activeStatus === status
      ? `${base} bg-green-600 text-white`
      : `${base} bg-gray-200 text-gray-700`;
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-100">
      <header className="p-1 md:p-3 bg-white border-b border-gray-200 shadow-md flex-shrink-0 z-10">
        {/* সার্চ বার ও ড্যাশবোর্ড বাটন */}
        <div className="flex justify-between ">
          <div className="flex-1 mr-4">
            <div className="relative">
              <input
                type="text"
                placeholder="নাম, ফোন, বা অর্ডার ID দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-2 py-1 border border-gray-300 rounded-md focus:ring-indigo-200 focus:border-indigo-200 transition duration-11 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 my-0.5 flex items-center text-gray-100 bg-red-400 rounded-md px-2"
                  onClick={() => setSearchQuery("")}
                >
                  X
                </button>
              )}
            </div>
          </div>

          {/* Dashboard button */}
          <Link
            href="/dashboard"
            className="relative bg-green-700 px-2 text-lg text-green-100 mb-1 md:mb-2 rounded-sm flex items-center gap-1"
          >
            Dashboard
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none">
              10
            </span>
          </Link>
        </div>

        {/* স্ট্যাটাস ট্যাব সেকশন */}
        <div className="flex overflow-x-auto w-auto gap-0.5 md:gap-2 whitespace-nowrap mt-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStatus(tab.key)}
              className={getButtonClasses(tab.key)}
            >
              {`${tab.label} ${
                tab.key === "All"
                  ? allPendingOrder.length
                  : orders.filter((o) => o?.orderStatus === tab.key).length
              }`}
            </button>
          ))}
        </div>
        
        <div className="ms-2 text-purple-500 font-bold mt-1">
          {searchQuery && <p>{filteredOrders.length} Result </p>}
        </div>
      </header>

      {/* মেইন কন্টেন্ট এরিয়া */}
      <div
        className={`flex-1 overflow-y-auto p-1.5 md:p-4 bg-gray-100 pb-36 transition-all duration-200
          ${isAnimating ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"}
        `}
      >
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            অর্ডার লোড হচ্ছে...
          </div>
        ) : (
          <OrderList
            orders={filteredOrders}
            onOrderUpdate={handleOrderUpdate} // OrderBubble-এর জন্য গ্লোবাল আপডেট ফাংশন প্রপ্স হিসেবে পাস হচ্ছে
            activeStatus={activeStatus}
          />
        )}
      </div>

      {/* ম্যানুয়াল ইনপুট সেকশন */}
      <div className="fixed bottom-0 left-0 right-0 px-1 py-2 bg-white border-t border-gray-200 shadow-2xl z-20">
        <ManualInput onUpdate={handleOrderUpdate} />
      </div>
    </div>
  );
}