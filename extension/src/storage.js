/**
 * Storage helper module
 * Wraps chrome.storage.sync for auth data and current trip management
 */

/**
 * Auth data structure
 * @typedef {Object} AuthData
 * @property {string} token - Auth token
 * @property {string} userId - User ID
 * @property {string} username - Username
 * @property {string} [email] - Email address
 * @property {string} [name] - Full name
 */

/**
 * Save authentication data
 * @param {AuthData} auth - Auth data object
 */
export async function setAuth(auth) {
  await chrome.storage.sync.set({
    authToken: auth.token,
    userId: auth.userId,
    username: auth.username,
    userEmail: auth.email || auth.userEmail, // Support both for backward compatibility
    userName: auth.name || auth.userName, // Support both
    isLoggedIn: true,
  });
}

/**
 * Get authentication data
 * @returns {Promise<AuthData|null>}
 */
export async function getAuth() {
  const data = await chrome.storage.sync.get([
    'authToken',
    'userId',
    'username',
    'userEmail',
    'userName',
    'isLoggedIn'
  ]);
  
  if (data.isLoggedIn && data.authToken && data.userId && data.username) {
    return {
      token: data.authToken,
      userId: data.userId,
      username: data.username,
      email: data.userEmail,
      name: data.userName,
    };
  }
  
  return null;
}

/**
 * Clear authentication data (logout)
 */
export async function clearAuth() {
  await chrome.storage.sync.remove([
    'authToken',
    'userId',
    'username',
    'userEmail',
    'userName',
    'isLoggedIn'
  ]);
  
  // Also clear current trip
  await setCurrentTripId(null);
}

/**
 * Set the currently selected trip ID
 * @param {string|null} tripId - Trip ID or null to clear
 */
export async function setCurrentTripId(tripId) {
  if (tripId) {
    await chrome.storage.sync.set({ currentTripId: tripId });
  } else {
    await chrome.storage.sync.remove(['currentTripId']);
  }
}

/**
 * Get the currently selected trip ID
 * @returns {Promise<string|null>}
 */
export async function getCurrentTripId() {
  const data = await chrome.storage.sync.get(['currentTripId']);
  return data.currentTripId || null;
}

// ==================== LEGACY BOOKINGS STORAGE ====================
// These are kept for backward compatibility but should eventually be removed

/**
 * Storage key for bookings
 * @deprecated Use backend expenses instead
 */
const BOOKINGS_KEY = "tripledger_bookings";

/**
 * Get all bookings
 * @deprecated Use getExpenses from API instead
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
 * @deprecated Use createExpense from API instead
 * @param {Object} booking - Booking object (must include type field)
 * @returns {Promise<Object>} - Booking with generated ID
 */
export async function addBooking(booking) {
  const bookings = await getBookings();
  const withId = {
    id: booking.id || String(Date.now()) + "-" + Math.random().toString(16).slice(2),
    type: booking.type || "flight", // Default to flight for backward compatibility
    createdAt: booking.createdAt || new Date().toISOString(),
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

/**
 * Update an existing booking
 * @deprecated Use updateExpense from API instead
 * @param {Object} booking - Booking object with id
 * @returns {Promise<Object>} - Updated booking
 */
export async function updateBooking(booking) {
  if (!booking.id) {
    throw new Error("Booking ID is required for update");
  }
  
  const bookings = await getBookings();
  const index = bookings.findIndex(b => b.id === booking.id);
  
  if (index === -1) {
    throw new Error("Booking not found");
  }
  
  // Preserve original createdAt if not provided
  const updatedBooking = {
    ...bookings[index],
    ...booking,
    createdAt: booking.createdAt || bookings[index].createdAt,
    id: booking.id
  };
  
  bookings[index] = updatedBooking;
  
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [BOOKINGS_KEY]: bookings }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(updatedBooking);
      }
    });
  });
}

/**
 * Get a booking by ID
 * @deprecated Use getExpenseDetail from API instead
 * @param {string} id - Booking ID
 * @returns {Promise<Object|null>} - Booking or null if not found
 */
export async function getBookingById(id) {
  const bookings = await getBookings();
  return bookings.find(b => b.id === id) || null;
}
