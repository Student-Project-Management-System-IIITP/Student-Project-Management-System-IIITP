const express = require('express');
const router = express.Router();
const {
  signupStudent,
  signupFaculty,
  signupAdmin,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  logoutUser,
  verifyToken,
  sendSignupOtp,
  verifySignupOtp,
  requestPasswordReset,
  resetPassword,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { loginLimiter, otpLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const {
  validateSignupStudent,
  validateSignupFaculty,
  validateSignupAdmin,
  validateLoginUser,
  validateRequestPasswordReset,
  validateResetPassword,
  validateChangePassword,
  validateUpdateUserProfile
} = require('../validators/authValidator');
const { validateRequest } = require('../middleware/validateRequest');

// Public routes (no authentication required)
router.post('/signup/student', validateSignupStudent, validateRequest, signupStudent);
router.post('/signup/faculty', validateSignupFaculty, validateRequest, signupFaculty);
router.post('/signup/admin', validateSignupAdmin, validateRequest, signupAdmin);
router.post('/signup/send-otp', otpLimiter, sendSignupOtp);
router.post('/signup/verify-otp', otpLimiter, verifySignupOtp);
router.post('/forgot-password', passwordResetLimiter, validateRequestPasswordReset, validateRequest, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, validateResetPassword, validateRequest, resetPassword);
router.post('/login', loginLimiter, validateLoginUser, validateRequest, loginUser);
router.post('/logout', logoutUser);


// Protected routes (authentication required)
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, validateUpdateUserProfile, validateRequest, updateUserProfile);
router.put('/change-password', authenticateToken, validateChangePassword, validateRequest, changePassword);
router.get('/verify', authenticateToken, verifyToken);

module.exports = router;
