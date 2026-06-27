const { body } = require('express-validator');

// Reusable helper to generate password validation chains
const getPasswordValidationChain = (fieldName, notEmptyMessage, notEmptyErrorCode = null) => {
  const chain = body(fieldName);
  
  if (notEmptyErrorCode) {
    chain.notEmpty().withMessage(JSON.stringify({ msg: notEmptyMessage, errorCode: notEmptyErrorCode }));
  } else {
    chain.notEmpty().withMessage(notEmptyMessage);
  }
  
  return chain
    .bail()
    .isLength({ min: 6 }).withMessage(JSON.stringify({ msg: 'Password must be at least 6 characters long', errorCode: 'WEAK_PASSWORD' }))
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
    .withMessage(JSON.stringify({ msg: 'Password must include an uppercase letter, a lowercase letter, a number, and a special character', errorCode: 'WEAK_PASSWORD' }));
};

// Validation rules for Student Signup
const validateSignupStudent = [
  body('fullName')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Full name is required', errorCode: 'MISSING_FULL_NAME' }))
    .bail()
    .isLength({ max: 100 }).withMessage(JSON.stringify({ msg: 'Full name cannot exceed 100 characters' })),
  body('degree')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Degree is required', errorCode: 'MISSING_DEGREE' }))
    .bail()
    .isIn(['B.Tech', 'M.Tech']).withMessage(JSON.stringify({ msg: 'Degree must be B.Tech or M.Tech' })),
  body('semester')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Semester is required', errorCode: 'MISSING_SEMESTER' }))
    .bail()
    .isInt({ min: 1, max: 8 }).withMessage(JSON.stringify({ msg: 'Semester must be between 1 and 8' })),
  body('misNumber')
    .notEmpty().withMessage(JSON.stringify({ msg: 'MIS number is required', errorCode: 'MISSING_MIS_NUMBER' }))
    .bail()
    .matches(/^\d{9}$/).withMessage(JSON.stringify({ msg: 'MIS number must be exactly 9 digits', errorCode: 'INVALID_MIS_NUMBER' })),
  body('collegeEmail')
    .notEmpty().withMessage(JSON.stringify({ msg: 'College email is required', errorCode: 'MISSING_EMAIL' }))
    .bail()
    .isEmail().withMessage(JSON.stringify({ msg: 'Please enter a valid email address', errorCode: 'INVALID_EMAIL' })),
  body('contactNumber')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Contact number is required', errorCode: 'MISSING_CONTACT' }))
    .bail()
    .matches(/^[6-9]\d{9}$/).withMessage(JSON.stringify({ msg: 'Please enter a valid 10-digit phone number', errorCode: 'INVALID_CONTACT_NUMBER' })),
  body('branch')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Branch is required', errorCode: 'MISSING_BRANCH' }))
    .bail()
    .isIn(['CSE', 'ECE']).withMessage(JSON.stringify({ msg: 'Branch must be CSE or ECE' })),
  getPasswordValidationChain('password', 'Password is required', 'MISSING_PASSWORD'),
  body('confirmPassword')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Please confirm your password', errorCode: 'MISSING_CONFIRM_PASSWORD' }))
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error(JSON.stringify({ msg: 'Passwords do not match', errorCode: 'PASSWORD_MISMATCH' }));
      }
      return true;
    })
];

// Validation rules for Faculty Signup
const validateSignupFaculty = [
  body('fullName')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Full name is required', errorCode: 'MISSING_FULL_NAME' }))
    .bail()
    .isLength({ max: 100 }).withMessage(JSON.stringify({ msg: 'Full name cannot exceed 100 characters' })),
  body('prefix')
    .optional()
    .isIn(['Dr', 'Mr', 'Mrs', 'Miss', 'Prof', 'Ms']).withMessage('Prefix is invalid'),
  body('department')
    .notEmpty().withMessage('Department is required')
    .isIn(['CSE', 'ECE', 'ASH']).withMessage('Department must be CSE, ECE or ASH'),
  body('mode')
    .notEmpty().withMessage('Mode is required')
    .isIn(['Regular', 'Adjunct', 'On Lien']).withMessage('Mode is invalid'),
  body('designation')
    .notEmpty().withMessage('Designation is required')
    .isIn([
      'HOD', 'Assistant Professor', 'Adjunct Assistant Professor',
      'Assistant Registrar', 'TPO', 'Warden', 'Chief Warden',
      'Associate Dean', 'Coordinator(PG, PhD)', 'Tenders/Purchase'
    ]).withMessage('Designation is invalid'),
  body('collegeEmail')
    .notEmpty().withMessage(JSON.stringify({ msg: 'College email is required', errorCode: 'MISSING_EMAIL' }))
    .bail()
    .isEmail().withMessage(JSON.stringify({ msg: 'Please enter a valid email address', errorCode: 'INVALID_EMAIL' })),
  body('contactNumber')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Contact number is required', errorCode: 'MISSING_CONTACT' }))
    .bail()
    .matches(/^[6-9]\d{9}$/).withMessage(JSON.stringify({ msg: 'Please enter a valid 10-digit phone number', errorCode: 'INVALID_CONTACT_NUMBER' })),
  getPasswordValidationChain('password', 'Password is required', 'MISSING_PASSWORD'),
  body('confirmPassword')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Please confirm your password', errorCode: 'MISSING_CONFIRM_PASSWORD' }))
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error(JSON.stringify({ msg: 'Passwords do not match', errorCode: 'PASSWORD_MISMATCH' }));
      }
      return true;
    })
];

// Validation rules for Admin Signup
const validateSignupAdmin = [
  body('fullName')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Full name is required', errorCode: 'MISSING_FULL_NAME' }))
    .bail()
    .isLength({ max: 100 }).withMessage(JSON.stringify({ msg: 'Full name cannot exceed 100 characters' })),
  body('department')
    .notEmpty().withMessage('Department is required'),
  body('designation')
    .notEmpty().withMessage('Designation is required'),
  body('collegeEmail')
    .notEmpty().withMessage(JSON.stringify({ msg: 'College email is required', errorCode: 'MISSING_EMAIL' }))
    .bail()
    .isEmail().withMessage(JSON.stringify({ msg: 'Please enter a valid email address', errorCode: 'INVALID_EMAIL' })),
  body('contactNumber')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Contact number is required', errorCode: 'MISSING_CONTACT' }))
    .bail()
    .matches(/^[6-9]\d{9}$/).withMessage(JSON.stringify({ msg: 'Please enter a valid 10-digit phone number', errorCode: 'INVALID_CONTACT_NUMBER' })),
  getPasswordValidationChain('password', 'Password is required', 'MISSING_PASSWORD'),
  body('confirmPassword')
    .notEmpty().withMessage(JSON.stringify({ msg: 'Please confirm your password', errorCode: 'MISSING_CONFIRM_PASSWORD' }))
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error(JSON.stringify({ msg: 'Passwords do not match', errorCode: 'PASSWORD_MISMATCH' }));
      }
      return true;
    })
];

// Validation rules for Login
const validateLoginUser = [
  body('email')
    .notEmpty().withMessage('Please provide email and password'),
  body('password')
    .notEmpty().withMessage('Please provide email and password')
];

// Validation rules for Request Password Reset
const validateRequestPasswordReset = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
];

// Validation rules for Reset Password
const validateResetPassword = [
  body('token')
    .notEmpty().withMessage('Token, email and new password are required'),
  body('email')
    .notEmpty().withMessage('Token, email and new password are required')
    .bail()
    .isEmail().withMessage('Please enter a valid email address'),
  getPasswordValidationChain('password', 'Token, email and new password are required')
];

// Validation rules for Change Password
const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Please provide current and new password'),
  getPasswordValidationChain('newPassword', 'Please provide current and new password')
];

// Validation rules for Update User Profile
const validateUpdateUserProfile = [
  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/).withMessage(JSON.stringify({ msg: 'Please enter a valid 10-digit phone number', errorCode: 'INVALID_CONTACT_NUMBER' }))
];

module.exports = {
  validateSignupStudent,
  validateSignupFaculty,
  validateSignupAdmin,
  validateLoginUser,
  validateRequestPasswordReset,
  validateResetPassword,
  validateChangePassword,
  validateUpdateUserProfile
};
