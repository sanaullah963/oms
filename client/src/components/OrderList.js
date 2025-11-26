import React from "react";
import OrderBubble from "./OrderBubble";
import { groupOrdersByDate, formatDate } from "../constants/data";

// এই ফাংশনটি অর্ডারগুলোকে তাদের তৈরির তারিখ অনুযায়ী গ্রুপ করে।
// const groupOrdersByDate = (orders) => {
//     return orders.reduce((acc, order) => {
//         // তারিখের শুধুমাত্র YYYY-MM-DD অংশটি নেওয়া হচ্ছে
//         const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
//         if (!acc[dateKey]) { acc[dateKey] = []; }
//         acc[dateKey].push(order);
//         return acc;
//     }, {});
// };

// --- ২. তারিখকে বাংলা ফরম্যাটে রূপান্তর ---
// const formatDate = (dateString) => {
//     // যদি dateString না থাকে, তাহলে একটি ডিফল্ট স্ট্রিং ফেরত দেওয়া হবে
//     if (!dateString) return 'N/A';
//     const options = { year: 'numeric', month: 'long', day: 'numeric' };
//     return new Date(dateString).toLocaleDateString('bn-BD', options);
// };

export default function OrderList({ orders, onOrderUpdate }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md mt-4">
        <p className="text-lg font-semibold">🔍 কোনো অর্ডার পাওয়া যায়নি।</p>
        <p className="text-sm mt-1">
          ম্যানুয়াল ইনপুট ব্যবহার করে একটি নতুন অর্ডার তৈরি করুন।
        </p>
      </div>
    );
  }

  const groupedOrders = groupOrdersByDate(orders);

  // তারিখ পুরোনো থেকে নতুন ক্রমানুসারে সাজানো (উপরে পুরনো, নিচে নতুন)
  // const sortedDates = Object.keys(groupedOrders).sort((a, b) => new Date(a) - new Date(b));
  const sortedDates = Object.keys(groupedOrders);
  return (
    <div className="flex flex-col space-y-4">
      {sortedDates.map((date) => (
        <div key={date}>
          {/* Date Divider (WhatsApp স্টাইল অনুকরণ) */}
          <div className="relative flex justify-center my-6">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full border-t border-gray-200" />
            </div>
            <span className="relative z-10 bg-gray-50 text-gray-700 text-sm font-medium px-4 py-1.5 rounded-full shadow-md">
              {formatDate(date)}
            </span>
          </div>

          {/* Orders for this Date */}
          <div className="flex flex-col space-y-3">
            {/* অর্ডারের টাইমলাইন অনুযায়ী সাজানোর জন্য reverse() ব্যবহার করুন (নতুনটি নিচে থাকবে) */}
            {groupedOrders[date].reverse().map((order) => (
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
