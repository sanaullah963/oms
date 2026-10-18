require("net").setDefaultAutoSelectFamilyAttemptTimeout(5000);
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectToMongoDB = require("./config/db");
const { PORT, CLIENT_URL } = require("./config/env");
const registerOrderSocketHandlers = require("./sockets/orderSocket");
const { joinRoomsForSocket } = require("./utils/socketRooms");
const startScheduledOrderReleaserJob = require("./jobs/scheduledOrderReleaser");
const { seedFromEnvIfEmpty } = require("./utils/facebookPages");
const { verifyToken } = require("./utils/jwt");
const User = require("./models/User");
const Order = require("./models/Order");

const httpServer = http.createServer(app);

// ------ Socket.IO Setup ---
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

// --- Socket.IO Auth: HTTP-এর মতোই JWT দিয়ে যাচাই করে socket.user সেট করা ---
// (মডারেটরের জন্য লাইভ সার্চেও শুধু নিজের অর্ডার ফিল্টার করতে socket.user দরকার)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select("-passwordHash");
    if (!user || !user.isApproved) return next(new Error("Unauthorized"));

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log("A user connected via Socket.IO", socket.id, socket.user?.name);

  // ✅ প্রতিটা socket-কে নিজের user room + role room + (মডারেটর হলে) তার পারমিশন-রুমে জয়েন করানো —
  // যাতে অর্ডার/নোট আপডেট শুধু সংশ্লিষ্ট মানুষের কাছেই যায় (emitOrderUpdate দেখুন)
  joinRoomsForSocket(socket);

  registerOrderSocketHandlers(io, socket);
});

// ------ MongoDB Connection ---
connectToMongoDB().then(() => {
  seedFromEnvIfEmpty().catch((err) =>
    console.error("Facebook page seed error:", err),
  );
});

// ------ Cron Job: প্রতিদিন শিডিউলড অর্ডার রিলিজ ---
startScheduledOrderReleaserJob(io);

// --- Server Start ---
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


