import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import GroupMemberList from '../../components/groups/GroupMemberList';
import Layout from '../../components/common/Layout';

const Sem6Registration = () => {
  const navigate = useNavigate();
  const { user, roleData } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Data from API
  const [groupData, setGroupData] = useState(null);
  const [facultyData, setFacultyData] = useState(null);
  const [sem5Project, setSem5Project] = useState(null);
  const [canContinue, setCanContinue] = useState(false);
  const [isGroupLeader, setIsGroupLeader] = useState(false);
  
  // Form state
  const [isContinuing, setIsContinuing] = useState(null);
  const [projectChoice, setProjectChoice] = useState(null);
  
  const [customDomain, setCustomDomain] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      title: '',
      domain: ''
    }
  });

  const watchedTitle = watch('title');
  const watchedDomain = watch('domain');

  // Check if already registered for Sem 6 project
  useEffect(() => {
    const checkExistingProject = async () => {
      try {
        // Check if student has a Sem 6 project in currentProjects
        const currentProjects = roleData?.currentProjects || [];
        const sem6Project = currentProjects.find(p => p.semester === 6 && p.projectType === 'minor3');
        
        if (sem6Project) {
          const projectId = sem6Project.project || sem6Project._id || sem6Project.projectId;
          if (projectId) {
            toast.success('You have already registered for Minor Project 3');
            navigate(`/projects/${projectId}`, { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error('Error checking existing project:', error);
      }
    };
    
    if (roleData) {
      checkExistingProject();
    }
  }, [roleData, navigate]);

  // Load Sem 5 group and faculty data
  useEffect(() => {
    let isMounted = true; // Prevent duplicate toasts on unmount
    
    const loadSem5Data = async () => {
      try {
        setLoading(true);
        const response = await studentAPI.getSem5GroupForSem6();
        
        if (!isMounted) return; // Component unmounted, don't update state
        
        if (response.success) {
          // Check if already registered (backend returns this in response)
          if (response.alreadyRegistered || response.data?.alreadyRegistered) {
            // Try to find project ID from response or currentProjects
            const currentProjects = roleData?.currentProjects || [];
            const sem6Project = currentProjects.find(p => p.semester === 6 && p.projectType === 'minor3');
            const projectId = response.data?.projectId || sem6Project?.project || sem6Project?._id || sem6Project?.projectId;
            
            if (projectId) {
              toast.success('You have already registered for Minor Project 3');
              navigate(`/projects/${projectId}`, { replace: true });
              return;
            } else {
              navigate('/dashboard/student', { replace: true });
              return;
            }
          }
          
          setGroupData(response.data.group);
          setFacultyData(response.data.faculty);
          setSem5Project(response.data.sem5Project);
          setCanContinue(response.data.canContinue);
          setIsGroupLeader(response.data.isGroupLeader || false);
        } else {
          // Check if error is due to already registered
          if (response.message && response.message.includes('already registered')) {
            const currentProjects = roleData?.currentProjects || [];
            const sem6Project = currentProjects.find(p => p.semester === 6 && p.projectType === 'minor3');
            const projectId = sem6Project?.project || sem6Project?._id || sem6Project?.projectId;
            
            if (projectId) {
              navigate(`/projects/${projectId}`, { replace: true });
              return;
            }
          }
          
          toast.error(response.message || 'Failed to load Sem 5 data');
          navigate('/dashboard/student');
        }
      } catch (error) {
        if (!isMounted) return; // Component unmounted, don't show error
        
        console.error('Error loading Sem 5 data:', error);
        
        // Check if error is due to already registered
        if (error.message && error.message.includes('already registered')) {
          const currentProjects = roleData?.currentProjects || [];
          const sem6Project = currentProjects.find(p => p.semester === 6 && p.projectType === 'minor3');
          const projectId = sem6Project?.project || sem6Project?._id || sem6Project?.projectId;
          
          if (projectId) {
            navigate(`/projects/${projectId}`, { replace: true });
            return;
          }
        }
        
        toast.error(error.message || 'Failed to load Sem 5 group data');
        setTimeout(() => navigate('/dashboard/student'), 100);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadSem5Data();
    
    return () => {
      isMounted = false; // Cleanup: prevent state updates after unmount
    };
  }, [navigate, roleData]);

  // Validation: Check if student is in Sem 6
  useEffect(() => {
    const currentSemester = roleData?.semester || user?.semester;
    if (currentSemester !== 6) {
      toast.error('Semester 6 registration is only available for Semester 6 students');
      navigate('/dashboard/student', { replace: true });
    }
  }, [roleData, user, navigate]);

  // Step 1: Show Group Details
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 1: Your Group</h2>
        <p className="text-gray-600">
          Your group from Semester 5 will continue in Semester 6 with the same members.
        </p>
      </div>

      {!isGroupLeader && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Note: You are not the group leader</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Only your group leader can register for Semester 6. Please ask your group leader ({groupData?.leader?.fullName}) to complete the registration.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Group Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>All group members from Semester 5 will continue working together in Semester 6.</p>
            </div>
          </div>
        </div>
      </div>

      {groupData && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Group Name: {groupData.name}
            </h3>
            {groupData.description && (
              <p className="text-gray-600">{groupData.description}</p>
            )}
          </div>

          <div className="mt-4">
            <h4 className="text-md font-medium text-gray-700 mb-3">Group Members</h4>
            <GroupMemberList 
              members={groupData.members || []}
              showRoles={true}
              showContact={false}
              currentUserId={roleData?._id}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => navigate('/dashboard/student')}
          className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          disabled={!isGroupLeader}
          className={`px-6 py-3 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            isGroupLeader
              ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={!isGroupLeader ? 'Only the group leader can proceed with registration' : ''}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // Step 2: Show Allocated Faculty
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 2: Allocated Faculty</h2>
        <p className="text-gray-600">
          Your allocated faculty from Semester 5 will continue supervising your group in Semester 6.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Faculty Allocation</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Your group will continue with the same faculty supervisor from Semester 5.</p>
            </div>
          </div>
        </div>
      </div>

      {facultyData && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">👨‍🏫</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {facultyData.fullName}
              </h3>
              <div className="space-y-2 text-gray-600">
                <div>
                  <span className="font-medium">Department:</span> {facultyData.department || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Designation:</span> {facultyData.designation || 'N/A'}
                </div>
                {facultyData.email && (
                  <div>
                    <span className="font-medium">Email:</span> {facultyData.email}
                  </div>
                )}
                {facultyData.phone && (
                  <div>
                    <span className="font-medium">Phone:</span> {facultyData.phone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep(3)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );

  // Step 3: Project Continuation Choice
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 3: Project Choice</h2>
        <p className="text-gray-600">
          Choose whether to continue your Semester 5 project or start a new project for Semester 6.
        </p>
      </div>

      {/* Project Choice Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Continue Project Option */}
        <div
          onClick={() => {
            if (canContinue) {
              setIsContinuing(true);
              setProjectChoice('continue');
            }
          }}
          className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
            projectChoice === 'continue'
              ? 'border-blue-500 bg-blue-50'
              : canContinue
              ? 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
              : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="text-center">
            <div className="text-4xl mb-3">🔄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Continue Sem 5 Project
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Continue working on your Minor Project 2 as Minor Project 3
            </p>
            {sem5Project && (
              <div className="bg-white rounded p-3 text-left">
                <p className="text-xs text-gray-500 mb-1">Current Project:</p>
                <p className="text-sm font-medium text-gray-900">{sem5Project.title}</p>
              </div>
            )}
            {!canContinue && (
              <p className="text-xs text-red-600 mt-2">No Sem 5 project available to continue</p>
            )}
          </div>
        </div>

        {/* New Project Option */}
        <div
          onClick={() => {
            setIsContinuing(false);
            setProjectChoice('new');
          }}
          className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
            projectChoice === 'new'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <div className="text-center">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Start New Project
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Start a fresh Minor Project 3 for Semester 6
            </p>
            <div className="bg-white rounded p-3 text-left">
              <p className="text-xs text-gray-500 mb-1">You will need to:</p>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Enter project title</li>
                <li>• Select project domain</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Show form if new project selected */}
      {projectChoice === 'new' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white border border-gray-200 rounded-lg p-6">
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
                  value: 3,
                  message: 'Title must be at least 3 characters long'
                },
                maxLength: {
                  value: 200,
                  message: 'Title cannot exceed 200 characters'
                }
              })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your Minor Project 3 title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
            <p className="mt-2 text-sm text-gray-600">
              💡 <strong>Not decided yet?</strong> You can write "TBD" (To Be Determined) as the project title. The title can be changed later from your project dashboard.
            </p>
          </div>

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
          
            {/* Custom domain input - only show when "Other" is selected */}
            {watchedDomain === 'Other' && (
              <div className="mt-3">
                <label htmlFor="customDomain" className="block text-sm font-medium text-gray-700 mb-2">
                  Specify Domain *
                </label>
                <input
                  type="text"
                  id="customDomain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your custom domain"
                  required={watchedDomain === 'Other'}
                />
                {watchedDomain === 'Other' && !customDomain.trim() && (
                  <p className="mt-1 text-sm text-red-600">Please specify the domain</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Note</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Your Semester 5 project will be moved to the "Previous Projects" section after registration.</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Show continuation confirmation */}
      {projectChoice === 'continue' && sem5Project && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Continue: {sem5Project.title}
            </h3>
            <p className="text-blue-800 mb-2">
              Your project will be continued as <strong>Minor Project 3</strong> with the same title and description.
            </p>
            <div className="mt-3 text-sm text-blue-700">
              <p><strong>Description:</strong></p>
              <p className="mt-1">{sem5Project.description || 'No description available'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={!projectChoice || submitting || (projectChoice === 'new' && (!watchedTitle || !watchedDomain || (watchedDomain === 'Other' && !customDomain.trim())))}
          className={`px-6 py-3 rounded-lg transition-colors ${
            !projectChoice || submitting || (projectChoice === 'new' && (!watchedTitle || !watchedDomain || (watchedDomain === 'Other' && !customDomain.trim())))
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          }`}
        >
          {submitting ? 'Registering...' : 'Register Project'}
        </button>
      </div>
    </div>
  );

  // Handle form submission
  const onSubmit = async (data) => {
    if (!projectChoice) {
      toast.error('Please select a project option');
      return;
    }

    if (projectChoice === 'continue' && !canContinue) {
      toast.error('Cannot continue project: No Sem 5 project found');
      return;
    }

    if (projectChoice === 'new') {
      if (!data.title || !data.domain) {
        toast.error('Please fill in all required fields');
        return;
      }
      if (data.domain === 'Other' && !customDomain.trim()) {
        toast.error('Please specify the custom domain');
        return;
      }
    }

    try {
      setSubmitting(true);

      // Determine the final domain value
      const finalDomain = projectChoice === 'new' 
        ? (data.domain === 'Other' ? customDomain.trim() : data.domain)
        : undefined;

      const registrationData = {
        isContinuing: isContinuing,
        previousProjectId: isContinuing && sem5Project ? sem5Project._id : null,
        title: !isContinuing ? data.title : undefined,
        domain: !isContinuing ? finalDomain : undefined
      };

      const response = await studentAPI.registerSem6Project(registrationData);

      if (response.success) {
        toast.success(
          isContinuing
            ? 'Sem 6 project registered successfully! Your Sem 5 project is now continued as Minor Project 3.'
            : 'Sem 6 project registered successfully! Your Sem 5 project has been moved to Previous Projects.'
        );
        navigate('/dashboard/student');
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register Sem 6 project');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading registration data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step}
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">
                    {step === 1 && 'Group'}
                    {step === 2 && 'Faculty'}
                    {step === 3 && 'Project'}
                  </div>
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>
      </div>
    </Layout>
  );
};

export default Sem6Registration;

