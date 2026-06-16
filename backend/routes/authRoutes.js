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

// Public routes (no authentication required)
router.post('/signup/student', signupStudent);
router.post('/signup/faculty', signupFaculty);
router.post('/signup/admin', signupAdmin);
router.post('/signup/send-otp', otpLimiter, sendSignupOtp);
router.post('/signup/verify-otp', otpLimiter, verifySignupOtp);
router.post('/forgot-password', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/login', loginLimiter, loginUser);
router.post('/logout', logoutUser);


// Protected routes (authentication required)
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);
router.put('/change-password', authenticateToken, changePassword);
router.get('/verify', authenticateToken, verifyToken);

module.exports = router;
