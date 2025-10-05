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
router.get('/groups/unallocated', facultyController.getUnallocatedGroups);
router.get('/groups/allocated', facultyController.getAllocatedGroups);
router.post('/groups/:groupId/choose', facultyController.chooseGroup);
router.post('/groups/:groupId/pass', facultyController.passGroup);
router.get('/statistics/sem5', facultyController.getSem5Statistics);

module.exports = router;