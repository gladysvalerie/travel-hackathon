/**
 * Popup script for TripLedger extension
 * Handles UI interactions, authentication state, and booking management
 */

import {
  setAuth,
  getAuth,
  clearAuth,
  setCurrentTripId,
  getCurrentTripId,
  getBookings,
  addBooking,
  updateBooking,
  getBookingById,
} from "./storage.js";
import {
  registerUser,
  loginUser,
  getMe,
  getTrips,
  createTrip,
  getTripDetail,
  updateTripName,
  deleteTrip,
  addTripMember,
  createExpense,
  getExpenses,
  getExpenseDetail,
  updateExpense,
  deleteExpense,
  saveBookingToServer,
} from "./api.js";
import { analyzeBookingScreenshot } from "./aiClient.js";

// View containers
const authView = document.getElementById("auth-view");
const tripsView = document.getElementById("trips-view");
const newTripView = document.getElementById("new-trip-view");
const tripDetailView = document.getElementById("trip-detail-view");
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
const btnCategoryRestaurant = document.getElementById(
  "btn-category-restaurant"
);
const btnCategoryAttraction = document.getElementById(
  "btn-category-attraction"
);

// Category actions view elements
const categoryActionsView = document.getElementById("category-actions-view");
const categoryActionsTitle = document.getElementById("category-actions-title");
const btnCategoryScreenshot = document.getElementById(
  "btn-category-screenshot"
);
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
const historyFilterRestaurant = document.getElementById(
  "history-filter-restaurant"
);
const historyFilterAttraction = document.getElementById(
  "history-filter-attraction"
);

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

// Current file name for PDFs
let currentFileName = null;

// Editing booking ID (null if creating new, ID if editing)
let editingBookingId = null;

// Current trip data
let currentTripData = null;

/**
 * Update file preview display
 */
function updateFilePreview() {
  const previewContainer = document.getElementById("file-preview-container");
  const previewImage = document.getElementById("file-preview-image");
  const previewPdf = document.getElementById("file-preview-pdf");
  const previewName = document.getElementById("file-preview-name");

  if (!previewContainer) return;

  if (lastScreenshotDataUrl) {
    const isPdf = lastScreenshotDataUrl.startsWith("data:application/pdf");
    previewContainer.classList.remove("hidden");

    if (isPdf) {
      // Show PDF preview
      if (previewImage) previewImage.classList.add("hidden");
      if (previewPdf) {
        previewPdf.classList.remove("hidden");
        if (previewName) {
          previewName.textContent = currentFileName || "booking.pdf";
        }
      }
    } else {
      // Show image preview
      if (previewPdf) previewPdf.classList.add("hidden");
      if (previewImage) {
        previewImage.classList.remove("hidden");
        previewImage.src = lastScreenshotDataUrl;
      }
    }
  } else {
    previewContainer.classList.add("hidden");
  }
}

/**
 * Remove file (screenshot/PDF)
 */
function removeFile() {
  lastScreenshotDataUrl = null;
  currentFileName = null;
  updateFilePreview();
  chrome.storage.local.remove(["lastScreenshot", "lastScreenshotRegion"]);

  // Update status
  if (screenshotStatus) {
    screenshotStatus.textContent =
      "No screenshot; please fill the fields manually.";
  }

  // Update button text
  if (aiFillBtn) {
    const buttonTextElement = aiFillBtn.querySelector(".btn-text");
    if (buttonTextElement) {
      buttonTextElement.textContent = "Extract from screenshot";
    }
  }
}

/**
 * Update Google Maps button visibility based on URL field values
 */
function updateGoogleMapsButtons() {
  const restaurantUrl = document.getElementById("field-google-maps-url")?.value;
  const restaurantBtn = document.getElementById("btn-open-gmaps-restaurant");
  if (restaurantBtn) {
    restaurantBtn.style.display = restaurantUrl ? "flex" : "none";
  }

  const attractionUrl = document.getElementById(
    "field-google-maps-url-attraction"
  )?.value;
  const attractionBtn = document.getElementById("btn-open-gmaps-attraction");
  if (attractionBtn) {
    attractionBtn.style.display = attractionUrl ? "flex" : "none";
  }
}

/**
 * Save all form data for the current category
 */
function saveFormData() {
  if (!currentCategoryType || manualFormView.classList.contains("hidden")) {
    return; // Not in a form view
  }

  const formData = {};
  const formElement = document.getElementById(
    `manual-form-${currentCategoryType}`
  );
  if (!formElement) return;

  // Get all inputs, selects, and textareas in the form
  const inputs = formElement.querySelectorAll(
    'input:not([type="file"]), select, textarea'
  );
  inputs.forEach((input) => {
    if (input.id) {
      if (input.type === "checkbox") {
        formData[input.id] = input.checked;
      } else if (input.type === "number") {
        formData[input.id] = input.value ? parseFloat(input.value) : "";
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
    [`formData_${currentCategoryType}`]: formData,
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
    Object.keys(formData).forEach((fieldId) => {
      if (fieldId === "dishes") {
        // Handle dishes separately
        if (
          currentCategoryType === "restaurant" &&
          Array.isArray(formData.dishes)
        ) {
          extractedDishes = formData.dishes;
          renderDishesList();
        }
        return;
      }

      const field = document.getElementById(fieldId);
      if (field) {
        if (field.type === "checkbox") {
          field.checked = formData[fieldId];
        } else if (field.type === "number") {
          field.value = formData[fieldId] || "";
        } else {
          field.value = formData[fieldId] || "";
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
  const isHistoryTabActive =
    tabHistory && tabHistory.classList.contains("active");
  const isAddTabActive = tabAdd && tabAdd.classList.contains("active");

  if (
    isHistoryTabActive ||
    (tabHistoryContent && !tabHistoryContent.classList.contains("hidden"))
  ) {
    // We're on the History tab
    currentView = "history";
    activeTab = "history";
  } else if (
    isAddTabActive ||
    (tabAddContent && !tabAddContent.classList.contains("hidden"))
  ) {
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
      inManualFormWithScreenshot:
        !manualFormView.classList.contains("hidden") && !!lastScreenshotDataUrl,
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
        if (screenshotPreviewView)
          screenshotPreviewView.classList.add("hidden");
        if (categoryActionsView) categoryActionsView.classList.add("hidden");
        if (homeView) homeView.classList.add("hidden");

        const fromScreenshot =
          state.inManualFormWithScreenshot && !!lastScreenshotDataUrl;
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
      const screenshotResult = await chrome.storage.local.get([
        "lastScreenshot",
      ]);
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
 * Show auth error message
 */
function showAuthError(message) {
  // Try to find or create error element in login view
  let errorEl =
    document.getElementById("login-error") ||
    document.getElementById("signup-error");
  if (!errorEl) {
    errorEl = document.createElement("div");
    errorEl.id = "login-error";
    errorEl.className = "form-error";
    if (loginView && !loginView.classList.contains("hidden")) {
      loginView.appendChild(errorEl);
    } else if (signupView && !signupView.classList.contains("hidden")) {
      signupView.appendChild(errorEl);
    }
  }
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

/**
 * Hide auth error message
 */
function hideAuthError() {
  const errorEl =
    document.getElementById("login-error") ||
    document.getElementById("signup-error");
  if (errorEl) {
    errorEl.classList.add("hidden");
  }
}

/**
 * Setup header profile dropdown
 */
function setupHeaderProfile() {
  const headerProfileBtn = document.getElementById("header-profile-btn");
  const headerProfileDropdown = document.getElementById(
    "header-profile-dropdown"
  );
  const headerProfileEdit = document.getElementById("header-profile-edit");
  const headerProfileLogout = document.getElementById("header-profile-logout");

  // Update header profile on init
  getAuth().then((auth) => {
    if (auth) {
      updateHeaderProfile(auth);
    }
  });

  // Toggle dropdown on click
  if (headerProfileBtn && headerProfileDropdown) {
    headerProfileBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isHidden = headerProfileDropdown.classList.contains("hidden");

        // Close other dropdowns
        document.querySelectorAll(".header-profile-dropdown").forEach((dd) => {
          if (dd !== headerProfileDropdown) {
            dd.classList.add("hidden");
          }
        });

        // Toggle this dropdown
        headerProfileDropdown.classList.toggle("hidden", !isHidden);
      },
      { passive: false }
    );
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      headerProfileDropdown &&
      !headerProfileDropdown.contains(e.target) &&
      headerProfileBtn &&
      !headerProfileBtn.contains(e.target)
    ) {
      headerProfileDropdown.classList.add("hidden");
    }
  });

  // Edit profile button
  if (headerProfileEdit) {
    headerProfileEdit.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (headerProfileDropdown)
          headerProfileDropdown.classList.add("hidden");
        showProfileEditModal();
      },
      { passive: false }
    );
  }

  // Logout button
  if (headerProfileLogout) {
    headerProfileLogout.addEventListener(
      "click",
      async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (headerProfileDropdown)
          headerProfileDropdown.classList.add("hidden");
        await clearAuth();
        await setCurrentTripId(null);
        showAuthView();
      },
      { passive: false }
    );
  }
}

/**
 * Update header profile display
 */
function updateHeaderProfile(userData) {
  if (!userData) return;

  const headerProfilePicture = document.getElementById(
    "header-profile-picture"
  );
  const dropdownProfilePicture = document.getElementById(
    "dropdown-profile-picture"
  );
  const dropdownProfileName = document.getElementById("dropdown-profile-name");
  const dropdownProfileEmail = document.getElementById(
    "dropdown-profile-email"
  );

  // Get initials
  const name =
    userData.name || userData.username || userData.email?.split("@")[0] || "U";
  const initials = name.substring(0, 2).toUpperCase();

  if (headerProfilePicture) {
    headerProfilePicture.textContent = initials;
  }

  if (dropdownProfilePicture) {
    dropdownProfilePicture.textContent = initials;
  }

  if (dropdownProfileName) {
    dropdownProfileName.textContent =
      userData.name || userData.username || userData.email?.split("@")[0] || "";
  }

  if (dropdownProfileEmail) {
    dropdownProfileEmail.textContent = userData.email || "";
  }
}

/**
 * Initialize popup on load
 */
async function init() {
  // Immediately hide auth view to prevent flash
  authView.classList.add("hidden");

  // Attach event listeners FIRST - make UI responsive immediately
  attachEventListeners();
  setupHeaderProfile();

  // Check if user is logged in (non-blocking)
  const auth = await getAuth();

  if (auth) {
    // Immediately show trips view (optimistic loading) - don't wait for API calls
    const tripId = await getCurrentTripId();
    if (tripId) {
      // Show trip detail view without waiting for auth check
      showTripDetailView(tripId).catch((err) => {
        console.error("Error loading trip detail:", err);
        showTripsView().catch(console.error);
      });
    } else {
      showTripsView().catch(console.error);
    }

    // Verify token in background (non-blocking) - don't await
    getMe(auth.token)
      .then((user) => {
        // Update auth data with latest user info
        setAuth({
          token: auth.token,
          userId: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        }).then(() => {
          updateProfileDisplay(user);
          updateHeaderProfile(user);
        });
      })
      .catch((error) => {
        // Token invalid, clear auth and show login (in background)
        console.error("Auth check failed:", error);
        clearAuth().then(() => {
          showAuthView();
        });
      });
  } else {
    // No auth, show login
    showAuthView();
  }

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
  tripsView?.classList.add("hidden");
  newTripView?.classList.add("hidden");
  tripDetailView?.classList.add("hidden");
  dashboardView.classList.add("hidden");
  regionSelectionView.classList.add("hidden");
  screenshotPreviewView.classList.add("hidden");
  manualFormView.classList.add("hidden");
  hideAuthError();
}

/**
 * Show trips list view
 */
async function showTripsView() {
  authView.classList.add("hidden");
  newTripView?.classList.add("hidden");
  tripDetailView?.classList.add("hidden");
  dashboardView.classList.add("hidden");
  regionSelectionView.classList.add("hidden");
  screenshotPreviewView.classList.add("hidden");
  manualFormView.classList.add("hidden");

  if (tripsView) {
    tripsView.classList.remove("hidden");
    await loadTripsList();
  }
}

/**
 * Load and display trips list
 */
async function loadTripsList() {
  const tripsList = document.getElementById("trips-list");
  const tripsError = document.getElementById("trips-error");

  if (!tripsList) return;

  tripsList.innerHTML = '<div class="loading">Loading trips...</div>';
  if (tripsError) tripsError.classList.add("hidden");

  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      showAuthView();
      return;
    }

    const trips = await getTrips(auth.token);

    if (trips.length === 0) {
      tripsList.innerHTML = `
        <div class="empty-state">
          <p>No trips yet. Create your first trip!</p>
        </div>
      `;
      return;
    }

    tripsList.innerHTML = trips
      .map((trip) => {
        const tripDate = trip.tripDate || trip.createdAt || trip.created_at;
        const dateStr = tripDate
          ? new Date(tripDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "No date set";

        // Get member count from trip data
        // Backend now includes members in the response
        let memberCount = 1; // Default to 1 (creator is always a member)
        if (trip.members && Array.isArray(trip.members)) {
          memberCount = trip.members.length;
        } else if (trip.members && typeof trip.members === "object") {
          // Handle case where members might be an object
          memberCount = Object.keys(trip.members).length;
        }
        // Ensure at least 1 member (creator)
        if (memberCount < 1) memberCount = 1;

        return `
      <div class="trip-item" data-trip-id="${trip.id}">
        <div class="trip-item-content">
          <div class="trip-item-name">${escapeHtml(trip.name)}</div>
          <div class="trip-item-meta">
            <span class="trip-item-date">📅 ${dateStr}</span>
            <span class="trip-item-members">👥 ${memberCount} member(s)</span>
          </div>
        </div>
        <button type="button" class="trip-item-delete" data-trip-id="${trip.id}" title="Delete trip">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    `;
      })
      .join("");

    // Attach click handlers
    tripsList.querySelectorAll(".trip-item").forEach((item) => {
      const tripId = item.dataset.tripId;
      item.addEventListener("click", (e) => {
        if (!e.target.closest(".trip-item-delete")) {
          showTripDetailView(tripId);
        }
      });
    });

    // Attach delete handlers
    tripsList.querySelectorAll(".trip-item-delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const tripId = btn.dataset.tripId;
        if (confirm("Are you sure you want to delete this trip?")) {
          await deleteTripHandler(tripId);
        }
      });
    });
  } catch (error) {
    console.error("Error loading trips:", error);
    if (tripsError) {
      tripsError.textContent = error.message || "Failed to load trips";
      tripsError.classList.remove("hidden");
    }
    tripsList.innerHTML =
      '<div class="error-message">Failed to load trips</div>';
  }
}

/**
 * Delete a trip
 */
async function deleteTripHandler(tripId) {
  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      showAuthView();
      return;
    }

    await deleteTrip(auth.token, tripId);

    // Clear current trip if it was deleted
    const currentTripId = await getCurrentTripId();
    if (currentTripId === tripId) {
      await setCurrentTripId(null);
      currentTripData = null;
    }

    // Reload trips list
    await loadTripsList();
  } catch (error) {
    console.error("Error deleting trip:", error);
    alert("Failed to delete trip: " + error.message);
  }
}

// showNewTripView is now defined above with updateTripMembersPreview

/**
 * Show trip detail view
 */
async function showTripDetailView(tripId) {
  // Hide all views
  authView.classList.add("hidden");
  tripsView?.classList.add("hidden");
  newTripView?.classList.add("hidden");
  dashboardView.classList.add("hidden");
  regionSelectionView.classList.add("hidden");
  screenshotPreviewView.classList.add("hidden");
  manualFormView.classList.add("hidden");

  if (!tripDetailView) return;

  // Show trip detail view
  tripDetailView.classList.remove("hidden");

  // Make absolutely sure dashboard is hidden
  if (dashboardView) {
    dashboardView.style.display = "none";
  }

  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      showAuthView();
      return;
    }

    // Profile section removed - using header profile icon instead

    // Set as current trip
    await setCurrentTripId(tripId);

    // Show loading state for trip name
    let tripNameEl = document.getElementById("trip-detail-name");
    if (tripNameEl) {
      tripNameEl.textContent = "Loading...";
    }

    // Load trip data
    const trip = await getTripDetail(auth.token, tripId);
    currentTripData = trip;

    // Load trip date from local storage if available
    const tripDateData = await chrome.storage.local.get([
      `trip_${tripId}_date`,
    ]);
    if (tripDateData[`trip_${tripId}_date`]) {
      trip.tripDate = tripDateData[`trip_${tripId}_date`];
    }

    // Update trip name display
    tripNameEl = document.getElementById("trip-detail-name");
    if (tripNameEl) {
      tripNameEl.textContent = trip.name || "Unnamed Trip";
    }

    // Load members (initially hidden, shown when clicking trip name)
    loadTripMembers(trip.members || [], auth);

    // Load expenses for trip expenses tab
    await loadTripExpensesHistory(tripId);
  } catch (error) {
    console.error("Error loading trip detail:", error);
    alert("Failed to load trip: " + error.message);
    await showTripsView();
  }
}

// Profile section removed - using header profile icon instead

/**
 * Load trip expenses for history tab
 */
async function loadTripExpensesHistory(tripId, filterType = "all") {
  const historyListTrip = document.getElementById("history-list-trip");
  if (!historyListTrip) return;

  // Show loading state
  historyListTrip.innerHTML = '<div class="loading">Loading expenses...</div>';

  try {
    const auth = await getAuth();
    if (!auth || !auth.token) return;

    const expenses = await getExpenses(auth.token, tripId);

    // Filter by category
    let filteredExpenses = expenses;
    if (filterType !== "all") {
      filteredExpenses = expenses.filter((e) => e.category === filterType);
    }

    // Render expenses (similar to loadHistoryBookings but for trip detail view)
    if (filteredExpenses.length === 0) {
      historyListTrip.innerHTML =
        '<div class="empty-state">No expenses yet</div>';
      return;
    }

    // Sort by date
    const sortedExpenses = filteredExpenses.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0);
      const dateB = new Date(b.createdAt || b.created_at || 0);
      return dateB - dateA;
    });

    // Clear existing content
    historyListTrip.innerHTML = "";

    sortedExpenses.forEach((expense) => {
      const dateValue =
        expense.createdAt || expense.created_at || new Date().toISOString();
      const dateObj = new Date(dateValue);
      const dateStr = dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      const card = document.createElement("div");
      card.className = "history-card";
      card.dataset.expenseId = expense.id;
      // Make card clickable to edit
      card.style.cursor = "pointer";

      const badge = document.createElement("span");
      badge.className = "history-badge history-badge-default";
      badge.textContent = "Expense";

      const title = document.createElement("div");
      title.className = "history-title";
      title.textContent = expense.description || "Untitled Expense";

      const date = document.createElement("div");
      date.className = "history-date";
      date.textContent = dateStr;

      const price = document.createElement("div");
      price.className = "history-price";
      price.textContent = `$${new Intl.NumberFormat().format(expense.amount || 0)}`;

      const actions = document.createElement("div");
      actions.className = "history-actions";

      // Remove edit button - card is clickable instead
      // Add click handler to card for editing
      card.addEventListener("click", async (e) => {
        // Don't trigger if clicking delete button
        if (!e.target.closest(".btn-delete-booking")) {
          await editExpense(expense.id);
        }
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-delete-booking btn-delete-expense";
      deleteBtn.title = "Delete";
      deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this expense?")) {
          await deleteExpenseHandler(expense.id);
          // Reload expenses
          await loadTripExpensesHistory(tripId, filterType);
        }
      });

      actions.appendChild(deleteBtn);

      card.appendChild(badge);
      card.appendChild(title);
      card.appendChild(date);
      card.appendChild(price);
      card.appendChild(actions);

      historyListTrip.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading trip expenses:", error);
    if (historyListTrip) {
      historyListTrip.innerHTML =
        '<div class="error-message">Failed to load expenses</div>';
    }
  }
}

/**
 * Load and display trip members
 */
function loadTripMembers(members, auth) {
  const membersList = document.getElementById("trip-members-list");
  if (!membersList) return;

  if (members.length === 0) {
    membersList.innerHTML = '<div class="empty-state">No members yet</div>';
    return;
  }

  // Show current user first, then others
  const currentUserId = auth?.userId;
  const sortedMembers = [...members].sort((a, b) => {
    const aIsCurrent = (a.userId || a.user?.id) === currentUserId;
    const bIsCurrent = (b.userId || b.user?.id) === currentUserId;
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;
    return 0;
  });

  membersList.innerHTML = sortedMembers
    .map((member) => {
      const memberUser = member.user || member;
      const username = memberUser.username || memberUser.name || "Unknown";
      const isCurrentUser = (memberUser.id || member.userId) === currentUserId;

      return `
      <div class="trip-member-item ${isCurrentUser ? "current-user" : ""}">
        <span class="trip-member-name">${escapeHtml(username)}</span>
        ${isCurrentUser ? '<span class="member-badge">You</span>' : ""}
      </div>
    `;
    })
    .join("");
}

// loadTripMembers function is defined above with (members, auth) parameters

/**
 * Helper to escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show loading overlay with message
 */
function showLoadingOverlay(message = "Loading...") {
  // Remove existing overlay if any
  let overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.remove();
  }

  overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.className = "loading-overlay";
  overlay.innerHTML = `
    <div class="loading-overlay-content">
      <div class="loading-spinner-large"></div>
      <div class="loading-message">${escapeHtml(message)}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add("active"), 10);
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    setTimeout(() => overlay.remove(), 300);
  }
}

/**
 * Show success animation with checkmark
 */
function showSuccessAnimation(message = "Success!") {
  // Remove existing success overlay if any
  let successOverlay = document.getElementById("success-overlay");
  if (successOverlay) {
    successOverlay.remove();
  }

  successOverlay = document.createElement("div");
  successOverlay.id = "success-overlay";
  successOverlay.className = "success-overlay";
  successOverlay.innerHTML = `
    <div class="success-overlay-content">
      <div class="success-checkmark">
        <svg viewBox="0 0 52 52" class="checkmark-svg">
          <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
      </div>
      <div class="success-message">${escapeHtml(message)}</div>
    </div>
  `;
  document.body.appendChild(successOverlay);
  setTimeout(() => successOverlay.classList.add("active"), 10);

  // Auto-hide after 2 seconds
  setTimeout(() => {
    if (successOverlay) {
      successOverlay.classList.remove("active");
      setTimeout(() => successOverlay.remove(), 500);
    }
  }, 2000);
}

// Store invited members for new trip creation
let invitedMembersForTrip = [];

/**
 * Handle create trip form submission
 */
async function handleCreateTrip() {
  const tripNameInput = document.getElementById("trip-name-input");
  const tripDateInput = document.getElementById("trip-date-input");
  const newTripError = document.getElementById("new-trip-error");

  const tripName = tripNameInput?.value.trim() || "";
  const tripDate = tripDateInput?.value || null;

  if (!tripName) {
    if (newTripError) {
      newTripError.textContent = "Trip name is required";
      newTripError.classList.remove("hidden");
    }
    return;
  }

  // Show loading state
  if (newTripError) newTripError.classList.add("hidden");
  const createTripBtn = document.getElementById("btn-create-trip");
  const originalBtnText = createTripBtn?.innerHTML;
  if (createTripBtn) {
    createTripBtn.disabled = true;
    createTripBtn.innerHTML =
      '<span class="loading-spinner"></span> Creating...';
  }

  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      showAuthView();
      return;
    }

    // Create trip
    const trip = await createTrip(auth.token, { name: tripName });

    // Store trip date locally (backend doesn't support it yet)
    if (tripDate) {
      trip.tripDate = tripDate;
      await chrome.storage.local.set({ [`trip_${trip.id}_date`]: tripDate });
    }

    // Add members from invitedMembersForTrip sequentially to avoid race conditions
    if (invitedMembersForTrip.length > 0) {
      for (const username of invitedMembersForTrip) {
        try {
          await addTripMember(auth.token, trip.id, { username });
          // Small delay to avoid overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`Failed to add member ${username}:`, error);
          // Continue with other members - don't fail the entire trip creation
        }
      }
    }

    // Clear invited members
    invitedMembersForTrip = [];

    // Navigate to trip detail view
    await showTripDetailView(trip.id);
  } catch (error) {
    console.error("Error creating trip:", error);
    if (newTripError) {
      const errorMsg = error.message || "Failed to create trip";
      // Check if it's a network error
      if (errorMsg.includes("fetch") || errorMsg.includes("Failed to fetch")) {
        newTripError.textContent =
          "Network error. Please check your connection and try again.";
      } else {
        newTripError.textContent = errorMsg;
      }
      newTripError.classList.remove("hidden");
    }
  } finally {
    // Restore button state
    if (createTripBtn && originalBtnText) {
      createTripBtn.disabled = false;
      createTripBtn.innerHTML = originalBtnText;
    }
  }
}

/**
 * Handle add member to trip creation
 */
async function handleAddTripMember() {
  const tripMemberUsernameInput = document.getElementById(
    "trip-member-username-input"
  );
  const tripMemberError = document.getElementById("trip-member-error");
  const tripMembersPreview = document.getElementById("trip-members-preview");

  const identifier = tripMemberUsernameInput?.value.trim() || "";

  if (!identifier) {
    if (tripMemberError) {
      tripMemberError.textContent = "Please enter a username or email";
      tripMemberError.classList.remove("hidden");
    }
    return;
  }

  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      showAuthView();
      return;
    }

    // Check if user exists by trying to get their info
    // Since we don't have a direct endpoint, we'll try to add them and catch the error
    // For now, just add to the list and validate when creating the trip

    // Check if already in list
    if (invitedMembersForTrip.includes(identifier)) {
      if (tripMemberError) {
        tripMemberError.textContent = "User already in the list";
        tripMemberError.classList.remove("hidden");
      }
      return;
    }

    // Add to list
    invitedMembersForTrip.push(identifier);

    // Clear input
    if (tripMemberUsernameInput) tripMemberUsernameInput.value = "";
    if (tripMemberError) tripMemberError.classList.add("hidden");

    // Update preview
    await updateTripMembersPreview(tripMembersPreview);
  } catch (error) {
    console.error("Error adding trip member:", error);
    if (tripMemberError) {
      tripMemberError.textContent = error.message || "Failed to add member";
      tripMemberError.classList.remove("hidden");
    }
  }
}

/**
 * Update trip members preview in new trip form
 */
function updateTripMembersPreview(container) {
  if (!container) return;

  const auth = getAuth().then((authData) => {
    if (!authData) return;

    const allMembers = [authData.username, ...invitedMembersForTrip];

    container.innerHTML = allMembers
      .map(
        (member, index) => `
      <div class="trip-member-preview-item ${index === 0 ? "current-user" : ""}">
        <span class="member-name">${escapeHtml(member)}</span>
        ${index > 0 ? `<button type="button" class="btn-remove-member" data-member="${escapeHtml(member)}" title="Remove">×</button>` : '<span class="member-badge">You</span>'}
      </div>
    `
      )
      .join("");

    // Attach remove handlers
    container.querySelectorAll(".btn-remove-member").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const member = btn.dataset.member;
        if (member) {
          invitedMembersForTrip = invitedMembersForTrip.filter(
            (m) => m !== member
          );
          await updateTripMembersPreview(container);
        }
      });
    });
  });
}

/**
 * Show new trip form view
 */
async function showNewTripView() {
  authView.classList.add("hidden");
  tripsView?.classList.add("hidden");
  tripDetailView?.classList.add("hidden");
  dashboardView.classList.add("hidden");
  regionSelectionView.classList.add("hidden");
  screenshotPreviewView.classList.add("hidden");
  manualFormView.classList.add("hidden");

  if (newTripView) {
    newTripView.classList.remove("hidden");
    const tripNameInput = document.getElementById("trip-name-input");
    const tripDateInput = document.getElementById("trip-date-input");
    const tripMemberUsernameInput = document.getElementById(
      "trip-member-username-input"
    );
    const newTripError = document.getElementById("new-trip-error");
    const tripMemberError = document.getElementById("trip-member-error");
    const tripMembersPreview = document.getElementById("trip-members-preview");

    // Reset
    invitedMembersForTrip = [];
    if (tripNameInput) tripNameInput.value = "";
    if (tripDateInput) tripDateInput.value = "";
    if (tripMemberUsernameInput) tripMemberUsernameInput.value = "";
    if (newTripError) {
      newTripError.classList.add("hidden");
      newTripError.textContent = "";
    }
    if (tripMemberError) {
      tripMemberError.classList.add("hidden");
      tripMemberError.textContent = "";
    }

    // Initialize members preview with current user
    await updateTripMembersPreview(tripMembersPreview);
  }
}

/**
 * Handle update trip name
 */
async function handleUpdateTripName() {
  const tripNameEditInput = document.getElementById("trip-name-edit-input");
  const tripNameEditContainer = document.getElementById(
    "trip-name-edit-container"
  );
  const tripDetailName = document.getElementById("trip-detail-name");

  const newName = tripNameEditInput?.value.trim() || "";

  if (!newName) {
    alert("Trip name cannot be empty");
    return;
  }

  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      showAuthView();
      return;
    }

    const tripId = await getCurrentTripId();
    if (!tripId) {
      alert("No trip selected");
      return;
    }

    await updateTripName(auth.token, tripId, { name: newName });

    // Update display
    if (tripDetailName) tripDetailName.textContent = newName;
    if (tripNameEditContainer) tripNameEditContainer.classList.add("hidden");
    if (tripDetailName) tripDetailName.style.display = "";

    // Reload trip detail
    await showTripDetailView(tripId);
  } catch (error) {
    console.error("Error updating trip name:", error);
    alert("Failed to update trip name: " + error.message);
  }
}

/**
 * Handle add member to trip
 */
async function handleAddMember() {
  const addMemberUsernameInput = document.getElementById(
    "add-member-username-input"
  );
  const addMemberError = document.getElementById("add-member-error");

  const username = addMemberUsernameInput?.value.trim() || "";

  if (!username) {
    if (addMemberError) {
      addMemberError.textContent = "Username is required";
      addMemberError.classList.remove("hidden");
    }
    return;
  }

  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      showAuthView();
      return;
    }

    const tripId = await getCurrentTripId();
    if (!tripId) {
      alert("No trip selected");
      return;
    }

    await addTripMember(auth.token, tripId, { username });

    // Clear input
    if (addMemberUsernameInput) addMemberUsernameInput.value = "";
    if (addMemberError) addMemberError.classList.add("hidden");

    // Reload trip detail to refresh members
    await showTripDetailView(tripId);
  } catch (error) {
    console.error("Error adding member:", error);
    if (addMemberError) {
      addMemberError.textContent = error.message || "Failed to add member";
      addMemberError.classList.remove("hidden");
    }
  }
}

// Settlement functionality removed

/**
 * Handle trip category click (for adding expenses)
 */
async function handleTripCategoryClick(categoryType) {
  const tripId = await getCurrentTripId();
  if (!tripId) {
    alert("Please select or create a trip first");
    return;
  }

  // Show category actions within trip detail view
  showCategoryActionsViewInTripDetail(categoryType);
}

/**
 * Show category actions view within trip detail view
 */
function showCategoryActionsViewInTripDetail(categoryType) {
  currentCategoryType = categoryType;

  const categoryNames = {
    flight: "Flight",
    hotel: "Hotel",
    restaurant: "Restaurant",
    attraction: "Attraction",
  };

  // Button labels per category
  const buttonLabels = {
    flight: {
      screenshot: "Screenshot booking",
      upload: "Upload file (PDF / image)",
      manual: "Enter manually",
    },
    hotel: {
      screenshot: "Screenshot booking",
      upload: "Upload file (PDF / image)",
      manual: "Enter manually",
    },
    restaurant: {
      screenshot: "Screenshot receipt",
      upload: "Upload receipt (PDF / image)",
      manual: "Enter manually",
    },
    attraction: {
      screenshot: "Screenshot ticket",
      upload: "Upload ticket (PDF / image)",
      manual: "Enter manually",
    },
  };

  const categoryActionsTitleTrip = document.getElementById(
    "category-actions-title-trip"
  );
  if (categoryActionsTitleTrip) {
    categoryActionsTitleTrip.textContent = `Add ${categoryNames[categoryType]} booking`;
  }

  // Update button labels
  const labels = buttonLabels[categoryType] || buttonLabels.flight;
  const btnCategoryScreenshotTrip = document.getElementById(
    "btn-category-screenshot-trip"
  );
  const btnCategoryUploadTrip = document.getElementById(
    "btn-category-upload-trip"
  );
  const btnCategoryManualTrip = document.getElementById(
    "btn-category-manual-trip"
  );

  if (btnCategoryScreenshotTrip) {
    const textSpan = btnCategoryScreenshotTrip.querySelector(".btn-text");
    if (textSpan) textSpan.textContent = labels.screenshot;
  }
  if (btnCategoryUploadTrip) {
    const textSpan = btnCategoryUploadTrip.querySelector(".btn-text");
    if (textSpan) textSpan.textContent = labels.upload;
  }
  if (btnCategoryManualTrip) {
    const textSpan = btnCategoryManualTrip.querySelector(".btn-text");
    if (textSpan) textSpan.textContent = labels.manual;
  }

  // Hide home view, show category actions
  const homeViewTrip = document.getElementById("home-view-trip");
  const categoryActionsViewTrip = document.getElementById(
    "category-actions-view-trip"
  );

  if (homeViewTrip) homeViewTrip.classList.add("hidden");
  if (categoryActionsViewTrip)
    categoryActionsViewTrip.classList.remove("hidden");
}

/**
 * Show profile edit modal
 */
function showProfileEditModal() {
  const profileModal = document.getElementById("profile-modal");
  if (!profileModal) return;

  profileModal.classList.remove("hidden");

  // Load current user data
  getAuth().then((auth) => {
    if (!auth) return;

    const profileEditUsername = document.getElementById(
      "profile-edit-username"
    );
    const profileEditEmail = document.getElementById("profile-edit-email");

    if (profileEditUsername) profileEditUsername.value = auth.username || "";
    if (profileEditEmail) profileEditEmail.value = auth.email || "";

    // Show edit view, hide display view
    const profileDisplayView = document.getElementById("profile-display-view");
    const profileEditView = document.getElementById("profile-edit-view");

    if (profileDisplayView) profileDisplayView.classList.add("hidden");
    if (profileEditView) profileEditView.classList.remove("hidden");
  });
}

/**
 * Handle profile update
 */
async function handleProfileUpdate() {
  const profileEditUsername = document.getElementById("profile-edit-username");
  const profileEditEmail = document.getElementById("profile-edit-email");
  const profileEditError = document.getElementById("profile-edit-error");

  const username = profileEditUsername?.value.trim() || "";
  const email = profileEditEmail?.value.trim() || "";
  // Use username as name
  const name = username;

  if (!username || !email) {
    if (profileEditError) {
      profileEditError.textContent = "Username and email are required";
      profileEditError.classList.remove("hidden");
    }
    return;
  }

  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      showAuthView();
      return;
    }

    // Note: Backend doesn't have update user endpoint yet
    // For now, we'll update locally and show a message
    // TODO: Implement backend endpoint PUT /user/me

    // Update auth data locally
    await setAuth({
      token: auth.token,
      userId: auth.userId,
      username,
      email,
      name: name || username,
    });

    // Update profile display
    updateProfileDisplay({ username, email, name: name || username });
    // Profile section removed - using header profile icon instead
    updateHeaderProfile({ username, email, name: name || username });

    // Close modal
    const profileModal = document.getElementById("profile-modal");
    if (profileModal) profileModal.classList.add("hidden");

    // Show display view
    const profileDisplayView = document.getElementById("profile-display-view");
    const profileEditView = document.getElementById("profile-edit-view");
    if (profileDisplayView) profileDisplayView.classList.remove("hidden");
    if (profileEditView) profileEditView.classList.add("hidden");

    alert(
      "Profile updated! (Note: Backend update endpoint not yet implemented)"
    );
  } catch (error) {
    console.error("Error updating profile:", error);
    if (profileEditError) {
      profileEditError.textContent =
        error.message || "Failed to update profile";
      profileEditError.classList.remove("hidden");
    }
  }
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
    attraction: "Attraction",
  };

  // Button labels per category
  const buttonLabels = {
    flight: {
      screenshot: "Screenshot booking",
      upload: "Upload file (PDF / image)",
      manual: "Enter manually",
    },
    hotel: {
      screenshot: "Screenshot booking",
      upload: "Upload file (PDF / image)",
      manual: "Enter manually",
    },
    restaurant: {
      screenshot: "Screenshot receipt",
      upload: "Upload receipt (PDF / image)",
      manual: "Enter manually",
    },
    attraction: {
      screenshot: "Screenshot ticket",
      upload: "Upload ticket (PDF / image)",
      manual: "Enter manually",
    },
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
      let textSpan = btnCategoryScreenshot.querySelector(".btn-text");
      if (!textSpan) {
        textSpan = document.createElement("span");
        textSpan.className = "btn-text";
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
      let textSpan = btnCategoryUpload.querySelector(".btn-text");
      if (!textSpan) {
        textSpan = document.createElement("span");
        textSpan.className = "btn-text";
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
      let textSpan = btnCategoryManual.querySelector(".btn-text");
      if (!textSpan) {
        textSpan = document.createElement("span");
        textSpan.className = "btn-text";
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

  // Hide category buttons when showing screenshot preview (for better layout)
  const homeViewTrip = document.getElementById("home-view-trip");
  const categoryActionsViewTrip = document.getElementById(
    "category-actions-view-trip"
  );
  const tabAddTripContent = document.getElementById("tab-add-trip-content");
  const isInTripDetail =
    tripDetailView && !tripDetailView.classList.contains("hidden");

  // Hide category buttons
  if (homeViewTrip) homeViewTrip.classList.add("hidden");
  if (categoryActionsViewTrip) categoryActionsViewTrip.classList.add("hidden");

  // If we're in trip detail view, move screenshot preview into tab content at the top
  if (isInTripDetail && tabAddTripContent && screenshotPreviewView) {
    // Remove from current parent if it exists
    if (screenshotPreviewView.parentNode) {
      screenshotPreviewView.parentNode.removeChild(screenshotPreviewView);
    }
    // Insert at the beginning of tab content (where the buttons were)
    tabAddTripContent.insertBefore(
      screenshotPreviewView,
      tabAddTripContent.firstChild
    );
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
    attraction: "Attraction",
  };

  const titleElement = document.getElementById("manual-form-title");
  if (titleElement) {
    if (editingBookingId) {
      titleElement.textContent = `Edit ${categoryNames[categoryType]} expense`;
    } else {
      titleElement.textContent = `Add ${categoryNames[categoryType]} expense`;
    }
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

  // Show/hide AI actions (for flight, hotel, restaurant, and attraction)
  const aiActionsContainer = document.getElementById("ai-actions-container");
  if (aiActionsContainer) {
    if (
      categoryType === "flight" ||
      categoryType === "hotel" ||
      categoryType === "restaurant" ||
      categoryType === "attraction"
    ) {
      aiActionsContainer.classList.remove("hidden");
    } else {
      aiActionsContainer.classList.add("hidden");
    }
  }

  // Check if we're in trip detail view
  const isInTripDetail =
    tripDetailView && !tripDetailView.classList.contains("hidden");

  if (isInTripDetail) {
    // Keep trip detail view visible, just show manual form on top
    // Hide category actions in trip detail
    const categoryActionsViewTrip = document.getElementById(
      "category-actions-view-trip"
    );
    if (categoryActionsViewTrip)
      categoryActionsViewTrip.classList.add("hidden");
  } else {
    // Normal flow - hide other views
    if (authView) authView.classList.add("hidden");
    if (dashboardView) dashboardView.classList.add("hidden");
    if (tripsView) tripsView.classList.add("hidden");
    if (tripDetailView) tripDetailView.classList.add("hidden");
  }

  if (regionSelectionView) regionSelectionView.classList.add("hidden");
  if (screenshotPreviewView) screenshotPreviewView.classList.add("hidden");
  if (manualFormView) {
    manualFormView.classList.remove("hidden");
    // Scroll to top when showing manual form
    manualFormView.scrollTop = 0;
  }

  // Show file preview if available
  updateFilePreview();

  // Update screenshot status and AI button text based on file type
  if (screenshotStatus) {
    if (fromScreenshot && lastScreenshotDataUrl) {
      const isPdf = lastScreenshotDataUrl.startsWith("data:application/pdf");
      const fileType = isPdf ? "PDF" : "image";
      screenshotStatus.textContent = `${fileType === "PDF" ? "PDF" : "Screenshot"} captured. You can try '${isPdf ? "Analyze PDF" : "Analyze image"}' to prefill this form, or fill in everything manually.`;
      screenshotStatus.style.display = "block";
    } else {
      screenshotStatus.textContent =
        "No screenshot; please fill the fields manually.";
      screenshotStatus.style.display = "block";
    }
  }

  // Update AI button text based on file type
  if (aiFillBtn) {
    const isPdf =
      lastScreenshotDataUrl &&
      lastScreenshotDataUrl.startsWith("data:application/pdf");
    const buttonText = lastScreenshotDataUrl
      ? isPdf
        ? "Analyze PDF"
        : "Analyze image"
      : "Extract from screenshot";

    // Find or create the text span
    let buttonTextElement = aiFillBtn.querySelector(".btn-text");
    if (!buttonTextElement) {
      // Create text span if it doesn't exist
      buttonTextElement = document.createElement("span");
      buttonTextElement.className = "btn-text";
      const icon =
        aiFillBtn.querySelector(".btn-icon") || aiFillBtn.querySelector("svg");
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
 */
async function handleLogin() {
  const identifier = loginEmailInput?.value.trim() || "";
  const password = loginPasswordInput?.value || "";

  if (!identifier || !password) {
    showAuthError("Please enter your email/username and password");
    return;
  }

  try {
    if (loginBtn) {
      loginBtn.disabled = true;
      const originalText = loginBtn.innerHTML;
      loginBtn.innerHTML =
        '<span class="loading-spinner"></span> Logging in...';
    }

    // Call real API
    const result = await loginUser({ identifier, password });

    // Save auth data
    await setAuth({
      token: result.token,
      userId: result.userId || result.user?.id,
      username: result.username || result.user?.username,
      email: result.email || result.user?.email,
      name: result.name || result.user?.name,
    });

    // Fetch user details to get complete info
    try {
      const user = await getMe(result.token);
      await setAuth({
        token: result.token,
        userId: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      });
      updateProfileDisplay(user);
    } catch (profileError) {
      console.warn("Failed to fetch user details:", profileError);
      // Use data from login response
      updateProfileDisplay(result);
    }

    // Clear form
    if (loginEmailInput) loginEmailInput.value = "";
    if (loginPasswordInput) loginPasswordInput.value = "";
    hideAuthError();

    // Show trips screen after login
    await showTripsView();
  } catch (error) {
    console.error("Login error:", error);
    showAuthError(
      error.message || "Login failed. Please check your credentials."
    );
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
 */
async function handleSignup() {
  const signupUsernameInput = document.getElementById("signup-username");

  const username = signupUsernameInput?.value.trim() || "";
  const email = signupEmailInput?.value.trim() || "";
  const password = signupPasswordInput?.value || "";
  const confirmPassword = signupConfirmInput?.value || "";

  if (!username || !email || !password) {
    showAuthError("Please enter username, email and password");
    return;
  }

  if (password !== confirmPassword) {
    showAuthError("Passwords do not match");
    return;
  }

  if (password.length < 4) {
    showAuthError("Password must be at least 4 characters");
    return;
  }

  // Use username as name
  const name = username;
  const finalName = name || username;

  try {
    if (signupBtn) {
      signupBtn.disabled = true;
      const originalText = signupBtn.innerHTML;
      signupBtn.innerHTML =
        '<span class="loading-spinner"></span> Signing up...';
    }

    // Call real API
    const result = await registerUser({
      username,
      name: finalName,
      email,
      password,
    });

    // Save auth data
    await setAuth({
      token: result.token,
      userId: result.userId || result.user?.id,
      username: result.username || result.user?.username,
      email: result.email || result.user?.email,
      name: result.name || result.user?.name,
    });

    // Fetch user details to get complete info
    try {
      const user = await getMe(result.token);
      await setAuth({
        token: result.token,
        userId: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      });
      updateProfileDisplay(user);
    } catch (profileError) {
      console.warn("Failed to fetch user details:", profileError);
      updateProfileDisplay(result);
    }

    // Clear form
    if (signupUsernameInput) signupUsernameInput.value = "";
    if (signupEmailInput) signupEmailInput.value = "";
    if (signupPasswordInput) signupPasswordInput.value = "";
    if (signupConfirmInput) signupConfirmInput.value = "";
    hideAuthError();

    // Show trips screen after signup
    await showTripsView();
  } catch (error) {
    console.error("Signup error:", error);
    showAuthError(error.message || "Signup failed. Please try again.");
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
 * @param {string|object} userData - Either email string or user object with {email, name, username}
 */
function updateProfileDisplay(userData) {
  if (!userData) {
    console.warn("updateProfileDisplay called without userData");
    return;
  }

  try {
    // Handle both string (email) and object (user data) formats
    let email, name, username;
    if (typeof userData === "string") {
      email = userData;
      name = email.split("@")[0];
      username = name;
    } else {
      email = userData.email || "";
      name = userData.name || userData.username || email.split("@")[0] || "";
      username = userData.username || name;
    }

    if (!email) {
      console.warn("updateProfileDisplay: no email provided");
      return;
    }

    // Get initials from name or username
    const initials = (name || username || email).substring(0, 2).toUpperCase();

    // Update profile section (safely check if elements exist)
    const profileNameEl = document.getElementById("profile-name");
    const profileEmailEl = document.getElementById("profile-email-display");
    const profilePictureEl = document.getElementById("profile-picture");

    if (profileNameEl) {
      profileNameEl.textContent = name || username || email.split("@")[0];
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
      modalNameEl.textContent = name || username || email.split("@")[0];
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
      if (
        dataUrl &&
        (dataUrl.startsWith("data:image/") ||
          dataUrl.startsWith("data:application/pdf"))
      ) {
        resolve(dataUrl);
      } else {
        reject(
          new Error(
            "Invalid file format. Please upload an image (PNG, JPG, etc.) or PDF file."
          )
        );
      }
    };
    reader.onerror = (e) =>
      reject(
        new Error(
          "Failed to read file: " + (e.target.error?.message || "Unknown error")
        )
      );
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
    currentFileName = file.name;
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
  if (saveBookingBtn) {
    saveBookingBtn.addEventListener(
      "click",
      async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleSaveBooking();
      },
      { passive: false }
    );
  }

  if (cancelBookingBtn) {
    cancelBookingBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleCancelBooking();
      },
      { passive: false }
    );
  }

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
  const formElement = document.getElementById(
    `manual-form-${currentCategoryType}`
  );
  if (formElement) {
    const inputs = formElement.querySelectorAll(
      'input:not([type="file"]), select, textarea'
    );
    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        saveFormData();
      });
      input.addEventListener("change", () => {
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
    createdAt: editingBookingId ? undefined : new Date().toISOString(), // Keep original createdAt when editing
    screenshotAttached: !!lastScreenshotDataUrl,
  };

  // If editing, preserve the ID
  if (editingBookingId) {
    booking.id = editingBookingId;
  }

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

    if (
      !airline ||
      !flightNumber ||
      !origin ||
      !destination ||
      !departureDateTime ||
      !price ||
      price <= 0
    ) {
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

    if (
      !hotelName ||
      !hotelAddress ||
      !city ||
      !country ||
      !checkInDate ||
      !checkOutDate ||
      !nights ||
      !guests ||
      !price ||
      price <= 0
    ) {
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
    const receiptFile = document.getElementById("field-restaurant-receipt")
      ?.files[0];
    const notes = getFieldValue("field-notes-restaurant");

    if (
      !restaurantName ||
      !visitDateTime ||
      !partySize ||
      !price ||
      price <= 0
    ) {
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
    const ticketPricePerPerson = getFieldNumber(
      "field-ticket-price-per-person"
    );
    const price = getFieldNumber("field-price-attraction");
    const currency = getSelectValue("field-currency-attraction");
    const platform = getFieldValue("field-platform-attraction");
    const notes = getFieldValue("field-notes-attraction");

    if (
      !attractionName ||
      !locationText ||
      !visitDateTime ||
      !ticketCount ||
      !ticketPricePerPerson ||
      !price ||
      price <= 0
    ) {
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
    if (formError) {
      formError.textContent = "No category selected";
      formError.classList.remove("hidden");
    }
    return;
  }

  // Check if there's a current trip selected
  const tripId = await getCurrentTripId();
  if (!tripId) {
    if (formError) {
      formError.textContent = "Please select or create a trip first";
      formError.classList.remove("hidden");
    }
    alert("Please select or create a trip first");
    return;
  }

  const booking = await saveBookingFromForm(currentCategoryType);
  if (!booking) {
    return; // Validation failed
  }

  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      showAuthView();
      return;
    }

    // Extract amount and description from booking
    // The booking object stores price as "totalPrice" (not "price")
    const amount = parseFloat(
      booking.totalPrice ||
        booking.price ||
        booking["field-price"] ||
        booking["field-price-hotel"] ||
        booking["field-price-restaurant"] ||
        booking["field-price-attraction"] ||
        0
    );

    // Build description from booking data
    let description = booking.description;
    if (!description || description.trim() === "") {
      if (booking["field-airline"] && booking["field-flight-number"]) {
        description = `${booking["field-airline"]} ${booking["field-flight-number"]}`;
      } else if (booking["field-hotel-name"]) {
        description = booking["field-hotel-name"];
      } else if (booking["field-restaurant-name"]) {
        description = booking["field-restaurant-name"];
      } else if (booking["field-attraction-name"]) {
        description = booking["field-attraction-name"];
      } else {
        description = `${currentCategoryType} expense`;
      }
    }

    // Ensure description is not empty
    if (!description || description.trim() === "") {
      description = `${currentCategoryType} expense`;
    }

    // Create expense for the current trip
    if (editingBookingId) {
      // Update existing expense
      // API: PUT /expense/detail/:expenseId
      // API Example: { "description": "Updated Lunch", "amount": 300 }
      await updateExpense(auth.token, editingBookingId, {
        description: description.trim(),
        amount: parseFloat(amount),
      });
      alert("Expense updated!");
    } else {
      // Create new expense
      // API: POST /expense/:tripId
      // Location: src/popup.js:3265 (handleSaveBooking function)
      // API Example: { "description": "Lunch", "amount": 200 }
      // For "equal" type, we can omit type field - backend defaults to "equal"

      // Ensure all fields are properly formatted
      const expenseDescription = description.trim();
      const expenseAmount = parseFloat(amount);

      // Validate before sending
      if (!expenseDescription || expenseDescription === "") {
        throw new Error("Expense description is required");
      }

      if (isNaN(expenseAmount) || expenseAmount <= 0) {
        throw new Error("Expense amount must be greater than 0");
      }

      // Build payload matching the API exactly
      // API Example: { "description": "Lunch", "amount": 200 }
      // For "equal" type, we omit the type field - backend defaults to "equal"
      const expensePayload = {
        description: expenseDescription,
        amount: expenseAmount,
        // No type field - backend will default to "equal"
      };

      console.log("=== CREATING EXPENSE ===");
      console.log("Location: src/popup.js:3265 (handleSaveBooking function)");
      console.log("API Endpoint: POST /expense/" + tripId);
      console.log("Payload:", JSON.stringify(expensePayload, null, 2));

      // Show loading overlay
      showLoadingOverlay("Saving expense...");

      const response = await createExpense(auth.token, tripId, expensePayload);
      console.log("✅ Expense created successfully:", response);

      // Hide loading and show success animation
      hideLoadingOverlay();
      showSuccessAnimation("Booking saved!");
    }

    // Clear editing mode
    editingBookingId = null;

    // Reload expenses if on history tab (old dashboard)
    if (tabHistory && tabHistory.classList.contains("active")) {
      await loadHistoryBookings();
    }

    // If we're in trip detail view, reload expenses
    if (tripDetailView && !tripDetailView.classList.contains("hidden")) {
      const tabHistoryTrip = document.getElementById("tab-history-trip");
      if (tabHistoryTrip && tabHistoryTrip.classList.contains("active")) {
        await loadTripExpensesHistory(tripId);
      }
      // Also close manual form and go back to trip detail
      if (manualFormView) manualFormView.classList.add("hidden");
      // Show home view in trip detail
      const homeViewTrip = document.getElementById("home-view-trip");
      if (homeViewTrip) homeViewTrip.classList.remove("hidden");
    }

    // Clear form and screenshot
    clearManualForm();

    // Clear pending screenshot flag
    chrome.storage.local.remove([
      "pendingScreenshot",
      "lastScreenshot",
      "lastScreenshotRegion",
    ]);

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
  // Hide manual form
  if (manualFormView) manualFormView.classList.add("hidden");

  // Check if we're in trip detail view
  const isInTripDetail =
    tripDetailView && !tripDetailView.classList.contains("hidden");

  if (isInTripDetail) {
    // Show home view with category buttons in trip detail
    const homeViewTrip = document.getElementById("home-view-trip");
    const categoryActionsViewTrip = document.getElementById(
      "category-actions-view-trip"
    );

    if (homeViewTrip) homeViewTrip.classList.remove("hidden");
    if (categoryActionsViewTrip)
      categoryActionsViewTrip.classList.add("hidden");
  } else {
    // Show category actions view (which shows the 4 buttons)
    if (currentCategoryType) {
      showCategoryActionsView(currentCategoryType);
    } else {
      // Show home view if no category selected
      showHomeView();
    }
  }

  // Clear form and screenshot
  clearManualForm();
  editingBookingId = null;

  // Clear form data
  if (currentCategoryType) {
    chrome.storage.local.remove([`formData_${currentCategoryType}`]);
  }
}

async function handleCancelBookingOld() {
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

  // Store original button content if not already stored
  if (!aiFillBtn.getAttribute("data-original-html")) {
    aiFillBtn.setAttribute("data-original-html", aiFillBtn.innerHTML);
  }

  // Disable button during extraction
  aiFillBtn.disabled = true;
  aiFillBtn.classList.add("loading", "btn-loading");
  aiFillBtn.innerHTML =
    '<span class="loading-spinner-small"></span> Extracting...';

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
    const data = await analyzeBookingScreenshot(
      lastScreenshotDataUrl,
      currentCategoryType || "flight"
    );

    console.log("AI extraction result:", data);

    // Prefill form fields from AI response based on category type
    let fieldsFilled = 0;

    if (currentCategoryType === "hotel") {
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
      const currencyHotelInput = document.getElementById(
        "field-currency-hotel"
      );
      const platformHotelInput = document.getElementById(
        "field-platform-hotel"
      );
      const reservationIdInput = document.getElementById(
        "field-reservation-id"
      );
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
          notesHotelInput.value =
            existingNotes + "\n\n[AI Extracted]: " + data.notes;
        } else {
          notesHotelInput.value = "[AI Extracted]: " + data.notes;
        }
        fieldsFilled++;
        console.log("Filled notes");
      }

      console.log(
        "Hotel extraction complete. Total fields filled:",
        fieldsFilled
      );
    } else if (currentCategoryType === "restaurant") {
      // Restaurant-specific fields
      const restaurantNameInput = document.getElementById(
        "field-restaurant-name"
      );
      const locationTextInput = document.getElementById("field-location-text");
      const googleMapsUrlInput = document.getElementById(
        "field-google-maps-url"
      );
      const visitDateTimeInput = document.getElementById(
        "field-visit-datetime"
      );
      const partySizeInput = document.getElementById("field-party-size");
      const priceRestaurantInput = document.getElementById(
        "field-price-restaurant"
      );
      const currencyRestaurantInput = document.getElementById(
        "field-currency-restaurant"
      );
      const notesRestaurantInput = document.getElementById(
        "field-notes-restaurant"
      );

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
      if (
        data.party_size !== null &&
        data.party_size !== undefined &&
        partySizeInput
      ) {
        partySizeInput.value = data.party_size;
        fieldsFilled++;
        console.log("Filled party size:", data.party_size);
      }
      if (
        data.price !== null &&
        data.price !== undefined &&
        priceRestaurantInput
      ) {
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
          notesRestaurantInput.value =
            existingNotes + "\n\n[AI Extracted]: " + data.notes;
        } else {
          notesRestaurantInput.value = "[AI Extracted]: " + data.notes;
        }
        fieldsFilled++;
        console.log("Filled notes");
      }

      // Handle dishes extraction
      if (data.dishes && Array.isArray(data.dishes) && data.dishes.length > 0) {
        extractedDishes = data.dishes
          .map((dish) => ({
            name: dish.name || "",
            price:
              typeof dish.price === "number"
                ? dish.price
                : typeof dish.price === "string"
                  ? parseFloat(dish.price.replace(/[^0-9.-]/g, ""))
                  : 0,
          }))
          .filter((dish) => dish.name && dish.price > 0);

        // Display dishes in the UI
        renderDishesList();
        fieldsFilled++;
        console.log(
          "Extracted and displayed",
          extractedDishes.length,
          "dishes"
        );
      }

      console.log(
        "Restaurant extraction complete. Total fields filled:",
        fieldsFilled
      );
    } else if (currentCategoryType === "attraction") {
      // Attraction-specific fields
      const attractionNameInput = document.getElementById(
        "field-attraction-name"
      );
      const locationTextInput = document.getElementById(
        "field-location-text-attraction"
      );
      const googleMapsUrlInput = document.getElementById(
        "field-google-maps-url-attraction"
      );
      const visitDateTimeInput = document.getElementById(
        "field-visit-datetime-attraction"
      );
      const ticketCountInput = document.getElementById("field-ticket-count");
      const ticketPricePerPersonInput = document.getElementById(
        "field-ticket-price-per-person"
      );
      const priceAttractionInput = document.getElementById(
        "field-price-attraction"
      );
      const currencyAttractionInput = document.getElementById(
        "field-currency-attraction"
      );
      const platformAttractionInput = document.getElementById(
        "field-platform-attraction"
      );
      const notesAttractionInput = document.getElementById(
        "field-notes-attraction"
      );

      if (data.attraction_name && attractionNameInput) {
        attractionNameInput.value = data.attraction_name;
        fieldsFilled++;
        console.log("Filled attraction name:", data.attraction_name);
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
        updateGoogleMapsButtons();
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
      if (
        data.ticket_count !== null &&
        data.ticket_count !== undefined &&
        ticketCountInput
      ) {
        ticketCountInput.value = data.ticket_count;
        fieldsFilled++;
        console.log("Filled ticket count:", data.ticket_count);
      }
      if (
        data.ticket_price_per_person !== null &&
        data.ticket_price_per_person !== undefined &&
        ticketPricePerPersonInput
      ) {
        ticketPricePerPersonInput.value = data.ticket_price_per_person;
        fieldsFilled++;
        console.log(
          "Filled ticket price per person:",
          data.ticket_price_per_person
        );
      }
      if (
        data.price !== null &&
        data.price !== undefined &&
        priceAttractionInput
      ) {
        priceAttractionInput.value = data.price;
        fieldsFilled++;
        console.log("Filled price:", data.price);
      }
      if (data.currency && currencyAttractionInput) {
        if (currencyAttractionInput.tagName === "SELECT") {
          currencyAttractionInput.value = data.currency.toUpperCase();
        } else {
          currencyAttractionInput.value = data.currency.toUpperCase();
        }
        fieldsFilled++;
        console.log("Filled currency:", data.currency);
      }
      if (data.platform && platformAttractionInput) {
        platformAttractionInput.value = data.platform;
        fieldsFilled++;
        console.log("Filled platform:", data.platform);
      }
      if (data.notes && notesAttractionInput) {
        const existingNotes = notesAttractionInput.value.trim();
        if (existingNotes) {
          notesAttractionInput.value =
            existingNotes + "\n\n[AI Extracted]: " + data.notes;
        } else {
          notesAttractionInput.value = "[AI Extracted]: " + data.notes;
        }
        fieldsFilled++;
        console.log("Filled notes");
      }

      console.log(
        "Attraction extraction complete. Total fields filled:",
        fieldsFilled
      );
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
          notesInput.value =
            existingNotes + "\n\n[AI Extracted]: " + data.notes;
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
    aiFillBtn.classList.remove("loading", "btn-loading");
    // Restore original button content
    const originalText =
      aiFillBtn.getAttribute("data-original-html") ||
      '<span class="btn-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="4"/></svg></span><span class="btn-text">Analyze with AI</span>';
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
  dishesList.querySelectorAll(".btn-remove-dish").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(btn.getAttribute("data-index"));
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
  const allInputs = document.querySelectorAll(
    "#manual-form-view input:not([id='dish-name-input']):not([id='dish-price-input']), #manual-form-view textarea, #manual-form-view select"
  );
  allInputs.forEach((input) => {
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
  currentFileName = null;
  extractedDishes = [];
  editingBookingId = null;

  // Clear dishes display
  const dishesList = document.getElementById("restaurant-dishes-list");
  if (dishesList) {
    dishesList.innerHTML = "";
  }

  // Clear file preview
  updateFilePreview();

  // Clear saved form data
  if (currentCategoryType) {
    chrome.storage.local.remove([`formData_${currentCategoryType}`]);
  }

  chrome.storage.local.remove(["lastScreenshot", "lastScreenshotRegion"]);
}

/**
 * Edit a booking - load it into the form
 * @param {string} bookingId - Booking ID to edit
 */
async function editBooking(bookingId) {
  try {
    const booking = await getBookingById(bookingId);
    if (!booking) {
      alert("Booking not found");
      return;
    }

    // Set editing mode
    editingBookingId = bookingId;
    currentCategoryType = booking.type;

    // Update title
    const titleElement = document.getElementById("manual-form-title");
    if (titleElement) {
      const categoryNames = {
        flight: "Flight",
        hotel: "Hotel",
        restaurant: "Restaurant",
        attraction: "Attraction",
      };
      titleElement.textContent = `Edit ${categoryNames[booking.type]} booking`;
    }

    // Show manual form view
    showManualFormView(booking.type, { fromScreenshot: false });

    // Load booking data into form
    const formElement = document.getElementById(`manual-form-${booking.type}`);
    if (!formElement) {
      console.error("Form element not found for type:", booking.type);
      return;
    }

    // Load data based on type
    if (booking.type === "flight") {
      if (booking.airline)
        document.getElementById("field-airline").value = booking.airline;
      if (booking.flightNumber)
        document.getElementById("field-flight-number").value =
          booking.flightNumber;
      if (booking.origin)
        document.getElementById("field-origin").value = booking.origin;
      if (booking.destination)
        document.getElementById("field-destination").value =
          booking.destination;
      if (booking.departureDateTime)
        document.getElementById("field-departure").value =
          booking.departureDateTime;
      if (booking.arrivalDateTime)
        document.getElementById("field-arrival").value =
          booking.arrivalDateTime;
      if (booking.totalPrice)
        document.getElementById("field-price").value = booking.totalPrice;
      if (booking.currency)
        document.getElementById("field-currency").value = booking.currency;
      if (booking.reference)
        document.getElementById("field-reference").value = booking.reference;
      if (booking.notes)
        document.getElementById("field-notes").value = booking.notes;
    } else if (booking.type === "hotel") {
      if (booking.hotelName)
        document.getElementById("field-hotel-name").value = booking.hotelName;
      if (booking.hotelAddress)
        document.getElementById("field-hotel-address").value =
          booking.hotelAddress;
      if (booking.city)
        document.getElementById("field-city").value = booking.city;
      if (booking.country)
        document.getElementById("field-country").value = booking.country;
      if (booking.checkInDate)
        document.getElementById("field-check-in").value = booking.checkInDate;
      if (booking.checkOutDate)
        document.getElementById("field-check-out").value = booking.checkOutDate;
      if (booking.nights)
        document.getElementById("field-nights").value = booking.nights;
      if (booking.roomType)
        document.getElementById("field-room-type").value = booking.roomType;
      if (booking.guests)
        document.getElementById("field-guests").value = booking.guests;
      if (booking.totalPrice)
        document.getElementById("field-price-hotel").value = booking.totalPrice;
      if (booking.currency)
        document.getElementById("field-currency-hotel").value =
          booking.currency;
      if (booking.platform)
        document.getElementById("field-platform-hotel").value =
          booking.platform;
      if (booking.reservationId)
        document.getElementById("field-reservation-id").value =
          booking.reservationId;
      if (booking.notes)
        document.getElementById("field-notes-hotel").value = booking.notes;
    } else if (booking.type === "restaurant") {
      if (booking.restaurantName)
        document.getElementById("field-restaurant-name").value =
          booking.restaurantName;
      if (booking.locationText)
        document.getElementById("field-location-text").value =
          booking.locationText;
      if (booking.googleMapsUrl)
        document.getElementById("field-google-maps-url").value =
          booking.googleMapsUrl;
      if (booking.visitDateTime)
        document.getElementById("field-visit-datetime").value =
          booking.visitDateTime;
      if (booking.partySize)
        document.getElementById("field-party-size").value = booking.partySize;
      if (booking.totalPrice)
        document.getElementById("field-price-restaurant").value =
          booking.totalPrice;
      if (booking.currency)
        document.getElementById("field-currency-restaurant").value =
          booking.currency;
      if (booking.notes)
        document.getElementById("field-notes-restaurant").value = booking.notes;
      if (booking.dishes && Array.isArray(booking.dishes)) {
        extractedDishes = booking.dishes;
        renderDishesList();
      }
    } else if (booking.type === "attraction") {
      if (booking.attractionName)
        document.getElementById("field-attraction-name").value =
          booking.attractionName;
      if (booking.locationText)
        document.getElementById("field-location-text-attraction").value =
          booking.locationText;
      if (booking.googleMapsUrl)
        document.getElementById("field-google-maps-url-attraction").value =
          booking.googleMapsUrl;
      if (booking.visitDateTime)
        document.getElementById("field-visit-datetime-attraction").value =
          booking.visitDateTime;
      if (booking.ticketCount)
        document.getElementById("field-ticket-count").value =
          booking.ticketCount;
      if (booking.ticketPricePerPerson)
        document.getElementById("field-ticket-price-per-person").value =
          booking.ticketPricePerPerson;
      if (booking.totalPrice)
        document.getElementById("field-price-attraction").value =
          booking.totalPrice;
      if (booking.currency)
        document.getElementById("field-currency-attraction").value =
          booking.currency;
      if (booking.platform)
        document.getElementById("field-platform-attraction").value =
          booking.platform;
      if (booking.notes)
        document.getElementById("field-notes-attraction").value = booking.notes;
    }

    // Update Google Maps buttons visibility
    updateGoogleMapsButtons();

    // Navigate to Add tab
    if (tabAdd) tabAdd.classList.add("active");
    if (tabHistory) tabHistory.classList.remove("active");
    if (tabAddContent) tabAddContent.classList.remove("hidden");
    if (tabHistoryContent) tabHistoryContent.classList.add("hidden");

    // Save view state
    saveViewState();
  } catch (error) {
    console.error("Error editing booking:", error);
    alert("Failed to load booking for editing: " + error.message);
  }
}

/**
 * Load and display history bookings with filter
 * @param {string} filterType - Filter by type: "all" | "flight" | "hotel" | "restaurant" | "attraction"
 */
async function loadHistoryBookings(filterType = "all") {
  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      historyList.innerHTML =
        '<div class="empty-state">Please login to view expenses</div>';
      return;
    }

    const tripId = await getCurrentTripId();
    if (!tripId) {
      historyList.innerHTML =
        '<div class="empty-state">Please select or create a trip to view expenses</div>';
      return;
    }

    // Load expenses from backend
    const expenses = await getExpenses(auth.token, tripId);

    // Filter by category
    let filteredExpenses = expenses;
    if (filterType !== "all") {
      filteredExpenses = expenses.filter((e) => e.category === filterType);
    }

    // Sort by createdAt descending (newest first)
    const sortedExpenses = filteredExpenses.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0);
      const dateB = new Date(b.createdAt || b.created_at || 0);
      return dateB - dateA;
    });

    // Clear list
    historyList.innerHTML = "";

    if (sortedExpenses.length === 0) {
      const div = document.createElement("div");
      div.className = "empty-state";
      div.textContent = "No expenses found for this trip";
      historyList.appendChild(div);
    } else {
      sortedExpenses.forEach((expense) => {
        const card = document.createElement("div");
        card.className = "history-card";

        // Badge for category
        const badge = document.createElement("span");
        badge.className = "history-badge history-badge-default";
        badge.textContent = "Expense";

        // Title (description)
        const title = document.createElement("div");
        title.className = "history-title";
        title.textContent = expense.description || "Untitled Expense";

        // Date
        const date = document.createElement("div");
        date.className = "history-date";
        const dateValue =
          expense.createdAt || expense.created_at || new Date().toISOString();
        const dateObj = new Date(dateValue);
        date.textContent = dateObj.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        // Amount
        const price = document.createElement("div");
        price.className = "history-price";
        const priceFormatted = new Intl.NumberFormat().format(
          expense.amount || 0
        );
        price.textContent = `$${priceFormatted}`;

        // Edit and Delete buttons
        const actions = document.createElement("div");
        actions.className = "history-actions";

        const editBtn = document.createElement("button");
        editBtn.className = "btn-edit-booking";
        editBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        `;
        editBtn.title = "Edit expense";
        editBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          await editExpense(expense.id);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-delete-booking";
        deleteBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        `;
        deleteBtn.title = "Delete expense";
        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (confirm("Are you sure you want to delete this expense?")) {
            await deleteExpenseHandler(expense.id);
          }
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        card.appendChild(badge);
        card.appendChild(title);
        card.appendChild(date);
        card.appendChild(price);
        card.appendChild(actions);
        historyList.appendChild(card);
      });
    }
  } catch (error) {
    console.error("Load history error:", error);
    historyList.innerHTML =
      '<div class="empty-state">Error loading expenses</div>';
  }
}

/**
 * Delete expense handler
 */
async function deleteExpenseHandler(expenseId) {
  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      showAuthView();
      return;
    }

    await deleteExpense(auth.token, expenseId);

    // Reload expenses
    const tripId = await getCurrentTripId();
    if (tripId) {
      await loadHistoryBookings();
    }

    alert("Expense deleted!");
  } catch (error) {
    console.error("Error deleting expense:", error);
    alert("Failed to delete expense: " + error.message);
  }
}

/**
 * Edit expense handler
 */
async function editExpense(expenseId) {
  try {
    const auth = await getAuth();
    if (!auth || !auth.token) {
      showAuthView();
      return;
    }

    const expense = await getExpenseDetail(auth.token, expenseId);

    // Set editing mode
    editingBookingId = expenseId;
    // Default to flight category for editing (category field removed from database)
    currentCategoryType = "flight";

    // Show manual form with expense data
    showManualFormView(currentCategoryType, { fromScreenshot: false });

    // Fill form with expense data (simplified - just description and amount for now)
    // In a full implementation, you'd map all fields back to the form
  } catch (error) {
    console.error("Error loading expense:", error);
    alert("Failed to load expense: " + error.message);
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

  // Trips view event listeners
  const btnNewTrip = document.getElementById("btn-new-trip");
  if (btnNewTrip) {
    btnNewTrip.addEventListener("click", () => {
      showNewTripView();
    });
  }

  const btnBackTrips = document.getElementById("btn-back-trips");
  if (btnBackTrips) {
    btnBackTrips.addEventListener("click", () => {
      showTripsView();
    });
  }

  const btnBackToTrips = document.getElementById("btn-back-to-trips");
  if (btnBackToTrips) {
    btnBackToTrips.addEventListener("click", async () => {
      await showTripsView();
    });
  }

  const newTripForm = document.getElementById("new-trip-form");
  if (newTripForm) {
    newTripForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleCreateTrip();
    });
  }

  const btnCancelNewTrip = document.getElementById("btn-cancel-new-trip");
  if (btnCancelNewTrip) {
    btnCancelNewTrip.addEventListener("click", () => {
      showTripsView();
    });
  }

  // Trip detail view event listeners
  const btnEditTripName = document.getElementById("btn-edit-trip-name");
  const btnSaveTripName = document.getElementById("btn-save-trip-name");
  const btnCancelTripNameEdit = document.getElementById(
    "btn-cancel-trip-name-edit"
  );
  const tripNameEditInput = document.getElementById("trip-name-edit-input");
  const tripNameEditContainer = document.getElementById(
    "trip-name-edit-container"
  );
  const tripDetailName = document.getElementById("trip-detail-name");

  if (btnEditTripName) {
    btnEditTripName.addEventListener("click", () => {
      if (tripNameEditContainer)
        tripNameEditContainer.classList.remove("hidden");
      if (tripDetailName) tripDetailName.style.display = "none";
      if (tripNameEditInput && tripDetailName) {
        tripNameEditInput.value = tripDetailName.textContent;
        tripNameEditInput.focus();
      }
    });
  }

  if (btnSaveTripName) {
    btnSaveTripName.addEventListener("click", async () => {
      await handleUpdateTripName();
    });
  }

  if (btnCancelTripNameEdit) {
    btnCancelTripNameEdit.addEventListener("click", () => {
      if (tripNameEditContainer) tripNameEditContainer.classList.add("hidden");
      if (tripDetailName) tripDetailName.style.display = "";
    });
  }

  const btnAddMember = document.getElementById("btn-add-member");
  if (btnAddMember) {
    btnAddMember.addEventListener("click", async () => {
      await handleAddMember();
    });
  }

  const addMemberUsernameInput = document.getElementById(
    "add-member-username-input"
  );
  if (addMemberUsernameInput) {
    addMemberUsernameInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await handleAddMember();
      }
    });
  }

  // Settlement section removed

  // Trip category buttons (for adding expenses to current trip)
  const btnTripCategoryFlight = document.getElementById(
    "btn-trip-category-flight"
  );
  const btnTripCategoryHotel = document.getElementById(
    "btn-trip-category-hotel"
  );
  const btnTripCategoryRestaurant = document.getElementById(
    "btn-trip-category-restaurant"
  );
  const btnTripCategoryAttraction = document.getElementById(
    "btn-trip-category-attraction"
  );

  if (btnTripCategoryFlight) {
    btnTripCategoryFlight.addEventListener("click", () => {
      handleTripCategoryClick("flight");
    });
  }

  if (btnTripCategoryHotel) {
    btnTripCategoryHotel.addEventListener("click", () => {
      handleTripCategoryClick("hotel");
    });
  }

  if (btnTripCategoryRestaurant) {
    btnTripCategoryRestaurant.addEventListener("click", () => {
      handleTripCategoryClick("restaurant");
    });
  }

  if (btnTripCategoryAttraction) {
    btnTripCategoryAttraction.addEventListener("click", () => {
      handleTripCategoryClick("attraction");
    });
  }

  // Tab navigation in trip detail view
  const tabAddTrip = document.getElementById("tab-add-trip");
  const tabHistoryTrip = document.getElementById("tab-history-trip");
  const tabAddTripContent = document.getElementById("tab-add-trip-content");
  const tabHistoryTripContent = document.getElementById(
    "tab-history-trip-content"
  );

  if (tabAddTrip) {
    tabAddTrip.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (tabAddTrip) tabAddTrip.classList.add("active");
        if (tabHistoryTrip) tabHistoryTrip.classList.remove("active");
        if (tabAddTripContent) tabAddTripContent.classList.remove("hidden");
        if (tabHistoryTripContent)
          tabHistoryTripContent.classList.add("hidden");
      },
      { passive: false }
    );
  }

  if (tabHistoryTrip) {
    tabHistoryTrip.addEventListener(
      "click",
      async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (tabHistoryTrip) tabHistoryTrip.classList.add("active");
        if (tabAddTrip) tabAddTrip.classList.remove("active");
        if (tabHistoryTripContent)
          tabHistoryTripContent.classList.remove("hidden");
        if (tabAddTripContent) tabAddTripContent.classList.add("hidden");

        // Load expenses when switching to history tab
        const tripId = await getCurrentTripId();
        if (tripId) {
          await loadTripExpensesHistory(tripId);
        }
      },
      { passive: false }
    );
  }

  // Toggle members collapsible
  const btnToggleMembers = document.getElementById("btn-toggle-members");
  const tripMembersCollapsible = document.getElementById(
    "trip-members-collapsible"
  );
  const toggleMembersIcon = document.getElementById("toggle-members-icon");
  const tripNameHeader = document.getElementById("trip-name-header");

  if (btnToggleMembers && tripMembersCollapsible) {
    btnToggleMembers.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = tripMembersCollapsible.classList.contains("hidden");
      tripMembersCollapsible.classList.toggle("hidden");
      if (toggleMembersIcon) {
        toggleMembersIcon.style.transform = isHidden
          ? "rotate(180deg)"
          : "rotate(0deg)";
      }
    });
  }

  // Click trip name header to toggle members
  if (tripNameHeader && tripMembersCollapsible) {
    tripNameHeader.addEventListener("click", (e) => {
      // Don't toggle if clicking on edit button
      if (
        e.target.closest("#btn-edit-trip-name") ||
        e.target.closest("#btn-toggle-members")
      ) {
        return;
      }
      const isHidden = tripMembersCollapsible.classList.contains("hidden");
      tripMembersCollapsible.classList.toggle("hidden");
      if (toggleMembersIcon) {
        toggleMembersIcon.style.transform = isHidden
          ? "rotate(180deg)"
          : "rotate(0deg)";
      }
    });
  }

  // Profile edit button
  const btnEditProfile = document.getElementById("btn-edit-profile");
  if (btnEditProfile) {
    btnEditProfile.addEventListener("click", () => {
      showProfileEditModal();
    });
  }

  // Profile modal event listeners
  const profileModalClose = document.getElementById("profile-modal-close");
  const profileEditBtnModal = document.getElementById("profile-edit-btn-modal");
  const profileEditForm = document.getElementById("profile-edit-form");
  const profileCancelEditBtn = document.getElementById(
    "profile-cancel-edit-btn"
  );
  const profileLogoutBtn = document.getElementById("profile-logout-btn");

  if (profileModalClose) {
    profileModalClose.addEventListener("click", () => {
      if (profileModal) profileModal.classList.add("hidden");
      // Reset to display view
      const profileDisplayView = document.getElementById(
        "profile-display-view"
      );
      const profileEditView = document.getElementById("profile-edit-view");
      if (profileDisplayView) profileDisplayView.classList.remove("hidden");
      if (profileEditView) profileEditView.classList.add("hidden");
    });
  }

  if (profileEditBtnModal) {
    profileEditBtnModal.addEventListener("click", () => {
      showProfileEditModal();
    });
  }

  if (profileEditForm) {
    profileEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleProfileUpdate();
    });
  }

  if (profileCancelEditBtn) {
    profileCancelEditBtn.addEventListener("click", () => {
      const profileDisplayView = document.getElementById(
        "profile-display-view"
      );
      const profileEditView = document.getElementById("profile-edit-view");
      if (profileDisplayView) profileDisplayView.classList.remove("hidden");
      if (profileEditView) profileEditView.classList.add("hidden");
    });
  }

  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener("click", async () => {
      await clearAuth();
      await setCurrentTripId(null);
      showAuthView();
      if (profileModal) profileModal.classList.add("hidden");
    });
  }

  // Category actions in trip detail view
  const btnCategoryBackTrip = document.getElementById("btn-category-back-trip");
  const btnCategoryScreenshotTrip = document.getElementById(
    "btn-category-screenshot-trip"
  );
  const btnCategoryUploadTrip = document.getElementById(
    "btn-category-upload-trip"
  );
  const btnCategoryManualTrip = document.getElementById(
    "btn-category-manual-trip"
  );
  const fileInputTrip = document.getElementById("file-input-trip");
  const screenshotOptionsTrip = document.getElementById(
    "screenshot-options-trip"
  );
  const btnScreenshotFullTrip = document.getElementById(
    "btn-screenshot-full-trip"
  );
  const btnScreenshotRegionTrip = document.getElementById(
    "btn-screenshot-region-trip"
  );
  const btnScreenshotCancelTrip = document.getElementById(
    "btn-screenshot-cancel-trip"
  );

  if (btnCategoryBackTrip) {
    btnCategoryBackTrip.addEventListener("click", () => {
      const homeViewTrip = document.getElementById("home-view-trip");
      const categoryActionsViewTrip = document.getElementById(
        "category-actions-view-trip"
      );
      if (homeViewTrip) homeViewTrip.classList.remove("hidden");
      if (categoryActionsViewTrip)
        categoryActionsViewTrip.classList.add("hidden");
    });
  }

  if (btnCategoryScreenshotTrip) {
    btnCategoryScreenshotTrip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (screenshotOptionsTrip)
        screenshotOptionsTrip.classList.remove("hidden");
    });
  }

  if (btnCategoryUploadTrip) {
    btnCategoryUploadTrip.addEventListener("click", () => {
      if (fileInputTrip) fileInputTrip.click();
    });
  }

  if (btnCategoryManualTrip) {
    btnCategoryManualTrip.addEventListener("click", () => {
      // Show manual form view
      showManualFormView(currentCategoryType, { fromScreenshot: false });
      // Hide category actions in trip detail
      const categoryActionsViewTrip = document.getElementById(
        "category-actions-view-trip"
      );
      if (categoryActionsViewTrip)
        categoryActionsViewTrip.classList.add("hidden");
    });
  }

  if (fileInputTrip) {
    fileInputTrip.addEventListener("change", handleFileChange);
  }

  if (btnScreenshotFullTrip) {
    btnScreenshotFullTrip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (screenshotOptionsTrip) screenshotOptionsTrip.classList.add("hidden");
      handleScreenshotFull(e);
    });
  }

  if (btnScreenshotRegionTrip) {
    btnScreenshotRegionTrip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (screenshotOptionsTrip) screenshotOptionsTrip.classList.add("hidden");
      handleScreenshotRegion(e);
    });
  }

  if (btnScreenshotCancelTrip) {
    btnScreenshotCancelTrip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (screenshotOptionsTrip) screenshotOptionsTrip.classList.add("hidden");
    });
  }

  // History filter buttons in trip detail view
  const historyFilterAllTrip = document.getElementById(
    "history-filter-all-trip"
  );
  const historyFilterFlightTrip = document.getElementById(
    "history-filter-flight-trip"
  );
  const historyFilterHotelTrip = document.getElementById(
    "history-filter-hotel-trip"
  );
  const historyFilterRestaurantTrip = document.getElementById(
    "history-filter-restaurant-trip"
  );
  const historyFilterAttractionTrip = document.getElementById(
    "history-filter-attraction-trip"
  );

  const setActiveFilterTrip = (activeBtn) => {
    [
      historyFilterAllTrip,
      historyFilterFlightTrip,
      historyFilterHotelTrip,
      historyFilterRestaurantTrip,
      historyFilterAttractionTrip,
    ].forEach((btn) => {
      if (btn) btn.classList.remove("active");
    });
    if (activeBtn) activeBtn.classList.add("active");
  };

  if (historyFilterAllTrip) {
    historyFilterAllTrip.addEventListener("click", async () => {
      setActiveFilterTrip(historyFilterAllTrip);
      const tripId = await getCurrentTripId();
      if (tripId) {
        await loadTripExpensesHistory(tripId, "all");
      }
    });
  }

  if (historyFilterFlightTrip) {
    historyFilterFlightTrip.addEventListener("click", async () => {
      setActiveFilterTrip(historyFilterFlightTrip);
      const tripId = await getCurrentTripId();
      if (tripId) {
        await loadTripExpensesHistory(tripId, "flight");
      }
    });
  }

  if (historyFilterHotelTrip) {
    historyFilterHotelTrip.addEventListener("click", async () => {
      setActiveFilterTrip(historyFilterHotelTrip);
      const tripId = await getCurrentTripId();
      if (tripId) {
        await loadTripExpensesHistory(tripId, "hotel");
      }
    });
  }

  if (historyFilterRestaurantTrip) {
    historyFilterRestaurantTrip.addEventListener("click", async () => {
      setActiveFilterTrip(historyFilterRestaurantTrip);
      const tripId = await getCurrentTripId();
      if (tripId) {
        await loadTripExpensesHistory(tripId, "restaurant");
      }
    });
  }

  if (historyFilterAttractionTrip) {
    historyFilterAttractionTrip.addEventListener("click", async () => {
      setActiveFilterTrip(historyFilterAttractionTrip);
      const tripId = await getCurrentTripId();
      if (tripId) {
        await loadTripExpensesHistory(tripId, "attraction");
      }
    });
  }

  // Tab navigation (old dashboard - keep for backward compatibility)
  if (tabAdd) {
    tabAdd.addEventListener("click", () => {
      showHomeView();
    });
  }
  if (tabHistory) {
    tabHistory.addEventListener("click", async () => {
      await showHistoryView();
    });
  }

  // Category buttons (check for current trip)
  if (btnCategoryFlight) {
    btnCategoryFlight.addEventListener("click", async () => {
      const tripId = await getCurrentTripId();
      if (!tripId) {
        alert("Please select or create a trip first");
        return;
      }
      showCategoryActionsView("flight");
    });
  }
  if (btnCategoryHotel) {
    btnCategoryHotel.addEventListener("click", async () => {
      const tripId = await getCurrentTripId();
      if (!tripId) {
        alert("Please select or create a trip first");
        return;
      }
      showCategoryActionsView("hotel");
    });
  }
  if (btnCategoryRestaurant) {
    btnCategoryRestaurant.addEventListener("click", async () => {
      const tripId = await getCurrentTripId();
      if (!tripId) {
        alert("Please select or create a trip first");
        return;
      }
      showCategoryActionsView("restaurant");
    });
  }
  if (btnCategoryAttraction) {
    btnCategoryAttraction.addEventListener("click", async () => {
      const tripId = await getCurrentTripId();
      if (!tripId) {
        alert("Please select or create a trip first");
        return;
      }
      showCategoryActionsView("attraction");
    });
  }

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

  // File preview remove button
  const btnRemoveFile = document.getElementById("btn-remove-file");
  if (btnRemoveFile) {
    btnRemoveFile.addEventListener("click", (e) => {
      e.preventDefault();
      removeFile();
    });
  }

  // Google Maps buttons
  const btnOpenGmapsRestaurant = document.getElementById(
    "btn-open-gmaps-restaurant"
  );
  if (btnOpenGmapsRestaurant) {
    btnOpenGmapsRestaurant.addEventListener("click", (e) => {
      e.preventDefault();
      const url = document.getElementById("field-google-maps-url")?.value;
      if (url) {
        chrome.tabs.create({ url });
      }
    });
  }

  const btnOpenGmapsAttraction = document.getElementById(
    "btn-open-gmaps-attraction"
  );
  if (btnOpenGmapsAttraction) {
    btnOpenGmapsAttraction.addEventListener("click", (e) => {
      e.preventDefault();
      const url = document.getElementById(
        "field-google-maps-url-attraction"
      )?.value;
      if (url) {
        chrome.tabs.create({ url });
      }
    });
  }

  // Update Google Maps buttons on URL field changes
  const googleMapsUrlRestaurant = document.getElementById(
    "field-google-maps-url"
  );
  if (googleMapsUrlRestaurant) {
    googleMapsUrlRestaurant.addEventListener("input", updateGoogleMapsButtons);
    googleMapsUrlRestaurant.addEventListener("change", updateGoogleMapsButtons);
  }

  const googleMapsUrlAttraction = document.getElementById(
    "field-google-maps-url-attraction"
  );
  if (googleMapsUrlAttraction) {
    googleMapsUrlAttraction.addEventListener("input", updateGoogleMapsButtons);
    googleMapsUrlAttraction.addEventListener("change", updateGoogleMapsButtons);
  }

  // History filters
  historyFilterAll.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
    historyFilterAll.classList.add("active");
    loadHistoryBookings("all");
  });
  historyFilterFlight.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
    historyFilterFlight.classList.add("active");
    loadHistoryBookings("flight");
  });
  historyFilterHotel.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
    historyFilterHotel.classList.add("active");
    loadHistoryBookings("hotel");
  });
  historyFilterRestaurant.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
    historyFilterRestaurant.classList.add("active");
    loadHistoryBookings("restaurant");
  });
  historyFilterAttraction.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
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
      // Hide screenshot preview
      if (screenshotPreviewView) screenshotPreviewView.classList.add("hidden");

      // Show category buttons back (they will be hidden by manual form view)
      // But we need to show them if we're in trip detail
      const isInTripDetail =
        tripDetailView && !tripDetailView.classList.contains("hidden");

      if (currentCategoryType) {
        showManualFormView(currentCategoryType, { fromScreenshot: true });
        manualFormView.classList.remove("hidden");
        // Clear pending screenshot flag since we've moved to manual form
        chrome.storage.local.set({ pendingScreenshot: false });
        // Save view state
        saveViewState();
      } else {
        // Fallback to flight
        showManualFormView("flight", { fromScreenshot: true });
        manualFormView.classList.remove("hidden");
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
    // Clear screenshot
    lastScreenshotDataUrl = null;
    await chrome.storage.local.remove([
      "lastScreenshot",
      "pendingScreenshot",
      "lastScreenshotRegion",
    ]);

    // Hide screenshot preview and move it back to original location
    if (screenshotPreviewView) {
      screenshotPreviewView.classList.add("hidden");

      // If screenshot preview was moved into tab content, move it back to its original location
      const tabAddTripContent = document.getElementById("tab-add-trip-content");
      if (
        tabAddTripContent &&
        screenshotPreviewView.parentNode === tabAddTripContent
      ) {
        // Find the trip detail view section to insert after it (original location)
        const tripDetailSection = document.getElementById("trip-detail-view");
        if (tripDetailSection && tripDetailSection.parentNode) {
          // Insert after trip detail section (original location)
          if (tripDetailSection.nextSibling) {
            tripDetailSection.parentNode.insertBefore(
              screenshotPreviewView,
              tripDetailSection.nextSibling
            );
          } else {
            tripDetailSection.parentNode.appendChild(screenshotPreviewView);
          }
        }
      }
    }

    // Show category buttons back
    const homeViewTrip = document.getElementById("home-view-trip");
    const categoryActionsViewTrip = document.getElementById(
      "category-actions-view-trip"
    );

    // Check if we're in trip detail view
    const isInTripDetail =
      tripDetailView && !tripDetailView.classList.contains("hidden");

    if (isInTripDetail) {
      // Show category buttons in trip detail view
      if (homeViewTrip) homeViewTrip.classList.remove("hidden");
      if (categoryActionsViewTrip)
        categoryActionsViewTrip.classList.add("hidden");
    } else {
      // Go back to dashboard
      await showDashboardView();
    }
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
        profileModal.classList.remove("hidden");
        // Load current user data into modal
        getAuth().then((auth) => {
          if (auth) {
            const modalNameEl = document.getElementById("profile-modal-name");
            const modalEmailEl = document.getElementById("profile-modal-email");
            const modalPictureEl = document.getElementById(
              "profile-modal-picture"
            );
            if (modalNameEl)
              modalNameEl.textContent = auth.name || auth.username || "";
            if (modalEmailEl) modalEmailEl.textContent = auth.email || "";
            if (modalPictureEl) {
              const initials = (auth.name || auth.username || "U")
                .substring(0, 2)
                .toUpperCase();
              modalPictureEl.textContent = initials;
            }
          }
        });
      }
    });
  }

  if (profileModalClose) {
    profileModalClose.addEventListener("click", () => {
      if (profileModal) {
        profileModal.classList.add("hidden");
        // Reset to display view
        const profileDisplayView = document.getElementById(
          "profile-display-view"
        );
        const profileEditView = document.getElementById("profile-edit-view");
        if (profileDisplayView) profileDisplayView.classList.remove("hidden");
        if (profileEditView) profileEditView.classList.add("hidden");
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
