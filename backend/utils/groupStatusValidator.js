const mongoose = require('mongoose');
const Group = require('../models/Group');

/**
 * Validates and updates group status based on member count and active members
 * This ensures group status is always consistent with the actual member count
 * 
 * @param {ObjectId} groupId - Group ID to validate
 * @param {Object} session - MongoDB session for transaction (optional)
 * @returns {Object} Status update result
 */
const validateAndUpdateGroupStatus = async (groupId, session = null) => {
  try {
    const group = session 
      ? await Group.findById(groupId).session(session)
      : await Group.findById(groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }
    
    const activeMembers = group.members.filter(m => m.isActive);
    const activeMemberCount = activeMembers.length;
    
    let statusChanged = false;
    let previousStatus = group.status;
    let reason = '';
    
    // Check if group should be disbanded (no active members)
    if (activeMemberCount === 0) {
      if (group.isActive || group.status !== 'disbanded') {
        group.isActive = false;
        group.status = 'disbanded';
        statusChanged = true;
        reason = 'No active members remaining';
      }
    }
    // Check if below minimum members
    else if (activeMemberCount < group.minMembers) {
      // Don't auto-downgrade finalized or locked groups (admin decision needed)
      if (group.status === 'finalized' || group.status === 'locked') {
        // Log warning but don't change status
        console.warn(`Group ${groupId} has ${activeMemberCount} members but is ${group.status}. Manual intervention may be needed.`);
        return {
          statusChanged: false,
          previousStatus: group.status,
          currentStatus: group.status,
          reason: `Group has ${activeMemberCount} members (below minimum ${group.minMembers}) but is ${group.status}. Status preserved.`
        };
      }
      
      // Update to 'forming' if not already
      if (group.status !== 'forming') {
        group.status = 'forming';
        statusChanged = true;
        reason = `Member count (${activeMemberCount}) below minimum (${group.minMembers})`;
      }
    }
    // Check if complete (within min-max range)
    else if (activeMemberCount >= group.minMembers && activeMemberCount <= group.maxMembers) {
      // Update to 'complete' if currently in forming or invitations_sent status
      if (group.status === 'invitations_sent' || group.status === 'forming' || group.status === 'open') {
        group.status = 'complete';
        statusChanged = true;
        reason = `Member count (${activeMemberCount}) within valid range (${group.minMembers}-${group.maxMembers})`;
      }
    }
    // Check if over maximum (error state)
    else if (activeMemberCount > group.maxMembers) {
      // This is an error state - log it but don't auto-fix
      console.error(`Group ${groupId} has ${activeMemberCount} members but max is ${group.maxMembers}. This is an error state.`);
      return {
        statusChanged: false,
        previousStatus: group.status,
        currentStatus: group.status,
        reason: `ERROR: Group has ${activeMemberCount} members but max is ${group.maxMembers}. Manual intervention required.`,
        error: true
      };
    }
    
    // Save if status changed
    if (statusChanged) {
      if (session) {
        await group.save({ session });
      } else {
        await group.save();
      }
    }
    
    return {
      statusChanged,
      previousStatus,
      currentStatus: group.status,
      memberCount: activeMemberCount,
      minMembers: group.minMembers,
      maxMembers: group.maxMembers,
      reason: reason || 'No status change needed'
    };
  } catch (error) {
    console.error('Error validating group status:', error);
    throw error;
  }
};

/**
 * Check if all members of a group have been promoted to a higher semester
 * 
 * @param {ObjectId} groupId - Group ID to check
 * @param {Number} targetSemester - Target semester to check against
 * @param {Object} session - MongoDB session (optional)
 * @returns {Object} Check result
 */
const checkAllMembersPromoted = async (groupId, targetSemester, session = null) => {
  try {
    const Student = require('../models/Student');
    const group = session 
      ? await Group.findById(groupId).session(session)
      : await Group.findById(groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }
    
    const activeMembers = group.members.filter(m => m.isActive);
    if (activeMembers.length === 0) {
      return {
        allPromoted: true,
        reason: 'No active members in group'
      };
    }
    
    const memberIds = activeMembers.map(m => m.student);
    const students = session
      ? await Student.find({ _id: { $in: memberIds } }).session(session).select('semester').lean()
      : await Student.find({ _id: { $in: memberIds } }).select('semester').lean();
    
    const allPromoted = students.every(student => student.semester >= targetSemester);
    const promotedCount = students.filter(s => s.semester >= targetSemester).length;
    
    return {
      allPromoted,
      totalMembers: activeMembers.length,
      promotedCount,
      currentSemesters: students.map(s => s.semester),
      groupSemester: group.semester,
      targetSemester
    };
  } catch (error) {
    console.error('Error checking member promotion status:', error);
    throw error;
  }
};

/**
 * Validate group status for a specific semester
 * Useful for checking if group status is appropriate for its semester
 * 
 * @param {ObjectId} groupId - Group ID
 * @param {Number} semester - Semester to validate against
 * @param {Object} session - MongoDB session (optional)
 * @returns {Object} Validation result
 */
const validateGroupForSemester = async (groupId, semester, session = null) => {
  try {
    const group = session 
      ? await Group.findById(groupId).session(session)
      : await Group.findById(groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }
    
    const issues = [];
    const warnings = [];
    
    // Check semester match
    if (group.semester !== semester) {
      issues.push(`Group semester (${group.semester}) does not match expected semester (${semester})`);
    }
    
    // Check member count
    const activeMembers = group.members.filter(m => m.isActive);
    if (activeMembers.length < group.minMembers) {
      issues.push(`Group has ${activeMembers.length} active members but minimum is ${group.minMembers}`);
    }
    if (activeMembers.length > group.maxMembers) {
      issues.push(`Group has ${activeMembers.length} active members but maximum is ${group.maxMembers}`);
    }
    
    // Check status consistency
    if (activeMembers.length === 0 && group.status !== 'disbanded') {
      issues.push('Group has no active members but status is not disbanded');
    }
    
    if (activeMembers.length >= group.minMembers && 
        activeMembers.length <= group.maxMembers && 
        group.status === 'forming') {
      warnings.push('Group has sufficient members but status is still "forming"');
    }
    
    // Check leader is active member
    const leaderIsActive = activeMembers.some(m => 
      m.student.toString() === group.leader.toString()
    );
    if (!leaderIsActive) {
      issues.push('Group leader is not an active member');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      warnings,
      memberCount: activeMembers.length,
      groupStatus: group.status,
      groupSemester: group.semester
    };
  } catch (error) {
    console.error('Error validating group for semester:', error);
    throw error;
  }
};

module.exports = {
  validateAndUpdateGroupStatus,
  checkAllMembersPromoted,
  validateGroupForSemester
};

