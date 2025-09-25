const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getUserProfile, updateUserProfile, changePassword } = require('../controllers/authController');

const router = express.Router();

// Admin-only profile endpoints (reuse existing controller handlers)
router.get('/profile', authenticateToken, requireAdmin, getUserProfile);
router.put('/profile', authenticateToken, requireAdmin, updateUserProfile);
router.put('/change-password', authenticateToken, requireAdmin, changePassword);

module.exports = router;


