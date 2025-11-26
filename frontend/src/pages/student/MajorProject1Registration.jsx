import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSem7Project } from '../../hooks/useSem7Project';
import { useSem8Project } from '../../hooks/useSem8Project';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';

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
            toast.error(`Your group must be finalized before registering ${isSem8 ? 'Major Project 2' : 'Major Project 1'}`);
            navigate('/dashboard/student');
            return;
          }
        } else {
          if (isSem8 && isType1) {
            toast.error('You must be in a finalized group to register Major Project 2');
          } else if (!isSem8) {
          toast.error('You must be in a finalized group to register Major Project 1');
          }
          navigate('/dashboard/student');
          return;
        }
      } catch (error) {
        console.error('Failed to load group:', error);
        toast.error('Failed to load group information');
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
        toast.error(`Your group must be finalized before registering ${isSem8 ? 'Major Project 2' : 'Major Project 1'}`);
        navigate('/dashboard/student');
        return;
      }

      // Check if user is group leader
      const isLeader = currentGroup.leader?._id === roleData?._id || 
                      currentGroup.leader === roleData?._id ||
                      (typeof currentGroup.leader === 'object' && currentGroup.leader._id === roleData?._id);
      
      if (!isLeader) {
        toast.error('Only the group leader can register the project');
        navigate('/dashboard/student');
        return;
      }
      
      const memberCount = currentGroup.members?.filter(m => m.isActive !== false).length || 0;
      if (memberCount < minGroupMembers) {
        toast.error(`Your group must have at least ${minGroupMembers} members before registering your project`);
        navigate('/dashboard/student');
        return;
      }
    }
  }, [groupLoading, majorProjectGroup, roleData, navigate, isSem8, isType2]);

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
    toast.success(`${faculty.fullName} added to preferences`);
  };

  const removeFacultyPreference = (facultyId) => {
    const facultyToRemove = facultyPreferences.find(p => p.faculty._id === facultyId);
    const updatedPreferences = facultyPreferences
      .filter(p => p.faculty._id !== facultyId)
      .map((p, index) => ({ ...p, priority: index + 1 }));
    
    setFacultyPreferences(updatedPreferences);
    if (facultyToRemove) {
      toast.success(`${facultyToRemove.faculty.fullName} removed from preferences`);
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
    return {
      memberCount: majorProjectGroup.members?.length || 0
    };
  };

  const isGroupLeader = () => {
    if (!majorProjectGroup || !majorProjectGroup.leader) return false;
    return majorProjectGroup.leader?._id === roleData?._id || 
           majorProjectGroup.leader === roleData?._id ||
           (typeof majorProjectGroup.leader === 'object' && majorProjectGroup.leader._id === roleData?._id);
  };

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 3: Group Member Verification</h2>
        <p className="text-gray-600">Please verify the details of all group members. These details will be forwarded to the admin.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Important Note</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>If any changes are required in these details, students will need to make those changes from their profile page.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Group Size Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Group Size</p>
            <p className="text-xs text-gray-500 mt-1">
              Current: <span className="font-semibold">{getGroupMembers().length}</span> member{getGroupMembers().length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Required Range</p>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-semibold">{minGroupMembers}-{maxGroupMembers}</span> members
            </p>
          </div>
        </div>
        {getGroupMembers().length < minGroupMembers && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">
              ⚠️ Your group needs at least {minGroupMembers} members to proceed. Current: {getGroupMembers().length}
            </p>
          </div>
        )}
        {getGroupMembers().length >= minGroupMembers && getGroupMembers().length <= maxGroupMembers && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-xs text-green-800">
              ✓ Your group size is within the required range ({minGroupMembers}-{maxGroupMembers} members)
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {getGroupMembers().map((member, index) => (
          <div key={member._id || member.student?._id || index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Group Member {index + 1} {member.role === 'leader' && '(Leader)'}
              </h3>
              {member.role === 'leader' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  👑 Leader
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                  {member.student?.fullName || member.fullName || 'N/A'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MIS No.</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                  {member.student?.misNumber || member.misNumber || 'N/A'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact No.</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                  {member.student?.contactNumber || member.contactNumber || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                  {member.student?.branch || member.branch || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Continue to Project Details
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isSem8 && isType2 ? 'Step 1: Project Details' : 'Step 4: Project Details'}
        </h2>
        <p className="text-gray-600">Enter your project details. These can be changed later.</p>
      </div>

      <form onSubmit={handleSubmit(nextStep)} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Proposed Project Title *
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
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your project title"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
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

        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isSem8 && isType2 ? 'Step 2: Faculty Preferences' : 'Step 5: Faculty Preferences'}
            </h2>
            <p className="text-gray-600">Loading faculty list...</p>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading faculty members...</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">How to Select Faculty Preferences</h3>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <p><strong>1. Browse Faculty:</strong> Use the search box to find faculty by name, or filter by department</p>
                <p><strong>2. Add Faculty:</strong> Click on any faculty member from the right panel to add them to your preferences</p>
                <p><strong>3. Reorder:</strong> Use the ↑ ↓ arrows next to each selected faculty to change their priority order</p>
                <p><strong>4. Remove:</strong> Click the × button to remove any faculty from your preferences</p>
                <p><strong>5. Complete:</strong> Select exactly {facultyPreferenceLimit} faculty members and click "Complete Registration"</p>
                <p className="text-red-600 font-semibold"><strong>⚠️ Required:</strong> You must select exactly {facultyPreferenceLimit} faculty preferences to proceed</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selected Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Preferences ({facultyPreferences.length}/{facultyPreferenceLimit})
              {facultyPreferences.length === facultyPreferenceLimit && (
                <span className="ml-2 text-sm text-green-600 font-medium">✓ Complete</span>
              )}
            </h3>
            
            {facultyPreferences.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No faculty selected yet</p>
                <p className="text-xs text-gray-400">Click on faculty members from the right panel to add them to your preferences</p>
                <p className="text-xs text-red-500 font-medium mt-2">⚠️ You need to select exactly {facultyPreferenceLimit} faculty members</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
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
                            {preference.faculty.fullName}
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
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Move up"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                        )}
                        {index < facultyPreferences.length - 1 && (
                          <button
                            onClick={() => movePreference(index, index + 1)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Move down"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => removeFacultyPreference(preference.faculty._id)}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Remove"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Faculty */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Available Faculty</h3>
            
            {/* Search and Filter */}
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Search by faculty name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Departments</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="ASH">ASH</option>
                </select>
              </div>
            </div>

            {/* Faculty List */}
            <div className="max-h-80 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
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
                            {faculty.fullName}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {faculty.department}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
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
            disabled={facultyPreferences.length !== facultyPreferenceLimit || isSubmitting || sem7Loading}
            className={`px-6 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center ${
              facultyPreferences.length === facultyPreferenceLimit
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registering...
              </>
            ) : facultyPreferences.length === facultyPreferenceLimit ? (
              'Complete Registration'
            ) : (
              `Select ${facultyPreferenceLimit - facultyPreferences.length} More Faculty`
            )}
          </button>
        </div>

        {facultyPreferences.length !== facultyPreferenceLimit && (
          <div className="text-center text-sm text-gray-500">
            {facultyPreferences.length === 0 
              ? `Please select exactly ${facultyPreferenceLimit} faculty preferences to complete registration`
              : `Please select ${facultyPreferenceLimit - facultyPreferences.length} more faculty preferences to complete registration`
            }
          </div>
        )}
      </div>
    );
  };

  // Show loading screen while group data is loading (only for Type 1, not Type 2)
  if ((groupLoading || sem7Loading || sem8Loading) && !(isSem8 && isType2)) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Registration Form</h2>
                <p className="text-gray-600">Please wait while we load your group information...</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isSem8 ? 'Major Project 2' : 'Major Project 1'} Registration
              </h1>
              <p className="mt-2 text-gray-600">
                {isSem8 && isType2 
                  ? 'Register for your solo Major Project 2 (Semester 8)' 
                  : `Register for your B.Tech Semester ${currentSemester} ${isSem8 ? 'Major Project 2' : 'Major Project 1'}`}
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
          {isSem8 && isType2 ? (
            // Type 2 Solo Project: Only 2 steps
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className={`w-8 h-8 ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-300'} text-white rounded-full flex items-center justify-center text-sm font-medium`}>
                  1
                </div>
                <span className={`ml-2 text-sm ${currentStep >= 1 ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                  Project Details
                </span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200">
                <div className={`h-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'} w-1/2`}></div>
              </div>
              <div className="flex items-center">
                <div className={`w-8 h-8 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'} text-white rounded-full flex items-center justify-center text-sm font-medium`}>
                  2
                </div>
                <span className={`ml-2 text-sm ${currentStep >= 2 ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                  Faculty Preferences
                </span>
              </div>
            </div>
          ) : (
            // Type 1 Group Project: 5 steps (includes group verification)
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                ✓
              </div>
              <span className="ml-2 text-sm font-medium text-green-600">Group Formation</span>
            </div>
            <div className="flex-1 h-0.5 bg-green-600"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                ✓
              </div>
              <span className="ml-2 text-sm font-medium text-green-600">Group Finalized</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200">
              <div className={`h-full ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'} w-1/3`}></div>
            </div>
            <div className="flex items-center">
              <div className={`w-8 h-8 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'} text-white rounded-full flex items-center justify-center text-sm font-medium`}>
                3
              </div>
              <span className={`ml-2 text-sm ${currentStep >= 3 ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                Member Verification
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200">
              <div className={`h-full ${currentStep >= 4 ? 'bg-blue-600' : 'bg-gray-200'} w-1/3`}></div>
            </div>
            <div className="flex items-center">
              <div className={`w-8 h-8 ${currentStep >= 4 ? 'bg-blue-600' : 'bg-gray-300'} text-white rounded-full flex items-center justify-center text-sm font-medium`}>
                4
              </div>
              <span className={`ml-2 text-sm ${currentStep >= 4 ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                Project Details
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200">
              <div className={`h-full ${currentStep >= 5 ? 'bg-blue-600' : 'bg-gray-200'} w-1/3`}></div>
            </div>
            <div className="flex items-center">
              <div className={`w-8 h-8 ${currentStep >= 5 ? 'bg-blue-600' : 'bg-gray-300'} text-white rounded-full flex items-center justify-center text-sm font-medium`}>
                5
              </div>
              <span className={`ml-2 text-sm ${currentStep >= 5 ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                Faculty Preferences
              </span>
            </div>
          </div>
          )}
        </div>

        {/* Restoration Banner */}
        {isRestoredFromStorage && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Form Restored</h3>
                <p className="text-sm text-blue-700">
                  Your registration progress has been restored from your previous session.
                </p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => setIsRestoredFromStorage(false)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Group Information - Only show for Type 1 group projects */}
        {majorProjectGroup && !(isSem8 && isType2) && (
          <div className="mb-6 bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-900">
                  Group Finalized ({getGroupStats().memberCount} members) - {majorProjectGroup.name || 'Unnamed Group'}
                </h3>
                <p className="text-xs text-green-700">
                  Your group has been finalized and you can now register your project details
                </p>
                <p className="text-xs text-green-600 mt-1">
                  👑 You are the group leader - only you can register the project
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Type 2 Solo Project Info */}
        {isSem8 && isType2 && (
          <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Solo Major Project 2
                </h3>
                <p className="text-xs text-blue-700">
                  You are registering a solo Major Project 2. No group is required.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isSem8 && isType2 ? (
                <>
                  {currentStep === 1 && 'Step 1: Project Details'}
                  {currentStep === 2 && 'Step 2: Faculty Preferences'}
                </>
              ) : (
                <>
              {currentStep === 3 && 'Step 3: Group Member Verification'}
              {currentStep === 4 && 'Step 4: Project Details'}
              {currentStep === 5 && 'Step 5: Faculty Preferences'}
                </>
              )}
            </h2>
            <p className="text-gray-600 mt-1">
              {isSem8 && isType2 ? (
                <>
                  {currentStep === 1 && 'Enter your project information'}
                  {currentStep === 2 && 'Select your preferred faculty members'}
                </>
              ) : (
                <>
              {currentStep === 3 && 'Verify group member details before proceeding'}
              {currentStep === 4 && 'Enter your project information'}
              {currentStep === 5 && 'Select your preferred faculty members'}
                </>
              )}
            </p>
          </div>

          <div className="p-6">
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

        {/* Information Card */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">About {isSem8 ? 'Major Project 2' : 'Major Project 1'} Registration</h3>
          <div className="text-blue-800 space-y-2">
            {(!isSem8 || isType1) && <p>• <strong>Progress:</strong> You have successfully completed group formation and finalization ✅</p>}
            <p>• <strong>Current Step:</strong> {
              isSem8 && isType2 
                ? (currentStep === 1 ? 'Entering project details' : 'Selecting faculty preferences')
                : (currentStep === 3 ? 'Verifying group member details' : currentStep === 4 ? 'Entering project details' : 'Selecting faculty preferences')
            }</p>
            {(!isSem8 || isType1) && <p>• <strong>Leader Only:</strong> Only the group leader can register the project details</p>}
            <p>• <strong>Faculty Allocation:</strong> Faculty selection will be processed after registration</p>
            {!isSem8 && <p>• <strong>New Group:</strong> Major Project 1 requires a completely new group formation (cannot use previous semester groups)</p>}
            {isSem8 && isType1 && <p>• <strong>Group Project:</strong> Major Project 2 for Type 1 students requires a finalized group (Sem 8)</p>}
            {isSem8 && isType2 && <p>• <strong>Solo Project:</strong> Major Project 2 for Type 2 students is a solo project (no group required)</p>}
            <p>• <strong>Next Steps:</strong> After registration, faculty allocation will be processed based on your preferences</p>
          </div>
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default MajorProject1Registration;

