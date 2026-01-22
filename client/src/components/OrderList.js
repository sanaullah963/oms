import React from "react";
import OrderBubble from "./OrderBubble";
import { groupOrdersByDate, formatDate, groupOrdersByLastUpdatedDate } from "../constants/data";
import { useSocket } from "@/hooks/useSocket";



export default function OrderList({ orders, onOrderUpdate }) {
  // if orders is empty
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md mt-4">
        <p className="text-lg font-semibold">🔍 কোনো অর্ডার পাওয়া যায়নি।</p>
      </div>
    );
  }

  const groupedOrders = groupOrdersByDate(orders);
  // const groupedOrders = groupOrdersByLastUpdatedDate(orders);
  const groupByLastUpdatedDate = groupOrdersByLastUpdatedDate(orders);
  console.log('groupedOrders insart date', groupedOrders);

  // তারিখ পুরোনো থেকে নতুন ক্রমানুসারে সাজানো (উপরে পুরনো, নিচে নতুন)
  const sortedDates = Object.keys(groupedOrders);
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="">
        <input type="radio" />
      </div>
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
                key={order._id}
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
