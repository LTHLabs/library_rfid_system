const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    currentlyBorrowing: {
      type: Boolean,
      default: false,
    },
    totalBorrowed: {
      type: Number,
      default: 0,
    },
    totalReturned: {
      type: Number,
      default: 0,
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
