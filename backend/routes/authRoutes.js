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
  verifyToken
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/signup/student', signupStudent);
router.post('/signup/faculty', signupFaculty);
router.post('/signup/admin', signupAdmin);
router.post('/login', loginUser);
router.post('/logout', logoutUser);


// Protected routes (authentication required)
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);
router.put('/change-password', authenticateToken, changePassword);
router.get('/verify', authenticateToken, verifyToken);

module.exports = router;
