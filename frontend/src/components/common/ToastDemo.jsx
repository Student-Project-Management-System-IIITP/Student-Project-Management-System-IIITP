import React from 'react';
import { 
  showSuccess, 
  showError, 
  showWarning, 
  showInfo, 
  showLoading, 
  showPromise, 
  showCustom,
  dismissAll,
  toastMessages 
} from '../../utils/toast';

const ToastDemo = () => {
  // Simulate an async operation for promise toast
  const simulateAsyncOperation = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.5 ? resolve('Success!') : reject(new Error('Failed!'));
      }, 2000);
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Toast Notification Demo</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Success Toast */}
          <button
            onClick={() => showSuccess('Operation completed successfully!')}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Success Toast
          </button>

          {/* Error Toast */}
          <button
            onClick={() => showError('Something went wrong!')}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Error Toast
          </button>

          {/* Warning Toast */}
          <button
            onClick={() => showWarning('Please check your input!')}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Warning Toast
          </button>

          {/* Info Toast */}
          <button
            onClick={() => showInfo('Here is some information!')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Info Toast
          </button>

          {/* Loading Toast */}
          <button
            onClick={() => {
              const loadingToast = showLoading('Processing...');
              // Auto dismiss after 3 seconds
              setTimeout(() => {
                loadingToast();
              }, 3000);
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Loading Toast
          </button>

          {/* Promise Toast */}
          <button
            onClick={() => showPromise(
              simulateAsyncOperation(),
              {
                loading: 'Processing your request...',
                success: 'Request completed successfully!',
                error: 'Request failed. Please try again.'
              }
            )}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Promise Toast
          </button>

          {/* Custom Toast */}
          <button
            onClick={() => showCustom('This is a custom toast!', 'success')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Custom Toast
          </button>

          {/* Dismiss All */}
          <button
            onClick={dismissAll}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Dismiss All
          </button>
        </div>

        {/* Project-specific messages */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Project-Specific Messages</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => showSuccess(toastMessages.projectCreated)}
              className="bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-lg transition-colors text-left"
            >
              {toastMessages.projectCreated}
            </button>

            <button
              onClick={() => showSuccess(toastMessages.groupCreated)}
              className="bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-lg transition-colors text-left"
            >
              {toastMessages.groupCreated}
            </button>

            <button
              onClick={() => showSuccess(toastMessages.fileUploadSuccess)}
              className="bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-lg transition-colors text-left"
            >
              {toastMessages.fileUploadSuccess}
            </button>

            <button
              onClick={() => showError(toastMessages.genericError)}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg transition-colors text-left"
            >
              {toastMessages.genericError}
            </button>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Usage Instructions</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Import:</strong> <code className="bg-gray-200 px-1 rounded">import &#123; showSuccess, showError &#125; from '../utils/toast'</code></p>
            <p><strong>Basic usage:</strong> <code className="bg-gray-200 px-1 rounded">showSuccess('Your message here')</code></p>
            <p><strong>With options:</strong> <code className="bg-gray-200 px-1 rounded">showError('Error message', &#123; duration: 6000 &#125;)</code></p>
            <p><strong>Promise toast:</strong> <code className="bg-gray-200 px-1 rounded">showPromise(apiCall, &#123; loading: '...', success: '...', error: '...' &#125;)</code></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToastDemo;
