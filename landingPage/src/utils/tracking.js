import { API_URL } from "@/services/api";
import { getFingerprintHash } from "@/utils/fingerprint";
const VISITOR_KEY = "oms_visitor_id";
const SESSION_KEY = "oms_session_id";
const ATTRIBUTION_KEY = "oms_attribution";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// --- visitorId: একই ব্রাউজারে চিরস্থায়ী (return visitor শনাক্ত করার জন্য) ---
export function getOrCreateVisitorId() {
  if (typeof window === "undefined") return null;
  let visitorId = window.localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = generateId("visitor");
    window.localStorage.setItem(VISITOR_KEY, visitorId);
  }
  return visitorId;
}

// --- sessionId: এই ট্যাব/ভিজিটের জন্য (ব্রাউজার/ট্যাব বন্ধ করলে sessionStorage-এর নিয়মেই মুছে যায়) ---
export function getOrCreateSessionId() {
  if (typeof window === "undefined") return null;
  let sessionId = window.sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateId("sess");
    window.sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * পেজ লোড হওয়ার সময় URL থেকে UTM/fbclid/gclid/referrer ধরে localStorage-এ
 * সেভ করে রাখে (first-touch attribution — পরে অন্য পেজে ঘুরলেও হারায় না)।
 */
export function captureAttributionOnLoad() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const hasNewParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "fbclid",
    "gclid",
  ].some((k) => params.has(k));

  const existing = window.localStorage.getItem(ATTRIBUTION_KEY);
  if (existing && !hasNewParams) return;

  const attribution = {
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
    utmTerm: params.get("utm_term") || undefined,
    utmContent: params.get("utm_content") || undefined,
    fbclid: params.get("fbclid") || undefined,
    gclid: params.get("gclid") || undefined,
    referrer: document.referrer || undefined,
    capturedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
}

function getStoredAttribution() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || "{}");
  } catch (err) {
    return {};
  }
}

export function getTrackingPayload(slug) {
  if (typeof window === "undefined") return {};
  return {
    sessionId: getOrCreateSessionId(),
    visitorId: getOrCreateVisitorId(),
    landingPageSlug: slug,
    fbp: getCookie("_fbp") || undefined,
    fbc: getCookie("_fbc") || undefined,
    ...getStoredAttribution(),
  };
}

export async function getTrackingPayloadWithFingerprint(slug) {
  const base = getTrackingPayload(slug);
  const fingerprintHash = await getFingerprintHash();
  return { ...base, fingerprintHash: fingerprintHash || undefined };
}

// ============================================================
// --- এনগেজমেন্ট ট্র্যাকিং (scroll/click/focus/blur/visibility) ---
// ============================================================

/**
 * পেজে এনগেজমেন্ট মেট্রিক ট্র্যাক করা শুরু করে। সার্ভারে ডেটা যায় মোট দুইবার
 * (Render free tier-এর bandwidth/instance-hour বাঁচানোর জন্য প্রতি ১৫ সেকেন্ডের
 * heartbeat ইচ্ছাকৃতভাবে বাদ দেওয়া হয়েছে):
 *   ১. পেজ লোড হওয়ার সাথে সাথেই (entry — PageView সহ)
 *   ২. পেজ ছাড়ার সময় (exit — beforeunload/pagehide/tab-hidden/component-unmount,
 *      যেকোনো একটা যেটা আগে ট্রিগার হয় — চূড়ান্ত timeOnPageSeconds/scrollDepth/
 *      clickCount/isBounce এই কলেই হিসাব হয়ে সেভ হয়)
 * এর মাঝে কোনো periodic আপডেট নেই, তাই সেশন খুব বেশিক্ষণ (মিনিট দশেকের বেশি) খোলা
 * থাকলে এবং exit ইভেন্টগুলোর একটাও (ব্রাউজার/ডিভাইসের কোনো কারণে) না ফায়ার করলে,
 * সেই সেশনের timeOnPageSeconds ড্যাশবোর্ডে ভুলভাবে ~0 দেখাতে পারে — এইটা একটা
 * সচেতন trade-off (আগে heartbeat এই gap-টা কমিয়ে রাখত)।
 *
 * useEffect-এর ভেতর কল করে return করা cleanup ফাংশনটা unmount-এ কল করতে হবে।
 *
 * @param {string} slug
 * @returns {() => void} cleanup ফাংশন
 */
export function initEngagementTracking(slug) {
  if (typeof window === "undefined") return () => {};
  // console.log("initEngagementTracking", slug);
  const entryTime = Date.now();
  const metrics = {
    maxScrollDepth: 0,
    clickCount: 0,
    focusCount: 0,
    blurCount: 0,
    visibilityChangeCount: 0,
  };

  const getTimeOnPageSeconds = () =>
    Math.round((Date.now() - entryTime) / 1000);

  const sendUpdate = (isExiting = false) => {
    const payload = JSON.stringify({
      sessionId: getOrCreateSessionId(),
      visitorId: getOrCreateVisitorId(),
      landingPageSlug: slug,
      timeOnPageSeconds: getTimeOnPageSeconds(),
      ...metrics,
      isExiting,
      tracking: getTrackingPayload(slug),
    });

    const url = `${API_URL}/api/public/tracking/session`;

    // পেজ বন্ধ/hidden হওয়ার সময় sendBeacon বেশি নির্ভরযোগ্য (fetch অনেক সময় বাতিল হয়ে যায়)
    if (isExiting && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: isExiting,
      }).catch((err) => console.log(err));
    }
  };

  const handleScroll = () => {
    const scrollTop = window.scrollY;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const percent =
      docHeight > 0
        ? Math.min(100, Math.round((scrollTop / docHeight) * 100))
        : 0;
    if (percent > metrics.maxScrollDepth) metrics.maxScrollDepth = percent;
  };

  const handleClick = () => {
    metrics.clickCount += 1;
  };

  const handleFocus = () => {
    metrics.focusCount += 1;
  };

  const handleBlur = () => {
    metrics.blurCount += 1;
  };

  const handleVisibilityChange = () => {
    metrics.visibilityChangeCount += 1;
    if (document.visibilityState === "hidden") {
      sendUpdate(true); // ট্যাব সুইচ/মিনিমাইজ করলে exit হিসেবে ধরে নেওয়া হচ্ছে
    }
  };

  const handleBeforeUnload = () => {
    sendUpdate(true);
  };

  // --- heartbeat না থাকায় exit ইভেন্ট মিস হওয়া আগের চেয়ে বেশি গুরুত্বপূর্ণ, তাই
  // beforeunload/visibilitychange-এর পাশাপাশি pagehide-ও রাখা হচ্ছে — বিশেষত
  // iOS Safari-তে beforeunload প্রায়ই ফায়ার করে না, কিন্তু pagehide নির্ভরযোগ্য। ---
  let exitSent = false;
  const handlePageHide = () => {
    if (exitSent) return;
    exitSent = true;
    sendUpdate(true);
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("click", handleClick);
  window.addEventListener("focus", handleFocus);
  window.addEventListener("blur", handleBlur);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("pagehide", handlePageHide);

  sendUpdate(false); // পেজ লোড হওয়ার সাথে সাথেই একবার session/PageView কল যাবে — এরপর exit না হওয়া পর্যন্ত আর কোনো কল হবে না

  // --- cleanup (component unmount — যেমন client-side রাউট বদল) ---
  // ব্রাউজার hard-close/reload হলে beforeunload/pagehide নিজেরাই ফায়ার করবে
  // (React cleanup রান নাও হতে পারে), তাই ওইখানে ডাবল-সেন্ড এড়াতে exitSent flag ব্যবহার হচ্ছে।
  return () => {
    if (!exitSent) {
      exitSent = true;
      sendUpdate(true);
    }
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("click", handleClick);
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("blur", handleBlur);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("pagehide", handlePageHide);
  };
}

let draftDebounceTimer = null;

/**
 * ফর্মে টাইপ করার সময় কল করুন — ৮০০ms debounce করে সার্ভারে ড্রাফট সেভ করে।
 * ⚠️ কল করার আগে ফোন নম্বর ভ্যালিড কিনা নিজে চেক করে নেওয়া উচিত (OrderSection.jsx-এ
 * সেটাই করা হয়) — এই ফাংশন নিজে থেকে ভ্যালিডেশন করে না, কারণ নাম/ঠিকানার আংশিক
 * পরিবর্তনেও (ফোন অপরিবর্তিত/ইতিমধ্যে ভ্যালিড থাকা অবস্থায়) draft আপডেট করা দরকার হতে পারে।
 * @param {string} slug
 * @param {{name: string, phone: string, address: string, quantity: number}} formData
 */
export async function saveDraftOrder(slug, formData) {
  if (typeof window === "undefined") return;
  clearTimeout(draftDebounceTimer);
  draftDebounceTimer = setTimeout(async () => {
    // --- ফিঙ্গারপ্রিন্ট হ্যাশ গণনা কিছুটা ভারী, তাই আগে প্রতিটা কিস্ট্রোকেই এটা বাদ
    // দেওয়া হতো। এখন যেহেতু কলটাই শুধু ভ্যালিড ফোন নম্বরে (কম ঘন ঘন) হচ্ছে, সব
    // available তথ্য (fingerprintHash সহ) পাঠানো নিরাপদ ---
    const tracking = await getTrackingPayloadWithFingerprint(slug);
    fetch(`${API_URL}/api/public/tracking/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getOrCreateSessionId(),
        visitorId: getOrCreateVisitorId(),
        landingPageSlug: slug,
        ...formData,
        tracking,
      }),
    }).catch(() => {});
  }, 800);
}