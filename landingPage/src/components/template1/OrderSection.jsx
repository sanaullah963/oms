"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  FaUser,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaMinus,
  FaPlus,
  FaCheckSquare,
} from "react-icons/fa";

import Container from "@/components/common-ui/Container";
import { saveDraftOrder } from "@/utils/tracking";
import { landingService } from "@/services/landingService";
import BlockedCustomerPopup from "./BlockedCustomerPopup";

const FALLBACK_IMAGE = "/placeholder/p1.jpg";

export default function OrderSection({ page, slug, setIsOrderVisible }) {
  const productName = page?.productName || "";
  const productImage = page?.images?.[0] || FALLBACK_IMAGE;
  const whatsappNumber = page?.whatsappNumber || "";
  // --- একাধিক প্রোডাক্ট টাইপ/প্যাকেজ থাকলে (নতুন ফিচার) কাস্টমার এখান থেকে একটা
  // বেছে নেবে — প্রতিটার নিজস্ব price/originalPrice/freeDelivery/charge থাকে।
  // productTypes খালি থাকলে (পুরনো পেজ) আগের মতোই top-level price/freeDelivery ব্যবহৃত হয় ---
  const productTypes = page?.productTypes || [];
  const hasProductTypes = productTypes.length > 0;

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryArea, setDeliveryArea] = useState("inside"); // ফ্রি ডেলিভারি না থাকলেই শুধু ব্যবহৃত হয়
  const [success, setSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState(null); // সফল অর্ডারের স্ন্যাপশট — ফর্ম ক্লিয়ার হওয়ার আগেই সেভ করা হয়, মডালে দেখানোর জন্য
  const [copied, setCopied] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [quantity, setQuantity] = useState(1);
  // --- ডিফল্ট হিসেবে isDefault:true মার্ক করা টাইপ থাকলে সেটাই সিলেক্ট থাকবে।
  // আগে এখানে "|| productTypes[0]?._id" ফলব্যাক ছিল, মানে কোনো ডিফল্ট না
  // থাকলেও প্রথম প্যাকেজটা জোর করে সিলেক্ট দেখানো হতো — এখন সেই ফলব্যাক বাদ
  // দেওয়া হয়েছে, ডিফল্ট না থাকলে শুরুতে কোনোটাই সিলেক্ট থাকবে না ---
  const [selectedTypeId, setSelectedTypeId] = useState(
    () => productTypes.find((t) => t.isDefault)?._id || null,
  );

  // আগে এখানেও "|| productTypes[0]" ফলব্যাক ছিল — সেটা বাদ দেওয়া হয়েছে, যাতে
  // কিছু সিলেক্ট না করা অবস্থায় activeType সত্যিই null থাকে (প্রথম প্যাকেজের
  // দাম/ডেলিভারি রুল ভুলবশত ব্যবহার না হয়)
  const activeType = hasProductTypes
    ? productTypes.find((t) => t._id === selectedTypeId) || null
    : null;

  // --- productTypes মোডে থাকলে (hasProductTypes) কিছু সিলেক্ট না করা অবস্থায়
  // আগে এখানে ভুলবশত পুরনো টপ-লেভেল page.price (legacy, এই মোডে অপ্রাসঙ্গিক)
  // দেখানো হতো — এখন সিলেক্ট না করা পর্যন্ত ৳0 দেখাবে ---
  const price = activeType
    ? activeType.price
    : hasProductTypes
      ? 0
      : (page?.price ?? 0);
  const originalPrice = activeType
    ? activeType.originalPrice
    : hasProductTypes
      ? null
      : page?.originalPrice;
  const freeDelivery = activeType
    ? activeType.freeDelivery !== false
    : page?.freeDelivery !== false;
  const insideCharge = activeType
    ? activeType.deliveryChargeInsideDhaka
    : page?.deliveryChargeInsideDhaka;
  const outsideCharge = activeType
    ? activeType.deliveryChargeOutsideDhaka
    : page?.deliveryChargeOutsideDhaka;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsOrderVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }, // সেকশনের ১০% দৃশ্যমান হলেই ট্রিগার করবে
    );
    const section = document.getElementById("order");
    if (section) observer.observe(section);
    return () => {
      if (section) observer.unobserve(section);
    };
  }, [setIsOrderVisible]);

  // প্যাকেজ পরিবর্তন হলে quantity রিসেট হয়ে যাবে, যাতে ভুল সংখ্যায় অর্ডার না হয়ে যায়
  useEffect(() => {
    setQuantity(1);
  }, [selectedTypeId]);

  useEffect(() => {
    // --- ⚠️ আগে নাম/ফোন/ঠিকানার প্রতিটা পরিবর্তনেই (অসম্পূর্ণ ফোন নম্বর দিয়েও)
    // draft-save API কল হতো, যেটা সার্ভারে অকারণ লোড তৈরি করছিল। এখন ফোন নম্বর
    // সঠিক ফরম্যাটে (BD মোবাইল নম্বর) না মেলা পর্যন্ত API কলই হবে না — নাম/ঠিকানা
    // যতই টাইপ করা হোক, ফোন ভ্যালিড না হলে সেভও হবে না। এটাই ব্যবহারিক কারণ:
    // ফোন নম্বর ছাড়া draft-এ কল করে ফলো-আপ করার কোনো উপায় নেই, তাই অসম্পূর্ণ
    // ফোন নম্বর অবস্থায় সার্ভারে ডেটা পাঠানোর মানে নেই ---
    const isPhoneValid = /^01[3-9]\d{8}$/.test(phone);
    if (!isPhoneValid) return;

    saveDraftOrder(slug, {
      customerName,
      phone,
      address,
      quantity,
      productTypeId: activeType?._id || null,
      deliveryArea,
    });
  }, [customerName, phone, address, quantity, slug, activeType, deliveryArea]);

  const total = price * quantity; // চূড়ান্ত totalCOD সহ ডেলিভারি চার্জ ব্যাক-এন্ড authoritative-ভাবে হিসাব করে
  // শুধু UI-তে দেখানোর জন্য — client-side এই সংখ্যাটা কখনো order submit-এ trust করা হয় না
  const deliveryChargeDisplay = freeDelivery
    ? 0
    : deliveryArea === "outside"
      ? (outsideCharge ?? 0)
      : (insideCharge ?? 0);
  const grandTotalDisplay = total + deliveryChargeDisplay;

  const validateForm = () => {
    const newErrors = {};

    if (!customerName.trim()) {
      newErrors.customerName = "আপনার নাম লিখুন";
    }
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      newErrors.phone = "সঠিক মোবাইল নম্বর লিখুন";
    }
    if (address.trim().length < 10) {
      newErrors.address = "সম্পূর্ণ ঠিকানা লিখুন";
    }
    // প্যাকেজ/অফার সিলেকশন থাকলে (hasProductTypes) কিছু একটা বেছে নেওয়া বাধ্যতামূলক —
    // কোনো popup/alert না দেখিয়ে শুধু ওই সেকশনের নিচে ইনলাইন এরর টেক্সট দেখানো হবে
    if (hasProductTypes && !selectedTypeId) {
      newErrors.productType = "যেকোনো একটা অফার বা প্যাকেজ সিলেক্ট করুন";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setApiError("");
    setIsBlocked(false);

    try {
      // productCode/price/name পাঠানোর দরকার নেই — backend slug দিয়ে LandingPage
      // খুঁজে নিজেই authoritative price/productCode ব্যবহার করে (frontend থেকে আসা
      // product info কখনো trust করে না), তাই এখানে শুধু কাস্টমার ইনপুট পাঠানো হচ্ছে
      const payload = {
        name: customerName,
        phone,
        address,
        quantity,
        // freeDelivery হলে backend এমনিতেই deliveryArea ignore করে (charge সবসময় 0),
        // তাই এটা পাঠাতে সমস্যা নেই — actual charge হিসাব backend-এই হয়
        deliveryArea,
        // productTypes থাকলে backend এই আইডি দিয়ে সেই টাইপের price/delivery rule খুঁজে নেয়
        productTypeId: activeType?._id || undefined,
      };
      // landingService.submitOrder নিজে থেকেই fbp/fbc/UTM/sessionId/fingerprintHash-সহ
      // tracking payload যোগ করে দেয় (এতদিন raw axios.post ব্যবহার হতো বলে এই
      // অ্যাট্রিবিউশন ডেটা চূড়ান্ত অর্ডারের সাথে সার্ভারে যেত না — এখন ঠিক হয়েছে)
      const response = await landingService.submitOrder(slug, payload);

      // ফর্ম ক্লিয়ার করার আগে সফল অর্ডারের তথ্য স্ন্যাপশট নেওয়া হচ্ছে —
      // মডালে দেখানোর জন্য (কাস্টমার-facing কোনো unique order ID সিস্টেম নেই,
      // তাই রেফারেন্স হিসেবে কাস্টমারের ফোন নম্বর ব্যবহার হচ্ছে)
      setLastOrder({
        name: customerName,
        phone,
        address,
        quantity,
        total: grandTotalDisplay,
      });
      setSuccess(true);
      setCustomerName("");
      setPhone("");
      setAddress("");
      setQuantity(1);
      setDeliveryArea("inside");
      setAgree(false);
    } catch (err) {
      console.error(err);
      // 🚫 ব্লক করা কাস্টমার — সার্ভার 403 { blocked: true } রিটার্ন করে, অর্ডার তৈরি হয়নি
      if (err.response?.status === 403 && err.response?.data?.blocked) {
        setIsBlocked(true);
      } else {
        setApiError(err.response?.data?.message || "অর্ডার সাবমিট করা যায়নি");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none transition sm:text-base ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
        : "border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100"
    }`;

  const handleCopyReference = async () => {
    if (!lastOrder?.phone) return;
    try {
      await navigator.clipboard.writeText(lastOrder.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API না থাকলে (পুরনো ব্রাউজার) নিরবে ব্যর্থ হবে, কাস্টমার ম্যানুয়ালি সিলেক্ট করে কপি করতে পারবে
    }
  };

  // WhatsApp-এ রেফারেন্স নম্বর-সহ প্রি-ফিলড মেসেজ, যাতে কাস্টমারকে টাইপ করতে না হয়
  const whatsappTrackLink = whatsappNumber
    ? `https://wa.me/88${whatsappNumber}?text=${encodeURIComponent(
        `আমার অর্ডার ট্র্যাক করতে চাই। রেফারেন্স নম্বর: ${lastOrder?.phone || ""}`,
      )}`
    : "";

  return (
    <section
      id="order"
      className="relative overflow-hidden bg-gradient-to-b from-white via-red-50/40 to-green-50 py-16"
    >
      <Container>
        {/* Heading */}
        <div className="text-center">
          <h2 className="mt-5 text-3xl font-extrabold text-gray-900 md:text-5xl">
            এখনই অর্ডার করুন
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-base text-gray-600">
            নিচের ফর্মটি পূরণ করুন। আমাদের প্রতিনিধি দ্রুত আপনার সাথে যোগাযোগ
            করবে।
          </p>
        </div>

        {/* Layout */}
        <div className="mx-auto mt-0 max-w-3xl">
          <div className="rounded-[32px] bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,.12)] sm:p-8">
            <h3 className="mt-7 text-xl font-bold text-gray-900">
              Delivery Information
            </h3>
            <p className="mt-1 mb-3 text-sm text-gray-500">
              সঠিক তথ্য দিন যাতে দ্রুত ডেলিভারি করা যায়।
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-2">
              {/* Name */}
              <div>
                <label htmlFor="customerName">আপনার নাম</label>
                <div className="relative">
                  <FaUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    id="customerName"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setErrors((prev) => ({ ...prev, customerName: "" }));
                    }}
                    placeholder="এখানে আপনার নাম লিখুন"
                    className={inputClass(errors.customerName)}
                  />
                </div>
                {errors.customerName && (
                  <p className="mt-1.5 text-sm text-red-500">
                    {errors.customerName}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phoneNumber">মোবাইল নাম্বার</label>
                <div className="relative">
                  <FaPhoneAlt className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    id="phoneNumber"
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    placeholder="01XXXXXXXXX"
                    className={inputClass(errors.phone)}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address">সম্পূর্ণ ঠিকানা</label>
                <div className="relative">
                  <FaMapMarkerAlt className="pointer-events-none absolute left-4 top-4 text-gray-400" />
                  <textarea
                    rows={3}
                    value={address}
                    id="address"
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setErrors((prev) => ({ ...prev, address: "" }));
                    }}
                    placeholder=" জেল    থানা    এলাকা/গ্রাম   -  যে জায়গা থেকে রিসিভ করবেন সেই ঠিকানা লিখুন।"
                    className={inputClass(errors.address)}
                  />
                </div>
                {errors.address && (
                  <p className="mt-1.5 text-sm text-red-500">
                    {errors.address}
                  </p>
                )}
              </div>

              {/* প্রোডাক্ট টাইপ/প্যাকেজ সিলেকশন — শুধু productTypes থাকলেই দেখানো হয় */}
              {hasProductTypes && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700">
                    প্যাকেজ বেছে নিন
                  </p>
                  <div
                    className={`grid grid-cols-2 gap-2.5 rounded-lg sm:grid-cols-3 ${
                      errors.productType
                        ? "ring-2 ring-red-500 ring-offset-2 p-1"
                        : ""
                    }`}
                  >
                    {productTypes.map((t) => {
                      const isSelected = selectedTypeId === t._id;
                      return (
                        <button
                          key={t._id}
                          type="button"
                          onClick={() => {
                            setSelectedTypeId(t._id);
                            // অন্য ফিল্ডের মতোই সিলেক্ট করলে সাথে সাথে এরর টেক্সট সরে যাবে
                            setErrors((prev) => ({ ...prev, productType: "" }));
                          }}
                          // --- সিলেক্ট/আনসিলেক্ট অবস্থার পার্থক্য আগের চেয়ে অনেক স্পষ্ট করা
                          // হয়েছে: unselected এখন সাদা/নিরপেক্ষ কার্ড (কোনো দৃষ্টি আকর্ষণ
                          // করে না), selected হলে সলিড গাঢ় সবুজ ফিল + সাদা টেক্সট + স্কেল-আপ
                          // + shadow — চোখে পড়ার মতো "উঠে আসা" একটা অনুভূতি তৈরি করে ---
                          className={`relative rounded-xl border-2 px-2 py-3.5 text-left text-sm transition-all duration-200 sm:text-base ${
                            isSelected
                              ? "scale-[1.04] border-green-700 bg-gradient-to-br from-green-600 to-green-800 shadow-lg shadow-green-700/30"
                              : errors.productType
                                ? "border-red-400 bg-red-50 hover:border-red-500"
                                : "border-gray-200 bg-white hover:border-green-400 hover:bg-green-50/50"
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-green-700 shadow-md ring-2 ring-green-700">
                              <FaCheckSquare className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <span
                            className={`block font-bold ${
                              isSelected ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {t.label}
                          </span>
                          <span
                            className={`font-semibold ${
                              isSelected ? "text-white" : "text-green-600"
                            }`}
                          >
                            ৳{t.price}
                            {t.originalPrice ? (
                              <span
                                className={`ml-1 text-xs font-normal line-through ${
                                  isSelected
                                    ? "text-green-100/80"
                                    : "text-gray-400"
                                }`}
                              >
                                ৳{t.originalPrice}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={`block text-xs ${
                              isSelected ? "text-green-50/90" : "text-gray-500"
                            }`}
                          >
                            {t.freeDelivery !== false
                              ? "ফ্রি ডেলিভারি"
                              : "ডেলিভারি চার্জ প্রযোজ্য"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.productType && (
                    <p className="mt-1.5 text-sm text-red-500">
                      {errors.productType}
                    </p>
                  )}
                </div>
              )}

              {/* Delivery area — শুধু Free Delivery বন্ধ থাকলেই দেখানো হয় */}
              {!freeDelivery && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700">
                    ডেলিভারি এলাকা
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        key: "inside",
                        label: "ঢাকার ভেতরে",
                        charge: insideCharge ?? 0,
                      },
                      {
                        key: "outside",
                        label: "ঢাকার বাইরে",
                        charge: outsideCharge ?? 0,
                      },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setDeliveryArea(opt.key)}
                        className={`relative rounded-md border-2 px-3 py-3 text-left text-sm transition sm:text-base ${
                          deliveryArea === opt.key
                            ? "border-green-700 bg-green-100"
                            : "border-gray-200 bg-green-50 hover:border-gray-300"
                        }`}
                      >
                        <span className="absolute top-0 right-0">
                          {deliveryArea === opt.key && "✅"}
                        </span>
                        <span className="block font-bold text-gray-900">
                          {opt.label}
                        </span>
                        <span className="text-xs text-gray-500 sm:text-sm">
                          ৳{opt.charge}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="rounded-2xl bg-gray-50 p-3">
                <h3 className="text-lg font-bold">অর্ডার সারসংক্ষেপ</h3>
                {/* Product + quantity card */}
                <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 sm:p-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white sm:h-20 sm:w-20">
                    <Image
                      src={productImage}
                      alt={productName}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-base font-bold text-gray-900 sm:text-lg">
                      {productName}
                    </h4>
                    <p className="text-sm text-green-600 font-semibold sm:text-base">
                      ৳{price}
                      {originalPrice ? (
                        <span className="ml-1 text-xs font-normal text-gray-400 line-through">
                          ৳{originalPrice}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-green-100 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="কমান"
                      className="flex h-12 w-10 cursor-pointer items-center justify-center text-gray-600 transition hover:bg-geen-300 bg-green-200 hover:text-red-600"
                    >
                      <FaMinus size={11} />
                    </button>

                    <div className="w-6 text-center text-base font-bold">
                      {quantity}
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      aria-label="বাড়ান"
                      className="flex h-12 w-10 cursor-pointer items-center justify-center  text-gray-600 transition hover:bg-green-300 bg-green-200 hover:text-green-600"
                    >
                      <FaPlus size={11} />
                    </button>
                  </div>
                </div>
                <div className="mt-4  text-sm sm:text-base">
                  <div className="flex justify-between text-gray-600">
                    <span>
                      {price} × {quantity}
                    </span>
                    <span>৳{total}</span>
                  </div>

                  {!freeDelivery && (
                    <div className="flex justify-between text-gray-600">
                      <span>
                        ডেলিভারি চার্জ (
                        {deliveryArea === "outside"
                          ? "ঢাকার বাইরে"
                          : "ঢাকার ভেতরে"}
                        )
                      </span>
                      <span>৳{deliveryChargeDisplay}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-2.5">
                    <div className="flex justify-between text-lg font-extrabold text-green-600">
                      <span>মোট</span>
                      <span>৳{grandTotalDisplay}</span>
                    </div>
                  </div>
                  {/* <p className="text-md text-center text-green-800 bg-gray-200  rounded-md px-2 py-1">
                    {freeDelivery
                      ? "ডেলিভারি চার্জ ফ্রী"
                      : `ডেলিভারি চার্জ (ঢাকায় ৳${insideCharge ?? 0}, ঢাকার বাইরে ৳${outsideCharge ?? 0})`}
                  </p> */}
                </div>
              </div>

              {apiError && (
                <div className="rounded-2xl border border-red-300 bg-red-100 p-4 text-sm text-red-600">
                  {apiError}
                </div>
              )}

              {/* Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-2xl py-4 text-lg font-bold text-white shadow-xl transition ${
                  loading
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-gradient-to-r from-green-600 to-red-500 hover:scale-[1.02]"
                }`}
              >
                {loading ? "অর্ডার প্রসেস হচ্ছে..." : "🛒 অর্ডার কনফার্ম"}
              </button>
            </form>

            {success && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-5">
                <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[35px] bg-white p-6 text-center shadow-2xl sm:p-8">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                    ✅
                  </div>

                  <h2 className="mt-6 text-3xl font-extrabold text-green-600">
                    ধন্যবাদ
                  </h2>

                  <p className="mt-3 leading-7 text-gray-600">
                    আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। আমাদের প্রতিনিধি
                    শীঘ্রই আপনার সাথে যোগাযোগ করবে।
                  </p>

                  {lastOrder && (
                    <>
                      {/* Reference number — কপি করে হোয়াটসঅ্যাপে দিলে অর্ডার খুঁজে পাওয়া যাবে */}
                      <div className="mt-5 rounded-2xl border-2 border-dashed border-green-300 bg-green-50 p-4">
                        <p className="text-xs font-semibold text-gray-500">
                          আপনার অর্ডার সম্পর্কিত যে কোন আপডেট পেতে হোয়াটসঅ্যাপে
                          আপনার নাম্বারটি আমাদের দিলেই হবে
                        </p>
                        {/* <div className="mt-1 flex items-center justify-center gap-2">
                          <span className="text-2xl font-extrabold tracking-wide text-green-700">
                            {lastOrder.phone}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyReference}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-700"
                          >
                            {copied ? "কপি হয়েছে ✓" : "কপি করুন"}
                          </button>
                        </div> */}
                        {/* <p className="mt-2 text-xs leading-5 text-gray-500">
                          আপনার অর্ডার সম্পর্কিত  যে কোন আপডেট পেতে হোয়াটসঅ্যাপে আপনার নাম্বারটি আমাদের দিলেই হবে

                        </p> */}
                      </div>

                      {/* Order summary */}
                      <div className="mt-4 space-y-1.5 rounded-2xl bg-gray-50 p-4 text-left text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">নাম</span>
                          <span className="font-semibold text-gray-800">
                            {lastOrder.name}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="shrink-0 text-gray-500">ঠিকানা</span>
                          <span className="text-right font-semibold text-gray-800">
                            {lastOrder.address}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">পরিমাণ</span>
                          <span className="font-semibold text-gray-800">
                            {lastOrder.quantity}টি
                          </span>
                        </div>
                        <div className="flex justify-between gap-2 border-t border-gray-200 pt-1.5">
                          <span className="text-gray-500">মোট মূল্য</span>
                          <span className="font-extrabold text-green-600">
                            ৳{lastOrder.total}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {whatsappTrackLink && (
                    <a
                      href={whatsappTrackLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3 text-lg font-bold text-white shadow-lg transition hover:scale-[1.02]"
                    >
                      🟢 WhatsApp-এ যোগাযোগ করুন
                    </a>
                  )}

                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-3 w-full rounded-2xl bg-gray-100 py-3 text-lg font-bold text-gray-700"
                  >
                    ঠিক আছে
                  </button>
                </div>
              </div>
            )}

            {isBlocked && (
              <BlockedCustomerPopup
                whatsappNumber={whatsappNumber}
                onClose={() => setIsBlocked(false)}
              />
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
