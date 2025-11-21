const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the storage directory for deliverables
const deliverableUploadDir = path.join(__dirname, '..', 'uploads', 'deliverables');

// Ensure the directory exists
if (!fs.existsSync(deliverableUploadDir)) {
  fs.mkdirSync(deliverableUploadDir, { recursive: true });
}

// Set up storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, deliverableUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${req.params.projectId}-${uniqueSuffix}${extension}`);
  }
});

// File filter to accept only specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|ppt|pptx/;
  const mimeType = file.mimetype;
  const extension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.test(extension) || 
      mimeType === 'application/pdf' || 
      mimeType === 'application/vnd.ms-powerpoint' || 
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and PPT/PPTX files are allowed.'), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB limit
  },
  fileFilter: fileFilter
});

const uploadDeliverableFile = upload.single('deliverable');

// Custom error handler for multer
const handleDeliverableUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 15MB.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = {
  uploadDeliverableFile,
  handleDeliverableUploadError,
  deliverableUploadDir
};
