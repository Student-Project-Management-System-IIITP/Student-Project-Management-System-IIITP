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
      if ((!message || !message.trim()) && (!files || files.length === 0)) {
        throw new Error('Message or file attachment is required');
      }
      return true;
    })
];

const validateEditMessage = [
  body('message')
    .notEmpty().withMessage('Message cannot be empty')
    .isString().trim()
];

const validateAddReaction = [
  body('emoji')
    .notEmpty().withMessage('Emoji is required')
    .isString().trim()
];

const validateUploadDeliverable = [
  param('deliverableType')
    .isIn(['mid', 'end', 'report']).withMessage('Invalid deliverable type')
];

module.exports = {
  validateScheduleMeeting,
  validateCompleteMeeting,
  validateSendMessage,
  validateEditMessage,
  validateAddReaction,
  validateUploadDeliverable
};
