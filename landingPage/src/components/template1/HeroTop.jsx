"use client";
import {
  FaStar,
  FaLeaf,
  FaPhoneAlt,
  FaArrowDown,
  FaShoppingCart,
  FaWhatsapp,
} from "react-icons/fa";
import Link from "next/link";
import ImageCarousel from "./ImageCarousel";

const FALLBACK_IMAGES = ["/placeholder/p1.jpg"];

export default function HeroTop({ page }) {
  const productName = page?.productName || "";
  // topTagline নতুন dedicated field — খালি থাকলে পুরনো tagline field-এ fallback (migration safety)
  const topTagline = page?.topTagline || page?.tagline || "";
  // hero.heading/description খালি থাকলে productName/description-এ fallback করে,
  // যাতে পুরনো পেজ (hero object যোগ হওয়ার আগে তৈরি) ভাঙা না দেখায়
  const heroHeading = page?.hero?.heading || productName;
  const heroDescription = page?.hero?.description || page?.description || "";
  const price = page?.price ?? 0;
  const originalPrice = page?.originalPrice;
  const images = page?.images?.length ? page.images : FALLBACK_IMAGES;
  const freeDelivery = page?.freeDelivery !== false;
  const callNumber = page?.phoneNumber || "";
  const whatsappNumber = page?.whatsappNumber
    ? `88${page?.whatsappNumber}`
    : "";
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-red-50 via-white to-green-50">
      {/* Background */}
      {/* <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-green-300/30 blur-3xl" /> */}
      {/* <div className="absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-red-300/30 blur-3xl" /> */}

      {/* Announcement — dedicated topTagline field, না থাকলে জেনেরিক টেক্সট */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 text-white">
        <div className="mx-auto max-w-7xl px-3 py-1.5 text-center text-xl font-bold sm:text-sm">
          {topTagline || "বিশেষ অফার চলছে"}
        </div>
      </div>
      <div className="relative mx-auto max-w-7xl px-3 py-2 sm:px-4">
        {/* Rating */}
        <div className="flex justify-center">
          <a href="#reviews-image">
            <div className="rounded-xl bg-yellow-200 px-4 py-1.5 shadow">
              <div className="flex items-center gap-1.5">
                <FaStar className="text-yellow-500" />
                <FaStar className="text-yellow-500" />
                <FaStar className="text-yellow-500" />
                <FaStar className="text-yellow-500" />
                <FaStar className="text-yellow-500" />
                <span className="ml-1.5 text-sm font-bold sm:text-base">
                  4.9 (১০,০০০+ Reviews)
                </span>
              </div>
            </div>
          </a>
        </div>

        <div className="relative mx-auto max-w-7xl px-1 py-8 sm:px-2">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {/* Left */}
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3.5 py-1.5 text-sm font-semibold text-green-700">
                <FaLeaf />
                ১০০% অরিজিনাল প্রোডাক্ট
              </span>

              <h1 className="mt-5 text-3xl font-extrabold leading-tight text-gray-900 md:text-5xl">
                <span className="text-green-600">{heroHeading}</span>
              </h1>

              {heroDescription && (
                <p className="mt-5 text-base leading-7 text-gray-600">
                  {heroDescription}
                </p>
              )}

              {/* CTA */}
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="">
                  <a
                    href="#order"
                    className="animate-soft-ripple rounded-md bg-green-600 px-4 py-2 text-lg font-bold text-white shadow-lg transition hover:scale-105 hover:bg-green-700 sm:text-base"
                  >
                    অর্ডার করতে চাই
                  </a>
                </div>
                <div className="flex gap-2 pt-3">
                  <a
                    href="#benefits"
                    className="flex items-center gap-2 rounded-md border border-green-600 bg-green-100 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-50 sm:text-base"
                  >
                    বিস্তারিত দেখুন
                  </a>
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    className="flex items-center gap-2 rounded-md border border-green-600 bg-green-400 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-50 sm:text-base"
                  >
                    <FaWhatsapp />
                    Whatsapp
                  </a>
                </div>
              </div>

              {/* Price highlight */}
              <div className="mt-8 flex items-center gap-3 rounded-xl bg-green-100 p-3.5">
                <div>
                  <h4 className="text-base font-bold">বিশেষ মূল্যে পাচ্ছেন</h4>
                  <p className="text-sm text-gray-600">
                    এখনই দাম মাত্র{" "}
                    <span className="mx-2 text-3xl font-extrabold text-red-600">
                      ৳{price}
                    </span>
                  </p>
                </div>
              </div>
              <a
                href="#use-process"
                className="bg-yellow-400 py-2 px-3 rounded-md font-semibold text-gray-800"
              >
                ব্যবহারের নিয়ম
              </a>

              <div className="mt-8 flex items-center gap-3 rounded-xl bg-green-100 p-3.5">
                <div>
                  <h4 className="text-base font-bold">
                    সারা বাংলাদেশে হোম ডেলিভারি
                  </h4>
                  <p className="text-sm text-gray-600">
                    ক্যাশ অন ডেলিভারি সুবিধা ।
                  </p>
                </div>
              </div>
            </div>

            {/* Right — carousel */}
            <div className="relative min-w-0">
              <div className="relative min-w-0">
                <ImageCarousel
                  images={images}
                  alt={productName}
                  width={650}
                  height={650}
                  imageClassName="rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="mt-8 text-center">
          <div className=" flex items-center justify-center gap-3">
            {originalPrice ? (
              <p className="text-lg inline-block text-gray-400 line-through">
                ৳{originalPrice}
              </p>
            ) : null}
            <h2 className="text-5xl inline-block font-extrabold text-red-600">
              ৳{price}
            </h2>
          </div>
          <p className="text-md text-gray-700 mt-2">
            {freeDelivery
              ? "🚚 ডেলিভারি চার্জ সারাদেশে ফ্রী"
              : "🚚 সারা বাংলাদেশে হোম ডেলিভারি"}
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="#order"
            className=" flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-green-600 to-red-500 py-4 text-lg font-bold text-white shadow-xl transition hover:scale-[1.02]"
          >
            <FaShoppingCart />
            এখনই অর্ডার করুন
          </Link>

          {callNumber && (
            <a
              href={`tel:${callNumber}`}
              className="flex items-center justify-center gap-3 rounded-2xl border-2 border-green-600 py-4 text-lg font-bold text-green-700"
            >
              <FaPhoneAlt />
              ফোন করুন
            </a>
          )}
        </div>

        {/* Scroll */}
        <div className="mt-5 flex animate-bounce justify-center">
          <FaArrowDown className="text-xl text-red-500" />
        </div>
      </div>
    </section>
  );
}
