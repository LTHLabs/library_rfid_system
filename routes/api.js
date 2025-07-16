const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const mqttService = require("../services/mqttService");

// POST /api/users - Tambah user baru
router.post("/users", async (req, res) => {
  try {
    const { uid, name, email, phone } = req.body;

    // Cek apakah UID sudah ada
    const existingUser = await User.findOne({ uid });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "UID sudah terdaftar",
      });
    }

    // Cek apakah email sudah ada
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    // Buat user baru
    const newUser = new User({
      uid,
      name,
      email,
      phone,
      currentlyBorrowing: true,
      totalBorrowed: 1,
    });

    await newUser.save();

    // Buat transaksi otomatis (borrow)
    const transaction = new Transaction({
      uid,
      action: "borrow",
      bookTitle: "General Book",
    });

    await transaction.save();

    // Kirim response ke MQTT
    mqttService.publish(
      process.env.MQTT_TOPIC_PUBLISH,
      JSON.stringify({
        status: "success",
        action: "user_registered",
        uid,
        name,
        message: "User berhasil didaftarkan dan meminjam buku",
      })
    );

    res.json({
      success: true,
      message: "User berhasil didaftarkan",
      user: newUser,
      transaction,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mendaftarkan user",
      error: error.message,
    });
  }
});

// GET /api/users - Lihat semua user
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data user",
      error: error.message,
    });
  }
});

// GET /api/transactions - Lihat histori transaksi
router.get("/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data transaksi",
      error: error.message,
    });
  }
});

// GET /api/stats - Statistik dashboard
router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const blockedUsers = await User.countDocuments({ status: "blocked" });
    const currentlyBorrowing = await User.countDocuments({
      currentlyBorrowing: true,
    });
    const totalTransactions = await Transaction.countDocuments();
    const totalBorrows = await Transaction.countDocuments({ action: "borrow" });
    const totalReturns = await Transaction.countDocuments({ action: "return" });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        blockedUsers,
        currentlyBorrowing,
        totalTransactions,
        totalBorrows,
        totalReturns,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil statistik",
      error: error.message,
    });
  }
});

// POST /api/rfid-scan - Handle RFID scan
router.post("/rfid-scan", async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "UID tidak ditemukan",
      });
    }

    // Cari user berdasarkan UID
    const user = await User.findOne({ uid });

    if (!user) {
      // User belum terdaftar
      return res.json({
        success: true,
        action: "register_required",
        uid,
        message: "User belum terdaftar, silakan daftarkan terlebih dahulu",
      });
    }

    // Cek apakah user sedang diblokir
    if (
      user.status === "blocked" &&
      user.blockedUntil &&
      user.blockedUntil > new Date()
    ) {
      return res.json({
        success: false,
        action: "blocked",
        message: `User diblokir hingga ${user.blockedUntil.toLocaleString()}`,
        user,
      });
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

    res.json({
      success: true,
      action,
      message,
      user,
      transaction,
    });
  } catch (error) {
    console.error("Error processing RFID scan:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memproses scan RFID",
      error: error.message,
    });
  }
});

module.exports = router;

// DELETE /api/users/:id - Hapus user berdasarkan ID
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Cari user berdasarkan ID
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Hapus semua transaksi yang terkait dengan user ini
    await Transaction.deleteMany({ uid: user.uid });

    // Hapus user
    await User.findByIdAndDelete(id);

    // Kirim notifikasi ke MQTT (opsional)
    mqttService.publish(
      process.env.MQTT_TOPIC_PUBLISH,
      JSON.stringify({
        status: "success",
        action: "user_deleted",
        uid: user.uid,
        name: user.name,
        message: `User ${user.name} telah dihapus dari sistem`,
      })
    );

    res.json({
      success: true,
      message: `User ${user.name} dan semua transaksinya berhasil dihapus`,
      deletedUser: {
        id: user._id,
        uid: user.uid,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus user",
      error: error.message,
    });
  }
});

// GET /api/users/export - Export data user ke CSV
router.get("/users/export", async (req, res) => {
  try {
    // Ambil semua data user
    const users = await User.find().sort({ createdAt: -1 });

    // Header CSV
    const csvHeader =
      "Nama,UID,Email,Telepon,Status,Sedang Meminjam,Total Pinjam,Total Kembali,Tanggal Daftar\n";

    // Konversi data user ke format CSV
    const csvData = users
      .map((user) => {
        const createdDate = new Date(user.createdAt).toLocaleDateString(
          "id-ID"
        );
        return [
          `"${user.name}"`,
          `"${user.uid}"`,
          `"${user.email}"`,
          `"${user.phone}"`,
          `"${user.status === "active" ? "Aktif" : "Diblokir"}"`,
          `"${user.currentlyBorrowing ? "Ya" : "Tidak"}"`,
          user.totalBorrowed,
          user.totalReturned,
          `"${createdDate}"`,
        ].join(",");
      })
      .join("\n");

    // Gabungkan header dan data
    const csvContent = csvHeader + csvData;

    // Set header response untuk download file
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const filename = `users_backup_${timestamp}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", Buffer.byteLength(csvContent, "utf8"));

    // Kirim data CSV
    res.send(csvContent);

    console.log(`📥 CSV export completed: ${filename} (${users.length} users)`);
  } catch (error) {
    console.error("Error exporting users to CSV:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengekspor data user",
      error: error.message,
    });
  }
});
