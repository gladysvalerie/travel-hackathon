/**
 * Popup script for TripLedger extension
 * Handles UI interactions, authentication state, and booking management
 */

import { setAuth, getAuth, clearAuth, getBookings, addBooking } from './storage.js';
import { apiLogin, apiSignup } from './api.js';

// View containers
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const regionSelectionView = document.getElementById('region-selection-view');
const screenshotPreviewView = document.getElementById('screenshot-preview-view');
const manualFormView = document.getElementById('manual-form-view');

// Auth elements
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const showSignupBtn = document.getElementById('show-signup-btn');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const signupConfirmInput = document.getElementById('signup-confirm');
const signupBtn = document.getElementById('signup-btn');
const showLoginBtn = document.getElementById('show-login-btn');

// Dashboard elements
const userEmailSpan = document.getElementById('user-email');
const screenshotBtn = document.getElementById('btn-screenshot');
const screenshotOptions = document.getElementById('screenshot-options');
const btnScreenshotFull = document.getElementById('btn-screenshot-full');
const btnScreenshotRegion = document.getElementById('btn-screenshot-region');
const btnScreenshotCancel = document.getElementById('btn-screenshot-cancel');
const uploadBtn = document.getElementById('btn-upload');
const fileInput = document.getElementById('file-input');
const manualBtn = document.getElementById('btn-manual');
const recentBookingsList = document.getElementById('recent-bookings-list');

// Screenshot preview elements
const screenshotPreviewImage = document.getElementById('screenshot-preview-image');
const btnUseScreenshot = document.getElementById('btn-use-screenshot');
const btnRetakeScreenshot = document.getElementById('btn-retake-screenshot');

// Manual form elements
const screenshotStatus = document.getElementById('screenshot-status');
const formError = document.getElementById('manual-form-error');
const airlineInput = document.getElementById('field-airline');
const flightNumberInput = document.getElementById('field-flight-number');
const originInput = document.getElementById('field-origin');
const destinationInput = document.getElementById('field-destination');
const departureInput = document.getElementById('field-departure');
const arrivalInput = document.getElementById('field-arrival');
const priceInput = document.getElementById('field-price');
const currencyInput = document.getElementById('field-currency');
const referenceInput = document.getElementById('field-reference');
const notesInput = document.getElementById('field-notes');
const saveBookingBtn = document.getElementById('btn-save-booking');
const cancelBookingBtn = document.getElementById('btn-cancel-booking');

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
    const result = await chrome.storage.local.get(['lastScreenshot', 'pendingScreenshot', 'lastScreenshotRegion']);
    console.log("Checking for pending screenshot:", {
      hasPending: result.pendingScreenshot,
      hasScreenshot: !!result.lastScreenshot,
      hasRegion: !!result.lastScreenshotRegion,
      screenshotLength: result.lastScreenshot?.length
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
          usingFallback: !cropped 
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
          pendingScreenshot: false // Clear pending flag
        });
        chrome.storage.local.remove(['lastScreenshotRegion']);
        
        showScreenshotPreview(finalImage);
      });
    } else {
      console.log("Processing fullscreen screenshot");
      if (result.lastScreenshot) {
        showScreenshotPreview(result.lastScreenshot);
      }
      chrome.storage.local.remove('pendingScreenshot');
    }
  } catch (error) {
    console.error("Error checking for pending screenshot:", error);
  }
}

/**
 * Show auth view, hide others
 */
function showAuthView() {
  authView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
  regionSelectionView.classList.add('hidden');
  screenshotPreviewView.classList.add('hidden');
  manualFormView.classList.add('hidden');
}

/**
 * Show dashboard view, hide others
 */
async function showDashboardView() {
  const authData = await getAuth();
  if (authData) {
    userEmailSpan.textContent = authData.email;
  }
  
  authView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  regionSelectionView.classList.add('hidden');
  screenshotPreviewView.classList.add('hidden');
  manualFormView.classList.add('hidden');
  
  // Hide screenshot options if visible
  screenshotOptions.classList.add('hidden');
}

/**
 * Show screenshot preview view
 * @param {string} dataUrl - Screenshot data URL
 */
function showScreenshotPreview(dataUrl) {
  console.log("Showing screenshot preview:", { 
    dataUrlLength: dataUrl?.length,
    hasDataUrl: !!dataUrl 
  });
  
  if (!dataUrl) {
    console.error("No data URL provided to showScreenshotPreview!");
    alert("Screenshot data is missing. Please try again.");
    return;
  }
  
  authView.classList.add('hidden');
  dashboardView.classList.add('hidden');
  regionSelectionView.classList.add('hidden');
  screenshotPreviewView.classList.remove('hidden');
  manualFormView.classList.add('hidden');
  
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
  authView.classList.add('hidden');
  dashboardView.classList.add('hidden');
  regionSelectionView.classList.add('hidden');
  screenshotPreviewView.classList.add('hidden');
  manualFormView.classList.remove('hidden');
  
  // Update screenshot status
  if (fromScreenshot && lastScreenshotDataUrl) {
    screenshotStatus.textContent = "Screenshot captured. We'll use this later for AI extraction.";
    screenshotStatus.style.display = 'block';
  } else {
    screenshotStatus.textContent = "No screenshot; please fill the fields manually.";
    screenshotStatus.style.display = 'block';
  }
  
  // Clear form error
  formError.classList.add('hidden');
}


/**
 * Handle login form submission
 */
async function handleLogin() {
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;
  
  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }
  
  try {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    
    const response = await apiLogin(email, password);
    await setAuth(response.token, response.email);
    
    // Update UI
    await showDashboardView();
    await loadRecentBookings();
    
    // Clear form
    loginEmailInput.value = '';
    loginPasswordInput.value = '';
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed. Please try again.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log in';
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
    alert('Please fill in all fields');
    return;
  }
  
  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }
  
  try {
    signupBtn.disabled = true;
    signupBtn.textContent = 'Signing up...';
    
    const response = await apiSignup(email, password);
    await setAuth(response.token, response.email);
    
    // Update UI
    await showDashboardView();
    await loadRecentBookings();
    
    // Clear form
    signupEmailInput.value = '';
    signupPasswordInput.value = '';
    signupConfirmInput.value = '';
  } catch (error) {
    console.error('Signup error:', error);
    alert('Signup failed. Please try again.');
  } finally {
    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign up';
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
  screenshotOptions.classList.remove('hidden');
}

/**
 * Handle fullscreen screenshot
 */
function handleScreenshotFull(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  screenshotOptions.classList.add('hidden');
  
  // Show loading state
  const originalText = btnScreenshotFull.textContent;
  btnScreenshotFull.disabled = true;
  btnScreenshotFull.textContent = 'Capturing...';
  
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
    setTimeout(() => reject(new Error("Screenshot timeout after 10 seconds")), 10000);
  });
  
  Promise.race([messagePromise, timeoutPromise])
    .then((response) => {
      console.log("Screenshot response received:", response);
      btnScreenshotFull.disabled = false;
      btnScreenshotFull.textContent = originalText;
      
      if (response.ok && response.dataUrl) {
        console.log("Screenshot received, showing preview");
        // Store in chrome.storage.local
        chrome.storage.local.set({ 
          lastScreenshot: response.dataUrl,
          lastScreenshotRegion: null,
          pendingScreenshot: true 
        });
        // Show preview instead of going directly to form
        showScreenshotPreview(response.dataUrl);
      } else {
        console.error("Screenshot failed:", response);
        alert("Failed to capture screenshot: " + (response?.error || "Unknown error"));
      }
    })
    .catch((error) => {
      console.error("Screenshot error:", error);
      btnScreenshotFull.disabled = false;
      btnScreenshotFull.textContent = originalText;
      alert("Failed to capture screenshot: " + error.message);
    });
}

/**
 * Show region selection message view
 */
function showRegionSelectionMessage() {
  authView.classList.add('hidden');
  dashboardView.classList.add('hidden');
  screenshotPreviewView.classList.add('hidden');
  manualFormView.classList.add('hidden');
  regionSelectionView.classList.remove('hidden');
  
  // Start region selection immediately on the page (before closing popup)
  chrome.runtime.sendMessage(
    { type: "TAKE_REGION_SCREENSHOT" },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Region screenshot error:", chrome.runtime.lastError);
        alert("Failed to start region selection: " + chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.ok) {
        // Mark as pending so we can show preview when popup reopens
        chrome.storage.local.set({ pendingScreenshot: true });
        
        // Start progress bar animation
        const progressBar = document.getElementById('region-progress-bar');
        progressBar.classList.add('animating');
        
        // After 1 second, close popup (overlay is already showing on the page)
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        alert("Failed to start region selection: " + (response?.error || "Unknown error"));
      }
    }
  );
}

/**
 * Handle region screenshot
 */
function handleScreenshotRegion(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  screenshotOptions.classList.add('hidden');
  
  // Show region selection message view with progress bar
  showRegionSelectionMessage();
}

/**
 * Handle screenshot captured (from background)
 */
function handleScreenshotCaptured(message) {
  console.log("Screenshot captured:", message.mode, message.region ? "with region" : "fullscreen");
  
  if (message.mode === "region" && message.region) {
    // Crop the full screenshot to the selected region
    console.log("Cropping region screenshot with region:", message.region);
    cropDataUrlToRegion(message.dataUrl, message.region, (croppedDataUrl) => {
      console.log("Region crop complete:", {
        cropped: !!croppedDataUrl,
        croppedLength: croppedDataUrl?.length,
        usingFallback: !croppedDataUrl
      });
      
      const finalDataUrl = croppedDataUrl || message.dataUrl; // Fallback to full if crop fails
      
      // Store the cropped image
      chrome.storage.local.set({ 
        lastScreenshot: finalDataUrl,
        pendingScreenshot: false // Clear pending since we're showing it now
      });
      chrome.storage.local.remove(['lastScreenshotRegion']);
      
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
    chrome.storage.local.set({ 
      lastScreenshot: message.dataUrl,
      pendingScreenshot: false 
    });
    chrome.storage.local.remove(['lastScreenshotRegion']);
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
    region: region 
  });
  
  if (!fullDataUrl || !region) {
    console.error("Missing data for cropping:", { fullDataUrl: !!fullDataUrl, region: !!region });
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
        devicePixelRatio: window.devicePixelRatio || 1
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
        console.error("Invalid crop dimensions:", { finalX, finalY, finalWidth, finalHeight });
        callback(null);
        return;
      }
      
      console.log("Crop calculations:", {
        scale,
        estimatedViewportWidth,
        estimatedViewportHeight,
        regionCoords: { x: region.x, y: region.y, width: region.width, height: region.height },
        cropCoords: { cropX, cropY, cropWidth, cropHeight },
        finalCoords: { finalX, finalY, finalWidth, finalHeight },
        imgDimensions: { imgWidth, imgHeight }
      });
      
      // Create canvas for cropped image - output at original viewport size
      const canvas = document.createElement("canvas");
      canvas.width = region.width;
      canvas.height = region.height;
      const ctx = canvas.getContext("2d");
      
      // Set image smoothing for better quality when scaling down
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw cropped region - scale down from screenshot size to viewport size
      ctx.drawImage(
        img,
        finalX, finalY, finalWidth, finalHeight, // Source rectangle (from screenshot at devicePixelRatio scale)
        0, 0, region.width, region.height // Destination rectangle (viewport size)
      );
      
      const cropped = canvas.toDataURL("image/png");
      console.log("Crop successful:", { 
        croppedLength: cropped.length,
        outputSize: { width: region.width, height: region.height }
      });
      
      if (cropped && cropped.length > 100) { // Basic validation - data URL should be substantial
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
  screenshotOptions.classList.add('hidden');
}

/**
 * Handle upload button click
 */
function handleUpload() {
  fileInput.click();
}

/**
 * Handle file input change
 */
function handleFileChange(event) {
  const file = event.target.files[0];
  if (file) {
    console.log("File selected:", file.name);
    alert(`File selected: ${file.name}\nUpload functionality coming soon.`);
    event.target.value = '';
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
  saveBookingBtn.addEventListener('click', async () => {
    await handleSaveBooking();
  });
  
  cancelBookingBtn.addEventListener('click', () => {
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
  const currency = currencyInput.value.trim() || "TWD";
  const reference = referenceInput.value.trim();
  const notes = notesInput.value.trim();
  
  // Validation
  if (!airline || !flightNumber || !origin || !destination || !departureDateTime || !price) {
    formError.textContent = "Please fill in all required fields (*)";
    formError.classList.remove('hidden');
    return;
  }
  
  if (isNaN(price) || Number(price) <= 0) {
    formError.textContent = "Please enter a valid price";
    formError.classList.remove('hidden');
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
    screenshotAttached: !!lastScreenshotDataUrl
  };
  
  try {
    // Save booking
    await addBooking(booking);
    
    // Clear form and screenshot
    clearManualForm();
    
    // Clear pending screenshot flag
    chrome.storage.local.remove(['pendingScreenshot', 'lastScreenshot', 'lastScreenshotRegion']);
    
    // Show success message (simple alert for now)
    // In production, could show a toast or inline message
    alert("Booking saved!");
    
    // Return to dashboard
    await showDashboardView();
    await loadRecentBookings();
  } catch (error) {
    console.error("Save booking error:", error);
    formError.textContent = "Failed to save booking. Please try again.";
    formError.classList.remove('hidden');
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
 * Clear manual form
 */
function clearManualForm() {
  airlineInput.value = '';
  flightNumberInput.value = '';
  originInput.value = '';
  destinationInput.value = '';
  departureInput.value = '';
  arrivalInput.value = '';
  priceInput.value = '';
  currencyInput.value = 'TWD';
  referenceInput.value = '';
  notesInput.value = '';
  formError.classList.add('hidden');
  lastScreenshotDataUrl = null;
  chrome.storage.local.remove(['lastScreenshot', 'lastScreenshotRegion']);
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
    recentBookingsList.innerHTML = '';
    
    if (recentBookings.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty-state';
      li.textContent = 'No bookings yet';
      recentBookingsList.appendChild(li);
    } else {
      recentBookings.forEach(booking => {
        const li = document.createElement('li');
        
        // Format: "TPE → NRT · 2025-07-16 · 8,200 TWD"
        const date = new Date(booking.departureDateTime).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const priceFormatted = new Intl.NumberFormat().format(booking.price);
        const route = `${booking.origin} → ${booking.destination}`;
        
        li.textContent = `${route} · ${date} · ${priceFormatted} ${booking.currency}`;
        recentBookingsList.appendChild(li);
      });
    }
  } catch (error) {
    console.error("Load bookings error:", error);
    recentBookingsList.innerHTML = '<li class="empty-state">Error loading bookings</li>';
  }
}

/**
 * Attach all event listeners
 */
function attachEventListeners() {
  // Auth view toggles
  showSignupBtn.addEventListener('click', () => {
    loginView.classList.add('hidden');
    signupView.classList.remove('hidden');
  });
  
  showLoginBtn.addEventListener('click', () => {
    signupView.classList.add('hidden');
    loginView.classList.remove('hidden');
  });
  
  // Form submissions
  loginBtn.addEventListener('click', handleLogin);
  loginPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  
  signupBtn.addEventListener('click', handleSignup);
  signupConfirmInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSignup();
  });
  
  // Dashboard action buttons
  screenshotBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleScreenshot(e);
  });
  btnScreenshotFull.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleScreenshotFull(e);
  });
  btnScreenshotRegion.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleScreenshotRegion(e);
  });
  btnScreenshotCancel.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleScreenshotCancel(e);
  });
  uploadBtn.addEventListener('click', handleUpload);
  fileInput.addEventListener('change', handleFileChange);
  manualBtn.addEventListener('click', handleManual);
  
  // Screenshot preview handlers
  btnUseScreenshot.addEventListener('click', () => {
    if (lastScreenshotDataUrl) {
      showManualFormView({ fromScreenshot: true });
    }
  });
  
  btnRetakeScreenshot.addEventListener('click', async () => {
    // Clear screenshot and go back to dashboard
    lastScreenshotDataUrl = null;
    await chrome.storage.local.remove(['lastScreenshot', 'pendingScreenshot', 'lastScreenshotRegion']);
    await showDashboardView();
  });
  
  // Manual form handlers
  setupManualFormHandlers();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
