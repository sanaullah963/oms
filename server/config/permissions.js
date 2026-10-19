// ============================================================================
// মডারেটর পারমিশন — সেন্ট্রাল রেজিস্ট্রি (Single Source of Truth)
// ============================================================================
// নতুন কোনো পারমিশন যোগ করতে চাইলে (যেমন কোনো নতুন URL/পেজ মডারেটরদের জন্য বন্ধ/খোলা রাখা):
//   ১. নিচের PERMISSION_LIST-এ একটা এন্ট্রি যোগ করুন (key, label, description, default)
//   ২. সার্ভার রুটে `requirePermission("<key>")` বসান   (middleware/permissions.js)
//      অথবা ডেটা-স্কোপ লাগলে utils/orderScope.js-এ একটা scope ফাংশন বানান
//   ৩. ক্লায়েন্টে `can("<key>")` দিয়ে UI দেখান/লুকান   (AuthContext)
// অ্যাডমিনের "ইউজার ম্যানেজমেন্ট" পেজের টগলগুলো এই লিস্ট থেকেই নিজে নিজে তৈরি হয় —
// ফ্রন্টএন্ডে আলাদা করে কিছু লিখতে হয় না।
//
// নিয়ম:
//  - admin সবসময় সব পারমিশন পায় (can() কখনো admin-কে আটকায় না)
//  - moderator-এর ক্ষেত্রে: অ্যাডমিন যেটা এক্সপ্লিসিটলি সেট করেছেন সেটাই, না করলে `default`
//  - key-তে ডট (.) ব্যবহার করা যাবে — ডেটাবেজে key গুলো অ্যারে-আইটেম হিসেবে থাকে, তাই Mongo-র
//    ডট-ইন-ফিল্ডনেম সমস্যা নেই
// ============================================================================

const PERMISSION_LIST = [
  {
    key: "orders.viewOthers",
    group: "অর্ডার",
    label: "অন্য মডারেটরের অর্ডার দেখতে পারবে",
    description:
      "বন্ধ থাকলে মডারেটর শুধু নিজের তৈরি অর্ডার (এবং ল্যান্ডিং পেজ থেকে আসা কারো-না-এমন অর্ডার) দেখবে। " +
      "চালু করলে সব মডারেটরের সব অর্ডার দেখতে ও (দেখা অর্ডারে) অ্যাকশন নিতে পারবে।",
    default: false,
  },
  {
    key: "courierNotes.viewAll",
    group: "কুরিয়ার নোট",
    label: "Steadfast কুরিয়ারের সব নোট দেখতে পারবে",
    description:
      "বন্ধ থাকলে \"নোট\" ও \"ট্র্যাকিং নোট\" পেজে শুধু নিজের অ্যাড করা পার্সেলের নোট আসবে। " +
      "চালু করলে সব পার্সেলের কুরিয়ার নোট দেখা ও সমাধান (Solve/Tracking OK) করা যাবে — " +
      "কিন্তু ওই পার্সেলের বাকি অর্ডার ডিটেইল/অন্য অ্যাকশন নয়।",
    default: false,
  },
  {
    key: "orders.viewLandingPage",
    group: "অর্ডার",
    label: "ল্যান্ডিং পেজ ও ইনকমপ্লিট থেকে আসা অর্ডার দেখতে পারবে",
    description:
      "বন্ধ থাকলে মডারেটর origin = landing_page এমন কোনো অর্ডার (সরাসরি ল্যান্ডিং পেজ সাবমিশন বা ইনকমপ্লিট থেকে কনভার্ট করা) " +
      "দেখতে/ধরতে পারবে না, \"ইনকমপ্লিট\" ট্যাবও বন্ধ থাকবে — শুধু নিজের তৈরি অর্ডার ও অন্য মালিকহীন (ম্যানুয়াল/ওয়েবহুক) অর্ডার দেখবে। " +
     "চালু থাকলে আগের মতোই শেয়ার্ড কিউ হিসেবে সব ল্যান্ডিং পেজ অর্ডার দেখবে। (ডিফল্ট: চালু)",
    default: true,
  },
];

const PERMISSION_KEYS = PERMISSION_LIST.map((p) => p.key);
const PERMISSION_BY_KEY = Object.fromEntries(PERMISSION_LIST.map((p) => [p.key, p]));

function isValidPermissionKey(key) {
  return Object.prototype.hasOwnProperty.call(PERMISSION_BY_KEY, key);
}

function isAdminUser(user) {
  return !!user && user.role === "admin";
}

// --- ইউজারের সেভ করা এক্সপ্লিসিট ওভাররাইড → { key: boolean } (রেজিস্ট্রিতে নেই এমন পুরনো key বাদ) ---
function getOverrideMap(user) {
  const map = {};
  const list = Array.isArray(user?.permissions) ? user.permissions : [];
  for (const item of list) {
    if (item && isValidPermissionKey(item.key) && typeof item.allowed === "boolean") {
      map[item.key] = item.allowed;
    }
  }
  return map;
}

// --- চূড়ান্ত (effective) পারমিশন ম্যাপ — ক্লায়েন্টকে এটাই পাঠানো হয় ---
function getEffectivePermissions(user) {
  const admin = isAdminUser(user);
  const overrides = admin ? {} : getOverrideMap(user);
  const result = {};
  for (const p of PERMISSION_LIST) {
    if (admin) result[p.key] = true;
    else result[p.key] = Object.prototype.hasOwnProperty.call(overrides, p.key) ? overrides[p.key] : p.default;
  }
  return result;
}

// --- একটা নির্দিষ্ট পারমিশন আছে কিনা ---
function can(user, key) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (!isValidPermissionKey(key)) {
    // অচেনা key দিয়ে চেক করলে নিরাপদ দিকে (false) যাই, কিন্তু লগে ধরা পড়ুক
    console.warn(`⚠️ can(): রেজিস্ট্রিতে নেই এমন পারমিশন key চেক করা হয়েছে: "${key}"`);
    return false;
  }
  const overrides = getOverrideMap(user);
  return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : PERMISSION_BY_KEY[key].default;
}

// --- অ্যাডমিনের পাঠানো পরিবর্তন যাচাই: { "<key>": true/false } ---
// ফেরত: { ok: true, changes } অথবা { ok: false, message }
function validatePermissionPatch(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "permissions অবশ্যই { key: true/false } অবজেক্ট হতে হবে।" };
  }
  const changes = {};
  for (const [key, value] of Object.entries(input)) {
    if (!isValidPermissionKey(key)) {
      return { ok: false, message: `অচেনা পারমিশন: ${key}` };
    }
    if (typeof value !== "boolean") {
      return { ok: false, message: `"${key}"-এর মান অবশ্যই true/false হতে হবে।` };
    }
    changes[key] = value;
  }
  return { ok: true, changes };
}

// --- পরিবর্তন প্রয়োগ করে নতুন ওভাররাইড-অ্যারে বানায়। ডিফল্টের সমান মান হলে আলাদা করে সেভ করা হয় না
// (পরে রেজিস্ট্রির ডিফল্ট বদলালে সেই ইউজারেও কার্যকর হবে) ---
function applyPermissionChanges(user, changes) {
  const overrides = getOverrideMap(user);
  for (const [key, value] of Object.entries(changes)) {
    if (value === PERMISSION_BY_KEY[key].default) delete overrides[key];
    else overrides[key] = value;
  }
  return Object.entries(overrides).map(([key, allowed]) => ({ key, allowed }));
}

// --- Socket.IO রুম নাম (utils/socketRooms.js ও socketBroadcast.js এই একই ফাংশন ব্যবহার করে) ---
function permRoom(key) {
  return `perm:${key}`;
}

module.exports = {
  PERMISSION_LIST,
  PERMISSION_KEYS,
  isValidPermissionKey,
  getOverrideMap,
  getEffectivePermissions,
  can,
  validatePermissionPatch,
  applyPermissionChanges,
  permRoom,
};
