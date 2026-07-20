/**
 * অর্ডার আপডেট শুধু সংশ্লিষ্ট মানুষদের কাছে পাঠায় (io.emit দিয়ে সবাইকে পাঠানোর বদলে):
 * - যে ইউজার অর্ডারটা তৈরি করেছে (room: user:<id>)
 * - সব admin (room: role:admin)
 * এভাবে মডারেটর রিয়েল-টাইম আপডেটেও শুধু নিজের অর্ডার দেখবে, অন্য মডারেটরের অর্ডার না।
 */
function emitOrderUpdate(io, order) {
  if (!io || !order) return;
  io.to("role:admin").emit("orderStatusChange", order);
  if (order.createdBy) {
    io.to(`user:${order.createdBy}`).emit("orderStatusChange", order);
  }
}

module.exports = { emitOrderUpdate };