const mongoose = require("mongoose");

const FacebookPageSchema = new mongoose.Schema(
  {
    pageId: { type: String, required: true, unique: true, trim: true },
    pageName: { type: String, required: true, trim: true },
    pageAccessToken: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("FacebookPage", FacebookPageSchema);
