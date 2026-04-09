const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const orderRoutes = require("./routes/orderRoutes");
const webhookRoutes = require("./routes/webhookRouter");
const Order = require("./models/Order");
const { type } = require("os");
const axios = require("axios");
const convertNumber = require("./controllers/convertNumber");

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
            },
          },
        },
        { new: true },
      );
      // Send response back to requesting user
      if (!updatedOrder) {
        return socket.emit("statusUpdated", {
          success: false,
          message: "Order not found",
        });
      } else {
        io.emit("statusUpdated", {
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
  // real time update order,when order status change from admin dashboard then real time update all client
  socket.on("orderStatusChange", (order) => {
    socket.broadcast.emit("orderStatusChange", order);
  });
  // recive note from client
  socket.on("addNote", async ({ orderId, note }) => {
    try {
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          note: note,
        },
        { new: true },
      );
      if (updatedOrder) {
        return socket.emit("noteAdded", { updatedOrder });
      }
    } catch (err) {
      console.error("Error adding note:", err);
    }
  });
  // --- recive id for courier history ---
  socket.on("allCourierHistory", async ({ orderId }) => {
    // convert number ban to eng

    try {
      // get castomerPhone from mongodb by orderId

      const phone = await Order.findById(orderId).select("castomerPhone");
      // console.log("phone", Array.isArray(phone.castomerPhone));
      if (phone) {
        let count = {
          success: 0,
          cancel: 0,
        };
        if  (Array.isArray(phone.castomerPhone))  {
          // console.log("phone", phone);
          const orderPromises = phone.castomerPhone.map(async(item)=> {
            const engNum = convertNumber(item);

            const res = await axios.post(
              "https://bdcourier.com/api/courier-check",
              { phone: engNum },
              {
                headers: {
                  Authorization: `Bearer ${process.env.BDCOURIER_SECRET_KEY}`,
                },
              },
            );
            if (res.data) {
              count.success =
                count.success + res.data?.courierData?.summary?.success_parcel;
              count.cancel =
                count.cancel + res.data?.courierData?.summary?.cancelled_parcel;
            }
          });
          const results = await Promise.all(orderPromises);
          // console.log("results", results);
          const updatedOrder = await Order.findByIdAndUpdate(
            phone._id,
            {
              $set: {
                "courierHistory.all.success": count.success,
                "courierHistory.all.cancel": count.cancel,
              },
            },
            { new: true },
          );
          return socket.emit("distributecourierHistory", {
            result: updatedOrder,
            success: true,
          });
        } else {
          socket.emit("distributecourierHistory", {
            result: "bdCourier api response error",
            success: false,
          });
        }
      }
    } catch (err) {
      console.error("Error getting order history:", err);
    }
  });
  // --- recive search query ---
  socket.on("searchQuery", async (q) => {
    try {
      const safeQuery = q.trim();
      if (!safeQuery) {
        socket.emit("searchResult", { orders: [] });
        return;
      }
      const regex = new RegExp(safeQuery, "i"); // case-insensitive partial match

      const orders = await Order.find({
        $or: [
          { castomerPhone: { $regex: regex } },
          { castomerName: { $regex: regex } },
          { rawInputText: { $regex: regex } },
          { "courier.trackingId": { $regex: regex } },
        ],
      }).limit(5);

      socket.emit("searchResult", { orders });
    } catch (err) {
      console.error("Search error:", err);
      socket.emit("searchResult", { orders: [] });
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
app.use("/api/orders", orderRoutes);
app.use("/api/webhook", webhookRoutes);
// --- 5. Server Start ---
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// home route
app.get("/", (req, res) => {
  res.send("home route");
});
app.get("/ping", (req, res) => {
  res.status(200).send("ping route");
});
