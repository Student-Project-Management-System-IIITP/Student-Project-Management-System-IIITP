import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSem5Project } from '../../hooks/useSem5Project';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const MinorProject2Registration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { registerMinorProject2, loading } = useSem5Project();
  const { isInGroup, sem5Group, getGroupStats } = useGroupManagement();
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if access should be allowed (group must be formed first)
  useEffect(() => {
    if (!isInGroup || !sem5Group) {
      toast.error('You must form a group first before registering your project');
      navigate('/dashboard/student');
      return;
    }
    
    const groupStats = getGroupStats();
    if (groupStats.memberCount < 2) {
      toast.error('Your group must have at least 2 members before registering your project');
      navigate('/dashboard/student');
      return;
    }
  }, [isInGroup, sem5Group, getGroupStats, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      domain: '',
      technicalRequirements: '',
      expectedOutcome: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      
      const projectData = {
        ...data,
        semester: 5,
        academicYear: user.academicYear || '2024-25',
        projectType: 'minor2',
        degree: 'B.Tech'
      };

      await registerMinorProject2(projectData);
      
      toast.success('Minor Project 2 registered successfully!');
      navigate('/dashboard/student');
    } catch (error) {
      toast.error(`Registration failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = () => {
    reset();
    navigate('/dashboard/student');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Minor Project 2 Registration
              </h1>
              <p className="mt-2 text-gray-600">
                Register for your B.Tech Semester 5 Minor Project 2
              </p>
            </div>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Indicator - Updated Workflow */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                ✓
              </div>
              <span className="ml-2 text-sm font-medium text-green-600">Group Formation</span>
            </div>
            <div className="flex-1 h-0.5 bg-green-600"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="ml-2 text-sm font-medium text-blue-600">Project Registration</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200">
              <div className="h-full bg-blue-600 w-1/3"></div>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-sm text-gray-500">Faculty Preferences</span>
            </div>
          </div>
        </div>

        {/* Group Information - Show current group status */}
        {sem5Group && (
          <div className="mb-6 bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-900">
                  Group ({getGroupStats().memberCount} members) - {sem5Group.name || 'Unnamed Group'}
                </h3>
                <p className="text-xs text-green-700">
                  You can now register your project details since your group is formed
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Project Information</h2>
            <p className="text-gray-600 mt-1">
              Provide basic information about your Minor Project 2. You can edit these details later.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Project Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Project Title *
              </label>
              <input
                type="text"
                id="title"
                {...register('title', {
                  required: 'Project title is required',
                  minLength: {
                    value: 10,
                    message: 'Title must be at least 10 characters long'
                  },
                  maxLength: {
                    value: 200,
                    message: 'Title cannot exceed 200 characters'
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your project title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Project Domain */}
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                Project Domain *
              </label>
              <select
                id="domain"
                {...register('domain', {
                  required: 'Please select a project domain'
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.domain ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a domain</option>
                <option value="Web Development">Web Development</option>
                <option value="Mobile App Development">Mobile App Development</option>
                <option value="Data Science & Analytics">Data Science & Analytics</option>
                <option value="Machine Learning & AI">Machine Learning & AI</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Cloud Computing">Cloud Computing</option>
                <option value="IoT & Embedded Systems">IoT & Embedded Systems</option>
                <option value="Blockchain">Blockchain</option>
                <option value="Game Development">Game Development</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Database Systems">Database Systems</option>
                <option value="Computer Networks">Computer Networks</option>
                <option value="Operating Systems">Operating Systems</option>
                <option value="Other">Other</option>
              </select>
              {errors.domain && (
                <p className="mt-1 text-sm text-red-600">{errors.domain.message}</p>
              )}
            </div>

            {/* Project Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Project Description *
              </label>
              <textarea
                id="description"
                rows={4}
                {...register('description', {
                  required: 'Project description is required',
                  minLength: {
                    value: 50,
                    message: 'Description must be at least 50 characters long'
                  },
                  maxLength: {
                    value: 1000,
                    message: 'Description cannot exceed 1000 characters'
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe your project idea, objectives, and approach..."
              />
              <div className="flex justify-between mt-1">
                {errors.description ? (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {watch('description')?.length || 0}/1000 characters
                  </p>
                )}
              </div>
            </div>

            {/* Technical Requirements */}
            <div>
              <label htmlFor="technicalRequirements" className="block text-sm font-medium text-gray-700 mb-2">
                Technical Requirements
              </label>
              <textarea
                id="technicalRequirements"
                rows={3}
                {...register('technicalRequirements', {
                  maxLength: {
                    value: 500,
                    message: 'Technical requirements cannot exceed 500 characters'
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.technicalRequirements ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="List the technologies, frameworks, and tools you plan to use..."
              />
              <div className="flex justify-between mt-1">
                {errors.technicalRequirements ? (
                  <p className="text-sm text-red-600">{errors.technicalRequirements.message}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {watch('technicalRequirements')?.length || 0}/500 characters
                  </p>
                )}
              </div>
            </div>

            {/* Expected Outcome */}
            <div>
              <label htmlFor="expectedOutcome" className="block text-sm font-medium text-gray-700 mb-2">
                Expected Outcome
              </label>
              <textarea
                id="expectedOutcome"
                rows={3}
                {...register('expectedOutcome', {
                  maxLength: {
                    value: 500,
                    message: 'Expected outcome cannot exceed 500 characters'
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.expectedOutcome ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe what you expect to achieve with this project..."
              />
              <div className="flex justify-between mt-1">
                {errors.expectedOutcome ? (
                  <p className="text-sm text-red-600">{errors.expectedOutcome.message}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {watch('expectedOutcome')?.length || 0}/500 characters
                  </p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering...
                  </>
                ) : (
                  'Register Project'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Information Card */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">About Minor Project 2 Registration (Step 2)</h3>
          <div className="text-blue-800 space-y-2">
            <p>• <strong>Progress:</strong> You have successfully completed group formation ✅</p>
            <p>• <strong>Current Step:</strong> Now registering project details for your formed group</p>
            <p>• <strong>Faculty Allocation:</strong> Faculty selection will be the next step after registration</p>
            <p>• <strong>Duration:</strong> 4-5 months of development and implementation</p>
            <p>• <strong>Evaluation:</strong> Group presentation and individual contribution assessment</p>
            <p>• <strong>Next Steps:</strong> After registration, submit faculty preferences for your group</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinorProject2Registration;
