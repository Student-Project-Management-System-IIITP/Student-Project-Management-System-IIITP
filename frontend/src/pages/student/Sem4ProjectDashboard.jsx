import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import FileUpload from '../../components/common/FileUpload';
import { useFileUpload } from '../../hooks/useFileUpload';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Sem4ProjectDashboard = () => {
  const { user, roleData } = useAuth();
  const navigate = useNavigate();
  const { projectId } = useParams();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectStatus, setProjectStatus] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showReplaceUpload, setShowReplaceUpload] = useState(false);
  
  // File upload hook
  const {
    selectedFile,
    isUploading,
    isSuccess,
    selectFile,
    uploadFile,
    resetUpload,
    removeSelectedFile,
    getFileInfo,
  } = useFileUpload({
    maxSize: 50 * 1024 * 1024, // 50MB
    acceptedTypes: ['.ppt', '.pptx', '.pdf'],
    onSuccess: (result, file) => {
      toast.success('PPT uploaded successfully!');
      loadProjectStatus(projectId);
      resetUpload();
      setShowReplaceUpload(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Upload failed');
    },
  });

  // Load project data
  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      // Get specific project by ID
      const response = await studentAPI.getProject(projectId);
      
      if (response.success && response.data) {
        // Verify this is a Sem 4 project
        if (response.data.semester === 4) {
          setProject(response.data);
          
          // Load project status for PPT info
          await loadProjectStatus(projectId);
        } else {
          toast.error('This is not a Semester 4 project.');
          navigate('/dashboard/student');
        }
      } else {
        toast.error('Project not found.');
        navigate('/dashboard/student');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project data');
      navigate('/dashboard/student');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectStatus = async (projectId) => {
    try {
      const response = await studentAPI.getSem4Status(projectId);
      if (response.success) {
        setProjectStatus(response.data);
      }
    } catch (error) {
      console.error('Error loading project status:', error);
    }
  };

  const handlePPTUpload = async () => {
    if (!selectedFile || !projectId) return;
    
    try {
      await uploadFile(selectedFile, `${API_BASE_URL}/student/projects/${projectId}/submit-ppt`);
      // Success callback will handle reload
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleRemovePPT = async () => {
    if (!projectId) return;
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to remove this PPT? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
      setIsRemoving(true);
      await studentAPI.removePPT(projectId);
      toast.success('PPT removed successfully');
      await loadProjectStatus(projectId);
      resetUpload();
      setShowReplaceUpload(false);
    } catch (error) {
      toast.error('Failed to remove PPT');
    } finally {
      setIsRemoving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading project dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Project Found</h2>
            <p className="text-gray-600 mb-6">You haven't registered for Minor Project 1 yet.</p>
            <button
              onClick={() => navigate('/student/projects/register')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Register Project
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Minor Project 1 Dashboard</h1>
                <p className="text-gray-600 mt-1">Semester 4 - Individual Project</p>
              </div>
              <StatusBadge 
                status={project.status} 
                className="text-sm"
              />
            </div>
          </div>

          {/* Project Details Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Project Title</h3>
                  <p className="text-gray-900 font-medium">{project.title}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Project Type</h3>
                  <p className="text-gray-900">Minor Project 1</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Semester</h3>
                  <p className="text-gray-900">Semester 4</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Academic Year</h3>
                  <p className="text-gray-900">{project.academicYear}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Start Date</h3>
                  <p className="text-gray-900">
                    {new Date(project.startDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                  <StatusBadge status={project.status} />
                </div>
              </div>
            </div>
          </div>

          {/* PPT Upload Status Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Presentation Upload</h2>
            </div>
            <div className="px-6 py-4">
              {/* Current Uploaded PPT */}
              {projectStatus && projectStatus.pptSubmitted && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-green-900">📊 Current PPT</h3>
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
                      onClick={() => setShowReplaceUpload(true)}
                      disabled={isUploading || isRemoving}
                      className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      📝 Replace PPT
                    </button>
                    <button
                      onClick={handleRemovePPT}
                      disabled={isUploading || isRemoving}
                      className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRemoving ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Removing...
                        </span>
                      ) : (
                        '🗑️ Remove PPT'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Section - Show if no PPT uploaded OR user clicked Replace */}
              {(project.status === 'active' || project.status === 'registered') && 
               (!projectStatus?.pptSubmitted || showReplaceUpload) && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-md font-semibold text-gray-900 mb-1">
                        {projectStatus && projectStatus.pptSubmitted ? 'Replace Current PPT' : 'Upload Your Presentation'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Upload your presentation file (PPT, PPTX, or PDF - Max 50MB)
                      </p>
                    </div>
                    {projectStatus?.pptSubmitted && showReplaceUpload && (
                      <button
                        onClick={() => {
                          setShowReplaceUpload(false);
                          resetUpload();
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
                      >
                        ✕ Cancel
                      </button>
                    )}
                  </div>

                  <FileUpload
                    onFileSelect={selectFile}
                    acceptedTypes={['.ppt', '.pptx', '.pdf']}
                    maxSize={50 * 1024 * 1024}
                    maxFiles={1}
                    disabled={isUploading}
                    showPreview={false}
                    title={projectStatus && projectStatus.pptSubmitted ? "Choose New PPT File" : "Upload Your PPT"}
                    description="Drag and drop your presentation file here, or click to select"
                  />

                  {/* File Info */}
                  {selectedFile && getFileInfo() && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Selected File</h4>
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
                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        onClick={resetUpload}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        disabled={isUploading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePPTUpload}
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
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">Upload Successful!</h3>
                          <p className="mt-1 text-sm text-green-700">
                            Your presentation has been uploaded successfully.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Not Available */}
              {project.status !== 'active' && project.status !== 'registered' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Upload Not Available</h3>
                      <p className="mt-2 text-sm text-yellow-700">
                        Your project must be registered or active to upload PPT.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Sem4ProjectDashboard;

