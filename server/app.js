const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const orderRoutes = require("./routes/orderRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const facebookRoutes = require("./routes/facebookRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const pushRoutes = require("./routes/pushRoutes");
const facebookPageRoutes = require("./routes/facebookPageRoutes");
const landingPageRoutes = require("./routes/landingPageRoutes");
const publicLandingRoutes = require("./routes/publicLandingRoutes");
const { protect } = require("./middleware/auth");

const app = express();

// ------ Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// ------ পাবলিক রুট (লগইন ছাড়াই অ্যাক্সেসযোগ্য) ---
app.use("/api/auth", authRoutes);
app.use("/api/webhook", webhookRoutes); // কুরিয়ার/Facebook সার্ভার থেকে আসে, নিজস্ব token verification আছে
app.use("/api/push", pushRoutes); // ভিতরে subscribe/unsubscribe নিজেই protect করা
app.use("/api/public/landing-pages", publicLandingRoutes); // কাস্টমার-facing, সম্পূর্ণ পাবলিক

// ------ লগইন বাধ্যতামূলক রুট (এডমিন + মডারেটর) ---
app.use("/api/orders", protect, orderRoutes);
app.use("/api/facebook", facebookRoutes);
// dashboard: মডারেটর নিজের অর্ডারের এনালাইসিস দেখবে, এডমিন সব/নির্দিষ্ট মডারেটরের দেখবে (কন্ট্রোলারে স্কোপ করা হয়)
app.use("/api/dashboard", protect, dashboardRoutes);

// ------ শুধুমাত্র এডমিন অ্যাক্সেস করতে পারবে ---
app.use("/api/users", userRoutes); // ভিতরেই protect+adminOnly প্রয়োগ করা আছে
app.use("/api/facebook-pages", facebookPageRoutes); // ভিতরেই protect+adminOnly প্রয়োগ করা আছে
app.use("/api/landing-pages", landingPageRoutes); // ভিতরেই protect+adminOnly প্রয়োগ করা আছে

// ------ Health check routes ---
app.get("/", (req, res) => {
  res.send("home route");
});
app.get("/ping", (req, res) => {
  res.status(200).send("ping route");
});

module.exports = app;