const axios = require("axios");
const convertNumber = require("./convertNumber");
const { BDCOURIER_SECRET_KEY } = require("../config/env");

/**
 * --- কাস্টমারের "সব কুরিয়ার মিলিয়ে" হিস্ট্রি (success/cancel) বের করার জায়গা ---
 * বর্তমানে শুধু bdcourier.com API ব্যবহার হচ্ছে। ভবিষ্যতে আরো প্রোভাইডার (অন্য
 * এগ্রিগেটর/সরাসরি কুরিয়ার API) যোগ হলে সেগুলোও এই ফাইলেই আলাদা ফাংশন হিসেবে
 * থাকবে, আর নিচের fetchCourierHistorySummary() সবগুলো মিলিয়ে যোগ করে একটাই
 * {success, cancel} রিটার্ন করবে — যাতে orderController.js-এর (single বা bulk)
 * কোনো কলার-কোড বদলাতে না হয়, শুধু এই ফাইলেই নতুন প্রোভাইডার যোগ করলেই চলবে।
 */

// --- bdcourier.com দিয়ে একটা ফোন নম্বরের success/cancel count আনা ---
async function fetchBdCourierForPhone(phone) {
  const engNum = convertNumber(phone);
  const bdRes = await axios
    .post(
      "https://bdcourier.com/api/courier-check",
      { phone: engNum },
      { headers: { Authorization: `Bearer ${BDCOURIER_SECRET_KEY}` } },
    )
    .catch((err) => {
      console.error("bdcourier API error:", err.message);
      return null;
    });

  return {
    success: bdRes?.data?.courierData?.summary?.success_parcel || 0,
    cancel: bdRes?.data?.courierData?.summary?.cancelled_parcel || 0,
  };
}

/**
 * একাধিক ফোন নম্বরের (একই কাস্টমারের একাধিক নম্বর থাকতে পারে) সব প্রোভাইডার মিলিয়ে
 * মোট success/cancel count রিটার্ন করে।
 * @param {string[]} phones
 * @returns {Promise<{success: number, cancel: number}>}
 */
async function fetchCourierHistorySummary(phones) {
  const total = { success: 0, cancel: 0 };
  if (!Array.isArray(phones) || phones.length === 0) return total;

  const perPhoneResults = await Promise.all(
    phones.map((phone) => fetchBdCourierForPhone(phone)),
    // note: নতুন প্রোভাইডার যোগ হলে এখানে Promise.all([fetchBdCourierForPhone(phone), fetchOtherProviderForPhone(phone)])
    // করে দুটো রেজাল্ট মার্জ করলেই হবে — বাইরের ফাংশন সিগনেচার একই থাকবে।
  );

  for (const result of perPhoneResults) {
    total.success += result.success;
    total.cancel += result.cancel;
  }

  return total;
}

module.exports = { fetchCourierHistorySummary };