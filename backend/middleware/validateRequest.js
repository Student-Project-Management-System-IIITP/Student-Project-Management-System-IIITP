const { validationResult } = require('express-validator');
const fs = require('fs');

const deleteUploadedFiles = (req) => {
  if (req.file && req.file.path) {
    fs.unlink(req.file.path, (err) => {
      if (err) console.error(`Error deleting file ${req.file.path}:`, err);
    });
  }
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (file.path) {
          fs.unlink(file.path, (err) => {
            if (err) console.error(`Error deleting file ${file.path}:`, err);
          });
        }
      });
    } else if (typeof req.files === 'object') {
      Object.keys(req.files).forEach(key => {
        const filesArray = req.files[key];
        if (Array.isArray(filesArray)) {
          filesArray.forEach(file => {
            if (file.path) {
              fs.unlink(file.path, (err) => {
                if (err) console.error(`Error deleting file ${file.path}:`, err);
              });
            }
          });
        }
      });
    }
  }
};

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Delete any uploaded files
    deleteUploadedFiles(req);

    const firstError = errors.array()[0];
    let message = firstError.msg;
    let errorCode;

    // Check if the message contains a JSON-encoded object with msg and errorCode
    try {
      const parsed = JSON.parse(firstError.msg);
      message = parsed.msg;
      errorCode = parsed.errorCode;
    } catch (e) {
      // JSON parsing failed, fallback to treating it as a raw string message
    }

    return res.status(400).json({
      success: false,
      message,
      ...(errorCode ? { errorCode } : {})
    });
  }
  next();
};

module.exports = { validateRequest, deleteUploadedFiles };
