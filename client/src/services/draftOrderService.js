import api from "./api";

const BASE = "/api/orders/drafts";

// --- ইনকমপ্লিট (ড্রাফট) অর্ডার — কাস্টমার ল্যান্ডিং পেজের ফর্ম পূরণ করেছে কিন্তু
// এখনো সাবমিট করেনি। সাবমিট করলে এটা ব্যাকএন্ডে অটোমেটিক "completed" হয়ে যায়
// এবং আসল অর্ডার আলাদাভাবে তৈরি হয়। এডমিন চাইলে এখান থেকেই ম্যানুয়ালি এডিট করে বা
// সরাসরি convert() কল করে Pending queue-তে পাঠাতেও পারে (কাস্টমারকে কল করে
// কনফার্ম করার পর) — এতে Meta Pixel attribution ডেটা (fbp/fbc ইত্যাদি) বজায় থাকে।
export const draftOrderService = {
  getAll: () => api.get(BASE),

  // ড্রাফটটা ডাটাবেজ থেকে সম্পূর্ণ ডিলিট করে দেয় (ম্যানুয়ালি লিস্ট থেকে বাদ দেওয়ার জন্য)
  remove: (draftId) => api.delete(`${BASE}/${draftId}`),

  // এডমিন ড্রাফটের তথ্য এডিট করে সেভ করে (কনভার্ট না করেই)
  update: (draftId, data) => api.patch(`${BASE}/${draftId}`, data),

  // এই ড্রাফটকে আসল Order-এ (Pending queue) কনভার্ট করে — চাইলে body-তে এডিট করা
  // ভ্যালু দেওয়া যায়, না দিলে draft-এ যা সেভ আছে তাই ব্যবহার হবে
  convert: (draftId, data = {}) => api.post(`${BASE}/${draftId}/convert`, data),
};