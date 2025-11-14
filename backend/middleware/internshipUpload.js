const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure base internships directory exists
const ensureInternshipDirs = () => {
  const baseDir = path.join(__dirname, '..', 'uploads', 'internships');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
};

// Initialize directories
ensureInternshipDirs();

// Create internship uploads directory structure
const createInternshipUploadPath = (academicYear, semester, type) => {
  // Clean values
  const cleanAcademicYear = academicYear?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'unknown_year';
  const cleanType = type === '6month' ? '6month' : 'summer';
  
  const folderPath = path.join(
    'uploads',
    'internships',
    cleanAcademicYear,
    `semester_${semester}`,
    cleanType
  );
  
  // Ensure directory exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  return folderPath;
};

// Create multer storage for internship documents
const createInternshipStorage = (academicYear, semester, type) => {
  const uploadPath = createInternshipUploadPath(academicYear, semester, type);
  
  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      // Generate unique filename: originalname_timestamp-random.ext
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const basename = path.basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .substring(0, 50); // Limit basename length
      const filename = `${basename}_${uniqueSuffix}${extension}`;
      cb(null, filename);
    }
  });
};

// File filter for internship documents (PDF, DOC, DOCX, images)
const internshipFileFilter = (req, file, cb) => {
  const allowedTypes = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/jpg': ['.jpg']
  };

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  if (allowedTypes[mimeType] && allowedTypes[mimeType].includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${mimeType} with extension ${fileExtension} is not allowed. Only PDF, DOC, DOCX, JPG, PNG files are accepted.`), false);
  }
};

// Create upload middleware for internship documents
const createInternshipUpload = (academicYear, semester, type, fieldNames) => {
  // fieldNames can be: ['offerLetter', 'completionCertificate', 'report'] or single field
  const fields = Array.isArray(fieldNames) 
    ? fieldNames.map(name => ({ name, maxCount: 1 }))
    : [{ name: fieldNames, maxCount: 1 }];
  
  const storage = createInternshipStorage(academicYear, semester, type);
  
  return multer({
    storage: storage,
    fileFilter: internshipFileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit per file
      files: fields.length // Max number of files
    }
  }).fields(fields);
};

// Single file upload (for simpler cases)
const createInternshipSingleUpload = (academicYear, semester, type, fieldName = 'file') => {
  const storage = createInternshipStorage(academicYear, semester, type);
  
  return multer({
    storage: storage,
    fileFilter: internshipFileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  }).single(fieldName);
};

// Error handling for upload errors
const handleInternshipUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB per file.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field name.'
      });
    }
  }
  
  if (error.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Helper to get file info from multer file object
const getFileInfo = (file) => {
  if (!file) return null;
  
  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    fieldname: file.fieldname
  };
};

module.exports = {
  createInternshipUpload,
  createInternshipSingleUpload,
  createInternshipUploadPath,
  handleInternshipUploadError,
  getFileInfo
};

