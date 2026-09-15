/**
 * --- Order.activities-এ এন্ট্রি যোগ করার জন্য একমাত্র কমন জায়গা ---
 * আগে প্রজেক্টের অনেক জায়গায় আলাদাভাবে { type, description, author, ... } অবজেক্ট
 * বানিয়ে activities.push() বা $push করা হতো — ফলে কোথাও author বাদ পড়ে যেত (ডিফল্ট
 * "User" থেকে যেত), কোথাও ভুল ফিল্ড নামে (যেমন "actor") সেট হতো যেটা স্কিমায় নেই বলে
 * সাইলেন্টলি হারিয়ে যেত। এখন থেকে যেকোনো জায়গায় নতুন অ্যাক্টিভিটি লাগলে এই ফাইলের
 * ফাংশন ব্যবহার করো — শেপ সবসময় ঠিক থাকবে, আর ভবিষ্যতে ফিল্ড বাড়ালে/বদলালে একটাই
 * জায়গায় এডিট করলেই হবে।
 */

/**
 * একটা অ্যাক্টিভিটি অবজেক্ট বানায় (Order মডেলের ActivitySchema অনুযায়ী)।
 * `Order.create()`-এর ভেতরে বা `$push` কুয়েরিতে সরাসরি বসানো যায়, অথবা
 * নিচের logActivity() এর মাধ্যমে লোড করা ডকুমেন্টে যোগ করা যায়।
 *
 * @param {Object} params
 * @param {string} params.type - অ্যাক্টিভিটির ধরন, যেমন "Status Updated", "Order Created"
 * @param {string} params.description - টাইমলাইনে দেখানোর মূল টেক্সট
 * @param {string} [params.author] - কে করেছে (না দিলে স্কিমার ডিফল্ট "User" বসবে —
 *   তাই মানুষের করা যেকোনো অ্যাকশনে সবসময় req.user?.name / socket.user?.name দাও;
 *   সিস্টেম/কুরিয়ার-অটোমেটেড অ্যাকশনে "System" বা "Steadfast" এর মতো লেবেল দাও)
 * @param {Object} [params.details] - প্রয়োজনে আগে/পরের মান বা অন্য এক্সট্রা ডেটা (JSON)
 * @returns {Object} plain activity object
 */
function buildActivity({ type, description, author, details }) {
  const activity = { type, description, timestamp: new Date() };
  if (author) activity.author = author;
  if (details) activity.details = details;
  return activity;
}

/**
 * ইতিমধ্যে লোড করা একটা Order ডকুমেন্টে অ্যাক্টিভিটি যোগ করে।
 * ডিফল্টভাবে সাথে সাথে save() করে ফেলে। একই সাথে অর্ডারের অন্য ফিল্ডও (orderStatus,
 * totalCOD ইত্যাদি) বদলাতে হলে save: false দিয়ে কল করো, পরে নিজে একবারে order.save() করো।
 *
 * @param {import("mongoose").Document} order - লোড করা Order ডকুমেন্ট
 * @param {Object} params - buildActivity()-এর মতোই { type, description, author, details }
 * @param {Object} [options]
 * @param {boolean} [options.save=true]
 * @returns {Promise<import("mongoose").Document>} সেভ হওয়া (বা না হওয়া) অর্ডার
 */
async function logActivity(order, params, { save = true } = {}) {
  order.activities.push(buildActivity(params));
  if (save) await order.save();
  return order;
}

module.exports = { buildActivity, logActivity };