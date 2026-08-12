"use client";
import { useState } from "react";

const emptyForm = {
  slug: "",
  productName: "",
  productCode: "",
  tagline: "",
  description: "",
  topTagline: "",
  hero: { heading: "", description: "" },
  price: "",
  originalPrice: "",
  images: [""],
  features: [""],
  benefits: {
    heading: "",
    description: "",
    items: [{ title: "", description: "", icon: "" }],
  },
  testimonials: [{ name: "", text: "", rating: 5 }],
  faqs: [{ question: "", answer: "" }],
  reviewImages: [""],
  // trustImage: "",
  // reviewImage: "",
  usageProcess: [{ title: "", description: "" }],
  whatsappNumber: "",
  phoneNumber: "",
  imoNumber: "",
  freeDelivery: true,
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
            className="px-2 bg-red-100 text-red-600 rounded text-xs  cursor-pointer"
          >
            মুছুন
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="mt-1 text-xs text-indigo-600 font-medium cursor-pointer"
      >
        + আরেকটা যোগ করুন
      </button>
    </div>
  );
}

// --- Section heading — শুধু ফর্মকে visually organize করার জন্য (data-তে কোনো প্রভাব নেই) ---
function SectionTitle({ children, hint }) {
  return (
    <div className="pt-2 border-t border-gray-100 first:border-t-0 first:pt-0">
      <h4 className="text-sm font-bold text-gray-800">{children}</h4>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function LandingPageForm({
  initialData,
  onSubmit,
  onCancel,
  submitting,
}) {
  // পুরনো পেজ (নতুন ফিল্ড যোগ হওয়ার আগে তৈরি করা) এডিট করলেও যেন ফর্ম ভেঙে না যায়,
  // তাই emptyForm-এর সাথে merge করে ডিফল্ট ভ্যালু নিশ্চিত করা হচ্ছে — nested object/array
  // (hero, benefits) shallow spread দিয়ে merge হয় না বলে আলাদাভাবে deep merge করা হচ্ছে
  const buildInitialForm = (data) => {
    if (!data) return emptyForm;
    return {
      ...emptyForm,
      ...data,
      hero: { ...emptyForm.hero, ...(data.hero || {}) },
      benefits: {
        ...emptyForm.benefits,
        ...(data.benefits || {}),
        items: data.benefits?.items?.length
          ? data.benefits.items
          : emptyForm.benefits.items,
      },
      usageProcess: data.usageProcess?.length
        ? data.usageProcess
        : emptyForm.usageProcess,
    };
  };

  const [form, setForm] = useState(buildInitialForm(initialData));
  const isEdit = !!initialData;

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const handleHeroChange = (field, value) =>
    setForm((prev) => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
  const handleBenefitsMetaChange = (field, value) =>
    setForm((prev) => ({
      ...prev,
      benefits: { ...prev.benefits, [field]: value },
    }));

  const handleBenefitItemChange = (i, field, value) => {
    const copy = [...form.benefits.items];
    copy[i] = { ...copy[i], [field]: value };
    handleBenefitsMetaChange("items", copy);
  };

  const handleUsageStepChange = (i, field, value) => {
    const copy = [...form.usageProcess];
    copy[i] = { ...copy[i], [field]: value };
    handleChange("usageProcess", copy);
  };

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
      reviewImages: form.reviewImages.filter((i) => i.trim()),
      features: form.features.filter((f) => f.trim()),
      benefits: {
        heading: form.benefits.heading,
        description: form.benefits.description,
        items: form.benefits.items.filter(
          (b) => b.title.trim() || b.description.trim(),
        ),
      },
      testimonials: form.testimonials.filter(
        (t) => t.name.trim() && t.text.trim(),
      ),
      faqs: form.faqs.filter((f) => f.question.trim() && f.answer.trim()),
      usageProcess: form.usageProcess.filter(
        (s) => s.title.trim() || s.description.trim(),
      ),
      // ডেলিভারি চার্জ negative হতে পারবে না (client-side validation, backend-ও আলাদাভাবে enforce করে)
      deliveryChargeInsideDhaka: Math.max(
        0,
        Number(form.deliveryChargeInsideDhaka) || 0,
      ),
      deliveryChargeOutsideDhaka: Math.max(
        0,
        Number(form.deliveryChargeOutsideDhaka) || 0,
      ),
    };
    onSubmit(cleaned);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4"
    >
      <h3 className="text-sm font-semibold text-gray-700">
        {isEdit ? "✏️ পেজ এডিট করুন" : "➕ নতুন ল্যান্ডিং পেজ"}
      </h3>

      {/* ---------- Basic Product Information ---------- */}
      <SectionTitle>Basic Product Information</SectionTitle>
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
          <label className="text-xs text-gray-500">
            Product Code (orderSource হিসেবে ব্যবহৃত হবে)
          </label>
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
          <label className="text-xs text-gray-500">
            ট্যাগলাইন (Footer/SEO-তে ব্যবহৃত হয়)
          </label>
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => handleChange("tagline", e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
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

      {/* ---------- Top Tagline ---------- */}
      <SectionTitle hint="পেজের একদম উপরে লাল ব্যানারে দেখানো হবে">
        Top Tagline (Announcement Bar)
      </SectionTitle>
      <input
        type="text"
        value={form.topTagline}
        onChange={(e) => handleChange("topTagline", e.target.value)}
        placeholder="🔥 আজকের বিশেষ অফার — সীমিত সময়ের জন্য!"
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
      />

      {/* ---------- Hero Section ---------- */}
      <SectionTitle hint="খালি রাখলে প্রোডাক্টের নাম/বিবরণ থেকে দেখানো হবে">
        Hero Section
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Hero Heading</label>
          <input
            type="text"
            value={form.hero.heading}
            onChange={(e) => handleHeroChange("heading", e.target.value)}
            placeholder="যেমন: স্থায়ীভাবে সমাধান পেতে চান?"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Hero Description</label>
          <textarea
            value={form.hero.description}
            onChange={(e) => handleHeroChange("description", e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
      </div>

      <ListField
        label="প্রোডাক্ট ছবি (URL)"
        items={form.images}
        onChange={(v) => handleChange("images", v)}
        placeholder="https://..."
      />

      <ListField
        label="ফিচার/বৈশিষ্ট্য (বুলেট পয়েন্ট — অফার সেকশনের checklist-এ ব্যবহৃত হয়)"
        items={form.features}
        onChange={(v) => handleChange("features", v)}
        placeholder="যেমন: ১০০% প্রাকৃতিক উপাদান"
      />

      {/* ---------- Benefits Section ---------- */}
      <SectionTitle>Benefits Section</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Benefits Heading</label>
          <input
            type="text"
            value={form.benefits.heading}
            onChange={(e) =>
              handleBenefitsMetaChange("heading", e.target.value)
            }
            placeholder="যেমন: কেন এই প্রোডাক্ট বেছে নেবেন?"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Benefits Description</label>
          <input
            type="text"
            value={form.benefits.description}
            onChange={(e) =>
              handleBenefitsMetaChange("description", e.target.value)
            }
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">Benefit Items</label>
        {form.benefits.items.map((b, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-lg p-2 mt-1 space-y-1"
          >
            <div className="flex gap-1">
              <input
                type="text"
                value={b.icon}
                onChange={(e) =>
                  handleBenefitItemChange(i, "icon", e.target.value)
                }
                placeholder="🌿"
                className="w-14 border border-gray-300 rounded px-2 py-1 text-sm text-center"
              />
              <input
                type="text"
                value={b.title}
                onChange={(e) =>
                  handleBenefitItemChange(i, "title", e.target.value)
                }
                placeholder="Title"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  handleBenefitsMetaChange(
                    "items",
                    form.benefits.items.filter((_, idx) => idx !== i),
                  )
                }
                className="px-2 bg-red-100 text-red-600 rounded text-xs"
              >
                মুছুন
              </button>
            </div>
            <textarea
              value={b.description}
              onChange={(e) =>
                handleBenefitItemChange(i, "description", e.target.value)
              }
              placeholder="Description"
              rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            handleBenefitsMetaChange("items", [
              ...form.benefits.items,
              { title: "", description: "", icon: "" },
            ])
          }
          className="mt-1 text-xs text-indigo-600 font-medium"
        >
          + Benefit যোগ করুন
        </button>
      </div>

      {/* ---------- Trust / Review Section ---------- */}
      <SectionTitle hint="দুটি সম্পূর্ণ আলাদা ইমেজ, একটা আরেকটার বদলে ব্যবহৃত হবে না">
        Trust / Review Section
      </SectionTitle>
      <div className="mb-3">
        <ListField
          label="Trust Section Review Screenshots (URL)"
          items={form.reviewImages}
          onChange={(v) => handleChange("reviewImages", v)}
          placeholder="https://..."
        />
      </div>
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">
            Trust Section Image (URL)
          </label>
          <input
            type="text"
            value={form.trustImage}
            onChange={(e) => handleChange("trustImage", e.target.value)}
            placeholder="https://..."
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Review Image (URL)</label>
          <input
            type="text"
            value={form.reviewImage}
            onChange={(e) => handleChange("reviewImage", e.target.value)}
            placeholder="https://..."
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
      </div> */}

      {/* ---------- Usage Guide ---------- */}
      <SectionTitle hint="ব্যবহারের ধাপ — যোগ/এডিট/মুছুন করা যাবে, ক্রম উপরে থেকে নিচে অনুযায়ী দেখানো হবে">
        Usage Guide
      </SectionTitle>
      <div>
        {form.usageProcess.map((s, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-lg p-2 mt-1 space-y-1"
          >
            <div className="flex gap-1">
              <span className="flex items-center px-2 text-xs text-gray-400">
                #{i + 1}
              </span>
              <input
                type="text"
                value={s.title}
                onChange={(e) =>
                  handleUsageStepChange(i, "title", e.target.value)
                }
                placeholder="ধাপের শিরোনাম"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  handleChange(
                    "usageProcess",
                    form.usageProcess.filter((_, idx) => idx !== i),
                  )
                }
                className="px-2 bg-red-100 text-red-600 rounded text-xs"
              >
                মুছুন
              </button>
            </div>
            <textarea
              value={s.description}
              onChange={(e) =>
                handleUsageStepChange(i, "description", e.target.value)
              }
              placeholder="বিস্তারিত"
              rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            handleChange("usageProcess", [
              ...form.usageProcess,
              { title: "", description: "" },
            ])
          }
          className="mt-1 text-xs text-indigo-600 font-medium"
        >
          + ধাপ যোগ করুন
        </button>
      </div>

      {/* ---------- Offer / Pricing ---------- */}
      <SectionTitle>Offer / Pricing</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <label className="text-xs text-gray-500">
            আগের দাম (ঐচ্ছিক, কাটা দাগের জন্য)
          </label>
          <input
            type="number"
            value={form.originalPrice || ""}
            onChange={(e) => handleChange("originalPrice", e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">কাস্টমার রিভিউ</label>
        {form.testimonials.map((t, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-lg p-2 mt-1 space-y-1"
          >
            <div className="flex gap-1">
              <input
                type="text"
                value={t.name}
                onChange={(e) =>
                  handleTestimonialChange(i, "name", e.target.value)
                }
                placeholder="কাস্টমারের নাম"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <select
                value={t.rating}
                onChange={(e) =>
                  handleTestimonialChange(i, "rating", Number(e.target.value))
                }
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
              onChange={(e) =>
                handleTestimonialChange(i, "text", e.target.value)
              }
              placeholder="রিভিউ টেক্সট"
              rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            handleChange("testimonials", [
              ...form.testimonials,
              { name: "", text: "", rating: 5 },
            ])
          }
          className="mt-1 text-xs text-indigo-600 font-medium"
        >
          + রিভিউ যোগ করুন
        </button>
      </div>

      <div>
        <label className="text-xs text-gray-500">সচরাচর জিজ্ঞাসা (FAQ)</label>
        {form.faqs.map((f, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-lg p-2 mt-1 space-y-1"
          >
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
                onClick={() =>
                  handleChange(
                    "faqs",
                    form.faqs.filter((_, idx) => idx !== i),
                  )
                }
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
          onClick={() =>
            handleChange("faqs", [...form.faqs, { question: "", answer: "" }])
          }
          className="mt-1 text-xs text-indigo-600 font-medium"
        >
          + প্রশ্ন যোগ করুন
        </button>
      </div>

      {/* ---------- Delivery ---------- */}
      <SectionTitle>Delivery</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.freeDelivery}
              onChange={(e) => handleChange("freeDelivery", e.target.checked)}
            />
            Free Delivery (চালু থাকলে ভেতরে/বাইরের চার্জ যতই থাকুক, কাস্টমারের
            কাছ থেকে ডেলিভারি চার্জ নেওয়া হবে না)
          </label>
        </div>
        <div>
          <label className="text-xs text-gray-500">
            Inside Dhaka Delivery Charge
            {form.freeDelivery && " (Free Delivery চালু থাকায় ব্যবহৃত হবে না)"}
          </label>
          <input
            type="number"
            value={form.deliveryChargeInsideDhaka}
            onChange={(e) =>
              handleChange("deliveryChargeInsideDhaka", e.target.value)
            }
            disabled={form.freeDelivery}
            min={0}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1 disabled:bg-gray-100 disabled:text-gray-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">
            Outside Dhaka Delivery Charge
            {form.freeDelivery && " (Free Delivery চালু থাকায় ব্যবহৃত হবে না)"}
          </label>
          <input
            type="number"
            value={form.deliveryChargeOutsideDhaka}
            onChange={(e) =>
              handleChange("deliveryChargeOutsideDhaka", e.target.value)
            }
            disabled={form.freeDelivery}
            min={0}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1 disabled:bg-gray-100 disabled:text-gray-400"
          />
        </div>
      </div>

      {/* ---------- Contact ---------- */}
      <SectionTitle hint="কোনো নম্বর খালি রাখলে ল্যান্ডিং পেজে সেই সংশ্লিষ্ট বাটন হাইড হয়ে যাবে">
        Contact
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500">WhatsApp Number</label>
          <input
            type="text"
            value={form.whatsappNumber}
            onChange={(e) => handleChange("whatsappNumber", e.target.value)}
            placeholder="8801XXXXXXXXX"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">
            Phone Number (Call বাটনের জন্য)
          </label>
          <input
            type="text"
            value={form.phoneNumber}
            onChange={(e) => handleChange("phoneNumber", e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">IMO Number</label>
          <input
            type="text"
            value={form.imoNumber}
            onChange={(e) => handleChange("imoNumber", e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-1"
          />
        </div>
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
