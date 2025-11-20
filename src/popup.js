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
import { apiLogin, apiSignup, saveBookingToServer } from "./api.js";
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
const userEmailSpan = document.getElementById("user-email"); // May not exist in new layout

// Tab elements
const tabAdd = document.getElementById("tab-add");
const tabHistory = document.getElementById("tab-history");
const tabAddContent = document.getElementById("tab-add-content");
const tabHistoryContent = document.getElementById("tab-history-content");

// Home view elements
const homeView = document.getElementById("home-view");
const btnCategoryFlight = document.getElementById("btn-category-flight");
const btnCategoryHotel = document.getElementById("btn-category-hotel");
const btnCategoryRestaurant = document.getElementById("btn-category-restaurant");
const btnCategoryAttraction = document.getElementById("btn-category-attraction");

// Category actions view elements
const categoryActionsView = document.getElementById("category-actions-view");
const categoryActionsTitle = document.getElementById("category-actions-title");
const btnCategoryScreenshot = document.getElementById("btn-category-screenshot");
const btnCategoryUpload = document.getElementById("btn-category-upload");
const btnCategoryManual = document.getElementById("btn-category-manual");
const btnCategoryBack = document.getElementById("btn-category-back");
const screenshotOptions = document.getElementById("screenshot-options");
const btnScreenshotFull = document.getElementById("btn-screenshot-full");
const btnScreenshotRegion = document.getElementById("btn-screenshot-region");
const btnScreenshotCancel = document.getElementById("btn-screenshot-cancel");
const fileInput = document.getElementById("file-input");

// History view elements
const historyView = document.getElementById("history-view");
const historyList = document.getElementById("history-list");
const historyFilterAll = document.getElementById("history-filter-all");
const historyFilterFlight = document.getElementById("history-filter-flight");
const historyFilterHotel = document.getElementById("history-filter-hotel");
const historyFilterRestaurant = document.getElementById("history-filter-restaurant");
const historyFilterAttraction = document.getElementById("history-filter-attraction");

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

// Current category type
let currentCategoryType = null;

// Extracted dishes for restaurant bookings
let extractedDishes = [];

/**
 * Save all form data for the current category
 */
function saveFormData() {
  if (!currentCategoryType || manualFormView.classList.contains("hidden")) {
    return; // Not in a form view
  }

  const formData = {};
  const formElement = document.getElementById(`manual-form-${currentCategoryType}`);
  if (!formElement) return;

  // Get all inputs, selects, and textareas in the form
  const inputs = formElement.querySelectorAll('input:not([type="file"]), select, textarea');
  inputs.forEach(input => {
    if (input.id) {
      if (input.type === 'checkbox') {
        formData[input.id] = input.checked;
      } else if (input.type === 'number') {
        formData[input.id] = input.value ? parseFloat(input.value) : '';
      } else {
        formData[input.id] = input.value;
      }
    }
  });

  // Save dishes for restaurant
  if (currentCategoryType === "restaurant") {
    formData.dishes = extractedDishes || [];
  }

  chrome.storage.local.set({
    [`formData_${currentCategoryType}`]: formData
  });
}

/**
 * Restore all form data for the current category
 */
function restoreFormData() {
  if (!currentCategoryType || manualFormView.classList.contains("hidden")) {
    return; // Not in a form view
  }

  chrome.storage.local.get([`formData_${currentCategoryType}`], (result) => {
    const formData = result[`formData_${currentCategoryType}`];
    if (!formData) return;

    // Restore all form fields
    Object.keys(formData).forEach(fieldId => {
      if (fieldId === 'dishes') {
        // Handle dishes separately
        if (currentCategoryType === "restaurant" && Array.isArray(formData.dishes)) {
          extractedDishes = formData.dishes;
          renderDishesList();
        }
        return;
      }

      const field = document.getElementById(fieldId);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = formData[fieldId];
        } else if (field.type === 'number') {
          field.value = formData[fieldId] || '';
        } else {
          field.value = formData[fieldId] || '';
        }
      }
    });
  });
}

/**
 * Save current view state to storage
 */
function saveViewState() {
  // Determine current view
  let currentView = "home";
  let activeTab = "add";
  
  // First, check which tab is active
  const isHistoryTabActive = tabHistory && tabHistory.classList.contains("active");
  const isAddTabActive = tabAdd && tabAdd.classList.contains("active");
  
  if (isHistoryTabActive || (tabHistoryContent && !tabHistoryContent.classList.contains("hidden"))) {
    // We're on the History tab
    currentView = "history";
    activeTab = "history";
  } else if (isAddTabActive || (tabAddContent && !tabAddContent.classList.contains("hidden"))) {
    // We're on the Add tab - check which view within Add tab
    if (!manualFormView.classList.contains("hidden")) {
      currentView = "manualForm";
    } else if (!categoryActionsView.classList.contains("hidden")) {
      currentView = "categoryActions";
    } else if (!screenshotPreviewView.classList.contains("hidden")) {
      currentView = "screenshotPreview";
    } else if (!homeView.classList.contains("hidden")) {
      currentView = "home";
    }
    activeTab = "add";
  } else {
    // Fallback: check views directly (for backward compatibility)
    if (!manualFormView.classList.contains("hidden")) {
      currentView = "manualForm";
    } else if (!categoryActionsView.classList.contains("hidden")) {
      currentView = "categoryActions";
    } else if (!screenshotPreviewView.classList.contains("hidden")) {
      currentView = "screenshotPreview";
    } else if (!homeView.classList.contains("hidden")) {
      currentView = "home";
    }
  }

  // Save form data if in manual form
  if (currentView === "manualForm" && currentCategoryType) {
    saveFormData();
  }

  chrome.storage.local.set({
    lastViewState: {
      view: currentView,
      categoryType: currentCategoryType,
      activeTab: activeTab,
      inManualFormWithScreenshot: !manualFormView.classList.contains("hidden") && !!lastScreenshotDataUrl,
    },
  });
}

/**
 * Restore view state from storage
 */
async function restoreViewState() {
  try {
    const result = await chrome.storage.local.get(["lastViewState"]);
    const state = result.lastViewState;

    if (!state) {
      return false; // No saved state
    }

    console.log("Restoring view state:", state);

    // Restore category type
    if (state.categoryType) {
      currentCategoryType = state.categoryType;
    }

    // Restore active tab
    if (state.activeTab === "history") {
      if (tabHistory) tabHistory.classList.add("active");
      if (tabAdd) tabAdd.classList.remove("active");
      if (tabHistoryContent) tabHistoryContent.classList.remove("hidden");
      if (tabAddContent) tabAddContent.classList.add("hidden");
    } else {
      if (tabAdd) tabAdd.classList.add("active");
      if (tabHistory) tabHistory.classList.remove("active");
      if (tabAddContent) tabAddContent.classList.remove("hidden");
      if (tabHistoryContent) tabHistoryContent.classList.add("hidden");
    }

    // Restore screenshot data if available
    const screenshotResult = await chrome.storage.local.get(["lastScreenshot"]);
    if (screenshotResult.lastScreenshot) {
      lastScreenshotDataUrl = screenshotResult.lastScreenshot;
    }

    // Restore the specific view
    if (state.view === "manualForm") {
      // Restore manual form (with or without screenshot)
      if (state.categoryType) {
        // Hide dashboard and other views first
        if (dashboardView) dashboardView.classList.add("hidden");
        if (authView) authView.classList.add("hidden");
        if (regionSelectionView) regionSelectionView.classList.add("hidden");
        if (screenshotPreviewView) screenshotPreviewView.classList.add("hidden");
        if (categoryActionsView) categoryActionsView.classList.add("hidden");
        if (homeView) homeView.classList.add("hidden");
        
        const fromScreenshot = state.inManualFormWithScreenshot && !!lastScreenshotDataUrl;
        showManualFormView(state.categoryType, { fromScreenshot });
        manualFormView.classList.remove("hidden");
        screenshotPreviewView.classList.add("hidden");
        // Ensure we're on Add tab
        if (tabAddContent) tabAddContent.classList.remove("hidden");
        if (tabHistoryContent) tabHistoryContent.classList.add("hidden");
        if (tabAdd) tabAdd.classList.add("active");
        if (tabHistory) tabHistory.classList.remove("active");
        
        // Restore form data after a short delay to ensure form is rendered
        setTimeout(() => {
          restoreFormData();
        }, 100);
        
        return true;
      }
    } else if (state.view === "categoryActions" && state.categoryType) {
      showCategoryActionsView(state.categoryType);
      return true;
    } else if (state.view === "screenshotPreview") {
      const screenshotResult = await chrome.storage.local.get(["lastScreenshot"]);
      if (screenshotResult.lastScreenshot) {
        showScreenshotPreview(screenshotResult.lastScreenshot);
        return true;
      }
    } else if (state.view === "history") {
      await showHistoryView();
      return true;
    } else if (state.view === "home") {
      showHomeView();
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error restoring view state:", error);
    return false;
  }
}

/**
 * Clear view state (e.g., when saving booking or explicitly navigating away)
 */
function clearViewState() {
  chrome.storage.local.remove(["lastViewState"]);
}

/**
 * Initialize popup on load
 */
async function init() {
  // Check if user is logged in
  const auth = await getAuth();

  if (auth) {
    // Try to restore previous view state FIRST, before showing dashboard
    const stateRestored = await restoreViewState();
    
    // Only show dashboard if we didn't restore to a specific view
    if (!stateRestored) {
      await showDashboardView();
      await checkForPendingScreenshot();
    } else {
      // If we restored to a view, still update profile display but don't change views
      const authData = await getAuth();
      if (authData && userEmailSpan) {
        userEmailSpan.textContent = authData.email;
      }
      
      // If we restored to manual form, check for screenshot but don't show preview
      const screenshotResult = await chrome.storage.local.get(["lastScreenshot", "pendingScreenshot"]);
      if (screenshotResult.lastScreenshot) {
        lastScreenshotDataUrl = screenshotResult.lastScreenshot;
        // Clear pending flag if we're already in manual form
        if (screenshotResult.pendingScreenshot && !manualFormView.classList.contains("hidden")) {
          chrome.storage.local.set({ pendingScreenshot: false });
        }
      }
    }
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

  // Save view state when popup is about to close
  window.addEventListener("beforeunload", () => {
    saveViewState();
  });

  // Also save state periodically and on navigation
  setInterval(() => {
    saveViewState();
  }, 2000); // Save every 2 seconds
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
      "lastViewState",
    ]);
    console.log("Checking for pending screenshot:", {
      hasPending: result.pendingScreenshot,
      hasScreenshot: !!result.lastScreenshot,
      hasRegion: !!result.lastScreenshotRegion,
      screenshotLength: result.lastScreenshot?.length,
      inManualForm: result.lastViewState?.inManualFormWithScreenshot,
    });

    // If we're already in manual form with screenshot, don't show preview
    if (result.lastViewState?.inManualFormWithScreenshot) {
      if (result.lastScreenshot) {
        lastScreenshotDataUrl = result.lastScreenshot;
      }
      // Clear pending flag since we're already past the preview stage
      if (result.pendingScreenshot) {
        chrome.storage.local.set({ pendingScreenshot: false });
      }
      return;
    }

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
  if (authData && userEmailSpan) {
    userEmailSpan.textContent = authData.email;
  }

  if (authView) authView.classList.add("hidden");
  if (dashboardView) {
    dashboardView.classList.remove("hidden");
  }
  if (regionSelectionView) {
    regionSelectionView.classList.add("hidden");
  }
  if (screenshotPreviewView) {
    screenshotPreviewView.classList.add("hidden");
  }
  if (manualFormView) {
    manualFormView.classList.add("hidden");
  }
  if (categoryActionsView) {
    categoryActionsView.classList.add("hidden");
  }

  // Show home view by default
  showHomeView();

  // Hide screenshot options if visible
  if (screenshotOptions) {
    screenshotOptions.classList.add("hidden");
  }
}

/**
 * Show home view (category grid)
 */
function showHomeView() {
  // Ensure dashboard view is visible
  if (authView) authView.classList.add("hidden");
  if (dashboardView) dashboardView.classList.remove("hidden");
  if (regionSelectionView) regionSelectionView.classList.add("hidden");
  if (screenshotPreviewView) screenshotPreviewView.classList.add("hidden");
  if (manualFormView) manualFormView.classList.add("hidden");
  
  // Show home view and hide category actions
  if (homeView) homeView.classList.remove("hidden");
  if (categoryActionsView) categoryActionsView.classList.add("hidden");
  if (tabAddContent) tabAddContent.classList.remove("hidden");
  if (tabHistoryContent) tabHistoryContent.classList.add("hidden");
  if (tabAdd) tabAdd.classList.add("active");
  if (tabHistory) tabHistory.classList.remove("active");
  
  // Hide screenshot options if visible
  if (screenshotOptions) {
    screenshotOptions.classList.add("hidden");
  }
  
  // Save view state
  saveViewState();
}

/**
 * Show category actions view
 * @param {string} categoryType - Category type: "flight" | "hotel" | "restaurant" | "attraction"
 */
function showCategoryActionsView(categoryType) {
  currentCategoryType = categoryType;
  
  const categoryNames = {
    flight: "Flight",
    hotel: "Hotel",
    restaurant: "Restaurant",
    attraction: "Attraction"
  };
  
  // Button labels per category
  const buttonLabels = {
    flight: {
      screenshot: "Screenshot booking",
      upload: "Upload file (PDF / image)",
      manual: "Enter manually"
    },
    hotel: {
      screenshot: "Screenshot booking",
      upload: "Upload file (PDF / image)",
      manual: "Enter manually"
    },
    restaurant: {
      screenshot: "Screenshot receipt",
      upload: "Upload receipt (PDF / image)",
      manual: "Enter manually"
    },
    attraction: {
      screenshot: "Screenshot ticket",
      upload: "Upload ticket (PDF / image)",
      manual: "Enter manually"
    }
  };
  
  if (categoryActionsTitle) {
    try {
      categoryActionsTitle.textContent = `Add ${categoryNames[categoryType]} booking`;
    } catch (e) {
      console.warn("Failed to update category actions title:", e);
    }
  }
  
  // Update button labels (preserve icon, only update text span)
  const labels = buttonLabels[categoryType] || buttonLabels.flight;
  if (btnCategoryScreenshot) {
    try {
      let textSpan = btnCategoryScreenshot.querySelector('.btn-text');
      if (!textSpan) {
        textSpan = document.createElement('span');
        textSpan.className = 'btn-text';
        btnCategoryScreenshot.appendChild(textSpan);
      }
      if (textSpan) {
        textSpan.textContent = labels.screenshot;
      }
    } catch (e) {
      console.warn("Failed to update screenshot button label:", e);
    }
  }
  if (btnCategoryUpload) {
    try {
      let textSpan = btnCategoryUpload.querySelector('.btn-text');
      if (!textSpan) {
        textSpan = document.createElement('span');
        textSpan.className = 'btn-text';
        btnCategoryUpload.appendChild(textSpan);
      }
      if (textSpan) {
        textSpan.textContent = labels.upload;
      }
    } catch (e) {
      console.warn("Failed to update upload button label:", e);
    }
  }
  if (btnCategoryManual) {
    try {
      let textSpan = btnCategoryManual.querySelector('.btn-text');
      if (!textSpan) {
        textSpan = document.createElement('span');
        textSpan.className = 'btn-text';
        btnCategoryManual.appendChild(textSpan);
      }
      if (textSpan) {
        textSpan.textContent = labels.manual;
      }
    } catch (e) {
      console.warn("Failed to update manual button label:", e);
    }
  }
  
  // Ensure dashboard view is visible
  if (authView) authView.classList.add("hidden");
  if (dashboardView) dashboardView.classList.remove("hidden");
  if (regionSelectionView) regionSelectionView.classList.add("hidden");
  if (screenshotPreviewView) screenshotPreviewView.classList.add("hidden");
  if (manualFormView) manualFormView.classList.add("hidden");
  
  // Show category actions and hide home
  if (homeView) homeView.classList.add("hidden");
  if (categoryActionsView) categoryActionsView.classList.remove("hidden");
  
  // Ensure we're on the Add tab
  if (tabAddContent) tabAddContent.classList.remove("hidden");
  if (tabHistoryContent) tabHistoryContent.classList.add("hidden");
  if (tabAdd) tabAdd.classList.add("active");
  if (tabHistory) tabHistory.classList.remove("active");
  
  // Save view state
  saveViewState();
}

/**
 * Show history view
 */
async function showHistoryView() {
  if (tabAddContent) tabAddContent.classList.add("hidden");
  if (tabHistoryContent) tabHistoryContent.classList.remove("hidden");
  if (tabAdd) tabAdd.classList.remove("active");
  if (tabHistory) tabHistory.classList.add("active");
  await loadHistoryBookings();
  
  // Save view state
  saveViewState();
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

  if (authView) authView.classList.add("hidden");
  if (dashboardView) dashboardView.classList.add("hidden");
  if (regionSelectionView) regionSelectionView.classList.add("hidden");
  if (screenshotPreviewView) screenshotPreviewView.classList.remove("hidden");
  if (manualFormView) manualFormView.classList.add("hidden");

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
  
  // Save view state
  saveViewState();
}

/**
 * Show manual form view
 * @param {string} categoryType - Category type: "flight" | "hotel" | "restaurant" | "attraction"
 * @param {Object} options - Options object
 * @param {boolean} options.fromScreenshot - Whether form was opened from screenshot
 */
function showManualFormView(categoryType, { fromScreenshot = false }) {
  currentCategoryType = categoryType;
  
  const categoryNames = {
    flight: "Flight",
    hotel: "Hotel",
    restaurant: "Restaurant",
    attraction: "Attraction"
  };
  
  const titleElement = document.getElementById("manual-form-title");
  if (titleElement) {
    titleElement.textContent = `Add ${categoryNames[categoryType]} booking`;
  }
  
  // Hide all forms
  document.getElementById("manual-form-flight")?.classList.add("hidden");
  document.getElementById("manual-form-hotel")?.classList.add("hidden");
  document.getElementById("manual-form-restaurant")?.classList.add("hidden");
  document.getElementById("manual-form-attraction")?.classList.add("hidden");
  
  // Show the correct form
  const formElement = document.getElementById(`manual-form-${categoryType}`);
  if (formElement) {
    formElement.classList.remove("hidden");
  }
  
  // Show/hide AI actions (for flight, hotel, and restaurant)
  const aiActionsContainer = document.getElementById("ai-actions-container");
  if (aiActionsContainer) {
    if (categoryType === "flight" || categoryType === "hotel" || categoryType === "restaurant") {
      aiActionsContainer.classList.remove("hidden");
    } else {
      aiActionsContainer.classList.add("hidden");
    }
  }
  if (authView) authView.classList.add("hidden");
  if (dashboardView) dashboardView.classList.add("hidden");
  if (regionSelectionView) regionSelectionView.classList.add("hidden");
  if (screenshotPreviewView) screenshotPreviewView.classList.add("hidden");
  if (manualFormView) manualFormView.classList.remove("hidden");

  // Update screenshot status and AI button text based on file type
  if (screenshotStatus) {
    if (fromScreenshot && lastScreenshotDataUrl) {
      const isPdf = lastScreenshotDataUrl.startsWith("data:application/pdf");
      const fileType = isPdf ? "PDF" : "image";
      screenshotStatus.textContent =
        `${fileType === "PDF" ? "PDF" : "Screenshot"} captured. You can try '${isPdf ? "Analyze PDF" : "Analyze image"}' to prefill this form, or fill in everything manually.`;
      screenshotStatus.style.display = "block";
    } else {
      screenshotStatus.textContent =
        "No screenshot; please fill the fields manually.";
      screenshotStatus.style.display = "block";
    }
  }

  // Update AI button text based on file type
  if (aiFillBtn) {
    const isPdf = lastScreenshotDataUrl && lastScreenshotDataUrl.startsWith("data:application/pdf");
    const buttonText = lastScreenshotDataUrl 
      ? (isPdf ? "Analyze PDF" : "Analyze image")
      : "Extract from screenshot";
    
    // Find or create the text span
    let buttonTextElement = aiFillBtn.querySelector('.btn-text');
    if (!buttonTextElement) {
      // Create text span if it doesn't exist
      buttonTextElement = document.createElement('span');
      buttonTextElement.className = 'btn-text';
      const icon = aiFillBtn.querySelector('.btn-icon') || aiFillBtn.querySelector('svg');
      if (icon && icon.parentNode) {
        icon.parentNode.insertBefore(buttonTextElement, icon.nextSibling);
      } else {
        aiFillBtn.appendChild(buttonTextElement);
      }
    }
    buttonTextElement.textContent = buttonText;
  }

  // Clear form error and AI status
  if (formError) {
    formError.classList.add("hidden");
  }
  if (aiStatus) {
    aiStatus.textContent = "";
    aiStatus.className = "ai-status";
  }
  
  // Render dishes list if we have dishes (for restaurant)
  if (categoryType === "restaurant") {
    renderDishesList();
  }
  
  // Save view state (we're in manual form, possibly with screenshot)
  saveViewState();
}

/**
 * Handle login form submission
 * Bypassed for now - accepts any input (even empty)
 */
async function handleLogin() {
  console.log("handleLogin called");
  
  // Get email from input or use default
  const email = (loginEmailInput && loginEmailInput.value.trim()) || "user@example.com";
  const finalEmail = email || "user@example.com";

  try {
    console.log("Logging in with email:", finalEmail);
    
    if (loginBtn) {
      loginBtn.disabled = true;
      const originalText = loginBtn.innerHTML;
      loginBtn.innerHTML = '<span class="loading-spinner"></span> Logging in...';
    }

    // Directly set auth without API call - bypass all validation
    await setAuth("FAKE_TOKEN", finalEmail);
    console.log("Auth set successfully");

    // Update profile display (wrapped in try-catch to prevent errors from blocking login)
    try {
      updateProfileDisplay(finalEmail);
    } catch (profileError) {
      console.warn("Profile display update failed (non-critical):", profileError);
    }

    // Update UI
    await showDashboardView();
    console.log("Dashboard shown");

    // Clear form
    if (loginEmailInput) loginEmailInput.value = "";
    if (loginPasswordInput) loginPasswordInput.value = "";
  } catch (error) {
    console.error("Login error:", error);
    alert("Login failed: " + error.message);
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.innerHTML =
        '<span class="btn-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span> Log in';
    }
  }
}

/**
 * Handle signup form submission
 * Bypassed for now - accepts any input
 */
async function handleSignup() {
  const email = signupEmailInput.value.trim() || "user@example.com";
  const password = signupPasswordInput.value || "password";
  const confirmPassword = signupConfirmInput.value || "password";

  // Bypass validation - just use the email provided or default
  const finalEmail = email || "user@example.com";

  try {
    if (signupBtn) {
      signupBtn.disabled = true;
      const originalText = signupBtn.innerHTML;
      signupBtn.innerHTML = '<span class="loading-spinner"></span> Signing up...';
    }

    // Directly set auth without API call
    await setAuth("FAKE_TOKEN", finalEmail);

    // Update profile display (wrapped in try-catch to prevent errors from blocking signup)
    try {
      updateProfileDisplay(finalEmail);
    } catch (profileError) {
      console.warn("Profile display update failed (non-critical):", profileError);
    }

    // Update UI
    await showDashboardView();

    // Clear form
    if (signupEmailInput) signupEmailInput.value = "";
    if (signupPasswordInput) signupPasswordInput.value = "";
    if (signupConfirmInput) signupConfirmInput.value = "";
  } catch (error) {
    console.error("Signup error:", error);
    alert("Signup failed. Please try again.");
  } finally {
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.innerHTML =
        '<span class="btn-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Sign up';
    }
  }
}

/**
 * Update profile display with user info
 */
function updateProfileDisplay(email) {
  if (!email) {
    console.warn("updateProfileDisplay called without email");
    return;
  }

  try {
    // Extract name from email (or use email as fallback)
    const name = email.split("@")[0];
    const initials = name.substring(0, 2).toUpperCase();

    // Update profile section (safely check if elements exist)
    const profileNameEl = document.getElementById("profile-name");
    const profileEmailEl = document.getElementById("profile-email-display");
    const profilePictureEl = document.getElementById("profile-picture");

    if (profileNameEl) {
      profileNameEl.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    } else {
      console.warn("profile-name element not found");
    }
    
    if (profileEmailEl) {
      profileEmailEl.textContent = email;
    } else {
      console.warn("profile-email-display element not found");
    }
    
    if (profilePictureEl) {
      profilePictureEl.textContent = initials;
    } else {
      console.warn("profile-picture element not found");
    }

    // Update modal (safely check if elements exist)
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
  } catch (error) {
    console.error("Error updating profile display:", error);
    // Don't throw - just log the error so login can continue
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

  // Add timeout fallback (longer for full page screenshots)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("Screenshot timeout after 30 seconds")),
      30000
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
      if (progressBar) {
        progressBar.classList.add("animating");
      }

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
 * Supports both images and PDFs
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      // Validate that we got a valid data URL
      if (dataUrl && (dataUrl.startsWith('data:image/') || dataUrl.startsWith('data:application/pdf'))) {
        resolve(dataUrl);
      } else {
        reject(new Error("Invalid file format. Please upload an image (PNG, JPG, etc.) or PDF file."));
      }
    };
    reader.onerror = (e) => reject(new Error("Failed to read file: " + (e.target.error?.message || "Unknown error")));
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
    // Convert file to data URL
    console.log("Processing file:", file.name, file.type, file.size);
    const dataUrl = await fileToDataUrl(file);

    // Store the file data
    lastScreenshotDataUrl = dataUrl;
    chrome.storage.local.set({
      lastScreenshot: dataUrl,
      pendingScreenshot: false, // Clear pending since we're going directly to manual form
    });

    // Show manual form view
    if (currentCategoryType) {
      showManualFormView(currentCategoryType, { fromScreenshot: true });
      manualFormView.classList.remove("hidden");
      categoryActionsView.classList.add("hidden");
      // Save view state
      saveViewState();
    } else {
      // Fallback to flight if no category selected
      showManualFormView("flight", { fromScreenshot: true });
      manualFormView.classList.remove("hidden");
      categoryActionsView.classList.add("hidden");
      // Save view state
      saveViewState();
    }

    // Update status message
    if (screenshotStatus) {
      screenshotStatus.textContent = `File uploaded: ${file.name}. Click "Extract from screenshot" to analyze with AI.`;
    }

    // Automatically trigger AI extraction (only for flight)
    if (currentCategoryType === "flight") {
      setTimeout(() => {
        if (aiFillBtn && !aiFillBtn.disabled) {
          handleAiFillFromScreenshot();
        }
      }, 500);
    }
  } catch (error) {
    console.error("File processing error:", error);
    alert("Failed to process file. Please try again.");
  } finally {
    // Reset file input
    event.target.value = "";
  }
}

/**
 * Handle manual entry button click
 */
function handleManual() {
  if (currentCategoryType) {
    showManualFormView(currentCategoryType, { fromScreenshot: false });
    manualFormView.classList.remove("hidden");
    categoryActionsView.classList.add("hidden");
    // Save view state
    saveViewState();
  }
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

  // Dish management for restaurant
  const btnAddDish = document.getElementById("btn-add-dish");
  if (btnAddDish) {
    btnAddDish.addEventListener("click", (e) => {
      e.preventDefault();
      addDish();
    });
  }

  // Allow Enter key to add dish
  const dishNameInput = document.getElementById("dish-name-input");
  const dishPriceInput = document.getElementById("dish-price-input");
  if (dishNameInput) {
    dishNameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addDish();
      }
    });
  }
  if (dishPriceInput) {
    dishPriceInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addDish();
      }
    });
  }

  // Auto-save form data on input changes
  const formElement = document.getElementById(`manual-form-${currentCategoryType}`);
  if (formElement) {
    const inputs = formElement.querySelectorAll('input:not([type="file"]), select, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        saveFormData();
      });
      input.addEventListener('change', () => {
        saveFormData();
      });
    });
  }
}

/**
 * Save booking from form
 * @param {string} categoryType - Category type
 */
async function saveBookingFromForm(categoryType) {
  if (!categoryType) {
    categoryType = currentCategoryType || "flight";
  }

  let booking = {
    type: categoryType,
    createdAt: new Date().toISOString(),
    screenshotAttached: !!lastScreenshotDataUrl,
  };

  // Common fields
  const getFieldValue = (id) => {
    const field = document.getElementById(id);
    return field ? field.value.trim() : "";
  };

  const getFieldNumber = (id) => {
    const field = document.getElementById(id);
    return field ? Number(field.value) : 0;
  };

  const getSelectValue = (id) => {
    const field = document.getElementById(id);
    return field ? field.value : "TWD";
  };

  // Category-specific fields
  if (categoryType === "flight") {
    const airline = getFieldValue("field-airline");
    const flightNumber = getFieldValue("field-flight-number");
    const origin = getFieldValue("field-origin");
    const destination = getFieldValue("field-destination");
    const departureDateTime = getFieldValue("field-departure");
    const arrivalDateTime = getFieldValue("field-arrival");
    const price = getFieldNumber("field-price");
    const currency = getSelectValue("field-currency");
    const reference = getFieldValue("field-reference");
    const notes = getFieldValue("field-notes");

    if (!airline || !flightNumber || !origin || !destination || !departureDateTime || !price || price <= 0) {
      formError.textContent = "Please fill in all required fields (*)";
      formError.classList.remove("hidden");
      return null;
    }

    booking = {
      ...booking,
      airline,
      flightNumber,
      origin,
      destination,
      departureDateTime,
      arrivalDateTime,
      totalPrice: price,
      currency,
      reference,
      notes,
      title: `${origin} → ${destination}`,
    };
  } else if (categoryType === "hotel") {
    const hotelName = getFieldValue("field-hotel-name");
    const hotelAddress = getFieldValue("field-hotel-address");
    const city = getFieldValue("field-city");
    const country = getFieldValue("field-country");
    const checkInDate = getFieldValue("field-check-in");
    const checkOutDate = getFieldValue("field-check-out");
    const nights = getFieldNumber("field-nights");
    const roomType = getFieldValue("field-room-type");
    const guests = getFieldNumber("field-guests");
    const price = getFieldNumber("field-price-hotel");
    const currency = getSelectValue("field-currency-hotel");
    const platform = getFieldValue("field-platform-hotel");
    const reservationId = getFieldValue("field-reservation-id");
    const notes = getFieldValue("field-notes-hotel");

    if (!hotelName || !hotelAddress || !city || !country || !checkInDate || !checkOutDate || !nights || !guests || !price || price <= 0) {
      formError.textContent = "Please fill in all required fields (*)";
      formError.classList.remove("hidden");
      return null;
    }

    booking = {
      ...booking,
      hotelName,
      hotelAddress,
      city,
      country,
      checkInDate,
      checkOutDate,
      nights,
      roomType,
      guests,
      totalPrice: price,
      currency,
      platform,
      reservationId,
      notes,
      title: hotelName,
    };
  } else if (categoryType === "restaurant") {
    const restaurantName = getFieldValue("field-restaurant-name");
    const locationText = getFieldValue("field-location-text");
    const googleMapsUrl = getFieldValue("field-google-maps-url");
    const visitDateTime = getFieldValue("field-visit-datetime");
    const partySize = getFieldNumber("field-party-size");
    const price = getFieldNumber("field-price-restaurant");
    const currency = getSelectValue("field-currency-restaurant");
    const receiptFile = document.getElementById("field-restaurant-receipt")?.files[0];
    const notes = getFieldValue("field-notes-restaurant");

    if (!restaurantName || !locationText || !visitDateTime || !partySize || !price || price <= 0) {
      formError.textContent = "Please fill in all required fields (*)";
      formError.classList.remove("hidden");
      return null;
    }

    booking = {
      ...booking,
      restaurantName,
      locationText,
      googleMapsUrl,
      visitDateTime,
      partySize,
      totalPrice: price,
      currency,
      receiptAttached: !!receiptFile,
      dishes: extractedDishes || [], // Include extracted dishes
      notes,
      title: restaurantName,
    };
    
    // Clear extracted dishes after saving
    extractedDishes = [];
  } else if (categoryType === "attraction") {
    const attractionName = getFieldValue("field-attraction-name");
    const locationText = getFieldValue("field-location-text-attraction");
    const googleMapsUrl = getFieldValue("field-google-maps-url-attraction");
    const visitDateTime = getFieldValue("field-visit-datetime-attraction");
    const ticketCount = getFieldNumber("field-ticket-count");
    const ticketPricePerPerson = getFieldNumber("field-ticket-price-per-person");
    const price = getFieldNumber("field-price-attraction");
    const currency = getSelectValue("field-currency-attraction");
    const platform = getFieldValue("field-platform-attraction");
    const notes = getFieldValue("field-notes-attraction");

    if (!attractionName || !locationText || !visitDateTime || !ticketCount || !ticketPricePerPerson || !price || price <= 0) {
      formError.textContent = "Please fill in all required fields (*)";
      formError.classList.remove("hidden");
      return null;
    }

    booking = {
      ...booking,
      attractionName,
      locationText,
      googleMapsUrl,
      visitDateTime,
      ticketCount,
      ticketPricePerPerson,
      totalPrice: price,
      currency,
      platform,
      notes,
      title: attractionName,
    };
  }

  return booking;
}

/**
 * Handle save booking
 */
async function handleSaveBooking() {
  if (!currentCategoryType) {
    formError.textContent = "No category selected";
    formError.classList.remove("hidden");
    return;
  }

  const booking = await saveBookingFromForm(currentCategoryType);
  if (!booking) {
    return; // Validation failed
  }

  try {
    // Save to server (placeholder for now)
    await saveBookingToServer(booking);
    
    // Save to local storage
    await addBooking(booking);

    // Clear form and screenshot
    clearManualForm();

    // Clear pending screenshot flag
    chrome.storage.local.remove([
      "pendingScreenshot",
      "lastScreenshot",
      "lastScreenshotRegion",
    ]);

    alert("Booking saved!");

    // Clear form data
    if (currentCategoryType) {
      chrome.storage.local.remove([`formData_${currentCategoryType}`]);
    }

    // Clear view state since we're navigating away
    clearViewState();

    // Return to category actions view
    showCategoryActionsView(currentCategoryType);
    manualFormView.classList.add("hidden");
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
  manualFormView.classList.add("hidden");
  // Clear view state since we're navigating away from manual form
  clearViewState();
  if (currentCategoryType) {
    // Show category actions view and ensure it's visible
    showCategoryActionsView(currentCategoryType);
    categoryActionsView.classList.remove("hidden");
    tabAddContent.classList.remove("hidden");
    tabHistoryContent.classList.add("hidden");
  } else {
    await showDashboardView();
  }
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
      lastScreenshotDataUrl.length,
      "bookingType:",
      currentCategoryType
    );

    // Call AI analysis with current category type
    const data = await analyzeBookingScreenshot(lastScreenshotDataUrl, currentCategoryType || 'flight');

    console.log("AI extraction result:", data);

    // Prefill form fields from AI response based on category type
    let fieldsFilled = 0;

    if (currentCategoryType === 'hotel') {
      console.log("Processing hotel extraction, data keys:", Object.keys(data));
      console.log("Hotel data received:", data);
      
      // Hotel-specific fields
      const hotelNameInput = document.getElementById("field-hotel-name");
      const hotelAddressInput = document.getElementById("field-hotel-address");
      const cityInput = document.getElementById("field-city");
      const countryInput = document.getElementById("field-country");
      const checkInInput = document.getElementById("field-check-in");
      const checkOutInput = document.getElementById("field-check-out");
      const nightsInput = document.getElementById("field-nights");
      const roomTypeInput = document.getElementById("field-room-type");
      const guestsInput = document.getElementById("field-guests");
      const priceHotelInput = document.getElementById("field-price-hotel");
      const currencyHotelInput = document.getElementById("field-currency-hotel");
      const platformHotelInput = document.getElementById("field-platform-hotel");
      const reservationIdInput = document.getElementById("field-reservation-id");
      const notesHotelInput = document.getElementById("field-notes-hotel");

      if (data.hotel_name && hotelNameInput) {
        hotelNameInput.value = data.hotel_name;
        fieldsFilled++;
        console.log("Filled hotel name:", data.hotel_name);
      }
      if (data.hotel_address && hotelAddressInput) {
        hotelAddressInput.value = data.hotel_address;
        fieldsFilled++;
        console.log("Filled hotel address:", data.hotel_address);
      }
      if (data.city && cityInput) {
        cityInput.value = data.city;
        fieldsFilled++;
        console.log("Filled city:", data.city);
      }
      if (data.country && countryInput) {
        countryInput.value = data.country;
        fieldsFilled++;
        console.log("Filled country:", data.country);
      }
      if (data.check_in_date && checkInInput) {
        // Ensure date is in YYYY-MM-DD format
        let checkInDate = data.check_in_date;
        // If it's already in YYYY-MM-DD format, use it directly
        if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInDate)) {
          // Try to parse and reformat
          try {
            const date = new Date(checkInDate);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              checkInDate = `${year}-${month}-${day}`;
            }
          } catch (e) {
            console.warn("Could not parse check-in date:", checkInDate);
          }
        }
        checkInInput.value = checkInDate;
        fieldsFilled++;
        console.log("Filled check-in date:", checkInDate);
      }
      if (data.check_out_date && checkOutInput) {
        // Ensure date is in YYYY-MM-DD format
        let checkOutDate = data.check_out_date;
        // If it's already in YYYY-MM-DD format, use it directly
        if (!/^\d{4}-\d{2}-\d{2}$/.test(checkOutDate)) {
          // Try to parse and reformat
          try {
            const date = new Date(checkOutDate);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              checkOutDate = `${year}-${month}-${day}`;
            }
          } catch (e) {
            console.warn("Could not parse check-out date:", checkOutDate);
          }
        }
        checkOutInput.value = checkOutDate;
        fieldsFilled++;
        console.log("Filled check-out date:", checkOutDate);
      }
      if (data.nights !== null && data.nights !== undefined && nightsInput) {
        nightsInput.value = data.nights;
        fieldsFilled++;
        console.log("Filled nights:", data.nights);
      }
      if (data.room_type && roomTypeInput) {
        roomTypeInput.value = data.room_type;
        fieldsFilled++;
        console.log("Filled room type:", data.room_type);
      }
      if (data.guests !== null && data.guests !== undefined && guestsInput) {
        guestsInput.value = data.guests;
        fieldsFilled++;
        console.log("Filled guests:", data.guests);
      }
      if (data.price !== null && data.price !== undefined && priceHotelInput) {
        priceHotelInput.value = data.price;
        fieldsFilled++;
        console.log("Filled price:", data.price);
      }
      if (data.currency && currencyHotelInput) {
        currencyHotelInput.value = data.currency.toUpperCase();
        fieldsFilled++;
        console.log("Filled currency:", data.currency);
      }
      if (data.platform && platformHotelInput) {
        platformHotelInput.value = data.platform;
        fieldsFilled++;
        console.log("Filled platform:", data.platform);
      }
      if (data.reservation_id && reservationIdInput) {
        reservationIdInput.value = data.reservation_id;
        fieldsFilled++;
        console.log("Filled reservation ID:", data.reservation_id);
      }
      if (data.notes && notesHotelInput) {
        const existingNotes = notesHotelInput.value.trim();
        if (existingNotes) {
          notesHotelInput.value = existingNotes + "\n\n[AI Extracted]: " + data.notes;
        } else {
          notesHotelInput.value = "[AI Extracted]: " + data.notes;
        }
        fieldsFilled++;
        console.log("Filled notes");
      }
      
      console.log("Hotel extraction complete. Total fields filled:", fieldsFilled);
    } else if (currentCategoryType === 'restaurant') {
      // Restaurant-specific fields
      const restaurantNameInput = document.getElementById("field-restaurant-name");
      const locationTextInput = document.getElementById("field-location-text");
      const googleMapsUrlInput = document.getElementById("field-google-maps-url");
      const visitDateTimeInput = document.getElementById("field-visit-datetime");
      const partySizeInput = document.getElementById("field-party-size");
      const priceRestaurantInput = document.getElementById("field-price-restaurant");
      const currencyRestaurantInput = document.getElementById("field-currency-restaurant");
      const notesRestaurantInput = document.getElementById("field-notes-restaurant");

      if (data.restaurant_name && restaurantNameInput) {
        restaurantNameInput.value = data.restaurant_name;
        fieldsFilled++;
        console.log("Filled restaurant name:", data.restaurant_name);
      }
      if (data.location_text && locationTextInput) {
        locationTextInput.value = data.location_text;
        fieldsFilled++;
        console.log("Filled location text:", data.location_text);
      }
      if (data.google_maps_url && googleMapsUrlInput) {
        googleMapsUrlInput.value = data.google_maps_url;
        fieldsFilled++;
        console.log("Filled Google Maps URL:", data.google_maps_url);
      }
      if (data.visit_datetime && visitDateTimeInput) {
        try {
          const visitDate = new Date(data.visit_datetime);
          if (!isNaN(visitDate.getTime())) {
            const year = visitDate.getFullYear();
            const month = String(visitDate.getMonth() + 1).padStart(2, "0");
            const day = String(visitDate.getDate()).padStart(2, "0");
            const hours = String(visitDate.getHours()).padStart(2, "0");
            const minutes = String(visitDate.getMinutes()).padStart(2, "0");
            visitDateTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
            fieldsFilled++;
            console.log("Filled visit datetime:", visitDateTimeInput.value);
          }
        } catch (dateError) {
          console.error("Error parsing visit datetime:", dateError);
        }
      }
      if (data.party_size !== null && data.party_size !== undefined && partySizeInput) {
        partySizeInput.value = data.party_size;
        fieldsFilled++;
        console.log("Filled party size:", data.party_size);
      }
      if (data.price !== null && data.price !== undefined && priceRestaurantInput) {
        priceRestaurantInput.value = data.price;
        fieldsFilled++;
        console.log("Filled price:", data.price);
      }
      if (data.currency && currencyRestaurantInput) {
        if (currencyRestaurantInput.tagName === "SELECT") {
          currencyRestaurantInput.value = data.currency.toUpperCase();
        } else {
          currencyRestaurantInput.value = data.currency.toUpperCase();
        }
        fieldsFilled++;
        console.log("Filled currency:", data.currency);
      }
      if (data.notes && notesRestaurantInput) {
        const existingNotes = notesRestaurantInput.value.trim();
        if (existingNotes) {
          notesRestaurantInput.value = existingNotes + "\n\n[AI Extracted]: " + data.notes;
        } else {
          notesRestaurantInput.value = "[AI Extracted]: " + data.notes;
        }
        fieldsFilled++;
        console.log("Filled notes");
      }

      // Handle dishes extraction
      if (data.dishes && Array.isArray(data.dishes) && data.dishes.length > 0) {
        extractedDishes = data.dishes.map(dish => ({
          name: dish.name || "",
          price: typeof dish.price === "number" ? dish.price : 
                 typeof dish.price === "string" ? parseFloat(dish.price.replace(/[^0-9.-]/g, "")) : 0
        })).filter(dish => dish.name && dish.price > 0);
        
        // Display dishes in the UI
        renderDishesList();
        fieldsFilled++;
        console.log("Extracted and displayed", extractedDishes.length, "dishes");
      }
      
      console.log("Restaurant extraction complete. Total fields filled:", fieldsFilled);
    } else {
      // Flight-specific fields (default)
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
 * Render dishes list in the UI
 */
function renderDishesList() {
  const dishesList = document.getElementById("restaurant-dishes-list");
  if (!dishesList) return;

  dishesList.innerHTML = "";
  
  if (extractedDishes.length === 0) {
    return;
  }

  extractedDishes.forEach((dish, index) => {
    const dishItem = document.createElement("div");
    dishItem.className = "dish-item";
    dishItem.innerHTML = `
      <span class="dish-name">${dish.name || ""}</span>
      <span class="dish-price">${(dish.price || 0).toFixed(2)}</span>
      <button type="button" class="btn-remove-dish" data-index="${index}" title="Remove dish">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    dishesList.appendChild(dishItem);
  });

  // Attach remove handlers
  dishesList.querySelectorAll('.btn-remove-dish').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(btn.getAttribute('data-index'));
      removeDish(index);
    });
  });
}

/**
 * Add a dish manually
 */
function addDish() {
  const nameInput = document.getElementById("dish-name-input");
  const priceInput = document.getElementById("dish-price-input");

  if (!nameInput || !priceInput) return;

  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);

  if (!name) {
    alert("Please enter a dish name");
    return;
  }

  if (isNaN(price) || price <= 0) {
    alert("Please enter a valid price");
    return;
  }

  extractedDishes.push({ name, price });
  renderDishesList();
  saveFormData(); // Save form data including dishes

  // Clear inputs
  nameInput.value = "";
  priceInput.value = "";
}

/**
 * Remove a dish by index
 */
function removeDish(index) {
  if (index >= 0 && index < extractedDishes.length) {
    extractedDishes.splice(index, 1);
    renderDishesList();
    saveFormData(); // Save form data including dishes
  }
}

/**
 * Clear manual form
 */
function clearManualForm() {
  // Clear all form fields
  const allInputs = document.querySelectorAll("#manual-form-view input:not([id='dish-name-input']):not([id='dish-price-input']), #manual-form-view textarea, #manual-form-view select");
  allInputs.forEach(input => {
    if (input.type === "file") {
      input.value = "";
    } else if (input.tagName === "SELECT") {
      input.value = input.options[0]?.value || "";
    } else {
      input.value = "";
    }
  });

  // Clear dish inputs
  const dishNameInput = document.getElementById("dish-name-input");
  const dishPriceInput = document.getElementById("dish-price-input");
  if (dishNameInput) dishNameInput.value = "";
  if (dishPriceInput) dishPriceInput.value = "";

  formError.classList.add("hidden");

  // Clear AI status
  if (aiStatus) {
    aiStatus.textContent = "";
    aiStatus.className = "ai-status";
  }

  lastScreenshotDataUrl = null;
  extractedDishes = [];
  
  // Clear dishes display
  const dishesList = document.getElementById("restaurant-dishes-list");
  if (dishesList) {
    dishesList.innerHTML = "";
  }
  
  // Clear saved form data
  if (currentCategoryType) {
    chrome.storage.local.remove([`formData_${currentCategoryType}`]);
  }
  
  chrome.storage.local.remove(["lastScreenshot", "lastScreenshotRegion"]);
}

/**
 * Load and display history bookings with filter
 * @param {string} filterType - Filter by type: "all" | "flight" | "hotel" | "restaurant" | "attraction"
 */
async function loadHistoryBookings(filterType = "all") {
  try {
    // TODO: sync with backend
    const bookings = await getBookings();

    // Filter by type
    let filteredBookings = bookings;
    if (filterType !== "all") {
      filteredBookings = bookings.filter(b => b.type === filterType);
    }

    // Sort by createdAt descending (newest first)
    const sortedBookings = filteredBookings.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Clear list
    historyList.innerHTML = "";

    if (sortedBookings.length === 0) {
      const div = document.createElement("div");
      div.className = "empty-state";
      div.textContent = "No bookings found";
      historyList.appendChild(div);
    } else {
      sortedBookings.forEach((booking) => {
        const card = document.createElement("div");
        card.className = "history-card";

        // Badge for type
        const badge = document.createElement("span");
        badge.className = `history-badge history-badge-${booking.type}`;
        const typeNames = {
          flight: "Flight",
          hotel: "Hotel",
          restaurant: "Restaurant",
          attraction: "Attraction"
        };
        badge.textContent = typeNames[booking.type] || booking.type;

        // Title
        const title = document.createElement("div");
        title.className = "history-title";
        title.textContent = booking.title || (booking.type === "flight" ? `${booking.origin} → ${booking.destination}` : "Untitled");

        // Date
        const date = document.createElement("div");
        date.className = "history-date";
        
        // Dishes (for restaurant bookings)
        let dishesSection = null;
        if (booking.type === "restaurant" && booking.dishes && Array.isArray(booking.dishes) && booking.dishes.length > 0) {
          dishesSection = document.createElement("div");
          dishesSection.className = "history-dishes";
          const dishesTitle = document.createElement("div");
          dishesTitle.className = "history-dishes-title";
          dishesTitle.textContent = "Dishes:";
          dishesSection.appendChild(dishesTitle);
          
          const dishesList = document.createElement("div");
          dishesList.className = "history-dishes-list";
          booking.dishes.forEach(dish => {
            const dishItem = document.createElement("div");
            dishItem.className = "history-dish-item";
            dishItem.innerHTML = `
              <span class="dish-name">${dish.name || "Unknown"}</span>
              <span class="dish-price">${(dish.price || 0).toFixed(2)} ${booking.currency || ""}</span>
            `;
            dishesList.appendChild(dishItem);
          });
          dishesSection.appendChild(dishesList);
        }
        let dateValue = booking.createdAt;
        if (booking.type === "flight" && booking.departureDateTime) {
          dateValue = booking.departureDateTime;
        } else if (booking.type === "hotel" && booking.checkInDate) {
          dateValue = booking.checkInDate;
        } else if ((booking.type === "restaurant" || booking.type === "attraction") && booking.visitDateTime) {
          dateValue = booking.visitDateTime;
        }
        const dateObj = new Date(dateValue);
        date.textContent = dateObj.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        // Price
        const price = document.createElement("div");
        price.className = "history-price";
        const priceFormatted = new Intl.NumberFormat().format(booking.totalPrice || booking.price || 0);
        price.textContent = `${priceFormatted} ${booking.currency || "TWD"}`;

        card.appendChild(badge);
        card.appendChild(title);
        card.appendChild(date);
        card.appendChild(price);
        if (dishesSection) {
          card.appendChild(dishesSection);
        }
        historyList.appendChild(card);
      });
    }
  } catch (error) {
    console.error("Load history error:", error);
    historyList.innerHTML = '<div class="empty-state">Error loading bookings</div>';
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
  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleLogin();
    });
  } else {
    console.error("Login button not found!");
  }

  if (loginPasswordInput) {
    loginPasswordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleLogin();
      }
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSignup();
    });
  } else {
    console.error("Signup button not found!");
  }

  if (signupConfirmInput) {
    signupConfirmInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSignup();
      }
    });
  }

  // Tab navigation
  tabAdd.addEventListener("click", () => {
    showHomeView();
  });
  tabHistory.addEventListener("click", async () => {
    await showHistoryView();
  });

  // Category buttons
  btnCategoryFlight.addEventListener("click", () => {
    showCategoryActionsView("flight");
  });
  btnCategoryHotel.addEventListener("click", () => {
    showCategoryActionsView("hotel");
  });
  btnCategoryRestaurant.addEventListener("click", () => {
    showCategoryActionsView("restaurant");
  });
  btnCategoryAttraction.addEventListener("click", () => {
    showCategoryActionsView("attraction");
  });

  // Category action buttons
  btnCategoryScreenshot.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    screenshotOptions.classList.remove("hidden");
  });
  btnCategoryUpload.addEventListener("click", () => {
    fileInput.click();
  });
  btnCategoryManual.addEventListener("click", () => {
    handleManual();
  });
  btnCategoryBack.addEventListener("click", () => {
    showHomeView();
  });

  // Screenshot options
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
  fileInput.addEventListener("change", handleFileChange);

  // History filters
  historyFilterAll.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    historyFilterAll.classList.add("active");
    loadHistoryBookings("all");
  });
  historyFilterFlight.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    historyFilterFlight.classList.add("active");
    loadHistoryBookings("flight");
  });
  historyFilterHotel.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    historyFilterHotel.classList.add("active");
    loadHistoryBookings("hotel");
  });
  historyFilterRestaurant.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    historyFilterRestaurant.classList.add("active");
    loadHistoryBookings("restaurant");
  });
  historyFilterAttraction.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    historyFilterAttraction.classList.add("active");
    loadHistoryBookings("attraction");
  });

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
      if (currentCategoryType) {
        showManualFormView(currentCategoryType, { fromScreenshot: true });
        manualFormView.classList.remove("hidden");
        screenshotPreviewView.classList.add("hidden");
        // Clear pending screenshot flag since we've moved to manual form
        chrome.storage.local.set({ pendingScreenshot: false });
        // Save view state
        saveViewState();
      } else {
        // Fallback to flight
        showManualFormView("flight", { fromScreenshot: true });
        manualFormView.classList.remove("hidden");
        screenshotPreviewView.classList.add("hidden");
        // Clear pending screenshot flag since we've moved to manual form
        chrome.storage.local.set({ pendingScreenshot: false });
        // Save view state
        saveViewState();
      }
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
