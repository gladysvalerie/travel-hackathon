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

