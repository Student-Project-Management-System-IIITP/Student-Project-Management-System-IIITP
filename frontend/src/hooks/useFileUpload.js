import { useState, useCallback } from 'react';
import { fileUpload } from '../utils/fileUpload';

export const useFileUpload = (options = {}) => {
  const {
    maxSize = 50 * 1024 * 1024, // 50MB
    acceptedTypes = ['.ppt', '.pptx', '.pdf'],
    onSuccess,
    onError,
  } = options;

  const [uploadState, setUploadState] = useState({
    uploading: false,
    progress: 0,
    status: null, // 'selected', 'uploading', 'success', 'error'
    error: null,
    selectedFile: null,
  });

  // Validate file
  const validateFile = useCallback((file) => {
    return fileUpload.validateFile(file, acceptedTypes, maxSize);
  }, [acceptedTypes, maxSize]);

  // Select file
  const selectFile = useCallback((file) => {
    const validation = validateFile(file);
    
    if (!validation.isValid) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: validation.errors.join(', '),
      }));
      
      if (onError) {
        onError(new Error(validation.errors.join(', ')));
      }
      return false;
    }

    setUploadState(prev => ({
      ...prev,
      selectedFile: file,
      status: 'selected',
      error: null,
    }));

    return true;
  }, [validateFile, onError]);

  // Upload file
  const uploadFile = useCallback(async (file, uploadUrl) => {
    if (!file || !uploadUrl) return;

    setUploadState(prev => ({
      ...prev,
      uploading: true,
      progress: 0,
      status: 'uploading',
      error: null,
    }));

    try {
      const result = await fileUpload.uploadFile(
        file,
        uploadUrl,
        (progress) => {
          setUploadState(prev => ({
            ...prev,
            progress,
          }));
        },
        (error) => {
          setUploadState(prev => ({
            ...prev,
            status: 'error',
            error: error.message,
          }));
          
          if (onError) {
            onError(error);
          }
        }
      );

      setUploadState(prev => ({
        ...prev,
        status: 'success',
        uploading: false,
      }));

      if (onSuccess) {
        onSuccess(result, file);
      }

      return result;
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: error.message,
        uploading: false,
      }));

      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [onSuccess, onError]);

  // Upload selected file
  const uploadSelectedFile = useCallback(async (uploadUrl) => {
    if (!uploadState.selectedFile) {
      throw new Error('No file selected');
    }
    return uploadFile(uploadState.selectedFile, uploadUrl);
  }, [uploadState.selectedFile, uploadFile]);

  // Reset upload state
  const resetUpload = useCallback(() => {
    setUploadState({
      uploading: false,
      progress: 0,
      status: null,
      error: null,
      selectedFile: null,
    });
  }, []);

  // Remove selected file
  const removeSelectedFile = useCallback(() => {
    setUploadState(prev => ({
      ...prev,
      selectedFile: null,
      status: null,
      error: null,
    }));
  }, []);

  // Get file info
  const getFileInfo = useCallback(() => {
    if (!uploadState.selectedFile) return null;

    return {
      name: uploadState.selectedFile.name,
      size: uploadState.selectedFile.size,
      formattedSize: fileUpload.formatFileSize(uploadState.selectedFile.size),
      type: uploadState.selectedFile.type,
      icon: fileUpload.getFileIcon(uploadState.selectedFile),
    };
  }, [uploadState.selectedFile]);

  // Check if file is selected
  const hasFile = !!uploadState.selectedFile;

  // Check if upload is in progress
  const isUploading = uploadState.uploading;

  // Check if upload was successful
  const isSuccess = uploadState.status === 'success';

  // Check if there's an error
  const hasError = uploadState.status === 'error';

  return {
    // State
    ...uploadState,
    hasFile,
    isUploading,
    isSuccess,
    hasError,
    
    // Actions
    selectFile,
    uploadFile,
    uploadSelectedFile,
    resetUpload,
    removeSelectedFile,
    
    // Utilities
    validateFile,
    getFileInfo,
    
    // Constants
    maxSize,
    acceptedTypes,
    formattedMaxSize: fileUpload.formatFileSize(maxSize),
  };
};
