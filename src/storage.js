/**
 * Storage helper module
 * Wraps chrome.storage.sync for auth data management
 */

/**
 * Save authentication token and email
 * @param {string} token - Auth token
 * @param {string} email - User email
 */
export async function setAuth(token, email) {
  await chrome.storage.sync.set({
    authToken: token,
    userEmail: email,
    isLoggedIn: true
  });
}

/**
 * Get authentication data
 * @returns {Promise<{token: string, email: string}|null>}
 */
export async function getAuth() {
  const data = await chrome.storage.sync.get(['authToken', 'userEmail', 'isLoggedIn']);
  
  if (data.isLoggedIn && data.authToken && data.userEmail) {
    return {
      token: data.authToken,
      email: data.userEmail
    };
  }
  
  return null;
}

/**
 * Clear authentication data (logout)
 */
export async function clearAuth() {
  await chrome.storage.sync.remove(['authToken', 'userEmail', 'isLoggedIn']);
}

/**
 * Storage key for bookings
 */
const BOOKINGS_KEY = "tripledger_bookings";

/**
 * Get all bookings
 * @returns {Promise<Array>}
 */
export async function getBookings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([BOOKINGS_KEY], (result) => {
      resolve(result[BOOKINGS_KEY] || []);
    });
  });
}

/**
 * Add a new booking
 * @param {Object} booking - Booking object
 * @returns {Promise<Object>} - Booking with generated ID
 */
export async function addBooking(booking) {
  const bookings = await getBookings();
  const withId = {
    id: booking.id || String(Date.now()) + "-" + Math.random().toString(16).slice(2),
    ...booking
  };
  bookings.push(withId);
  
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [BOOKINGS_KEY]: bookings }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(withId);
      }
    });
  });
}

