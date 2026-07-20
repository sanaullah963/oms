const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");

async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:--", error);
  }
}

module.exports = connectToMongoDB;
