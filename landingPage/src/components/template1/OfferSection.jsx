"use client";

import Container from "../common-ui/Container";

const features = [
  "মুখের রুচি বৃদ্ধিতে সহায়ক",
  "হজমে সহায়ক",
  "স্বাস্থ্যকর জীবনযাত্রার অংশ",
  "১০০% হারবাল",
];

export default function OfferSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-500 to-green-600 py-16">
      {/* Background */}
      {/* <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-yellow-300/20 blur-[120px]" /> */}
      {/* <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-[120px]" /> */}
      <Container>
        <div className="rounded-[40px] bg-white p-7 shadow-2xl lg:col-start-2">
          <span className="rounded-full bg-red-100 px-4 py-1.5 text-sm font-bold text-red-600">
            🔥 BEST PRICE
          </span>

          <h3 className="mt-5 text-3xl font-extrabold text-gray-900">
            আনার দানা
          </h3>

          {/* Price */}
          <div className="mt-6">
            <p className="text-lg text-gray-400 line-through">৳১২০০</p>
            <h2 className="mt-1 text-5xl font-extrabold text-green-600">
              ৳৮৯০
            </h2>
          </div>

          {/* Features */}
          <div className="mt-7 space-y-3">
            {features.map((f) => (
              <div
                key={f}
                className="flex items-center gap-3 text-sm sm:text-base"
              >
                ✅ {f}
              </div>
            ))}
          </div>

          {/* Delivery */}
          <div className="mt-7 rounded-3xl bg-green-50 p-5">
            <div className="flex flex-col items-center justify-between gap-1">
              <span className="text-sm font-bold sm:text-base">
                🚚 হোম ডেলিভারি
              </span>
              <span className="text-sm font-bold text-green-700 sm:text-base">
                Cash On Delivery
              </span>
            </div>
          </div>

          {/* CTA */}
          <a
            href="#order"
            className="mt-7 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-green-600 to-red-500 py-4 text-lg font-bold text-white shadow-xl transition hover:scale-[1.02]"
          >
            🛒 এখনই অর্ডার করুন
          </a>

          <p className="mt-4 text-center text-xs text-gray-500 sm:text-sm">
            নিরাপদ অর্ডার • দ্রুত ডেলিভারি
          </p>
        </div>
      </Container>
    </section>
  );
}
