/**
 * অর্ডার আপডেট শুধু সংশ্লিষ্ট মানুষদের কাছে পাঠায় (io.emit দিয়ে সবাইকে পাঠানোর বদলে):
 * - যে ইউজার অর্ডারটা তৈরি করেছে (room: user:<id>)
 * - সব admin (room: role:admin)
 * এভাবে মডারেটর রিয়েল-টাইম আপডেটেও শুধু নিজের অর্ডার দেখবে, অন্য মডারেটরের অর্ডার না।
 */
// function emitOrderUpdate(io, order) {
//   if (!io || !order) return;
//   io.to("role:admin").emit("orderStatusChange", order);
//   if (order.createdBy) {
//     io.to(`user:${order.createdBy}`).emit("orderStatusChange", order);
//   }
// }

// module.exports = { emitOrderUpdate };


/**
 * অর্ডার আপডেট শুধু সংশ্লিষ্ট মানুষদের কাছে পাঠায় (io.emit দিয়ে সবাইকে পাঠানোর বদলে):
 * - যে ইউজার অর্ডারটা তৈরি করেছে (room: user:<id>)
 * - সব admin (room: role:admin)
 * এভাবে মডারেটর রিয়েল-টাইম আপডেটেও শুধু নিজের অর্ডার দেখবে, অন্য মডারেটরের অর্ডার না।
 */
/**
 * অর্ডার আপডেট শুধু সংশ্লিষ্ট মানুষদের কাছে পাঠায় (io.emit দিয়ে সবাইকে পাঠানোর বদলে):
 * - সব admin (room: role:admin) — সবসময় পায়
 * - যে ইউজার অর্ডারটা তৈরি করেছে (room: user:<id>) — createdBy থাকলে
 * - createdBy না থাকলে (যেমন ল্যান্ডিং পেজ/webhook থেকে আসা "কারো নিজের না" অর্ডার) —
 *   সব মডারেটরকে পাঠানো হয় (room: role:moderator), যাতে যেকোনো মডারেটর সেটা ধরে কনফার্ম করতে পারে
 */
function emitOrderUpdate(io, order) {
  if (!io || !order) return;
  io.to("role:admin").emit("orderStatusChange", order);
  if (order.createdBy) {
    io.to(`user:${order.createdBy}`).emit("orderStatusChange", order);
  } else {
    io.to("role:moderator").emit("orderStatusChange", order);
  }
}

/**
 * DraftOrder (ইনকমপ্লিট অর্ডার) তৈরি/আপডেট হলে — orderUpdate-এর মতোই কোনো নির্দিষ্ট
 * মডারেটরের না (কেউ এখনো "নিজের" করে নেয়নি), তাই admin + সব moderator-কে পাঠানো হয়,
 * যাতে ড্যাশবোর্ডের "ইনকমপ্লিট" সেকশনে সবাই রিয়েল-টাইমে দেখতে পায়।
 */
function emitDraftUpdate(io, draft) {
  if (!io || !draft) return;
  io.to("role:admin").emit("draftOrderUpdate", draft);
  io.to("role:moderator").emit("draftOrderUpdate", draft);
}

// --- draft সম্পন্ন (সাবমিট) বা বাতিল হলে "ইনকমপ্লিট" লিস্ট থেকে সরিয়ে দেওয়ার জন্য ---
function emitDraftRemove(io, draftId) {
  if (!io || !draftId) return;
  io.to("role:admin").emit("draftOrderRemove", draftId);
  io.to("role:moderator").emit("draftOrderRemove", draftId);
}

module.exports = { emitOrderUpdate, emitDraftUpdate, emitDraftRemove };