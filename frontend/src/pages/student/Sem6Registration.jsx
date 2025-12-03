import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import GroupMemberList from '../../components/groups/GroupMemberList';
import Layout from '../../components/common/Layout';
import { formatFacultyName } from '../../utils/formatUtils';
import {
  FiUsers, FiUserCheck, FiRefreshCw, FiPlus, FiFilePlus,
  FiTarget, FiInfo, FiAlertCircle, FiCheckCircle, FiClock,
  FiArrowRight, FiX, FiMail, FiPhone, FiStar, FiLoader,
  FiAlertTriangle, FiFileText
} from 'react-icons/fi';

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
    let isMounted = true;
    
    const loadSem5Data = async () => {
      try {
        setLoading(true);
        const response = await studentAPI.getSem5GroupForSem6();
        
        if (!isMounted) return;
        
        if (response.success) {
          if (response.alreadyRegistered || response.data?.alreadyRegistered) {
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
          if (response.message && response.message.includes('already registered')) {
            const currentProjects = roleData?.currentProjects || [];
            const sem6Project = currentProjects.find(p => p.semester === 6 && p.projectType === 'minor3');
            const projectId = sem6Project?.project || sem6Project?._id || sem6Project?.projectId;
            
            if (projectId) {
              navigate(`/projects/${projectId}`, { replace: true });
              return;
            }
          }
          
          if (response.message && (response.message.includes('allocated faculty') || response.message.includes('does not have an allocated faculty'))) {
            toast.error('Your group does not have an allocated faculty. Please contact your admin.');
            setTimeout(() => navigate('/dashboard/student'), 1500);
            return;
          }
          
          toast.error(response.message || 'Failed to load Sem 5 data');
          navigate('/dashboard/student');
        }
      } catch (error) {
        if (!isMounted) return;
        
        console.error('Error loading Sem 5 data:', error);
        
        if (error.message && error.message.includes('already registered')) {
          const currentProjects = roleData?.currentProjects || [];
          const sem6Project = currentProjects.find(p => p.semester === 6 && p.projectType === 'minor3');
          const projectId = sem6Project?.project || sem6Project?._id || sem6Project?.projectId;
          
          if (projectId) {
            navigate(`/projects/${projectId}`, { replace: true });
            return;
          }
        }
        
        if (error.message && (error.message.includes('allocated faculty') || error.message.includes('does not have an allocated faculty'))) {
          toast.error('Your group does not have an allocated faculty. Please contact your admin.');
          setTimeout(() => navigate('/dashboard/student'), 1500);
          return;
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
      isMounted = false;
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

  // Step 1: Group & Faculty Verification (Combined)
  const renderStep1 = () => (
    <div className="space-y-3">

      {/* Leader Warning */}
      {!isGroupLeader && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <FiAlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-warning-900 mb-1">Only Group Leader Can Register</p>
              <p className="text-xs text-warning-700">
                Only your group leader ({groupData?.leader?.fullName}) can register for Semester 6. Please ask them to complete the registration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Group Information Card */}
      {groupData && (
        <div className="bg-surface-50 border border-neutral-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center">
              <FiUsers className="w-3.5 h-3.5 text-primary-600" />
          </div>
            <h3 className="text-xs font-semibold text-neutral-900">Group Information</h3>
            </div>
          
          <div className="space-y-2">
            <div>
              <p className="text-[10px] font-medium text-neutral-500 mb-0.5">Group Name</p>
              <p className="text-xs font-semibold text-neutral-900">{groupData.name}</p>
      </div>

            {groupData.description && (
              <div>
                <p className="text-[10px] font-medium text-neutral-500 mb-0.5">Description</p>
                <p className="text-xs text-neutral-700">{groupData.description}</p>
              </div>
            )}

            <div>
              <p className="text-[10px] font-medium text-neutral-500 mb-1.5">Members</p>
            <GroupMemberList 
              members={groupData.members || []}
              showRoles={true}
              showContact={false}
              currentUserId={roleData?._id}
                showStats={false}
            />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
        <button
          type="button"
          onClick={() => navigate('/dashboard/student')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          <FiX className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          disabled={!isGroupLeader}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            isGroupLeader
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
          }`}
        >
          Continue
          <FiArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Step 2: Project Choice
  const renderStep2 = () => (
    <div className="space-y-3">

      {/* Project Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Continue Project Card */}
        <div
          onClick={() => {
            if (canContinue) {
              setIsContinuing(true);
              setProjectChoice('continue');
            }
          }}
          className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
            projectChoice === 'continue'
              ? 'border-primary-500 bg-primary-50'
              : canContinue
              ? 'border-neutral-300 hover:border-primary-300 hover:bg-neutral-50'
              : 'border-neutral-200 bg-neutral-100 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${
              projectChoice === 'continue' ? 'bg-primary-100' : 'bg-neutral-100'
            }`}>
              <FiRefreshCw className={`w-6 h-6 ${projectChoice === 'continue' ? 'text-primary-600' : 'text-neutral-600'}`} />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-1">
              Continue Sem 5 Project
            </h3>
            <p className="text-xs text-neutral-600 mb-3">
              Continue working on your Minor Project 2 as Minor Project 3
            </p>
            {sem5Project && (
              <div className="w-full bg-white rounded p-2 text-left">
                <p className="text-[10px] text-neutral-500 mb-1">Current Project:</p>
                <p className="text-xs font-medium text-neutral-900 line-clamp-2">{sem5Project.title}</p>
              </div>
            )}
            {!canContinue && (
              <p className="text-xs text-error-600 mt-2">No Sem 5 project available</p>
            )}
          </div>
        </div>

        {/* New Project Card */}
        <div
          onClick={() => {
            setIsContinuing(false);
            setProjectChoice('new');
          }}
          className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
            projectChoice === 'new'
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-300 hover:border-primary-300 hover:bg-neutral-50'
          }`}
        >
          <div className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${
              projectChoice === 'new' ? 'bg-primary-100' : 'bg-neutral-100'
            }`}>
              <FiPlus className={`w-6 h-6 ${projectChoice === 'new' ? 'text-primary-600' : 'text-neutral-600'}`} />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-1">
              Start New Project
            </h3>
            <p className="text-xs text-neutral-600 mb-3">
              Start a fresh Minor Project 3 for Semester 6
            </p>
            <div className="w-full bg-white rounded p-2 text-left">
              <p className="text-[10px] text-neutral-500 mb-1">You will need to:</p>
              <ul className="text-xs text-neutral-700 space-y-0.5">
                <li>• Enter project title</li>
                <li>• Select project domain</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* New Project Form */}
      {projectChoice === 'new' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white border border-neutral-200 rounded-lg p-4">
          <div>
            <label htmlFor="title" className="block text-xs font-medium text-neutral-700 mb-1.5">
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
              className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.title ? 'border-error-500' : 'border-neutral-300'
              }`}
              placeholder="Enter your Minor Project 3 title"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-error-600">{errors.title.message}</p>
            )}
            <p className="mt-1.5 text-xs text-neutral-600">
              <FiInfo className="w-3 h-3 inline mr-1" />
              <strong>Not decided yet?</strong> You can write "TBD" (To Be Determined). The title can be changed later.
            </p>
          </div>

          <div>
            <label htmlFor="domain" className="block text-xs font-medium text-neutral-700 mb-1.5">
              Project Domain *
            </label>
            <div className="relative">
            <select
              id="domain"
              {...register('domain', {
                required: 'Please select a project domain'
              })}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.domain ? 'border-error-500' : 'border-neutral-300'
              }`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  paddingRight: '2.5rem'
                }}
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
            </div>
            {errors.domain && (
              <p className="mt-1 text-xs text-error-600">{errors.domain.message}</p>
            )}
          
            {watchedDomain === 'Other' && (
              <div className="mt-3">
                <label htmlFor="customDomain" className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Specify Domain *
                </label>
                <input
                  type="text"
                  id="customDomain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter your custom domain"
                  required={watchedDomain === 'Other'}
                />
                {watchedDomain === 'Other' && !customDomain.trim() && (
                  <p className="mt-1 text-xs text-error-600">Please specify the domain</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FiAlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-warning-700">
                Your Semester 5 project will be moved to the "Previous Projects" section after registration.
              </p>
            </div>
          </div>
        </form>
      )}

      {/* Continuation Confirmation */}
      {projectChoice === 'continue' && sem5Project && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-2">
            <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-success-900 mb-1">
              Continue: {sem5Project.title}
            </h3>
              <p className="text-xs text-success-700 mb-2">
              Your project will be continued as <strong>Minor Project 3</strong> with the same title and description.
            </p>
              {sem5Project.description && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-success-800 mb-1">Description:</p>
                  <p className="text-xs text-success-700">{sem5Project.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={!projectChoice || submitting || (projectChoice === 'new' && (!watchedTitle || !watchedDomain || (watchedDomain === 'Other' && !customDomain.trim())))}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            !projectChoice || submitting || (projectChoice === 'new' && (!watchedTitle || !watchedDomain || (watchedDomain === 'Other' && !customDomain.trim())))
              ? 'bg-neutral-400 text-neutral-600 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {submitting ? (
            <>
              <FiLoader className="w-4 h-4 animate-spin" />
              Registering...
            </>
          ) : (
            <>
              Register Project
              <FiCheckCircle className="w-4 h-4" />
            </>
          )}
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
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-surface-200">
          <div className="flex items-center gap-3">
            <FiLoader className="w-6 h-6 animate-spin text-primary-600" />
            <p className="text-sm text-neutral-600">Loading registration data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-64px)] bg-surface-200 overflow-hidden">
        <div className="h-full w-full px-2 sm:px-4 lg:px-6 py-2 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-neutral-900">
                Minor Project 3 – Registration
              </h1>
              <p className="mt-0.5 text-xs text-neutral-600">
                Register your Semester 6 Minor Project 3 (continue or new).
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/student')}
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* Main layout */}
          <div className="mt-3 flex flex-col lg:flex-row gap-3 lg:gap-4 flex-1 min-h-0">
            {/* Left Column - Form Content (65%) */}
            <div className="w-full lg:flex-[0.65] flex flex-col h-full min-h-0 space-y-3 overflow-y-auto custom-scrollbar pr-1">
              {/* Step card */}
              <div className="bg-white rounded-xl border border-neutral-200 flex flex-col">
                <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900">
                      {currentStep === 1 && 'Step 1 · Group & Faculty Verification'}
                      {currentStep === 2 && 'Step 2 · Project Choice'}
                    </h2>
                    <p className="text-[11px] text-neutral-500">
                      {currentStep === 1 && 'Review your group and faculty information.'}
                      {currentStep === 2 && 'Choose whether to continue your Sem 5 project or start a new one.'}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 flex-1 min-h-0 overflow-visible">
                  {currentStep === 1 && renderStep1()}
                  {currentStep === 2 && renderStep2()}
                </div>
              </div>
            </div>

            {/* Right Column - Progress & Info (35%) */}
            <div className="w-full lg:flex-[0.35] flex flex-col h-full min-h-0 space-y-3 mt-4 lg:mt-0 overflow-y-auto custom-scrollbar pl-1">
              {/* Registration Progress */}
              <div className="bg-surface-100 rounded-xl border border-neutral-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center">
                      <FiTarget className="w-3.5 h-3.5 text-primary-600" />
                    </div>
                    <p className="text-xs font-semibold text-neutral-800">Registration progress</p>
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    Step {currentStep} of 2
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {currentStep >= 1 ? (
                      <div className="w-6 h-6 rounded-full bg-success-600 text-white flex items-center justify-center">
                        <FiCheckCircle className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-neutral-300"></div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-medium text-neutral-800">Group & Faculty</p>
                      <p className="text-[11px] text-neutral-600">
                        {currentStep >= 1 ? 'Completed' : 'In progress'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentStep >= 2 ? (
                      <div className="w-6 h-6 rounded-full bg-success-600 text-white flex items-center justify-center">
                        <FiCheckCircle className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-neutral-300"></div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-medium text-neutral-800">Project Choice</p>
                      <p className="text-[11px] text-neutral-600">
                        {currentStep >= 2 ? 'Completed' : currentStep === 1 ? 'Next step' : 'Not started'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Faculty Guide */}
              {facultyData && (
                <div className="bg-success-50 rounded-xl border border-success-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-success-100 flex items-center justify-center">
                      <FiUserCheck className="w-3.5 h-3.5 text-success-600" />
                    </div>
                    <p className="text-xs font-semibold text-success-900">Faculty Guide</p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-medium text-success-700 mb-0.5">Name</p>
                      <p className="text-xs font-semibold text-success-900">{formatFacultyName(facultyData)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-medium text-success-700 mb-0.5">Department</p>
                        <p className="text-xs text-success-800">{facultyData.department || 'N/A'}</p>
                  </div>
                      <div>
                        <p className="text-[10px] font-medium text-success-700 mb-0.5">Designation</p>
                        <p className="text-xs text-success-800">{facultyData.designation || 'N/A'}</p>
                  </div>
                </div>
                    {facultyData.email && (
                      <div className="flex items-center gap-1.5">
                        <FiMail className="w-3 h-3 text-success-600" />
                        <p className="text-xs text-success-800">{facultyData.email}</p>
                      </div>
                    )}
                    {facultyData.phone && (
                      <div className="flex items-center gap-1.5">
                        <FiPhone className="w-3 h-3 text-success-600" />
                        <p className="text-xs text-success-800">{facultyData.phone}</p>
                      </div>
                )}
              </div>
                </div>
              )}

              {/* About Minor Project 3 */}
              <div className="bg-info-50 rounded-xl border border-info-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-info-100 flex items-center justify-center">
                    <FiInfo className="w-3.5 h-3.5 text-info-600" />
                  </div>
                  <p className="text-xs font-semibold text-info-900">About Minor Project 3</p>
                </div>
                <div className="space-y-1.5 text-xs text-info-800">
                  <p>• Group project (4-5 members)</p>
                  <p>• Continue Sem 5 OR new</p>
                  <p>• Same group & faculty</p>
                  <p>• Duration: 4-5 months</p>
          </div>
        </div>

              {/* Tips */}
              <div className="bg-warning-50 rounded-xl border border-warning-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-warning-100 flex items-center justify-center">
                    <FiAlertCircle className="w-3.5 h-3.5 text-warning-600" />
                  </div>
                  <p className="text-xs font-semibold text-warning-900">Tips</p>
                </div>
                <div className="space-y-1.5 text-xs text-warning-800">
                  {currentStep === 1 ? (
                    <>
                      <p><FiUsers className="w-3 h-3 inline mr-1" />Your Sem 5 group continues</p>
                      <p><FiUserCheck className="w-3 h-3 inline mr-1" />Same faculty supervisor</p>
                      <p><FiInfo className="w-3 h-3 inline mr-1" />Only leader can register</p>
                    </>
                  ) : (
                    <>
                      <p><FiRefreshCw className="w-3 h-3 inline mr-1" />Continue if project is ongoing</p>
                      <p><FiPlus className="w-3 h-3 inline mr-1" />Start new for different topic</p>
                      <p><FiFileText className="w-3 h-3 inline mr-1" />Title can be "TBD" initially</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Sem6Registration;
