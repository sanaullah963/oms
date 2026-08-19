const mongoose = require("mongoose");

const TestimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    text: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, default: 5 },
  },
  { _id: false },
);

const FaqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false },
);

// --- HeroTop-এর heading/description এখন productName/description থেকে আলাদা —
// admin চাইলে হিরো সেকশনের জন্য আলাদা মার্কেটিং কপি লিখতে পারবে ---
const HeroSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const BenefitItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    icon: { type: String, default: "" }, // emoji/ছোট আইকন টেক্সট (যেমন 🌿)
  },
  { _id: false },
);

const BenefitsSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "" },
    description: { type: String, default: "" },
    items: { type: [BenefitItemSchema], default: [] },
  },
  { _id: false },
);

const UsageStepSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false },
);

// --- একাধিক "প্রোডাক্ট টাইপ / প্যাকেজ" (যেমন "1 পিস", "2 পিস", "৫০ বক্স") — প্রতিটার
// নিজস্ব প্রাইস ও নিজস্ব ডেলিভারি রুল (ফ্রি অথবা ইনসাইড/আউটসাইড চার্জ) থাকে। কাস্টমার
// ল্যান্ডিং পেজে এখান থেকে একটা টাইপ বেছে নেয়, তারপর +/- দিয়ে quantity বাড়ায়-কমায়
// (totalCOD = selectedType.price × qty)। _id (default Mongoose ObjectId) দিয়েই
// ফ্রন্টএন্ড থেকে backend-এ কোন টাইপ সিলেক্ট হয়েছে সেটা রেফারেন্স করা হয়
// (দেখুন publicLandingController.js-এর submitPublicOrder) ---
const ProductTypeSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true }, // যেমন "1 পিস", "2 পিস", "৫০ বক্স"
  price: { type: Number, required: true },
  originalPrice: { type: Number, default: null }, // থাকলে কাটা দাগ দিয়ে দেখানো হবে
  freeDelivery: { type: Boolean, default: true },
  deliveryChargeInsideDhaka: { type: Number, default: 70 },
  deliveryChargeOutsideDhaka: { type: Number, default: 130 },
  isDefault: { type: Boolean, default: false }, // পেজ লোড হওয়ার সাথে সাথে প্রথমে এটাই সিলেক্ট থাকবে
});

const LandingPageSchema = new mongoose.Schema(
  {
    // URL-এ ব্যবহৃত হবে: yoursite.com/{slug}
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    productName: { type: String, required: true },
    // এই কোডটাই অর্ডারের productCode ও orderSource হিসেবে ব্যবহৃত হবে (কোন পেজ থেকে অর্ডার এসেছে বোঝার জন্য)
    productCode: { type: String, required: true, trim: true },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    // --- একদম উপরে লাল Announcement Bar-এর জন্য আলাদা field (tagline থেকে আলাদা,
    // যেহেতু tagline অন্য জায়গায় — Footer subtitle, SEO metadata — ব্যবহৃত হয়) ---
    topTagline: { type: String, default: "" },
    // --- HeroTop-এর নিজস্ব heading/description — খালি থাকলে ফ্রন্টএন্ড
    // productName/description-এ fallback করবে (পুরনো পেজ ভাঙবে না) ---
    hero: { type: HeroSchema, default: () => ({}) },
    images: { type: [String], default: [] },
    price: { type: Number, required: true },
    originalPrice: { type: Number, default: null }, // থাকলে কাটা দাগ দিয়ে দেখানো হবে
    features: { type: [String], default: [] },
    // --- BenefitsSection-এর নিজস্ব heading/description/items (icon+title+description
    // কার্ড) — top-level features array-এর থেকে আলাদা, ওটা এখনো OfferSection-এর
    // checklist-এর জন্য ব্যবহৃত হয় ---
    benefits: { type: BenefitsSchema, default: () => ({ items: [] }) },
    testimonials: { type: [TestimonialSchema], default: [] },
    faqs: { type: [FaqSchema], default: [] },
    // --- TrustSection-এর ট্রাস্ট ভিজ্যুয়াল এবং কাস্টমার-রিভিউ স্ক্রিনশট — সম্পূর্ণ
    // আলাদা দুটি ইমেজ ফিল্ড, একটা আরেকটার fallback হিসেবে ব্যবহৃত হবে না ---
    reviewImages: { type: [String], default: [] },
    // trustImage: { type: String, default: "" },
    // reviewImage: { type: String, default: "" },
    // --- ব্যবহারবিধি ধাপে ধাপে (UsageGuideSection) — না থাকলে ফাঁকা array,
    // ফ্রন্টএন্ড crash করবে না ---
    usageProcess: { type: [UsageStepSchema], default: [] },
    whatsappNumber: { type: String, default: "" },
    // --- WhatsApp থেকে আলাদা Call ও IMO নম্বর — কোনোটা খালি থাকলে সেই
    // corresponding বাটন ফ্রন্টএন্ডে হাইড হয়ে যাবে ---
    phoneNumber: { type: String, default: "" },
    imoNumber: { type: String, default: "" },
    // ডেলিভারি চার্জ ফ্রি নাকি আলাদা — TRUE হলে backend/order calculation-এ delivery charge
    // সবসময় 0 (নিচের deliveryChargeInsideDhaka/OutsideDhaka-এ পুরনো ভ্যালু থাকলেও ব্যবহৃত হবে না,
    // দেখুন publicLandingController.js-এর submitPublicOrder)।
    // --- লিগ্যাসি/ডিফল্ট ফিল্ড — নিচের productTypes খালি থাকলেই শুধু এগুলো ব্যবহৃত হয়
    // (পুরনো ল্যান্ডিং পেজ ভাঙবে না)। productTypes-এ এন্ট্রি থাকলে প্রতিটা টাইপের
    // নিজস্ব price/freeDelivery/charge ব্যবহৃত হয়, এই top-level ফিল্ডগুলো তখন আর
    // ব্যবহৃত হয় না। ---
    freeDelivery: { type: Boolean, default: true },
    // ঢাকার ভেতরে/বাইরে আলাদা ডেলিভারি চার্জ দেখানোর জন্য (শুধু তথ্য দেখানো, courier booking-এর হিসাব থেকে আলাদা)
    deliveryChargeInsideDhaka: { type: Number, default: 70 },
    deliveryChargeOutsideDhaka: { type: Number, default: 130 },
    // --- নতুন: প্রোডাক্ট টাইপ/প্যাকেজ ভিত্তিক প্রাইসিং + ডেলিভারি (দেখুন ProductTypeSchema-এর কমেন্ট) ---
    productTypes: { type: [ProductTypeSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LandingPage", LandingPageSchema);