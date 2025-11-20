const SystemConfig = require('../models/SystemConfig');
const Student = require('../models/Student');

// Helper to get current academic year in correct format (YYYY-YY)
async function getCurrentAcademicYear() {
  const year = await SystemConfig.getConfigValue('academic.currentYear');
  if (year && /^\d{4}-\d{2}$/.test(year)) {
    return year;
  }
  // Fallback: calculate from current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth(); // 0-11
  // Academic year starts in July (month 6)
  if (month >= 6) {
    return `${currentYear}-${(currentYear+1).toString().slice(-2)}`;
  } else {
    return `${(currentYear-1)}-${currentYear.toString().slice(-2)}`;
  }
}

// GET /student/sem8/status - Get Sem 8 status (student type and current state)
exports.getSem8Status = async (req, res) => {
  try {
    const userId = req.user.userId;
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (student.semester !== 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Sem 8 status is only available for semester 8 students' 
      });
    }

    const studentType = student.getSem8StudentType();
    const selection = student.getSemesterSelection(8);
    
    // Auto-initialize Type 1 students if not already initialized
    if (studentType === 'type1' && !selection) {
      const academicYear = await getCurrentAcademicYear();
      await student.initializeSem8ForType1(academicYear);
      // Refresh selection after initialization
      await student.populate('semesterSelections');
    }

    const updatedSelection = student.getSemesterSelection(8);
    
    // For Sem 8 Type 2 students, convert 'coursework' back to 'major2' for the frontend
    // (since we store it as 'coursework' but the UI uses 'major2')
    let responseSelection = updatedSelection;
    if (updatedSelection && studentType === 'type2') {
      responseSelection = { ...updatedSelection.toObject() };
      
      if (updatedSelection.chosenTrack === 'coursework' && !updatedSelection.finalizedTrack) {
        // Only convert if not finalized yet (admin might finalize as 'coursework' for other reasons)
        responseSelection.chosenTrack = 'major2';
      }
      if (updatedSelection.finalizedTrack === 'coursework') {
        // Check if this was originally 'major2' by checking if student has Major Project 2
        // For now, we'll assume if it's Type 2 and coursework, it's Major Project 2
        // This is a simplification - in practice, you might want to store this explicitly
        responseSelection.finalizedTrack = 'major2';
      }
    }
    
    return res.json({ 
      success: true, 
      data: {
        studentType,
        selection: responseSelection,
        isType1: studentType === 'type1',
        isType2: studentType === 'type2',
        requiresTrackSelection: studentType === 'type2' && !updatedSelection
      }
    });
  } catch (error) {
    console.error('getSem8Status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// POST /student/sem8/choice - Type 2 students choose track (internship or major2)
exports.setSem8Choice = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chosenTrack } = req.body;

    if (!['internship', 'major2'].includes(chosenTrack)) {
      return res.status(400).json({ success: false, message: 'Invalid chosenTrack. Must be "internship" or "major2"' });
    }

    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (student.semester !== 8) {
      return res.status(400).json({ success: false, message: 'Sem 8 choice allowed only for semester 8 students' });
    }

    const studentType = student.getSem8StudentType();
    if (studentType !== 'type2') {
      return res.status(400).json({ 
        success: false, 
        message: 'Track selection is only available for Type 2 students. Type 1 students are automatically enrolled in coursework.' 
      });
    }

    // Convert 'major2' to 'coursework' for storage (enum only allows 'internship' or 'coursework')
    const trackForStorage = chosenTrack === 'major2' ? 'coursework' : chosenTrack;
    
    const academicYear = await getCurrentAcademicYear();
    await student.setSemesterSelection(8, academicYear, trackForStorage);
    
    // Store the original choice in a custom field if needed, or we can infer it from finalizedTrack later
    // For now, we'll use a note in adminRemarks or handle it in the getSem8Choice function

    const selection = student.getSemesterSelection(8);
    return res.json({ success: true, data: selection });
  } catch (error) {
    console.error('setSem8Choice error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /student/sem8/choice
exports.getSem8Choice = async (req, res) => {
  try {
    const userId = req.user.userId;
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const selection = student.getSemesterSelection(8);
    if (!selection) {
      return res.json({ success: true, data: null });
    }

    // For Sem 8 Type 2 students, convert 'coursework' back to 'major2' for the frontend
    // (since we store it as 'coursework' but the UI uses 'major2')
    const studentType = student.getSem8StudentType();
    const responseData = { ...selection.toObject() };
    
    if (studentType === 'type2' && selection.chosenTrack === 'coursework' && !selection.finalizedTrack) {
      // Only convert if not finalized yet (admin might finalize as 'coursework' for other reasons)
      responseData.chosenTrack = 'major2';
    }
    if (studentType === 'type2' && selection.finalizedTrack === 'coursework') {
      // Check if this was originally 'major2' by checking if student has Major Project 2
      // For now, we'll assume if it's Type 2 and coursework, it's Major Project 2
      // This is a simplification - in practice, you might want to store this explicitly
      responseData.finalizedTrack = 'major2';
    }

    return res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('getSem8Choice error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /admin/sem8/track-choices - List all Sem 8 track choices
exports.listSem8TrackChoices = async (req, res) => {
  try {
    const { status, track, academicYear } = req.query;
    const academicYearFilter = academicYear || await getCurrentAcademicYear();

    // Find all Sem 8 students
    const query = { 
      semester: 8,
      'semesterSelections.semester': 8,
      'semesterSelections.academicYear': academicYearFilter
    };

    const students = await Student.find(query)
      .populate('user', 'email')
      .select('fullName misNumber contactNumber branch collegeEmail semesterSelections user')
      .lean();

    // Extract and format track choices with student type
    let trackChoices = students
      .map(student => {
        const selection = student.semesterSelections?.find(s => s.semester === 8 && s.academicYear === academicYearFilter);
        if (!selection) return null;

        // Determine student type
        const sem7Selection = student.semesterSelections?.find(s => s.semester === 7);
        let studentType = null;
        if (sem7Selection?.finalizedTrack === 'internship' && sem7Selection?.internshipOutcome === 'verified_pass') {
          studentType = 'type1';
        } else if (sem7Selection?.finalizedTrack === 'coursework') {
          studentType = 'type2';
        }

        return {
          _id: student._id,
          studentId: student._id,
          fullName: student.fullName,
          misNumber: student.misNumber,
          contactNumber: student.contactNumber,
          branch: student.branch,
          email: student.collegeEmail || student.user?.email,
          studentType,
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
    if (req.query.studentType) {
      trackChoices = trackChoices.filter(choice => choice.studentType === req.query.studentType);
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
    console.error('listSem8TrackChoices error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// PATCH /admin/sem8/finalize/:studentId
exports.finalizeSem8Track = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { finalizedTrack, verificationStatus, remarks } = req.body;

    if (!['internship', 'major2'].includes(finalizedTrack)) {
      return res.status(400).json({ success: false, message: 'Invalid finalizedTrack. Must be "internship" or "major2"' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (student.semester !== 8) {
      return res.status(400).json({ success: false, message: 'Sem 8 finalize allowed only for semester 8 students' });
    }

    const studentType = student.getSem8StudentType();
    
    // Type 1 students should always be finalized to 'major2' (coursework)
    if (studentType === 'type1' && finalizedTrack !== 'major2') {
      return res.status(400).json({ 
        success: false, 
        message: 'Type 1 students (completed 6-month internship in Sem 7) must be finalized to coursework (major2)' 
      });
    }

    const Project = require('../models/Project');
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const academicYear = await getCurrentAcademicYear();
      const selection = student.getSemesterSelection(8);
      
      if (!selection) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Student has not submitted a track choice yet' });
      }

      // Convert 'major2' to 'coursework' for storage (enum only allows 'internship' or 'coursework')
      const trackForStorage = finalizedTrack === 'major2' ? 'coursework' : finalizedTrack;
      
      // Store previous track to detect changes (convert back for comparison)
      const previousTrackRaw = selection.finalizedTrack || selection.chosenTrack;
      const previousTrack = previousTrackRaw === 'coursework' && studentType === 'type2' ? 'major2' : previousTrackRaw;

      // Check if track is being changed by admin
      const isTrackChanged = previousTrack && previousTrack !== finalizedTrack;

      // Update verification status if provided
      if (verificationStatus && ['pending', 'needs_info', 'approved', 'rejected'].includes(verificationStatus)) {
        selection.verificationStatus = verificationStatus;
      }

      // If track is being changed, mark it and store previous track
      if (isTrackChanged) {
        // Store previous track in the format it was stored (coursework, not major2)
        selection.previousTrack = previousTrackRaw === 'major2' ? 'coursework' : previousTrackRaw;
        selection.trackChangedByAdminAt = new Date();
      }

      // Finalize the track (use trackForStorage which is 'coursework' or 'internship')
      await student.finalizeSemesterTrack(8, trackForStorage, req.user.userId, remarks || '');

      // Refresh selection after finalization
      const sel = student.getSemesterSelection(8);
      if (!sel) {
        await session.abortTransaction();
        return res.status(500).json({ success: false, message: 'Failed to retrieve selection after finalization' });
      }

      // If track changed, cancel existing projects
      if (previousTrack && previousTrack !== finalizedTrack) {
        // Helper function to reset project progress
        const resetProjectProgress = async (projectId, session) => {
          const projectToCancel = await Project.findById(projectId)
            .populate('faculty', 'user fullName')
            .populate('student', 'fullName misNumber')
            .session(session);

          if (!projectToCancel) {
            throw new Error('Project not found');
          }

          // Notify faculty if project was allocated
          if (projectToCancel.faculty && projectToCancel.faculty.user) {
            const FacultyNotification = require('../models/FacultyNotification');
            const notification = new FacultyNotification({
              faculty: projectToCancel.faculty._id,
              type: 'project_cancelled',
              title: 'Project Cancelled Due to Track Change',
              message: `The project "${projectToCancel.title}" (${projectToCancel.projectType}) assigned to student ${projectToCancel.student?.fullName || 'Unknown'} (MIS: ${projectToCancel.student?.misNumber || 'N/A'}) has been cancelled due to a track change.`,
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
                faculty: null,
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

        // Cancel projects based on track change
        if (previousTrack === 'major2' && finalizedTrack === 'internship') {
          // Major Project 2 → Internship: Cancel Major Project 2 and Internship 2 projects
          const projectsToCancel = await Project.find({
              $or: [
                { student: student._id, semester: 8, projectType: 'major2' },
                { student: student._id, semester: 8, projectType: 'internship2' }
              ],
              status: { $ne: 'cancelled' }
          }).session(session);

          for (const project of projectsToCancel) {
            await resetProjectProgress(project._id, session);
          }

          // Also check group projects (Major Project 2 can be a group project for Type 1)
          const groupProjects = await Project.find({
            semester: 8,
            projectType: 'major2',
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
        } else if (previousTrack === 'internship' && finalizedTrack === 'major2') {
          // Internship → Major Project 2: Cancel any existing projects
          const projectsToCancel = await Project.find({
              $or: [
                { student: student._id, semester: 8, projectType: 'major2' },
                { student: student._id, semester: 8, projectType: 'internship2' }
              ],
              status: { $ne: 'cancelled' }
          }).session(session);

          for (const project of projectsToCancel) {
            await resetProjectProgress(project._id, session);
          }
        }
      }

      await student.save({ session });
      await session.commitTransaction();

      // Refresh selection for response
      await student.populate('semesterSelections');
      const updatedSelection = student.getSemesterSelection(8);
      
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
    console.error('finalizeSem8Track error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

