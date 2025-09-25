const express = require('express');
const router = express.Router();
const { authenticateToken, requireFaculty } = require('../middleware/auth');
const {
  getDashboardData,
  getFacultyStudents,
  getFacultyProjects,
  getFacultyGroups,
  updateProject
} = require('../controllers/facultyController');

// Apply authentication and faculty role middleware to all routes
router.use(authenticateToken);
router.use(requireFaculty);

// Dashboard routes
router.get('/dashboard', getDashboardData);

// Student routes
router.get('/students', getFacultyStudents);

// Project routes
router.get('/projects', getFacultyProjects);
router.put('/projects/:projectId', updateProject);

// Group routes
router.get('/groups', getFacultyGroups);

module.exports = router;
