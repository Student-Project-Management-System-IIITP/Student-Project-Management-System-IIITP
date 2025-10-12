const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create chat uploads directory if it doesn't exist
const chatUploadDir = path.join(__dirname, '..', 'uploads', 'chat');

if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
  console.log('✅ Created chat uploads directory:', chatUploadDir);
}

// Configure storage for chat files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, chatUploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50); // Limit basename length
    const filename = `${basename}_${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter for chat attachments
const fileFilter = (req, file, cb) => {
  // Allowed file types for chat
  const allowedTypes = {
    // Documents
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    
    // Images
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],
    
    // Archives
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar'],
    'application/x-7z-compressed': ['.7z'],
    
    // Code files
    'text/javascript': ['.js'],
    'text/html': ['.html'],
    'text/css': ['.css'],
    'application/json': ['.json'],
    'text/x-python': ['.py'],
    'text/x-java': ['.java'],
    'text/x-c': ['.c', '.cpp', '.h'],
    
    // Videos (limited)
    'video/mp4': ['.mp4'],
    'video/quicktime': ['.mov'],
    'video/x-msvideo': ['.avi']
  };

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  // Check if file type is allowed
  if (allowedTypes[mimeType] && allowedTypes[mimeType].includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Uploaded: ${mimeType} (${fileExtension})`), false);
  }
};

// Configure multer for chat uploads
const chatUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 3 // Maximum 3 files per message
  }
});

// Middleware for single chat file upload
const uploadChatFile = chatUpload.single('file');

// Middleware for multiple chat files upload
const uploadChatFiles = chatUpload.array('files', 3);

// Error handling middleware for chat uploads
const handleChatUploadError = (error, req, res, next) => {
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
        message: 'Too many files. Maximum is 3 files per message.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name for file upload.'
      });
    }
  }
  
  if (error && error.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Utility function to delete chat file
const deleteChatFile = (filename) => {
  try {
    const filePath = path.join(chatUploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting chat file:', error);
    return false;
  }
};

// Utility function to get file icon based on extension
const getFileIcon = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const iconMap = {
    // Documents
    '.pdf': '📄',
    '.doc': '📝',
    '.docx': '📝',
    '.xls': '📊',
    '.xlsx': '📊',
    '.ppt': '📊',
    '.pptx': '📊',
    '.txt': '📄',
    '.csv': '📊',
    
    // Images
    '.jpg': '🖼️',
    '.jpeg': '🖼️',
    '.png': '🖼️',
    '.gif': '🖼️',
    '.webp': '🖼️',
    '.svg': '🖼️',
    
    // Archives
    '.zip': '🗜️',
    '.rar': '🗜️',
    '.7z': '🗜️',
    
    // Code
    '.js': '💻',
    '.html': '💻',
    '.css': '💻',
    '.json': '💻',
    '.py': '💻',
    '.java': '💻',
    '.c': '💻',
    '.cpp': '💻',
    '.h': '💻',
    
    // Video
    '.mp4': '🎥',
    '.mov': '🎥',
    '.avi': '🎥'
  };
  
  return iconMap[ext] || '📎';
};

// Utility function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

module.exports = {
  uploadChatFile,
  uploadChatFiles,
  handleChatUploadError,
  deleteChatFile,
  getFileIcon,
  formatFileSize,
  chatUploadDir
};
