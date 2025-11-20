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

// Sem7 routes
const sem7Routes = require('./sem7Routes');
router.use('/sem7', sem7Routes);

// Sem3 routes
const sem3Routes = require('./sem3Routes');
router.use('/sem3', sem3Routes);

// Sem8 routes
const sem8Routes = require('./sem8Routes');
router.use('/sem8', sem8Routes);

// Internship routes
const internshipRoutes = require('./internshipRoutes');
router.use('/internships', internshipRoutes);

module.exports = router;
