// WebSocket connection
const socket = io();

// DOM elements
const rfidStatus = document.getElementById("rfidStatus");
const statusText = document.getElementById("statusText");
const uidInput = document.getElementById("uid");
const registrationForm = document.getElementById("registrationForm");
const submitBtn = document.getElementById("submitBtn");
const alertContainer = document.getElementById("alertContainer");

// State management
let isConnected = false;
let currentUID = null;

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  initializeWebSocket();
  setupFormHandlers();
});

// WebSocket initialization
function initializeWebSocket() {
  // Connection events
  socket.on("connect", function () {
    console.log("✅ Connected to server");
    isConnected = true;
    updateRFIDStatus(
      "connected",
      "Terhubung ke sistem RFID - Silakan scan kartu"
    );

    // Subscribe to RFID data
    socket.emit("subscribe_rfid");
  });

  socket.on("disconnect", function () {
    console.log("❌ Disconnected from server");
    isConnected = false;
    updateRFIDStatus(
      "error",
      "Koneksi terputus - Mencoba menghubungkan kembali..."
    );
  });

  socket.on("connect_error", function (error) {
    console.error("❌ Connection error:", error);
    updateRFIDStatus("error", "Gagal terhubung ke server");
  });

  // RFID data events
  socket.on("rfid_data", function (data) {
    console.log("📨 RFID data received:", data);
    handleRFIDData(data);
  });

  socket.on("rfid_result", function (result) {
    console.log("📋 RFID result:", result);
    handleRFIDResult(result);
  });
}

// Handle RFID data
function handleRFIDData(data) {
  if (data && data.uid) {
    currentUID = data.uid;
    uidInput.value = currentUID;

    updateRFIDStatus("connected", `UID diterima: ${currentUID}`);
    showAlert("success", `Kartu RFID berhasil dibaca! UID: ${currentUID}`);

    // Enable form if UID is received
    enableForm();
  }
}

// Handle RFID processing result
function handleRFIDResult(result) {
  if (result.action === "register_required") {
    // This is expected for new users
    showAlert("info", "Kartu RFID siap untuk registrasi user baru");
  } else if (result.success === false) {
    showAlert(
      "danger",
      result.message || "Terjadi kesalahan saat memproses kartu RFID"
    );
  }
}

// Update RFID status display
function updateRFIDStatus(status, message) {
  rfidStatus.className = `rfid-status rfid-${status}`;
  statusText.textContent = message;

  if (status === "waiting" || status === "error") {
    rfidStatus.classList.add("pulse");
  } else {
    rfidStatus.classList.remove("pulse");
  }
}

// Show alert message
function showAlert(type, message, autoHide = true) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
        <i class="bi bi-${getAlertIcon(type)} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

  alertContainer.appendChild(alertDiv);

  if (autoHide && type !== "danger") {
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, 5000);
  }
}

// Get alert icon based on type
function getAlertIcon(type) {
  const icons = {
    success: "check-circle-fill",
    danger: "exclamation-triangle-fill",
    warning: "exclamation-triangle-fill",
    info: "info-circle-fill",
  };
  return icons[type] || "info-circle-fill";
}

// Enable form after UID is received
function enableForm() {
  const formInputs = registrationForm.querySelectorAll("input:not([readonly])");
  formInputs.forEach((input) => {
    input.disabled = false;
  });
  submitBtn.disabled = false;
}

// Setup form handlers
function setupFormHandlers() {
  registrationForm.addEventListener("submit", handleFormSubmit);

  // Phone number formatting
  const phoneInput = document.getElementById("phone");
  phoneInput.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");

    // Add country code if not present
    if (value.length > 0 && !value.startsWith("62")) {
      if (value.startsWith("0")) {
        value = "62" + value.substring(1);
      } else if (value.startsWith("8")) {
        value = "62" + value;
      }
    }

    e.target.value = value;
  });

  // Real-time validation
  const requiredInputs = registrationForm.querySelectorAll("input[required]");
  requiredInputs.forEach((input) => {
    input.addEventListener("blur", validateInput);
    input.addEventListener("input", clearValidation);
  });
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!currentUID) {
    showAlert("warning", "Silakan scan kartu RFID terlebih dahulu");
    return;
  }

  if (!validateForm()) {
    return;
  }

  const formData = new FormData(registrationForm);
  const userData = {
    uid: currentUID,
    name: formData.get("name").trim(),
    email: formData.get("email").trim(),
    phone: formData.get("phone").trim(),
  };

  // Show loading state
  setLoadingState(true);

  try {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const result = await response.json();

    if (result.success) {
      showAlert(
        "success",
        "User berhasil didaftarkan! Buku otomatis dipinjam."
      );

      // Reset form after successful registration
      setTimeout(() => {
        resetForm();
      }, 2000);
    } else {
      showAlert("danger", result.message || "Gagal mendaftarkan user");
    }
  } catch (error) {
    console.error("Error submitting form:", error);
    showAlert("danger", "Terjadi kesalahan saat mengirim data");
  } finally {
    setLoadingState(false);
  }
}

// Validate individual input
function validateInput(e) {
  const input = e.target;
  const value = input.value.trim();

  // Remove existing validation classes
  input.classList.remove("is-valid", "is-invalid");

  let isValid = true;
  let message = "";

  if (input.hasAttribute("required") && !value) {
    isValid = false;
    message = "Field ini wajib diisi";
  } else if (input.type === "email" && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      isValid = false;
      message = "Format email tidak valid";
    }
  } else if (input.type === "tel" && value) {
    if (value.length < 10) {
      isValid = false;
      message = "Nomor telepon terlalu pendek";
    }
  }

  // Apply validation styling
  input.classList.add(isValid ? "is-valid" : "is-invalid");

  // Show/hide feedback
  let feedback = input.parentNode.querySelector(".invalid-feedback");
  if (!isValid) {
    if (!feedback) {
      feedback = document.createElement("div");
      feedback.className = "invalid-feedback";
      input.parentNode.appendChild(feedback);
    }
    feedback.textContent = message;
  } else if (feedback) {
    feedback.remove();
  }

  return isValid;
}

// Clear validation styling
function clearValidation(e) {
  const input = e.target;
  input.classList.remove("is-valid", "is-invalid");

  const feedback = input.parentNode.querySelector(".invalid-feedback");
  if (feedback) {
    feedback.remove();
  }
}

// Validate entire form
function validateForm() {
  const requiredInputs = registrationForm.querySelectorAll("input[required]");
  let isValid = true;

  requiredInputs.forEach((input) => {
    if (!validateInput({ target: input })) {
      isValid = false;
    }
  });

  return isValid;
}

// Set loading state
function setLoadingState(loading) {
  submitBtn.disabled = loading;

  if (loading) {
    submitBtn.innerHTML =
      '<span class="loading-spinner me-2"></span>Menyimpan...';
  } else {
    submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Simpan User';
  }
}

// Reset form
function resetForm() {
  registrationForm.reset();
  currentUID = null;
  uidInput.value = "";

  // Clear validation classes
  const inputs = registrationForm.querySelectorAll("input");
  inputs.forEach((input) => {
    input.classList.remove("is-valid", "is-invalid");
  });

  // Clear feedback messages
  const feedbacks = registrationForm.querySelectorAll(".invalid-feedback");
  feedbacks.forEach((feedback) => feedback.remove());

  // Clear alerts
  alertContainer.innerHTML = "";

  // Reset RFID status
  updateRFIDStatus("connected", "Siap untuk scan kartu RFID berikutnya");
}

// Utility functions
function formatPhoneNumber(phone) {
  // Format phone number for display
  if (phone.startsWith("62")) {
    return "+" + phone;
  }
  return phone;
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("id-ID");
}

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
  }
});

// Handle beforeunload
window.addEventListener("beforeunload", function () {
  if (socket.connected) {
    socket.disconnect();
  }
});
