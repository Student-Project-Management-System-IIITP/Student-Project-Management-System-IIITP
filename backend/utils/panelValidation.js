const Panel = require('../models/Panel');

/**
 * Check if a faculty member is eligible to be assigned as a conveyer.
 * 
 * A faculty is ineligible if they are already a conveyer in ANY other
 * active panel (across all semesters and academic years).
 * 
 * @param {String|ObjectId} facultyId - The Faculty document _id to check
 * @param {String|ObjectId|null} excludePanelId - Panel _id to exclude from the check
 *   (used when editing/updating an existing panel so it doesn't conflict with itself)
 * @returns {Promise<Object>} Result object:
 *   - eligible {Boolean} — true if faculty can be conveyer
 *   - conflictingPanels {Array} — panels where faculty is already a conveyer
 *   - message {String} — human-readable explanation
 */
const isConveyerEligible = async (facultyId, excludePanelId = null) => {
  if (!facultyId) {
    throw new Error('facultyId is required');
  }

  const facultyIdStr = facultyId.toString();

  // Find all active panels where this faculty is a conveyer
  const query = {
    isActive: true,
    members: {
      $elemMatch: {
        faculty: facultyId,
        role: 'conveyer'
      }
    }
  };

  // Exclude the current panel when editing
  if (excludePanelId) {
    query._id = { $ne: excludePanelId };
  }

  const conflictingPanels = await Panel.find(query)
    .select('panelNumber semester academicYear')
    .lean();

  if (conflictingPanels.length === 0) {
    return {
      eligible: true,
      conflictingPanels: [],
      message: 'Faculty is eligible to be a conveyer'
    };
  }

  const panelDescriptions = conflictingPanels.map(
    p => `Panel #${p.panelNumber} (Sem ${p.semester}, ${p.academicYear})`
  );

  return {
    eligible: false,
    conflictingPanels,
    message: `Faculty is already a conveyer in: ${panelDescriptions.join(', ')}`
  };
};

/**
 * Validate an entire members array before saving a panel.
 * Checks:
 *   1. Exactly one conveyer per panel
 *   2. The conveyer is not already a conveyer in another active panel
 *   3. No duplicate faculty within the same panel
 * 
 * @param {Array} members - Array of { faculty, department, role } objects
 * @param {String|ObjectId|null} excludePanelId - Panel _id to exclude (for edits)
 * @returns {Promise<Object>} Validation result:
 *   - valid {Boolean}
 *   - errors {Array<String>}
 */
const validatePanelMembers = async (members, excludePanelId = null) => {
  const errors = [];

  if (!Array.isArray(members) || members.length === 0) {
    return { valid: false, errors: ['Members array is required and must not be empty'] };
  }

  // 1. Check exactly one conveyer
  const conveyers = members.filter(m => m.role === 'conveyer');
  if (conveyers.length === 0) {
    errors.push('Panel must have exactly one conveyer');
  } else if (conveyers.length > 1) {
    errors.push('Panel cannot have more than one conveyer');
  }

  // 2. Check for duplicate faculty
  const facultyIds = members.map(m => (m.faculty._id || m.faculty).toString());
  const uniqueIds = new Set(facultyIds);
  if (uniqueIds.size !== facultyIds.length) {
    errors.push('Panel cannot have duplicate faculty members');
  }

  // 3. Check conveyer uniqueness across panels
  if (conveyers.length === 1) {
    const conveyerFacultyId = conveyers[0].faculty._id || conveyers[0].faculty;
    const eligibility = await isConveyerEligible(conveyerFacultyId, excludePanelId);

    if (!eligibility.eligible) {
      errors.push(eligibility.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = {
  isConveyerEligible,
  validatePanelMembers
};
