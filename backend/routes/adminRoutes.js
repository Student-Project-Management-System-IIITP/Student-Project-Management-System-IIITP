const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Profile routes
router.get('/profile', adminController.getAdminProfile);
router.put('/profile', adminController.updateAdminProfile);

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

// Sem 5 specific routes
router.get('/allocation-statistics', adminController.getAllocationStatistics);
router.get('/sem5/registrations', adminController.getSem5MinorProject2Registrations);
router.get('/sem5/allocated-faculty', adminController.getSem5AllocatedFaculty);
router.get('/sem5/non-registered-students', adminController.getSem5NonRegisteredStudents);
router.get('/groups/sem5', adminController.getSem5Groups);
router.get('/statistics/sem5', adminController.getSem5Statistics);

// Sem 4 specific routes
router.get('/sem4/registrations', adminController.getSem4MinorProject1Registrations);
router.get('/sem4/unregistered-students', adminController.getUnregisteredSem4Students);

// M.Tech specific routes
router.get('/mtech/sem1/registrations', adminController.getMTechSem1Registrations);
router.get('/mtech/sem1/unregistered-students', adminController.getUnregisteredMTechSem1Students);
router.get('/statistics/mtech/sem1', adminController.getMTechSem1Statistics);

// Sem 6 specific routes
router.get('/sem6/registrations', adminController.getSem6MajorProjectRegistrations);
router.get('/sem6/non-registered-groups', adminController.getSem6NonRegisteredGroups);
router.get('/statistics/sem6', adminController.getSem6Statistics);

// System Configuration routes
router.get('/system-config', adminController.getSystemConfigurations);
router.get('/system-config/:key', adminController.getSystemConfig);
router.put('/system-config/:key', adminController.updateSystemConfig);
router.post('/system-config/initialize', adminController.initializeSystemConfigs);

// Semester Management routes
router.post('/students/update-semesters', adminController.updateStudentSemesters);
router.get('/students/by-semester', adminController.getStudentsBySemester);

module.exports = router;