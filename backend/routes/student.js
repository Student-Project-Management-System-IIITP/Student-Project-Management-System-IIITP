const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getDashboardData,
  getStudentProjects,
  getStudentGroups,
  getStudentInternships,
  getSemesterFeatures
} = require('../controllers/studentController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Dashboard routes
router.get('/dashboard', getDashboardData);
router.get('/features', getSemesterFeatures);

// Project routes
router.get('/projects', getStudentProjects);

// Group routes
router.get('/groups', getStudentGroups);

// Internship routes
router.get('/internships', getStudentInternships);

module.exports = router;
