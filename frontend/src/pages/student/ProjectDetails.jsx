import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSem4Project } from '../../hooks/useSem4Project';
import { useSem5Project } from '../../hooks/useSem5Project';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const ProjectDetails = () => {
  const navigate = useNavigate();
  const { id: projectId } = useParams(); // Extract 'id' from useParams as 'projectId'
  const { user, roleData, isLoading: authLoading } = useAuth();
  const { sem5Project, updateProjectDetails } = useSem5Project();
  const { sem5Group, isGroupLeader } = useGroupManagement();
  const { project: sem4Project } = useSem4Project();


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [project, setProject] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      domain: '',
      technicalRequirements: '',
      expectedOutcome: '',
      methodology: '',
      timeline: '',
      deliverables: '',
      riskAssessment: ''
    }
  });

  // Load project details
  useEffect(() => {
    const loadProject = async () => {
      try {
        if (projectId) {
          const response = await studentAPI.getProject(projectId);
          setProject(response.data);
          
          // Populate form with existing data 
          const projectData = response.data;
          setValue('title', projectData.title || '');
          setValue('description', projectData.description || '');
          setValue('domain', projectData.domain || '');
          setValue('technicalRequirements', projectData.technicalRequirements || '');
          setValue('expectedOutcome', projectData.expectedOutcome || '');
          setValue('methodology', projectData.methodology || '');
          setValue('timeline', projectData.timeline || '');
          setValue('deliverables', projectData.deliverables || '');
          setValue('riskAssessment', projectData.riskAssessment || '');
        } else if (sem4Project) {
          setProject(sem4Project);
          
          // Populate form with existing data
          setValue('title', sem4Project.title || '');
          setValue('description', sem4Project.description || '');
          setValue('domain', sem4Project.domain || '');
          setValue('technicalRequirements', sem4Project.technicalRequirements || '');
          setValue('expectedOutcome', sem4Project.expectedOutcome || '');
          setValue('methodology', sem4Project.methodology || '');
          setValue('timeline', sem4Project.timeline || '');
          setValue('deliverables', sem4Project.deliverables || '');
          setValue('riskAssessment', sem4Project.riskAssessment || '');
        } else if (sem5Project) {
          setProject(sem5Project);
          
          // Populate form with existing data
          setValue('title', sem5Project.title || '');
          setValue('description', sem5Project.description || '');
          setValue('domain', sem5Project.domain || '');
          setValue('technicalRequirements', sem5Project.technicalRequirements || '');
          setValue('expectedOutcome', sem5Project.expectedOutcome || '');
          setValue('methodology', sem5Project.methodology || '');
          setValue('timeline', sem5Project.timeline || '');
          setValue('deliverables', sem5Project.deliverables || '');
          setValue('riskAssessment', sem5Project.riskAssessment || '');
        }
      } catch (error) {
        console.error('Failed to load project:', error);
        toast.error('Failed to load project details');
      }
    };

    loadProject();
  }, [projectId, sem5Project, setValue]);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      
      const targetProjectId = projectId || sem5Project?._id;
      if (!targetProjectId) {
        throw new Error('No project ID found');
      }

      // Check if this is a Sem 4 project
      const projectData = project || {};
      const isSem4ProjectType = projectData.semester === 4 || projectData.projectType === 'minor1';
      
      if (isSem4ProjectType) {
        // For Sem 4 projects, use regular API call instead of useSem5Project.update
        await studentAPI.updateProject(targetProjectId, data);
      } else {
        await updateProjectDetails(targetProjectId, data);
      }
      
      toast.success('Project details updated successfully!');
      navigate('/dashboard/student');
    } catch (error) {
      toast.error(`Failed to update project details: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = () => {
    reset();
    navigate('/dashboard/student');
  };

  // Show loading screen if authentication is loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render different content based on project type - check this AFTER project data is loaded
  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Determine project type and check if user can edit project details  
  const currentStudent = roleData?.semester;
  const currentSemester = currentStudent || 4;
  const isMinorProject = project && project.projectType === 'minor1';
  const isMinorProject2 = project && project.projectType === 'minor2';
  const isSem4Project = project && (project.semester === 4 || isMinorProject);
  const isSem5Project = sem5Project && project && project.semester === 5;
  
  
  // Check permissions based on project type
  const canEdit = isSem4Project || // Allow editing for Sem 4 Minor Project 1 
                  (isSem5Project && isGroupLeader && sem5Group && sem5Group.status === 'complete');

  if (!canEdit && isSem5Project) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Cannot Edit Project Details</h3>
            <p className="text-gray-600 mb-4">
              Only the group leader can edit project details after the group is formed.
            </p>
            <button
              onClick={() => navigate('/dashboard/student')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render different content based on project type
  if (isSem4Project) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Minor Project 1 Status</h1>
                <p className="mt-2 text-gray-600">View and manage your Minor Project 1 details</p>
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

          {/* Project Status Overview */}
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="px-6 py-8">
              {project ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Project Info */}
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{project.title}</h3>
                      <div className="flex items-center space-x-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          {project.status || 'Registered'}
                        </span>
                        <span className="text-gray-600">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {project.description && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                        <p className="text-gray-700">{project.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions & Status */}
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <div className="text-3xl mb-3">📊</div>
                      <h4 className="font-medium text-gray-900 mb-2">PPT Upload</h4>
                      <p className="text-gray-600 text-sm mb-4">Upload your presentation slides for evaluation</p>
                      <button
                        onClick={() => navigate(`/student/projects/${project._id}/upload`)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Upload PPT
                      </button>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Project Timeline</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Registered:</span>
                          <span className="font-medium">{new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Semester:</span>
                          <span className="font-medium">{project.semester}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Project Not Found</h3>
                  <p className="text-gray-600 mb-4">No project details available.</p>
                  <button
                    onClick={() => navigate('/dashboard/student')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Project Details
              </h1>
              <p className="mt-2 text-gray-600">
                Provide detailed information about your Minor Project 2
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

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                ✓
              </div>
              <span className="ml-2 text-sm font-medium text-green-600">Project Registration</span>
            </div>
            <div className="flex-1 h-0.5 bg-green-600"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                ✓
              </div>
              <span className="ml-2 text-sm font-medium text-green-600">Group Formation</span>
            </div>
            <div className="flex-1 h-0.5 bg-blue-600"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-sm font-medium text-blue-600">Project Details</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                4
              </div>
              <span className="ml-2 text-sm text-gray-500">Faculty Preferences</span>
            </div>
          </div>
        </div>

        {/* Project Details Form */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Detailed Project Information</h2>
            <p className="text-gray-600 mt-1">
              Provide comprehensive details about your project. This information will help faculty understand your project better.
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
                    value: 100,
                    message: 'Description must be at least 100 characters long'
                  },
                  maxLength: {
                    value: 2000,
                    message: 'Description cannot exceed 2000 characters'
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Provide a detailed description of your project including objectives, scope, and approach..."
              />
              <div className="flex justify-between mt-1">
                {errors.description ? (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {watch('description')?.length || 0}/2000 characters
                  </p>
                )}
              </div>
            </div>

            {/* Technical Requirements */}
            <div>
              <label htmlFor="technicalRequirements" className="block text-sm font-medium text-gray-700 mb-2">
                Technical Requirements *
              </label>
              <textarea
                id="technicalRequirements"
                rows={4}
                {...register('technicalRequirements', {
                  required: 'Technical requirements are required',
                  minLength: {
                    value: 50,
                    message: 'Technical requirements must be at least 50 characters long'
                  },
                  maxLength: {
                    value: 1000,
                    message: 'Technical requirements cannot exceed 1000 characters'
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.technicalRequirements ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="List the technologies, frameworks, programming languages, tools, and platforms you plan to use..."
              />
              <div className="flex justify-between mt-1">
                {errors.technicalRequirements ? (
                  <p className="text-sm text-red-600">{errors.technicalRequirements.message}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {watch('technicalRequirements')?.length || 0}/1000 characters
                  </p>
                )}
              </div>
            </div>

            {/* Methodology */}
            <div>
              <label htmlFor="methodology" className="block text-sm font-medium text-gray-700 mb-2">
                Methodology & Approach
              </label>
              <textarea
                id="methodology"
                rows={4}
                {...register('methodology', {
                  maxLength: {
                    value: 1000,
                    message: 'Methodology cannot exceed 1000 characters'
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.methodology ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe your development methodology, approach, and methodology (e.g., Agile, Waterfall, etc.)..."
              />
              <div className="flex justify-between mt-1">
                {errors.methodology ? (
                  <p className="text-sm text-red-600">{errors.methodology.message}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {watch('methodology')?.length || 0}/1000 characters
                  </p>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-2">
                Project Timeline
              </label>
              <textarea
                id="timeline"
                rows={3}
                {...register('timeline', {
                  maxLength: {
                    value: 800,
                    message: 'Timeline cannot exceed 800 characters'
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.timeline ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Provide a rough timeline with major milestones and deadlines..."
              />
              <div className="flex justify-between mt-1">
                {errors.timeline ? (
                  <p className="text-sm text-red-600">{errors.timeline.message}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {watch('timeline')?.length || 0}/800 characters
                  </p>
                )}
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <label htmlFor="deliverables" className="block text-sm font-medium text-gray-700 mb-2">
                Expected Deliverables
              </label>
              <textarea
                id="deliverables"
                rows={3}
                {...register('deliverables', {
                  maxLength: {
                    value: 800,
                    message: 'Deliverables cannot exceed 800 characters'
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.deliverables ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="List the expected deliverables (e.g., working application, documentation, presentation, etc.)..."
              />
              <div className="flex justify-between mt-1">
                {errors.deliverables ? (
                  <p className="text-sm text-red-600">{errors.deliverables.message}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {watch('deliverables')?.length || 0}/800 characters
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
                    value: 800,
                    message: 'Expected outcome cannot exceed 800 characters'
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.expectedOutcome ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe what you expect to achieve and the impact of your project..."
              />
              <div className="flex justify-between mt-1">
                {errors.expectedOutcome ? (
                  <p className="text-sm text-red-600">{errors.expectedOutcome.message}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {watch('expectedOutcome')?.length || 0}/800 characters
                  </p>
                )}
              </div>
            </div>

            {/* Risk Assessment */}
            <div>
              <label htmlFor="riskAssessment" className="block text-sm font-medium text-gray-700 mb-2">
                Risk Assessment
              </label>
              <textarea
                id="riskAssessment"
                rows={3}
                {...register('riskAssessment', {
                  maxLength: {
                    value: 800,
                    message: 'Risk assessment cannot exceed 800 characters'
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.riskAssessment ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Identify potential risks and challenges, and how you plan to mitigate them..."
              />
              <div className="flex justify-between mt-1">
                {errors.riskAssessment ? (
                  <p className="text-sm text-red-600">{errors.riskAssessment.message}</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {watch('riskAssessment')?.length || 0}/800 characters
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
                disabled={isSubmitting}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Project Details'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Information Card */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">About Project Details</h3>
          <div className="text-blue-800 space-y-2">
            <p>• <strong>Comprehensive Information:</strong> Provide detailed information to help faculty understand your project</p>
            <p>• <strong>Technical Specifications:</strong> List all technologies, tools, and platforms you plan to use</p>
            <p>• <strong>Methodology:</strong> Describe your development approach and methodology</p>
            <p>• <strong>Timeline:</strong> Provide a realistic timeline with major milestones</p>
            <p>• <strong>Next Steps:</strong> After updating details, you'll submit faculty preferences</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
