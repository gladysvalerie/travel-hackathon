/**
 * Popup script for TripLedger extension
 * Handles UI interactions, authentication state, and booking management
 */

import {
  setAuth,
  getAuth,
  clearAuth,
  getBookings,
  addBooking,
} from "./storage.js";
import { apiLogin, apiSignup } from "./api.js";
import { analyzeBookingScreenshot } from "./aiClient.js";

// View containers
const authView = document.getElementById("auth-view");
const dashboardView = document.getElementById("dashboard-view");
const regionSelectionView = document.getElementById("region-selection-view");
const screenshotPreviewView = document.getElementById(
  "screenshot-preview-view"
);
const manualFormView = document.getElementById("manual-form-view");

// Auth elements
const loginView = document.getElementById("login-view");
const signupView = document.getElementById("signup-view");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const showSignupBtn = document.getElementById("show-signup-btn");
const signupEmailInput = document.getElementById("signup-email");
const signupPasswordInput = document.getElementById("signup-password");
const signupConfirmInput = document.getElementById("signup-confirm");
const signupBtn = document.getElementById("signup-btn");
const showLoginBtn = document.getElementById("show-login-btn");

// Dashboard elements
const userEmailSpan = document.getElementById("user-email");
const screenshotBtn = document.getElementById("btn-screenshot");
const screenshotOptions = document.getElementById("screenshot-options");
const btnScreenshotFull = document.getElementById("btn-screenshot-full");
const btnScreenshotRegion = document.getElementById("btn-screenshot-region");
const btnScreenshotCancel = document.getElementById("btn-screenshot-cancel");
const uploadBtn = document.getElementById("btn-upload");
const fileInput = document.getElementById("file-input");
const manualBtn = document.getElementById("btn-manual");
const recentBookingsList = document.getElementById("recent-bookings-list");

// Screenshot preview elements
const screenshotPreviewImage = document.getElementById(
  "screenshot-preview-image"
);
const btnUseScreenshot = document.getElementById("btn-use-screenshot");
const btnRetakeScreenshot = document.getElementById("btn-retake-screenshot");

// Manual form elements
const screenshotStatus = document.getElementById("screenshot-status");
const formError = document.getElementById("manual-form-error");
const airlineInput = document.getElementById("field-airline");
const flightNumberInput = document.getElementById("field-flight-number");
const originInput = document.getElementById("field-origin");
const destinationInput = document.getElementById("field-destination");
const departureInput = document.getElementById("field-departure");
const arrivalInput = document.getElementById("field-arrival");
const priceInput = document.getElementById("field-price");
const currencyInput = document.getElementById("field-currency");
const referenceInput = document.getElementById("field-reference");
const notesInput = document.getElementById("field-notes");
const saveBookingBtn = document.getElementById("btn-save-booking");
const cancelBookingBtn = document.getElementById("btn-cancel-booking");

// AI extraction elements
const aiFillBtn = document.getElementById("btn-ai-fill");
const aiStatus = document.getElementById("ai-status");

// Profile elements
const profileSection = document.getElementById("profile-section");
const profileModal = document.getElementById("profile-modal");
const profileModalClose = document.getElementById("profile-modal-close");
const profileLogoutBtn = document.getElementById("profile-logout-btn");

// Screenshot data storage
let lastScreenshotDataUrl = null;

/**
 * Initialize popup on load
 */
async function init() {
  // Check if user is logged in
  const auth = await getAuth();

  if (auth) {
    await showDashboardView();
    await loadRecentBookings();

    // Check if there's a pending screenshot from a previous session
    await checkForPendingScreenshot();
  } else {
    showAuthView();
  }

  // Attach event listeners
  attachEventListeners();

  // Listen for messages from background script (for screenshot capture)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SCREENSHOT_CAPTURED") {
      handleScreenshotCaptured(message);
      sendResponse({ ok: true });
    }
    return true;
  });
}

/**
 * Check for pending screenshot from previous session
 */
async function checkForPendingScreenshot() {
  try {
    const result = await chrome.storage.local.get([
      "lastScreenshot",
      "pendingScreenshot",
      "lastScreenshotRegion",
    ]);
    console.log("Checking for pending screenshot:", {
      hasPending: result.pendingScreenshot,
      hasScreenshot: !!result.lastScreenshot,
      hasRegion: !!result.lastScreenshotRegion,
      screenshotLength: result.lastScreenshot?.length,
    });

    const hasPending = result.pendingScreenshot && result.lastScreenshot;

    if (!hasPending) {
      if (result.lastScreenshot) {
        lastScreenshotDataUrl = result.lastScreenshot;
      }
      return;
    }

    const region = result.lastScreenshotRegion;

    if (region && region.width && region.height) {
      console.log("Processing region screenshot with region:", region);
      cropDataUrlToRegion(result.lastScreenshot, region, (cropped) => {
        console.log("Crop callback received:", {
          cropped: !!cropped,
          croppedLength: cropped?.length,
          usingFallback: !cropped,
        });

        const finalImage = cropped || result.lastScreenshot;

        if (!finalImage) {
          console.error("No image to preview!");
          alert("Failed to process screenshot. Please try again.");
          return;
        }

        // Store the cropped image
        chrome.storage.local.set({
          lastScreenshot: finalImage,
          pendingScreenshot: false, // Clear pending flag
        });
        chrome.storage.local.remove(["lastScreenshotRegion"]);

        showScreenshotPreview(finalImage);
      });
    } else {
      console.log("Processing fullscreen screenshot");
      if (result.lastScreenshot) {
        showScreenshotPreview(result.lastScreenshot);
      }
      chrome.storage.local.remove("pendingScreenshot");
    }
  } catch (error) {
    console.error("Error checking for pending screenshot:", error);
  }
}

/**
 * Show auth view, hide others
 */
function showAuthView() {
  authView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
  regionSelectionView.classList.add("hidden");
  screenshotPreviewView.classList.add("hidden");
  manualFormView.classList.add("hidden");
}

/**
 * Show dashboard view, hide others
 */
async function showDashboardView() {
  const authData = await getAuth();
  if (authData) {
    userEmailSpan.textContent = authData.email;
  }

  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  regionSelectionView.classList.add("hidden");
  screenshotPreviewView.classList.add("hidden");
  manualFormView.classList.add("hidden");

  // Hide screenshot options if visible
  screenshotOptions.classList.add("hidden");
}

/**
 * Show screenshot preview view
 * @param {string} dataUrl - Screenshot data URL
 */
function showScreenshotPreview(dataUrl) {
  console.log("Showing screenshot preview:", {
    dataUrlLength: dataUrl?.length,
    hasDataUrl: !!dataUrl,
  });

  if (!dataUrl) {
    console.error("No data URL provided to showScreenshotPreview!");
    alert("Screenshot data is missing. Please try again.");
    return;
  }

  authView.classList.add("hidden");
  dashboardView.classList.add("hidden");
  regionSelectionView.classList.add("hidden");
  screenshotPreviewView.classList.remove("hidden");
  manualFormView.classList.add("hidden");

  // Set preview image with error handling
  screenshotPreviewImage.onload = () => {
    console.log("Preview image loaded successfully");
    lastScreenshotDataUrl = dataUrl;
  };

  screenshotPreviewImage.onerror = (error) => {
    console.error("Preview image failed to load:", error);
    alert("Failed to load screenshot preview. Please try again.");
  };

  screenshotPreviewImage.src = dataUrl;
}

/**
 * Show manual form view
 * @param {Object} options - Options object
 * @param {boolean} options.fromScreenshot - Whether form was opened from screenshot
 */
function showManualFormView({ fromScreenshot = false }) {
  authView.classList.add("hidden");
  dashboardView.classList.add("hidden");
  regionSelectionView.classList.add("hidden");
  screenshotPreviewView.classList.add("hidden");
  manualFormView.classList.remove("hidden");

  // Update screenshot status
  if (fromScreenshot && lastScreenshotDataUrl) {
    screenshotStatus.textContent =
      "Screenshot captured. You can try 'Extract from screenshot (beta)' to prefill this form, or fill in everything manually.";
    screenshotStatus.style.display = "block";
  } else {
    screenshotStatus.textContent =
      "No screenshot; please fill the fields manually.";
    screenshotStatus.style.display = "block";
  }

  // Clear form error and AI status
  formError.classList.add("hidden");
  if (aiStatus) {
    aiStatus.textContent = "";
    aiStatus.className = "ai-status";
  }
}

/**
 * Handle login form submission
 */
async function handleLogin() {
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }

  try {
    loginBtn.disabled = true;
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<span class="loading-spinner"></span> Logging in...';

    const response = await apiLogin(email, password);
    await setAuth(response.token, response.email);

    // Update profile display
    updateProfileDisplay(response.email);

    // Update UI
    await showDashboardView();
    await loadRecentBookings();

    // Clear form
    loginEmailInput.value = "";
    loginPasswordInput.value = "";
  } catch (error) {
    console.error("Login error:", error);
    alert("Login failed. Please try again.");
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML =
      '<span class="btn-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span> Log in';
  }
}

/**
 * Handle signup form submission
 */
async function handleSignup() {
  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value;
  const confirmPassword = signupConfirmInput.value;

  if (!email || !password || !confirmPassword) {
    alert("Please fill in all fields");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  try {
    signupBtn.disabled = true;
    const originalText = signupBtn.innerHTML;
    signupBtn.innerHTML = '<span class="loading-spinner"></span> Signing up...';

    const response = await apiSignup(email, password);
    await setAuth(response.token, response.email);

    // Update profile display
    updateProfileDisplay(response.email);

    // Update UI
    await showDashboardView();
    await loadRecentBookings();

    // Clear form
    signupEmailInput.value = "";
    signupPasswordInput.value = "";
    signupConfirmInput.value = "";
  } catch (error) {
    console.error("Signup error:", error);
    alert("Signup failed. Please try again.");
  } finally {
    signupBtn.disabled = false;
    signupBtn.innerHTML =
      '<span class="btn-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Sign up';
  }
}

/**
 * Update profile display with user info
 */
function updateProfileDisplay(email) {
  if (!email) return;

  // Extract name from email (or use email as fallback)
  const name = email.split("@")[0];
  const initials = name.substring(0, 2).toUpperCase();

  // Update profile section
  const profileNameEl = document.getElementById("profile-name");
  const profileEmailEl = document.getElementById("profile-email-display");
  const profilePictureEl = document.getElementById("profile-picture");

  if (profileNameEl) {
    profileNameEl.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  }
  if (profileEmailEl) {
    profileEmailEl.textContent = email;
  }
  if (profilePictureEl) {
    profilePictureEl.textContent = initials;
  }

  // Update modal
  const modalNameEl = document.getElementById("profile-modal-name");
  const modalEmailEl = document.getElementById("profile-modal-email");
  const modalPictureEl = document.getElementById("profile-modal-picture");

  if (modalNameEl) {
    modalNameEl.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  }
  if (modalEmailEl) {
    modalEmailEl.textContent = email;
  }
  if (modalPictureEl) {
    modalPictureEl.textContent = initials;
  }
}

/**
 * Handle screenshot button click - show options
 */
function handleScreenshot(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  screenshotOptions.classList.remove("hidden");
}

/**
 * Handle fullscreen screenshot
 */
function handleScreenshotFull(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  screenshotOptions.classList.add("hidden");

  // Show loading state
  const originalText = btnScreenshotFull.innerHTML;
  btnScreenshotFull.disabled = true;
  btnScreenshotFull.classList.add("loading");
  btnScreenshotFull.innerHTML =
    '<span class="loading-spinner"></span> Capturing...';

  console.log("Sending TAKE_FULLSCREEN_SCREENSHOT message...");

  // Use Promise-based approach for better error handling
  const messagePromise = new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "TAKE_FULLSCREEN_SCREENSHOT" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Screenshot error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        if (response) {
          resolve(response);
        } else {
          reject(new Error("No response received"));
        }
      }
    );
  });

  // Add timeout fallback
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("Screenshot timeout after 10 seconds")),
      10000
    );
  });

  Promise.race([messagePromise, timeoutPromise])
    .then((response) => {
      console.log("Screenshot response received:", response);
      btnScreenshotFull.disabled = false;
      btnScreenshotFull.classList.remove("loading");
      btnScreenshotFull.innerHTML = originalText;

      if (response.ok && response.dataUrl) {
        console.log("Screenshot received, showing preview");
        // Store in chrome.storage.local
        chrome.storage.local.set({
          lastScreenshot: response.dataUrl,
          lastScreenshotRegion: null,
          pendingScreenshot: true,
        });
        // Show preview instead of going directly to form
        showScreenshotPreview(response.dataUrl);
      } else {
        console.error("Screenshot failed:", response);
        alert(
          "Failed to capture screenshot: " +
            (response?.error || "Unknown error")
        );
      }
    })
    .catch((error) => {
      console.error("Screenshot error:", error);
      btnScreenshotFull.disabled = false;
      btnScreenshotFull.classList.remove("loading");
      btnScreenshotFull.innerHTML = originalText;
      alert("Failed to capture screenshot: " + error.message);
    });
}

/**
 * Show region selection message view
 */
function showRegionSelectionMessage() {
  authView.classList.add("hidden");
  dashboardView.classList.add("hidden");
  screenshotPreviewView.classList.add("hidden");
  manualFormView.classList.add("hidden");
  regionSelectionView.classList.remove("hidden");

  // Start region selection immediately on the page (before closing popup)
  chrome.runtime.sendMessage({ type: "TAKE_REGION_SCREENSHOT" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Region screenshot error:", chrome.runtime.lastError);
      alert(
        "Failed to start region selection: " + chrome.runtime.lastError.message
      );
      return;
    }

    if (response && response.ok) {
      // Mark as pending so we can show preview when popup reopens
      chrome.storage.local.set({ pendingScreenshot: true });

      // Start progress bar animation
      const progressBar = document.getElementById("region-progress-bar");
      progressBar.classList.add("animating");

      // After 1 second, close popup (overlay is already showing on the page)
      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      alert(
        "Failed to start region selection: " +
          (response?.error || "Unknown error")
      );
    }
  });
}

/**
 * Handle region screenshot
 */
function handleScreenshotRegion(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  screenshotOptions.classList.add("hidden");

  // Show region selection message view with progress bar
  showRegionSelectionMessage();
}

/**
 * Handle screenshot captured (from background)
 */
function handleScreenshotCaptured(message) {
  console.log(
    "Screenshot captured:",
    message.mode,
    message.region ? "with region" : "fullscreen"
  );

  if (message.mode === "region" && message.region) {
    // Crop the full screenshot to the selected region
    console.log("Cropping region screenshot with region:", message.region);
    cropDataUrlToRegion(message.dataUrl, message.region, (croppedDataUrl) => {
      console.log("Region crop complete:", {
        cropped: !!croppedDataUrl,
        croppedLength: croppedDataUrl?.length,
        usingFallback: !croppedDataUrl,
      });

      const finalDataUrl = croppedDataUrl || message.dataUrl; // Fallback to full if crop fails

      // Store the cropped image
      lastScreenshotDataUrl = finalDataUrl; // Set the variable
      chrome.storage.local.set({
        lastScreenshot: finalDataUrl,
        pendingScreenshot: false, // Clear pending since we're showing it now
      });
      chrome.storage.local.remove(["lastScreenshotRegion"]);

      // Show preview
      if (finalDataUrl) {
        showScreenshotPreview(finalDataUrl);
      } else {
        console.error("No cropped image to show!");
        alert("Failed to process screenshot. Please try again.");
      }
    });
  } else {
    // Fullscreen screenshot
    console.log("Showing fullscreen screenshot");
    lastScreenshotDataUrl = message.dataUrl; // Set the variable
    chrome.storage.local.set({
      lastScreenshot: message.dataUrl,
      pendingScreenshot: false,
    });
    chrome.storage.local.remove(["lastScreenshotRegion"]);
    // Show preview
    showScreenshotPreview(message.dataUrl);
  }
}

/**
 * Crop data URL to region
 * Accounts for device pixel ratio and ensures clean cropping
 */
function cropDataUrlToRegion(fullDataUrl, region, callback) {
  console.log("Starting crop with:", {
    dataUrlLength: fullDataUrl?.length,
    region: region,
  });

  if (!fullDataUrl || !region) {
    console.error("Missing data for cropping:", {
      fullDataUrl: !!fullDataUrl,
      region: !!region,
    });
    callback(null);
    return;
  }

  const img = new Image();

  img.onload = () => {
    try {
      // Get the actual image dimensions
      const imgWidth = img.width;
      const imgHeight = img.height;

      console.log("Image loaded:", {
        imgWidth,
        imgHeight,
        region,
        devicePixelRatio: window.devicePixelRatio || 1,
      });

      // Chrome's captureVisibleTab returns image at devicePixelRatio scale
      // The region coordinates are in viewport pixels (not scaled)
      // We need to scale region coordinates to match screenshot pixel dimensions
      const scale = region.scale || window.devicePixelRatio || 1;

      // Calculate the actual scale by comparing screenshot dimensions to expected viewport size
      // We can infer viewport size from screenshot dimensions divided by scale
      const estimatedViewportWidth = imgWidth / scale;
      const estimatedViewportHeight = imgHeight / scale;

      // Use the scale factor directly (it's already the devicePixelRatio from content script)
      const cropX = Math.round(region.x * scale);
      const cropY = Math.round(region.y * scale);
      const cropWidth = Math.round(region.width * scale);
      const cropHeight = Math.round(region.height * scale);

      // Ensure we don't go out of bounds
      const finalX = Math.max(0, Math.min(cropX, imgWidth));
      const finalY = Math.max(0, Math.min(cropY, imgHeight));
      const finalWidth = Math.min(cropWidth, imgWidth - finalX);
      const finalHeight = Math.min(cropHeight, imgHeight - finalY);

      // Ensure minimum dimensions
      if (finalWidth <= 0 || finalHeight <= 0) {
        console.error("Invalid crop dimensions:", {
          finalX,
          finalY,
          finalWidth,
          finalHeight,
        });
        callback(null);
        return;
      }

      console.log("Crop calculations:", {
        scale,
        estimatedViewportWidth,
        estimatedViewportHeight,
        regionCoords: {
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
        },
        cropCoords: { cropX, cropY, cropWidth, cropHeight },
        finalCoords: { finalX, finalY, finalWidth, finalHeight },
        imgDimensions: { imgWidth, imgHeight },
      });

      // Create canvas for cropped image - output at original viewport size
      const canvas = document.createElement("canvas");
      canvas.width = region.width;
      canvas.height = region.height;
      const ctx = canvas.getContext("2d");

      // Set image smoothing for better quality when scaling down
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw cropped region - scale down from screenshot size to viewport size
      ctx.drawImage(
        img,
        finalX,
        finalY,
        finalWidth,
        finalHeight, // Source rectangle (from screenshot at devicePixelRatio scale)
        0,
        0,
        region.width,
        region.height // Destination rectangle (viewport size)
      );

      const cropped = canvas.toDataURL("image/png");
      console.log("Crop successful:", {
        croppedLength: cropped.length,
        outputSize: { width: region.width, height: region.height },
      });

      if (cropped && cropped.length > 100) {
        // Basic validation - data URL should be substantial
        callback(cropped);
      } else {
        console.error("Cropped image seems invalid (too small)");
        callback(null);
      }
    } catch (error) {
      console.error("Crop error:", error, error.stack);
      callback(null);
    }
  };

  img.onerror = (error) => {
    console.error("Image load error:", error);
    callback(null);
  };

  // Set source after error handlers are attached
  img.src = fullDataUrl;
}

/**
 * Handle screenshot cancel
 */
function handleScreenshotCancel(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  screenshotOptions.classList.add("hidden");
}

/**
 * Handle upload button click
 */
function handleUpload() {
  fileInput.click();
}

/**
 * Convert file to data URL
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Handle file input change - process PDF or image with OpenAI
 */
async function handleFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  const validTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
  ];
  const validExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
  const fileExtension = "." + file.name.split(".").pop().toLowerCase();

  if (
    !validTypes.includes(file.type) &&
    !validExtensions.includes(fileExtension)
  ) {
    alert(
      "Invalid file type. Please upload a PDF or image file (PNG, JPG, GIF, WEBP)."
    );
    event.target.value = "";
    return;
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    alert("File is too large. Please upload a file smaller than 10MB.");
    event.target.value = "";
    return;
  }

  try {
    // Show loading state
    uploadBtn.disabled = true;
    const originalText = uploadBtn.innerHTML;
    uploadBtn.classList.add("loading");
    uploadBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';

    // Convert file to data URL
    console.log("Processing file:", file.name, file.type, file.size);
    const dataUrl = await fileToDataUrl(file);

    // Store the file data
    lastScreenshotDataUrl = dataUrl;
    chrome.storage.local.set({
      lastScreenshot: dataUrl,
      pendingScreenshot: true,
    });

    // Show manual form view
    showManualFormView({ fromScreenshot: true });

    // Update status message
    if (screenshotStatus) {
      screenshotStatus.textContent = `File uploaded: ${file.name}. Click "Extract from screenshot" to analyze with AI.`;
    }

    // Automatically trigger AI extraction
    setTimeout(() => {
      if (aiFillBtn && !aiFillBtn.disabled) {
        handleAiFillFromScreenshot();
      }
    }, 500);
  } catch (error) {
    console.error("File processing error:", error);
    alert("Failed to process file. Please try again.");
  } finally {
    // Reset file input
    event.target.value = "";
    // Restore button state
    uploadBtn.disabled = false;
    uploadBtn.classList.remove("loading");
    uploadBtn.innerHTML =
      originalText ||
      '<span class="btn-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span> Upload file';
  }
}

/**
 * Handle manual entry button click
 */
function handleManual() {
  showManualFormView({ fromScreenshot: false });
}

/**
 * Setup manual form handlers
 */
function setupManualFormHandlers() {
  saveBookingBtn.addEventListener("click", async () => {
    await handleSaveBooking();
  });

  cancelBookingBtn.addEventListener("click", () => {
    handleCancelBooking();
  });
}

/**
 * Handle save booking
 */
async function handleSaveBooking() {
  // Read form values
  const airline = airlineInput.value.trim();
  const flightNumber = flightNumberInput.value.trim();
  const origin = originInput.value.trim();
  const destination = destinationInput.value.trim();
  const departureDateTime = departureInput.value;
  const arrivalDateTime = arrivalInput.value;
  const price = priceInput.value;
  const currency = currencyInput ? currencyInput.value || "TWD" : "TWD";
  const reference = referenceInput.value.trim();
  const notes = notesInput.value.trim();

  // Validation
  if (
    !airline ||
    !flightNumber ||
    !origin ||
    !destination ||
    !departureDateTime ||
    !price
  ) {
    formError.textContent = "Please fill in all required fields (*)";
    formError.classList.remove("hidden");
    return;
  }

  if (isNaN(price) || Number(price) <= 0) {
    formError.textContent = "Please enter a valid price";
    formError.classList.remove("hidden");
    return;
  }

  // Create booking object
  const booking = {
    airline,
    flightNumber,
    origin,
    destination,
    departureDateTime,
    arrivalDateTime,
    price: Number(price),
    currency,
    reference,
    notes,
    createdAt: new Date().toISOString(),
    screenshotAttached: !!lastScreenshotDataUrl,
  };

  try {
    // Save booking
    await addBooking(booking);

    // Clear form and screenshot
    clearManualForm();

    // Clear pending screenshot flag
    chrome.storage.local.remove([
      "pendingScreenshot",
      "lastScreenshot",
      "lastScreenshotRegion",
    ]);

    // Show success message (simple alert for now)
    // In production, could show a toast or inline message
    alert("Booking saved!");

    // Return to dashboard
    await showDashboardView();
    await loadRecentBookings();
  } catch (error) {
    console.error("Save booking error:", error);
    formError.textContent = "Failed to save booking. Please try again.";
    formError.classList.remove("hidden");
  }
}

/**
 * Handle cancel booking
 */
async function handleCancelBooking() {
  clearManualForm();
  await showDashboardView();
}

/**
 * Handle AI fill from screenshot
 */
async function handleAiFillFromScreenshot() {
  // Check if screenshot is available
  if (!lastScreenshotDataUrl) {
    // Try to get from storage
    const result = await chrome.storage.local.get(["lastScreenshot"]);
    if (result.lastScreenshot) {
      lastScreenshotDataUrl = result.lastScreenshot;
    } else {
      if (aiStatus) {
        aiStatus.textContent =
          "No screenshot available. Please capture a booking screenshot first.";
        aiStatus.className = "ai-status error";
      }
      return;
    }
  }

  // Show loading state
  const originalText = aiFillBtn.innerHTML;
  aiFillBtn.disabled = true;
  aiFillBtn.classList.add("loading");
  aiFillBtn.innerHTML = '<span class="loading-spinner"></span> Extracting...';

  if (aiStatus) {
    aiStatus.textContent = "Analyzing screenshot with AI...";
    aiStatus.className = "ai-status loading";
  }

  try {
    console.log(
      "Starting AI extraction with screenshot length:",
      lastScreenshotDataUrl.length
    );

    // Call AI analysis
    const data = await analyzeBookingScreenshot(lastScreenshotDataUrl);

    console.log("AI extraction result:", data);

    // Prefill form fields from AI response
    let fieldsFilled = 0;

    if (data.airline && airlineInput) {
      airlineInput.value = data.airline;
      fieldsFilled++;
      console.log("Filled airline:", data.airline);
    }

    if (data.flight_number && flightNumberInput) {
      flightNumberInput.value = data.flight_number;
      fieldsFilled++;
      console.log("Filled flight number:", data.flight_number);
    }

    if (data.origin && originInput) {
      originInput.value = data.origin;
      fieldsFilled++;
      console.log("Filled origin:", data.origin);
    }

    if (data.destination && destinationInput) {
      destinationInput.value = data.destination;
      fieldsFilled++;
      console.log("Filled destination:", data.destination);
    }

    // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:MM)
    if (data.departure_datetime && departureInput) {
      try {
        const depDate = new Date(data.departure_datetime);
        if (!isNaN(depDate.getTime())) {
          // Format: YYYY-MM-DDTHH:MM
          const year = depDate.getFullYear();
          const month = String(depDate.getMonth() + 1).padStart(2, "0");
          const day = String(depDate.getDate()).padStart(2, "0");
          const hours = String(depDate.getHours()).padStart(2, "0");
          const minutes = String(depDate.getMinutes()).padStart(2, "0");
          departureInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
          fieldsFilled++;
          console.log("Filled departure:", departureInput.value);
        }
      } catch (dateError) {
        console.error("Error parsing departure datetime:", dateError);
      }
    }

    if (data.arrival_datetime && arrivalInput) {
      try {
        const arrDate = new Date(data.arrival_datetime);
        if (!isNaN(arrDate.getTime())) {
          const year = arrDate.getFullYear();
          const month = String(arrDate.getMonth() + 1).padStart(2, "0");
          const day = String(arrDate.getDate()).padStart(2, "0");
          const hours = String(arrDate.getHours()).padStart(2, "0");
          const minutes = String(arrDate.getMinutes()).padStart(2, "0");
          arrivalInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
          fieldsFilled++;
          console.log("Filled arrival:", arrivalInput.value);
        }
      } catch (dateError) {
        console.error("Error parsing arrival datetime:", dateError);
      }
    }

    if (data.price !== null && data.price !== undefined && priceInput) {
      priceInput.value = data.price;
      fieldsFilled++;
      console.log("Filled price:", data.price);
    }

    if (data.currency && currencyInput) {
      // Handle both input and select elements
      if (currencyInput.tagName === "SELECT") {
        currencyInput.value = data.currency.toUpperCase();
      } else {
        currencyInput.value = data.currency.toUpperCase();
      }
      fieldsFilled++;
      console.log("Filled currency:", data.currency);
    }

    if (data.booking_reference && referenceInput) {
      referenceInput.value = data.booking_reference;
      fieldsFilled++;
      console.log("Filled booking reference:", data.booking_reference);
    }

    // Append notes if present
    if (data.notes && notesInput) {
      const existingNotes = notesInput.value.trim();
      if (existingNotes) {
        notesInput.value = existingNotes + "\n\n[AI Extracted]: " + data.notes;
      } else {
        notesInput.value = "[AI Extracted]: " + data.notes;
      }
      fieldsFilled++;
      console.log("Filled notes");
    }

    // Update status message
    if (aiStatus) {
      if (fieldsFilled > 0) {
        aiStatus.textContent = `Fields updated (${fieldsFilled} fields filled). Please double-check everything before saving.`;
        aiStatus.className = "ai-status success";
      } else {
        aiStatus.textContent =
          "AI analysis completed but no fields could be extracted. Please fill manually.";
        aiStatus.className = "ai-status";
      }
    }

    console.log("AI extraction completed. Fields filled:", fieldsFilled);
  } catch (error) {
    console.error("AI extraction error:", error);

    if (aiStatus) {
      aiStatus.textContent =
        error.message ||
        "AI extraction failed. Please try again or fill manually.";
      aiStatus.className = "ai-status error";
    }
  } finally {
    // Restore button state
    aiFillBtn.disabled = false;
    aiFillBtn.classList.remove("loading");
    aiFillBtn.innerHTML = originalText;
  }
}

/**
 * Clear manual form
 */
function clearManualForm() {
  airlineInput.value = "";
  flightNumberInput.value = "";
  originInput.value = "";
  destinationInput.value = "";
  departureInput.value = "";
  arrivalInput.value = "";
  priceInput.value = "";
  // Handle both input and select for currency
  if (currencyInput && currencyInput.tagName === "SELECT") {
    currencyInput.value = "TWD";
  } else if (currencyInput) {
    currencyInput.value = "TWD";
  }
  referenceInput.value = "";
  notesInput.value = "";
  formError.classList.add("hidden");

  // Clear AI status
  if (aiStatus) {
    aiStatus.textContent = "";
    aiStatus.className = "ai-status";
  }

  lastScreenshotDataUrl = null;
  chrome.storage.local.remove(["lastScreenshot", "lastScreenshotRegion"]);
}

/**
 * Load and display recent bookings
 */
async function loadRecentBookings() {
  try {
    const bookings = await getBookings();

    // Sort by createdAt descending (newest first)
    const sortedBookings = bookings.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Take last 3
    const recentBookings = sortedBookings.slice(0, 3);

    // Clear list
    recentBookingsList.innerHTML = "";

    if (recentBookings.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-state";
      li.textContent = "No bookings yet";
      recentBookingsList.appendChild(li);
    } else {
      recentBookings.forEach((booking) => {
        const li = document.createElement("li");

        // Format: "TPE → NRT · 2025-07-16 · 8,200 TWD"
        const date = new Date(booking.departureDateTime).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }
        );
        const priceFormatted = new Intl.NumberFormat().format(booking.price);
        const route = `${booking.origin} → ${booking.destination}`;

        li.textContent = `${route} · ${date} · ${priceFormatted} ${booking.currency}`;
        recentBookingsList.appendChild(li);
      });
    }
  } catch (error) {
    console.error("Load bookings error:", error);
    recentBookingsList.innerHTML =
      '<li class="empty-state">Error loading bookings</li>';
  }
}

/**
 * Attach all event listeners
 */
function attachEventListeners() {
  // Auth view toggles
  showSignupBtn.addEventListener("click", () => {
    loginView.classList.add("hidden");
    signupView.classList.remove("hidden");
  });

  showLoginBtn.addEventListener("click", () => {
    signupView.classList.add("hidden");
    loginView.classList.remove("hidden");
  });

  // Form submissions
  loginBtn.addEventListener("click", handleLogin);
  loginPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleLogin();
  });

  signupBtn.addEventListener("click", handleSignup);
  signupConfirmInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSignup();
  });

  // Dashboard action buttons
  screenshotBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleScreenshot(e);
  });
  btnScreenshotFull.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleScreenshotFull(e);
  });
  btnScreenshotRegion.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleScreenshotRegion(e);
  });
  btnScreenshotCancel.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleScreenshotCancel(e);
  });
  uploadBtn.addEventListener("click", handleUpload);
  fileInput.addEventListener("change", handleFileChange);
  manualBtn.addEventListener("click", handleManual);

  // Screenshot preview handlers
  btnUseScreenshot.addEventListener("click", async () => {
    // Make sure we have the screenshot data
    if (!lastScreenshotDataUrl) {
      const result = await chrome.storage.local.get(["lastScreenshot"]);
      if (result.lastScreenshot) {
        lastScreenshotDataUrl = result.lastScreenshot;
      }
    }

    if (lastScreenshotDataUrl) {
      showManualFormView({ fromScreenshot: true });
    } else {
      alert("No screenshot available. Please capture a screenshot first.");
    }
  });

  btnRetakeScreenshot.addEventListener("click", async () => {
    // Clear screenshot and go back to dashboard
    lastScreenshotDataUrl = null;
    await chrome.storage.local.remove([
      "lastScreenshot",
      "pendingScreenshot",
      "lastScreenshotRegion",
    ]);
    await showDashboardView();
  });

  // Manual form handlers
  setupManualFormHandlers();

  // AI extraction handler
  if (aiFillBtn) {
    aiFillBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleAiFillFromScreenshot();
    });
  }

  // Profile handlers
  if (profileSection) {
    profileSection.addEventListener("click", () => {
      if (profileModal) {
        profileModal.classList.add("active");
      }
    });
  }

  if (profileModalClose) {
    profileModalClose.addEventListener("click", () => {
      if (profileModal) {
        profileModal.classList.remove("active");
      }
    });
  }

  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener("click", async () => {
      await clearAuth();
      if (profileModal) {
        profileModal.classList.remove("active");
      }
      showAuthView();
    });
  }

  // Close modal on background click
  if (profileModal) {
    profileModal.addEventListener("click", (e) => {
      if (e.target === profileModal) {
        profileModal.classList.remove("active");
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
