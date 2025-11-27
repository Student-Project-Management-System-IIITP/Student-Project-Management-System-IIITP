/**
 * Fix Script: Fix Stuck M.Tech Projects
 * 
 * This script fixes M.Tech projects across all semesters (1-4) that are stuck in faculty allocation:
 * - Sem 1: minor1 projects
 * - Sem 2: minor2 projects (uses Sem 1 faculty, skipped)
 * - Sem 3: major1 projects
 * - Sem 4: major2 projects
 * 
 * Issues fixed:
 * - Projects that were passed but not properly presented to the next faculty
 * - Projects with mismatched currentFacultyIndex between Project and FacultyPreference
 * - Projects missing "presented" entries in allocationHistory for current faculty
 * 
 * Usage:
 *   node backend/scripts/fixMTechStuckProjects.js
 * 
 * Or with npm script:
 *   npm run fix:mtech-stuck
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Project = require('../models/Project');
const FacultyPreference = require('../models/FacultyPreference');
const Student = require('../models/Student');

// Statistics tracking
const stats = {
  projectsChecked: 0,
  projectsFixed: 0,
  projectsSkipped: 0,
  errors: []
};

/**
 * Sort preferences by priority (helper function from facultyController)
 */
function sortPreferences(preferences = []) {
  return [...preferences].sort((a, b) => (a.priority || 0) - (b.priority || 0));
}

/**
 * Check if a project is stuck and needs fixing
 */
async function isProjectStuck(project, facultyPreference) {
  // Check if student is M.Tech
  const student = await Student.findById(project.student);
  if (!student || student.degree !== 'M.Tech') {
    return { isStuck: false, reason: 'Student is not M.Tech' };
  }

  // M.Tech project types by semester:
  // Sem 1: minor1 (solo, needs faculty preferences)
  // Sem 2: minor2 (solo, continuation, no new faculty preferences - uses Sem 1 faculty)
  // Sem 3: major1 (coursework track, needs faculty preferences)
  // Sem 4: major2 (coursework track, needs faculty preferences)
  
  const validMTechProjects = [
    { semester: 1, projectType: 'minor1' },
    { semester: 2, projectType: 'minor2' },
    { semester: 3, projectType: 'major1' },
    { semester: 4, projectType: 'major2' }
  ];

  const isValidMTechProject = validMTechProjects.some(
    v => v.semester === project.semester && v.projectType === project.projectType
  );

  if (!isValidMTechProject) {
    return { isStuck: false, reason: `Not a valid M.Tech project (Sem ${project.semester}, ${project.projectType})` };
  }

  // Sem 2 minor2 doesn't need faculty allocation (uses Sem 1 faculty)
  if (project.semester === 2 && project.projectType === 'minor2') {
    return { isStuck: false, reason: 'Sem 2 minor2 uses Sem 1 faculty, no allocation needed' };
  }

  // Check if project already has faculty allocated
  if (project.faculty) {
    return { isStuck: false, reason: 'Project already has faculty allocated' };
  }

  // Check if project is cancelled
  if (project.status === 'cancelled') {
    return { isStuck: false, reason: 'Project is cancelled' };
  }

  // Check if project has faculty preferences
  if (!project.facultyPreferences || project.facultyPreferences.length === 0) {
    return { isStuck: false, reason: 'Project has no faculty preferences' };
  }

  const sortedPrefs = sortPreferences(project.facultyPreferences);
  const projectIndex = project.currentFacultyIndex || 0;
  const preferenceIndex = facultyPreference ? (facultyPreference.currentFacultyIndex || 0) : 0;

  // Check if indices are out of sync
  if (projectIndex !== preferenceIndex) {
    return { 
      isStuck: true, 
      reason: `Indices out of sync: Project=${projectIndex}, Preference=${preferenceIndex}`,
      projectIndex,
      preferenceIndex
    };
  }

  // Check if we've exhausted all preferences
  if (projectIndex >= sortedPrefs.length) {
    return { isStuck: false, reason: 'All preferences exhausted' };
  }

  // Get current faculty
  const currentPref = sortedPrefs[projectIndex];
  if (!currentPref || !currentPref.faculty) {
    return { isStuck: false, reason: 'No current faculty preference' };
  }

  // Check if project has been presented to current faculty
  const currentFacultyId = currentPref.faculty.toString();
  const hasBeenPresented = project.allocationHistory && project.allocationHistory.some(
    entry => entry.faculty && entry.faculty.toString() === currentFacultyId && entry.action === 'presented'
  );

  // Check if there's a "passed" entry from previous faculty (indicating it was passed but not presented to next)
  const hasPassedEntry = project.allocationHistory && project.allocationHistory.some(
    entry => entry.action === 'passed'
  );

  // Check if there's a "passed" entry but no corresponding "presented" entry for the next faculty
  // This happens when a faculty passes but the project wasn't presented to the next faculty
  let hasPassedWithoutPresentation = false;
  if (hasPassedEntry && projectIndex > 0) {
    // Check if there's a "presented" entry for the current faculty (at currentIndex)
    // If not, it means it was passed but never presented to current faculty
    hasPassedWithoutPresentation = !hasBeenPresented;
  }

  // Project is stuck if:
  // 1. It has a "passed" entry but hasn't been presented to current faculty, OR
  // 2. It has no "presented" entry for current faculty (at any index), OR
  // 3. Indices are out of sync (already checked above)
  if (hasPassedEntry && !hasBeenPresented) {
    return { 
      isStuck: true, 
      reason: 'Project was passed but not presented to current faculty',
      currentFacultyId,
      projectIndex
    };
  }

  // If project is at any index and hasn't been presented to current faculty, it's stuck
  if (!hasBeenPresented) {
    return { 
      isStuck: true, 
      reason: projectIndex === 0 
        ? 'Project at index 0 but never presented to first faculty'
        : 'Project at index > 0 but not presented to current faculty',
      currentFacultyId,
      projectIndex
    };
  }

  return { isStuck: false, reason: 'Project is not stuck' };
}

/**
 * Fix a stuck project
 */
async function fixStuckProject(project, facultyPreference, issue) {
  try {
    console.log(`\n🔧 Fixing project: ${project.title}`);
    console.log(`   Student: ${project.student}`);
    console.log(`   Issue: ${issue.reason}`);
    console.log(`   Current Index: ${issue.projectIndex || project.currentFacultyIndex || 0}`);

    const sortedPrefs = sortPreferences(project.facultyPreferences);
    const currentIndex = issue.projectIndex !== undefined ? issue.projectIndex : (project.currentFacultyIndex || 0);

    // Sync indices if they're out of sync
    if (issue.projectIndex !== undefined && issue.preferenceIndex !== undefined && 
        issue.projectIndex !== issue.preferenceIndex) {
      console.log(`   Syncing indices: Project=${issue.projectIndex}, Preference=${issue.preferenceIndex}`);
      
      // Use the Project's index as source of truth
      if (facultyPreference) {
        facultyPreference.currentFacultyIndex = issue.projectIndex;
        await facultyPreference.save();
        console.log(`   ✅ Synced FacultyPreference index to ${issue.projectIndex}`);
      }
    }

    // Check if we need to present to current faculty
    if (currentIndex < sortedPrefs.length) {
      const currentPref = sortedPrefs[currentIndex];
      const currentFacultyId = currentPref.faculty.toString();
      
      // Check if already presented
      const hasBeenPresented = project.allocationHistory && project.allocationHistory.some(
        entry => entry.faculty && entry.faculty.toString() === currentFacultyId && entry.action === 'presented'
      );

      if (!hasBeenPresented) {
        console.log(`   Presenting to faculty at index ${currentIndex}...`);
        
        // Use the project's method to present
        try {
          await project.presentToCurrentFaculty();
          console.log(`   ✅ Project presented to current faculty`);
        } catch (presentError) {
          // If presentToCurrentFaculty fails, manually add to allocation history
          console.log(`   ⚠️  presentToCurrentFaculty failed, manually adding to history`);
          if (!project.allocationHistory) {
            project.allocationHistory = [];
          }
          project.allocationHistory.push({
            faculty: currentPref.faculty,
            priority: currentPref.priority || (currentIndex + 1),
            action: 'presented',
            timestamp: new Date()
          });
          await project.save();
          console.log(`   ✅ Manually added "presented" entry to allocation history`);
        }
      } else {
        console.log(`   ℹ️  Project already presented to current faculty`);
      }
    }

    // Ensure FacultyPreference index is synced
    if (facultyPreference && facultyPreference.currentFacultyIndex !== currentIndex) {
      facultyPreference.currentFacultyIndex = currentIndex;
      await facultyPreference.save();
      console.log(`   ✅ Synced FacultyPreference index to ${currentIndex}`);
    }

    console.log(`   ✅ Project fixed successfully`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error fixing project: ${error.message}`);
    stats.errors.push({
      projectId: project._id,
      error: error.message
    });
    return false;
  }
}

/**
 * Main function
 */
async function fixMTechStuckProjects() {
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

    // First, do a diagnostic check for all M.Tech semesters
    console.log('🔍 Diagnostic: Checking all M.Tech projects across all semesters...');
    
    // M.Tech semesters and project types
    const mtechSemesters = [
      { semester: 1, projectType: 'minor1', name: 'Sem 1 Minor1' },
      { semester: 2, projectType: 'minor2', name: 'Sem 2 Minor2' },
      { semester: 3, projectType: 'major1', name: 'Sem 3 Major1' },
      { semester: 4, projectType: 'major2', name: 'Sem 4 Major2' }
    ];

    const allMTechProjects = [];
    const allMTechPreferences = [];

    for (const semInfo of mtechSemesters) {
      const projects = await Project.find({
        projectType: semInfo.projectType,
        semester: semInfo.semester
      })
        .populate('student', 'degree fullName misNumber');

      const mtechProjects = projects.filter(p => p.student && p.student.degree === 'M.Tech');
      allMTechProjects.push(...mtechProjects);

      console.log(`\n📊 ${semInfo.name}:`);
      console.log(`   Total M.Tech projects: ${mtechProjects.length}`);
      if (mtechProjects.length > 0) {
        console.log(`   - With faculty allocated: ${mtechProjects.filter(p => p.faculty).length}`);
        console.log(`   - Without faculty: ${mtechProjects.filter(p => !p.faculty).length}`);
        const statusCounts = {};
        mtechProjects.forEach(p => {
          statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
        });
        console.log(`   - Status breakdown:`);
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`     * ${status}: ${count}`);
        });
      }

      // Check FacultyPreference records
      const preferences = await FacultyPreference.find({
        semester: semInfo.semester
      })
        .populate('student', 'degree fullName misNumber')
        .populate('project', 'title projectType semester status faculty currentFacultyIndex facultyPreferences allocationHistory');

      const mtechPrefs = preferences.filter(fp => {
        if (!fp.student || fp.student.degree !== 'M.Tech') return false;
        if (!fp.project || fp.project.projectType !== semInfo.projectType || fp.project.semester !== semInfo.semester) return false;
        return true;
      });
      allMTechPreferences.push(...mtechPrefs);

      if (mtechPrefs.length > 0) {
        console.log(`   FacultyPreference records: ${mtechPrefs.length}`);
        console.log(`     - pending: ${mtechPrefs.filter(fp => fp.status === 'pending').length}`);
        console.log(`     - allocated: ${mtechPrefs.filter(fp => fp.status === 'allocated').length}`);
      }
    }

    console.log(`\n📊 Total M.Tech projects across all semesters: ${allMTechProjects.length}`);
    console.log(`📊 Total M.Tech FacultyPreference records: ${allMTechPreferences.length}`);

    // Find all unallocated M.Tech projects (all semesters)
    // Also include projects with status 'pending_admin_allocation' as they might be stuck
    console.log('\n🔍 Finding unallocated M.Tech projects to fix...');
    
    const projects = await Project.find({
      $or: [
        { projectType: 'minor1', semester: 1 },
        { projectType: 'minor2', semester: 2 },
        { projectType: 'major1', semester: 3 },
        { projectType: 'major2', semester: 4 }
      ],
      faculty: null, // Not yet allocated
      status: { $in: ['registered', 'pending_admin_allocation'] } // Include both statuses
    })
      .populate('student', 'degree fullName misNumber');

    console.log(`📋 Found ${projects.length} unallocated projects across all semesters\n`);

    // Filter to only M.Tech projects
    const mtechProjects = projects.filter(p => p.student && p.student.degree === 'M.Tech');
    console.log(`📋 Found ${mtechProjects.length} unallocated M.Tech projects\n`);
    
    // Also check all M.Tech FacultyPreference records with pending status
    // This catches projects that might be in a weird state
    console.log('🔍 Also checking all pending M.Tech FacultyPreference records...\n');
    const allPendingMTechPrefs = allMTechPreferences.filter(fp => fp.status === 'pending');
    console.log(`📋 Found ${allPendingMTechPrefs.length} pending M.Tech FacultyPreference records\n`);
    
    // Always check FacultyPreference records for stuck projects, even if we found direct projects
    // This ensures we catch all stuck cases
    if (allPendingMTechPrefs.length > 0) {
      console.log('🔍 Checking pending FacultyPreference records for stuck projects...\n');
      
      // Process FacultyPreference records
      for (const fp of allPendingMTechPrefs) {
        if (fp.project) {
          const projectDoc = await Project.findById(fp.project._id);
          if (projectDoc && !projectDoc.faculty) {
            // Check if we already processed this project
            const alreadyProcessed = mtechProjects.some(p => p._id.toString() === projectDoc._id.toString());
            if (!alreadyProcessed) {
              stats.projectsChecked++;
              const stuckCheck = await isProjectStuck(projectDoc, fp);
              if (stuckCheck.isStuck) {
                console.log(`\n⚠️  Found stuck project via FacultyPreference: ${projectDoc.title || 'Untitled'}`);
                console.log(`   Semester: ${projectDoc.semester}, Type: ${projectDoc.projectType}`);
                console.log(`   Student: ${projectDoc.student?.fullName || 'Unknown'} (${projectDoc.student?.misNumber || 'N/A'})`);
                const fixed = await fixStuckProject(projectDoc, fp, stuckCheck);
                if (fixed) {
                  stats.projectsFixed++;
                } else {
                  stats.projectsSkipped++;
                }
              }
            }
          }
        }
      }
    }

    // Process each project
    for (const projectDoc of mtechProjects) {
      stats.projectsChecked++;
      
      // Find corresponding FacultyPreference
      const facultyPreference = await FacultyPreference.findOne({
        project: projectDoc._id,
        semester: projectDoc.semester
      });

      // Check if project is stuck
      const stuckCheck = await isProjectStuck(projectDoc, facultyPreference);
      
      if (stuckCheck.isStuck) {
        console.log(`\n⚠️  Found stuck project: ${projectDoc.title || 'Untitled'}`);
        console.log(`   Student: ${projectDoc.student?.fullName || 'Unknown'} (${projectDoc.student?.misNumber || 'N/A'})`);
        console.log(`   Reason: ${stuckCheck.reason}`);
        
        const fixed = await fixStuckProject(projectDoc, facultyPreference, stuckCheck);
        if (fixed) {
          stats.projectsFixed++;
        } else {
          stats.projectsSkipped++;
        }
      } else {
        console.log(`✓ Project OK: ${projectDoc.title || 'Untitled'} - ${stuckCheck.reason}`);
        stats.projectsSkipped++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Projects checked: ${stats.projectsChecked}`);
    console.log(`Projects fixed: ${stats.projectsFixed}`);
    console.log(`Projects skipped: ${stats.projectsSkipped}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. Project ${err.projectId}: ${err.error}`);
      });
    }

    console.log('\n✅ Script completed successfully!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  fixMTechStuckProjects()
    .then(() => {
      console.log('\n✨ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixMTechStuckProjects };

