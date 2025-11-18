/**
 * AI Client for TripLedger extension
 * Handles communication with the backend OpenAI Vision API
 */

// Backend base URL - change this for production deployment
const AI_BACKEND_BASE_URL = "http://localhost:3001";

/**
 * Analyze booking screenshot using OpenAI Vision API
 * @param {string} imageDataUrl - Base64 data URL of the screenshot (e.g., "data:image/png;base64,...")
 * @returns {Promise<Object>} - Parsed booking data
 * @throws {Error} - If API call fails or returns error
 */
export async function analyzeBookingScreenshot(imageDataUrl) {
  if (!imageDataUrl) {
    throw new Error("No screenshot data provided");
  }

  // Validate data URL format
  if (!imageDataUrl.startsWith('data:image/')) {
    throw new Error("Invalid image data URL format");
  }

  try {
    console.log("Sending screenshot to AI backend for analysis...");

    const response = await fetch(`${AI_BACKEND_BASE_URL}/api/parse-booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageDataUrl: imageDataUrl,
      }),
    });

    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
    }

    // Parse response
    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || "Unknown error from backend");
    }

    if (!result.data) {
      throw new Error("No data returned from AI analysis");
    }

    console.log("AI analysis successful:", result.data);
    return result.data;
  } catch (error) {
    console.error("AI analysis error:", error);
    
    // Provide user-friendly error messages
    if (error.message.includes("fetch")) {
      throw new Error("Cannot connect to AI backend. Make sure the server is running on " + AI_BACKEND_BASE_URL);
    }
    throw error;
  }
}

/**
 * Get the backend base URL (for configuration)
 * @returns {string}
 */
export function getBackendUrl() {
  return AI_BACKEND_BASE_URL;
}

