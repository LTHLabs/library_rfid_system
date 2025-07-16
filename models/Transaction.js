const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ["borrow", "return"],
      required: true,
    },
    bookTitle: {
      type: String,
      default: "General Book",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
    isReturned: {
      type: Boolean,
      default: false,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // dalam menit
      default: null,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
