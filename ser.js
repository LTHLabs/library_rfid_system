require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

// Import services dan routes
const mqttService = require("./services/mqttService");
const apiRoutes = require("./routes/api");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api", apiRoutes);

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("👋 User disconnected:", socket.id);
  });

  // Handle client subscription to RFID data
  socket.on("subscribe_rfid", () => {
    console.log("📡 Client subscribed to RFID data");
    socket.join("rfid_subscribers");
  });
});

// Connect to MQTT and handle messages
mqttService.connect();

// Handle RFID messages from MQTT
mqttService.onMessage(process.env.MQTT_TOPIC_SUBSCRIBE, (data) => {
  console.log("📨 RFID data received:", data);

  // Broadcast to all connected WebSocket clients
  io.to("rfid_subscribers").emit("rfid_data", {
    uid: data.trim(),
    timestamp: new Date().toISOString(),
  });

  // Process RFID scan automatically
  processRFIDScan(data.trim());
});

// Function to process RFID scan
async function processRFIDScan(uid) {
  try {
    const User = require("./models/User");
    const Transaction = require("./models/Transaction");

    // Cari user berdasarkan UID
    const user = await User.findOne({ uid });

    if (!user) {
      // User belum terdaftar
      io.to("rfid_subscribers").emit("rfid_result", {
        success: true,
        action: "register_required",
        uid,
        message: "User belum terdaftar, silakan daftarkan terlebih dahulu",
      });
      return;
    }

    // Cek apakah user sedang diblokir
    if (
      user.status === "blocked" &&
      user.blockedUntil &&
      user.blockedUntil > new Date()
    ) {
      io.to("rfid_subscribers").emit("rfid_result", {
        success: false,
        action: "blocked",
        message: `User diblokir hingga ${user.blockedUntil.toLocaleString()}`,
        user,
      });
      return;
    }

    // Jika user tidak lagi diblokir, aktifkan kembali
    if (
      user.status === "blocked" &&
      user.blockedUntil &&
      user.blockedUntil <= new Date()
    ) {
      user.status = "active";
      user.blockedUntil = null;
      await user.save();
    }

    let transaction;
    let action;
    let message;

    if (user.currentlyBorrowing) {
      // User sedang meminjam, lakukan return
      action = "return";

      // Cari transaksi borrow yang belum di-return
      const borrowTransaction = await Transaction.findOne({
        uid,
        action: "borrow",
        isReturned: false,
      }).sort({ createdAt: -1 });

      if (borrowTransaction) {
        // Hitung durasi peminjaman
        const borrowTime = borrowTransaction.timestamp;
        const returnTime = new Date();
        const duration = Math.floor((returnTime - borrowTime) / (1000 * 60)); // dalam menit

        // Cek keterlambatan (lebih dari 2 hari = 2880 menit)
        const isLate = duration > 2880;

        // Update transaksi borrow
        borrowTransaction.isReturned = true;
        borrowTransaction.returnedAt = returnTime;
        borrowTransaction.duration = duration;
        borrowTransaction.isLate = isLate;
        await borrowTransaction.save();

        // Buat transaksi return
        transaction = new Transaction({
          uid,
          action: "return",
          bookTitle: "General Book",
          duration,
          isLate,
        });
        await transaction.save();

        // Update user
        user.currentlyBorrowing = false;
        user.totalReturned += 1;

        // Jika terlambat, blokir user selama 1 hari
        if (isLate) {
          user.status = "blocked";
          user.blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam
          message = `Buku dikembalikan terlambat (${Math.floor(
            duration / 60
          )} jam ${duration % 60} menit). User diblokir selama 1 hari.`;
        } else {
          message = `Buku berhasil dikembalikan tepat waktu (${Math.floor(
            duration / 60
          )} jam ${duration % 60} menit).`;
        }

        await user.save();
      }
    } else {
      // User tidak sedang meminjam, lakukan borrow
      action = "borrow";

      transaction = new Transaction({
        uid,
        action: "borrow",
        bookTitle: "General Book",
      });
      await transaction.save();

      // Update user
      user.currentlyBorrowing = true;
      user.totalBorrowed += 1;
      await user.save();

      message = "Buku berhasil dipinjam";
    }

    // Kirim response ke MQTT
    mqttService.publish(
      process.env.MQTT_TOPIC_PUBLISH,
      JSON.stringify({
        status: "success",
        action,
        uid,
        name: user.name,
        message,
      })
    );

    // Broadcast result to WebSocket clients
    io.to("rfid_subscribers").emit("rfid_result", {
      success: true,
      action,
      message,
      user,
      transaction,
    });
  } catch (error) {
    console.error("Error processing RFID scan:", error);

    // Broadcast error to WebSocket clients
    io.to("rfid_subscribers").emit("rfid_result", {
      success: false,
      message: "Gagal memproses scan RFID",
      error: error.message,
    });
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  mqttService.disconnect();
  mongoose.connection.close();
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

// Start server
server.listen(PORT, "127.0.0.1", () => {
  console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
});
