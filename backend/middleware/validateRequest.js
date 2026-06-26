const { validationResult } = require('express-validator');

// NOTE: Custom error mapping to maintain compatibility with the frontend's expected errorCodes
const signupStudentMap = {
  'Full name is required': 'MISSING_FULL_NAME',
  'Degree is required': 'MISSING_DEGREE',
  'Semester is required': 'MISSING_SEMESTER',
  'MIS number is required': 'MISSING_MIS_NUMBER',
  'College email is required': 'MISSING_EMAIL',
  'Contact number is required': 'MISSING_CONTACT',
  'Branch is required': 'MISSING_BRANCH',
  'Password is required': 'MISSING_PASSWORD',
  'Please confirm your password': 'MISSING_CONFIRM_PASSWORD',
  'Password must be at least 6 characters long': 'WEAK_PASSWORD',
  'Passwords do not match': 'PASSWORD_MISMATCH',
  'Please enter a valid email address': 'INVALID_EMAIL',
  'MIS number must be exactly 9 digits': 'INVALID_MIS_NUMBER',
  'Please enter a valid 10-digit phone number': 'INVALID_CONTACT_NUMBER'
};

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    const message = firstError.msg;
    const errorCode = signupStudentMap[message] || undefined;

    return res.status(400).json({
      success: false,
      message,
      ...(errorCode ? { errorCode } : {})
    });
  }
  next();
};

module.exports = { validateRequest };
