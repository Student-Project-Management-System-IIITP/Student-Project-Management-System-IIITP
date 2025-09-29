// File upload utility for PPT and other documents

// File validation function
export const validateFile = (file, allowedTypes = ['.ppt', '.pptx', '.pdf'], maxSize = 50 * 1024 * 1024) => {
  const errors = [];
  
  // Check file type
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedTypes.includes(fileExtension)) {
    errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size too large. Maximum size: ${formatFileSize(maxSize)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Format file size for display
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// File upload with progress tracking
export const uploadFile = async (file, uploadUrl, onProgress, onError) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.isValid) {
      const error = new Error(validation.errors.join(', '));
      if (onError) onError(error);
      reject(error);
      return;
    }
    
    formData.append('ppt', file);
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    });
    
    // Handle upload completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          const error = new Error(errorResponse.message || 'Upload failed');
          if (onError) onError(error);
          reject(error);
        } catch (parseError) {
          const error = new Error(`Upload failed with status: ${xhr.status}`);
          if (onError) onError(error);
          reject(error);
        }
      }
    });
    
    // Handle upload errors
    xhr.addEventListener('error', () => {
      const error = new Error('Network error during upload');
      if (onError) onError(error);
      reject(error);
    });
    
    // Handle upload abortion
    xhr.addEventListener('abort', () => {
      const error = new Error('Upload was cancelled');
      if (onError) onError(error);
      reject(error);
    });
    
    // Start upload
    xhr.open('POST', uploadUrl);
    
    // Add authorization header if token exists
    const token = localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    
    xhr.send(formData);
  });
};

// Get file preview URL for images and PDFs
export const getFilePreviewUrl = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    // For images, read as data URL
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reject(new Error('File type not supported for preview'));
    }
  });
};

// File upload utility object
export const fileUpload = {
  validateFile,
  formatFileSize,
  uploadFile,
  getFilePreviewUrl,
  
  // Constants
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_PPT_TYPES: ['.ppt', '.pptx', '.pdf'],
  ALLOWED_IMAGE_TYPES: ['.jpg', '.jpeg', '.png', '.gif'],
  
  // Helper methods
  isPPTFile: (file) => {
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    return fileUpload.ALLOWED_PPT_TYPES.includes(extension);
  },
  
  isImageFile: (file) => {
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    return fileUpload.ALLOWED_IMAGE_TYPES.includes(extension);
  },
  
  // Get file icon based on type
  getFileIcon: (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    const iconMap = {
      'ppt': '📊',
      'pptx': '📊',
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
    };
    return iconMap[extension] || '📎';
  }
};

export default fileUpload;
