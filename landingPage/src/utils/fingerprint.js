// --- ব্রাউজার ফিঙ্গারপ্রিন্ট: canvas/WebGL রেন্ডারিং + কিছু navigator প্রোপার্টি একসাথে
// করে SHA-256 হ্যাশ বানানো হয়। এটা কুকি/localStorage-এর মতো ইউজার ডিলিট করতে পারে না,
// তাই একই ডিভাইস/ব্রাউজার থেকে ভিন্ন ফোন নম্বর দিয়ে বারবার অর্ডার করা ধরার জন্য কাজে লাগে।
// শুধু ফ্রড ডিটেকশনের জন্য ব্যবহৃত — ব্যক্তিগত কোনো তথ্য সংগ্রহ করা হয় না। ---

let cachedHashPromise = null;

function getCanvasFingerprint() {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    canvas.width = 220;
    canvas.height = 30;
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 100, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("fp-anardana-🔒", 2, 2);
    ctx.fillStyle = "rgba(102, 200, 0, 0.7)";
    ctx.fillText("fp-anardana-🔒", 4, 8);
    return canvas.toDataURL();
  } catch (err) {
    return "";
  }
}

function getWebglFingerprint() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "";
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "";
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "";
    return `${vendor}~${renderer}`;
  } catch (err) {
    return "";
  }
}

function getRawFingerprintComponents() {
  if (typeof window === "undefined") return "";
  const nav = window.navigator;
  const scr = window.screen;

  const components = [
    nav.userAgent,
    nav.language,
    (nav.languages || []).join(","),
    nav.platform,
    nav.hardwareConcurrency,
    nav.deviceMemory,
    scr.width,
    scr.height,
    scr.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    getCanvasFingerprint(),
    getWebglFingerprint(),
  ];

  return components.join("|||");
}

async function sha256Hex(text) {
  if (typeof window === "undefined" || !window.crypto?.subtle) return null;
  const data = new TextEncoder().encode(text);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * ব্রাউজার ফিঙ্গারপ্রিন্ট হ্যাশ রিটার্ন করে (একবার হিসাব হলে ট্যাব চলাকালীন cache থাকে)।
 * @returns {Promise<string|null>}
 */
export function getFingerprintHash() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!cachedHashPromise) {
    cachedHashPromise = sha256Hex(getRawFingerprintComponents()).catch(() => null);
  }
  return cachedHashPromise;
}
