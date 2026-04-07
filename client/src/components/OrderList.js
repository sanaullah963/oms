'use client';
import React, { useState } from "react";
import OrderBubble from "./OrderBubble";
import {
  groupOrdersByDate,
  formatDate,
  groupOrdersByLastUpdatedDate,
  STATUS_TABS,
} from "../constants/data";
import { useSocket } from "@/hooks/useSocket";
import ToggleSwitch from "./ToggleSwitch";
import axios from "axios";

export default function OrderList({ orders, onOrderUpdate,activeStatus }) {
  // const [groupedOrders, setgroupedOrders] = useState({});
  const [sortByLast, setSortByLast] = useState(false);
  const [lodding, setLoading] = useState(false);
  const groupedOrders = React.useMemo(() => {
    if (!orders) return {};
    return sortByLast
      ? groupOrdersByLastUpdatedDate(orders)
      : groupOrdersByDate(orders);
  }, [orders, sortByLast]);
  // if orders is empty
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md mt-4">
        <p className="text-lg font-semibold">🔍 কোনো অর্ডার পাওয়া যায়নি।</p>
      </div>
    );
  }

  const handleOrderSort = (value) => {
    setSortByLast(value);
  };

  // handel bulk input
  const handelBulkInput = async() => {
    setLoading(true);
    const ordersIds = orders.map((order) => order._id);

    if (!ordersIds) return;
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/courier/steadfast-bulk`,{
      orders_ids:ordersIds,
    })
    console.log(res.data);
    setLoading(false);
  }


  // তারিখ পুরোনো থেকে নতুন ক্রমানুসারে সাজানো (উপরে পুরনো, নিচে নতুন)
  const sortedDates = Object.keys(groupedOrders);
  return (
    <div className="flex flex-col space-y-4">
      {/* on off toggle button */}
      <ToggleSwitch
        storageKey="sort_order_by_date"
        onValue={handleOrderSort}
        offText="অ্যাড করার সময় অনুসারে"
        onText="সর্বশেষ অপডেট অনুসারে"
      />
      {/* bulk input button */}
      {activeStatus === "Confirmed" && <button className="bg-green-600 text-white px-4 py-2 rounded-md" onClick={handelBulkInput}>{lodding ? "লোডিং..." : "BUlK  INPUT"}</button>}
      

      {sortedDates.map((date) => (
        <div key={date}>
          {/* Date Divider (WhatsApp স্টাইল অনুকরণ) */}
          <div className="relative flex justify-center my-1">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full border-t border-gray-200" />
            </div>
            <span className="relative z-10 bg-green-700 text-gray-50 text-sm font-medium px-4 py-1.5 rounded-full shadow-md">
              {formatDate(date)}
            </span>
          </div>

          {/* Orders for this Date */}
          <div className="flex flex-col space-y-3">
            {/* অর্ডারের টাইমলাইন অনুযায়ী সাজানোর জন্য reverse() ব্যবহার করুন (নতুনটি নিচে থাকবে) */}
            {groupedOrders[date].map((order) => (
              <OrderBubble
                key={order?._id}
                order={order}
                onUpdate={onOrderUpdate} // OrderBubble এ পাস করা হলো
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
