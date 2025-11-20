/**
 * Full page screenshot capture script
 * Injected into page to capture full page by scrolling and stitching
 */

console.log("Full page capture script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Full page capture script received message:", message.type);
  if (message.type === "START_FULLPAGE_CAPTURE") {
    console.log("Starting full page capture...");
    captureFullPage()
      .then((dataUrl) => {
        console.log("Full page capture successful, dataUrl length:", dataUrl?.length);
        chrome.runtime.sendMessage({
          type: "FULLPAGE_CAPTURE_COMPLETE",
          dataUrl,
        });
      })
      .catch((error) => {
        console.error("Full page capture error:", error, error.stack);
        chrome.runtime.sendMessage({
          type: "FULLPAGE_CAPTURE_COMPLETE",
          dataUrl: null,
          error: error.message,
        });
      });
    return true;
  }
  return false;
});

/**
 * Capture full page by scrolling and stitching screenshots
 */
async function captureFullPage() {
  console.log("captureFullPage called");
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Get the actual full page height - use the maximum of all possible height measurements
  const bodyHeight = Math.max(
    document.body.scrollHeight,
    document.body.offsetHeight
  );
  const documentHeight = Math.max(
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight,
    document.documentElement.clientHeight
  );
  const pageHeight = Math.max(bodyHeight, documentHeight, viewportHeight);

  console.log("Page dimensions:", {
    viewportWidth,
    viewportHeight,
    pageHeight,
  });

  // Store original scroll position
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;

  // If page fits in viewport, just capture once
  if (pageHeight <= viewportHeight) {
    console.log("Page fits in viewport, capturing once");
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "CAPTURE_VIEWPORT" },
        (response) => {
          window.scrollTo(originalScrollX, originalScrollY);
          if (response && response.dataUrl) {
            console.log("Single viewport capture successful");
            resolve(response.dataUrl);
          } else {
            reject(new Error("Failed to capture viewport"));
          }
        }
      );
    });
  }

  console.log("Page is longer than viewport, capturing multiple screenshots");
  // Scroll to top
  window.scrollTo(0, 0);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const screenshots = [];
  let currentY = 0;
  const scrollStep = Math.floor(viewportHeight * 0.95); // 95% overlap to avoid gaps

  console.log("Starting scroll capture, scrollStep:", scrollStep);

  // Capture screenshots while scrolling
  while (currentY < pageHeight) {
    console.log(`Capturing at scroll position: ${currentY}`);
    // Scroll to current position
    window.scrollTo(0, currentY);
    await new Promise((resolve) => setTimeout(resolve, 300)); // Wait for render

    // Capture viewport
    const screenshot = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "CAPTURE_VIEWPORT" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Capture error:", chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.dataUrl) {
            console.log(`Screenshot captured at y=${currentY}, length=${response.dataUrl.length}`);
            resolve(response.dataUrl);
          } else {
            reject(new Error("Failed to capture viewport"));
          }
        }
      );
    });

    screenshots.push({
      dataUrl: screenshot,
      y: currentY,
    });

    // Move to next position
    currentY += scrollStep;
  }

  console.log(`Captured ${screenshots.length} screenshots, restoring scroll position`);
  // Restore original scroll position
  window.scrollTo(originalScrollX, originalScrollY);

  // Stitch screenshots together
  return stitchScreenshots(screenshots, viewportWidth, viewportHeight, pageHeight);
}

/**
 * Stitch multiple screenshots into a single full page image
 */
function stitchScreenshots(screenshots, viewportWidth, viewportHeight, pageHeight) {
  return new Promise((resolve, reject) => {
    if (!screenshots || screenshots.length === 0) {
      reject(new Error("No screenshots to stitch"));
      return;
    }

    // Load all images
    const images = [];
    let loadedCount = 0;

    screenshots.forEach((screenshot, index) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === screenshots.length) {
          try {
            const stitched = stitchImages(images, viewportWidth, viewportHeight, pageHeight);
            resolve(stitched);
          } catch (error) {
            reject(error);
          }
        }
      };
      img.onerror = () => {
        console.error(`Failed to load screenshot ${index}`);
        loadedCount++;
        if (loadedCount === screenshots.length) {
          try {
            const stitched = stitchImages(images, viewportWidth, viewportHeight, pageHeight);
            resolve(stitched);
          } catch (error) {
            reject(error);
          }
        }
      };
      img.src = screenshot.dataUrl;
      images.push({ img, y: screenshot.y });
    });
  });
}

/**
 * Stitch loaded images together on canvas
 */
function stitchImages(imageData, viewportWidth, viewportHeight, pageHeight) {
  console.log("Stitching images:", {
    imageCount: imageData.length,
    viewportWidth,
    viewportHeight,
    pageHeight,
  });

  if (imageData.length === 0) {
    throw new Error("No images to stitch");
  }

  // Get actual dimensions from first image (captureVisibleTab returns at devicePixelRatio scale)
  const firstImg = imageData[0].img;
  const actualImageWidth = firstImg.width;
  const actualImageHeight = firstImg.height;
  
  // Calculate device pixel ratio from actual image dimensions
  const devicePixelRatio = actualImageWidth / viewportWidth;
  console.log("Device pixel ratio:", devicePixelRatio, "Image dimensions:", actualImageWidth, actualImageHeight);

  // Calculate full page dimensions at device pixel ratio scale
  const scaledPageHeight = Math.round(pageHeight * devicePixelRatio);
  const scaledViewportWidth = actualImageWidth;
  const scaledViewportHeight = actualImageHeight;

  console.log("Canvas dimensions:", scaledViewportWidth, scaledPageHeight);

  // Create canvas for full page
  const canvas = document.createElement("canvas");
  canvas.width = scaledViewportWidth;
  canvas.height = scaledPageHeight;
  const ctx = canvas.getContext("2d");

  // Fill with white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, scaledViewportWidth, scaledPageHeight);

  // Draw each screenshot at its position
  imageData.forEach(({ img, y }, index) => {
    if (img && img.complete && img.width > 0 && img.height > 0) {
      const scaledY = Math.round(y * devicePixelRatio);
      console.log(`Drawing image ${index} at y=${scaledY}, size=${img.width}x${img.height}`);
      
      // Draw the entire image at the correct position
      // drawImage(img, dx, dy) - draws entire image at destination position
      ctx.drawImage(img, 0, scaledY);
    } else {
      console.warn(`Skipping invalid image ${index}:`, { complete: img?.complete, width: img?.width, height: img?.height });
    }
  });

  console.log("Stitching complete, canvas size:", canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

