/**
 * Content script for TripLedger extension
 * Runs on all pages to enable booking capture features
 */

console.log("TripLedger content script loaded");

// Region selection state
let isSelectingRegion = false;
let overlay = null;
let selectionBox = null;
let startX = 0;
let startY = 0;

/**
 * Create overlay and selection box for region selection
 */
function createRegionSelectionUI() {
  // Remove existing overlay if any
  if (overlay) {
    overlay.remove();
  }

  // Create overlay with darker background
  overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 999998;
    cursor: crosshair;
  `;

  // Create selection box
  selectionBox = document.createElement("div");
  selectionBox.style.cssText = `
    position: fixed;
    border: 2px solid #667eea;
    background: rgba(102, 126, 234, 0.1);
    pointer-events: none;
    z-index: 999999;
    display: none;
  `;

  overlay.appendChild(selectionBox);
  document.body.appendChild(overlay);

  // Mouse down - start selection
  overlay.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    isSelectingRegion = true;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.display = "block";
    updateSelectionBox(e.clientX, e.clientY);
  });

  // Mouse move - update selection
  overlay.addEventListener("mousemove", (e) => {
    if (!isSelectingRegion) return;
    e.preventDefault();
    e.stopPropagation();
    updateSelectionBox(e.clientX, e.clientY);
  });

  // Mouse up - finalize selection
  overlay.addEventListener("mouseup", (e) => {
    if (!isSelectingRegion) return;
    e.preventDefault();
    e.stopPropagation();

    const endX = e.clientX;
    const endY = e.clientY;

    // Calculate region
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    // Only send if region is large enough (at least 50x50)
    if (width >= 50 && height >= 50) {
      // Clean up overlay FIRST before sending message (so it's not in screenshot)
      cleanupRegionSelection();

      // Store current scroll position to ensure we capture at the same position
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;

      // Wait a brief moment to ensure overlay is fully removed from DOM
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: "REGION_SELECTED",
          region: {
            x,
            y,
            width,
            height,
            scale: window.devicePixelRatio || 1,
            scrollX,
            scrollY,
          },
        });
      }, 100);
    } else {
      // If region too small, just clean up
      cleanupRegionSelection();
    }
  });

  // Esc key - cancel selection
  document.addEventListener("keydown", handleEscKey, true);
}

/**
 * Update selection box position and size
 */
function updateSelectionBox(currentX, currentY) {
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  selectionBox.style.left = x + "px";
  selectionBox.style.top = y + "px";
  selectionBox.style.width = width + "px";
  selectionBox.style.height = height + "px";
}

/**
 * Clean up region selection UI
 */
function cleanupRegionSelection() {
  isSelectingRegion = false;
  if (overlay) {
    overlay.remove();
    overlay = null;
    selectionBox = null;
  }
  document.removeEventListener("keydown", handleEscKey, true);
}

/**
 * Handle Esc key to cancel selection
 */
function handleEscKey(e) {
  if (e.key === "Escape" && isSelectingRegion) {
    e.preventDefault();
    e.stopPropagation();
    cleanupRegionSelection();
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_REGION_SELECTION") {
    try {
      createRegionSelectionUI();
      sendResponse({ ok: true });
    } catch (error) {
      console.error("Error creating region selection UI:", error);
      sendResponse({ ok: false, error: error.message });
    }
  }
  return true;
});