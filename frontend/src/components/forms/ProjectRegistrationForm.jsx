import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSem4Project } from '../../hooks/useSem4Project';
import toast from 'react-hot-toast';
import StatusBadge from '../common/StatusBadge';

const ProjectRegistrationForm = () => {
  const navigate = useNavigate();
  const { user, roleData, refreshUserData } = useAuth();
  const { registerProject, loading, error } = useSem4Project();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      title: '',
      projectType: 'minor1',
      semester: 4,
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    },
  });

  // Auto-fill academic year
  React.useEffect(() => {
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    setValue('academicYear', academicYear);
  }, [setValue]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await registerProject(data);
      toast.success('Project registered successfully!');
      
      // Refresh user data to update navbar and other components
      await refreshUserData();
      
      // Navigate to dashboard
      navigate('/dashboard/student');
    } catch (error) {
      toast.error(error.message || 'Failed to register project');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Register Minor Project 1</h1>
        <p className="text-gray-600 mt-2">
          Register your individual project for B.Tech 4th semester
        </p>
      </div>

      {/* Project Information Card */}
      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">About Minor Project 1</h2>
        <div className="text-blue-800 space-y-2 text-sm">
          <p>• <strong>Individual Project:</strong> Work independently on your project</p>
          <p>• <strong>Duration:</strong> 3-4 months (entire semester)</p>
          <p>• <strong>Focus:</strong> Basic programming concepts and problem-solving</p>
          <p>• <strong>Deliverables:</strong> Working application + PPT presentation</p>
          <p>• <strong>Evaluation:</strong> 100% internal assessment by faculty panel</p>
        </div>
      </div>

      {/* Registration Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Display: Student Information (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {user?.email || 'Not available'}
                </div>
              </div>

              {/* Name of the Student */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name of the Student
                </label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {roleData?.fullName || user?.name || 'Not available'}
                </div>
              </div>

              {/* MIS Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MIS Number
                </label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {roleData?.misNumber || 'Not available'}
                </div>
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact No
                </label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {roleData?.contactNumber || 'Not available'}
                </div>
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {roleData?.branch || 'Not available'}
                </div>
              </div>

              {/* Timestamp */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timestamp
                </label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {new Date().toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Project Information */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
            
            {/* Proposed Project Title/Area */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Proposed Project Title/Area <span className="text-red-500">*</span>
              </label>
              <textarea
                id="title"
                rows={3}
                {...register('title', {
                  required: 'Project title is required',
                })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your proposed project title or area of work..."
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

          </div>

          {/* Hidden fields for backend submission */}
          <input type="hidden" {...register('projectType')} value="minor1" />
          <input type="hidden" {...register('semester')} value={4} />
          <input type="hidden" {...register('academicYear')} value={`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`} />

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Registration Failed</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/dashboard/student')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </span>
              ) : (
                'Register Project'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Guidelines Card */}
      <div className="mt-8 bg-yellow-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-900 mb-4">📋 Registration Guidelines</h2>
        <div className="text-yellow-800 space-y-2 text-sm">
          <p>• <strong>Be Specific:</strong> Provide clear, detailed project description</p>
          <p>• <strong>Realistic Scope:</strong> Choose a project that can be completed in 3-4 months</p>
          <p>• <strong>Technical Focus:</strong> Include programming concepts and technologies</p>
          <p>• <strong>Original Work:</strong> Ensure your project idea is original and not copied</p>
          <p>• <strong>Faculty Review:</strong> Your project will be reviewed by faculty members</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectRegistrationForm;
