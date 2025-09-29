const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const baseDirs = ['uploads', 'uploads/projects'];
  
  // Ensure base directories
  baseDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Ensure temp directory
  if (!fs.existsSync('uploads/temp')) {
    fs.mkdirSync('uploads/temp', { recursive: true });
  }
};

// Initialize basic directories
ensureUploadDirs();

// Utility function to create directory structure for uploads
const createUploadPath = (batch, degree, semester, projectType, deliverableType = 'ppt') => {
  // Clean up values to ensure valid directory names
  const cleanBatch = batch?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'batch_unknown';
  const cleanDegree = degree?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'unknown_degree';
  const cleanProjectType = projectType?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'unknown_type';
  
  const folderPath = path.join(
    'uploads', 
    'projects', 
    cleanBatch, 
    cleanDegree, 
    `semester_${semester}`, 
    cleanProjectType,
    deliverableType === 'ppt' ? 'ppt' : deliverableType
  );
  
  // Ensure directory exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  return folderPath;
};

// Default multer storage for general uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/temp';
    
    // For project PPT uploads, we'll handle path in the controller
    if (file.fieldname === 'ppt') {
      uploadPath = 'uploads/projects/ppt'; // Default fallback
    } else if (file.fieldname === 'document') {
      uploadPath = 'uploads/projects/documents';
    } else if (file.fieldname === 'video') {
      uploadPath = 'uploads/projects/videos';
    } else if (file.fieldname === 'groupFile') {
      uploadPath = 'uploads/groups';
    } else if (file.fieldname === 'facultyFile') {
      uploadPath = 'uploads/faculty';
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + extension;
    cb(null, filename);
  }
});

// Custom storage for project uploads with proper directory structure
const createProjectUploadStorage = (projectData) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      const projectPath = createUploadPath(
        projectData.batch,
        projectData.degree,
        projectData.semester,
        projectData.projectType,
        file.fieldname
      );
      cb(null, projectPath);
    },
    filename: function (req, file, cb) {
      // Generate filename with original name + timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const basename = path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `${basename}_${uniqueSuffix}${extension}`;
      cb(null, filename);
    }
  });
};

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'video/mp4': ['.mp4'],
    'video/avi': ['.avi'],
    'video/quicktime': ['.mov'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'text/plain': ['.txt']
  };

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  if (allowedTypes[mimeType] && allowedTypes[mimeType].includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${mimeType} with extension ${fileExtension} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // Maximum 5 files per request
  }
});

// Middleware for single file upload
const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Middleware for multiple file upload
const uploadMultiple = (fieldName, maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

// Middleware for mixed file uploads
const uploadFields = (fields) => {
  return upload.fields(fields);
};

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files per request.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name for file upload.'
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

// Utility function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Utility function to get file info
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
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleUploadError,
  deleteFile,
  getFileInfo,
  createUploadPath,
  createProjectUploadStorage
};
