const { body } = require('express-validator');

const validateCreateGroup = [
  body('name').optional().isString().trim().isLength({ max: 100 }).withMessage('Group name cannot exceed 100 characters'),
  body('description').optional().isString().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('memberIds').optional().isArray().withMessage('Members must be an array'),
  body('memberIds.*').optional().isMongoId().withMessage('Invalid member student ID'),
  body('maxMembers').optional().isInt({ min: 1, max: 10 }).withMessage('Maximum members must be an integer between 1 and 10')
];

const validateUpdateGroupName = [
  body('name')
    .notEmpty().withMessage('Group name is required')
    .isString().trim().isLength({ max: 100 }).withMessage('Group name cannot exceed 100 characters')
];

const validateSendGroupInvitations = [
  body('memberIds')
    .notEmpty().withMessage('Member IDs are required')
    .isArray({ min: 1 }).withMessage('Member IDs must be a non-empty array'),
  body('memberIds.*').isMongoId().withMessage('Invalid student ID format')
];

const validateInviteToGroup = [
  body('studentIds')
    .optional()
    .isArray().withMessage('Student IDs must be an array'),
  body('studentIds.*').isMongoId().withMessage('Invalid student ID format'),
  body('role')
    .optional()
    .equals('member').withMessage('Only can invite as member role')
];

const validateTransferLeadership = [
  body('newLeaderId')
    .notEmpty().withMessage('New leader ID is required')
    .isMongoId().withMessage('Invalid leader ID format')
];

const validateSubmitFacultyPreferences = [
  body('preferences')
    .notEmpty().withMessage('Faculty preferences are required')
    .isArray({ min: 1 }).withMessage('Faculty preferences are required')
];

module.exports = {
  validateCreateGroup,
  validateUpdateGroupName,
  validateSendGroupInvitations,
  validateInviteToGroup,
  validateTransferLeadership,
  validateSubmitFacultyPreferences
};
