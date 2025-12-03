import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSem7Project } from '../../hooks/useSem7Project';
import { useSem8Project } from '../../hooks/useSem8Project';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import { formatFacultyName } from '../../utils/formatUtils';
import { 
  FiCheckCircle, FiInfo, FiTarget, FiUsers, FiFileText, FiUser, FiPhone, 
  FiStar, FiHash, FiMail, FiChevronUp, FiChevronDown, FiX, FiPlus, FiSearch, 
  FiLoader, FiUserPlus, FiAlertTriangle, FiArrowLeft, FiAlertCircle, FiZap 
} from 'react-icons/fi';

const MajorProject1Registration = () => {
  const navigate = useNavigate();
  const { user, roleData } = useAuth();
  const currentSemester = roleData?.semester || user?.semester;
  const isSem8 = currentSemester === 8;
  
  // Use appropriate hooks based on semester
  const sem7Context = useSem7Project();
  const sem8Context = useSem8Project();
  
  const { 
    majorProject1Group: sem7Group, 
    registerMajorProject1, 
    loading: sem7Loading,
    finalizedTrack 
  } = sem7Context || {};
  
  const {
    majorProject2Group: sem8Group,
    registerMajorProject2,
    loading: sem8Loading,
    studentType,
    isType1,
    isType2
  } = sem8Context || {};
  
  // Select appropriate values based on semester
  const majorProjectGroup = isSem8 ? sem8Group : sem7Group;
  const loading = isSem8 ? sem8Loading : sem7Loading;
  const storagePrefix = isSem8 ? 'majorProject2Registration' : 'majorProject1Registration';
  
  // Initialize state from localStorage or defaults (use semester-specific keys)
  // For Type 2 solo projects: Start at step 1 (Project Details)
  // For Type 1 group projects: Start at step 3 (Group Member Verification)
  const [currentStep, setCurrentStep] = useState(() => {
    const prefix = isSem8 ? 'majorProject2Registration' : 'majorProject1Registration';
    const saved = localStorage.getItem(`${prefix}_currentStep`);
    if (saved) {
      return parseInt(saved);
    }
    // Type 2 solo projects start at step 1, Type 1 group projects start at step 3
    return (isSem8 && isType2) ? 1 : 3;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [facultyPreferences, setFacultyPreferences] = useState(() => {
    const prefix = isSem8 ? 'majorProject2Registration' : 'majorProject1Registration';
    const saved = localStorage.getItem(`${prefix}_facultyPreferences`);
    return saved ? JSON.parse(saved) : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isRestoredFromStorage, setIsRestoredFromStorage] = useState(false);
  const [customDomain, setCustomDomain] = useState(() => {
    const prefix = isSem8 ? 'majorProject2Registration' : 'majorProject1Registration';
    const saved = localStorage.getItem(`${prefix}_customDomain`);
    return saved || '';
  });
  // Default to 7 for Sem 7, 5 for Sem 8 (matching backend defaults)
  const [facultyPreferenceLimit, setFacultyPreferenceLimit] = useState(() => {
    return isSem8 ? 5 : 7;
  });
  const [minGroupMembers, setMinGroupMembers] = useState(4);
  const [maxGroupMembers, setMaxGroupMembers] = useState(5);
  const [allowedFacultyTypes, setAllowedFacultyTypes] = useState(['Regular', 'Adjunct', 'On Lien']);
  const [groupLoading, setGroupLoading] = useState(true);
  const validationAttemptedRef = React.useRef(false);
  const toastShownRef = React.useRef(false);

  // Validation: Check if student is in Sem 7 or Sem 8 and eligible
  useEffect(() => {
    // Wait for Sem 8 context to load before validating student type
    if (isSem8 && sem8Loading) {
      return; // Don't validate while loading
    }
    
    if (currentSemester !== 7 && currentSemester !== 8) {
      toast.error(`${isSem8 ? 'Major Project 2' : 'Major Project 1'} registration is only available for Semester ${isSem8 ? '8' : '7'} students`);
      navigate('/dashboard/student');
      return;
    }
    
    if (currentSemester === 7) {
    if (finalizedTrack !== 'coursework') {
      toast.error('Major Project 1 is only available for students finalized for coursework track');
      navigate('/dashboard/student');
      return;
    }
    } else if (currentSemester === 8) {
      // For Sem 8, Type 1 students must be in coursework track, Type 2 students must have chosen major2
      // Only validate if we have student type information
      if (studentType === 'type1') {
        // Type 1 students are auto-enrolled in coursework, so they should be eligible
        // Additional validation will happen in the group check
      } else if (studentType === 'type2') {
        // Type 2 students should have chosen major2 track
        // This will be validated in the registration function
      } else if (studentType === null || studentType === undefined) {
        // Still loading or unable to determine - wait a bit more
        // Don't show error yet, let the context finish loading
        return;
      } else {
        toast.error('Unable to determine student type for Major Project 2 registration');
        navigate('/dashboard/student');
        return;
      }
    }
  }, [roleData, user, finalizedTrack, navigate, currentSemester, isSem8, isType1, isType2, studentType, sem8Loading]);

  // Load group data
  useEffect(() => {
    const loadGroup = async () => {
      try {
        setGroupLoading(true);
        const targetSemester = isSem8 ? 8 : 7;
        const response = await studentAPI.getGroups({ semester: targetSemester });
        
        if (isSem8 && isType2) {
          // Type 2 students don't need a group (solo project)
          setGroupLoading(false);
          return;
        }
        
        if (response.success && response.data && response.data.length > 0) {
          // Group is already loaded in context, but we validate here
          if (response.data[0].status !== 'finalized') {
            if (!toastShownRef.current) {
            toast.error(`Your group must be finalized before registering ${isSem8 ? 'Major Project 2' : 'Major Project 1'}`);
              toastShownRef.current = true;
            }
            navigate('/dashboard/student');
            return;
          }
        } else {
          if (isSem8 && isType1) {
            if (!toastShownRef.current) {
            toast.error('You must be in a finalized group to register Major Project 2');
              toastShownRef.current = true;
            }
          } else if (!isSem8) {
            if (!toastShownRef.current) {
          toast.error('You must be in a finalized group to register Major Project 1');
              toastShownRef.current = true;
            }
          }
          navigate('/dashboard/student');
          return;
        }
      } catch (error) {
        console.error('Failed to load group:', error);
        if (!toastShownRef.current) {
        toast.error('Failed to load group information');
          toastShownRef.current = true;
        }
        navigate('/dashboard/student');
      } finally {
        setGroupLoading(false);
      }
    };
    
    if ((!isSem8 && finalizedTrack === 'coursework') || (isSem8 && (isType1 || isType2))) {
      loadGroup();
    }
  }, [finalizedTrack, navigate, isSem8, isType1, isType2]);

  // Validate group access
  useEffect(() => {
    const currentGroup = majorProjectGroup;
    
    // For Sem 8 Type 2, no group is needed (solo project)
    if (isSem8 && isType2) {
      return;
    }
    
    if (!groupLoading && currentGroup) {
      // Check if group is finalized
      if (currentGroup.status !== 'finalized') {
        if (!toastShownRef.current) {
        toast.error(`Your group must be finalized before registering ${isSem8 ? 'Major Project 2' : 'Major Project 1'}`);
          toastShownRef.current = true;
        }
        navigate('/dashboard/student');
        return;
      }

      // Check if user is group leader
      const isLeader = currentGroup.leader?._id === roleData?._id || 
                      currentGroup.leader === roleData?._id ||
                      (typeof currentGroup.leader === 'object' && currentGroup.leader._id === roleData?._id);
      
      if (!isLeader) {
        if (!toastShownRef.current) {
        toast.error('Only the group leader can register the project');
          toastShownRef.current = true;
        }
        navigate('/dashboard/student');
        return;
      }
      
      const memberCount = currentGroup.members?.filter(m => m.isActive !== false).length || 0;
      if (memberCount < minGroupMembers) {
        if (!toastShownRef.current) {
        toast.error(`Your group must have at least ${minGroupMembers} members before registering your project`);
          toastShownRef.current = true;
        }
        navigate('/dashboard/student');
        return;
      }
    }
  }, [groupLoading, majorProjectGroup, roleData, navigate, isSem8, isType2, minGroupMembers]);

  // Load system configs (faculty preference limit, min/max group members, allowed faculty types)
  useEffect(() => {
    const loadSystemConfigs = async () => {
      try {
        let configPrefix;
        if (isSem8) {
          // For Sem 8, differentiate between Type 1 (group) and Type 2 (solo)
          if (isType2) {
            configPrefix = 'sem8.major2.solo'; // Type 2: Solo project
          } else {
            configPrefix = 'sem8.major2.group'; // Type 1: Group project
          }
        } else {
          configPrefix = 'sem7.major1'; // Sem 7: Major Project 1
        }
        
        // Load configs based on prefix
        // For solo projects (Type 2), we don't need min/max group members
        const configPromises = isSem8 && isType2
          ? [
              studentAPI.getSystemConfig(`${configPrefix}.facultyPreferenceLimit`),
              Promise.resolve({ success: false }), // minResponse (not needed)
              Promise.resolve({ success: false }), // maxResponse (not needed)
              studentAPI.getSystemConfig(`${configPrefix}.allowedFacultyTypes`)
            ]
          : [
              studentAPI.getSystemConfig(`${configPrefix}.facultyPreferenceLimit`),
              studentAPI.getSystemConfig(`${configPrefix}.minGroupMembers`),
              studentAPI.getSystemConfig(`${configPrefix}.maxGroupMembers`),
              studentAPI.getSystemConfig(`${configPrefix}.allowedFacultyTypes`)
            ];
        
        const [limitResponse, minResponse, maxResponse, typesResponse] = await Promise.all(configPromises);
        
        // Set faculty preference limit
        if (limitResponse.success && limitResponse.data) {
          const limitValue = limitResponse.data.value || limitResponse.data.configValue;
          if (limitValue !== undefined && limitValue !== null) {
            setFacultyPreferenceLimit(limitValue);
          }
        } else if (!isSem8) {
          // Fallback for Sem 7 only
          try {
            const fallbackResponse = await studentAPI.getSystemConfig('sem5.facultyPreferenceLimit');
            if (fallbackResponse.success && fallbackResponse.data) {
              const fallbackValue = fallbackResponse.data.value || fallbackResponse.data.configValue;
              if (fallbackValue !== undefined && fallbackValue !== null) {
                setFacultyPreferenceLimit(fallbackValue);
              }
            }
          } catch (fallbackError) {
            // Ignore fallback errors
          }
        }
        
        // Set min/max group members
        if (minResponse.success && minResponse.data) {
          const minValue = minResponse.data.value || minResponse.data.configValue;
          if (minValue !== undefined && minValue !== null) {
            setMinGroupMembers(parseInt(minValue));
          }
        }
        
        if (maxResponse.success && maxResponse.data) {
          const maxValue = maxResponse.data.value || maxResponse.data.configValue;
          if (maxValue !== undefined && maxValue !== null) {
            setMaxGroupMembers(parseInt(maxValue));
          }
        }
        
        // Set allowed faculty types
        if (typesResponse.success && typesResponse.data?.value && Array.isArray(typesResponse.data.value)) {
          setAllowedFacultyTypes(typesResponse.data.value);
        }
      } catch (error) {
        // Only log non-404 errors to avoid console noise
        if (error.message && !error.message.includes('404') && !error.message.includes('not found')) {
          console.error('Failed to load system configs, using defaults:', error);
        }
        // Keep default values (already set in useState initialization)
      }
    };

    loadSystemConfigs();
  }, [isSem8, isType2]);

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

    // For Type 2 students: Step 2 is Faculty Preferences
    // For Type 1 students: Step 5 is Faculty Preferences
    // Wait for student type to be determined before loading
    if (isSem8 && (studentType === null || studentType === undefined)) {
      return; // Still loading student type
    }
    
    const facultyStep = (isSem8 && studentType === 'type2') ? 2 : 5;
    if (currentStep === facultyStep) {
      loadFacultyList();
    }
  }, [currentStep, isSem8, isType2, studentType]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm({
    defaultValues: {
      title: localStorage.getItem(`${storagePrefix}_title`) || '',
      domain: localStorage.getItem(`${storagePrefix}_domain`) || ''
    }
  });

  // Watch form fields for persistence
  const watchedTitle = watch('title');
  const watchedDomain = watch('domain');

  // Check if form was restored from localStorage
  useEffect(() => {
    const hasStoredData = localStorage.getItem(`${storagePrefix}_currentStep`) ||
                         localStorage.getItem(`${storagePrefix}_title`) ||
                         localStorage.getItem(`${storagePrefix}_domain`) ||
                         localStorage.getItem(`${storagePrefix}_facultyPreferences`);
    
    if (hasStoredData) {
      setIsRestoredFromStorage(true);
      setTimeout(() => setIsRestoredFromStorage(false), 5000);
    }
  }, [storagePrefix]);

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem(`${storagePrefix}_currentStep`, currentStep.toString());
  }, [currentStep, storagePrefix]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}_facultyPreferences`, JSON.stringify(facultyPreferences));
  }, [facultyPreferences, storagePrefix]);

  // Persist form data
  useEffect(() => {
    if (watchedTitle !== undefined) {
      localStorage.setItem(`${storagePrefix}_title`, watchedTitle || '');
    }
  }, [watchedTitle, storagePrefix]);

  useEffect(() => {
    if (watchedDomain !== undefined) {
      localStorage.setItem(`${storagePrefix}_domain`, watchedDomain || '');
    }
  }, [watchedDomain, storagePrefix]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}_customDomain`, customDomain);
  }, [customDomain, storagePrefix]);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      
      const projectData = {
        title: data.title,
        domain: data.domain === 'Other' ? customDomain : data.domain,
        facultyPreferences: facultyPreferences
      };

      // Use appropriate registration function based on semester
      if (isSem8) {
        await registerMajorProject2(projectData);
      } else {
      await registerMajorProject1(projectData);
      }
      
      // Clear localStorage on successful completion (use semester-specific keys)
      const storagePrefix = isSem8 ? 'majorProject2Registration' : 'majorProject1Registration';
      localStorage.removeItem(`${storagePrefix}_currentStep`);
      localStorage.removeItem(`${storagePrefix}_facultyPreferences`);
      localStorage.removeItem(`${storagePrefix}_title`);
      localStorage.removeItem(`${storagePrefix}_domain`);
      localStorage.removeItem(`${storagePrefix}_customDomain`);
      localStorage.removeItem(`${storagePrefix}_completed`);
      
      toast.success(`${isSem8 ? 'Major Project 2' : 'Major Project 1'} registered successfully!`);
      navigate('/dashboard/student');
    } catch (error) {
      toast.error(`Registration failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = () => {
    reset();
    // Clear localStorage persistence (use semester-specific keys)
    localStorage.removeItem(`${storagePrefix}_currentStep`);
    localStorage.removeItem(`${storagePrefix}_facultyPreferences`);
    localStorage.removeItem(`${storagePrefix}_title`);
    localStorage.removeItem(`${storagePrefix}_domain`);
    localStorage.removeItem(`${storagePrefix}_customDomain`);
    localStorage.removeItem(`${storagePrefix}_completed`);
    navigate('/dashboard/student');
  };

  // Helper to get the maximum step based on student type
  const getMaxStep = () => {
    // Type 2 solo projects: Step 1 (Project Details) -> Step 2 (Faculty Preferences)
    if (isSem8 && isType2) {
      return 2;
    }
    // Type 1 group projects: Step 3 (Group Verification) -> Step 4 (Project Details) -> Step 5 (Faculty Preferences)
    return 5;
  };

  // Helper to get the minimum step based on student type
  const getMinStep = () => {
    // Type 2 solo projects: Start at step 1
    if (isSem8 && isType2) {
      return 1;
    }
    // Type 1 group projects: Start at step 3
    return 3;
  };

  const nextStep = () => {
    const maxStep = getMaxStep();
    if (currentStep < maxStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    const minStep = getMinStep();
    if (currentStep > minStep) {
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
    if (!majorProjectGroup || !majorProjectGroup.members) return [];
    
    // Filter to only active members
    const activeMembers = majorProjectGroup.members.filter(m => m.isActive !== false);
    
    // Sort members: leader first, then members
    const sortedMembers = [...activeMembers].sort((a, b) => {
      if (a.role === 'leader') return -1;
      if (b.role === 'leader') return 1;
      return 0;
    });
    
    return sortedMembers;
  };

  const getGroupStats = () => {
    if (!majorProjectGroup) return { memberCount: 0 };
    // Count only active members
    const activeMembers = majorProjectGroup.members?.filter(m => m.isActive !== false) || [];
    return {
      memberCount: activeMembers.length
    };
  };

  const isGroupLeader = () => {
    if (!majorProjectGroup || !majorProjectGroup.leader) return false;
    return majorProjectGroup.leader?._id === roleData?._id || 
           majorProjectGroup.leader === roleData?._id ||
           (typeof majorProjectGroup.leader === 'object' && majorProjectGroup.leader._id === roleData?._id);
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

        {/* Group size summary */}
        <div className="bg-surface-50 border border-neutral-200 rounded-lg px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiUsers className="w-4 h-4 text-primary-600" />
          <div>
              <p className="text-xs font-semibold text-neutral-900">
                {memberCount} / {minGroupMembers}-{maxGroupMembers} members
              </p>
              {memberCount < minGroupMembers && (
                <p className="text-[11px] text-warning-700 mt-0.5">
                  Minimum required: {minGroupMembers}
                </p>
              )}
          </div>
        </div>
          {memberCount >= minGroupMembers && memberCount <= maxGroupMembers && (
            <div className="flex items-center gap-1 text-success-700">
              <FiCheckCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Valid</span>
          </div>
        )}
      </div>

        {/* Member cards */}
        <div className="space-y-2.5">
          {groupMembers.map((member, index) => (
            <div
              key={member._id || member.student?._id || index}
              className="bg-white border border-neutral-200 rounded-lg px-3 py-2.5 flex items-start gap-3"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
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
          <div className="flex flex-col items-center justify-center py-8">
            <FiLoader className="w-8 h-8 text-primary-600 animate-spin mb-3" />
            <span className="text-sm text-neutral-600">Loading faculty members...</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {/* Instructions */}
        <div className="bg-info-50 border border-info-200 rounded-lg px-3 py-2.5">
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

  // Show loading screen while group data is loading (only for Type 1, not Type 2)
  if ((groupLoading || sem7Loading || sem8Loading) && !(isSem8 && isType2)) {
    return (
      <Layout>
        <div className="h-[calc(100vh-64px)] bg-surface-200 flex items-center justify-center">
              <div className="text-center">
            <FiLoader className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-3" />
            <h2 className="text-base font-semibold text-neutral-900 mb-1">Loading registration form</h2>
            <p className="text-xs text-neutral-600">Fetching your group information...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Determine step labels and max step for right column
  const getStepLabel = (step) => {
    if (isSem8 && isType2) {
      return step === 1 ? 'Project Details' : 'Faculty Preferences';
    }
    return step === 3 ? 'Members' : step === 4 ? 'Project' : 'Faculty';
  };

  const maxStep = getMaxStep();
  const minStep = getMinStep();

  return (
    <Layout>
      <div className="h-[calc(100vh-64px)] bg-surface-200 overflow-hidden">
        <div className="h-full w-full px-2 sm:px-4 lg:px-6 py-2 flex flex-col">
          {/* Compact header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-neutral-900">
                {isSem8 ? 'Major Project 2' : 'Major Project 1'} – Registration
              </h1>
              <p className="mt-0.5 text-xs text-neutral-600">
                {isSem8 && isType2 
                  ? 'Register your solo Major Project 2 (Semester 8)' 
                  : `Register your B.Tech Semester ${currentSemester} ${isSem8 ? 'Major Project 2' : 'Major Project 1'}`}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
        </div>

          {/* Optional restore banner */}
        {isRestoredFromStorage && (
            <div className="mt-3 mb-1 rounded-lg border border-info-200 bg-info-50 px-3 py-2 flex items-center gap-2">
              <FiInfo className="h-4 w-4 text-info-500 flex-shrink-0" />
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
                <FiX className="h-3.5 w-3.5" />
                </button>
          </div>
        )}

          {/* Main layout */}
          <div className="mt-3 flex flex-col lg:flex-row gap-3 lg:gap-4 flex-1 min-h-0">
            {/* Left: multi-step form */}
            <div className="flex-[0.65] flex flex-col h-full min-h-0 space-y-3 overflow-y-auto custom-scrollbar pr-1">
              {/* Step card */}
              <div className="bg-white rounded-xl border border-neutral-200 flex flex-col">
                <div className="px-4 py-3 border-b border-neutral-200">
                  <h2 className="text-sm font-semibold text-neutral-900">
              {isSem8 && isType2 ? (
                <>
                        {currentStep === 1 && 'Step 1 · Project Details'}
                        {currentStep === 2 && 'Step 2 · Faculty Preferences'}
                </>
              ) : (
                <>
                        {currentStep === 3 && 'Step 3 · Group Member Verification'}
                        {currentStep === 4 && 'Step 4 · Project Details'}
                        {currentStep === 5 && 'Step 5 · Faculty Preferences'}
                </>
              )}
            </h2>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
              {isSem8 && isType2 ? (
                <>
                        {currentStep === 1 && 'Provide basic information about your project.'}
                        {currentStep === 2 && 'Choose and prioritize your preferred faculty mentors.'}
                </>
              ) : (
                <>
                        {currentStep === 3 && 'Review member information below.'}
                        {currentStep === 4 && 'Provide basic information about your project.'}
                        {currentStep === 5 && 'Choose and prioritize your preferred faculty mentors.'}
                </>
              )}
            </p>
          </div>

                <div className="px-4 py-3 flex-1 min-h-0 overflow-visible">
            {isSem8 && isType2 ? (
              <>
                {currentStep === 1 && renderStep4()}
                {currentStep === 2 && renderStep5()}
              </>
            ) : (
              <>
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
              </>
            )}
                </div>
          </div>
        </div>

            {/* Right: progress & info */}
            <div className="flex-[0.35] flex flex-col h-full min-h-0 space-y-3 mt-4 lg:mt-0 overflow-y-auto custom-scrollbar pl-1">
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
                    Step {currentStep} of {maxStep}
                  </span>
                </div>
                <div className="space-y-2">
                  {/* Completed steps for Type 1 */}
                  {!(isSem8 && isType2) && (
                    <>
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
                    </>
                  )}
                  
                  {/* Current steps */}
                  <div className="mt-1 space-y-1.5">
                    {Array.from({ length: maxStep - minStep + 1 }, (_, i) => {
                      const step = minStep + i;
                      const stepLabel = getStepLabel(step);
                      const isCompleted = currentStep > step;
                      const isCurrent = currentStep === step;
                      
                      return (
                        <div key={step}>
                          <div className="flex items-center justify-between text-[11px] text-neutral-600">
                            <span>Step {step} · {stepLabel}</span>
                            <span className={isCompleted || isCurrent ? 'text-success-700 font-semibold' : ''}>
                              {isCompleted ? 'Done' : isCurrent ? 'In progress' : 'Pending'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isCompleted || isCurrent ? 'bg-gradient-to-r from-primary-500 to-success-500' : 'bg-neutral-300'
                              }`}
                              style={{ width: isCompleted || isCurrent ? '100%' : '0%' }}
                            />
                          </div>
                        </div>
                      );
                    })}
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
                    About {isSem8 ? 'Major Project 2' : 'Major Project 1'}
                  </h3>
                </div>
                <div className="text-[11px] text-info-800 space-y-1.5">
                  {!(isSem8 && isType2) && (
                    <p>• <strong>Progress:</strong> Group formation and finalization are complete.</p>
                  )}
                  <p>
                    • <strong>Current step:</strong>{' '}
                    {isSem8 && isType2 
                ? (currentStep === 1 ? 'Entering project details' : 'Selecting faculty preferences')
                : (currentStep === 3 ? 'Verifying group member details' : currentStep === 4 ? 'Entering project details' : 'Selecting faculty preferences')
                    }
                  </p>
                  {!(isSem8 && isType2) && (
                    <p>• <strong>Leader only:</strong> Only the group leader can register the project details.</p>
                  )}
                  <p>• <strong>Faculty allocation:</strong> Faculty members review and choose projects based on your preferences.</p>
                  {!isSem8 && (
                    <p>• <strong>New Group:</strong> Major Project 1 requires a completely new group formation.</p>
                  )}
                  {isSem8 && isType1 && (
                    <p>• <strong>Group Project:</strong> Major Project 2 for Type 1 students requires a finalized group.</p>
                  )}
                  {isSem8 && isType2 && (
                    <p>• <strong>Solo Project:</strong> Major Project 2 for Type 2 students is a solo project (no group required).</p>
                  )}
                  <p>• <strong>Duration:</strong> Full semester project with regular evaluations.</p>
          </div>
        </div>

              {/* Tips */}
              <div className="bg-surface-100 rounded-xl border border-neutral-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center">
                    <FiZap className="w-3.5 h-3.5 text-primary-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Tips & Reminders
                  </h3>
                </div>
                <div className="text-[11px] text-neutral-700 space-y-1.5">
                  {currentStep === (isSem8 && isType2 ? 1 : 4) && (
                    <>
                      <p>• <strong>Title:</strong> Clear, specific, and under 100 characters.</p>
                      <p>• <strong>Domain:</strong> Choose a domain that aligns with your team's expertise.</p>
                      <p>• <strong>Scope:</strong> Ensure the project is achievable within one semester.</p>
                    </>
                  )}
                  {currentStep === (isSem8 && isType2 ? 2 : 5) && (
                    <>
                      <p>• <strong>Preferences:</strong> Select exactly {facultyPreferenceLimit} faculty members.</p>
                      <p>• <strong>Priority:</strong> Order matters - faculty will see your preferences in order.</p>
                      <p>• <strong>Research:</strong> Review faculty expertise before selecting.</p>
                    </>
                  )}
                  {currentStep === 3 && (
                    <>
                      <p>• <strong>Verification:</strong> Ensure all member details are correct.</p>
                      <p>• <strong>Group Size:</strong> Must have {minGroupMembers}-{maxGroupMembers} members.</p>
                      <p>• <strong>Updates:</strong> Members must update their profiles if information is incorrect.</p>
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

export default MajorProject1Registration;
