import { showError, toastMessages } from './toast';

// Map backend error messages to user-friendly toast messages
const errorMessageMap = {
  // Email related errors
  'User with this college email already exists': toastMessages.emailAlreadyExists,
  'User with this email already exists': toastMessages.emailAlreadyExists,
  
  // MIS number errors
  'Student with this MIS number already exists': toastMessages.misNumberAlreadyExists,
  
  // Password errors
  'Passwords do not match': toastMessages.passwordMismatch,
  'Password must be at least 6 characters': toastMessages.weakPassword,
  
  // Field validation errors
  'Please provide all required fields': toastMessages.missingFields,
  'Please fill in all required fields': toastMessages.missingFields,
  
  // Network errors
  'Network error': toastMessages.networkError,
  'Failed to fetch': toastMessages.networkError,
  'Connection error': toastMessages.networkError,
};

// Map backend error codes to user-friendly toast messages
const errorCodeMap = {
  // Login errors
  'EMAIL_NOT_FOUND': toastMessages.emailNotFound,
  'INVALID_PASSWORD': toastMessages.incorrectPassword,
  'ACCOUNT_DEACTIVATED': toastMessages.accountDeactivated,
  
  // Signup validation errors
  'MISSING_FULL_NAME': 'Full name is required',
  'MISSING_DEGREE': 'Degree is required',
  'MISSING_SEMESTER': 'Semester is required',
  'MISSING_MIS_NUMBER': 'MIS number is required',
  'MISSING_EMAIL': 'College email is required',
  'MISSING_CONTACT': 'Contact number is required',
  'MISSING_BRANCH': 'Branch is required',
  'MISSING_PASSWORD': 'Password is required',
  'MISSING_CONFIRM_PASSWORD': 'Please confirm your password',
  'WEAK_PASSWORD': toastMessages.weakPassword,
  'PASSWORD_MISMATCH': toastMessages.passwordMismatch,
  'INVALID_EMAIL': toastMessages.invalidEmail,
  'INVALID_MIS_NUMBER': toastMessages.invalidMISNumber,
  'INVALID_CONTACT_NUMBER': toastMessages.invalidPhoneNumber,
};

// Enhanced error handler for authentication process (signup and login)
export const handleAuthError = (error) => {
  let errorMessage = error.message || error.toString();
  
  // Check if it's a network error
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    errorMessage = toastMessages.networkError;
  }
  
  // Check if it's an API error response
  if (error.response || error.data) {
    const apiError = error.response?.data?.message || error.data?.message;
    const errorCode = error.response?.data?.errorCode || error.data?.errorCode;
    
    if (apiError) {
      errorMessage = apiError;
    }
    
    // Check for specific error codes first
    if (errorCode && errorCodeMap[errorCode]) {
      errorMessage = errorCodeMap[errorCode];
    }
  }
  
  // Map to user-friendly message
  const userFriendlyMessage = errorMessageMap[errorMessage] || errorMessage;
  
  // Show the error toast
  showError(userFriendlyMessage);
  
  return userFriendlyMessage;
};

// Legacy function for backward compatibility
export const handleSignupError = handleAuthError;

// Validation error handler for form fields
export const handleValidationError = (fieldName, error) => {
  const validationMessages = {
    fullName: 'Full name is required',
    semester: 'Please select a valid semester',
    misNumber: toastMessages.invalidMISNumber,
    collegeEmail: toastMessages.invalidEmail,
    contactNumber: toastMessages.invalidPhoneNumber,
    password: toastMessages.weakPassword,
    confirmPassword: toastMessages.passwordMismatch,
  };
  
  return validationMessages[fieldName] || error;
};

export default {
  handleSignupError,
  handleValidationError,
};
