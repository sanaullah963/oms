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

const LandingPageSchema = new mongoose.Schema(
  {
    // URL-এ ব্যবহৃত হবে: yoursite.com/{slug}
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    productName: { type: String, required: true },
    // এই কোডটাই অর্ডারের productCode ও orderSource হিসেবে ব্যবহৃত হবে (কোন পেজ থেকে অর্ডার এসেছে বোঝার জন্য)
    productCode: { type: String, required: true, trim: true },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    images: { type: [String], default: [] },
    price: { type: Number, required: true },
    originalPrice: { type: Number, default: null }, // থাকলে কাটা দাগ দিয়ে দেখানো হবে
    features: { type: [String], default: [] },
    testimonials: { type: [TestimonialSchema], default: [] },
    faqs: { type: [FaqSchema], default: [] },
    whatsappNumber: { type: String, default: "" },
    // ঢাকার ভেতরে/বাইরে আলাদা ডেলিভারি চার্জ দেখানোর জন্য (শুধু তথ্য দেখানো, courier booking-এর হিসাব থেকে আলাদা)
    deliveryChargeInsideDhaka: { type: Number, default: 70 },
    deliveryChargeOutsideDhaka: { type: Number, default: 130 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LandingPage", LandingPageSchema);