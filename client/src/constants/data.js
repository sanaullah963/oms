// --- ১. order স্ট্যাটাস এবং কালার কোডিং (Constants) ---
export const STATUS_SHORTCUTS = [
  {
    key: "Confirmed",
    label: "কনফার্ম",
    color: "bg-green-600 hover:bg-green-700",
    note: "Order Confirmed successfully.",
  },

  {
    key: "Call Not Received",
    label: "কল ধরেনি",
    color: "bg-yellow-600 hover:bg-yellow-700",
    note: "Customer did not receive the call.",
  },
  {
    key: "Phone Off",
    label: "ফোন বন্ধ",
    color: "bg-orange-600 hover:bg-orange-700",
    note: "Customer phone was found switched off.",
  },
  {
    key: "Cancelled",
    label: "বাতিল",
    color: "bg-red-600 hover:bg-red-700",
    note: "Order Cancelled by seller/customer.",
  },
  {
    key: "Custom",
    label: "কাস্টম",
    color: "bg-yellow-600 hover:bg-yellow-700",
    note: "Custom Status",
  },
];

// --- 2. স্ট্যাটাস ট্যাব কনফিগারেশন ---
export const STATUS_TABS = [
  { key: "Pending", label: "পেন্ডিং" },
  { key: "Confirmed", label: "কনফার্মড" },
  { key: "Call Not Received", label: "কল ধরেনি" },
  { key: "Phone Off", label: "ফোন বন্ধ" },
  { key: "Cancelled", label: "বাতিল" },
  { key: "Booked", label: "এন্ট্রি" },
  { key: "Custom", label: "কাস্টম" },
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
    const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(order);
    return acc;
  }, {});
};

// --- 5. তারিখকে বাংলা ফরম্যাটে রূপান্তর ---
// export const formatDate = (dateString) => {
//     // যদি dateString না থাকে, তাহলে একটি ডিফল্ট স্ট্রিং ফেরত দেওয়া হবে
//     if (!dateString) return 'N/A';
//     const options = { year: 'numeric', month: 'long', day: 'numeric' };
//     return new Date(dateString).toLocaleDateString('bn-BD', options);
// };
export const formatDate = (dateString) => {
  // If dateString is missing, return a default string
  if (!dateString) return "N/A";

  // Create a new Date object from the dateString
  const date = new Date(dateString);

  // Check if the date is valid (e.g., avoids "Invalid Date")
  if (isNaN(date)) return "Invalid Date";

  // Get the day (DD)
  const day = date.getDate().toString().padStart(2, "0");

  // Get the month (MM - months are 0-indexed, so add 1)
  const month = (date.getMonth() + 1).toString().padStart(2, "0");

  // Get the year (YY - last two digits)
  const year = date.getFullYear().toString().slice(-2);

  // Combine them in DD-MM-YY format
  return `${day}-${month}-${year}`;
};

// --- 6. টাইমকে HH:MM (AM/PM) ফরম্যাটে দেখানোর জন্য
export const formatTime = (isoString) => {
  // যদি isoString না থাকে, তাহলে একটি ডিফল্ট স্ট্রিং ফেরত দেওয়া হবে
  if (!isoString) return "N/A";
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// --- 7. number ban to eng
export function convertNumber(input) {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  const englishDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  let output = input;
  for (let i = 0; i < banglaDigits.length; i++) {
    output = output.replace(new RegExp(banglaDigits[i], "g"), englishDigits[i]);
  }
  return output;
}
