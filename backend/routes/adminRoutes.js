const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard routes
router.get('/dashboard', adminController.getDashboardData);
router.get('/stats', adminController.getSystemStats);

// User management routes
router.get('/users', adminController.getUsers);
router.get('/students', adminController.getStudents);
router.get('/faculty', adminController.getFaculty);

// Project management routes
router.get('/projects', adminController.getProjects);
router.put('/projects/:id/status', adminController.updateProjectStatus);

// Group management routes
router.get('/groups', adminController.getGroups);
router.get('/unallocated-groups', adminController.getUnallocatedGroups);

// Allocation management routes
router.get('/allocations', adminController.getAllocations);
router.post('/force-allocate', adminController.forceAllocateFaculty);

// Sem 5 specific routes - Allocation Statistics
router.get('/allocation-statistics', adminController.getAllocationStatistics);

// Sem 4 specific routes
router.get('/sem4/registrations', adminController.getSem4MinorProject1Registrations);

module.exports = router;