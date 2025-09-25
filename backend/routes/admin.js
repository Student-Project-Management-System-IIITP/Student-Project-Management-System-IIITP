const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getDashboardData,
  getUsers,
  getStudents,
  getFaculty,
  getProjects,
  getGroups,
  getSystemStats
} = require('../controllers/adminController');

// Apply authentication and admin role middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard routes
router.get('/dashboard', getDashboardData);

// User management routes
router.get('/users', getUsers);
router.get('/students', getStudents);
router.get('/faculty', getFaculty);

// System routes
router.get('/projects', getProjects);
router.get('/groups', getGroups);
router.get('/stats', getSystemStats);

module.exports = router;
