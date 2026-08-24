// --- ১. অর্ডার স্ট্যাটাস শর্টকাট বাটন (কনফার্ম, বাতিল ইত্যাদি) ---
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
    note: "call not receive",
    copyText: "আপনাকে কল করা হচ্ছে, কিন্তু আপনি রিসিভ করছেন না।",
  },
  {
    key: "Phone Off",
    label: "ফোন বন্ধ",
    color: "bg-orange-600 hover:bg-orange-700",
    note: "Customer phone off.",
    copyText: "আপনাকে কল করা হচ্ছে, কিন্তু আপনার ফোন বন্ধ বলছে।",
  },
  {
    key: "Custom",
    label: "কাস্টম",
    color: "bg-yellow-600 hover:bg-yellow-700",
    note: "Custom Status",
  },
  {
    key: "Cancelled",
    label: "বাতিল",
    color: "bg-red-600 hover:bg-red-700",
    note: "Order Cancelled",
  },
];

// --- ২. স্ট্যাটাস ট্যাব কনফিগারেশন ---
export const STATUS_TABS = [
  { key: "Incomplete", label: "ইনকমপ্লিট" },
  { key: "Pending", label: "পেন্ডিং" },
  { key: "All", label: "সব" },
  { key: "Confirmed", label: "কনফার্মড" },
  { key: "Custom", label: "কাস্টম" },
  { key: "Call Not Received", label: "কল ধরেনি" },
  { key: "Phone Off", label: "ফোন বন্ধ" },
  { key: "Review", label: "In-Review" },
  { key: "Booked", label: "এন্ট্রি" },
  { key: "Cancelled", label: "বাতিল" },
];

// --- ৩. অ্যাক্টিভিটি টাইমলাইন কালার ---
export const ACTIVITY_STATUS_COLORS = {
  "Order Created": "text-blue-500",
  Confirmed: "text-green-500",
  "Call Not Received": "text-yellow-500",
  "Phone Off": "text-orange-500",
  Cancelled: "text-red-500",
  "Status Updated": "text-gray-500",
};

// --- ৪. ড্যাশবোর্ডে দ্রুত কপি করার জন্য প্রি-সেট মেসেজ ---
export const dahsbOrderActionButton = [
  {
    label: "ফোন বন্ধ",
    value:
      "আপনাকে ডেলিভারি ম্যান ফোন দিচ্ছে, কিন্তু আপনার নাম্বারটা বন্ধ পাচ্ছে। আমি আপনাকে ডেলিভারি ম্যান এর নাম্বার দিচ্ছি, তার সাথে যোগাযোগ করে পার্সেলটা রিসিভ করে নিন।",
  },
  {
    label: "ফোন ধরেনি",
    value:
      "আপনাকে ডেলিভারি ম্যান ফোন দিয়েছিল, কিন্তু আপনি ফোনটা রিসিভ করেননি। ডেলিভারি ম্যানের  সাথে যোগাযোগ করে পার্সেলটা রিসিভ করে নিন।",
  },
  {
    label: "Assigned",
    value:
      "এটা ডেলিভারি ম্যান এর নাম্বার। খুব শিগগিরই সে আপনাকে ফোন করে পার্সেল দিবে। আপনি চাইলে তার সাথে যোগাযোগ করতে পারেন। তাহলে দ্রুত পার্সেলটা পাবেন। অথবা ফোনটা কাছে রাখবেন যেন সে ফোন দিলে রিসিভ করতে পারেন। ",
  },
];
