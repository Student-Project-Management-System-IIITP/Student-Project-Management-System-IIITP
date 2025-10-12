const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken } = require('../middleware/auth');
const { uploadChatFiles, handleChatUploadError } = require('../middleware/chatUpload');

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

// Send a message (with optional file attachments)
router.post('/:projectId/messages', uploadChatFiles, handleChatUploadError, projectController.sendMessage);

// Edit a message
router.put('/:projectId/messages/:messageId', projectController.editMessage);

// Delete a message
router.delete('/:projectId/messages/:messageId', projectController.deleteMessage);

// Search messages
router.get('/:projectId/messages/search', projectController.searchMessages);

// Add reaction to message
router.post('/:projectId/messages/:messageId/reactions', projectController.addReaction);

// Remove reaction from message
router.delete('/:projectId/messages/:messageId/reactions/:emoji', projectController.removeReaction);

// Download/serve chat file
router.get('/:projectId/files/:filename', projectController.downloadChatFile);

module.exports = router;

