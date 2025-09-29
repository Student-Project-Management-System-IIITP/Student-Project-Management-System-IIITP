const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Dashboard routes
router.get('/dashboard', facultyController.getDashboardData);

// Student management routes
router.get('/students', facultyController.getFacultyStudents);

// Project management routes
router.get('/projects', facultyController.getFacultyProjects);
router.put('/projects/:id', facultyController.updateProject);
router.post('/projects/:id/evaluate', facultyController.evaluateProject);

// Group management routes
router.get('/groups', facultyController.getFacultyGroups);

// Allocation management routes
router.get('/allocations', facultyController.getAllocationRequests);
router.post('/allocations/:id/accept', facultyController.acceptAllocation);
router.post('/allocations/:id/reject', facultyController.rejectAllocation);

// Sem 5 specific routes - Group Allocation
router.get('/groups/allocation-requests', facultyController.getGroupAllocationRequests);
router.post('/groups/:groupId/accept', facultyController.acceptGroupAllocation);
router.post('/groups/:groupId/reject', facultyController.rejectGroupAllocation);

module.exports = router;