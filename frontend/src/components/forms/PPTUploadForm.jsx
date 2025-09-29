import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSem4Project } from '../../hooks/useSem4Project';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useEvaluation } from '../../hooks/useEvaluation';
import { studentAPI } from '../../utils/api';
import FileUpload from '../common/FileUpload';
import StatusBadge from '../common/StatusBadge';
import toast from 'react-hot-toast';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PPTUploadForm = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { project, loading: projectLoading, getProjectStatus } = useSem4Project();
  const { evaluationSchedule, canUploadPPT } = useEvaluation();
  
  const {
    selectedFile,
    isUploading,
    isSuccess,
    hasError,
    error,
    selectFile,
    uploadFile,
    resetUpload,
    removeSelectedFile,
    getFileInfo,
    formattedMaxSize,
    acceptedTypes,
  } = useFileUpload({
    maxSize: 50 * 1024 * 1024, // 50MB
    acceptedTypes: ['.ppt', '.pptx', '.pdf'],
    onSuccess: (result, file) => {
      toast.success('PPT uploaded successfully!');
      navigate('/dashboard/student');
    },
    onError: (error) => {
      toast.error(error.message || 'Upload failed');
    },
  });

  const [projectStatus, setProjectStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Load project status on mount
  useEffect(() => {
    loadStatus();
  }, [projectId]);

  const handleUpload = async () => {
    if (!selectedFile || !projectId) return;
    
    try {
      await uploadFile(selectedFile, `${API_BASE_URL}/student/projects/${projectId}/submit-ppt`);
      // Reload project status after successful upload
      await loadStatus();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const loadStatus = async () => {
    if (!projectId) return;
    
    setStatusLoading(true);
    try {
      const status = await getProjectStatus(projectId);
      setProjectStatus(status);
    } catch (error) {
      toast.error('Failed to load project status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleRemovePPT = async () => {
    if (!projectId) return;
    
    try {
      await studentAPI.removePPT(projectId);
      toast.success('PPT removed successfully');
      await loadStatus();
      resetUpload();
    } catch (error) {
      toast.error('Failed to remove PPT');
    }
  };

  const canUpload = () => {
    // For Minor Project 1, treat both 'registered' and 'active' statuses as valid for upload
    // Skip evaluation schedule requirements for Minor Project 1
    const hasProjectStatus = project && (project.status === 'active' || project.status === 'registered');
    const isMinorProject1 = project && project.projectType === 'minor1';
    
    if (isMinorProject1) {
      return hasProjectStatus && !isUploading;
    } else {
      return hasProjectStatus && canUploadPPT() && !isUploading;
    }
  };

  const getUploadInstructions = () => {
    const instructions = [];
    
    if (evaluationSchedule && evaluationSchedule.instructions) {
      instructions.push(...evaluationSchedule.instructions);
    }
    
    instructions.push(
      'File format: PPT, PPTX, or PDF',
      `Maximum file size: ${formattedMaxSize}`,
      'Ensure your presentation is clear and well-structured',
      'Include all necessary slides and content'
    );
    
    return instructions;
  };

  if (projectLoading || statusLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading project details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/dashboard/student')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload PPT</h1>
        <p className="text-gray-600 mt-2">
          Upload your presentation for: <strong>{project.title}</strong>
        </p>
      </div>

      {/* Project Status Card */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Project Status</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">{project.title}</h3>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-sm text-gray-600 mb-4">{project.description}</p>
          <div className="text-xs text-gray-500">
            Registered: {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Evaluation Schedule */}
      {evaluationSchedule && (
        <div className="bg-green-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-green-900 mb-4">📅 Evaluation Schedule</h2>
          <div className="text-green-800 space-y-2">
            <p><strong>Date:</strong> {evaluationSchedule.presentationDates[0]?.date}</p>
            <p><strong>Time:</strong> {evaluationSchedule.presentationDates[0]?.time}</p>
            <p><strong>Venue:</strong> {evaluationSchedule.presentationDates[0]?.venue}</p>
            <div>
              <p className="font-medium">Evaluation Panel:</p>
              <ul className="ml-4 space-y-1">
                {evaluationSchedule.presentationDates[0]?.panelMembers.map((member, index) => (
                  <li key={index}>• {member.name} ({member.role})</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload Status */}
      {!canUpload() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Upload Not Available</h3>
              <div className="mt-2 text-sm text-yellow-700">
                {project.status !== 'active' && project.status !== 'registered' && (
                  <p>• Your project must be registered or active to upload PPT</p>
                )}
                {!canUploadPPT() && project && project.projectType !== 'minor1' && (
                  <p>• Evaluation schedule must be announced before uploading</p>
                )}
                {isUploading && (
                  <p>• Upload is already in progress</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Uploaded PPT */}
      {projectStatus && projectStatus.pptSubmitted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-green-900">📊 Current PPT</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                ✓ Uploaded {new Date(projectStatus.pptSubmittedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">📄</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {projectStatus.pptOriginalName || projectStatus.pptFileName || 'Presentation File'}
                </p>
                {projectStatus.pptFileSize && (
                  <p className="text-xs text-gray-500">
                    {(projectStatus.pptFileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
            </div>
            
            {projectStatus.pptSubmissionNotes && (
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border-l-2 border-gray-300">
                {projectStatus.pptSubmissionNotes}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRemovePPT}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
            >
              🗑️ Remove PPT
            </button>
            <span className="text-sm text-gray-600">Ready to upload a new file to replace the current PPT</span>
          </div>
        </div>
      )}

      {/* File Upload */}
      {canUpload() && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {projectStatus && projectStatus.pptSubmitted ? 'Replace Current PPT' : 'Upload Presentation'}
            </h2>
          </div>
          <div className="p-6">
            <FileUpload
              onFileSelect={selectFile}
              acceptedTypes={acceptedTypes}
              maxSize={50 * 1024 * 1024}
              maxFiles={1}
              disabled={isUploading}
              showPreview={false}
              title={projectStatus && projectStatus.pptSubmitted ? "Choose New PPT File" : "Upload Your PPT"}
              description="Drag and drop your presentation file here, or click to select"
            />

            {/* File Info */}
            {selectedFile && getFileInfo() && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Selected File</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getFileInfo().icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{getFileInfo().name}</p>
                      <p className="text-xs text-gray-500">{getFileInfo().formattedSize}</p>
                    </div>
                  </div>
                  <button
                    onClick={removeSelectedFile}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={isUploading}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {selectedFile && !isSuccess && (
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    'Upload PPT'
                  )}
                </button>
              </div>
            )}

            {/* Success Message */}
            {isSuccess && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Upload Successful!</h3>
                    <p className="mt-1 text-sm text-green-700">
                      Your presentation has been uploaded successfully. You can view it in your project details.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">📋 Upload Instructions</h2>
        <div className="text-blue-800 space-y-2 text-sm">
          {getUploadInstructions().map((instruction, index) => (
            <p key={index}>• {instruction}</p>
          ))}
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-8 flex justify-start">
        <button
          onClick={() => navigate('/dashboard/student')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default PPTUploadForm;
