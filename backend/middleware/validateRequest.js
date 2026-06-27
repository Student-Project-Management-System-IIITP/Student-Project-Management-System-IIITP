const { validationResult } = require('express-validator');
const fs = require('fs');

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

const deleteUploadedFiles = (req) => {
  if (req.file && req.file.path) {
    fs.unlink(req.file.path, (err) => {
      if (err) console.error(`Error deleting file ${req.file.path}:`, err);
    });
  }
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (file.path) {
          fs.unlink(file.path, (err) => {
            if (err) console.error(`Error deleting file ${file.path}:`, err);
          });
        }
      });
    } else if (typeof req.files === 'object') {
      Object.keys(req.files).forEach(key => {
        const filesArray = req.files[key];
        if (Array.isArray(filesArray)) {
          filesArray.forEach(file => {
            if (file.path) {
              fs.unlink(file.path, (err) => {
                if (err) console.error(`Error deleting file ${file.path}:`, err);
              });
            }
          });
        }
      });
    }
  }
};

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Delete any uploaded files
    deleteUploadedFiles(req);

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

module.exports = { validateRequest, deleteUploadedFiles };
