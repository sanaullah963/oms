const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io"); // Socket.IO Server
const bodyParser = require("body-parser");
const cors = require("cors");
const orderRoutes = require("./routes/orderRoutes");

require("dotenv").config();

const app = express();
const httpServer = http.createServer(app); // Create HTTP server from Express app
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI;
const CLIENT_URL = process.env.CLIENT_URL;

// ------ 1. Socket.IO Setup ---
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL, // **IMPORTANT: Replace with your Next.js URL when you know it**
    methods: ["GET", "POST"],
  },
});

// Pass the io instance to routes so they can emit real-time updates
app.set("io", io);
io.on("connection", (socket) => {
  console.log("A user connected via Socket.IO");
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// ------ 2. Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// ------ 3. MongoDB Connection ---
const connectToMongoDB = async() =>{
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:--", error);
  }
}
connectToMongoDB()

// ------ 4. Routes Integration ---
app.use('/api/orders', orderRoutes); // Base route for all order operations

// --- 5. Server Start ---
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// home route
app.get("/", (req, res) => {
  res.send("home route");
});
