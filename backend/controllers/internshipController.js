const InternshipApplication = require('../models/InternshipApplication');
const Student = require('../models/Student');
const SystemConfig = require('../models/SystemConfig');
const fs = require('fs');
const path = require('path');
const { isWindowOpen } = require('../middleware/windowCheck');
const { 
  createInternshipUploadPath,
  createInternshipUpload,
  handleInternshipUploadError,
  getFileInfo 
} = require('../middleware/internshipUpload');

// Student: create internship application (6-month or summer evidence) with window check and file upload
exports.createApplicationWithWindowCheck = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Extract type and details from parsed form data
    // type and details come as text fields in multipart form (multer puts them in req.body)
    const type = req.body.type;
    const detailsStr = req.body.details;
    
    if (!type || !['6month', 'summer'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing application type' });
    }

    // Get student info for upload path
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Determine which window to check based on application type
    let windowKey;
    if (type === '6month') {
      windowKey = 'sem7.sixMonthSubmissionWindow';
    } else if (type === 'summer') {
      windowKey = 'sem7.internship2.evidenceWindow';
    }
    
    // Check if window is open
    const windowStatus = await isWindowOpen(windowKey);
    if (!windowStatus.isOpen) {
      return res.status(403).json({
        success: false,
        message: windowStatus.reason || 'Submission window is currently closed',
        windowKey,
        windowStart: windowStatus.start,
        windowEnd: windowStatus.end
      });
    }
    
    // Get academic year
    const academicYear = await SystemConfig.getConfigValue('academic.currentYear') || student.academicYear;
    
    // Parse details if it's a string
    let parsedDetails = {};
    if (detailsStr) {
      try {
        parsedDetails = typeof detailsStr === 'string' ? JSON.parse(detailsStr) : detailsStr;
      } catch (e) {
        console.error('Error parsing details:', e);
        parsedDetails = {};
      }
    }
    
    // File uploads are now deprecated for summer internships (using Google Drive links)
    // Only process file uploads for legacy compatibility if needed
    const uploads = {};
    
    // Validate 6-month requirements: Offer Letter Link must be provided
    if (type === '6month') {
      const link = parsedDetails?.offerLetterLink || parsedDetails?.offer_letter_link;
      const urlRegex = /^https?:\/\//i;
      if (!link || !urlRegex.test(link)) {
        return res.status(400).json({
          success: false,
          message: 'Offer letter link is required for 6-month internship application (valid URL)'
        });
      }
      // Ensure offerLetterLink is in parsedDetails
      if (!parsedDetails.offerLetterLink && parsedDetails.offer_letter_link) {
        parsedDetails.offerLetterLink = parsedDetails.offer_letter_link;
      }
    }
    
    // Validate summer internship requirements: Completion Certificate Link must be provided
    if (type === 'summer') {
      const link = parsedDetails?.completionCertificateLink || parsedDetails?.completion_certificate_link;
      const urlRegex = /^https?:\/\//i;
      if (!link || !urlRegex.test(link)) {
        return res.status(400).json({
          success: false,
          message: 'Completion certificate link is required for summer internship evidence (valid URL)'
        });
      }
      // Ensure completionCertificateLink is in parsedDetails
      if (!parsedDetails.completionCertificateLink && parsedDetails.completion_certificate_link) {
        parsedDetails.completionCertificateLink = parsedDetails.completion_certificate_link;
      }
    }
    
    // Create application with file paths
    const application = await InternshipApplication.create({
      student: student._id,
      semester: student.semester,
      academicYear: academicYear,
      type,
      status: 'submitted',
      details: parsedDetails || {},
      uploads: uploads
    });
    
    return res.status(201).json({ 
      success: true, 
      data: application,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('createApplicationWithWindowCheck error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Student: create internship application (6-month or summer evidence)
exports.createApplication = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, details, uploads } = req.body;

    if (!['6month', 'summer'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid application type' });
    }

    const student = await Student.findOne({ user: userId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const academicYear = await SystemConfig.getConfigValue('academic.currentYear');

    const application = await InternshipApplication.create({
      student: student._id,
      semester: student.semester,
      academicYear: academicYear,
      type,
      status: 'pending',
      details: details || {},
      uploads: uploads || {}
    });

    return res.status(201).json({ success: true, data: application });
  } catch (error) {
    console.error('createApplication error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Student: list own applications
exports.getMyApplications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, semester } = req.query;

    const student = await Student.findOne({ user: userId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const query = { student: student._id };
    if (type) query.type = type;
    if (semester) query.semester = Number(semester);

    const apps = await InternshipApplication.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, data: apps });
  } catch (error) {
    console.error('getMyApplications error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Student: update own application when needs_info (with file upload support)
exports.updateApplication = async (req, res) => {
  try {
    const userId = req.user.userId;
  const { id } = req.params;

    const student = await Student.findOne({ user: userId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const app = await InternshipApplication.findOne({ _id: id, student: student._id });
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    if (!['submitted', 'needs_info'].includes(app.status)) {
      return res.status(400).json({ success: false, message: 'Application cannot be edited in current status' });
    }

    // Get academic year
    const academicYear = app.academicYear || await SystemConfig.getConfigValue('academic.currentYear');
    
    // Parse details from request body (no file uploads needed for summer internships anymore)
    let parsedDetails = req.body && req.body.details ? req.body.details : null;
    if (parsedDetails) {
      if (typeof parsedDetails === 'string') {
        try {
          parsedDetails = JSON.parse(parsedDetails);
        } catch (e) {
          parsedDetails = {};
        }
      }
      
      // Validate Google Drive links based on application type
      const urlRegex = /^https?:\/\//i;
      
      if (app.type === '6month') {
        // 6-month: Validate offer letter link
        if (parsedDetails.offerLetterLink && !urlRegex.test(parsedDetails.offerLetterLink)) {
          return res.status(400).json({
            success: false,
            message: 'Offer letter link must be a valid URL'
          });
        }
      } else if (app.type === 'summer') {
        // Summer: Validate completion certificate link (required)
        const link = parsedDetails.completionCertificateLink || parsedDetails.completion_certificate_link;
        if (!link || !urlRegex.test(link)) {
          return res.status(400).json({
            success: false,
            message: 'Completion certificate link is required for summer internship evidence (valid URL)'
          });
        }
        // Ensure completionCertificateLink is in parsedDetails
        if (!parsedDetails.completionCertificateLink && parsedDetails.completion_certificate_link) {
          parsedDetails.completionCertificateLink = parsedDetails.completion_certificate_link;
        }
        
      }
      
      // Update details with links
      if (app.type === '6month' && parsedDetails.offerLetterLink) {
        app.details.offerLetterLink = parsedDetails.offerLetterLink;
      }
      if (app.type === 'summer' && parsedDetails.completionCertificateLink) {
        app.details.completionCertificateLink = parsedDetails.completionCertificateLink;
      }
      
      // Update other details
      app.details = { ...app.details, ...parsedDetails };
    }
    
    // After student update, set back to 'submitted'
    app.status = 'submitted';
    await app.save();

    return res.json({ success: true, data: app, message: 'Application updated successfully' });
  } catch (error) {
    console.error('updateApplication error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Admin: list applications with filters
exports.listApplications = async (req, res) => {
  try {
    const { type, status, semester, academicYear } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (semester) query.semester = Number(semester);
    if (academicYear) query.academicYear = academicYear;

    let apps = await InternshipApplication.find(query)
      .populate('student', 'fullName misNumber branch semester collegeEmail contactNumber')
      .lean();
    
    // Sort by email (primary) or MIS number (fallback) - ascending order
    apps.sort((a, b) => {
      const emailA = (a.student?.collegeEmail || '').toLowerCase();
      const emailB = (b.student?.collegeEmail || '').toLowerCase();
      
      if (emailA && emailB) {
        return emailA.localeCompare(emailB);
      }
      
      // If email is missing, sort by MIS number
      const misA = a.student?.misNumber || '';
      const misB = b.student?.misNumber || '';
      
      if (misA && misB) {
        return misA.localeCompare(misB);
      }
      
      // If both missing, maintain original order
      return 0;
    });
    
    return res.json({ success: true, data: apps });
  } catch (error) {
    console.error('listApplications error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Admin: review application (can be reviewed any time in the semester)
exports.reviewApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    const allowedStatuses = ['submitted', 'needs_info', 'pending_verification', 'verified_pass', 'verified_fail', 'absent'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const app = await InternshipApplication.findById(id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    // Store previous status to detect changes
    const previousStatus = app.status;
    const isStatusChanged = previousStatus !== status;

    // Check if this is a summer internship and status is changing to approved
    // When summer internship is approved, Internship 1 project is no longer needed
    const isSummerInternship = app.type === 'summer';
    const isChangingToApproved = isStatusChanged && status === 'verified_pass';
    const wasNotApprovedBefore = previousStatus !== 'verified_pass';

    app.status = status;
    app.adminRemarks = adminRemarks || '';
    app.reviewedBy = req.user.userId;
    app.reviewedAt = new Date();
    if (['verified_pass', 'verified_fail', 'absent'].includes(status)) {
      app.verifiedAt = new Date();
      app.verifiedBy = req.user.userId;
      app.verificationRemarks = adminRemarks || app.verificationRemarks;
    }
    await app.save();

    // Handle 2-month (summer) internship track change: Cancel Internship 1 project if summer internship is approved
    // This happens when status changes to 'verified_pass' (approved)
    // If student had Internship 1 project, it should be cancelled since summer internship is now approved
    if (isSummerInternship && isChangingToApproved && wasNotApprovedBefore) {
      try {
        const Project = require('../models/Project');
        const mongoose = require('mongoose');
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Find Internship 1 project for this student
          const internship1Project = await Project.findOne({
            student: app.student,
            semester: 7,
            projectType: 'internship1',
            status: { $ne: 'cancelled' }
          }).session(session);

          if (internship1Project) {
            // Helper function to reset all Internship 1 project progress while preserving basic info
            await Project.findByIdAndUpdate(
              internship1Project._id,
              {
                $set: {
                  status: 'cancelled',
                  // Reset all progress-related fields
                  deliverables: [], // Clear all deliverables and file uploads
                  facultyPreferences: [], // Clear faculty preferences
                  currentFacultyIndex: 0, // Reset faculty allocation progress
                  allocationHistory: [], // Clear allocation history
                  faculty: null, // Remove faculty assignment
                  allocatedBy: 'faculty_choice', // Reset allocation method
                  grade: null, // Clear grade
                  feedback: null, // Clear feedback
                  evaluatedBy: null, // Clear evaluator
                  evaluatedAt: null, // Clear evaluation date
                  endDate: null, // Clear end date
                  submissionDeadline: null // Clear submission deadline
                  // Note: We preserve title, description, domain, startDate, createdAt for audit purposes
                  // Note: Chat messages are preserved (linked to cancelled project) for audit purposes
                }
              },
              { session }
            );
          }

          await session.commitTransaction();
        } catch (error) {
          await session.abortTransaction();
          console.error('Error cancelling Internship 1 project:', error);
          // Continue; application saved successfully, just log the error
        } finally {
          await session.endSession();
        }
      } catch (error) {
        console.error('Error in transaction for Internship 1 cancellation:', error);
        // Continue; application saved successfully
      }
    }

    // Apply student flags/outcome for Sem 7 based on policy
    try {
      const student = await Student.findById(app.student);
      if (student) {
        const selection = (student.semesterSelections || []).find(s => s.semester === 7);
        if (selection) {
          // Map application status to internshipOutcome
          if (['verified_pass', 'verified_fail', 'absent'].includes(status)) {
            selection.internshipOutcome = status;
          } else if (status === 'pending_verification') {
            selection.internshipOutcome = 'provisional';
          }

          // Enforce Sem 8 coursework policy
          if (selection.finalizedTrack === 'internship') {
            // Always require Sem 8 coursework when Internship in Sem 7
            student.flags = student.flags || {};
            student.flags.requireSem8Coursework = true;
            // Backlog Major Project 1 only if failed/absent
            student.flags.backlog = student.flags.backlog || {};
            student.flags.backlog.major1 = ['verified_fail', 'absent'].includes(status);
          } else if (selection.finalizedTrack === 'coursework') {
            // Admin switched in Sem 7 -> no forced Sem 8 coursework rule here, and no backlog
            student.flags = student.flags || {};
            student.flags.requireSem8Coursework = false;
            student.flags.backlog = student.flags.backlog || {};
            student.flags.backlog.major1 = false;
          }

          selection.updatedAt = new Date();
          await student.save();
        }
      }
    } catch (e) {
      console.error('Failed to apply Sem 7 internship outcome to student:', e);
      // Continue; app saved successfully
    }

    return res.json({ success: true, data: app });
  } catch (error) {
    console.error('reviewApplication error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Download/view uploaded file (for students and admin)
exports.downloadFile = async (req, res) => {
  try {
    const { id, fileType } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const app = await InternshipApplication.findById(id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Check access: student can only view their own files, admin can view all
    if (userRole === 'student') {
      const student = await Student.findOne({ user: userId });
      if (!student || student._id.toString() !== app.student.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Get file path based on file type
    let filePath;
    if (fileType === 'offerLetter' && app.uploads?.offerLetterFile) {
      filePath = app.uploads.offerLetterFile;
    } else if (fileType === 'completionCertificate' && app.uploads?.completionCertificateFile) {
      filePath = app.uploads.completionCertificateFile;
    } else if (fileType === 'report' && app.uploads?.reportFile) {
      filePath = app.uploads.reportFile;
    } else {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check if file exists
    const fs = require('fs');
    const path = require('path');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    // Send file
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('downloadFile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


