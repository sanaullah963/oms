const axios = require("axios");
const convertNumber = require("./convertNumber");
const {
  BDCOURIER_SECRET_KEY,
  STEADFAST_API_URL,
  STEADFAST_API_KEY,
  STEADFAST_SECRET_KEY,
} = require("../config/env");

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

// --- Steadfast Fraud Check API (GET /fraud_check/score/{phone}) ---
// এটা "ঐচ্ছিক" প্রোভাইডার: ফেল করলে/কী না থাকলে null রিটার্ন করে (কখনো throw করে না),
// তাই Steadfast-এর সমস্যায় BD Courier-এর রেজাল্ট সেভ হওয়া আটকায় না।
// ⚠️ ডকুমেন্টেশন অনুযায়ী null মানে "জানা নেই" (০ বা পরিষ্কার রেকর্ড না) — তাই null null-ই রাখা হয়:
//   - delivery_ratio / cancellation_ratio: যে নম্বরের কোনো পার্সেল শেষ হয়নি তার জন্য null
//   - delivered_count / cancelled_count: শুধু নিয়মিত বুকিং করলে আসে, নাহলে null ("দেখানো হচ্ছে না")
async function fetchSteadfastForPhone(phone) {
  if (!STEADFAST_API_URL || !STEADFAST_API_KEY || !STEADFAST_SECRET_KEY) return null;

  const engNum = convertNumber(phone);
  const orNull = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

  try {
    const res = await axios.get(
      `${STEADFAST_API_URL}/fraud_check/score/${encodeURIComponent(engNum)}`,
      {
        headers: {
          "Content-Type": "application/json",
          "Api-Key": STEADFAST_API_KEY,
          "Secret-Key": STEADFAST_SECRET_KEY,
        },
        timeout: 10000,
      },
    );

    const d = res?.data;
    if (!d || (d.status !== undefined && Number(d.status) !== 200)) {
      console.error(`steadfast fraud check unexpected response [${engNum}]:`, JSON.stringify(d));
      return null;
    }

    console.log(`steadfast fraud check OK [${engNum}]`);
    return {
      phone: engNum,
      success: orNull(d.delivered_count),
      cancel: orNull(d.cancelled_count),
      meta: {
        deliveryRatio: orNull(d.delivery_ratio),
        cancellationRatio: orNull(d.cancellation_ratio),
        volumeBand: d.volume_band ?? null,
        volumeRange: d.volume_range ?? null,
        totalReports: orNull(d.total_reports),
        fraudCategories: Array.isArray(d.fraud_categories) ? d.fraud_categories : [],
        doubtfulReports: d.doubtful_reports === true,
        score: orNull(d.score),
        level: d.level ?? null,
      },
    };
  } catch (err) {
    console.error(
      `steadfast fraud check error [${engNum}]:`,
      err.response?.status,
      err.response?.data || err.message,
    );
    return null;
  }
}

/**
 * একাধিক ফোন নম্বরের হিস্ট্রি রিটার্ন করে:
 *  - success/cancel: শুধু BD Courier-এর যোগফল — এটাই order.courierHistory.all (কার্ডের "All x/y" পিল)।
 *    ⚠️ Steadfast-এর সংখ্যা এতে যোগ করা হয় না — BD Courier নিজেই একাধিক কুরিয়ারের (সম্ভবত
 *    Steadfast-সহ) ডেটা মেলায়, যোগ করলে একই পার্সেল দুবার গোনা হতো।
 *  - providers: প্রতিটা API-র আলাদা রেজাল্ট (ড্রপডাউনে সারি হিসেবে দেখায়) —
 *    order.courierHistory.providers-এ সেভ হয়।
 * BD Courier ফেল করলে আগের মতোই throw করে (কিছু সেভ হয় না); Steadfast ফেল করলে শুধু তার সারি বাদ যায়।
 * @param {string[]} phones
 * @returns {Promise<{success: number, cancel: number, providers: object[]}>}
 */
async function fetchCourierHistorySummary(phones) {
  const total = { success: 0, cancel: 0, providers: [] };
  if (!Array.isArray(phones) || phones.length === 0) return total;

  const [bdResults, steadfastResults] = await Promise.all([
    Promise.all(phones.map((phone) => fetchBdCourierForPhone(phone))),
    Promise.all(phones.map((phone) => fetchSteadfastForPhone(phone))), // কখনো reject হয় না
    // note: নতুন প্রোভাইডার যোগ হলে এখানে আরেকটা Promise.all যোগ করে নিচে providers-এ push করলেই হবে।
  ]);

  for (const result of bdResults) {
    total.success += result.success;
    total.cancel += result.cancel;
  }
  total.providers.push({
    key: "bdcourier",
    label: "BD Courier",
    success: total.success,
    cancel: total.cancel,
  });

  const steadfast = steadfastResults.filter(Boolean);
  for (const r of steadfast) {
    const multi = steadfast.length > 1; // একাধিক ফোন হলে সারির নামে নম্বর যোগ হয়
    total.providers.push({
      key: multi ? `steadfast-${r.phone}` : "steadfast",
      label: multi ? `Steadfast (${r.phone})` : "Steadfast",
      success: r.success,
      cancel: r.cancel,
      meta: r.meta,
    });
  }

  return total;
}

module.exports = { fetchCourierHistorySummary };
