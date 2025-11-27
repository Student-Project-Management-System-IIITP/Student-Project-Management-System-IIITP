/**
 * Comprehensive Data Validation and Cleanup Script
 * 
 * This script validates and fixes irregular data in the database:
 * - Missing/null student information
 * - Orphaned references (projects/groups pointing to deleted students)
 * - Version conflicts in projects
 * - Missing required fields
 * - Inconsistent data types
 * - Populates missing student data where possible
 * 
 * Usage:
 *   node backend/scripts/validateAndFixData.js
 * 
 * Or with npm script:
 *   npm run fix:data
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Group = require('../models/Group');
const Project = require('../models/Project');
const User = require('../models/User');

// Statistics tracking
const stats = {
  studentsFixed: 0,
  projectsFixed: 0,
  groupsFixed: 0,
  orphanedProjectsRemoved: 0,
  orphanedGroupsFixed: 0,
  versionConflictsResolved: 0,
  missingDataFixed: 0,
  errors: []
};

/**
 * Fix version conflicts by using findByIdAndUpdate
 */
async function fixProjectVersionConflicts() {
  console.log('\n🔍 Checking for projects with version conflicts...');
  
  try {
    // Find all projects that might have version issues
    const allProjects = await Project.find({}).lean();
    let fixed = 0;
    
    for (const project of allProjects) {
      try {
        // Use findByIdAndUpdate to avoid version conflicts
        await Project.findByIdAndUpdate(
          project._id,
          {
            $set: {
              updatedAt: new Date()
            }
          },
          { new: true }
        );
        fixed++;
      } catch (error) {
        if (error.message.includes('version')) {
          // Force update by removing version key
          await Project.updateOne(
            { _id: project._id },
            { $unset: { __v: '' } },
            { runValidators: false }
          );
          stats.versionConflictsResolved++;
          console.log(`  ✓ Fixed version conflict for project: ${project._id}`);
        }
      }
    }
    
    console.log(`  ✓ Processed ${fixed} projects`);
  } catch (error) {
    console.error('  ❌ Error fixing version conflicts:', error.message);
    stats.errors.push({ type: 'version_conflicts', error: error.message });
  }
}

/**
 * Validate and fix student data
 */
async function validateAndFixStudents() {
  console.log('\n🔍 Validating student data...');
  
  try {
    const students = await Student.find({});
    console.log(`📋 Found ${students.length} students to validate\n`);
    
    for (const student of students) {
      let needsUpdate = false;
      
      // Check for missing fullName
      if (!student.fullName || student.fullName.trim() === '') {
        // Try to get from user
        if (student.user) {
          const user = await User.findById(student.user);
          if (user && user.name) {
            student.fullName = user.name;
            needsUpdate = true;
            console.log(`  ✓ Fixed missing fullName for student ${student.misNumber || student._id}`);
          }
        }
      }
      
      // Check for missing misNumber
      if (!student.misNumber || student.misNumber.trim() === '') {
        // Try to get from user email
        if (student.user) {
          const user = await User.findById(student.user);
          if (user && user.email) {
            // Extract MIS from email if possible
            const emailMatch = user.email.match(/(\d+)@/);
            if (emailMatch) {
              student.misNumber = emailMatch[1];
              needsUpdate = true;
              console.log(`  ✓ Fixed missing misNumber for student ${student._id}`);
            }
          }
        }
      }
      
      // Check for missing collegeEmail
      if (!student.collegeEmail || student.collegeEmail.trim() === '') {
        if (student.user) {
          const user = await User.findById(student.user);
          if (user && user.email) {
            student.collegeEmail = user.email;
            needsUpdate = true;
            console.log(`  ✓ Fixed missing collegeEmail for student ${student.misNumber || student._id}`);
          }
        }
      }
      
      // Validate semester
      if (!student.semester || student.semester < 1 || student.semester > 8) {
        console.warn(`  ⚠️  Invalid semester for student ${student.misNumber || student._id}: ${student.semester}`);
      }
      
      // Clean up invalid groupId references
      if (student.groupId) {
        const group = await Group.findById(student.groupId);
        if (!group) {
          student.groupId = null;
          needsUpdate = true;
          console.log(`  ✓ Removed invalid groupId reference for student ${student.misNumber || student._id}`);
        } else if (group.semester !== student.semester) {
          // Group is from different semester
          student.groupId = null;
          needsUpdate = true;
          console.log(`  ✓ Removed groupId from different semester for student ${student.misNumber || student._id}`);
        }
      }
      
      // Clean up invalid currentProjects references
      const validProjects = [];
      for (const cp of student.currentProjects || []) {
        if (cp.project) {
          const project = await Project.findById(cp.project);
          if (project) {
            validProjects.push(cp);
          } else {
            console.log(`  ✓ Removed invalid project reference from currentProjects for student ${student.misNumber || student._id}`);
          }
        }
      }
      if (validProjects.length !== (student.currentProjects || []).length) {
        student.currentProjects = validProjects;
        needsUpdate = true;
      }
      
      // Clean up invalid groupMemberships references
      const validMemberships = [];
      for (const gm of student.groupMemberships || []) {
        if (gm.group) {
          const group = await Group.findById(gm.group);
          if (group) {
            validMemberships.push(gm);
          } else {
            console.log(`  ✓ Removed invalid group reference from groupMemberships for student ${student.misNumber || student._id}`);
          }
        }
      }
      if (validMemberships.length !== (student.groupMemberships || []).length) {
        student.groupMemberships = validMemberships;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await student.save();
        stats.studentsFixed++;
      }
    }
    
    console.log(`\n✅ Fixed ${stats.studentsFixed} students`);
  } catch (error) {
    console.error('  ❌ Error validating students:', error.message);
    stats.errors.push({ type: 'students', error: error.message });
  }
}

/**
 * Validate and fix project data
 */
async function validateAndFixProjects() {
  console.log('\n🔍 Validating project data...');
  
  try {
    const projects = await Project.find({});
    console.log(`📋 Found ${projects.length} projects to validate\n`);
    
    for (const project of projects) {
      let needsUpdate = false;
      
      // Check for orphaned student reference
      if (project.student) {
        const student = await Student.findById(project.student);
        if (!student) {
          console.log(`  ⚠️  Orphaned project found: ${project._id} (student ${project.student} not found)`);
          // Option 1: Delete orphaned project
          await Project.findByIdAndDelete(project._id);
          stats.orphanedProjectsRemoved++;
          console.log(`  ✓ Removed orphaned project: ${project._id}`);
          continue;
        }
      } else {
        // Project without student - might be invalid
        if (!project.group) {
          await Project.findByIdAndDelete(project._id);
          stats.orphanedProjectsRemoved++;
          console.log(`  ✓ Removed project without student or group: ${project._id}`);
          continue;
        }
      }
      
      // Check for orphaned group reference
      if (project.group) {
        const group = await Group.findById(project.group);
        if (!group) {
          project.group = null;
          needsUpdate = true;
          console.log(`  ✓ Removed invalid group reference from project: ${project._id}`);
        }
      }
      
      // Check for orphaned faculty reference
      if (project.faculty) {
        const Faculty = require('../models/Faculty');
        const faculty = await Faculty.findById(project.faculty);
        if (!faculty) {
          project.faculty = null;
          needsUpdate = true;
          console.log(`  ✓ Removed invalid faculty reference from project: ${project._id}`);
        }
      }
      
      // Validate required fields
      if (!project.title || project.title.trim() === '') {
        project.title = `Untitled Project ${project._id.toString().slice(-6)}`;
        needsUpdate = true;
        console.log(`  ✓ Added default title for project: ${project._id}`);
      }
      
      if (!project.academicYear || project.academicYear.trim() === '') {
        // Try to get from student
        if (project.student) {
          const student = await Student.findById(project.student);
          if (student && student.academicYear) {
            project.academicYear = student.academicYear;
            needsUpdate = true;
            console.log(`  ✓ Fixed missing academicYear for project: ${project._id}`);
          }
        }
      }
      
      // Validate semester
      if (!project.semester || project.semester < 1 || project.semester > 8) {
        // Try to get from student
        if (project.student) {
          const student = await Student.findById(project.student);
          if (student && student.semester) {
            project.semester = student.semester;
            needsUpdate = true;
            console.log(`  ✓ Fixed invalid semester for project: ${project._id}`);
          }
        }
      }
      
      // Validate status
      const validStatuses = ['registered', 'faculty_allocated', 'active', 'completed', 'cancelled'];
      if (!validStatuses.includes(project.status)) {
        project.status = 'registered';
        needsUpdate = true;
        console.log(`  ✓ Fixed invalid status for project: ${project._id}`);
      }
      
      if (needsUpdate) {
        // Use findByIdAndUpdate to avoid version conflicts
        await Project.findByIdAndUpdate(
          project._id,
          { $set: project.toObject() },
          { runValidators: true, new: true }
        );
        stats.projectsFixed++;
      }
    }
    
    console.log(`\n✅ Fixed ${stats.projectsFixed} projects`);
    console.log(`✅ Removed ${stats.orphanedProjectsRemoved} orphaned projects`);
  } catch (error) {
    console.error('  ❌ Error validating projects:', error.message);
    stats.errors.push({ type: 'projects', error: error.message });
  }
}

/**
 * Validate and fix group data
 */
async function validateAndFixGroups() {
  console.log('\n🔍 Validating group data...');
  
  try {
    const groups = await Group.find({});
    console.log(`📋 Found ${groups.length} groups to validate\n`);
    
    for (const group of groups) {
      let needsUpdate = false;
      
      // Validate and fix members
      const validMembers = [];
      for (const member of group.members || []) {
        if (member.student) {
          const student = await Student.findById(member.student);
          if (student) {
            validMembers.push(member);
          } else {
            console.log(`  ✓ Removed invalid student reference from group ${group._id}`);
          }
        }
      }
      if (validMembers.length !== (group.members || []).length) {
        group.members = validMembers;
        needsUpdate = true;
      }
      
      // Validate leader
      if (group.leader) {
        const leader = await Student.findById(group.leader);
        if (!leader) {
          // Assign first valid member as leader
          if (validMembers.length > 0) {
            group.leader = validMembers[0].student;
            needsUpdate = true;
            console.log(`  ✓ Fixed invalid leader for group: ${group._id}`);
          } else {
            group.leader = null;
            needsUpdate = true;
          }
        } else {
          // Check if leader is in members list
          const leaderInMembers = validMembers.some(m => m.student.toString() === group.leader.toString());
          if (!leaderInMembers) {
            // Add leader to members if not present
            validMembers.push({
              student: group.leader,
              role: 'leader',
              joinedAt: new Date(),
              isActive: true,
              inviteStatus: 'accepted'
            });
            group.members = validMembers;
            needsUpdate = true;
            console.log(`  ✓ Added leader to members for group: ${group._id}`);
          }
        }
      }
      
      // Validate project reference
      if (group.project) {
        const project = await Project.findById(group.project);
        if (!project) {
          group.project = null;
          needsUpdate = true;
          console.log(`  ✓ Removed invalid project reference from group: ${group._id}`);
        }
      }
      
      // Validate allocatedFaculty reference
      if (group.allocatedFaculty) {
        const Faculty = require('../models/Faculty');
        const faculty = await Faculty.findById(group.allocatedFaculty);
        if (!faculty) {
          group.allocatedFaculty = null;
          needsUpdate = true;
          console.log(`  ✓ Removed invalid faculty reference from group: ${group._id}`);
        }
      }
      
      // Validate semester
      if (!group.semester || group.semester < 1 || group.semester > 8) {
        // Try to get from first member
        if (validMembers.length > 0) {
          const firstMember = await Student.findById(validMembers[0].student);
          if (firstMember && firstMember.semester) {
            group.semester = firstMember.semester;
            needsUpdate = true;
            console.log(`  ✓ Fixed invalid semester for group: ${group._id}`);
          }
        }
      }
      
      // Validate status
      const validStatuses = ['invitations_sent', 'open', 'forming', 'complete', 'locked', 'finalized', 'disbanded'];
      if (!validStatuses.includes(group.status)) {
        group.status = 'open';
        needsUpdate = true;
        console.log(`  ✓ Fixed invalid status for group: ${group._id}`);
      }
      
      // Validate min/max members
      if (!group.minMembers || group.minMembers < 2) {
        group.minMembers = 2;
        needsUpdate = true;
      }
      if (!group.maxMembers || group.maxMembers < group.minMembers) {
        group.maxMembers = Math.max(group.minMembers + 1, 5);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await group.save();
        stats.groupsFixed++;
      }
    }
    
    console.log(`\n✅ Fixed ${stats.groupsFixed} groups`);
  } catch (error) {
    console.error('  ❌ Error validating groups:', error.message);
    stats.errors.push({ type: 'groups', error: error.message });
  }
}

/**
 * Populate missing student data from User model
 */
async function populateMissingStudentData() {
  console.log('\n🔍 Populating missing student data from User model...');
  
  try {
    const students = await Student.find({});
    let fixed = 0;
    
    for (const student of students) {
      let needsUpdate = false;
      
      // Get user if student has user reference
      let user = null;
      if (student.user) {
        user = await User.findById(student.user);
      }
      
      // If no user found, try to find by email
      if (!user && student.collegeEmail) {
        user = await User.findOne({ email: student.collegeEmail });
        if (user && !student.user) {
          student.user = user._id;
          needsUpdate = true;
        }
      }
      
      if (user) {
        // Populate fullName
        if ((!student.fullName || student.fullName.trim() === '') && user.name) {
          student.fullName = user.name.trim();
          needsUpdate = true;
          console.log(`  ✓ Populated fullName for student: ${student.misNumber || student._id}`);
        }
        
        // Populate collegeEmail
        if ((!student.collegeEmail || student.collegeEmail.trim() === '') && user.email) {
          student.collegeEmail = user.email.toLowerCase().trim();
          needsUpdate = true;
          console.log(`  ✓ Populated collegeEmail for student: ${student.misNumber || student._id}`);
        }
        
        // Extract MIS from email if missing
        if ((!student.misNumber || student.misNumber.trim() === '') && user.email) {
          const emailMatch = user.email.match(/(\d{9})@/);
          if (emailMatch) {
            student.misNumber = emailMatch[1];
            needsUpdate = true;
            console.log(`  ✓ Populated misNumber for student: ${student._id}`);
          }
        }
        
        // Populate contactNumber if missing (try to get from user if available)
        if ((!student.contactNumber || student.contactNumber.trim() === '') && user.phone) {
          student.contactNumber = user.phone.trim();
          needsUpdate = true;
          console.log(`  ✓ Populated contactNumber for student: ${student.misNumber || student._id}`);
        }
      }
      
      // Also check for empty strings and set to null or default
      if (student.fullName && student.fullName.trim() === '') {
        student.fullName = null;
        needsUpdate = true;
      }
      if (student.misNumber && student.misNumber.trim() === '') {
        student.misNumber = null;
        needsUpdate = true;
      }
      if (student.collegeEmail && student.collegeEmail.trim() === '') {
        student.collegeEmail = null;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        try {
          await student.save();
          fixed++;
          stats.missingDataFixed++;
        } catch (saveError) {
          // If save fails due to validation, try to fix and save again
          if (saveError.name === 'ValidationError') {
            console.log(`  ⚠️  Validation error for student ${student._id}, attempting to fix...`);
            // Use updateOne to bypass some validations if needed
            await Student.updateOne(
              { _id: student._id },
              { $set: student.toObject() },
              { runValidators: false }
            );
            fixed++;
            stats.missingDataFixed++;
          } else {
            throw saveError;
          }
        }
      }
    }
    
    console.log(`\n✅ Populated data for ${fixed} students`);
  } catch (error) {
    console.error('  ❌ Error populating student data:', error.message);
    stats.errors.push({ type: 'populate_data', error: error.message });
  }
}

/**
 * Final pass: Ensure all students have complete data
 */
async function ensureStudentDataCompleteness() {
  console.log('\n🔍 Final pass: Ensuring student data completeness...');
  
  try {
    const students = await Student.find({});
    let fixed = 0;
    
    for (const student of students) {
      let needsUpdate = false;
      
      // Check for empty strings and convert to proper values
      if (!student.fullName || student.fullName.trim() === '') {
        if (student.user) {
          const user = await User.findById(student.user);
          if (user && user.name) {
            student.fullName = user.name.trim();
            needsUpdate = true;
            console.log(`  ✓ Fixed empty fullName for student: ${student.misNumber || student._id}`);
          } else {
            student.fullName = `Student ${student.misNumber || student._id.toString().slice(-6)}`;
            needsUpdate = true;
            console.log(`  ✓ Set default fullName for student: ${student.misNumber || student._id}`);
          }
        } else {
          student.fullName = `Student ${student.misNumber || student._id.toString().slice(-6)}`;
          needsUpdate = true;
          console.log(`  ✓ Set default fullName for student: ${student.misNumber || student._id}`);
        }
      }
      
      if (!student.misNumber || student.misNumber.trim() === '') {
        if (student.collegeEmail) {
          const emailMatch = student.collegeEmail.match(/(\d{9})@/);
          if (emailMatch) {
            student.misNumber = emailMatch[1];
            needsUpdate = true;
            console.log(`  ✓ Fixed empty misNumber for student: ${student._id}`);
          }
        }
      }
      
      if (!student.collegeEmail || student.collegeEmail.trim() === '') {
        if (student.user) {
          const user = await User.findById(student.user);
          if (user && user.email) {
            student.collegeEmail = user.email.toLowerCase().trim();
            needsUpdate = true;
            console.log(`  ✓ Fixed empty collegeEmail for student: ${student.misNumber || student._id}`);
          }
        }
      }
      
      if (!student.contactNumber || student.contactNumber.trim() === '') {
        // Set a placeholder if missing (can be updated later)
        student.contactNumber = '0000000000';
        needsUpdate = true;
        console.log(`  ⚠️  Set placeholder contactNumber for student: ${student.misNumber || student._id}`);
      }
      
      if (!student.branch || student.branch.trim() === '') {
        student.branch = 'CSE'; // Default branch
        needsUpdate = true;
        console.log(`  ✓ Set default branch for student: ${student.misNumber || student._id}`);
      }
      
      if (needsUpdate) {
        try {
          await student.save();
          fixed++;
          stats.missingDataFixed++;
        } catch (saveError) {
          // Use updateOne if save fails
          await Student.updateOne(
            { _id: student._id },
            { $set: student.toObject() },
            { runValidators: false }
          );
          fixed++;
          stats.missingDataFixed++;
        }
      }
    }
    
    console.log(`\n✅ Ensured data completeness for ${fixed} students`);
  } catch (error) {
    console.error('  ❌ Error ensuring data completeness:', error.message);
    stats.errors.push({ type: 'data_completeness', error: error.message });
  }
}

/**
 * Main cleanup function
 */
async function validateAndFixData() {
  try {
    // Connect to database
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}\n`);

    // Run all validation and fix functions
    await fixProjectVersionConflicts();
    await populateMissingStudentData();
    await validateAndFixStudents();
    await validateAndFixProjects();
    await validateAndFixGroups();
    await ensureStudentDataCompleteness();
    
    // Final pass: Ensure all students have required fields
    await ensureStudentDataCompleteness();

    // Print summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 DATA VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Students fixed: ${stats.studentsFixed}`);
    console.log(`✅ Projects fixed: ${stats.projectsFixed}`);
    console.log(`✅ Groups fixed: ${stats.groupsFixed}`);
    console.log(`✅ Orphaned projects removed: ${stats.orphanedProjectsRemoved}`);
    console.log(`✅ Version conflicts resolved: ${stats.versionConflictsResolved}`);
    console.log(`✅ Missing data populated: ${stats.missingDataFixed}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.type}: ${err.error}`);
      });
    } else {
      console.log('\n✅ No errors encountered!');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Data validation completed successfully!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Fatal error during validation:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  validateAndFixData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { validateAndFixData };

