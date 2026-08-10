"use client";

// --- ব্লক করা কাস্টমার আবার অর্ডার করার চেষ্টা করলে দেখানো হয় (সার্ভার 403 +
// { blocked: true } রিটার্ন করলে)। অর্ডার তৈরি হয়নি — কাস্টমারকে WhatsApp-এ
// সরাসরি যোগাযোগ করতে বলা হয়। ---

const WHATSAPP_NUMBER = "+8801886362484"; // TemplateOneBody.jsx-এ ব্যবহৃত একই বিজনেস WhatsApp নম্বর

export default function BlockedCustomerPopup({ onClose }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-5">
      <div className="w-full max-w-md rounded-[35px] bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl">
          📞
        </div>

        <h2 className="mt-6 text-2xl font-extrabold text-gray-900">
          অর্ডারটি প্রসেস করা যায়নি
        </h2>

        <p className="mt-4 leading-7 text-gray-600">
          আপনার অর্ডারটি এই মুহূর্তে অটোমেটিক্যালি গ্রহণ করা যাচ্ছে না।
          <br />
          অনুগ্রহ করে সরাসরি আমাদের হোয়াটসঅ্যাপে যোগাযোগ করুন — আমরা দ্রুত সাহায্য
          করব।
        </p>

        <a
          href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block w-full rounded-2xl bg-green-600 py-3 text-lg font-bold text-white"
        >
          🟢 WhatsApp-এ যোগাযোগ করুন
        </a>

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-2xl bg-gray-100 py-3 text-base font-semibold text-gray-600"
        >
          বন্ধ করুন
        </button>
      </div>
    </div>
  );
}
