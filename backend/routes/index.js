const express = require('express');
const { getHome } = require('../controllers');

const router = express.Router();

// Home route
router.get('/', getHome);

// Import and use auth routes
const authRoutes = require('./authRoutes');
router.use('/auth', authRoutes);

// Admin routes
const adminRoutes = require('./adminRoutes');
router.use('/admin', adminRoutes);

// Student routes
const studentRoutes = require('./studentRoutes');
router.use('/student', studentRoutes);

// Faculty routes
const facultyRoutes = require('./facultyRoutes');
router.use('/faculty', facultyRoutes);

// Project routes (shared between student and faculty)
const projectRoutes = require('./projectRoutes');
router.use('/projects', projectRoutes);

module.exports = router;
