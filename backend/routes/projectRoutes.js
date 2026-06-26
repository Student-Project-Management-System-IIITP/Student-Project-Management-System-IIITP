const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken } = require('../middleware/auth');
const { uploadChatFiles, handleChatUploadError } = require('../middleware/chatUpload');
const { submitProjectFacultyPreferences } = require('../controllers/studentController');
const { uploadDeliverableFile, handleDeliverableUploadError } = require('../middleware/deliverableUpload');
const {
  validateScheduleMeeting,
  validateCompleteMeeting,
  validateSendMessage,
  validateEditMessage,
  validateAddReaction,
  validateUploadDeliverable,
  validateSubmitProjectFacultyPreferences
} = require('../validators/projectValidator');
const { validateRequest } = require('../middleware/validateRequest');

// Apply authentication to all routes
router.use(authenticateToken);

// Get student's current project
router.get('/student/current', projectController.getStudentCurrentProject);

// Get faculty's allocated projects
router.get('/faculty/allocated', projectController.getFacultyAllocatedProjects);

// Get project details
router.get('/:projectId', projectController.getProjectDetails);

// Schedule a meeting for a project
router.post('/:projectId/meeting', validateScheduleMeeting, validateRequest, projectController.scheduleMeeting);

// Complete a meeting and save notes to history
router.post('/:projectId/meeting/complete', validateCompleteMeeting, validateRequest, projectController.completeMeeting);

// Get project messages
router.get('/:projectId/messages', projectController.getProjectMessages);

// Send a message (with optional file attachments)
router.post('/:projectId/messages', uploadChatFiles, handleChatUploadError, validateSendMessage, validateRequest, projectController.sendMessage);

// Edit a message
router.put('/:projectId/messages/:messageId', validateEditMessage, validateRequest, projectController.editMessage);

// Delete a message
router.delete('/:projectId/messages/:messageId', projectController.deleteMessage);

// Search messages
router.get('/:projectId/messages/search', projectController.searchMessages);

// Get all media attachments for a project's chat
router.get('/:projectId/media', projectController.getProjectMedia);

// Add reaction to message
router.post('/:projectId/messages/:messageId/reactions', validateAddReaction, validateRequest, projectController.addReaction);

// Remove reaction from message
router.delete('/:projectId/messages/:messageId/reactions/:emoji', projectController.removeReaction);

// Download/serve chat file
router.get('/:projectId/files/:filename', projectController.downloadChatFile);

// Upload a deliverable file
router.post('/:projectId/deliverables/:deliverableType', 
  uploadDeliverableFile, 
  handleDeliverableUploadError, 
  validateUploadDeliverable,
  validateRequest,
  projectController.uploadDeliverable
);

// Download a deliverable file
router.get('/:projectId/deliverables/:filename', projectController.downloadDeliverable);

// Delete a deliverable file
router.delete('/:projectId/deliverables/:deliverableType', projectController.deleteDeliverable);

// Student: submit/update faculty preferences for a project (M.Tech Sem 1 solo flow)
router.post('/:projectId/faculty-preferences', validateSubmitProjectFacultyPreferences, validateRequest, submitProjectFacultyPreferences);

module.exports = router;

