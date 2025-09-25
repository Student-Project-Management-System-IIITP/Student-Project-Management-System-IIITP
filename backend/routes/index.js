const express = require('express');
const { getHome } = require('../controllers');

const router = express.Router();

// Home route
router.get('/', getHome);

// Import and use auth routes
const authRoutes = require('./auth');
router.use('/auth', authRoutes);

module.exports = router;
