"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  FaUser,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaMinus,
  FaPlus,
} from "react-icons/fa";
import Container from "@/components/common-ui/Container";
import { saveDraftOrder } from "@/utils/tracking";
import { landingService } from "@/services/landingService";
import BlockedCustomerPopup from "./BlockedCustomerPopup";

const PRODUCT_PRICE = 890;
const PRODUCT_NAME = "আনার দানা";
const PRODUCT_IMAGE = "/images/anardana.jpg";

export default function OrderSection({ slug }) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!customerName && !phone && !address) return; // সবগুলো খালি থাকলে সেভ করার দরকার নেই
    saveDraftOrder("anardana", { customerName, phone, address, quantity });
  }, [customerName, phone, address, quantity]);

  const total = PRODUCT_PRICE * quantity; // for delivery charge not included

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
      const payload = {
        name: customerName,
        phone,
        address,
        quantity,
        total,
        productCode: "P-Landing01",
        product: {
          name: PRODUCT_NAME,
          price: PRODUCT_PRICE,
        },
      };
      // landingService.submitOrder নিজে থেকেই fbp/fbc/UTM/sessionId/fingerprintHash-সহ
      // tracking payload যোগ করে দেয় (এতদিন raw axios.post ব্যবহার হতো বলে এই
      // অ্যাট্রিবিউশন ডেটা চূড়ান্ত অর্ডারের সাথে সার্ভারে যেত না — এখন ঠিক হয়েছে)
      const response = await landingService.submitOrder(slug, payload);

      setSuccess(true);
      setCustomerName("");
      setPhone("");
      setAddress("");
      setQuantity(1);
      // setDeliveryArea("inside");
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
    `w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none transition sm:text-base ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
        : "border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100"
    }`;

  return (
    <section
      id="order"
      className="relative overflow-hidden bg-gradient-to-b from-white via-red-50/40 to-green-50 py-16"
    >
      {/* Background */}
      {/* <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-green-300/20 blur-[120px]" /> */}
      {/* <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-red-300/20 blur-[120px]" /> */}
      <Container>
        {/* Heading */}
        <div className="text-center">
          <span className="rounded-full bg-red-100 px-4 py-1.5 text-sm font-bold text-red-600">
            🛒 Secure Checkout
          </span>

          <h2 className="mt-5 text-3xl font-extrabold text-gray-900 md:text-5xl">
            এখনই অর্ডার করুন
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600">
            নিচের ফর্মটি পূরণ করুন। আমাদের প্রতিনিধি দ্রুত আপনার সাথে যোগাযোগ
            করবে।
          </p>
        </div>

        {/* Layout */}
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-[32px] bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,.12)] sm:p-8">
            <h3 className="mt-7 text-xl font-bold text-gray-900">
              Delivery Information
            </h3>
            <p className="mt-1 mb-3 text-sm text-gray-500">
              সঠিক তথ্য দিন যাতে দ্রুত ডেলিভারি করা যায়।
            </p>

            {/* Product + quantity card */}
            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 pe-2 sm:p-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-20 sm:w-20">
                <Image
                  src={PRODUCT_IMAGE}
                  alt={PRODUCT_NAME}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="truncate text-base font-bold text-gray-900 sm:text-lg">
                  {PRODUCT_NAME}
                </h4>
                <p className="text-sm text-green-600 font-semibold sm:text-base">
                  ৳{PRODUCT_PRICE}
                  <span className="ml-1 text-xs font-normal text-gray-400 line-through">
                    ৳১২০০
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="কমান"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center text-gray-600 transition hover:bg-red-50 hover:text-red-600"
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
                  className="flex h-10 w-10 cursor-pointer items-center justify-center  text-gray-600 transition hover:bg-green-50 hover:text-green-600"
                >
                  <FaPlus size={11} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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

              {/* Delivery area */}
              <p className="text-md font-semibold text-green-800 bg-gray-200 border border-gray-400 rounded-lg p-2">
                ডেলিভারি চার্জ সারা বাংলাদেশে ফ্রী - পন্য হাতে পেয়ে টাকা দিবেন
              </p>
              {/* <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">ডেলিভারি এলাকা</p>
                <div className="grid grid-cols-2 gap-3">
                  {deliveryOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setDeliveryArea(opt.key)}
                      className={`rounded-xl border-2 px-3 py-3 text-left text-sm transition sm:text-base ${
                        deliveryArea === opt.key
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span className="block font-bold text-gray-900">{opt.label}</span>
                      <span className="text-xs text-gray-500 sm:text-sm">৳{opt.charge}</span>
                    </button>
                  ))}
                </div>
              </div> */}

              {/* Order Summary */}
              <div className="rounded-2xl bg-gray-50 p-5">
                <h3 className="text-lg font-bold">অর্ডার সারসংক্ষেপ</h3>

                <div className="mt-4 space-y-2.5 text-sm sm:text-base">
                  <div className="flex justify-between text-gray-600">
                    <span>890 × {quantity}</span>
                    <span>৳{total}</span>
                  </div>
                  {/* <div className="flex justify-between text-gray-600">
                    <span>ডেলিভারি চার্জ</span>
                    <span>৳{deliveryCharge}</span>
                  </div> */}

                  <div className="border-t border-gray-200 pt-2.5">
                    <div className="flex justify-between text-lg font-extrabold text-green-600">
                      <span>মোট</span>
                      <span>৳{total}</span>
                    </div>
                  </div>
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
                {loading ? "অর্ডার প্রসেস হচ্ছে..." : "🛒 অর্ডার কনফার্ম করুন"}
              </button>
            </form>

            {success && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-5">
                <div className="w-full max-w-md rounded-[35px] bg-white p-8 text-center shadow-2xl">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                    ✅
                  </div>

                  <h2 className="mt-6 text-3xl font-extrabold text-green-600">
                    ধন্যবাদ
                  </h2>

                  <p className="mt-4 leading-7 text-gray-600">
                    আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে।
                    <br />
                    আমাদের প্রতিনিধি খুব শীঘ্রই আপনার সাথে যোগাযোগ করবে।
                  </p>

                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-8 w-full rounded-2xl bg-green-600 py-3 text-lg font-bold text-white"
                  >
                    ঠিক আছে
                  </button>
                </div>
              </div>
            )}

            {isBlocked && <BlockedCustomerPopup onClose={() => setIsBlocked(false)} />}
          </div>
        </div>
      </Container>
    </section>
  );
}
