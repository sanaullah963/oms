const axios = require("axios");
const crypto = require("crypto");
const EventLog = require("../models/EventLog");
const {
  META_PIXEL_ID,
  META_CAPI_ACCESS_TOKEN,
  META_GRAPH_API_VERSION,
  META_TEST_EVENT_CODE,
} = require("../config/env");

// --- Meta-র নিয়ম অনুযায়ী PII (ফোন/ইমেইল) হ্যাশ করা (lowercase + trim + SHA-256) ---
function hashPII(value) {
  if (!value) return null;
  const normalized = value.toString().trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

// --- বাংলাদেশি ফোন নম্বরকে E.164 ফরম্যাটে (দেশের কোডসহ, + ছাড়া) নিয়ে আসা, তারপর হ্যাশ করা ---
function hashPhone(phone) {
  if (!phone) return null;
  const digitsOnly = phone.toString().replace(/\D/g, "");
  const withCountryCode = digitsOnly.startsWith("880")
    ? digitsOnly
    : digitsOnly.startsWith("0")
      ? `88${digitsOnly}`
      : `880${digitsOnly}`;
  return hashPII(withCountryCode);
}

/**
 * একটা ইউনিক eventId তৈরি করে — এটাই dedup key (ব্রাউজার Pixel-এ ভবিষ্যতে একই
 * eventId ব্যবহার করলে Meta দুইবার গোনা থেকে বিরত থাকবে)।
 */
function generateEventId(prefix = "evt") {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

/**
 * Meta Conversion API-তে একটা ইভেন্ট পাঠায় এবং EventLog-এ সংরক্ষণ করে।
 * এই ফাংশন কখনো throw করে না — ব্যর্থ হলেও কলিং কোড (যেমন অর্ডার কনফার্ম করা) যেন
 * কখনো ভেঙে না যায়, শুধু EventLog-এ status: "failed" হিসেবে সেভ থাকবে (পরে retry করা যাবে)।
 *
 * @param {object} params
 * @param {"Purchase"|"Lead"|"InitiateCheckout"|"ViewContent"|"PageView"} params.eventName
 * @param {string} [params.eventId] - না দিলে স্বয়ংক্রিয়ভাবে তৈরি হবে
 * @param {string} [params.orderId] - সংশ্লিষ্ট Order-এর _id (থাকলে)
 * @param {string} [params.sessionId]
 * @param {string} [params.eventSourceUrl]
 * @param {object} [params.userData] - { phone, email, ip, userAgent, fbc, fbp }
 * @param {object} [params.customData] - { value, currency, contentName, contentIds, numItems }
 */
async function sendCapiEvent({
  eventName,
  eventId,
  orderId,
  sessionId,
  eventSourceUrl,
  userData = {},
  customData = {},
}) {
  const finalEventId = eventId || generateEventId(eventName.toLowerCase());

  if (!META_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) {
    await EventLog.create({
      eventName,
      eventId: finalEventId,
      order: orderId || null,
      sessionId: sessionId || null,
      status: "failed",
      errorMessage: "META_PIXEL_ID/META_CAPI_ACCESS_TOKEN .env-এ সেট করা নেই।",
    });
    console.warn(`⚠️ Meta CAPI event "${eventName}" পাঠানো যায়নি — কী সেট করা নেই।`);
    return { success: false, eventId: finalEventId };
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: finalEventId,
        event_source_url: eventSourceUrl || undefined,
        action_source: "website",
        user_data: {
          ph: userData.phone ? [hashPhone(userData.phone)] : undefined,
          em: userData.email ? [hashPII(userData.email)] : undefined,
          client_ip_address: userData.ip || undefined,
          client_user_agent: userData.userAgent || undefined,
          fbc: userData.fbc || undefined,
          fbp: userData.fbp || undefined,
        },
        custom_data: {
          currency: customData.currency || "BDT",
          value: customData.value,
          content_name: customData.contentName,
          content_ids: customData.contentIds,
          num_items: customData.numItems,
        },
      },
    ],
    ...(META_TEST_EVENT_CODE ? { test_event_code: META_TEST_EVENT_CODE } : {}),
  };

  // --- undefined ভ্যালিউগুলো পরিষ্কার করা (Meta খালি ফিল্ড পছন্দ করে না) ---
  const cleanedData = payload.data[0];
  Object.keys(cleanedData.user_data).forEach((k) => {
    if (cleanedData.user_data[k] === undefined) delete cleanedData.user_data[k];
  });
  Object.keys(cleanedData.custom_data).forEach((k) => {
    if (cleanedData.custom_data[k] === undefined) delete cleanedData.custom_data[k];
  });
  if (!cleanedData.event_source_url) delete cleanedData.event_source_url;

  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_PIXEL_ID}/events`;

  try {
    const response = await axios.post(url, payload, {
      params: { access_token: META_CAPI_ACCESS_TOKEN },
    });

    await EventLog.create({
      eventName,
      eventId: finalEventId,
      order: orderId || null,
      sessionId: sessionId || null,
      source: "capi",
      payload,
      metaResponse: response.data,
      status: "sent",
      lastAttemptAt: new Date(),
    });

    return { success: true, eventId: finalEventId, response: response.data };
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error(`❌ Meta CAPI event "${eventName}" পাঠাতে ব্যর্থ:`, errorMessage);

    await EventLog.create({
      eventName,
      eventId: finalEventId,
      order: orderId || null,
      sessionId: sessionId || null,
      source: "capi",
      payload,
      metaResponse: error.response?.data || null,
      status: "failed",
      errorMessage,
      lastAttemptAt: new Date(),
    });

    return { success: false, eventId: finalEventId, error: errorMessage };
  }
}

/**
 * একটা ব্যর্থ (failed) ইভেন্ট পুনরায় পাঠায় — আগে যেই payload তৈরি হয়েছিল সেটাই আবার
 * Meta-তে পাঠানো হয় (নতুন করে হ্যাশ/তৈরি করা হয় না, তাই একদম একই ডেটা যায়)।
 */
async function retryEvent(eventLogId) {
  const log = await EventLog.findById(eventLogId);
  if (!log) {
    return { success: false, error: "এই ইভেন্ট লগ খুঁজে পাওয়া যায়নি।" };
  }
  if (!log.payload) {
    return { success: false, error: "এই ইভেন্টের কোনো payload সংরক্ষিত নেই, retry করা যাবে না।" };
  }
  if (!META_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) {
    return { success: false, error: "META_PIXEL_ID/META_CAPI_ACCESS_TOKEN .env-এ সেট করা নেই।" };
  }

  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_PIXEL_ID}/events`;

  try {
    const response = await axios.post(url, log.payload, {
      params: { access_token: META_CAPI_ACCESS_TOKEN },
    });

    log.status = "sent";
    log.metaResponse = response.data;
    log.errorMessage = null;
    log.retryCount += 1;
    log.lastAttemptAt = new Date();
    await log.save();

    return { success: true, response: response.data };
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;

    log.status = "failed";
    log.metaResponse = error.response?.data || null;
    log.errorMessage = errorMessage;
    log.retryCount += 1;
    log.lastAttemptAt = new Date();
    await log.save();

    return { success: false, error: errorMessage };
  }
}

module.exports = { sendCapiEvent, retryEvent, generateEventId, hashPII, hashPhone };