/**
 * Popup script for TripLedger extension
 * Handles UI interactions, authentication state, and booking management
 */

import { setAuth, getAuth, clearAuth, getBookings, addBooking } from './storage.js';
import { apiLogin, apiSignup } from './api.js';

// View containers
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
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
    const result = await chrome.storage.local.get(['lastScreenshot', 'pendingScreenshot']);
    if (result.pendingScreenshot && result.lastScreenshot) {
      // There's a pending screenshot, show the preview
      showScreenshotPreview(result.lastScreenshot);
      // Clear the pending flag
      chrome.storage.local.remove('pendingScreenshot');
    } else if (result.lastScreenshot) {
      // Just restore the last screenshot in case user wants to use it
      lastScreenshotDataUrl = result.lastScreenshot;
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
  authView.classList.add('hidden');
  dashboardView.classList.add('hidden');
  screenshotPreviewView.classList.remove('hidden');
  manualFormView.classList.add('hidden');
  
  // Set preview image
  screenshotPreviewImage.src = dataUrl;
  lastScreenshotDataUrl = dataUrl;
}

/**
 * Show manual form view
 * @param {Object} options - Options object
 * @param {boolean} options.fromScreenshot - Whether form was opened from screenshot
 */
function showManualFormView({ fromScreenshot = false }) {
  authView.classList.add('hidden');
  dashboardView.classList.add('hidden');
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
 * Handle region screenshot
 */
function handleScreenshotRegion(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  screenshotOptions.classList.add('hidden');
  
  // Show loading state
  const originalText = btnScreenshotRegion.textContent;
  btnScreenshotRegion.disabled = true;
  btnScreenshotRegion.textContent = 'Preparing...';
  
  chrome.runtime.sendMessage(
    { type: "TAKE_REGION_SCREENSHOT" },
    (response) => {
      btnScreenshotRegion.disabled = false;
      btnScreenshotRegion.textContent = originalText;
      
      if (chrome.runtime.lastError) {
        console.error("Region screenshot error:", chrome.runtime.lastError);
        alert("Failed to start region selection: " + chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.ok) {
        // Region selection will be handled by content script
        // Mark as pending so we can show form when popup reopens
        chrome.storage.local.set({ pendingScreenshot: true });
        // Popup will close naturally, user will select region on page
        // When they reopen popup, checkForPendingScreenshot will handle it
        // But we also listen for SCREENSHOT_CAPTURED in case popup is still open
      } else {
        alert("Failed to start region selection: " + (response?.error || "Unknown error"));
      }
    }
  );
}

/**
 * Handle screenshot captured (from background)
 */
function handleScreenshotCaptured(message) {
  console.log("Screenshot captured:", message.mode);
  
  if (message.mode === "region" && message.region) {
    // Crop the full screenshot to the selected region
    cropDataUrlToRegion(message.dataUrl, message.region, (croppedDataUrl) => {
      const finalDataUrl = croppedDataUrl || message.dataUrl; // Fallback to full if crop fails
      chrome.storage.local.set({ 
        lastScreenshot: finalDataUrl,
        pendingScreenshot: true 
      });
      // Show preview instead of going directly to form
      showScreenshotPreview(finalDataUrl);
    });
  } else {
    // Fullscreen screenshot
    chrome.storage.local.set({ 
      lastScreenshot: message.dataUrl,
      pendingScreenshot: true 
    });
    // Show preview instead of going directly to form
    showScreenshotPreview(message.dataUrl);
  }
}

/**
 * Crop data URL to region
 */
function cropDataUrlToRegion(fullDataUrl, region, callback) {
  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = region.width;
      canvas.height = region.height;
      const ctx = canvas.getContext("2d");
      
      ctx.drawImage(
        img,
        region.x, region.y, region.width, region.height,
        0, 0, region.width, region.height
      );
      
      const cropped = canvas.toDataURL("image/png");
      callback(cropped);
    } catch (error) {
      console.error("Crop error:", error);
      callback(null); // Return null on error, will use fallback
    }
  };
  img.onerror = () => {
    console.error("Image load error");
    callback(null);
  };
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
    chrome.storage.local.remove(['pendingScreenshot', 'lastScreenshot']);
    
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
  chrome.storage.local.remove('lastScreenshot');
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
    await chrome.storage.local.remove(['lastScreenshot', 'pendingScreenshot']);
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
