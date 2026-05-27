const Group = require('../models/Group');
const Panel = require('../models/Panel');
const PanelConfiguration = require('../models/PanelConfiguration');

/**
 * Get groups that are eligible for panel assignment in a given semester.
 * 
 * Eligibility criteria:
 *   - allocatedFaculty is set (faculty allocation is complete)
 *   - panel is null (not yet assigned to a panel)
 *   - isActive is true
 *   - status is 'complete', 'locked', or 'finalized'
 * 
 * @param {Number} semester - Semester number (1–8)
 * @param {String} academicYear - Academic year (e.g. '2025-26')
 * @returns {Promise<Array>} Array of eligible Group documents
 */
const getEligibleGroupsForSemester = async (semester, academicYear) => {
  if (!semester || !academicYear) {
    throw new Error('semester and academicYear are required');
  }

  const groups = await Group.find({
    semester: parseInt(semester),
    academicYear,
    isActive: true,
    allocatedFaculty: { $ne: null },
    panel: null,
    status: { $in: ['complete', 'locked', 'finalized'] }
  })
    .populate('allocatedFaculty', 'fullName email facultyId department')
    .populate('leader', 'fullName misNumber')
    .populate('project', 'title projectType')
    .sort({ name: 1 })
    .lean();

  return groups;
};

/**
 * Get ALL groups in a semester regardless of eligibility or panel assignment.
 * 
 * @param {Number} semester - Semester number (1–8)
 * @param {String} academicYear - Academic year (e.g. '2025-26')
 * @returns {Promise<Object>} Object with groups categorized by assignment status:
 *   - all: every group in the semester
 *   - assigned: groups already assigned to a panel
 *   - unassigned: groups not yet assigned to a panel
 *   - eligible: groups eligible for assignment (has faculty, no panel)
 *   - ineligible: groups that cannot be assigned (no faculty yet)
 */
const getAllGroupsInSemester = async (semester, academicYear) => {
  if (!semester || !academicYear) {
    throw new Error('semester and academicYear are required');
  }

  const all = await Group.find({
    semester: parseInt(semester),
    academicYear,
    isActive: true
  })
    .populate('allocatedFaculty', 'fullName email facultyId department')
    .populate('leader', 'fullName misNumber')
    .populate('project', 'title projectType')
    .populate('panel', 'panelNumber')
    .sort({ name: 1 })
    .lean();

  const assigned = all.filter(g => g.panel != null);
  const unassigned = all.filter(g => g.panel == null);
  const eligible = unassigned.filter(g =>
    g.allocatedFaculty != null &&
    ['complete', 'locked', 'finalized'].includes(g.status)
  );
  const ineligible = unassigned.filter(g =>
    g.allocatedFaculty == null ||
    !['complete', 'locked', 'finalized'].includes(g.status)
  );

  return {
    all,
    assigned,
    unassigned,
    eligible,
    ineligible,
    summary: {
      total: all.length,
      assigned: assigned.length,
      unassigned: unassigned.length,
      eligible: eligible.length,
      ineligible: ineligible.length
    }
  };
};

/**
 * Fisher-Yates (Knuth) shuffle — in-place, unbiased.
 * @param {Array} array
 * @returns {Array} The same array, shuffled
 */
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Auto-assign eligible unassigned groups to panels for a semester.
 * 
 * Algorithm:
 *   1. Fetch all active panels for the semester
 *   2. Fetch eligible unassigned groups
 *   3. Shuffle groups (Fisher-Yates) for fair random distribution
 *   4. Round-robin assign groups to panels, respecting maxGroupsPerPanel
 *   5. Update Group.panel (single source of truth)
 * 
 * Rules:
 *   - Only groups with allocatedFaculty AND panel == null are assigned
 *   - Already-assigned groups are never touched
 *   - Panels at capacity are skipped
 * 
 * @param {Number} semester
 * @param {String} academicYear
 * @returns {Promise<Object>} Assignment results
 */
const autoAssignGroupsToPanels = async (semester, academicYear) => {
  if (!semester || !academicYear) {
    throw new Error('semester and academicYear are required');
  }

  // 1. Get panels
  const panels = await Panel.find({
    semester: parseInt(semester),
    academicYear,
    isActive: true
  }).sort({ panelNumber: 1 });

  if (panels.length === 0) {
    throw new Error(`No active panels found for semester ${semester} in ${academicYear}`);
  }

  // 2. Get config for max groups per panel
  const config = await PanelConfiguration.findOne({ academicYear, isActive: true });
  const maxGroupsPerPanel = config ? config.maxGroupsPerPanel : 10;

  // 3. Get eligible unassigned groups
  const eligibleGroups = await getEligibleGroupsForSemester(semester, academicYear);

  if (eligibleGroups.length === 0) {
    return {
      assigned: 0,
      skipped: 0,
      totalEligible: 0,
      totalPanels: panels.length,
      assignments: [],
      message: 'No eligible unassigned groups found'
    };
  }

  // 4. Shuffle for fair distribution
  const shuffledGroups = shuffleArray(eligibleGroups);

  // 5. Build panel capacity map — count via Group.countDocuments (single source of truth)
  const panelSlots = [];
  for (const panel of panels) {
    const currentCount = await Group.countDocuments({ panel: panel._id, isActive: true });
    panelSlots.push({
      panel,
      currentCount,
      maxCount: maxGroupsPerPanel
    });
  }

  // 6. Round-robin assignment
  const assignments = [];
  const skippedGroups = [];
  let panelIndex = 0;

  for (const group of shuffledGroups) {
    // Find next panel with capacity (round-robin with wrap)
    let assigned = false;
    const startIndex = panelIndex;

    do {
      const slot = panelSlots[panelIndex];
      // Semester Mismatch Validation
      const semMatch = Boolean(
        group.semester && group.academicYear &&
        slot.panel.semester && slot.panel.academicYear &&
        group.semester === slot.panel.semester &&
        group.academicYear === slot.panel.academicYear
      );

      let hasConflict = false;
      if (group.allocatedFaculty && slot.panel.members) {
        const allocatedId = group.allocatedFaculty._id ? group.allocatedFaculty._id.toString() : group.allocatedFaculty.toString();
        hasConflict = slot.panel.members.some(m => m.faculty && m.faculty.toString() === allocatedId);
      }

      if (semMatch && !hasConflict && slot.currentCount < slot.maxCount) {
        // Assign this group to this panel
        assignments.push({
          groupId: group._id,
          groupName: group.name,
          panelId: slot.panel._id,
          panelNumber: slot.panel.panelNumber
        });

        slot.currentCount++;
        assigned = true;
        panelIndex = (panelIndex + 1) % panels.length;
        break;
      }

      panelIndex = (panelIndex + 1) % panels.length;
    } while (panelIndex !== startIndex);

    if (!assigned) {
      skippedGroups.push({
        groupId: group._id,
        groupName: group.name,
        reason: 'All panels at capacity, conflict of interest, or semester mismatch'
      });
    }
  }

  // 7. Persist assignments — write ONLY to Group.panel (single source of truth)
  for (const assignment of assignments) {
    await Group.findByIdAndUpdate(assignment.groupId, {
      panel: assignment.panelId
    });
  }

  return {
    assigned: assignments.length,
    skipped: skippedGroups.length,
    totalEligible: eligibleGroups.length,
    totalPanels: panels.length,
    maxGroupsPerPanel,
    assignments,
    skippedGroups,
    message: `Assigned ${assignments.length} groups to ${panels.length} panels`
  };
};

/**
 * Move a group from one panel to another.
 * Writes ONLY to Group.panel (single source of truth).
 * 
 * @param {String} groupId - Group _id
 * @param {String} targetPanelId - Target Panel _id
 * @returns {Promise<Object>} Move result
 */
const moveGroupToPanel = async (groupId, targetPanelId) => {
  if (!groupId || !targetPanelId) {
    throw new Error('groupId and targetPanelId are required');
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  const targetPanel = await Panel.findById(targetPanelId);
  if (!targetPanel) {
    throw new Error('Target panel not found');
  }

  if (!targetPanel.isActive) {
    throw new Error('Target panel is not active');
  }

  // Semester Mismatch Validation
  if (!group.semester || !group.academicYear || !targetPanel.semester || !targetPanel.academicYear ||
      group.semester !== targetPanel.semester || group.academicYear !== targetPanel.academicYear) {
    const error = new Error('Cannot move group: group and target panel must belong to the same semester and academic year.');
    error.status = 400;
    error.statusCode = 400;
    throw error;
  }

  // Conflict of Interest Validation
  if (group.allocatedFaculty && targetPanel.members) {
    const allocatedId = group.allocatedFaculty._id ? group.allocatedFaculty._id.toString() : group.allocatedFaculty.toString();
    const hasConflict = targetPanel.members.some(m => m.faculty && m.faculty.toString() === allocatedId);
    if (hasConflict) {
      const error = new Error("Cannot move group: this group's allocated faculty is already a member of the target panel.");
      error.status = 400;
      error.statusCode = 400;
      throw error;
    }
  }

  // Check if already assigned to this panel
  const alreadyInTarget = group.panel && group.panel.toString() === targetPanelId.toString();
  if (alreadyInTarget) {
    return {
      groupId,
      groupName: group.name,
      sourcePanelId: group.panel,
      targetPanelId,
      targetPanelNumber: targetPanel.panelNumber,
      message: 'Group is already assigned to this panel'
    };
  }

  // Check target panel capacity via Group.countDocuments (single source of truth)
  const config = await PanelConfiguration.findOne({
    academicYear: targetPanel.academicYear,
    isActive: true
  });
  const maxGroups = config ? config.maxGroupsPerPanel : 10;
  const currentCount = await Group.countDocuments({ panel: targetPanelId, isActive: true });

  if (currentCount >= maxGroups) {
    throw new Error('Target panel has reached maximum group capacity');
  }

  const sourcePanelId = group.panel;

  // Write ONLY to Group.panel — single source of truth
  group.panel = targetPanelId;
  await group.save();

  return {
    groupId,
    groupName: group.name,
    sourcePanelId,
    targetPanelId,
    targetPanelNumber: targetPanel.panelNumber,
    message: sourcePanelId
      ? `Moved group from panel to Panel #${targetPanel.panelNumber}`
      : `Assigned group to Panel #${targetPanel.panelNumber}`
  };
};

module.exports = {
  getEligibleGroupsForSemester,
  getAllGroupsInSemester,
  autoAssignGroupsToPanels,
  moveGroupToPanel,
  shuffleArray
};
