/**
 * Cleanup Script: Fix Project and Group Statuses
 * 
 * This script fixes status inconsistencies in the database where:
 * - Students have been promoted to higher semesters but their old semester
 *   projects/groups are still marked as active
 * - Groups from old semesters still show as active when all members have been promoted
 * 
 * Usage:
 *   node backend/scripts/fixProjectGroupStatuses.js
 * 
 * Or with npm script (add to package.json):
 *   npm run fix:statuses
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Group = require('../models/Group');
const Project = require('../models/Project');
const { validateAndUpdateGroupStatus, checkAllMembersPromoted } = require('../utils/groupStatusValidator');

// Statistics tracking
const stats = {
  studentsProcessed: 0,
  projectsUpdated: 0,
  currentProjectsUpdated: 0,
  groupMembershipsUpdated: 0,
  groupIdsCleared: 0,
  groupsDisbanded: 0,
  groupsValidated: 0,
  errors: []
};

/**
 * Main cleanup function
 */
async function fixProjectGroupStatuses() {
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

    // Find all students in Sem 6, 7, or 8 (these should have completed old semester projects)
    console.log('🔍 Finding students in Sem 6, 7, or 8...');
    const promotedStudents = await Student.find({
      semester: { $gte: 6 }
    }).select('_id fullName misNumber semester currentProjects groupMemberships groupId');

    console.log(`📋 Found ${promotedStudents.length} students in Sem 6, 7, or 8\n`);

    if (promotedStudents.length === 0) {
      console.log('✅ No students found to process. Database is clean!');
      await mongoose.connection.close();
      return;
    }

    // Process each student
    for (const student of promotedStudents) {
      try {
        console.log(`\n👤 Processing: ${student.fullName} (${student.misNumber}) - Sem ${student.semester}`);
        
        stats.studentsProcessed++;

        // 1. Update old semester projects in Project collection
        // Find projects where student is directly assigned
        const directProjects = await Project.find({
          student: student._id,
          semester: { $lt: student.semester },
          status: { $nin: ['completed', 'cancelled'] }
        });

        // Find groups where student is a member, then find their projects
        const studentGroups = await Group.find({
          'members.student': student._id,
          semester: { $lt: student.semester }
        }).distinct('_id');

        const groupProjects = studentGroups.length > 0 ? await Project.find({
          group: { $in: studentGroups },
          semester: { $lt: student.semester },
          status: { $nin: ['completed', 'cancelled'] }
        }) : [];

        const oldSemesterProjects = [...directProjects, ...groupProjects];

        for (const project of oldSemesterProjects) {
          try {
            // Use findByIdAndUpdate to avoid version conflicts
            await Project.findByIdAndUpdate(
              project._id,
              {
                $set: {
                  status: 'completed',
                  updatedAt: new Date()
                }
              },
              { runValidators: false }
            );
            stats.projectsUpdated++;
            console.log(`  ✓ Updated project: ${project.title || project._id} (Sem ${project.semester})`);
          } catch (error) {
            if (error.message.includes('version')) {
              // Force update by removing version key
              await Project.updateOne(
                { _id: project._id },
                {
                  $set: {
                    status: 'completed',
                    updatedAt: new Date()
                  },
                  $unset: { __v: '' }
                },
                { runValidators: false }
              );
              stats.projectsUpdated++;
              console.log(`  ✓ Updated project (version conflict resolved): ${project.title || project._id} (Sem ${project.semester})`);
            } else {
              throw error;
            }
          }
        }

        // 2. Update currentProjects array - mark old semester projects as completed
        let currentProjectsUpdated = 0;
        for (const cp of student.currentProjects) {
          if (cp.semester < student.semester && cp.status !== 'completed') {
            cp.status = 'completed';
            currentProjectsUpdated++;
          }
        }
        if (currentProjectsUpdated > 0) {
          await student.save();
          stats.currentProjectsUpdated += currentProjectsUpdated;
          console.log(`  ✓ Updated ${currentProjectsUpdated} currentProjects entries`);
        }

        // 3. Update groupMemberships - mark old semester memberships as inactive
        let groupMembershipsUpdated = 0;
        for (const gm of student.groupMemberships) {
          if (gm.semester < student.semester && gm.isActive) {
            gm.isActive = false;
            groupMembershipsUpdated++;
          }
        }
        if (groupMembershipsUpdated > 0) {
          await student.save();
          stats.groupMembershipsUpdated += groupMembershipsUpdated;
          console.log(`  ✓ Updated ${groupMembershipsUpdated} groupMemberships entries`);
        }

        // 4. Clear groupId if it points to an old semester group
        if (student.groupId) {
          const currentGroup = await Group.findById(student.groupId);
          if (currentGroup && currentGroup.semester < student.semester) {
            student.groupId = null;
            await student.save();
            stats.groupIdsCleared++;
            console.log(`  ✓ Cleared old groupId reference`);
          }
        }

      } catch (studentError) {
        console.error(`  ❌ Error processing student ${student._id}:`, studentError.message);
        stats.errors.push({
          type: 'student',
          id: student._id,
          error: studentError.message
        });
      }
    }

    // 5. Process all groups - check if all members have been promoted
    console.log('\n\n🔍 Processing groups...');
    const allGroups = await Group.find({
      semester: { $lt: 8 } // Process groups from Sem 4-7
    });

    console.log(`📋 Found ${allGroups.length} groups to check\n`);

    for (const group of allGroups) {
      try {
        const activeMembers = group.members.filter(m => m.isActive);
        
        if (activeMembers.length === 0) {
          // No active members - mark as disbanded
          if (group.isActive || group.status !== 'disbanded') {
            group.isActive = false;
            group.status = 'disbanded';
            await group.save();
            stats.groupsDisbanded++;
            console.log(`  ✓ Disbanded group: ${group.name || group._id} (Sem ${group.semester}) - No active members`);
          }
          continue;
        }

        // Get student IDs from active members
        const activeMemberStudentIds = activeMembers.map(m => m.student);
        
        // Check if all active members have been promoted beyond this group's semester
        const memberStudents = await Student.find({
          _id: { $in: activeMemberStudentIds }
        }).select('semester');

        const allPromoted = memberStudents.every(student => {
          return student.semester > group.semester;
        });

        if (allPromoted && memberStudents.length === activeMembers.length) {
          // All members promoted - mark group as disbanded
          group.isActive = false;
          if (group.status !== 'disbanded') {
            group.status = 'disbanded';
          }
          await group.save();
          stats.groupsDisbanded++;
          console.log(`  ✓ Disbanded group: ${group.name || group._id} (Sem ${group.semester}) - All members promoted`);
        } else {
          // Some members still in old semester - validate and update status
          await validateAndUpdateGroupStatus(group._id);
          stats.groupsValidated++;
        }

      } catch (groupError) {
        console.error(`  ❌ Error processing group ${group._id}:`, groupError.message);
        stats.errors.push({
          type: 'group',
          id: group._id,
          error: groupError.message
        });
      }
    }

    // Print summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Students processed: ${stats.studentsProcessed}`);
    console.log(`✅ Projects updated: ${stats.projectsUpdated}`);
    console.log(`✅ CurrentProjects entries updated: ${stats.currentProjectsUpdated}`);
    console.log(`✅ GroupMemberships entries updated: ${stats.groupMembershipsUpdated}`);
    console.log(`✅ GroupId references cleared: ${stats.groupIdsCleared}`);
    console.log(`✅ Groups disbanded: ${stats.groupsDisbanded}`);
    console.log(`✅ Groups validated: ${stats.groupsValidated}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.type} ${err.id}: ${err.error}`);
      });
    } else {
      console.log('\n✅ No errors encountered!');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Cleanup completed successfully!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Fatal error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  fixProjectGroupStatuses()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixProjectGroupStatuses };

