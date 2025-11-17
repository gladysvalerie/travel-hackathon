/**
 * Background service worker for TripLedger
 * Handles extension-level messaging and actions
 */

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TAKE_FULLSCREEN_SCREENSHOT") {
    // Capture full page screenshot
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("Screenshot error:", chrome.runtime.lastError);
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        console.log("Screenshot captured successfully");
        sendResponse({ ok: true, dataUrl, mode: "fullscreen" });
      }
    });
    return true; // Keep sendResponse async - must return true for async callbacks
  }

  if (message.type === "TAKE_REGION_SCREENSHOT") {
    // Ask content script to start region selection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id) {
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }
      
      // Check if content script is loaded, inject if needed
      chrome.tabs.sendMessage(tab.id, { type: "START_REGION_SELECTION" }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script might not be loaded, try to inject it
          console.log("Content script not loaded, injecting...");
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['src/contentScript.js']
          }, () => {
            if (chrome.runtime.lastError) {
              console.error("Failed to inject content script:", chrome.runtime.lastError);
              sendResponse({ ok: false, error: "Cannot inject content script. Make sure you're on a web page, not a chrome:// page." });
            } else {
              // Wait a bit then try again
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { type: "START_REGION_SELECTION" });
              }, 100);
            }
          });
        }
      });
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "REGION_SELECTED") {
    const { x, y, width, height } = message.region;
    
    // Capture full screen then let popup crop it
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        console.error(chrome.runtime.lastError);
        return;
      }

      // Forward result to popup
      chrome.runtime.sendMessage({
        type: "SCREENSHOT_CAPTURED",
        mode: "region",
        dataUrl,
        region: { x, y, width, height }
      });
    });
    return true;
  }

  return false;
});

// Extension installed/started
chrome.runtime.onInstalled.addListener(() => {
  console.log("TripLedger extension installed");
});
