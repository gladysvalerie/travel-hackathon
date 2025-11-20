/**
 * API helper module
 * Placeholder functions for backend API calls
 * TODO: Replace with real fetch calls to backend
 */

/**
 * Mock login function
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{token: string, email: string}>}
 */
export async function apiLogin(email, password) {
  // TODO: replace with real backend call
  console.log("Mock login", email);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { 
    token: "FAKE_TOKEN", 
    email 
  };
}

/**
 * Mock signup function
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{token: string, email: string}>}
 */
export async function apiSignup(email, password) {
  // TODO: replace with real backend call
  console.log("Mock signup", email);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { 
    token: "FAKE_TOKEN", 
    email 
  };
}

/**
 * Save booking to server
 * @param {Object} booking - Booking object
 * @returns {Promise<Object>} - Saved booking from server
 */
export async function saveBookingToServer(booking) {
  // TODO: POST /bookings
  console.log("Mock saveBookingToServer", booking);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // For now, just resolve immediately
  return booking;
}

/**
 * Fetch bookings from server
 * @returns {Promise<Array>} - Array of bookings from server
 */
export async function fetchBookingsFromServer() {
  // TODO: GET /bookings
  console.log("Mock fetchBookingsFromServer");
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // For now, return empty array (will sync with local storage later)
  return [];
}

