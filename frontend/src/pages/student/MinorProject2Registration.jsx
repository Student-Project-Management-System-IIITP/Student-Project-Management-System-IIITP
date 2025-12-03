import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSem5Project } from '../../hooks/useSem5Project';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { formatFacultyName } from '../../utils/formatUtils';
import Layout from '../../components/common/Layout';
import { FiCheckCircle, FiInfo, FiTarget, FiUsers, FiFileText, FiUser, FiPhone, FiStar, FiHash, FiMail, FiChevronUp, FiChevronDown, FiX, FiPlus, FiSearch, FiLoader, FiUserPlus, FiAlertTriangle } from 'react-icons/fi';

const MinorProject2Registration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { registerMinorProject2, loading } = useSem5Project();
  const { isInGroup, sem5Group, isGroupLeader, getGroupStats, loading: groupLoading, error: groupError } = useGroupManagement();
  
  // Initialize state from localStorage or defaults
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('minorProject2Registration_currentStep');
    return saved ? parseInt(saved) : 3;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [facultyPreferences, setFacultyPreferences] = useState(() => {
    const saved = localStorage.getItem('minorProject2Registration_facultyPreferences');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isRestoredFromStorage, setIsRestoredFromStorage] = useState(false);
  const toastShownRef = React.useRef(false);
  const validationAttemptedRef = React.useRef(false);
  const [customDomain, setCustomDomain] = useState(() => {
    const saved = localStorage.getItem('minorProject2Registration_customDomain');
    return saved || '';
  });
  const [facultyPreferenceLimit, setFacultyPreferenceLimit] = useState(7); // Default to 7
  const [minGroupMembers, setMinGroupMembers] = useState(4); // Default fallback
  const [maxGroupMembers, setMaxGroupMembers] = useState(5); // Default fallback
  const [allowedFacultyTypes, setAllowedFacultyTypes] = useState(['Regular', 'Adjunct', 'On Lien']); // Default to all types
  
  // Simple access validation - only redirect if we have group data and conditions are not met
  useEffect(() => {
    // Don't validate if user is not loaded yet
    if (!user) {
      return;
    }

    // Don't validate while still loading - wait for data to be fetched
    if (groupLoading) {
      validationAttemptedRef.current = false; // Reset if loading starts again
      return;
    }

    // Only validate once after loading completes
    if (validationAttemptedRef.current) {
      return;
    }

    // Mark that we've attempted validation
    validationAttemptedRef.current = true;

    // If there was an error loading, don't redirect immediately - let user see the error
    if (groupError) {
      console.error('Error loading group data:', groupError);
      return;
    }

    try {
      // Only validate if we have group data loaded
      // If loading is complete and sem5Group is null, user is not in a group
        if (!sem5Group) {
          if (!toastShownRef.current) {
            toast.error('You are not in a group. Please join or create a group first.');
            toastShownRef.current = true;
          }
        navigate('/dashboard/student');
          return;
        }

        // Check if group is finalized
      if (sem5Group.status !== 'finalized' && !sem5Group.finalizedAt) {
          if (!toastShownRef.current) {
            toast.error('Your group must be finalized before registering your project');
            toastShownRef.current = true;
          }
          navigate('/dashboard/student');
          return;
        }

        // Check if user is group leader
        if (!isGroupLeader) {
        if (!toastShownRef.current) {
          toast.error('Only the group leader can register the project');
          toastShownRef.current = true;
        }
          navigate('/dashboard/student');
          return;
      }
      
      // Get member count from group data directly
      const memberCount = sem5Group?.activeMemberCount ?? 
                         (sem5Group?.members?.filter?.(m => m.isActive !== false).length || 0);
      const groupMinMembers = sem5Group?.minMembers || minGroupMembers;
      
      if (memberCount < groupMinMembers) {
        if (!toastShownRef.current) {
          toast.error(`Your group must have at least ${groupMinMembers} members before registering your project. Current: ${memberCount} members.`);
          toastShownRef.current = true;
        }
        navigate('/dashboard/student');
        return;
      }
    } catch (error) {
      console.error('Error in access validation:', error);
      if (!toastShownRef.current) {
      toast.error('An error occurred while loading your group information');
        toastShownRef.current = true;
    }
      navigate('/dashboard/student');
    }
  }, [user, groupLoading, groupError, sem5Group, isGroupLeader, navigate, minGroupMembers]);

  // Load faculty preference limit and group size limits from system config
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const [facultyLimitResponse, minMembersResponse, maxMembersResponse, allowedTypesResponse] = await Promise.all([
          studentAPI.getSystemConfig('sem5.facultyPreferenceLimit'),
          studentAPI.getSystemConfig('sem5.minGroupMembers'),
          studentAPI.getSystemConfig('sem5.maxGroupMembers'),
          studentAPI.getSystemConfig('sem5.minor2.allowedFacultyTypes')
        ]);
        
        if (facultyLimitResponse.success && facultyLimitResponse.data) {
          setFacultyPreferenceLimit(facultyLimitResponse.data.value);
        }
        
        if (minMembersResponse.success && minMembersResponse.data?.value) {
          setMinGroupMembers(parseInt(minMembersResponse.data.value));
        }
        
        if (maxMembersResponse.success && maxMembersResponse.data?.value) {
          setMaxGroupMembers(parseInt(maxMembersResponse.data.value));
        }
        
        if (allowedTypesResponse.success && allowedTypesResponse.data?.value && Array.isArray(allowedTypesResponse.data.value)) {
          setAllowedFacultyTypes(allowedTypesResponse.data.value);
        }
      } catch (error) {
        console.error('Failed to load configs, using defaults:', error);
        // Keep default values
      }
    };
    
    loadConfigs();
  }, []);

  // Load faculty list for preferences
  useEffect(() => {
    const loadFacultyList = async () => {
      try {
        const response = await studentAPI.getFacultyList();
        
        if (response.success) {
          setFacultyList(response.data);
        } else {
          throw new Error(response.message || 'Failed to load faculty list');
        }
      } catch (error) {
        console.error('Failed to load faculty list:', error);
        toast.error('Failed to load faculty list');
      }
    };

    if (currentStep === 5) {
      loadFacultyList();
    }
  }, [currentStep]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm({
    defaultValues: {
      title: localStorage.getItem('minorProject2Registration_title') || '',
      domain: localStorage.getItem('minorProject2Registration_domain') || ''
    }
  });

  // Watch form fields for persistence
  const watchedTitle = watch('title');
  const watchedDomain = watch('domain');

  // Check if form was restored from localStorage
  useEffect(() => {
    const hasStoredData = localStorage.getItem('minorProject2Registration_currentStep') ||
                         localStorage.getItem('minorProject2Registration_title') ||
                         localStorage.getItem('minorProject2Registration_domain') ||
                         localStorage.getItem('minorProject2Registration_facultyPreferences');
    
    if (hasStoredData) {
      setIsRestoredFromStorage(true);
      // Hide the banner after 5 seconds
      setTimeout(() => setIsRestoredFromStorage(false), 5000);
    }
  }, []);

  // Cleanup localStorage on unmount if form is not completed
  useEffect(() => {
    return () => {
      // Only clear if form is not completed (no project registered)
      // This prevents clearing data if user navigates away after successful registration
      const isCompleted = localStorage.getItem('minorProject2Registration_completed');
      if (!isCompleted) {
        // Don't clear immediately, let the user's session persist
        // localStorage will be cleared on successful completion or manual cancel
      }
    };
  }, []);

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem('minorProject2Registration_currentStep', currentStep.toString());
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem('minorProject2Registration_facultyPreferences', JSON.stringify(facultyPreferences));
  }, [facultyPreferences]);

  // Persist form data
  useEffect(() => {
    if (watchedTitle !== undefined) {
      localStorage.setItem('minorProject2Registration_title', watchedTitle || '');
    }
  }, [watchedTitle]);

  useEffect(() => {
    if (watchedDomain !== undefined) {
      localStorage.setItem('minorProject2Registration_domain', watchedDomain || '');
    }
  }, [watchedDomain]);

  useEffect(() => {
    localStorage.setItem('minorProject2Registration_customDomain', customDomain);
  }, [customDomain]);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      
      const projectData = {
        ...data,
        domain: data.domain === 'Other' ? customDomain : data.domain,
        semester: 5,
        academicYear: user.academicYear || '2024-25',
        projectType: 'minor2',
        degree: 'B.Tech',
        facultyPreferences: facultyPreferences
      };

      await registerMinorProject2(projectData);
      
      // Clear localStorage on successful completion
      localStorage.removeItem('minorProject2Registration_currentStep');
      localStorage.removeItem('minorProject2Registration_facultyPreferences');
      localStorage.removeItem('minorProject2Registration_title');
      localStorage.removeItem('minorProject2Registration_domain');
      localStorage.removeItem('minorProject2Registration_customDomain');
      localStorage.removeItem('minorProject2Registration_completed');
      
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
    // Clear localStorage persistence
    localStorage.removeItem('minorProject2Registration_currentStep');
    localStorage.removeItem('minorProject2Registration_facultyPreferences');
    localStorage.removeItem('minorProject2Registration_title');
    localStorage.removeItem('minorProject2Registration_domain');
    localStorage.removeItem('minorProject2Registration_customDomain');
    localStorage.removeItem('minorProject2Registration_completed');
    navigate('/dashboard/student');
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 3) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addFacultyPreference = (faculty) => {
    if (facultyPreferences.length >= facultyPreferenceLimit) {
      toast.error(`You can only select up to ${facultyPreferenceLimit} faculty preferences`);
      return;
    }

    if (facultyPreferences.some(p => p.faculty._id === faculty._id)) {
      toast.error('This faculty member is already selected');
      return;
    }

    const newPreference = {
      faculty,
      priority: facultyPreferences.length + 1
    };
    
    setFacultyPreferences([...facultyPreferences, newPreference]);
    toast.success(`${formatFacultyName(faculty)} added to preferences`);
  };

  const removeFacultyPreference = (facultyId) => {
    const facultyToRemove = facultyPreferences.find(p => p.faculty._id === facultyId);
    const updatedPreferences = facultyPreferences
      .filter(p => p.faculty._id !== facultyId)
      .map((p, index) => ({ ...p, priority: index + 1 }));
    
    setFacultyPreferences(updatedPreferences);
    if (facultyToRemove) {
      toast.success(`${formatFacultyName(facultyToRemove.faculty)} removed from preferences`);
    }
  };

  const movePreference = (fromIndex, toIndex) => {
    const updatedPreferences = [...facultyPreferences];
    const [movedItem] = updatedPreferences.splice(fromIndex, 1);
    updatedPreferences.splice(toIndex, 0, movedItem);
    
    // Update priorities
    const reorderedPreferences = updatedPreferences.map((p, index) => ({
      ...p,
      priority: index + 1
    }));
    
    setFacultyPreferences(reorderedPreferences);
  };

  const getFilteredFaculty = () => {
    return facultyList.filter(faculty => {
      const matchesSearch = faculty.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = selectedDepartment === 'all' || faculty.department === selectedDepartment;
      const matchesType = allowedFacultyTypes.includes(faculty.mode);
      const notSelected = !facultyPreferences.some(p => p.faculty._id === faculty._id);
      
      return matchesSearch && matchesDepartment && matchesType && notSelected;
    });
  };

  const getGroupMembers = () => {
    if (!sem5Group || !sem5Group.members) return [];
    
    // Filter to only active members and sort: leader first, then members
    const activeMembers = sem5Group.members.filter(member => member.isActive !== false);
    const sortedMembers = [...activeMembers].sort((a, b) => {
      if (a.role === 'leader') return -1;
      if (b.role === 'leader') return 1;
      return 0;
    });
    
    return sortedMembers;
  };

  const renderStep3 = () => {
    const groupMembers = getGroupMembers();
    const memberCount = groupMembers.length;
    
    return (
    <div className="space-y-3">
      {/* Read-only notice */}
      <div className="bg-info-50 border border-info-200 rounded-lg px-3 py-2 flex items-start gap-2">
        <FiInfo className="h-3.5 w-3.5 text-info-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-info-800">
          Member details are read-only. If any information is incorrect, the respective student must update it from their profile page.
        </p>
            </div>

      <div className="space-y-2.5">
        {groupMembers.map((member, index) => (
          <div
            key={member._id}
            className="bg-white border border-neutral-200 rounded-lg px-3 py-2.5 flex items-start gap-3"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                member.role === 'leader'
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-info-100 text-info-800'
              }`}
            >
              {(member.student?.fullName || ' ? ')?.charAt(0).toUpperCase()}
          </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-neutral-900 truncate">
                  {member.student?.fullName || 'Unknown member'}
            </p>
                <span className="text-[11px] text-neutral-500">#{index + 1}</span>
                {member.role === 'leader' && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">
                    <FiStar className="w-3 h-3" />
                    <span>Leader</span>
                  </span>
                )}
          </div>
              <p className="text-[11px] text-neutral-600 mt-0.5 truncate">
                <span className="inline-flex items-center gap-1 mr-2">
                  <span>MIS:</span>
                  <span className="font-medium">{member.student?.misNumber || 'N/A'}</span>
                </span>
                {member.student?.branch && `• ${member.student.branch}`}
              </p>
              {member.student?.email && (
                <p className="text-[11px] text-neutral-600 mt-0.5 flex items-center gap-1 truncate">
                  <FiMail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{member.student.email}</span>
                </p>
              )}
              {member.student?.contactNumber && (
                <p className="text-[11px] text-neutral-600 mt-0.5 flex items-center gap-1">
                  <FiPhone className="w-3 h-3" />
                  <span>{member.student.contactNumber}</span>
                </p>
              )}
        </div>
              </div>
        ))}
              </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="px-4 py-2.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
        >
          Continue to Project Details
        </button>
            </div>
          </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(nextStep)} className="space-y-5">
            <div>
          <label htmlFor="title" className="block text-xs font-medium text-neutral-700 mb-1.5">
            Proposed project title *
              </label>
              <input
                type="text"
                id="title"
                {...register('title', {
                  required: 'Project title is required',
                  minLength: {
                value: 2,
                message: 'Title must be at least 2 characters long'
                  },
                  maxLength: {
                value: 100,
                message: 'Title cannot exceed 100 characters'
                  }
                })}
            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              errors.title ? 'border-error-500' : 'border-neutral-300'
                }`}
                placeholder="Enter your project title"
              />
              {errors.title && (
            <p className="mt-1 text-xs text-error-600">{errors.title.message}</p>
              )}
          <p className="mt-2 text-[11px] text-neutral-500">
            <strong>Tip:</strong> If not finalized, you may temporarily use "TBD" and update later from the project dashboard.
              </p>
            </div>

            <div>
          <label htmlFor="domain" className="block text-xs font-medium text-neutral-700 mb-1.5">
            Project domain *
              </label>
              <select
                id="domain"
                {...register('domain', {
                  required: 'Please select a project domain'
                })}
            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white ${
              errors.domain ? 'border-error-500' : 'border-neutral-300'
                }`}
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundPosition: 'right 0.75rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.25em 1.25em',
              paddingRight: '2.75rem'
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
              {errors.domain && (
            <p className="mt-1 text-xs text-error-600">{errors.domain.message}</p>
              )}
          
          {/* Custom domain input - only show when "Other" is selected */}
          {watchedDomain === 'Other' && (
            <div className="mt-3">
              <label htmlFor="customDomain" className="block text-xs font-medium text-neutral-700 mb-1.5">
                Specify domain *
              </label>
              <input
                type="text"
                id="customDomain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your custom domain"
                required={watchedDomain === 'Other'}
              />
              {watchedDomain === 'Other' && !customDomain.trim() && (
                <p className="mt-1 text-xs text-error-600">Please specify the domain</p>
                )}
              </div>
          )}
            </div>

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={prevStep}
            className="px-4 py-2.5 text-sm text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-4 py-2.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          >
            Continue to Faculty Preferences
          </button>
        </div>
      </form>
    </div>
  );

  const renderStep5 = () => {
    // Show loading state if faculty list is empty
    if (facultyList.length === 0) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 5: Faculty Preferences</h2>
            <p className="text-gray-600">Loading faculty list...</p>
          </div>
          <div className="flex flex-col items-center justify-center py-8">
            <FiLoader className="w-8 h-8 text-primary-600 animate-spin mb-3" />
            <span className="text-sm text-neutral-600">Loading faculty members...</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-5">
        </div>

        {/* Instructions */}
        <div className="bg-info-50 border border-info-200 rounded-lg px-3 py-2.5 mb-4">
          <div className="flex items-start gap-2">
            <FiInfo className="h-4 w-4 text-info-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-info-900 mb-1.5">How to select faculty preferences</h3>
              <div className="text-[11px] text-info-800 space-y-1">
                <p><strong>1. Browse:</strong> Search by name or filter by department</p>
                <p><strong>2. Add:</strong> Click any faculty member from the right panel</p>
                <p><strong>3. Reorder:</strong> Use ↑ ↓ arrows to change priority</p>
                <p><strong>4. Remove:</strong> Click × to remove from preferences</p>
                <p className="text-error-700 font-semibold mt-1.5">
                  <FiAlertTriangle className="w-3 h-3 inline mr-1" />
                  Required: Select exactly {facultyPreferenceLimit} faculty members
                </p>
              </div>
            </div>
          </div>
        </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Selected Preferences */}
           <div className="flex flex-col h-[22rem]">
             <div className="flex items-center justify-between mb-3 flex-shrink-0">
               <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                 <FiUsers className="w-4 h-4 text-primary-600" />
              Your Preferences ({facultyPreferences.length}/{facultyPreferenceLimit})
               </h3>
              {facultyPreferences.length === facultyPreferenceLimit && (
                 <span className="inline-flex items-center gap-1 text-xs text-success-700 font-medium">
                   <FiCheckCircle className="w-3.5 h-3.5" />
                   Complete
                 </span>
              )}
             </div>
            
             <div className="flex-1 min-h-0 overflow-hidden">
            {facultyPreferences.length === 0 ? (
                 <div className="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center h-full flex flex-col items-center justify-center">
                   <FiUserPlus className="mx-auto h-10 w-10 text-neutral-400 mb-2" />
                   <p className="text-sm font-medium text-neutral-600 mb-1">No faculty selected yet</p>
                   <p className="text-xs text-neutral-500 mb-2">Click on faculty members from the right panel to add them</p>
                   <p className="text-xs text-error-600 font-semibold flex items-center justify-center gap-1">
                     <FiAlertTriangle className="w-3 h-3" />
                     Select exactly {facultyPreferenceLimit} faculty members
                   </p>
              </div>
            ) : (
                 <div className="h-full overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                {facultyPreferences.map((preference, index) => (
                  <div
                    key={preference.faculty._id}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {formatFacultyName(preference.faculty)}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {preference.faculty.department}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        {index > 0 && (
                          <button
                            onClick={() => movePreference(index, index - 1)}
                            className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="Move up"
                          >
                            <FiChevronUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {index < facultyPreferences.length - 1 && (
                          <button
                            onClick={() => movePreference(index, index + 1)}
                            className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="Move down"
                          >
                            <FiChevronDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeFacultyPreference(preference.faculty._id)}
                          className="p-1.5 text-error-400 hover:text-error-600 hover:bg-error-50 rounded transition-colors"
                          title="Remove"
                        >
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      </div>
              </div>
            </div>
                ))}
              </div>
            )}
             </div>
          </div>

          {/* Available Faculty */}
          <div className="flex flex-col h-[22rem]">
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2 mb-3 flex-shrink-0">
              <FiUser className="w-4 h-4 text-primary-600" />
              Available Faculty
            </h3>
            
            {/* Search and Filter */}
            <div className="space-y-2 mb-3 flex-shrink-0">
            <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search by faculty name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="all">All Departments</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="ASH">ASH</option>
                </select>
              </div>
            </div>

            {/* Faculty List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
              {getFilteredFaculty().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No faculty members found</p>
                  <p className="text-sm">Try adjusting your search or filter</p>
                </div>
              ) : (
                getFilteredFaculty().map(faculty => (
                  <div
                    key={faculty._id}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => addFacultyPreference(faculty)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {formatFacultyName(faculty)}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {faculty.department}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <FiPlus className="w-4 h-4 text-primary-500" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
              </div>
            </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
            onClick={prevStep}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
            Back
              </button>
              <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={facultyPreferences.length !== facultyPreferenceLimit || isSubmitting || loading}
                className={`px-6 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center ${
                  facultyPreferences.length === facultyPreferenceLimit
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Registering...
                  </>
                ) : facultyPreferences.length === facultyPreferenceLimit ? (
                  <>
                    <FiCheckCircle className="w-4 h-4 mr-2" />
                    Complete Registration
                  </>
                ) : (
                  <>
                    <FiUserPlus className="w-4 h-4 mr-2" />
                    Select {facultyPreferenceLimit - facultyPreferences.length} More Faculty
                  </>
                )}
              </button>
            </div>
      </div>
    );
  };

  // Show loading screen while group data is loading
  if (groupLoading) {
    return (
      <Layout>
        <div className="h-[calc(100vh-64px)] bg-surface-200 flex items-center justify-center">
            <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mx-auto mb-3"></div>
            <h2 className="text-base font-semibold text-neutral-900 mb-1">Loading registration form</h2>
            <p className="text-xs text-neutral-600">Fetching your group information...</p>
            </div>
          </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-64px)] bg-surface-200 overflow-hidden">
        <div className="h-full w-full px-2 sm:px-4 lg:px-6 py-2 flex flex-col">
          {/* Compact header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-neutral-900">
                Minor Project 2 - Registration
              </h1>
              <p className="mt-0.5 text-xs text-neutral-600">
                Register your Semester 5 Minor Project 2 once your group is finalized.
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        {/* Optional restore banner */}
        {isRestoredFromStorage && (
          <div className="mt-3 mb-1 rounded-lg border border-info-200 bg-info-50 px-3 py-2 flex items-center gap-2">
            <svg className="h-4 w-4 text-info-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-info-900">Form restored from previous session</p>
              <p className="text-[11px] text-info-700 truncate">
                Your saved progress has been loaded. Review details before submitting.
              </p>
        </div>
            <button
              onClick={() => setIsRestoredFromStorage(false)}
              className="text-info-500 hover:text-info-700 p-1"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

          {/* Main layout */}
          <div className="mt-3 lg:grid lg:grid-cols-12 gap-3 lg:gap-4 flex-1 min-h-0">
            {/* Left: multi-step form */}
            <div className="lg:col-span-8 flex flex-col h-full min-h-0 space-y-3 overflow-y-auto custom-scrollbar pr-1">

              {/* Step card */}
              <div className="bg-white rounded-xl border border-neutral-200 flex flex-col">
                <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900">
                      {currentStep === 3 && 'Step 3 · Group Member Verification'}
                      {currentStep === 4 && 'Step 4 · Project Details'}
                      {currentStep === 5 && 'Step 5 · Faculty Preferences'}
                    </h2>
                    <p className="text-[11px] text-neutral-500">
                      {currentStep === 3 && 'Review member information below.'}
                      {currentStep === 4 && 'Provide basic information about your project.'}
                      {currentStep === 5 && 'Choose and prioritize your preferred faculty mentors.'}
                    </p>
              </div>
            </div>

                <div className="px-4 py-3 flex-1 min-h-0 overflow-visible">
                  {currentStep === 3 && renderStep3()}
                  {currentStep === 4 && renderStep4()}
                  {currentStep === 5 && renderStep5()}
              </div>
            </div>
            </div>
            {/* Right: progress & info */}
            <div className="lg:col-span-4 flex flex-col h-full min-h-0 space-y-3 mt-4 lg:mt-0 overflow-y-auto custom-scrollbar pl-1">
              {/* Progress overview */}
              <div className="bg-surface-100 rounded-xl border border-neutral-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center">
                      <FiTarget className="w-3.5 h-3.5 text-primary-600" />
              </div>
                    <p className="text-xs font-semibold text-neutral-800">Registration progress</p>
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    Step {currentStep} of 5
              </span>
            </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-success-600 text-white flex items-center justify-center">
                      <FiCheckCircle className="w-3.5 h-3.5" />
            </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-success-800">Group Formation</p>
                      <p className="text-[11px] text-success-700">Completed</p>
              </div>
            </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-success-600 text-white flex items-center justify-center">
                      <FiCheckCircle className="w-3.5 h-3.5" />
             </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-success-800">Group Finalized</p>
                      <p className="text-[11px] text-success-700">Completed</p>
               </div>
                  </div>
                  <div className="mt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-neutral-600">
                      <span>Step 3 · Members</span>
                      <span className={currentStep >= 3 ? 'text-success-700 font-semibold' : ''}>
                        {currentStep > 3 ? 'Done' : currentStep === 3 ? 'In progress' : 'Pending'}
               </span>
             </div>
                    <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          currentStep >= 3 ? 'bg-gradient-to-r from-primary-500 to-success-500' : 'bg-neutral-300'
                        }`}
                        style={{ width: currentStep >= 3 ? '100%' : '0%' }}
                      />
          </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-600 mt-1.5">
                      <span>Step 4 · Project</span>
                      <span className={currentStep >= 4 ? 'text-success-700 font-semibold' : ''}>
                        {currentStep > 4 ? 'Done' : currentStep === 4 ? 'In progress' : 'Pending'}
                      </span>
        </div>
                    <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          currentStep >= 4 ? 'bg-gradient-to-r from-primary-500 to-success-500' : 'bg-neutral-300'
                        }`}
                        style={{ width: currentStep >= 4 ? '100%' : '0%' }}
                      />
              </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-600 mt-1.5">
                      <span>Step 5 · Faculty</span>
                      <span className={currentStep >= 5 ? 'text-success-700 font-semibold' : ''}>
                        {currentStep === 5 ? 'In progress' : currentStep > 5 ? 'Done' : 'Pending'}
                      </span>
              </div>
                    <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          currentStep >= 5 ? 'bg-gradient-to-r from-primary-500 to-success-500' : 'bg-neutral-300'
                        }`}
                        style={{ width: currentStep >= 5 ? '100%' : '0%' }}
                      />
              </div>
            </div>
          </div>
              </div>

              {/* Registration info */}
              <div className="bg-info-50 rounded-xl border border-info-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-info-100 flex items-center justify-center">
                    <FiInfo className="w-3.5 h-3.5 text-info-600" />
              </div>
                  <h3 className="text-sm font-semibold text-info-900">
                    About Minor Project 2
                </h3>
                </div>
                <div className="text-[11px] text-info-800 space-y-1.5">
                  <p>• <strong>Progress:</strong> Group formation and finalization are complete.</p>
                  <p>
                    • <strong>Current step:</strong>{' '}
                    {currentStep === 3 ? 'Verifying group member details' : currentStep === 4 ? 'Entering project details' : 'Selecting faculty preferences'}
                </p>
                  <p>• <strong>Leader only:</strong> Only the group leader can register the project details.</p>
                  <p>• <strong>Faculty allocation:</strong> Allocation is processed after registration based on your preferences.</p>
                  <p>• <strong>Duration:</strong> 4-5 months of development and implementation.</p>
                  <p>• <strong>Evaluation:</strong> Group presentation and individual contribution assessment.</p>
              </div>
            </div>

              {/* Proposal tips */}
              <div className="bg-surface-100 rounded-xl border border-neutral-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center">
                    <FiFileText className="w-3.5 h-3.5 text-primary-600" />
          </div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Strong proposal checklist
                  </h3>
           </div>
                <div className="text-[11px] text-neutral-700 space-y-1.5">
                  <p>• <strong>Title:</strong> Clear, specific, and under 100 characters.</p>
                  <p>• <strong>Problem:</strong> Realistic problem statement with measurable objectives.</p>
                  <p>• <strong>Scope:</strong> Features you can actually build in one semester.</p>
                  <p>• <strong>Tech stack:</strong> Use technologies you are comfortable with or ready to learn.</p>
                  <p>• <strong>Team:</strong> Discuss roles and expectations with all group members.</p>
        </div>
          </div>
        </div>
      </div>
    </div>
      </div>
    </Layout>
  );
};

export default MinorProject2Registration;
