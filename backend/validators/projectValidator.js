const { body, param } = require('express-validator');

const validateScheduleMeeting = [
  body('scheduledAt')
    .notEmpty().withMessage('Scheduled date and time is required')
    .isISO8601().withMessage('Please enter a valid scheduled date and time'),
  body('location')
    .optional().isString().trim(),
  body('notes')
    .optional().isString().trim()
];

const validateCompleteMeeting = [
  body('notes')
    .optional().isString().trim()
];

const validateSendMessage = [
  body('message')
    .custom((value, { req }) => {
      const message = req.body.message;
      const files = req.files;
      const hasMessage = typeof message === 'string' && message.trim().length > 0;
      const hasFiles = files && (Array.isArray(files) ? files.length > 0 : Object.keys(files).length > 0);
      if (!hasMessage && !hasFiles) {
        throw new Error('Message or file attachment is required');
      }
      return true;
    })
];

const validateEditMessage = [
  body('message')
    .isString()
    .trim()
    .notEmpty().withMessage('Message cannot be empty')
];

const validateAddReaction = [
  body('emoji')
    .isString()
    .trim()
    .notEmpty().withMessage('Emoji is required')
];

const validateUploadDeliverable = [
  param('deliverableType')
    .isIn(['mid', 'end', 'report']).withMessage('Invalid deliverable type')
];

const validateRegisterProject = [
  body('title')
    .isString()
    .trim()
    .notEmpty().withMessage('Project title is required')
    .isLength({ max: 200 }).withMessage('Project title cannot exceed 200 characters'),
  body('projectType')
    .notEmpty().withMessage('Project type is required')
    .isIn(['minor1', 'minor2', 'minor3', 'major1', 'major2', 'internship1', 'internship2'])
    .withMessage('Invalid project type'),
  body('description')
    .optional().isString().trim(),
  body('isContinuation')
    .optional().isBoolean(),
  body('previousProjectId')
    .optional().isMongoId().withMessage('Invalid previous project ID format'),
  body('facultyPreferences')
    .optional().isArray().withMessage('Faculty preferences must be an array')
];

const validateUpdateProject = [
  body('title')
    .optional().isString().trim().isLength({ max: 200 }).withMessage('Project title cannot exceed 200 characters'),
  body('description')
    .optional().isString().trim(),
  body('domain')
    .optional().isString().trim().isLength({ max: 100 }).withMessage('Domain cannot exceed 100 characters')
];

const validateSubmitDeliverables = [
  body('deliverables')
    .optional().isArray().withMessage('Deliverables must be an array')
];

const validateRegisterSpecificProject = [
  body('title')
    .isString()
    .trim()
    .notEmpty().withMessage('Project title is required')
    .isLength({ max: 200 }).withMessage('Project title cannot exceed 200 characters'),
  body('domain')
    .isString()
    .trim()
    .notEmpty().withMessage('Domain is required')
    .isLength({ max: 100 }).withMessage('Domain cannot exceed 100 characters'),
  body('facultyPreferences')
    .optional().isArray().withMessage('Faculty preferences must be an array')
];

const validateSubmitProjectFacultyPreferences = [
  body('preferences')
    .notEmpty().withMessage('Faculty preferences are required')
    .isArray({ min: 1 }).withMessage('Faculty preferences are required')
];

module.exports = {
  validateScheduleMeeting,
  validateCompleteMeeting,
  validateSendMessage,
  validateEditMessage,
  validateAddReaction,
  validateUploadDeliverable,
  validateRegisterProject,
  validateUpdateProject,
  validateSubmitDeliverables,
  validateRegisterSpecificProject,
  validateSubmitProjectFacultyPreferences
};
