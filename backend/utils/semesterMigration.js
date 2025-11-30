const mongoose = require('mongoose');
const Group = require('../models/Group');
const Student = require('../models/Student');

/**
 * Generate academic year in YYYY-YY format
 */
const generateAcademicYear = () => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  return `${currentYear}-${nextYear.toString().slice(-2)}`;
};

/**
 * Migrate group from Sem 5 to Sem 6 (for continuation projects)
 * Updates existing group semester and adds new group membership entries
 * 
 * @param {ObjectId} groupId - Sem 5 group ID
 * @param {String} newAcademicYear - New academic year (e.g., '2025-26')
 * @param {Object} session - MongoDB session for transaction
 * @returns {Group} Updated group document
 */
const migrateGroupToSem6 = async (groupId, newAcademicYear, session = null) => {
  try {
    // Get Sem 5 group
    const group = session 
      ? await Group.findById(groupId).session(session)
      : await Group.findById(groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }
    
    // Check if already migrated to Sem 6 first
    if (group.semester === 6) {
      // Group is already at Sem 6 - just update academic year if needed
      if (newAcademicYear && group.academicYear !== newAcademicYear) {
        group.academicYear = newAcademicYear;
        group.updatedAt = new Date();
        if (session) {
          await group.save({ session });
        } else {
          await group.save();
        }
      }
      return group;
    }
    
    // Check if group is from Sem 5 (required for migration)
    if (group.semester !== 5) {
      throw new Error('Group is not from Semester 5');
    }
    
    // Validate academic year format
    if (!newAcademicYear || !/^\d{4}-\d{2}$/.test(newAcademicYear)) {
      newAcademicYear = generateAcademicYear();
    }
    
    // Validate that leader is in active members before migration
    const activeMembers = group.members.filter(m => m.isActive);
    const leaderInActiveMembers = activeMembers.some(m => {
      const memberId = m.student._id ? m.student._id.toString() : m.student.toString();
      return memberId === group.leader.toString();
    });
    
    if (!leaderInActiveMembers) {
      throw new Error('Group leader must be an active member of the group before migration to Sem 6');
    }
    
    // Update group semester and academic year
    group.semester = 6;
    group.academicYear = newAcademicYear;
    group.status = 'open'; // Reset status for Sem 6
    group.project = null; // Clear Sem 5 project reference
    group.updatedAt = new Date();
    
    // Update group name to reflect Sem 6 (replace "Sem 5" with "Sem 6" or append if not present)
    // Get leader's name for group name generation
    let leaderName = 'Unknown';
    if (group.leader && typeof group.leader === 'object' && group.leader.fullName) {
      // Already populated
      leaderName = group.leader.fullName;
    } else {
      // Need to fetch leader's name
      const leaderStudent = session
        ? await Student.findById(group.leader).select('fullName').session(session)
        : await Student.findById(group.leader).select('fullName');
      if (leaderStudent) {
        leaderName = leaderStudent.fullName;
      }
    }
    
    // Update group name: "Group - [Leader Name] - Sem 6"
    group.name = `Group - ${leaderName} - Sem 6`;
    
    // Save group
    if (session) {
      await group.save({ session });
    } else {
      await group.save();
    }
    
    // Update all group members' memberships
    // Add new Sem 6 membership while marking Sem 5 membership as inactive
    const memberIds = activeMembers.map(m => m.student);
    
    const updatePromises = memberIds.map(async (memberId) => {
      const member = group.members.find(m => 
        m.student.toString() === memberId.toString()
      );
      
      const role = member?.role || 'member';
      
      // 1. Mark Sem 5 membership as inactive
      const deactivateQuery = {
        $set: {
          'groupMemberships.$[elem].isActive': false
        }
      };
      
      const deactivateOptions = {
        arrayFilters: [
          { 'elem.group': group._id.toString(), 'elem.semester': 5, 'elem.isActive': true }
        ]
      };
      
      if (session) {
        await Student.findByIdAndUpdate(memberId, deactivateQuery, { ...deactivateOptions, session });
      } else {
        await Student.findByIdAndUpdate(memberId, deactivateQuery, deactivateOptions);
      }
      
      // 2. Add new Sem 6 membership
      const addMembershipQuery = {
        $push: {
          groupMemberships: {
            group: group._id,
            role: role,
            semester: 6,
            isActive: true,
            joinedAt: new Date()
          }
        }
      };
      
      if (session) {
        await Student.findByIdAndUpdate(memberId, addMembershipQuery, { session });
      } else {
        await Student.findByIdAndUpdate(memberId, addMembershipQuery);
      }
      
      // 3. Update currentProjects status for Sem 5 project
      const updateProjectsQuery = {
        $set: {
          'currentProjects.$[elem].status': 'completed'
        }
      };
      
      const updateProjectsOptions = {
        arrayFilters: [
          { 'elem.semester': 5, 'elem.status': { $ne: 'completed' } }
        ]
      };
      
      if (session) {
        await Student.findByIdAndUpdate(memberId, updateProjectsQuery, { ...updateProjectsOptions, session });
      } else {
        await Student.findByIdAndUpdate(memberId, updateProjectsQuery, updateProjectsOptions);
      }
    });
    
    await Promise.all(updatePromises);
    
    // Populate members and faculty before returning
    await group.populate('members.student', 'fullName misNumber collegeEmail');
    await group.populate('leader', 'fullName misNumber collegeEmail');
    await group.populate('allocatedFaculty', 'fullName department designation');
    
    return group;
  } catch (error) {
    console.error('Error migrating group to Sem 6:', error);
    throw error;
  }
};

/**
 * Create a new group for Sem 6 (for new projects)
 * Copies members and faculty from Sem 5 group but creates new group document
 * 
 * @param {ObjectId} sem5GroupId - Sem 5 group ID to copy from
 * @param {String} newAcademicYear - New academic year
 * @param {Object} session - MongoDB session for transaction
 * @returns {Group} New Sem 6 group document
 */
const createNewGroupForSem6 = async (sem5GroupId, newAcademicYear, session = null) => {
  try {
    // Get Sem 5 group
    const sem5Group = session
      ? await Group.findById(sem5GroupId).session(session)
      : await Group.findById(sem5GroupId);
    
    if (!sem5Group) {
      throw new Error('Sem 5 group not found');
    }
    
    // Note: We don't check if semester is 5 because the group might have been migrated
    // to Sem 6 already (same document updated). This function creates a NEW group document
    // for Sem 6, so it can work with either a Sem 5 group or a migrated Sem 6 group.
    
    // Validate academic year
    if (!newAcademicYear || !/^\d{4}-\d{2}$/.test(newAcademicYear)) {
      newAcademicYear = generateAcademicYear();
    }
    
    // Get leader's fullName for group name generation
    // Handle both populated and unpopulated leader fields
    let leaderName = 'Unknown';
    if (sem5Group.leader && typeof sem5Group.leader === 'object' && sem5Group.leader.fullName) {
      // Already populated
      leaderName = sem5Group.leader.fullName;
    } else {
      // Need to fetch leader's name
      const leaderStudent = session
        ? await Student.findById(sem5Group.leader).select('fullName').session(session)
        : await Student.findById(sem5Group.leader).select('fullName');
      if (leaderStudent) {
        leaderName = leaderStudent.fullName;
      }
    }
    
    // Generate clean group name: "Group - [Leader Name] - Sem 6"
    const groupName = `Group - ${leaderName} - Sem 6`;
    
    // Get only ACTIVE members (leader must be active)
    const activeMembers = sem5Group.members.filter(m => m.isActive);
    
    // Ensure leader is in the active members list
    const leaderInActiveMembers = activeMembers.some(m => {
      const memberId = m.student._id ? m.student._id.toString() : m.student.toString();
      return memberId === sem5Group.leader.toString();
    });
    
    if (!leaderInActiveMembers) {
      throw new Error('Group leader must be an active member of the group');
    }
    
    // Create new group with Sem 5 data - only include ACTIVE members
    // Ensure leader's role is set correctly
    const newMembers = activeMembers.map(m => {
      const memberId = m.student._id ? m.student._id.toString() : m.student.toString();
      const isLeader = memberId === sem5Group.leader.toString();
      return {
        student: m.student,
        role: isLeader ? 'leader' : m.role, // Ensure leader role is set correctly
        joinedAt: new Date(),
        isActive: true, // All members in new group are active
        inviteStatus: 'accepted'
      };
    });
    
    const newGroupData = {
      name: groupName,
      description: sem5Group.description || '',
      members: newMembers,
      leader: sem5Group.leader,
      createdBy: sem5Group.createdBy,
      allocatedFaculty: sem5Group.allocatedFaculty,
      semester: 6,
      academicYear: newAcademicYear,
      status: 'open',
      maxMembers: sem5Group.maxMembers || 5,
      minMembers: sem5Group.minMembers || 4,
      isActive: true,
      project: null,
      invites: [] // Clear invites for new group
    };
    
    const newGroup = new Group(newGroupData);
    
    if (session) {
      await newGroup.save({ session });
    } else {
      await newGroup.save();
    }
    
    // Add group membership for all members
    // Also mark old Sem 5 groupMemberships as inactive to preserve history
    const memberIds = sem5Group.members
      .filter(m => m.isActive)
      .map(m => m.student);
    
    const updatePromises = memberIds.map(async (memberId) => {
      const member = sem5Group.members.find(m => 
        m.student.toString() === memberId.toString()
      );
      
      const role = member?.role || 'member';
      
      // 1. Mark old Sem 5 membership as inactive (preserve history)
      const deactivateQuery = {
        $set: {
          'groupMemberships.$[elem].isActive': false
        }
      };
      
      const deactivateOptions = {
        arrayFilters: [
          { 'elem.group': sem5GroupId.toString(), 'elem.semester': 5, 'elem.isActive': true }
        ]
      };
      
      if (session) {
        await Student.findByIdAndUpdate(memberId, deactivateQuery, { ...deactivateOptions, session });
      } else {
        await Student.findByIdAndUpdate(memberId, deactivateQuery, deactivateOptions);
      }
      
      // 2. Add new Sem 6 membership pointing to NEW group
      const addMembershipQuery = {
        $push: {
          groupMemberships: {
            group: newGroup._id,
            role: role,
            semester: 6,
            isActive: true,
            joinedAt: new Date()
          }
        },
        $set: {
          groupId: newGroup._id // Update groupId to point to NEW Sem 6 group (not old Sem 5 group)
        }
      };
      
      if (session) {
        await Student.findByIdAndUpdate(memberId, addMembershipQuery, { session });
      } else {
        await Student.findByIdAndUpdate(memberId, addMembershipQuery);
      }
      
      // 3. Update currentProjects status for Sem 5 project (mark as completed)
      const updateProjectsQuery = {
        $set: {
          'currentProjects.$[elem].status': 'completed'
        }
      };
      
      const updateProjectsOptions = {
        arrayFilters: [
          { 'elem.semester': 5, 'elem.status': { $ne: 'completed' } }
        ]
      };
      
      if (session) {
        await Student.findByIdAndUpdate(memberId, updateProjectsQuery, { ...updateProjectsOptions, session });
      } else {
        await Student.findByIdAndUpdate(memberId, updateProjectsQuery, updateProjectsOptions);
      }
    });
    
    await Promise.all(updatePromises);
    
    // Populate before returning
    await newGroup.populate('members.student', 'fullName misNumber collegeEmail');
    await newGroup.populate('leader', 'fullName misNumber collegeEmail');
    await newGroup.populate('allocatedFaculty', 'fullName department designation');
    
    return newGroup;
  } catch (error) {
    console.error('Error creating new group for Sem 6:', error);
    throw error;
  }
};

module.exports = {
  migrateGroupToSem6,
  createNewGroupForSem6,
  generateAcademicYear
};

