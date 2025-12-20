// Token Storage Utility
// Handles token storage for "Remember me" functionality
// - If rememberMe is true: stores in localStorage (persists across sessions)
// - If rememberMe is false: stores in sessionStorage (cleared when browser closes)

/**
 * Get token from storage (checks both localStorage and sessionStorage)
 * @returns {string|null} The token if found, null otherwise
 */
export const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

/**
 * Set token in appropriate storage based on rememberMe flag
 * @param {string} token - The authentication token
 * @param {boolean} rememberMe - Whether to persist token across sessions
 */
export const setToken = (token, rememberMe = false) => {
  // Clear both storages first to avoid conflicts
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  
  // Store in appropriate storage based on rememberMe
  if (rememberMe) {
    localStorage.setItem('token', token);
  } else {
    sessionStorage.setItem('token', token);
  }
};

/**
 * Remove token from both storages
 */
export const removeToken = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

