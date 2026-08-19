"use client";
import { useEffect, useState, useCallback, useRef } from "react";

// --- র‍্যান্ডম নাম ও জেলার লিস্ট — শুধু ভিজুয়াল সোশ্যাল-প্রুফের জন্য, আসল অর্ডার
// ডেটা থেকে আসে না (কোনো API কল হয় না) ---
const NAMES = [
  "আব্দুল", "সাদিয়া", "রফিক", "নাসরিন", "কামাল", "সুমাইয়া", "ইমরান", "ফারজানা",
  "হাসান", "রুমা", "সজীব", "তানিয়া", "আরিফ", "মিতু", "শাকিল", "লিমা",
  "রাসেল", "সাথী", "মামুন", "শারমিন", "জাহিদ", "নাজমা", "সোহেল", "রিয়া",
  "তুহিন", "শিউলি", "মিজান", "রোজিনা", "ফাহিম", "ইয়াসমিন",
];

const LOCATIONS = [
  "ঢাকা", "চট্টগ্রাম", "খুলনা", "রাজশাহী", "সিলেট", "বরিশাল", "রংপুর",
  "ময়মনসিংহ", "কুমিল্লা", "নোয়াখালী", "ফরিদপুর", "যশোর", "বগুড়া", "দিনাজপুর",
  "টাঙ্গাইল", "গাজীপুর", "নারায়ণগঞ্জ", "কক্সবাজার", "পাবনা", "জামালপুর",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFakeOrder() {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: pick(NAMES),
    location: pick(LOCATIONS),
    minutesAgo: Math.floor(Math.random() * 58) + 2, // ২–৫৯ মিনিট আগে
  };
}

const FIRST_DELAY_MS = 4000; // পেজ লোডের কতক্ষণ পর প্রথম নোটিফিকেশন দেখাবে
const VISIBLE_MS = 5000; // একটা নোটিফিকেশন কতক্ষণ দেখা যাবে
const GAP_MIN_MS = 8000; // দুইটা নোটিফিকেশনের মাঝে সর্বনিম্ন বিরতি
const GAP_MAX_MS = 18000; // দুইটা নোটিফিকেশনের মাঝে সর্বোচ্চ বিরতি

// --- কাস্টমার পেজে ব্রাউজ করার সময় মাঝে মাঝে ওপর থেকে একটা "অমুক এইমাত্র অর্ডার
// করেছেন" স্টাইলের নোটিফিকেশন কার্ড দেখায় (সোশ্যাল প্রুফ/FOMO)। নাম/লোকেশন/সময় সম্পূর্ণ
// র‍্যান্ডম — বাস্তব অর্ডার ডেটার সাথে কোনো সম্পর্ক নেই, তাই কোনো backend কল লাগে না। ---
export default function RecentOrderPopup({ page }) {
  const [order, setOrder] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const productImage = page?.images?.[0] || "";
  const productName = page?.productName || "";

  const scheduleNext = useCallback((delay) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setOrder(generateFakeOrder());
      setVisible(true);

      // কিছুক্ষণ দেখানোর পর নিচে সরিয়ে দেওয়া, তারপর পরেরটার জন্য শিডিউল করা
      timerRef.current = setTimeout(() => {
        setVisible(false);
        const nextGap = GAP_MIN_MS + Math.random() * (GAP_MAX_MS - GAP_MIN_MS);
        scheduleNext(nextGap);
      }, VISIBLE_MS);
    }, delay);
  }, []);

  useEffect(() => {
    scheduleNext(FIRST_DELAY_MS);
    return () => clearTimeout(timerRef.current);
  }, [scheduleNext]);

  if (!order) return null;

  return (
    <div
      className={`fixed left-1/2 top-3 z-[100] w-[92%] max-w-sm -translate-x-1/2 transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-white p-3 shadow-xl">
        {productImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={productImage}
            alt={productName}
            className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-gray-100" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-red-500">
            {order.minutesAgo} মিনিট আগে
          </p>
          <p className="truncate text-sm font-bold text-gray-900">{order.name}</p>
          <p className="truncate text-xs text-gray-500">
            {order.location} থেকে অর্ডার করেছেন
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="বন্ধ করুন"
          className="ml-auto flex-shrink-0 self-start text-gray-300 hover:text-gray-500 cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}