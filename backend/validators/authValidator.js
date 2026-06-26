const { body } = require('express-validator');

// Validation rules for Student Signup
const validateSignupStudent = [
  body('fullName')
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name cannot exceed 100 characters'),
  body('degree')
    .notEmpty().withMessage('Degree is required')
    .isIn(['B.Tech', 'M.Tech']).withMessage('Degree must be B.Tech or M.Tech'),
  body('semester')
    .notEmpty().withMessage('Semester is required')
    .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
  body('misNumber')
    .notEmpty().withMessage('MIS number is required')
    .matches(/^\d{9}$/).withMessage('MIS number must be exactly 9 digits'),
  body('collegeEmail')
    .notEmpty().withMessage('College email is required')
    .isEmail().withMessage('Please enter a valid email address'),
  body('contactNumber')
    .notEmpty().withMessage('Contact number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('branch')
    .notEmpty().withMessage('Branch is required')
    .isIn(['CSE', 'ECE']).withMessage('Branch must be CSE or ECE'),
  // NOTE: New constraint added (not in original code) — see issue #103 PR notes
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
    .withMessage('Password must include an uppercase letter, a lowercase letter, a number, and a special character'),
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Validation rules for Faculty Signup
const validateSignupFaculty = [
  body('fullName')
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name cannot exceed 100 characters'),
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
  // NOTE: New constraint added (not in original code) — see issue #103 PR notes
  body('collegeEmail')
    .notEmpty().withMessage('College email is required')
    .isEmail().withMessage('Please enter a valid email address'),
  // NOTE: New constraint added (not in original code) — see issue #103 PR notes
  body('contactNumber')
    .notEmpty().withMessage('Contact number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit phone number'),
  // NOTE: New constraint added (not in original code) — see issue #103 PR notes
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
    .withMessage('Password must include an uppercase letter, a lowercase letter, a number, and a special character'),
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Validation rules for Admin Signup
const validateSignupAdmin = [
  body('fullName')
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name cannot exceed 100 characters'),
  body('department')
    .notEmpty().withMessage('Department is required'),
  body('designation')
    .notEmpty().withMessage('Designation is required'),
  // NOTE: New constraint added (not in original code) — see issue #103 PR notes
  body('collegeEmail')
    .notEmpty().withMessage('College email is required')
    .isEmail().withMessage('Please enter a valid email address'),
  // NOTE: New constraint added (not in original code) — see issue #103 PR notes
  body('contactNumber')
    .notEmpty().withMessage('Contact number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit phone number'),
  // NOTE: New constraint added (not in original code) — see issue #103 PR notes
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
    .withMessage('Password must include an uppercase letter, a lowercase letter, a number, and a special character'),
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

module.exports = {
  validateSignupStudent,
  validateSignupFaculty,
  validateSignupAdmin
};
