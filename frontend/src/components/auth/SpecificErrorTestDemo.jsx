import React, { useState } from 'react';
import { 
  showSuccess, 
  showError, 
  showWarning, 
  showInfo,
  toastMessages 
} from '../../utils/toast';
import { handleAuthError } from '../../utils/signupErrorHandler';

const SpecificErrorTestDemo = () => {
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

  const simulateLoginErrors = {
    emailNotFound: () => {
      const error = {
        response: {
          data: {
            message: 'Email not found. Please check your email or sign up for a new account.',
            errorCode: 'EMAIL_NOT_FOUND'
          }
        }
      };
      const userMessage = handleAuthError(error);
      addTestResult('Email Not Found', 'Error', userMessage);
    },

    incorrectPassword: () => {
      const error = {
        response: {
          data: {
            message: 'Incorrect password. Please try again.',
            errorCode: 'INVALID_PASSWORD'
          }
        }
      };
      const userMessage = handleAuthError(error);
      addTestResult('Incorrect Password', 'Error', userMessage);
    },

    accountDeactivated: () => {
      const error = {
        response: {
          data: {
            message: 'Account is deactivated. Please contact administrator.',
            errorCode: 'ACCOUNT_DEACTIVATED'
          }
        }
      };
      const userMessage = handleAuthError(error);
      addTestResult('Account Deactivated', 'Error', userMessage);
    }
  };

  const simulateSignupErrors = {
    emailAlreadyExists: () => {
      const error = {
        response: {
          data: {
            message: 'User with this college email already exists'
          }
        }
      };
      const userMessage = handleAuthError(error);
      addTestResult('Email Already Exists', 'Error', userMessage);
    },

    misNumberAlreadyExists: () => {
      const error = {
        response: {
          data: {
            message: 'Student with this MIS number already exists'
          }
        }
      };
      const userMessage = handleAuthError(error);
      addTestResult('MIS Number Already Exists', 'Error', userMessage);
    },

    weakPassword: () => {
      const error = {
        response: {
          data: {
            message: 'Password must be at least 6 characters long',
            errorCode: 'WEAK_PASSWORD'
          }
        }
      };
      const userMessage = handleAuthError(error);
      addTestResult('Weak Password', 'Error', userMessage);
    },

    passwordMismatch: () => {
      const error = {
        response: {
          data: {
            message: 'Passwords do not match',
            errorCode: 'PASSWORD_MISMATCH'
          }
        }
      };
      const userMessage = handleAuthError(error);
      addTestResult('Password Mismatch', 'Error', userMessage);
    },

    invalidEmail: () => {
      const error = {
        response: {
          data: {
            message: 'Please enter a valid email address',
            errorCode: 'INVALID_EMAIL'
          }
        }
      };
      const userMessage = handleAuthError(error);
      addTestResult('Invalid Email Format', 'Error', userMessage);
    },

    invalidMISNumber: () => {
      const error = {
        response: {
          data: {
            message: 'MIS number must be exactly 9 digits',
            errorCode: 'INVALID_MIS_NUMBER'
          }
        }
      };
      const userMessage = handleAuthError(error);
      addTestResult('Invalid MIS Number', 'Error', userMessage);
    },

    invalidContactNumber: () => {
      const error = {
        response: {
          data: {
            message: 'Please enter a valid 10-digit phone number',
            errorCode: 'INVALID_CONTACT_NUMBER'
          }
        }
      };
      const userMessage = handleAuthError(error);
      addTestResult('Invalid Contact Number', 'Error', userMessage);
    }
  };

  const simulateNetworkErrors = {
    networkError: () => {
      const error = new TypeError('Failed to fetch');
      const userMessage = handleAuthError(error);
      addTestResult('Network Error', 'Error', userMessage);
    },

    serverError: () => {
      const error = {
        response: {
          status: 500,
          data: {
            message: 'Internal server error'
          }
        }
      };
      const userMessage = handleAuthError(error);
      addTestResult('Server Error', 'Error', userMessage);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Specific Error Messages Testing</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Login Error Scenarios */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">Login Error Scenarios</h3>
            <div className="space-y-2">
              {Object.entries(simulateLoginErrors).map(([key, handler]) => (
                <button
                  key={key}
                  onClick={handler}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors text-left"
                >
                  Test: {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Signup Error Scenarios */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800 mb-4">Signup Error Scenarios</h3>
            <div className="space-y-2">
              {Object.entries(simulateSignupErrors).map(([key, handler]) => (
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

          {/* Network Error Scenarios */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Network Error Scenarios</h3>
            <div className="space-y-2">
              {Object.entries(simulateNetworkErrors).map(([key, handler]) => (
                <button
                  key={key}
                  onClick={handler}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors text-left"
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

        {/* Implementation Features */}
        <div className="mt-8 p-4 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Enhanced Error Handling Features</h3>
          <div className="text-sm text-green-700 space-y-1">
            <p>✅ <strong>Specific Login Errors:</strong> Distinguishes between email not found vs wrong password</p>
            <p>✅ <strong>Password Strength Validation:</strong> Real-time password strength checking with visual feedback</p>
            <p>✅ <strong>Backend Error Codes:</strong> Structured error codes for precise error handling</p>
            <p>✅ <strong>Field-Specific Validation:</strong> Individual field validation with specific error messages</p>
            <p>✅ <strong>Network Error Handling:</strong> Proper detection and messaging for network issues</p>
            <p>✅ <strong>User-Friendly Messages:</strong> Clear, actionable error messages for users</p>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Error Message Examples</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="bg-white p-2 rounded border">
              <strong>Login Errors:</strong><br/>
              • Email not found: "Email not found. Please check your email or sign up for a new account."<br/>
              • Wrong password: "Incorrect password. Please try again."<br/>
              • Account deactivated: "Account is deactivated. Please contact administrator."
            </div>
            <div className="bg-white p-2 rounded border">
              <strong>Signup Errors:</strong><br/>
              • Weak password: "Password is too weak. Please add uppercase letters, numbers, or special characters."<br/>
              • Email exists: "An account with this email already exists."<br/>
              • Invalid MIS: "MIS number must be exactly 9 digits."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecificErrorTestDemo;
