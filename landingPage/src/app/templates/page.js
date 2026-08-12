'use client';
import Link from "next/link";

const TEMPLATES = [

  
  
  {
    href: "/templates",
    title: "not work",
    desc: "হলুদ-জলপাই রঙ, বারবার CTA, কল বাটন, FB-কমেন্ট স্টাইল রিভিউ — আপনার দেওয়া রেফারেন্স থেকে অনুপ্রাণিত",
  },
];

export default function TemplatesIndexPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-1">ল্যান্ডিং পেজ টেমপ্লেট</h1>
        <p className="text-sm text-gray-500 mb-6">প্রতিটাতে ক্লিক করে ডিজাইন দেখুন</p>
        <div className="space-y-3">
          {TEMPLATES.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              target="_blank"
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition"
            >
              <h2 className="font-semibold text-gray-800">{t.title}</h2>
              <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}