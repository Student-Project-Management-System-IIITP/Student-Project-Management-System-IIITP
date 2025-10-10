const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Get student's current project
router.get('/student/current', projectController.getStudentCurrentProject);

// Get faculty's allocated projects
router.get('/faculty/allocated', projectController.getFacultyAllocatedProjects);

// Get project details
router.get('/:projectId', projectController.getProjectDetails);

// Get project messages
router.get('/:projectId/messages', projectController.getProjectMessages);

// Send a message
router.post('/:projectId/messages', projectController.sendMessage);

module.exports = router;

