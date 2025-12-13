const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const orderRoutes = require("./routes/orderRoutes");
const Order = require("./models/Order");
const { type } = require("os");
const axios = require('axios');
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
              changedAt: new Date(),
            },
          },
        },
        { new: true }
      );
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
  // recive note from client
  socket.on("addNote", async ({ orderId, note }) => {
    try {
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          note: note,
        },
        { new: true }
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

      if (phone) {
        const engNum = convertNumber(phone.castomerPhone);
        const res = await axios.post(
          "https://bdcourier.com/api/courier-check",
          { phone: engNum },
          {
            headers: {
              Authorization: `Bearer ${process.env.BDCOURIER_SECRET_KEY}`,
            },
          }
        );

        if (res.data) {
          const success = res.data?.courierData?.summary?.success_parcel;
          const cancel = res.data?.courierData?.summary?.cancelled_parcel;
          const updatedOrder = await Order.findByIdAndUpdate(
            phone._id,
            {
              $set: {
                "courierHistory.all.success": success,
                "courierHistory.all.cancel": cancel,
              },
            },
            { new: true }
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
      } else {
        socket.emit("distributecourierHistory", {
          result: "phone not found",
          success: false,
        });
      }
    } catch (err) {
      console.error("Error getting order history:", err);
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
app.get("/ping", (req, res) => {
  res.status(200).send("ping route");
});
