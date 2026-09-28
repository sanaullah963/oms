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

  let bdRes;
  try {
    bdRes = await axios.post(
      "https://bdcourier.com/api/courier-check",
      { phone: engNum },
      {
        headers: { Authorization: `Bearer ${BDCOURIER_SECRET_KEY}` },
        timeout: 15000, // হ্যাং হয়ে থাকা রিকোয়েস্ট আটকাতে
      },
    );
  } catch (err) {
    console.error(
      `bdcourier API error [${engNum}]:`,
      err.response?.status,
      err.response?.data || err.message,
    );
    // ⚠️ জিরো রিটার্ন করা যাবে না — এরর throw হলে কলার DB-তে কিছু সেভ করবে না
    throw new Error("BDCOURIER_REQUEST_FAILED");
  }

  const summary = bdRes?.data?.courierData?.summary;
  if (
    !summary ||
    summary.success_parcel == null ||
    summary.cancelled_parcel == null
  ) {
    console.error(
      `bdcourier unexpected response [${engNum}]:`,
      JSON.stringify(bdRes?.data),
    );
    throw new Error("BDCOURIER_INVALID_RESPONSE");
  }

  const success = Number(summary.success_parcel);
  const cancel = Number(summary.cancelled_parcel);
  if (Number.isNaN(success) || Number.isNaN(cancel)) {
    console.error(`bdcourier non-numeric summary [${engNum}]:`, JSON.stringify(summary));
    throw new Error("BDCOURIER_INVALID_RESPONSE");
  }

  console.log(`bdcourier OK [${engNum}]: success=${success}, cancel=${cancel}`);
  return { success, cancel };
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