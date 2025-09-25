const express = require('express');
const { getHome } = require('../controllers');

const router = express.Router();

// Home route
router.get('/', getHome);

// Import and use auth routes
const authRoutes = require('./auth');
router.use('/auth', authRoutes);

// Admin routes
const adminRoutes = require('./adminRoutes');
router.use('/admin', adminRoutes);

module.exports = router;
