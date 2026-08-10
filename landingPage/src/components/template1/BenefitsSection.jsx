"use client";
import Image from "next/image";

const leftFeatures = [
  {
    icon: "🌿",
    title: "মুখের রুচি বৃদ্ধি",
    text: "প্রতিদিনের খাবারের প্রতি আগ্রহ তৈরি করতে সহায়ক।",
  },
  {
    icon: "❤️",
    title: "হজমে সহায়ক",
    text: "খাবার সহজে হজম হতে সাহায্য করে এবং পেটকে আরামদায়ক রাখতে সহায়তা করে।",
  },
  {
    icon: "⚡",
    title: "শক্তি যোগায়",
    text: "প্রতিদিনের কর্মক্ষমতা বজায় রাখতে সহায়ক।",
  },
];

export default function BenefitsSection() {
  return (
    <section className="relative overflow-hidden bg-white py-8" id="benefits">
      {/* Background */}
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-green-200/30 blur-3xl"></div>
      <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-red-200/30 blur-3xl"></div>

      <div className="relative mx-auto max-w-7xl px-4">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mt-4 text-3xl font-extrabold leading-10 text-gray-900 md:text-4xl">
            🌿 সম্পূর্ণ প্রাকৃতিক উপায়ে কাজ করে।
            {/* <span className="text-green-600"> প্রাকৃতিক সঙ্গী</span> */}
          </h2>

          <p className="mt-4 text-base text-left leading-7 text-gray-600">
            এটি খাওয়ার সঙ্গে সঙ্গে ওজন বাড়ে না। বরং এটি খাবারের রুচি বাড়াতে
            সাহায্য করে, ফলে আপনি স্বাভাবিকভাবে বেশি খাবার গ্রহণ করতে পারেন এবং
            ধীরে ধীরে স্বাস্থ্যকর ও স্থায়ীভাবে ওজন বাড়াতে সহায়তা পেতে পারেন।
          </p>
        </div>

        {/* Layout */}
        <div className="mt-12 grid items-center gap-6 lg:grid-cols-3">
          {/* Left */}
          <div className="space-y-4">
            {leftFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-md border border-green-300 bg-green-100 p-2 ps-4 shadow-xl"
              >
                <div className="mb-3 flex items-center justify-start gap-2 text-2xl">
                  <span>{f.icon}</span>
                  <h3 className="text-xl font-bold">{f.title}</h3>
                </div>
                <p className="text-sm leading-5 text-gray-600">{f.text}</p>
              </div>
            ))}
          </div>

          {/* Center Image */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-300 to-red-300 opacity-30 blur-3xl"></div>

            <Image
              src="/images/anardana.jpg"
              width={500}
              height={500}
              alt="Anar Dana"
              className="relative mx-auto rounded-[40px] shadow-2xl"
            />

            <div className="absolute -left-3 -top-3 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-xl">
              🔥 BEST SELLER
            </div>

            <div className="absolute -bottom-3 -right-3 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-xl">
              🌿 100% Herbal
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <div className="rounded-md border border-green-300 bg-green-100 p-2 ps-4 shadow-xl">
              <div className="mb-3 flex items-center justify-start gap-2 text-2xl">
                <span>🍽️</span>
                <h3 className="text-xl font-bold">স্বাস্থ্যকর ওজন</h3>
              </div>
              <p className="text-sm leading-5 text-gray-600">
                সুষম খাদ্যের অংশ হিসেবে স্বাস্থ্যকর ওজন বজায় রাখতে সহায়ক।
              </p>
            </div>

            {/* price segment */}
            <div className="rounded-xl border-2 border-green-500 bg-gradient-to-r from-green-200 to-blue-300 p-6 text-center shadow-lg">
              <p className="text-lg font-medium text-gray-700">
                একজনের ফুল কোর্স
              </p>

              <h2 className="mt-2 text-4xl font-extrabold text-green-700">
                ২ কৌটা{" "}
              </h2>
              <p className="mt-3 text-lg font-semibold text-gray-800">
                এক মাসের ঔষধ
              </p>

              <div className="mt-5 inline-block rounded-full bg-red-600 px-6 py-3 shadow-md">
                {/* <span className="text-lg font-semibold text-white">
                  দাম মাত্র
                </span> */}
                <span className="ml-2 text-3xl font-extrabold text-yellow-300">
                  ৫৯০ টাকা
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-600 to-red-500 p-5 text-white shadow-2xl">
              <h3 className="text-2xl font-extrabold">আজই শুরু করুন</h3>
              <p className="mt-3 leading-7 text-white/90">
                প্রতিদিন আনার দানা গ্রহণ করে স্বাস্থ্যকর জীবনযাত্রার অংশ করুন।
              </p>
              <a
                href="#order"
                className="animate-soft-ripple mt-5 inline-flex rounded-2xl bg-white px-6 py-3 text-sm font-bold text-green-700 transition hover:scale-105"
              >
                🛒 এখনই অর্ডার করুন
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
