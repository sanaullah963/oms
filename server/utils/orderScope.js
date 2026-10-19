// ============================================================================
// অর্ডার ডেটা-স্কোপ — "কে কোন অর্ডার দেখতে/ধরতে পারবে" এর একমাত্র জায়গা
// ============================================================================
// আগে এই লজিক orderController (৩ জায়গা), dashboardController, trackingParcelController-এ
// কপি-পেস্ট করা ছিল। এখন সবাই এখান থেকে নেয় — নিয়ম বদলাতে হলে শুধু এই ফাইল।
//
// দুটো স্কোপ আছে:
//  1) orders       — সাধারণ অর্ডার লিস্ট/সার্চ/অ্যাকশন
//        admin                      → সব
//        moderator + orders.viewOthers → সব
//        moderator (ডিফল্ট)         → নিজের তৈরি (createdBy = সে) + মালিকহীন (createdBy = null,
//                                     যেমন ল্যান্ডিং পেজ থেকে আসা — শেয়ার্ড পেন্ডিং কিউ)
//                                     ⚠️ origin = "landing_page" অর্ডার শুধু তখনই, যদি
//                                     orders.viewLandingPage পারমিশন থাকে (ডিফল্ট: আছে)
//  2) courierNotes — Steadfast নোট (needsAttention / courierTrackingAttention ফ্ল্যাগ)
//        admin / moderator + courierNotes.viewAll → ফ্ল্যাগ-ওয়ালা সব অর্ডার
//        moderator (ডিফল্ট)         → "orders" স্কোপের ভেতরের অর্ডারগুলোর নোট
// ============================================================================

const { can } = require("../config/permissions");

// কোন কোন ফ্ল্যাগ "কুরিয়ার নোট" ধরা হবে। নতুন ধরনের নোট-ফ্ল্যাগ এলে শুধু এখানে যোগ করলেই হবে।
const COURIER_NOTE_FLAGS = ["needsAttention", "courierTrackingAttention"];

// ক্লায়েন্টকে পাঠানো অর্ডারে এই মার্কার বসে, যদি অর্ডারটা মডারেটরের "orders" স্কোপের বাইরের কিন্তু
// শুধু কুরিয়ার-নোট পারমিশনের কারণে এসেছে — ক্লায়েন্ট এগুলোকে মূল অর্ডার লিস্টে মেশায় না।
const VIEW_SCOPE_COURIER_NOTES = "courierNotes";

function isAdmin(user) {
  return !!user && user.role === "admin";
}

// ---------------------------------------------------------------------------
// Mongo ফিল্টার (find / aggregate $match-এ বসানোর জন্য)
// ---------------------------------------------------------------------------

// ল্যান্ডিং পেজ অর্ডারের origin মান (models/Order.js-এর enum-এর সাথে মেলে)
const LANDING_ORIGIN = "landing_page";

// এই ইউজার ল্যান্ডিং পেজ (ও ইনকমপ্লিট থেকে কনভার্ট করা) অর্ডার দেখতে পারবে কিনা
function canViewLandingOrders(user) {
  return isAdmin(user) || can(user, "orders.viewLandingPage");
}

// "নিজের + মালিকহীন" ফিল্টারের উপাদান
function ownOrOwnerlessClauses(user) {
  if (canViewLandingOrders(user)) {
    return [{ createdBy: user._id }, { createdBy: null }];
  }
  return [{ createdBy: user._id }, { createdBy: null, origin: { $ne: LANDING_ORIGIN } }];
}

// সাধারণ অর্ডার স্কোপ
function ordersScope(user) {
  if (!user) return { _id: null }; // কেউ না — কিছুই মিলবে না (নিরাপদ ডিফল্ট)
  if (isAdmin(user) || can(user, "orders.viewOthers")) return {};
  return { $or: ownOrOwnerlessClauses(user) };
}

// কুরিয়ার-নোট-ফ্ল্যাগ থাকা অর্ডার
function courierNoteFlagFilter() {
  return { $or: COURIER_NOTE_FLAGS.map((flag) => ({ [flag]: true })) };
}

// কুরিয়ার-নোট স্কোপ (নোট কাউন্টার/লিস্টের জন্য — ফ্ল্যাগ-ফিল্টার আলাদা করে লাগাতে হবে)
function courierNotesScope(user) {
  if (!user) return { _id: null };
  if (isAdmin(user) || can(user, "courierNotes.viewAll")) return {};
  return ordersScope(user);
}

// getOrders-এর জন্য: মূল স্কোপ + (পারমিশন থাকলে) অন্যদের ফ্ল্যাগ-ওয়ালা অর্ডার
function orderListScope(user) {
  const base = ordersScope(user);
  if (Object.keys(base).length === 0) return {}; // সব অর্ডারই দেখতে পারে
  if (can(user, "courierNotes.viewAll")) {
    return { $or: [...ownOrOwnerlessClauses(user), ...courierNoteFlagFilter().$or] };
  }
  return base;
}

// ---------------------------------------------------------------------------
// ইন-মেমরি চেক (একটা অর্ডার ডকুমেন্ট/অবজেক্টের জন্য)
// ---------------------------------------------------------------------------

function inOrdersScope(user, order) {
  if (!user || !order) return false;
  if (isAdmin(user) || can(user, "orders.viewOthers")) return true;
  if (!order.createdBy) {
    // মালিকহীন — শেয়ার্ড কিউ; তবে ল্যান্ডিং পেজ অর্ডার শুধু পারমিশন থাকলে
    return order.origin === LANDING_ORIGIN ? canViewLandingOrders(user) : true;
  }
  return String(order.createdBy) === String(user._id);
}

function hasCourierNoteFlag(order) {
  return !!order && COURIER_NOTE_FLAGS.some((flag) => order[flag] === true);
}

function inCourierNotesScope(user, order) {
  if (!user || !order) return false;
  if (!hasCourierNoteFlag(order)) return false;
  if (isAdmin(user) || can(user, "courierNotes.viewAll")) return true;
  return inOrdersScope(user, order);
}

// via: [] হলে শুধু সাধারণ স্কোপ; ["courierNotes"] দিলে নোট-স্কোপও গ্রহণযোগ্য
// (যেমন "Tracking OK" বাটন — যে মডারেটর অর্ডারের মালিক না কিন্তু নোট দেখার পারমিশন আছে, সেও চাপতে পারবে)
function canAccessOrder(user, order, { via = [] } = {}) {
  if (inOrdersScope(user, order)) return true;
  if (via.includes("courierNotes") && inCourierNotesScope(user, order)) return true;
  return false;
}

// getOrders-এর রেজাল্টে যেগুলো শুধু কুরিয়ার-নোট পারমিশনের কারণে এসেছে সেগুলোতে মার্কার বসায়
function markViewScope(user, orders) {
  if (!Array.isArray(orders) || isAdmin(user)) return orders;
  return orders.map((order) => {
    if (inOrdersScope(user, order)) return order;
    return { ...order, _viewScope: VIEW_SCOPE_COURIER_NOTES };
  });
}

module.exports = {
  LANDING_ORIGIN,
  canViewLandingOrders,
  COURIER_NOTE_FLAGS,
  VIEW_SCOPE_COURIER_NOTES,
  isAdmin,
  ordersScope,
  courierNotesScope,
  courierNoteFlagFilter,
  orderListScope,
  inOrdersScope,
  inCourierNotesScope,
  hasCourierNoteFlag,
  canAccessOrder,
  markViewScope,
};
