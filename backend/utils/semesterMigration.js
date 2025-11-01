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
    
    if (group.semester !== 5) {
      throw new Error('Group is not from Semester 5');
    }
    
    // Check if already migrated
    if (group.semester === 6) {
      console.log('Group already migrated to Sem 6');
      return group;
    }
    
    // Validate academic year format
    if (!newAcademicYear || !/^\d{4}-\d{2}$/.test(newAcademicYear)) {
      newAcademicYear = generateAcademicYear();
    }
    
    // Update group semester and academic year
    group.semester = 6;
    group.academicYear = newAcademicYear;
    group.status = 'open'; // Reset status for Sem 6
    group.project = null; // Clear Sem 5 project reference
    group.updatedAt = new Date();
    
    // Save group
    if (session) {
      await group.save({ session });
    } else {
      await group.save();
    }
    
    // Update all group members' memberships
    // Add new Sem 6 membership while keeping Sem 5 membership for history
    const memberIds = group.members
      .filter(m => m.isActive)
      .map(m => m.student);
    
    const updatePromises = memberIds.map(async (memberId) => {
      const member = group.members.find(m => 
        m.student.toString() === memberId.toString()
      );
      
      const role = member?.role || 'member';
      
      // Add new Sem 6 membership
      const updateQuery = {
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
        await Student.findByIdAndUpdate(memberId, updateQuery, { session });
      } else {
        await Student.findByIdAndUpdate(memberId, updateQuery);
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
    
    if (sem5Group.semester !== 5) {
      throw new Error('Source group is not from Semester 5');
    }
    
    // Validate academic year
    if (!newAcademicYear || !/^\d{4}-\d{2}$/.test(newAcademicYear)) {
      newAcademicYear = generateAcademicYear();
    }
    
    // Create new group with Sem 5 data
    const newGroupData = {
      name: `${sem5Group.name} (Sem 6)`,
      description: sem5Group.description || '',
      members: sem5Group.members.map(m => ({
        student: m.student,
        role: m.role,
        joinedAt: new Date(),
        isActive: m.isActive,
        inviteStatus: 'accepted'
      })),
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
    const memberIds = sem5Group.members
      .filter(m => m.isActive)
      .map(m => m.student);
    
    const updatePromises = memberIds.map(async (memberId) => {
      const member = sem5Group.members.find(m => 
        m.student.toString() === memberId.toString()
      );
      
      const role = member?.role || 'member';
      
      const updateQuery = {
        $push: {
          groupMemberships: {
            group: newGroup._id,
            role: role,
            semester: 6,
            isActive: true,
            joinedAt: new Date()
          }
        }
      };
      
      if (session) {
        await Student.findByIdAndUpdate(memberId, updateQuery, { session });
      } else {
        await Student.findByIdAndUpdate(memberId, updateQuery);
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

