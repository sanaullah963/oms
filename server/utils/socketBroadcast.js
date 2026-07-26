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

module.exports = { emitOrderUpdate };