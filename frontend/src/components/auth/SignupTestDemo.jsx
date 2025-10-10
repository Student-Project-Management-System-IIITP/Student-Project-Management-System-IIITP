import React, { useState } from 'react';
import { 
  showSuccess, 
  showError, 
  showWarning, 
  showInfo,
  toastMessages 
} from '../../utils/toast';
import { handleSignupError } from '../../utils/signupErrorHandler';

const SignupTestDemo = () => {
  const [testResults, setTestResults] = useState([]);

  const addTestResult = (scenario, result, message) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      scenario,
      result,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const simulateBackendErrors = {
    emailAlreadyExists: () => {
      const error = new Error('User with this college email already exists');
      const userMessage = handleSignupError(error);
      addTestResult('Email Already Exists', 'Error', userMessage);
    },

    misNumberAlreadyExists: () => {
      const error = new Error('Student with this MIS number already exists');
      const userMessage = handleSignupError(error);
      addTestResult('MIS Number Already Exists', 'Error', userMessage);
    },

    passwordMismatch: () => {
      const error = new Error('Passwords do not match');
      const userMessage = handleSignupError(error);
      addTestResult('Password Mismatch', 'Error', userMessage);
    },

    missingFields: () => {
      const error = new Error('Please provide all required fields');
      const userMessage = handleSignupError(error);
      addTestResult('Missing Required Fields', 'Error', userMessage);
    },

    networkError: () => {
      const error = new TypeError('Failed to fetch');
      const userMessage = handleSignupError(error);
      addTestResult('Network Error', 'Error', userMessage);
    },

    successfulSignup: () => {
      showSuccess(toastMessages.registrationSuccess);
      addTestResult('Successful Signup', 'Success', toastMessages.registrationSuccess);
    }
  };

  const testValidationScenarios = {
    invalidEmail: () => {
      showWarning(toastMessages.invalidEmail);
      addTestResult('Invalid Email Format', 'Warning', toastMessages.invalidEmail);
    },

    invalidMISNumber: () => {
      showWarning(toastMessages.invalidMISNumber);
      addTestResult('Invalid MIS Number', 'Warning', toastMessages.invalidMISNumber);
    },

    weakPassword: () => {
      showWarning(toastMessages.weakPassword);
      addTestResult('Weak Password', 'Warning', toastMessages.weakPassword);
    },

    invalidPhoneNumber: () => {
      showWarning(toastMessages.invalidPhoneNumber);
      addTestResult('Invalid Phone Number', 'Warning', toastMessages.invalidPhoneNumber);
    },

    formValidation: () => {
      showWarning(toastMessages.validationError);
      addTestResult('Form Validation', 'Warning', toastMessages.validationError);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Signup Process Toast Testing</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Backend Error Scenarios */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800 mb-4">Backend Error Scenarios</h3>
            <div className="space-y-2">
              {Object.entries(simulateBackendErrors).map(([key, handler]) => (
                <button
                  key={key}
                  onClick={handler}
                  className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors text-left"
                >
                  Test: {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Validation Error Scenarios */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">Validation Error Scenarios</h3>
            <div className="space-y-2">
              {Object.entries(testValidationScenarios).map(([key, handler]) => (
                <button
                  key={key}
                  onClick={handler}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded transition-colors text-left"
                >
                  Test: {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Test Results</h3>
            <button
              onClick={clearResults}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              Clear Results
            </button>
          </div>
          
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No test results yet. Click the buttons above to test different scenarios.</p>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {testResults.map((result) => (
                  <div
                    key={result.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      result.result === 'Success' 
                        ? 'bg-green-100 border-green-500 text-green-800'
                        : result.result === 'Warning'
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-800'
                        : 'bg-red-100 border-red-500 text-red-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{result.scenario}</p>
                        <p className="text-sm mt-1">{result.message}</p>
                      </div>
                      <span className="text-xs opacity-75">{result.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Implementation Notes */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Implementation Features</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>✅ <strong>Enhanced API Integration:</strong> Uses authAPIWithToast for automatic toast notifications</p>
            <p>✅ <strong>Error Mapping:</strong> Backend errors mapped to user-friendly messages</p>
            <p>✅ <strong>Validation Feedback:</strong> Real-time form validation with toast warnings</p>
            <p>✅ <strong>Success Flow:</strong> Success toast with delayed redirect to login</p>
            <p>✅ <strong>Network Handling:</strong> Proper network error detection and messaging</p>
            <p>✅ <strong>Loading States:</strong> Loading toasts for async operations</p>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">How to Use in Your App</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>1. Import toast functions:</strong></p>
            <code className="block bg-gray-200 p-2 rounded text-xs">
              import &#123; showSuccess, showError, showWarning &#125; from '../utils/toast';
            </code>
            
            <p><strong>2. Use in form submission:</strong></p>
            <code className="block bg-gray-200 p-2 rounded text-xs">
              showSuccess('Account created successfully!');<br/>
              showError('Email already exists');
            </code>
            
            <p><strong>3. Enhanced API calls:</strong></p>
            <code className="block bg-gray-200 p-2 rounded text-xs">
              import &#123; authAPIWithToast &#125; from '../utils/apiWithToast';<br/>
              await authAPIWithToast.registerStudent(userData);
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupTestDemo;
