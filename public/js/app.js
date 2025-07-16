// WebSocket connection
const socket = io();

// DOM elements
const rfidStatus = document.getElementById("rfidStatus");
const statusText = document.getElementById("statusText");
const lastScan = document.getElementById("lastScan");

// Statistics elements
const totalUsersEl = document.getElementById("totalUsers");
const activeUsersEl = document.getElementById("activeUsers");
const currentlyBorrowingEl = document.getElementById("currentlyBorrowing");
const blockedUsersEl = document.getElementById("blockedUsers");

// Table elements
const usersTableBody = document.getElementById("usersTableBody");
const transactionsTableBody = document.getElementById("transactionsTableBody");

// State management
let isConnected = false;
let lastScanTime = null;

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  initializeWebSocket();
  loadInitialData();
});

// WebSocket initialization
function initializeWebSocket() {
  // Connection events
  socket.on("connect", function () {
    console.log("✅ Connected to server");
    isConnected = true;
    updateRFIDStatus("connected", "Sistem RFID terhubung dan siap");

    // Subscribe to RFID data
    socket.emit("subscribe_rfid");
  });

  socket.on("disconnect", function () {
    console.log("❌ Disconnected from server");
    isConnected = false;
    updateRFIDStatus(
      "disconnected",
      "Koneksi terputus - Mencoba menghubungkan kembali..."
    );
  });

  socket.on("connect_error", function (error) {
    console.error("❌ Connection error:", error);
    updateRFIDStatus("disconnected", "Gagal terhubung ke server");
  });

  // RFID data events
  socket.on("rfid_data", function (data) {
    console.log("📨 RFID data received:", data);
    handleRFIDData(data);
  });

  socket.on("rfid_result", function (result) {
    console.log("📋 RFID result:", result);
    handleRFIDResult(result);

    // Refresh data after RFID processing
    setTimeout(() => {
      refreshData();
    }, 1000);
  });
}

// Handle RFID data
function handleRFIDData(data) {
  if (data && data.uid) {
    lastScanTime = new Date();
    updateLastScan(data.uid, lastScanTime);

    // Show processing status
    updateRFIDStatus("connected", `Memproses kartu: ${data.uid}...`);
  }
}

// Handle RFID processing result
function handleRFIDResult(result) {
  if (result.success) {
    const message =
      result.action === "borrow"
        ? `✅ Buku dipinjam oleh ${result.user?.name || "User"}`
        : `✅ Buku dikembalikan oleh ${result.user?.name || "User"}`;

    updateRFIDStatus("connected", message);

    // Show notification
    showNotification("success", result.message);
  } else if (result.action === "register_required") {
    updateRFIDStatus(
      "connected",
      `⚠️ User belum terdaftar (UID: ${result.uid})`
    );
    showNotification(
      "warning",
      "User belum terdaftar, silakan daftarkan terlebih dahulu"
    );
  } else if (result.action === "blocked") {
    updateRFIDStatus("connected", `🚫 User diblokir`);
    showNotification("danger", result.message);
  } else {
    updateRFIDStatus("connected", "❌ Terjadi kesalahan");
    showNotification(
      "danger",
      result.message || "Terjadi kesalahan saat memproses kartu RFID"
    );
  }

  // Reset status after 5 seconds
  setTimeout(() => {
    updateRFIDStatus("connected", "Sistem RFID terhubung dan siap");
  }, 5000);
}

// Update RFID status display
function updateRFIDStatus(status, message) {
  rfidStatus.className = `rfid-status rfid-${status}`;
  statusText.textContent = message;

  if (status === "disconnected") {
    rfidStatus.classList.add("pulse");
  } else {
    rfidStatus.classList.remove("pulse");
  }
}

// Update last scan display
function updateLastScan(uid, timestamp) {
  lastScan.innerHTML = `
        <small class="text-success">
            <i class="bi bi-check-circle me-1"></i>
            Scan terakhir: <strong>${uid}</strong> pada ${formatDateTime(
    timestamp
  )}
        </small>
    `;
}

// Show notification
function showNotification(type, message) {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 400px;
    `;

  notification.innerHTML = `
        <i class="bi bi-${getNotificationIcon(type)} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// Get notification icon based on type
function getNotificationIcon(type) {
  const icons = {
    success: "check-circle-fill",
    danger: "exclamation-triangle-fill",
    warning: "exclamation-triangle-fill",
    info: "info-circle-fill",
  };
  return icons[type] || "info-circle-fill";
}

// Load initial data
function loadInitialData() {
  loadStats();
  loadUsers();
  loadTransactions();
}

// Load statistics
async function loadStats() {
  try {
    const response = await fetch("/api/stats");
    const result = await response.json();

    if (result.success) {
      const stats = result.stats;
      totalUsersEl.textContent = stats.totalUsers;
      activeUsersEl.textContent = stats.activeUsers;
      currentlyBorrowingEl.textContent = stats.currentlyBorrowing;
      blockedUsersEl.textContent = stats.blockedUsers;
    }
  } catch (error) {
    console.error("Error loading stats:", error);
    // Show error state
    totalUsersEl.textContent = "!";
    activeUsersEl.textContent = "!";
    currentlyBorrowingEl.textContent = "!";
    blockedUsersEl.textContent = "!";
  }
}

// Load users
async function loadUsers() {
  try {
    usersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="loading-spinner me-2"></div>
                    Memuat data...
                </td>
            </tr>
        `;

    const response = await fetch("/api/users");
    const result = await response.json();

    if (result.success && result.users.length > 0) {
      usersTableBody.innerHTML = result.users
        .slice(0, 10)
        .map(
          (user) => `
                <tr>
                    <td><code>${user.uid}</code></td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>
                        <span class="badge ${
                          user.status === "active" ? "bg-success" : "bg-danger"
                        }">
                            ${user.status === "active" ? "Aktif" : "Diblokir"}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${
                          user.currentlyBorrowing
                            ? "bg-warning"
                            : "bg-secondary"
                        }">
                            ${user.currentlyBorrowing ? "Ya" : "Tidak"}
                        </span>
                    </td>
                    <td>${user.totalBorrowed}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${
                          user._id
                        }', '${user.name}')" title="Hapus User">
                            🗑️
                        </button>
                    </td>
                </tr>
            `
        )
        .join("");
    } else {
      usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="bi bi-inbox me-2"></i>
                        Belum ada data user
                    </td>
                </tr>
            `;
    }
  } catch (error) {
    console.error("Error loading users:", error);
    usersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Gagal memuat data user
                </td>
            </tr>
        `;
  }
}

// Load transactions
async function loadTransactions() {
  try {
    transactionsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="loading-spinner me-2"></div>
                    Memuat data...
                </td>
            </tr>
        `;

    const response = await fetch("/api/transactions");
    const result = await response.json();

    if (result.success && result.transactions.length > 0) {
      transactionsTableBody.innerHTML = result.transactions
        .slice(0, 10)
        .map(
          (transaction) => `
                <tr>
                    <td><code>${transaction.uid}</code></td>
                    <td>
                        <span class="badge ${
                          transaction.action === "borrow"
                            ? "bg-primary"
                            : "bg-success"
                        }">
                            ${
                              transaction.action === "borrow"
                                ? "Pinjam"
                                : "Kembali"
                            }
                        </span>
                    </td>
                    <td>${transaction.bookTitle}</td>
                    <td>${formatDateTime(transaction.timestamp)}</td>
                    <td>
                        <span class="badge ${
                          transaction.status === "success"
                            ? "bg-success"
                            : "bg-danger"
                        }">
                            ${
                              transaction.status === "success"
                                ? "Berhasil"
                                : "Gagal"
                            }
                        </span>
                    </td>
                    <td>
                        ${
                          transaction.duration
                            ? `${Math.floor(transaction.duration / 60)}j ${
                                transaction.duration % 60
                              }m` +
                              (transaction.isLate
                                ? ' <span class="badge bg-danger">Terlambat</span>'
                                : "")
                            : "-"
                        }
                    </td>
                </tr>
            `
        )
        .join("");
    } else {
      transactionsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                        <i class="bi bi-inbox me-2"></i>
                        Belum ada data transaksi
                    </td>
                </tr>
            `;
    }
  } catch (error) {
    console.error("Error loading transactions:", error);
    transactionsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Gagal memuat data transaksi
                </td>
            </tr>
        `;
  }
}

// Refresh all data
function refreshData() {
  loadStats();
  loadUsers();
  loadTransactions();

  showNotification("info", "Data berhasil diperbarui");
}

// Utility functions
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPhoneNumber(phone) {
  if (phone.startsWith("62")) {
    return "+" + phone;
  }
  return phone;
}

// Auto refresh data every 30 seconds
setInterval(() => {
  if (isConnected) {
    loadStats();
  }
}, 30000);

// Handle page visibility change
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    console.log("Page hidden");
  } else {
    console.log("Page visible");
    // Reconnect if needed
    if (!socket.connected) {
      socket.connect();
    }
    // Refresh data when page becomes visible
    refreshData();
  }
});

// Handle beforeunload
window.addEventListener("beforeunload", function () {
  if (socket.connected) {
    socket.disconnect();
  }
});

// Delete user function
async function deleteUser(userId, userName) {
  // Show confirmation dialog
  const confirmMessage = `Apakah Anda yakin ingin menghapus user ini? Semua transaksi akan dihapus juga. Saran: backup data terlebih dahulu.

User: ${userName}`;

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    // Show loading notification
    showNotification("info", `Menghapus user ${userName}...`);

    const response = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      showNotification("success", result.message);

      // Refresh data after successful deletion
      setTimeout(() => {
        refreshData();
      }, 1000);
    } else {
      showNotification("danger", result.message || "Gagal menghapus user");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    showNotification("danger", "Terjadi kesalahan saat menghapus user");
  }
}

// Download users CSV function
async function downloadUsersCSV() {
  try {
    // Show loading notification
    showNotification("info", "Mempersiapkan file CSV...");

    // Create a temporary link element
    const link = document.createElement("a");
    link.href = "/api/users/export";
    link.download = `users_backup_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.csv`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success notification
    setTimeout(() => {
      showNotification("success", "File CSV berhasil diunduh!");
    }, 500);
  } catch (error) {
    console.error("Error downloading CSV:", error);
    showNotification("danger", "Gagal mengunduh file CSV");
  }
}
