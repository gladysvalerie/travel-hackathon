// Base URLs – adjust ports if needed
const MAIN_BACKEND_URL = "http://localhost:5000";   // your main Node backend
const EXT_SERVER_URL   = "http://localhost:3001";   // extension's OpenAI server

/**
 * Login against your main backend
 */
export async function apiLogin(identifier, password) {
    const res = await fetch(`${MAIN_BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
  
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Login failed");
    }
  
    return res.json();
}

/**
 * Signup against your main backend
 */
export async function apiSignup(username, email, name, password) {
  const res = await fetch(`${MAIN_BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, name, password }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Signup failed");
  }

  return res.json(); // expect { token, user: { email, ... } }
}

/**
 * Save booking to your main backend (you can adapt URL & payload)
 */
export async function saveBookingToServer(booking) {
  const res = await fetch(`${MAIN_BACKEND_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // optionally: "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(booking),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to save booking");
  }

  return res.json();
}

/**
 * Call the extension server to analyze screenshot/PDF
 * @param {string} imageDataUrl - data URL (image or pdf)
 * @param {string} bookingType - "flight" | "hotel" | "restaurant" | "attraction"
 */
export async function analyzeBookingScreenshot(imageDataUrl, bookingType = "flight") {
  const res = await fetch(`${EXT_SERVER_URL}/api/parse-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageDataUrl,
      bookingType,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to analyze booking screenshot");
  }

  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error || "AI analysis failed");
  }

  return json.data; // matches what popup.js expects (hotel/flight/restaurant/attraction fields)
}
