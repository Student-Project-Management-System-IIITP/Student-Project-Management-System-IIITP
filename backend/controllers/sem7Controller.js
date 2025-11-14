const SystemConfig = require('../models/SystemConfig');
const Student = require('../models/Student');

// Helper to get current academic year from config
async function getCurrentAcademicYear() {
  const year = await SystemConfig.getConfigValue('academic.currentYear');
  return year || `${new Date().getFullYear()}-${(new Date().getFullYear()+1).toString().slice(-2)}`;
}

// POST /student/sem7/choice
exports.setSem7Choice = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chosenTrack } = req.body;

    if (!['internship', 'coursework'].includes(chosenTrack)) {
      return res.status(400).json({ success: false, message: 'Invalid chosenTrack' });
    }

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (student.semester !== 7) {
      return res.status(400).json({ success: false, message: 'Sem 7 choice allowed only for semester 7 students' });
    }

    const academicYear = await getCurrentAcademicYear();
    await student.setSemesterSelection(7, academicYear, chosenTrack);

    const selection = student.getSemesterSelection(7);
    return res.json({ success: true, data: selection });
  } catch (error) {
    console.error('setSem7Choice error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /student/sem7/choice
exports.getSem7Choice = async (req, res) => {
  try {
    const userId = req.user.userId;
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const selection = student.getSemesterSelection(7) || null;
    return res.json({ success: true, data: selection });
  } catch (error) {
    console.error('getSem7Choice error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /admin/sem7/track-choices - List all Sem 7 track choices
exports.listSem7TrackChoices = async (req, res) => {
  try {
    const { status, track, academicYear } = req.query;
    const academicYearFilter = academicYear || await getCurrentAcademicYear();

    // Find all Sem 7 students
    const query = { 
      semester: 7,
      'semesterSelections.semester': 7,
      'semesterSelections.academicYear': academicYearFilter
    };

    const students = await Student.find(query)
      .populate('user', 'email')
      .select('fullName misNumber contactNumber branch collegeEmail semesterSelections user')
      .lean();

    // Extract and format track choices
    let trackChoices = students
      .map(student => {
        const selection = student.semesterSelections?.find(s => s.semester === 7 && s.academicYear === academicYearFilter);
        if (!selection) return null;

        return {
          _id: student._id,
          studentId: student._id,
          fullName: student.fullName,
          misNumber: student.misNumber,
          contactNumber: student.contactNumber,
          branch: student.branch,
          email: student.collegeEmail || student.user?.email,
          chosenTrack: selection.chosenTrack,
          finalizedTrack: selection.finalizedTrack,
          verificationStatus: selection.verificationStatus,
          adminRemarks: selection.adminRemarks,
          reviewedBy: selection.reviewedBy,
          reviewedAt: selection.reviewedAt,
          trackChangedByAdminAt: selection.trackChangedByAdminAt,
          previousTrack: selection.previousTrack,
          choiceSubmittedAt: selection.choiceSubmittedAt,
          updatedAt: selection.updatedAt
        };
      })
      .filter(choice => choice !== null);

    // Apply filters
    if (status) {
      trackChoices = trackChoices.filter(choice => choice.verificationStatus === status);
    }
    if (track) {
      trackChoices = trackChoices.filter(choice => choice.chosenTrack === track || choice.finalizedTrack === track);
    }

    // Sort by email (primary) or MIS number (fallback) - ascending order
    trackChoices.sort((a, b) => {
      const emailA = (a.email || '').toLowerCase();
      const emailB = (b.email || '').toLowerCase();
      
      if (emailA && emailB) {
        return emailA.localeCompare(emailB);
      }
      
      // If email is missing, sort by MIS number
      const misA = a.misNumber || '';
      const misB = b.misNumber || '';
      
      if (misA && misB) {
        return misA.localeCompare(misB);
      }
      
      // If both missing, maintain original order
      return 0;
    });

    return res.json({
      success: true,
      data: trackChoices,
      total: trackChoices.length
    });
  } catch (error) {
    console.error('listSem7TrackChoices error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// PATCH /admin/sem7/finalize/:studentId
exports.finalizeSem7Track = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { finalizedTrack, verificationStatus, remarks } = req.body;

    if (!['internship', 'coursework'].includes(finalizedTrack)) {
      return res.status(400).json({ success: false, message: 'Invalid finalizedTrack' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (student.semester !== 7) {
      return res.status(400).json({ success: false, message: 'Sem 7 finalize allowed only for semester 7 students' });
    }

    const Project = require('../models/Project');
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update both finalized track and verification status
      const academicYear = await getCurrentAcademicYear();
      const selection = student.getSemesterSelection(7);
      
      if (!selection) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Student has not submitted a track choice yet' });
      }

      // Store previous track to detect changes (use finalizedTrack if exists, else chosenTrack since tracks are auto-finalized)
      const previousTrack = selection.finalizedTrack || selection.chosenTrack;

      // Check if track is being changed by admin
      const isTrackChanged = previousTrack && previousTrack !== finalizedTrack;

      // Update verification status if provided
      if (verificationStatus && ['pending', 'needs_info', 'approved', 'rejected'].includes(verificationStatus)) {
        selection.verificationStatus = verificationStatus;
      }

      // If track is being changed, mark it and store previous track
      if (isTrackChanged) {
        selection.previousTrack = previousTrack;
        selection.trackChangedByAdminAt = new Date();
      }

      // Finalize the track
      await student.finalizeSemesterTrack(7, finalizedTrack, req.user.userId, remarks || '');

      // Refresh selection after finalization
      const sel = student.getSemesterSelection(7);
      if (!sel) {
        await session.abortTransaction();
        return res.status(500).json({ success: false, message: 'Failed to retrieve selection after finalization' });
      }

      // Initialize flags if needed
      student.flags = student.flags || {};
      student.flags.backlog = student.flags.backlog || {};

      // If track changed, reset everything to default
      if (previousTrack && previousTrack !== finalizedTrack) {
        // Reset internship outcome to provisional
        sel.internshipOutcome = 'provisional';

        // Helper function to reset all project progress while preserving basic info
        const resetProjectProgress = async (projectId, session) => {
          // Get project details before cancellation to notify faculty and preserve history
          const projectToCancel = await Project.findById(projectId)
            .populate('faculty', 'user fullName')
            .populate('student', 'fullName misNumber')
            .session(session);

          if (!projectToCancel) {
            throw new Error('Project not found');
          }

          // Notify faculty if project was allocated to a faculty member
          if (projectToCancel.faculty && projectToCancel.faculty.user) {
            const FacultyNotification = require('../models/FacultyNotification');
            const notification = new FacultyNotification({
              faculty: projectToCancel.faculty._id,
              type: 'project_cancelled',
              title: 'Project Cancelled Due to Track Change',
              message: `The project "${projectToCancel.title}" (${projectToCancel.projectType}) assigned to student ${projectToCancel.student?.fullName || 'Unknown'} (MIS: ${projectToCancel.student?.misNumber || 'N/A'}) has been cancelled due to a track change. The allocation history has been preserved for audit purposes.`,
              project: projectId,
              student: projectToCancel.student?._id
            });
            await notification.save({ session });
          }

          // Preserve allocationHistory for audit, but clear current allocation
          await Project.findByIdAndUpdate(
            projectId,
            {
              $set: {
                status: 'cancelled',
                // Reset all progress-related fields
                deliverables: [], // Clear all deliverables and file uploads
                facultyPreferences: [], // Clear faculty preferences
                currentFacultyIndex: 0, // Reset faculty allocation progress
                // Note: allocationHistory is preserved for audit purposes
                faculty: null, // Remove faculty assignment
                allocatedBy: 'faculty_choice', // Reset allocation method
                grade: null, // Clear grade
                feedback: null, // Clear feedback
                evaluatedBy: null, // Clear evaluator
                evaluatedAt: null, // Clear evaluation date
                endDate: null, // Clear end date
                submissionDeadline: null // Clear submission deadline
                // Note: We preserve title, description, domain, startDate, createdAt for audit purposes
                // Note: We preserve group association for reference
                // Note: We preserve companyDetails for internship projects for reference
              }
            },
            { session }
          );
        };

        // Cancel projects based on track change
        if (previousTrack === 'coursework' && finalizedTrack === 'internship') {
          // Coursework → Internship: Cancel Major Project 1 and Internship 1 projects
          const projectsToCancel = await Project.find({
              $or: [
                { student: student._id, semester: 7, projectType: 'major1' },
                { student: student._id, semester: 7, projectType: 'internship1' }
              ],
              status: { $ne: 'cancelled' }
          }).session(session);

          // Reset progress for each individual project
          for (const project of projectsToCancel) {
            await resetProjectProgress(project._id, session);
          }

          // Also check group projects (Major Project 1 can be a group project)
          // Find projects where student is a member of the group
          const groupProjects = await Project.find({
            semester: 7,
            projectType: 'major1',
            group: { $exists: true },
            status: { $ne: 'cancelled' }
          }).populate({
            path: 'group',
            select: 'members',
            populate: {
              path: 'members.student',
              select: '_id'
            }
          }).session(session);

          for (const project of groupProjects) {
            if (project.group && project.group.members) {
              const isMember = project.group.members.some(member => {
                if (!member.student) return false;
                const memberId = member.student._id ? member.student._id.toString() : member.student.toString();
                return memberId === student._id.toString();
              });
              if (isMember) {
                await resetProjectProgress(project._id, session);
              }
            }
          }
        }
        // Note: Internship → Coursework: Projects shouldn't exist, but if they do, cancel them
        else if (previousTrack === 'internship' && finalizedTrack === 'coursework') {
          // Cancel any existing projects (shouldn't happen, but just in case)
          const projectsToCancel = await Project.find({
              $or: [
                { student: student._id, semester: 7, projectType: 'major1' },
                { student: student._id, semester: 7, projectType: 'internship1' }
              ],
              status: { $ne: 'cancelled' }
          }).session(session);

          // Reset progress for each project
          for (const project of projectsToCancel) {
            await resetProjectProgress(project._id, session);
          }
        }
      }

      // Set flags based on finalized track (always reset to defaults)
      if (finalizedTrack === 'internship') {
        // Internship track: require Sem 8 coursework, backlog depends on future verification
        student.flags.requireSem8Coursework = true;
        student.flags.backlog.major1 = false; // Will be set based on verification outcome later
      } else {
        // Coursework track: no forced Sem 8 coursework, no backlog
        student.flags.requireSem8Coursework = false;
        student.flags.backlog.major1 = false;
      }

      // Ensure internshipOutcome exists and reset if track changed
      if (!sel.internshipOutcome || (previousTrack && previousTrack !== finalizedTrack)) {
        sel.internshipOutcome = 'provisional';
      }

      await student.save({ session });
      await session.commitTransaction();

      // Refresh selection for response
      await student.populate('semesterSelections');
      const updatedSelection = student.getSemesterSelection(7);
      
      return res.json({ 
        success: true, 
        data: updatedSelection,
        message: `Track ${previousTrack ? 'changed' : 'finalized'} successfully` 
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('finalizeSem7Track error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// GET /admin/sem7/internship1-track-choices - List all students with Internship 1 projects or summer internship applications
exports.listInternship1TrackChoices = async (req, res) => {
  try {
    const academicYear = await getCurrentAcademicYear();
    const Project = require('../models/Project');
    const InternshipApplication = require('../models/InternshipApplication');

    // Find all Sem 7 students with coursework track
    const students = await Student.find({
      semester: 7,
      'semesterSelections.semester': 7,
      'semesterSelections.academicYear': academicYear,
      'semesterSelections.finalizedTrack': 'coursework'
    })
      .populate('user', 'email')
      .select('fullName misNumber contactNumber branch collegeEmail semesterSelections user')
      .lean();

    // Get all Internship 1 projects for these students
    const studentIds = students.map(s => s._id);
    const internship1Projects = await Project.find({
      student: { $in: studentIds },
      semester: 7,
      projectType: 'internship1'
    })
      .populate('faculty', 'fullName department')
      .populate('student', 'fullName misNumber')
      .lean();

    // Get all summer internship applications for these students
    const summerApplications = await InternshipApplication.find({
      student: { $in: studentIds },
      semester: 7,
      type: 'summer'
    })
      .populate('student', 'fullName misNumber')
      .lean();

    // Create maps for quick lookup
    const projectMap = new Map();
    internship1Projects.forEach(project => {
      const studentId = project.student._id.toString();
      projectMap.set(studentId, project);
    });

    const applicationMap = new Map();
    summerApplications.forEach(app => {
      const studentId = app.student._id.toString();
      applicationMap.set(studentId, app);
    });

    // Build track choices list
    const trackChoices = students.map(student => {
      const studentId = student._id.toString();
      const selection = student.semesterSelections?.find(s => s.semester === 7 && s.academicYear === academicYear);
      const project = projectMap.get(studentId);
      const application = applicationMap.get(studentId);

      // Determine current track
      let currentTrack = 'none';
      if (project && project.status !== 'cancelled') {
        currentTrack = 'project'; // Internship 1 project with faculty
      } else if (application && ['verified_pass', 'approved'].includes(application.status)) {
        currentTrack = 'application'; // Summer internship application approved
      } else if (application && ['verified_fail', 'absent'].includes(application.status)) {
        // If application is rejected, check if it was a track change from application to project
        // If adminRemarks indicates track change to project, student is on project track
        if (application.adminRemarks && application.adminRemarks.includes('Switched to Internship-I under Institute Faculty')) {
          currentTrack = 'project_pending'; // Assigned to project track but project not registered yet
        } else {
          // This is a genuine rejection of an application (not a track change)
          // But since it's rejected, student should be on project track
          currentTrack = 'project_pending';
        }
      } else if (application && application.status === 'submitted' && application.adminRemarks === 'Assigned by admin') {
        // Fresh assignment by admin with 'submitted' status and 'Assigned by admin' remarks
        // This indicates assignment to "application" track (summer internship application)
        // Because: when assigning to "project" track, we create a marker with 'verified_fail' status
        // Only when assigning to "application" track do we create an app with 'submitted' status
        currentTrack = 'application_pending'; // Fresh assignment to summer internship application track
      } else if (application) {
        currentTrack = 'application_pending'; // Summer internship application pending
      }

      return {
        _id: student._id,
        studentId: student._id,
        fullName: student.fullName,
        misNumber: student.misNumber,
        contactNumber: student.contactNumber,
        branch: student.branch,
        email: student.collegeEmail || student.user?.email,
        currentTrack,
        project: project ? {
          id: project._id,
          title: project.title,
          status: project.status,
          faculty: project.faculty ? {
            id: project.faculty._id,
            name: project.faculty.fullName,
            department: project.faculty.department
          } : null,
          createdAt: project.createdAt
        } : null,
        application: application ? {
          id: application._id,
          status: application.status,
          companyName: application.details?.companyName,
          startDate: application.details?.startDate,
          endDate: application.details?.endDate,
          adminRemarks: application.adminRemarks,
          submittedAt: application.submittedAt,
          internship1TrackChangedByAdminAt: application.internship1TrackChangedByAdminAt,
          previousInternship1Track: application.previousInternship1Track
        } : null
      };
    });

    // Include all students (including those without track selection)
    // Sort by email address (primary) or MIS number (fallback)
    trackChoices.sort((a, b) => {
      const emailA = (a.email || '').toLowerCase();
      const emailB = (b.email || '').toLowerCase();
      
      if (emailA && emailB) {
        return emailA.localeCompare(emailB);
      }
      
      const misA = a.misNumber || '';
      const misB = b.misNumber || '';
      
      if (misA && misB) {
        return misA.localeCompare(misB);
      }
      
      return 0;
    });

    return res.json({
      success: true,
      data: trackChoices,
      total: trackChoices.length
    });
  } catch (error) {
    console.error('listInternship1TrackChoices error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// PATCH /admin/sem7/internship1-track/:studentId - Change Internship 1 track (project <-> application)
exports.changeInternship1Track = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { targetTrack, remarks } = req.body; // targetTrack: 'project' or 'application'

    if (!['project', 'application'].includes(targetTrack)) {
      return res.status(400).json({ success: false, message: 'Invalid targetTrack. Must be "project" or "application"' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (student.semester !== 7) {
      return res.status(400).json({ success: false, message: 'Internship 1 track change allowed only for semester 7 students' });
    }

    const selection = student.getSemesterSelection(7);
    if (!selection || selection.finalizedTrack !== 'coursework') {
      return res.status(400).json({ success: false, message: 'Student must be on coursework track' });
    }

    const Project = require('../models/Project');
    const InternshipApplication = require('../models/InternshipApplication');
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get current state
      const currentProject = await Project.findOne({
        student: student._id,
        semester: 7,
        projectType: 'internship1',
        status: { $ne: 'cancelled' }
      }).session(session);

      // Prevent track changes if project is completed (from previous semester)
      if (currentProject && currentProject.status === 'completed') {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot change track for completed projects. Completed projects are from previous semesters and cannot be modified.' 
        });
      }

      // Get the latest summer internship application (there might be multiple if track was changed multiple times)
      // Sort by creation date descending to get the most recent one
      const currentApplication = await InternshipApplication.findOne({
        student: student._id,
        semester: 7,
        type: 'summer'
      })
      .sort({ createdAt: -1 }) // Get the most recent application
      .session(session);

      // Helper function to reset project progress
      const resetProjectProgress = async (projectId, session) => {
        // Get project details before cancellation to notify faculty and preserve history
        const projectToCancel = await Project.findById(projectId)
          .populate('faculty', 'user fullName')
          .populate('student', 'fullName misNumber')
          .session(session);

        if (!projectToCancel) {
          throw new Error('Project not found');
        }

        // Notify faculty if project was allocated to a faculty member
        if (projectToCancel.faculty && projectToCancel.faculty.user) {
          const FacultyNotification = require('../models/FacultyNotification');
          const notification = new FacultyNotification({
            faculty: projectToCancel.faculty._id,
            type: 'project_cancelled',
            title: 'Internship 1 Project Cancelled',
            message: `The Internship 1 project "${projectToCancel.title}" assigned to student ${projectToCancel.student?.fullName || 'Unknown'} (MIS: ${projectToCancel.student?.misNumber || 'N/A'}) has been cancelled due to a track change. The allocation history has been preserved for audit purposes.`,
            project: projectId,
            student: projectToCancel.student?._id
          });
          await notification.save({ session });
        }

        // Preserve allocationHistory for audit, but clear current allocation
        await Project.findByIdAndUpdate(
          projectId,
          {
            $set: {
              status: 'cancelled',
              deliverables: [],
              facultyPreferences: [],
              currentFacultyIndex: 0,
              // Note: allocationHistory is preserved for audit purposes
              faculty: null, // Remove current faculty assignment
              allocatedBy: 'faculty_choice',
              grade: null,
              feedback: null,
              evaluatedBy: null,
              evaluatedAt: null,
              endDate: null,
              submissionDeadline: null
            }
          },
          { session }
        );
      };

      if (targetTrack === 'application') {
        // Switch to summer internship application
        // Cancel Internship 1 project if it exists
        if (currentProject) {
          await resetProjectProgress(currentProject._id, session);
        }

        // Determine default remarks based on current state
        let defaultRemarks;
        if (!currentProject && !currentApplication) {
          defaultRemarks = 'Assigned by admin';
        } else if (currentProject && currentProject.status !== 'cancelled') {
          defaultRemarks = 'Switched from Internship-I under Institute Faculty (Project cancelled)';
        } else {
          defaultRemarks = 'Switched from Internship-I under Institute Faculty';
        }

        // Track previous Internship 1 track
        const previousInternship1Track = currentProject ? 'project' : 'application';

        // If no application exists, create one with status 'submitted'
        // For fresh assignment to application track (student hasn't chosen track yet)
        if (!currentApplication) {
          const academicYear = await getCurrentAcademicYear();
          
          // Provide placeholder values for required fields - student will update these when submitting details
          const newApplication = new InternshipApplication({
            student: student._id,
            semester: 7,
            academicYear,
            type: 'summer',
            status: 'submitted',
            adminRemarks: remarks || defaultRemarks, // Will be 'Assigned by admin' for fresh assignment
            internship1TrackChangedByAdminAt: currentProject ? new Date() : new Date(), // Always set for admin assignment
            previousInternship1Track: currentProject ? 'project' : null, // null for fresh assignment
            // Mark that this is an assignment to application track (not project track)
            // We'll use the absence of project and the fact that this is in the 'application' targetTrack branch
            details: {
              companyName: 'To be provided by student',
              startDate: new Date(), // Placeholder date
              endDate: new Date() // Placeholder date
            }
          });
          await newApplication.save({ session });
        } else if (currentApplication.status !== 'verified_pass' && currentApplication.status !== 'approved') {
          // Don't reactivate rejected applications - create a new one instead
          if (['verified_fail', 'absent'].includes(currentApplication.status)) {
            const academicYear = await getCurrentAcademicYear();
            const newApplication = new InternshipApplication({
              student: student._id,
              semester: 7,
              academicYear,
              type: 'summer',
              status: 'submitted',
              adminRemarks: remarks || defaultRemarks,
              internship1TrackChangedByAdminAt: new Date(),
              previousInternship1Track: previousInternship1Track,
              details: {
                companyName: 'To be provided by student',
                startDate: new Date(),
                endDate: new Date()
              }
            });
            await newApplication.save({ session });
          } else {
            // Update existing application status if not already approved and not rejected
            currentApplication.status = 'submitted';
            currentApplication.adminRemarks = remarks || currentApplication.adminRemarks || defaultRemarks;
            currentApplication.internship1TrackChangedByAdminAt = currentProject ? new Date() : currentApplication.internship1TrackChangedByAdminAt || new Date();
            currentApplication.previousInternship1Track = currentProject ? 'project' : (currentApplication.previousInternship1Track || null);
            
            // Ensure required details fields exist (in case they were missing)
            if (!currentApplication.details) {
              currentApplication.details = {};
            }
            if (!currentApplication.details.companyName) {
              currentApplication.details.companyName = 'To be provided by student';
            }
            if (!currentApplication.details.startDate) {
              currentApplication.details.startDate = new Date();
            }
            if (!currentApplication.details.endDate) {
              currentApplication.details.endDate = new Date();
            }
            
            await currentApplication.save({ session });
          }
        }
      } else if (targetTrack === 'project') {
        // Switch to Internship 1 project
        // Track previous Internship 1 track
        const previousInternship1Track = currentProject ? 'project' : (currentApplication ? 'application' : null);
        
        // Determine default remarks based on current state
        let defaultRemarks;
        if (!currentProject && !currentApplication) {
          defaultRemarks = 'Assigned by admin';
        } else if (currentApplication && ['verified_pass', 'approved'].includes(currentApplication.status)) {
          defaultRemarks = 'Switched to Internship-I under Institute Faculty (Summer internship application rejected)';
        } else if (currentApplication && currentApplication.status === 'submitted') {
          defaultRemarks = 'Switched to Internship-I under Institute Faculty (Summer internship application rejected)';
        } else if (currentApplication && ['pending_verification', 'needs_info'].includes(currentApplication.status)) {
          defaultRemarks = 'Switched to Internship-I under Institute Faculty (Summer internship application rejected)';
        } else {
          defaultRemarks = 'Switched to Internship-I under Institute Faculty';
        }

        // Reject summer internship application if it exists
        // This includes applications with status: 'submitted', 'pending_verification', 'needs_info', 'verified_pass', 'approved'
        // We want to reject ALL non-rejected applications when switching to project track
        if (currentApplication && !['verified_fail', 'absent'].includes(currentApplication.status)) {
          // Update application to rejected status
          currentApplication.status = 'verified_fail';
          // Use provided remarks or default remarks (never use old adminRemarks that might indicate previous track)
          currentApplication.adminRemarks = remarks || defaultRemarks;
          currentApplication.verifiedAt = new Date();
          currentApplication.verifiedBy = req.user.userId;
          currentApplication.internship1TrackChangedByAdminAt = new Date();
          currentApplication.previousInternship1Track = previousInternship1Track || 'application';
          await currentApplication.save({ session });
        }
        // If application is already rejected, we still need to update it for track change tracking
        // This handles cases where the application was previously rejected but we're switching back to project track
        else if (currentApplication && ['verified_fail', 'absent'].includes(currentApplication.status)) {
          // Always update the application with the new track change information when switching to project track
          // This ensures proper tracking of track changes even if the application was already rejected
          currentApplication.adminRemarks = remarks || defaultRemarks;
          currentApplication.internship1TrackChangedByAdminAt = new Date();
          currentApplication.previousInternship1Track = previousInternship1Track || 'application';
          // Update verifiedAt/verifiedBy to reflect this is a new track change
          currentApplication.verifiedAt = new Date();
          currentApplication.verifiedBy = req.user.userId;
          await currentApplication.save({ session });
        }
        // If no application exists, create a marker application for project track assignment
        // For project track assignment, use 'verified_fail' status as a marker (student should register for project)
        // This is different from application track assignment which uses 'submitted' status
        else if (!currentApplication) {
          const academicYear = await getCurrentAcademicYear();
          // When assigning to project track with no application, create a marker with 'verified_fail' status
          // This distinguishes it from application track assignment (which uses 'submitted' status)
          const finalRemarks = remarks && remarks.trim() !== '' ? remarks : defaultRemarks;
          const markerApplication = new InternshipApplication({
            student: student._id,
            semester: 7,
            academicYear,
            type: 'summer',
            status: 'verified_fail', // Use 'verified_fail' as marker for project track assignment
            adminRemarks: finalRemarks, // Will be 'Assigned by admin' if no custom remarks provided
            verifiedAt: new Date(),
            verifiedBy: req.user.userId,
            internship1TrackChangedByAdminAt: new Date(),
            previousInternship1Track: null, // No previous track for new assignment
            // Provide placeholder values for required fields
            details: {
              companyName: 'N/A - Assigned to Internship 1 Project',
              startDate: new Date(),
              endDate: new Date()
            }
          });
          await markerApplication.save({ session });
        }
        // Note: Project should already exist or student needs to register it
        // We don't auto-create projects here, but we create a rejected application as a marker
        // When assigning to project track, student will need to register for the project themselves
      }

      await session.commitTransaction();

      // Determine if this was an assignment or a change
      const wasAssignment = !currentProject && (!currentApplication || currentApplication.status === 'verified_fail' || currentApplication.status === 'absent');
      const action = wasAssignment ? 'assigned' : 'changed';
      
      return res.json({
        success: true,
        message: `Track ${action} to ${targetTrack === 'project' ? 'Internship 1 Project' : 'Summer Internship Application'} successfully`
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('changeInternship1Track error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};
