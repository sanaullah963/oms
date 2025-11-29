// --- ১. order স্ট্যাটাস এবং কালার কোডিং (Constants) ---
export const STATUS_SHORTCUTS = [
  {
    key: "Confirmed",
    label: "✅ কনফার্ম",
    color: "bg-green-600 hover:bg-green-700",
    note: "Order Confirmed successfully.",
  },
  {
    key: "Call Not Received",
    label: "🚫 কল ধরেনি",
    color: "bg-yellow-600 hover:bg-yellow-700",
    note: "Customer did not receive the call.",
  },
  {
    key: "Phone Off",
    label: "📵 ফোন বন্ধ",
    color: "bg-orange-600 hover:bg-orange-700",
    note: "Customer phone was found switched off.",
  },
  {
    key: "Cancelled",
    label: "❌ বাতিল",
    color: "bg-red-600 hover:bg-red-700",
    note: "Order Cancelled by seller/customer.",
  },
];

// --- 2. স্ট্যাটাস ট্যাব কনফিগারেশন ---
export const STATUS_TABS = [
    { key: 'Pending', label: 'পেন্ডিং', color: 'indigo' },
    { key: 'Confirmed', label: 'কনফার্মড', color: 'green' },
    { key: 'Call Not Received', label: 'কল ধরেনি', color: 'yellow' },
    { key: 'Phone Off', label: 'ফোন বন্ধ', color: 'orange' },
    { key: 'Cancelled', label: 'বাতিল', color: 'red' },
];


// --- 3. অ্যাক্টিভিটি টাইমলাইন কালার ---
export const ACTIVITY_STATUS_COLORS = {
  "Order Created": "text-blue-500",
  Confirmed: "text-green-500",
  "Call Not Received": "text-yellow-500",
  "Phone Off": "text-orange-500",
  Cancelled: "text-red-500",
  "Status Updated": "text-gray-500",
};


// --- 4. অর্ডারগুলোকে তাদের তৈরির তারিখ অনুযায়ী গ্রুপ করে। ---
export const groupOrdersByDate = (orders) => {
    return orders.reduce((acc, order) => {
        // তারিখের শুধুমাত্র YYYY-MM-DD অংশটি নেওয়া হচ্ছে
        const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
        if (!acc[dateKey]) { acc[dateKey] = []; }
        acc[dateKey].push(order);
        return acc;
    }, {});
};


// --- 5. তারিখকে বাংলা ফরম্যাটে রূপান্তর ---
export const formatDate = (dateString) => {
    // যদি dateString না থাকে, তাহলে একটি ডিফল্ট স্ট্রিং ফেরত দেওয়া হবে
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('bn-BD', options);
};


// --- 6. টাইমকে HH:MM (AM/PM) ফরম্যাটে দেখানোর জন্য
export const formatTime = (isoString) => {
  // যদি isoString না থাকে, তাহলে একটি ডিফল্ট স্ট্রিং ফেরত দেওয়া হবে
  if (!isoString) return "N/A";
  return new Date(isoString).toLocaleTimeString("bn-BD", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};



