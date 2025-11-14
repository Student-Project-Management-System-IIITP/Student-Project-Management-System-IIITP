const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken, requireStudent, requireAdmin, requireRole } = require('../middleware/auth');
const { checkWindow } = require('../middleware/windowCheck');
const internshipController = require('../controllers/internshipController');

// Multer middleware to parse multipart/form-data for internship applications
// Using memoryStorage so we can save files to proper location after knowing the type
// Text fields (type, details) go to req.body, files go to req.files
// Note: Report file upload is no longer needed - only legacy compatibility for offerLetter and completionCertificate
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 2 // Max 2 files (offerLetter, completionCertificate - legacy only)
  }
}).fields([
  { name: 'offerLetter', maxCount: 1 },
  { name: 'completionCertificate', maxCount: 1 }
]);

// Error handler for multer uploads
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB per file.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
  }
  next(err);
};

// Student - Create application (with window checks based on type)
router.post('/applications', 
  authenticateToken, 
  requireStudent,
  uploadMiddleware,
  handleUploadError,
  internshipController.createApplicationWithWindowCheck
);
router.get('/applications/my', authenticateToken, requireStudent, internshipController.getMyApplications);
router.patch('/applications/:id', 
  authenticateToken, 
  requireStudent,
  // No file upload middleware needed - summer internships now use Google Drive links
  internshipController.updateApplication
);

// Admin (no window checks - admin can always review)
router.get('/applications', authenticateToken, requireAdmin, internshipController.listApplications);
router.patch('/applications/:id/review', authenticateToken, requireAdmin, internshipController.reviewApplication);

// File download (students can download their own, admin can download any)
router.get('/applications/:id/files/:fileType', 
  authenticateToken, 
  requireRole('student', 'admin'), 
  internshipController.downloadFile
);

module.exports = router;


