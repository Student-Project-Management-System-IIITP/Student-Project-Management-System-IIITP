import toast from 'react-hot-toast';

// Success toast
export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    duration: 3000,
    ...options
  });
};

// Error toast
export const showError = (message, options = {}) => {
  return toast.error(message, {
    duration: 5000,
    ...options
  });
};

// Loading toast
export const showLoading = (message, options = {}) => {
  return toast.loading(message, {
    duration: Infinity,
    ...options
  });
};

// Info toast
export const showInfo = (message, options = {}) => {
  return toast(message, {
    duration: 4000,
    icon: 'ℹ️',
    ...options
  });
};

// Warning toast
export const showWarning = (message, options = {}) => {
  return toast(message, {
    duration: 4000,
    icon: '⚠️',
    style: {
      background: '#F59E0B',
      color: '#fff',
    },
    ...options
  });
};

// Promise toast for async operations
export const showPromise = (promise, messages, options = {}) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong!',
    },
    options
  );
};

// Dismiss all toasts
export const dismissAll = () => {
  toast.dismiss();
};

// Dismiss specific toast
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

// Custom toast with specific styling
export const showCustom = (message, type = 'default', options = {}) => {
  const defaultOptions = {
    duration: 4000,
    ...options
  };

  switch (type) {
    case 'success':
      return showSuccess(message, defaultOptions);
    case 'error':
      return showError(message, defaultOptions);
    case 'warning':
      return showWarning(message, defaultOptions);
    case 'info':
      return showInfo(message, defaultOptions);
    case 'loading':
      return showLoading(message, defaultOptions);
    default:
      return toast(message, defaultOptions);
  }
};

// Common toast messages for the project
export const toastMessages = {
  // Authentication
  loginSuccess: 'Logged in successfully!',
  loginError: 'Login failed. Please check your credentials.',
  emailNotFound: 'Email not found. Please check your email or sign up for a new account.',
  incorrectPassword: 'Incorrect password. Please try again.',
  accountDeactivated: 'Account is deactivated. Please contact administrator.',
  logoutSuccess: 'Logged out successfully!',
  registrationSuccess: 'Account created successfully! Please login to continue.',
  registrationError: 'Registration failed. Please try again.',
  
  // Specific signup errors
  emailAlreadyExists: 'An account with this email already exists.',
  misNumberAlreadyExists: 'A student with this MIS number already exists.',
  invalidEmail: 'Please enter a valid email address.',
  passwordMismatch: 'Passwords do not match.',
  weakPassword: 'Password must be at least 6 characters long.',
  invalidMISNumber: 'MIS number must be exactly 9 digits.',
  invalidPhoneNumber: 'Please enter a valid 10-digit phone number.',
  missingFields: 'Please fill in all required fields.',
  
  // Project related
  projectCreated: 'Project created successfully!',
  projectUpdated: 'Project updated successfully!',
  projectDeleted: 'Project deleted successfully!',
  projectError: 'Something went wrong with the project operation.',
  
  // File upload
  fileUploadSuccess: 'File uploaded successfully!',
  fileUploadError: 'File upload failed. Please try again.',
  fileDeleteSuccess: 'File deleted successfully!',
  
  // Group related
  groupCreated: 'Group created successfully!',
  groupJoined: 'Joined group successfully!',
  groupLeft: 'Left group successfully!',
  groupError: 'Something went wrong with the group operation.',
  
  // Evaluation related
  evaluationSubmitted: 'Evaluation submitted successfully!',
  evaluationUpdated: 'Evaluation updated successfully!',
  evaluationError: 'Something went wrong with the evaluation.',
  
  // General
  saveSuccess: 'Changes saved successfully!',
  deleteSuccess: 'Item deleted successfully!',
  updateSuccess: 'Updated successfully!',
  genericError: 'Something went wrong. Please try again.',
  networkError: 'Network error. Please check your connection.',
  unauthorized: 'You are not authorized to perform this action.',
  validationError: 'Please check the form for errors.',
};

export default {
  showSuccess,
  showError,
  showLoading,
  showInfo,
  showWarning,
  showPromise,
  showCustom,
  dismissAll,
  dismissToast,
  toastMessages,
};
