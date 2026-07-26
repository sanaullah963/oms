"use client";
import { useState } from "react";

const emptyForm = {
  slug: "",
  productName: "",
  productCode: "",
  tagline: "",
  description: "",
  price: "",
  originalPrice: "",
  images: [""],
  features: [""],
  testimonials: [{ name: "", text: "", rating: 5 }],
  faqs: [{ question: "", answer: "" }],
  whatsappNumber: "",
  deliveryChargeInsideDhaka: 70,
  deliveryChargeOutsideDhaka: 130,
  isActive: true,
};

function ListField({ label, items, onChange, placeholder }) {
  const update = (i, value) => {
    const copy = [...items];
    copy[i] = value;
    onChange(copy);
  };
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-1 mt-1">
          <input
            type="text"
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="px-2 bg-red-100 text-red-600 rounded text-xs"
          >
            মুছুন
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="mt-1 text-xs text-indigo-600 font-medium"
      >
        + আরেকটা যোগ করুন
      </button>
    </div>
  );
}

export default function LandingPageForm({ initialData, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(initialData || emptyForm);
  const isEdit = !!initialData;

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleTestimonialChange = (i, field, value) => {
    const copy = [...form.testimonials];
    copy[i] = { ...copy[i], [field]: value };
    handleChange("testimonials", copy);
  };

  const handleFaqChange = (i, field, value) => {
    const copy = [...form.faqs];
    copy[i] = { ...copy[i], [field]: value };
    handleChange("faqs", copy);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleaned = {
      ...form,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      images: form.images.filter((i) => i.trim()),
      features: form.features.filter((f) => f.trim()),
      testimonials: form.testimonials.filter((t) => t.name.trim() && t.text.trim()),
      faqs: form.faqs.filter((f) => f.question.trim() && f.answer.trim()),
    };
    onSubmit(cleaned);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">
        {isEdit ? "✏️ পেজ এডিট করুন" : "➕ নতুন ল্যান্ডিং পেজ"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">
            Slug (URL) — yoursite.com/<b>slug</b>
          </label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => handleChange("slug", e.target.value.toLowerCase())}
            placeholder="skincare-combo"
            required
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Product Code (orderSource হিসেবে ব্যবহৃত হবে)</label>
          <input
            type="text"
            value={form.productCode}
            onChange={(e) => handleChange("productCode", e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">প্রোডাক্টের নাম</label>
          <input
            type="text"
            value={form.productName}
            onChange={(e) => handleChange("productName", e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">ট্যাগলাইন (ছোট সাবহেডলাইন)</label>
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => handleChange("tagline", e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">দাম (৳)</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => handleChange("price", e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">আগের দাম (ঐচ্ছিক, কাটা দাগের জন্য)</label>
          <input
            type="number"
            value={form.originalPrice || ""}
            onChange={(e) => handleChange("originalPrice", e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">WhatsApp নম্বর (ঐচ্ছিক)</label>
          <input
            type="text"
            value={form.whatsappNumber}
            onChange={(e) => handleChange("whatsappNumber", e.target.value)}
            placeholder="8801XXXXXXXXX"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500">ডেলিভারি চার্জ (ঢাকার ভেতরে)</label>
            <input
              type="number"
              value={form.deliveryChargeInsideDhaka}
              onChange={(e) => handleChange("deliveryChargeInsideDhaka", e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500">ডেলিভারি চার্জ (বাইরে)</label>
            <input
              type="number"
              value={form.deliveryChargeOutsideDhaka}
              onChange={(e) => handleChange("deliveryChargeOutsideDhaka", e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">বিস্তারিত বিবরণ</label>
        <textarea
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
        />
      </div>

      <ListField
        label="প্রোডাক্ট ছবি (URL)"
        items={form.images}
        onChange={(v) => handleChange("images", v)}
        placeholder="https://..."
      />

      <ListField
        label="ফিচার/বৈশিষ্ট্য (বুলেট পয়েন্ট)"
        items={form.features}
        onChange={(v) => handleChange("features", v)}
        placeholder="যেমন: ১০০% প্রাকৃতিক উপাদান"
      />

      <div>
        <label className="text-xs text-gray-500">কাস্টমার রিভিউ</label>
        {form.testimonials.map((t, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-2 mt-1 space-y-1">
            <div className="flex gap-1">
              <input
                type="text"
                value={t.name}
                onChange={(e) => handleTestimonialChange(i, "name", e.target.value)}
                placeholder="কাস্টমারের নাম"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <select
                value={t.rating}
                onChange={(e) => handleTestimonialChange(i, "rating", Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} ⭐
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  handleChange(
                    "testimonials",
                    form.testimonials.filter((_, idx) => idx !== i),
                  )
                }
                className="px-2 bg-red-100 text-red-600 rounded text-xs"
              >
                মুছুন
              </button>
            </div>
            <textarea
              value={t.text}
              onChange={(e) => handleTestimonialChange(i, "text", e.target.value)}
              placeholder="রিভিউ টেক্সট"
              rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            handleChange("testimonials", [...form.testimonials, { name: "", text: "", rating: 5 }])
          }
          className="mt-1 text-xs text-indigo-600 font-medium"
        >
          + রিভিউ যোগ করুন
        </button>
      </div>

      <div>
        <label className="text-xs text-gray-500">সচরাচর জিজ্ঞাসা (FAQ)</label>
        {form.faqs.map((f, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-2 mt-1 space-y-1">
            <div className="flex gap-1">
              <input
                type="text"
                value={f.question}
                onChange={(e) => handleFaqChange(i, "question", e.target.value)}
                placeholder="প্রশ্ন"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => handleChange("faqs", form.faqs.filter((_, idx) => idx !== i))}
                className="px-2 bg-red-100 text-red-600 rounded text-xs"
              >
                মুছুন
              </button>
            </div>
            <textarea
              value={f.answer}
              onChange={(e) => handleFaqChange(i, "answer", e.target.value)}
              placeholder="উত্তর"
              rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => handleChange("faqs", [...form.faqs, { question: "", answer: "" }])}
          className="mt-1 text-xs text-indigo-600 font-medium"
        >
          + প্রশ্ন যোগ করুন
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => handleChange("isActive", e.target.checked)}
        />
        পেজটি সক্রিয় (Active) রাখুন
      </label>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg bg-gray-200 text-gray-700"
        >
          বাতিল
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-60"
        >
          {submitting ? "সেভ হচ্ছে..." : isEdit ? "আপডেট করুন" : "তৈরি করুন"}
        </button>
      </div>
    </form>
  );
}