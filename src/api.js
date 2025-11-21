/**
 * API client module for TripLedger extension
 * All backend API calls go through here
 */

const BASE_URL = "http://localhost:5000";

/**
 * Helper function to handle API responses
 */
async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error =
      data?.error || data?.message || `HTTP error! status: ${response.status}`;
    throw new Error(error);
  }

  return data;
}

/**
 * Helper function to create fetch options with auth token
 */
function createFetchOptions(token, method = "GET", body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  if (body) {
    // For expense creation, only normalize type if it's explicitly provided
    // If type is not provided, don't add it - backend will default to "equal"
    // This matches the API example: { "description": "Lunch", "amount": 200 }
    if (body.type !== undefined && body.type !== null && body.type !== "") {
      body.type = String(body.type).trim();
      // If after trimming it's empty, remove it (let backend default)
      if (body.type === "") {
        delete body.type;
      } else if (!["equal", "equal_selected", "custom"].includes(body.type)) {
        // If invalid type, remove it (let backend default to "equal")
        console.warn(
          `API - Invalid type '${body.type}', removing (backend will default to 'equal')`
        );
        delete body.type;
      }
    }
    // If type is undefined/null/empty, don't add it - backend will default to "equal"

    options.body = JSON.stringify(body);
    console.log("API - Request body:", options.body);
  }

  return options;
}

// ==================== AUTH & USER ====================

/**
 * Register a new user
 * @param {Object} params - Registration parameters
 * @param {string} params.username - Username
 * @param {string} params.name - Full name
 * @param {string} params.email - Email address
 * @param {string} params.password - Password
 * @returns {Promise<{token: string, user: {id: string, username: string, email: string, name: string}}>}
 */
export async function registerUser({ username, name, email, password }) {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, name, email, password }),
  });

  const data = await handleResponse(response);

  // Normalize response format
  if (data.user && data.token) {
    return {
      token: data.token,
      userId: data.user.id,
      username: data.user.username,
      email: data.user.email,
      name: data.user.name,
      user: data.user,
    };
  }

  return data;
}

/**
 * Login user
 * @param {Object} params - Login parameters
 * @param {string} params.identifier - Username or email
 * @param {string} params.password - Password
 * @returns {Promise<{token: string, userId: string, username: string, email: string, name: string}>}
 */
export async function loginUser({ identifier, password }) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identifier, password }),
  });

  const data = await handleResponse(response);

  // Normalize response format
  if (data.user && data.token) {
    return {
      token: data.token,
      userId: data.user.id,
      username: data.user.username,
      email: data.user.email,
      name: data.user.name,
      user: data.user,
    };
  }

  return data;
}

/**
 * Get current user info
 * @param {string} token - Auth token
 * @returns {Promise<{id: string, username: string, email: string, name: string}>}
 */
export async function getMe(token) {
  const response = await fetch(
    `${BASE_URL}/user/me`,
    createFetchOptions(token, "GET")
  );

  return handleResponse(response);
}

// ==================== TRIPS & MEMBERS ====================

/**
 * Get all trips for current user
 * @param {string} token - Auth token
 * @returns {Promise<Array>} - Array of trip objects
 */
export async function getTrips(token) {
  const response = await fetch(
    `${BASE_URL}/trip`,
    createFetchOptions(token, "GET")
  );

  return handleResponse(response);
}

/**
 * Create a new trip
 * @param {string} token - Auth token
 * @param {Object} params - Trip parameters
 * @param {string} params.name - Trip name
 * @returns {Promise<Object>} - Created trip object
 */
export async function createTrip(token, { name }) {
  const response = await fetch(
    `${BASE_URL}/trip`,
    createFetchOptions(token, "POST", { name })
  );

  return handleResponse(response);
}

/**
 * Get trip detail by ID
 * @param {string} token - Auth token
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Trip object with members and details
 */
export async function getTripDetail(token, tripId) {
  const response = await fetch(
    `${BASE_URL}/trip/${tripId}`,
    createFetchOptions(token, "GET")
  );

  return handleResponse(response);
}

/**
 * Update trip name
 * @param {string} token - Auth token
 * @param {string} tripId - Trip ID
 * @param {Object} params - Update parameters
 * @param {string} params.name - New trip name
 * @returns {Promise<Object>} - Updated trip object
 */
export async function updateTripName(token, tripId, { name }) {
  const response = await fetch(
    `${BASE_URL}/trip/${tripId}`,
    createFetchOptions(token, "PUT", { name })
  );

  return handleResponse(response);
}

/**
 * Delete a trip
 * @param {string} token - Auth token
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Deletion confirmation
 */
export async function deleteTrip(token, tripId) {
  const response = await fetch(
    `${BASE_URL}/trip/${tripId}`,
    createFetchOptions(token, "DELETE")
  );

  return handleResponse(response);
}

/**
 * Add a member to a trip by username
 * @param {string} token - Auth token
 * @param {string} tripId - Trip ID
 * @param {Object} params - Member parameters
 * @param {string} params.username - Username to add
 * @returns {Promise<Object>} - Added member or confirmation
 */
export async function addTripMember(token, tripId, { username }) {
  const response = await fetch(
    `${BASE_URL}/tripmember/${tripId}/members`,
    createFetchOptions(token, "POST", { username })
  );

  return handleResponse(response);
}

// ==================== EXPENSES ====================

/**
 * Create an expense for a trip
 * @param {string} token - Auth token
 * @param {string} tripId - Trip ID
 * @param {Object} payload - Expense payload
 * @param {string} payload.description - Expense description
 * @param {number} payload.amount - Expense amount
 * @param {string} [payload.type] - Split type: "equal" | "custom" | "equal_selected"
 * @param {string} [payload.category] - Category: "flight" | "hotel" | "restaurant" | "attraction"
 * @param {string[]} [payload.members] - Usernames for equal_selected type
 * @param {Array<{username: string, shareAmount: number}>} [payload.splits] - Custom splits
 * @returns {Promise<Object>} - Created expense object
 */
export async function createExpense(token, tripId, payload) {
  const response = await fetch(
    `${BASE_URL}/expense/${tripId}`,
    createFetchOptions(token, "POST", payload)
  );

  return handleResponse(response);
}

/**
 * Get all expenses for a trip
 * @param {string} token - Auth token
 * @param {string} tripId - Trip ID
 * @returns {Promise<Array>} - Array of expense objects
 */
export async function getExpenses(token, tripId) {
  const response = await fetch(
    `${BASE_URL}/expense/${tripId}`,
    createFetchOptions(token, "GET")
  );

  return handleResponse(response);
}

/**
 * Get expense detail by ID
 * @param {string} token - Auth token
 * @param {string} expenseId - Expense ID
 * @returns {Promise<Object>} - Expense object with details
 */
export async function getExpenseDetail(token, expenseId) {
  const response = await fetch(
    `${BASE_URL}/expense/detail/${expenseId}`,
    createFetchOptions(token, "GET")
  );

  return handleResponse(response);
}

/**
 * Update an expense
 * @param {string} token - Auth token
 * @param {string} expenseId - Expense ID
 * @param {Object} payload - Update payload (same structure as createExpense)
 * @returns {Promise<Object>} - Updated expense object
 */
export async function updateExpense(token, expenseId, payload) {
  const response = await fetch(
    `${BASE_URL}/expense/detail/${expenseId}`,
    createFetchOptions(token, "PUT", payload)
  );

  return handleResponse(response);
}

/**
 * Delete an expense
 * @param {string} token - Auth token
 * @param {string} expenseId - Expense ID
 * @returns {Promise<Object>} - Deletion confirmation
 */
export async function deleteExpense(token, expenseId) {
  const response = await fetch(
    `${BASE_URL}/expense/detail/${expenseId}`,
    createFetchOptions(token, "DELETE")
  );

  return handleResponse(response);
}

// ==================== SETTLEMENT ====================

/**
 * Get settlement calculation for a trip
 * @param {string} token - Auth token
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Settlement object with who owes whom
 */
export async function getSettlement(token, tripId) {
  const response = await fetch(
    `${BASE_URL}/settlement/${tripId}`,
    createFetchOptions(token, "GET")
  );

  return handleResponse(response);
}

// ==================== LEGACY FUNCTIONS (for backward compatibility) ====================

/**
 * @deprecated Use loginUser instead
 */
export async function apiLogin(email, password) {
  return loginUser({ identifier: email, password });
}

/**
 * @deprecated Use registerUser instead
 */
export async function apiSignup(email, password) {
  // For backward compatibility, we'll need username and name
  // Extract username from email as fallback
  const username = email.split("@")[0];
  const name = username;

  return registerUser({ username, name, email, password });
}

/**
 * @deprecated Use createExpense instead
 * Save booking to server - converts booking to expense
 */
export async function saveBookingToServer(booking) {
  console.warn(
    "saveBookingToServer is deprecated. Use createExpense directly."
  );

  // This function is kept for backward compatibility
  // It should be called with a token and tripId, but the old code might not have that
  // We'll need to get it from storage
  const { getAuth, getCurrentTripId } = await import("./storage.js");
  const auth = await getAuth();
  const tripId = await getCurrentTripId();

  if (!auth || !auth.token) {
    throw new Error("Not authenticated. Please login first.");
  }

  if (!tripId) {
    throw new Error("No trip selected. Please select or create a trip first.");
  }

  // Convert booking to expense payload
  const amount = parseFloat(
    booking.price || booking["field-price"] || booking.amount || 0
  );
  const description =
    booking.description ||
    booking["field-airline"] ||
    booking["field-hotel-name"] ||
    booking["field-restaurant-name"] ||
    booking["field-attraction-name"] ||
    `${booking.type} booking`;

  const category = booking.type || "flight";

  return createExpense(auth.token, tripId, {
    description,
    amount,
    type: "equal",
    category,
  });
}

/**
 * @deprecated Use getExpenses instead
 */
export async function fetchBookingsFromServer() {
  console.warn(
    "fetchBookingsFromServer is deprecated. Use getExpenses instead."
  );

  const { getAuth, getCurrentTripId } = await import("./storage.js");
  const auth = await getAuth();
  const tripId = await getCurrentTripId();

  if (!auth || !auth.token || !tripId) {
    return [];
  }

  return getExpenses(auth.token, tripId);
}
