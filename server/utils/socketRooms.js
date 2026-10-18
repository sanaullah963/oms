// ============================================================================
// Socket.IO রুম ম্যানেজমেন্ট — ইউজারের role + পারমিশন অনুযায়ী কোন কোন রুমে থাকবে
// ============================================================================
//  user:<id>                  — নিজের জন্য
//  role:admin / role:moderator
//  perm:<key>                 — শুধু moderator-দের জন্য, যে পারমিশনগুলো তার আছে (config/permissions.js)
//                               (admin আগে থেকেই role:admin রুমে সবকিছু পায়, তাই admin perm রুমে যায় না —
//                                নাহলে একই ইভেন্ট দুইবার পেত)
// অ্যাডমিন কারো পারমিশন/role বদলালে syncUserSocketRooms() লাইভ কানেকশনের রুমও আপডেট করে —
// রিকানেক্ট লাগে না।
// ============================================================================

const { PERMISSION_KEYS, can, permRoom, getEffectivePermissions } = require("../config/permissions");

const MANAGED_PREFIXES = ["role:", "perm:"];

function computeManagedRooms(user) {
  const rooms = new Set();
  if (user.role === "admin") {
    rooms.add("role:admin");
  } else if (user.role === "moderator") {
    rooms.add("role:moderator");
    for (const key of PERMISSION_KEYS) {
      if (can(user, key)) rooms.add(permRoom(key));
    }
  }
  return rooms;
}

// --- নতুন কানেকশনে ---
function joinRoomsForSocket(socket) {
  const user = socket.user;
  if (!user) return;
  socket.join(`user:${user._id}`);
  const rooms = computeManagedRooms(user);
  rooms.forEach((room) => socket.join(room));
  console.log(`🔌 Socket rooms for ${user.name} (${user.role}):`, [...rooms].join(", "));
}

// --- লাইভ কানেকশনগুলোর রুম আপডেট + ক্লায়েন্টকে জানানো ---
async function syncUserSocketRooms(io, user) {
  if (!io || !user) return;
  try {
    const desired = computeManagedRooms(user);
    const sockets = await io.in(`user:${user._id}`).fetchSockets();

    for (const s of sockets) {
      for (const room of s.rooms) {
        if (MANAGED_PREFIXES.some((p) => room.startsWith(p)) && !desired.has(room)) {
          s.leave(room);
        }
      }
      desired.forEach((room) => {
        if (!s.rooms.has(room)) s.join(room);
      });
    }

    io.to(`user:${user._id}`).emit("permissionsChanged", {
      role: user.role,
      permissions: getEffectivePermissions(user),
    });
    console.log(
      `🔄 Socket rooms synced for ${user.name}: ${sockets.length} connection(s) → ${[...desired].join(", ")}`,
    );
  } catch (error) {
    console.error("syncUserSocketRooms error:", error);
  }
}

module.exports = { computeManagedRooms, joinRoomsForSocket, syncUserSocketRooms };
