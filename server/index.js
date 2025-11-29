const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const orderRoutes = require("./routes/orderRoutes");
const Order = require("./models/Order");
const { type } = require("os");

require("dotenv").config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI;
const CLIENT_URL = process.env.CLIENT_URL;

// ------ 1. Socket.IO Setup ---
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

app.set("io", io);
io.on("connection", (socket) => {
  console.log("A user connected via Socket.IO", socket.id);
  //---- status update----
  socket.on("updateStatus", async ({ orderId, newStatus, note }) => {
    console.log("Status update request received:", orderId, newStatus);
    try {
      // MongoDB update
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          orderStatus: newStatus,
          $push: {
            activities: {
              description: note,
              type: newStatus,
              changedAt: new Date(),
            },
          },
        },
        { new: true }
      );
      console.log("Updated order:", updatedOrder);
      // Send response back to requesting user
      if (!updatedOrder) {
        return socket.emit("statusUpdated", {
          success: false,
          message: "Order not found",
        });
      } else {
        socket.emit("statusUpdated", {
          success: true,
          order: updatedOrder,
        });
      }

      // Inform all other clients (admin dashboard, etc.)
      socket.broadcast.emit("orderStatusChange", updatedOrder);
    } catch (err) {
      console.error("Error updating status:", err);
      socket.emit("statusUpdated", {
        success: false,
        message: "Database update failed",
      });
    }
  });

  // disconnect notice
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});
io.on;

// ------ 2. Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// ------ 3. MongoDB Connection ---
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:--", error);
  }
};
connectToMongoDB();

// ------ 4. Routes Integration ---
app.use("/api/orders", orderRoutes); // Base route for all order operations

// --- 5. Server Start ---
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// home route
app.get("/", (req, res) => {
  res.send("home route");
});
