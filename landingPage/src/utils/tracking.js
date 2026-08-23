import { API_URL } from "@/services/api";
import { getFingerprintHash } from "@/utils/fingerprint";
const VISITOR_KEY = "oms_visitor_id";
const SESSION_KEY = "oms_session_id";
const ATTRIBUTION_KEY = "oms_attribution";
const HEARTBEAT_MS = 15000; // প্রতি ১৫ সেকেন্ডে সার্ভারে আপডেট পাঠানো হবে

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
 * পেজে এনগেজমেন্ট মেট্রিক ট্র্যাক করা শুরু করে এবং পর্যায়ক্রমে (heartbeat) ও
 * পেজ ছাড়ার সময় সার্ভারে পাঠায়। useEffect-এর ভেতর কল করে return করা cleanup
 * ফাংশনটা unmount-এ কল করতে হবে।
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

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("click", handleClick);
  window.addEventListener("focus", handleFocus);
  window.addEventListener("blur", handleBlur);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);

  sendUpdate(false); // পেজ লোড হওয়ার সাথে সাথেই প্রথম session/PageView কল যাবে, ১৫ সেকেন্ড অপেক্ষা করবে না
  const heartbeat = setInterval(() => sendUpdate(false), HEARTBEAT_MS);

  // --- cleanup ---
  return () => {
    clearInterval(heartbeat);
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("click", handleClick);
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("blur", handleBlur);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}

let draftDebounceTimer = null;

/**
 * ফর্মে টাইপ করার সময় কল করুন — ৮০০ms debounce করে সার্ভারে ড্রাফট সেভ করে।
 * @param {string} slug
 * @param {{name: string, phone: string, address: string, quantity: number}} formData
 */
export function saveDraftOrder(slug, formData) {
  if (typeof window === "undefined") return;
  
  clearTimeout(draftDebounceTimer);
  draftDebounceTimer = setTimeout(() => {
    fetch(`${API_URL}/api/public/tracking/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getOrCreateSessionId(),
        landingPageSlug: slug,
        ...formData,
        tracking: getTrackingPayload(slug),
      }),
    }).catch(() => {});
  }, 800);
}
