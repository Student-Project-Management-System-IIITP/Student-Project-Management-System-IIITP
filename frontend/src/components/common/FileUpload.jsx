import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { fileUpload } from '../../utils/fileUpload';
import StatusBadge from './StatusBadge';

const FileUpload = ({
  onFileSelect,
  onUpload,
  onError,
  acceptedTypes = ['.ppt', '.pptx', '.pdf'],
  maxSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 1,
  disabled = false,
  className = '',
  uploadUrl = null,
  showPreview = false,
  title = 'Upload File',
  description = 'Drag and drop files here, or click to select files'
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const error = new Error(rejectedFiles[0].errors[0].message);
      setUploadStatus('error');
      if (onError) onError(error);
      return;
    }

    const file = acceptedFiles[0];
    setSelectedFile(file);
    setUploadStatus('selected');

    // Validate file
    const validation = fileUpload.validateFile(file, acceptedTypes, maxSize);
    if (!validation.isValid) {
      const error = new Error(validation.errors.join(', '));
      setUploadStatus('error');
      if (onError) onError(error);
      return;
    }

    // Get preview if it's an image
    if (showPreview && file.type.startsWith('image/')) {
      try {
        const preview = await fileUpload.getFilePreviewUrl(file);
        setPreviewUrl(preview);
      } catch (error) {
        console.warn('Could not generate preview:', error);
      }
    }

    if (onFileSelect) {
      onFileSelect(file);
    }

    // Auto-upload if URL is provided
    if (uploadUrl && onUpload) {
      await handleUpload(file, uploadUrl);
    }
  }, [acceptedTypes, maxSize, onFileSelect, onUpload, onError, uploadUrl, showPreview]);

  const handleUpload = async (file, url) => {
    if (!file || !url) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');

    try {
      const result = await fileUpload.uploadFile(
        file,
        url,
        (progress) => setUploadProgress(progress),
        (error) => {
          setUploadStatus('error');
          if (onError) onError(error);
        }
      );

      setUploadStatus('success');
      if (onUpload) onUpload(result, file);
    } catch (error) {
      setUploadStatus('error');
      if (onError) onError(error);
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[`application/${type.slice(1)}`] = [type];
      if (type === '.pdf') acc['application/pdf'] = ['.pdf'];
      return acc;
    }, {}),
    maxSize,
    maxFiles,
    disabled: disabled || isUploading,
  });

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadStatus(null);
    setUploadProgress(0);
  };

  const getStatusBadge = () => {
    if (!uploadStatus) return null;

    const statusMap = {
      'selected': { status: 'info', text: 'File Selected' },
      'uploading': { status: 'warning', text: 'Uploading...' },
      'success': { status: 'success', text: 'Upload Complete' },
      'error': { status: 'error', text: 'Upload Failed' },
    };

    const config = statusMap[uploadStatus];
    if (!config) return null;

    return <StatusBadge status={config.status} text={config.text} className="mt-2" />;
  };

  const getFileInfo = () => {
    if (!selectedFile) return null;

    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{fileUpload.getFileIcon(selectedFile)}</span>
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{fileUpload.formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="text-gray-400 hover:text-gray-600"
            disabled={isUploading}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {showPreview && previewUrl && (
          <div className="mt-3">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-32 object-cover rounded border"
            />
          </div>
        )}
        
        {isUploading && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-gray-600">
            {isDragActive ? 'Drop the file here...' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {acceptedTypes.join(', ').toUpperCase()} up to {fileUpload.formatFileSize(maxSize)}
          </p>
        </div>
      </div>

      {getFileInfo()}
      {getStatusBadge()}
    </div>
  );
};

export default FileUpload;
