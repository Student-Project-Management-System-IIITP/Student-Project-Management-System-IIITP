const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const studentController = require('../controllers/studentController');
const { authenticateToken } = require('../middleware/auth');
const { uploadSingle, handleUploadError, createProjectUploadStorage, createUploadPath } = require('../middleware/upload');
const Project = require('../models/Project');
const Student = require('../models/Student');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Custom upload middleware for projects with proper directory structure
const uploadPPTForProject = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({ 
      _id: projectId, 
      student: student._id,
      projectType: 'minor1',
      semester: 4
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Sem 4 Minor Project 1 not found'
      });
    }

    // Create the upload path based on project info  
    const batch = student.academicYear || project.academicYear || `batch_${new Date().getFullYear()}_${new Date().getFullYear() + 4}`;
    const degree = student.degree || 'B-Tech';
    const semester = project.semester || 4;
    const projectType = project.projectType || 'minor1';
    
    const uploadPath = createUploadPath(batch, degree, semester, projectType, 'ppt');
    
    // Create a dynamic storage based on project info
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadPath);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const basename = path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9-_]/g, '_');
        const filename = `${basename}_${uniqueSuffix}${extension}`;
        cb(null, filename);
      }
    });
    
    // Create upload middleware with project-specific storage
    const upload = multer({ 
      storage: storage,
      fileFilter: (req, file, cb) => {
        const allowedTypes = {
          'application/vnd.ms-powerpoint': ['.ppt'],
          'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
          'application/pdf': ['.pdf']
        };
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const mimeType = file.mimetype;
        
        if (allowedTypes[mimeType] && allowedTypes[mimeType].includes(fileExtension)) {
          cb(null, true);
        } else {
          cb(new Error(`File type ${mimeType} with extension ${fileExtension} is not allowed, only PPT, PPTX, PDF files accepted`), false);
        }
      },
      limits: { fileSize: 50 * 1024 * 1024 }
    });

    // Save project and student data for later use
    req.project = project;
    req.student = student;
    
    return upload.single('ppt')(req, res, next);
  } catch (error) {
    console.error('Error setting up upload path:', error);
    return res.status(500).json({
      success: false,
      message: 'Error configuring file upload',
      error: error.message
    });
  }
};

// Dashboard routes
router.get('/dashboard', studentController.getDashboardData);
router.get('/semester-features', studentController.getSemesterFeatures);

// Project routes
router.get('/projects', studentController.getStudentProjects);
router.post('/projects', studentController.registerProject);
router.get('/projects/:id', studentController.getProjectById); // Get specific project
router.put('/projects/:id', studentController.updateProject);
router.post('/projects/:id/submit', studentController.submitDeliverables);

// Minor Project 2 specific registration
router.post('/projects/minor2/register', studentController.registerMinorProject2);
// Major Project 1 specific registration (Sem 7)
router.post('/projects/major1/register', studentController.registerMajorProject1);
// Internship 1 specific registration (Sem 7 - solo project)
router.get('/projects/internship1/status', studentController.checkInternship1Status);
router.post('/projects/internship1/register', studentController.registerInternship1);
// Major Project 2 specific registration (Sem 8)
router.post('/projects/major2/register', studentController.registerMajorProject2);
// Internship 2 specific registration (Sem 8 - solo project)
router.get('/projects/internship2/status', studentController.checkInternship2Status);
router.post('/projects/internship2/register', studentController.registerInternship2);
router.get('/projects/:projectId/allocation-status', studentController.getFacultyAllocationStatus);
router.get('/group-status', studentController.getStudentGroupStatus);

// Group routes
router.get('/groups', studentController.getStudentGroups);
// Enhanced Group formation endpoints for Sem 5 - Specific routes FIRST
router.get('/groups/available-students', studentController.getAvailableStudents);
router.get('/groups/invitations', studentController.getGroupInvitations);
router.post('/groups/:id/invite', studentController.inviteToGroup);
router.post('/groups/:groupId/invite/:inviteId/accept', studentController.acceptInvitation);
router.post('/groups/:groupId/invite/:inviteId/reject', studentController.rejectInvitation);
// Sem 5 Advanced Features: Leadership transfer  
router.post('/groups/:groupId/transfer-leadership', studentController.transferLeadership);
// Sem 5 Advanced Features: Finalize group
router.post('/groups/:groupId/finalize', studentController.finalizeGroup);
// Sem 5 Advanced Features: Force disband group (admin function)
router.post('/groups/:groupId/disband', studentController.disbandGroupAdmin);
// Test endpoint for student lookup
router.get('/test/student/:studentId', studentController.testStudentLookup);

// Generic route LAST to catch remaining paths - MUST BE LAST
router.get('/groups/:id', studentController.getGroupById);

// Internship routes
router.get('/internships', studentController.getStudentInternships);
router.post('/internships', studentController.addInternship);

// Sem 4 specific routes
router.post('/projects/:id/submit-ppt', uploadPPTForProject, handleUploadError, studentController.submitPPT);
router.delete('/projects/:id/remove-ppt', studentController.removePPT);
router.post('/projects/:id/schedule-presentation', studentController.schedulePresentation);
router.get('/projects/:id/sem4-status', studentController.getSem4ProjectStatus);

// Upload tracking routes
router.get('/uploads', studentController.getStudentUploads);
router.get('/projects/:id/uploads', studentController.getProjectUploads);
router.get('/projects/:id/uploads/type', studentController.getProjectUploadsByType);

// Sem 5 specific routes - Group Management
// Note: Group creation for Sem 7 will check window in controller
router.post('/groups', studentController.createGroup);
router.post('/groups/:groupId/send-invitations', studentController.sendGroupInvitations);
router.get('/groups/available', studentController.getAvailableGroups);
// Note: joinGroup removed - use invitation/accept pattern instead
router.post('/groups/:groupId/leave', studentController.leaveGroupEnhanced);
router.post('/groups/:groupId/faculty-preferences', studentController.submitFacultyPreferences);
router.get('/faculty', studentController.getFacultyList);

// Sem 6 specific routes - Project Continuation & Advanced Features
router.get('/projects/continuation', studentController.getContinuationProjects);
router.post('/projects/continuation', studentController.createContinuationProject);
// Sem 6 registration routes
router.get('/sem6/pre-registration', studentController.getSem5GroupForSem6);
router.post('/sem6/register', studentController.registerSem6Project);
router.get('/projects/:id/milestones', studentController.getProjectMilestones);
router.put('/projects/:id/milestones/:milestoneId', studentController.updateMilestone);
router.get('/projects/:id/progress', studentController.getProjectProgress);

// Sem 7 specific routes - Major Project 1 & Internship Integration
router.get('/sem7/options', studentController.getSem7Options);
router.post('/internships/apply', studentController.applyForInternship);
router.get('/projects/:id/analytics', studentController.getMajorProjectAnalytics);
router.get('/internships/progress', studentController.getInternshipProgress);

// Sem 8 specific routes - Final Project & Graduation
router.get('/graduation/status', studentController.getGraduationStatus);
router.get('/portfolio', studentController.getFinalProjectPortfolio);
router.get('/projects/:id/comprehensive', studentController.getComprehensiveProjectSummary);
router.get('/academic-journey', studentController.getAcademicJourney);

// Sem 5 specific routes
router.get('/dashboard/sem5', studentController.getSem5Dashboard);

// M.Tech specific routes - M.Tech Workflow
router.get('/mtech/semester-options', studentController.getMTechSemesterOptions);
router.get('/mtech/project-continuation', studentController.getProjectContinuationOptions);
router.post('/mtech/internship/apply', studentController.applyForMTechInternship);
router.get('/mtech/coursework/eligibility', studentController.checkMTechCourseworkEligibility);
router.get('/mtech/academic-path', studentController.getMTechAcademicPath);

// System config routes (public for students)
router.get('/system-config/:key', studentController.getSystemConfigForStudents);
// Student profile routes
router.get('/profile', studentController.getStudentProfile);
router.put('/profile', studentController.updateStudentProfile);

module.exports = router;