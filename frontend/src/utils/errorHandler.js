// Error handling utilities

export const getErrorMessage = (error) => {
  // Check for specific error message first (more detailed)
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const handleApiError = (error, showToast = true) => {
  const message = getErrorMessage(error);
  
  if (showToast) {
    // You can integrate with a toast notification system here
    console.error('API Error:', message);
  }
  
  return message;
};

export const isNetworkError = (error) => {
  return !error.response && error.message === 'Network Error';
};

export const isAuthError = (error) => {
  return error.response?.status === 401 || error.response?.status === 403;
};

export const isServerError = (error) => {
  return error.response?.status >= 500;
};

export const isClientError = (error) => {
  return error.response?.status >= 400 && error.response?.status < 500;
};

// Error boundary helper (React component - use in .jsx files)
export const withErrorBoundary = (Component, fallback = null) => {
  // This function should be used in .jsx files, not in .js utility files
  // For now, we'll export a simple wrapper that can be used in React components
  return Component;
};

export default {
  getErrorMessage,
  handleApiError,
  isNetworkError,
  isAuthError,
  isServerError,
  isClientError,
  withErrorBoundary
};
