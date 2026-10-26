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
// ⚠️ এটাও এখন কখনো throw করে না: ব্যর্থ হলে { phone, error: { state, message, code } } ফেরত দেয়,
// যাতে একটা API ফেল করলে বাকি API-র রেজাল্ট সেভ হয় আর ফ্রন্টএন্ডে ওই API-র এরর দেখা যায়।
async function fetchBdCourierForPhone(phone) {
  let engNum = String(phone ?? "");
  try {
    engNum = convertNumber(phone);
  } catch (err) {
    return failure(engNum, "internal_error", `নম্বর কনভার্ট করা যায়নি: ${shorten(err.message)}`);
  }

  if (!BDCOURIER_SECRET_KEY) {
    console.warn(`bdcourier skipped [${engNum}]: BDCOURIER_SECRET_KEY সেট নেই`);
    return failure(engNum, "not_called", "API কল করা হয়নি — BDCOURIER_SECRET_KEY সেট নেই");
  }

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

    // HTTP এরর এসেছে (401/403/429/5xx...) — সার্ভারের message সহ দেখাই (যেমন 429: limit শেষ)
    if (err.response) {
      const serverMsg = err.response.data?.message || err.response.data?.error;
      return failure(
        engNum,
        "api_error",
        `API error: HTTP ${err.response.status}${typeof serverMsg === "string" ? ` — ${shorten(serverMsg, 60)}` : ""}`,
        err.response.status,
      );
    }

    // কোনো রেসপন্স আসেনি (timeout / নেটওয়ার্ক / DNS)
    return failure(
      engNum,
      "no_response",
      `API কল হয়েছে, রেসপন্স পাইনি (${shorten(err.code || err.message, 30)})`,
      err.code ? shorten(err.code, 20) : null,
    );
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
    return failure(engNum, "bad_response", "রেসপন্সের ফরম্যাট সঠিক নয়");
  }

  const success = Number(summary.success_parcel);
  const cancel = Number(summary.cancelled_parcel);
  if (Number.isNaN(success) || Number.isNaN(cancel)) {
    console.error(`bdcourier non-numeric summary [${engNum}]:`, JSON.stringify(summary));
    return failure(engNum, "bad_response", "রেসপন্সে সংখ্যা সঠিক নয়");
  }

  // console.log(`bdcourier OK [${engNum}]: success=${success}, cancel=${cancel}`);
  return { phone: engNum, success, cancel };
}

// --- ছোট হেল্পার: এরর টেক্সট ছোট করা (নতুন লাইন/ট্যাগ বাদ, সর্বোচ্চ n অক্ষর) ---
function shorten(value, max = 60) {
  const text = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// --- Steadfast ব্যর্থ হলে সারির ডেটা: state = not_called | no_response | api_error | bad_response | internal_error ---
// code = ফ্রন্টএন্ডের ট্যাগে বড় করে দেখানোর এরর কোড (HTTP স্ট্যাটাস যেমন 500, বা নেটওয়ার্ক কোড যেমন ECONNABORTED); না থাকলে null
function failure(phone, state, message, code = null) {
  return { phone, error: { state, message, code } };
}

// --- Steadfast Fraud Check API (GET /fraud_check/score/{phone}) ---
// এটা আর "নীরব" প্রোভাইডার না: কখনো throw করে না ঠিকই (তাই Steadfast-এর সমস্যায় BD Courier-এর রেজাল্ট
// সেভ হওয়া আটকায় না), কিন্তু ব্যর্থ হলে/কল না হলে { phone, error: { state, message } } ফেরত দেয় —
// যেটা হিস্ট্রি ড্রপডাউনে সারি হিসেবে দেখায় (কল হয়নি / রেসপন্স পাইনি / API error)।
// ⚠️ ডকুমেন্টেশন অনুযায়ী null মানে "জানা নেই" (০ বা পরিষ্কার রেকর্ড না) — তাই null null-ই রাখা হয়:
//   - delivery_ratio / cancellation_ratio: যে নম্বরের কোনো পার্সেল শেষ হয়নি তার জন্য null
//   - delivered_count / cancelled_count: শুধু নিয়মিত বুকিং করলে আসে, নাহলে null ("দেখানো হচ্ছে না")
async function fetchSteadfastForPhone(phone) {
  const orNull = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

  let engNum = String(phone ?? "");
  try {
    engNum = convertNumber(phone);
  } catch (err) {
    return failure(engNum, "internal_error", `নম্বর কনভার্ট করা যায়নি: ${shorten(err.message)}`);
  }

  // ⚠️ আগে এখানে চুপচাপ null রিটার্ন হতো — এখন কারণসহ "কল করা হয়নি" ফেরত যায়, যাতে হিস্ট্রিতে দেখা যায়।
  // (শুধু কোন কোন env নেই তার নাম বলা হয়, মান কখনো না)
  const missing = [
    ["STEADFAST_API_URL", STEADFAST_API_URL],
    ["STEADFAST_API_KEY", STEADFAST_API_KEY],
    ["STEADFAST_SECRET_KEY", STEADFAST_SECRET_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    console.warn(`steadfast fraud check skipped [${engNum}]: env নেই → ${missing.join(", ")}`);
    return failure(engNum, "not_called", `API কল করা হয়নি — ${missing.join(", ")} সেট নেই`);
  }

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
      return failure(
        engNum,
        "bad_response",
        d ? `রেসপন্স সঠিক নয় (status: ${shorten(d.status, 20)})` : "রেসপন্স খালি এসেছে",
        d && d.status !== undefined ? shorten(d.status, 12) : null,
      );
    }

    // console.log(`steadfast fraud check OK [${engNum}]`);
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

    // API থেকে HTTP এরর এসেছে (401/403/404/429/5xx...) → কল হয়েছে, এরর রেসপন্স পেয়েছি
    if (err.response) {
      const serverMsg = err.response.data?.message || err.response.data?.error;
      return failure(
        engNum,
        "api_error",
        `API error: HTTP ${err.response.status}${typeof serverMsg === "string" ? ` — ${shorten(serverMsg, 40)}` : ""}`,
        err.response.status,
      );
    }

    // রিকোয়েস্ট গেছে কিন্তু কোনো রেসপন্স আসেনি (timeout / নেটওয়ার্ক / DNS / IPv6)
    return failure(
      engNum,
      "no_response",
      `API কল হয়েছে, রেসপন্স পাইনি (${shorten(err.code || err.message, 30)})`,
      err.code ? shorten(err.code, 20) : null,
    );
  }
}

// --- যেকোনো প্রোভাইডার ফাংশন হঠাৎ throw করলেও যেন পুরো রিকোয়েস্ট না ভাঙে ---
async function safeCall(fn, phone) {
  try {
    return await fn(phone);
  } catch (err) {
    console.error(`courier provider unexpected error [${phone}]:`, err);
    return failure(String(phone ?? ""), "internal_error", `অপ্রত্যাশিত সমস্যা: ${shorten(err.message)}`);
  }
}

/**
 * একাধিক ফোন নম্বরের হিস্ট্রি রিটার্ন করে — কখনো throw করে না।
 *  - success/cancel: শুধু BD Courier-এর যোগফল (order.courierHistory.all, কার্ডের "All x/y" পিল)।
 *    ⚠️ Steadfast যোগ হয় না — BD Courier নিজেই একাধিক কুরিয়ারের ডেটা মেলায়, যোগ করলে ডাবল গোনা হতো।
 *    BD Courier (কোনো একটা নম্বরেও) ফেল করলে success/cancel = null — জিরো সেভ হয় না, আংশিক যোগফলও না।
 *    কলার null দেখলে "All" পিলে ⚠ দেখায় (ফ্রন্টএন্ড) আর পরে Retry করা যায়।
 *  - providers: প্রতিটা API-র আলাদা রেজাল্ট বা এরর (ড্রপডাউনে সারি) — order.courierHistory.providers-এ সেভ হয়।
 * নতুন প্রোভাইডার যোগ করতে PROVIDERS অ্যারেতে একটা এন্ট্রি দিলেই হবে।
 * @param {string[]} phones
 * @returns {Promise<{success: number|null, cancel: number|null, providers: object[]}>}
 */
const PROVIDERS = [
  { key: "bdcourier", label: "BD Courier", fetch: fetchBdCourierForPhone, aggregate: true },
  { key: "steadfast", label: "Steadfast", fetch: fetchSteadfastForPhone, aggregate: false },
];

async function fetchCourierHistorySummary(phones) {
  const total = { success: 0, cancel: 0, providers: [] };
  if (!Array.isArray(phones) || phones.length === 0) return total;

  const allResults = await Promise.all(
    PROVIDERS.map((p) => Promise.all(phones.map((phone) => safeCall(p.fetch, phone)))),
  );

  PROVIDERS.forEach((provider, i) => {
    const results = allResults[i];

    // "All x/y" শুধু aggregate=true প্রোভাইডার (BD Courier) থেকে
    if (provider.aggregate) {
      const failed = results.find((r) => r.error);
      if (failed) {
        // ফেল → জিরো নয়, null; এরর সারিতে দেখাবে
        total.success = null;
        total.cancel = null;
        total.providers.push({
          key: provider.key,
          label: provider.label,
          success: null,
          cancel: null,
          meta: { error: failed.error },
        });
        return;
      }
      const success = results.reduce((sum, r) => sum + r.success, 0);
      const cancel = results.reduce((sum, r) => sum + r.cancel, 0);
      total.success = success;
      total.cancel = cancel;
      total.providers.push({ key: provider.key, label: provider.label, success, cancel });
      return;
    }

    // বাকি প্রোভাইডার: প্রতিটা ফলাফলের একটা করে সারি (সফল/ব্যর্থ সবই দেখায়)
    const multi = results.length > 1; // একাধিক ফোন হলে সারির নামে নম্বর যোগ হয়
    for (const r of results) {
      const key = multi ? `${provider.key}-${r.phone}` : provider.key;
      const label = multi ? `${provider.label} (${r.phone})` : provider.label;
      if (r.error) {
        total.providers.push({ key, label, success: null, cancel: null, meta: { error: r.error } });
      } else {
        total.providers.push({ key, label, success: r.success, cancel: r.cancel, meta: r.meta });
      }
    }
  });

  return total;
}

module.exports = { fetchCourierHistorySummary };