/**
 * Background service worker for TripLedger
 * Handles extension-level messaging and actions
 */

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TAKE_FULLSCREEN_SCREENSHOT") {
    // Capture full page screenshot by scrolling and stitching
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id) {
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }

      // Store the original sendResponse to use later
      let originalSendResponse = sendResponse;
      let responseSent = false;

      // Set a timeout fallback (30 seconds)
      const timeoutId = setTimeout(() => {
        if (!responseSent && originalSendResponse) {
          responseSent = true;
          chrome.runtime.onMessage.removeListener(messageListener);
          console.error("Full page capture timeout");
          originalSendResponse({
            ok: false,
            error: "Full page capture timed out after 30 seconds",
          });
        }
      }, 30000);

      // The script will send a message when done
      const messageListener = (msg, sender, responseCallback) => {
        if (msg.type === "FULLPAGE_CAPTURE_COMPLETE") {
          clearTimeout(timeoutId);
          chrome.runtime.onMessage.removeListener(messageListener);
          if (!responseSent && originalSendResponse) {
            responseSent = true;
            if (msg.dataUrl) {
              console.log(
                "Full page screenshot captured successfully, length:",
                msg.dataUrl.length
              );
              originalSendResponse({
                ok: true,
                dataUrl: msg.dataUrl,
                mode: "fullscreen",
              });
            } else {
              console.error("Full page capture failed:", msg.error);
              originalSendResponse({
                ok: false,
                error: msg.error || "Failed to capture full page",
              });
            }
          }
        }
        return true;
      };

      chrome.runtime.onMessage.addListener(messageListener);

      // Inject script to capture full page (has DOM access for canvas)
      console.log("Injecting full page capture script...");
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          files: ["src/fullPageCapture.js"],
        },
        (results) => {
          if (chrome.runtime.lastError) {
            clearTimeout(timeoutId);
            console.error("Script injection error:", chrome.runtime.lastError);
            chrome.runtime.onMessage.removeListener(messageListener);
            if (!responseSent && originalSendResponse) {
              responseSent = true;
              originalSendResponse({
                ok: false,
                error: chrome.runtime.lastError.message,
              });
            }
            return;
          }

          console.log("Script injected successfully, starting capture...");
          // Start the capture - wait a bit longer to ensure script is ready
          setTimeout(() => {
            chrome.tabs.sendMessage(
              tab.id,
              { type: "START_FULLPAGE_CAPTURE" },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Failed to send START_FULLPAGE_CAPTURE:",
                    chrome.runtime.lastError
                  );
                }
              }
            );
          }, 200);
        }
      );
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
      chrome.tabs.sendMessage(
        tab.id,
        { type: "START_REGION_SELECTION" },
        (response) => {
          if (chrome.runtime.lastError) {
            // Content script might not be loaded, try to inject it
            console.log("Content script not loaded, injecting...");
            chrome.scripting.executeScript(
              {
                target: { tabId: tab.id },
                files: ["src/contentScript.js"],
              },
              () => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Failed to inject content script:",
                    chrome.runtime.lastError
                  );
                  sendResponse({
                    ok: false,
                    error:
                      "Cannot inject content script. Make sure you're on a web page, not a chrome:// page.",
                  });
                } else {
                  // Wait a bit then try again
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, {
                      type: "START_REGION_SELECTION",
                    });
                  }, 100);
                }
              }
            );
          }
        }
      );
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "CAPTURE_VIEWPORT") {
    // Capture current viewport (used by full page capture)
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true, dataUrl });
      }
    });
    return true;
  }

  if (message.type === "REGION_SELECTED") {
    const {
      x,
      y,
      width,
      height,
      scale = 1,
      scrollX = 0,
      scrollY = 0,
    } = message.region;

    // Restore scroll position before capturing to ensure coordinates match
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.id) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            func: (sx, sy) => {
              window.scrollTo(sx, sy);
            },
            args: [scrollX, scrollY],
          },
          () => {
            // Wait a bit longer to ensure overlay is fully removed and scroll is complete
            setTimeout(() => {
              chrome.tabs.captureVisibleTab(
                null,
                { format: "png" },
                (dataUrl) => {
                  if (chrome.runtime.lastError || !dataUrl) {
                    console.error(
                      "captureVisibleTab error:",
                      chrome.runtime.lastError
                    );
                    return;
                  }

                  const region = {
                    x,
                    y,
                    width,
                    height,
                    scale,
                    scrollX,
                    scrollY,
                  };

                  // Save in storage so popup can pick it up later
                  chrome.storage.local.set({
                    lastScreenshot: dataUrl,
                    lastScreenshotRegion: region,
                    pendingScreenshot: true,
                  });

                  // Also notify any open popup immediately (if it's still open)
                  chrome.runtime.sendMessage({
                    type: "SCREENSHOT_CAPTURED",
                    mode: "region",
                    dataUrl,
                    region,
                  });
                }
              );
            }, 200); // Allow overlay cleanup and scroll before capture
          }
        );
      }
    });

    return true;
  }

  return false;
});

// Extension installed/started
chrome.runtime.onInstalled.addListener(() => {
  console.log("TripLedger extension installed");
});