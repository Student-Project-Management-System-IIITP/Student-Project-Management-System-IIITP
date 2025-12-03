import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSem7Project } from '../../hooks/useSem7Project';
import { useSem8 } from '../../context/Sem8Context';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import { formatFacultyName } from '../../utils/formatUtils';
import { 
  FiArrowLeft, FiX, FiInfo, FiCheckCircle, FiAlertCircle, FiAlertTriangle, 
  FiTarget, FiFileText, FiUsers, FiUserPlus, FiChevronUp, FiChevronDown, 
  FiSearch, FiLoader, FiZap 
} from 'react-icons/fi';

const Internship1Registration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roleData } = useAuth();
  
  // Determine if this is Internship 2 registration route
  const isInternship2Route = location.pathname === '/student/sem8/internship2/register';
  
  const { 
    internship1Status: sem7Internship1Status,
    internship1Project: sem7Internship1Project,
    registerInternship1: sem7RegisterInternship1,
    loading: sem7Loading,
    trackChoice,
    fetchSem7Data
  } = useSem7Project();
  const { 
    sem8Status, 
    loading: sem8Loading,
    registerInternship2: sem8RegisterInternship2,
    internship2Status,
    internship2Project
  } = useSem8();
  
  // Determine current semester and student type
  const currentSemester = roleData?.semester || user?.semester;
  const isSem8 = currentSemester === 8;
  const isSem7 = currentSemester === 7;
  const isType1 = isSem8 && sem8Status?.studentType === 'type1';
  
  // Use appropriate status and project based on semester
  const internship1Status = isSem8 ? null : sem7Internship1Status;
  const internship1Project = isSem8 ? null : sem7Internship1Project;
  const loading = isSem8 ? sem8Loading : sem7Loading;

  // Initialize state from localStorage or defaults
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem(`internship1Registration_${isInternship2Route ? 'internship2' : 'internship1'}_currentStep`);
    return saved ? parseInt(saved) : 1;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [facultyPreferences, setFacultyPreferences] = useState(() => {
    const saved = localStorage.getItem(`internship1Registration_${isInternship2Route ? 'internship2' : 'internship1'}_facultyPreferences`);
    return saved ? JSON.parse(saved) : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [windowStatus, setWindowStatus] = useState(null);
  const [facultyPreferenceLimit, setFacultyPreferenceLimit] = useState(5);
  const [allowedFacultyTypes, setAllowedFacultyTypes] = useState(['Regular', 'Adjunct', 'On Lien']);
  const [customDomain, setCustomDomain] = useState(() => {
    const saved = localStorage.getItem(`internship1Registration_${isInternship2Route ? 'internship2' : 'internship1'}_customDomain`);
    return saved || '';
  });
  const [isRestoredFromStorage, setIsRestoredFromStorage] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm({
    defaultValues: {
      title: localStorage.getItem(`internship1Registration_${isInternship2Route ? 'internship2' : 'internship1'}_title`) || '',
      domain: localStorage.getItem(`internship1Registration_${isInternship2Route ? 'internship2' : 'internship1'}_domain`) || ''
    }
  });

  // State for Sem 8 Internship 1 status (only for Internship 1, not Internship 2)
  const [sem8Internship1Status, setSem8Internship1Status] = useState(null);
  const [sem8Internship1Project, setSem8Internship1Project] = useState(null);
  
  // Determine labels based on route
  const internshipLabel = isInternship2Route ? 'Internship 2' : 'Internship 1';
  const internshipProjectLabel = isInternship2Route ? 'Internship 2 Project' : 'Internship 1 Project';
  const storageKey = isInternship2Route ? 'internship2' : 'internship1';
  
  // Load eligibility status first
  useEffect(() => {
    if (isSem7 && !internship1Status && !sem7Loading) {
      fetchSem7Data();
    } else if (isSem8 && !isInternship2Route && !sem8Internship1Status && !sem8Loading) {
      const loadSem8Internship1Status = async () => {
        try {
          const response = await studentAPI.checkInternship1Status();
          if (response.success && response.data) {
            setSem8Internship1Status(response.data);
            if (response.data.existingProject) {
              setSem8Internship1Project(response.data.existingProject);
            }
          }
        } catch (error) {
          console.error('Failed to load Sem 8 Internship 1 status:', error);
        }
      };
      loadSem8Internship1Status();
    }
  }, [isSem7, isSem8, isInternship2Route, internship1Status, sem7Loading, sem8Internship1Status, sem8Loading, fetchSem7Data]);
  
  // Use the appropriate status and project based on route and semester
  const effectiveInternship1Status = isInternship2Route 
    ? internship2Status 
    : (isSem8 ? sem8Internship1Status : internship1Status);
  const effectiveInternship1Project = isInternship2Route
    ? internship2Project
    : (isSem8 ? sem8Internship1Project : internship1Project);

  // Combined validation: Check eligibility, track choice, and project status
  useEffect(() => {
    if (loading) return;
    
    if (!isSem7 && !isSem8) {
      toast.error(`${internshipLabel} registration is only available for Semester 7 or Semester 8 students`);
      navigate('/dashboard/student');
      return;
    }
    
    if (isSem8 && !isInternship2Route && !isType1) {
      toast.error(`Only Type 1 students (who completed 6-month internship in Sem 7) can register for ${internshipLabel} in Sem 8`);
      navigate('/dashboard/student');
      return;
    }

    if (effectiveInternship1Project && effectiveInternship1Project.status !== 'cancelled') {
      toast(`You have already registered for ${internshipLabel}`, { icon: 'ℹ️' });
      navigate(isInternship2Route ? '/student/sem8/internship2/dashboard' : '/dashboard/student');
      return;
    }

    if (effectiveInternship1Status) {
      if (!effectiveInternship1Status.eligible) {
        if (effectiveInternship1Status.reason) {
          toast.error(effectiveInternship1Status.reason);
        }
        navigate('/dashboard/student');
        return;
      }
    }
  }, [isSem7, isSem8, isType1, effectiveInternship1Status, effectiveInternship1Project, loading, navigate, internshipLabel, isInternship2Route]);

  // Check if form was restored from localStorage
  useEffect(() => {
    const hasStoredData = localStorage.getItem(`internship1Registration_${storageKey}_currentStep`) ||
                         localStorage.getItem(`internship1Registration_${storageKey}_title`) ||
                         localStorage.getItem(`internship1Registration_${storageKey}_domain`) ||
                         localStorage.getItem(`internship1Registration_${storageKey}_facultyPreferences`);
    
    if (hasStoredData) {
      setIsRestoredFromStorage(true);
      setTimeout(() => setIsRestoredFromStorage(false), 5000);
    }
  }, [storageKey]);

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem(`internship1Registration_${storageKey}_currentStep`, currentStep.toString());
  }, [currentStep, storageKey]);

  useEffect(() => {
    localStorage.setItem(`internship1Registration_${storageKey}_facultyPreferences`, JSON.stringify(facultyPreferences));
  }, [facultyPreferences, storageKey]);

  useEffect(() => {
    localStorage.setItem(`internship1Registration_${storageKey}_customDomain`, customDomain);
  }, [customDomain, storageKey]);

  // Load faculty preference limit and allowed faculty types from system config
  useEffect(() => {
    const loadSystemConfigs = async () => {
      try {
        if (isSem8) {
          if (isInternship2Route) {
            const [limitResponse, typesResponse] = await Promise.allSettled([
              studentAPI.getSystemConfig('sem8.internship2.facultyPreferenceLimit').catch(() => ({ success: false })),
              studentAPI.getSystemConfig('sem8.internship2.allowedFacultyTypes').catch(() => ({ success: false }))
            ]);
            
            if (limitResponse.status === 'fulfilled' && limitResponse.value?.success && limitResponse.value?.data?.value) {
              setFacultyPreferenceLimit(limitResponse.value.data.value);
            } else {
              setFacultyPreferenceLimit(5);
            }
            
            if (typesResponse.status === 'fulfilled' && typesResponse.value?.success && typesResponse.value?.data?.value && Array.isArray(typesResponse.value.data.value)) {
              setAllowedFacultyTypes(typesResponse.value.data.value);
            }
          } else {
            const [limitResponse, typesResponse] = await Promise.allSettled([
              studentAPI.getSystemConfig('sem8.internship1.facultyPreferenceLimit').catch(() => ({ success: false })),
              studentAPI.getSystemConfig('sem8.internship1.allowedFacultyTypes').catch(() => ({ success: false }))
            ]);
            
            if (limitResponse.status === 'fulfilled' && limitResponse.value?.success && limitResponse.value?.data?.value) {
              setFacultyPreferenceLimit(limitResponse.value.data.value);
            } else {
              try {
                const response = await studentAPI.getSystemConfig('sem7.internship1.facultyPreferenceLimit');
                if (response.success && response.data?.value) {
                  setFacultyPreferenceLimit(response.data.value);
                } else {
                  setFacultyPreferenceLimit(5);
                }
              } catch (error) {
                setFacultyPreferenceLimit(5);
              }
            }
            
            if (typesResponse.status === 'fulfilled' && typesResponse.value?.success && typesResponse.value?.data?.value && Array.isArray(typesResponse.value.data.value)) {
              setAllowedFacultyTypes(typesResponse.value.data.value);
            } else {
              try {
                const response = await studentAPI.getSystemConfig('sem7.internship1.allowedFacultyTypes');
                if (response.success && response.data?.value && Array.isArray(response.data.value)) {
                  setAllowedFacultyTypes(response.data.value);
                }
              } catch (error) {
                // Keep default
              }
            }
          }
        } else {
          const [limitResponse, typesResponse] = await Promise.allSettled([
            studentAPI.getSystemConfig('sem7.internship1.facultyPreferenceLimit').catch(() => ({ success: false })),
            studentAPI.getSystemConfig('sem7.internship1.allowedFacultyTypes').catch(() => ({ success: false }))
          ]);
          
          if (limitResponse.status === 'fulfilled' && limitResponse.value?.success && limitResponse.value?.data?.value) {
            setFacultyPreferenceLimit(limitResponse.value.data.value);
          } else {
            setFacultyPreferenceLimit(5);
          }
          
          if (typesResponse.status === 'fulfilled' && typesResponse.value?.success && typesResponse.value?.data?.value && Array.isArray(typesResponse.value.data.value)) {
            setAllowedFacultyTypes(typesResponse.value.data.value);
          }
        }
      } catch (error) {
        if (error.message && !error.message.includes('404') && !error.message.includes('not found')) {
          console.error('Failed to load system configs, using defaults:', error);
        }
      }
    };

    loadSystemConfigs();
  }, [isSem8, isInternship2Route]);

  // Load window status
  useEffect(() => {
    const checkWindow = async () => {
      try {
        const configKey = isSem8 
          ? (isInternship2Route ? 'sem8.internship2.registrationWindow' : 'sem8.internship1.registrationWindow')
          : 'sem7.internship1.registrationWindow';
        let response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/student/system-config/${configKey}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok && isSem8 && !isInternship2Route) {
          response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/student/system-config/sem7.internship1.registrationWindow`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
        }
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setWindowStatus(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to check window status:', error);
      }
    };
    checkWindow();
  }, [isSem8, isInternship2Route]);

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

    if (currentStep === 2) {
      loadFacultyList();
    }
  }, [currentStep]);

  const isWindowOpen = () => {
    if (!windowStatus || !windowStatus.value) return true;
    try {
      const windowData = typeof windowStatus.value === 'string' 
        ? JSON.parse(windowStatus.value) 
        : windowStatus.value;
      const now = new Date();
      const start = windowData.start ? new Date(windowData.start) : null;
      const end = windowData.end ? new Date(windowData.end) : null;
      
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    } catch (e) {
      return true;
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      if (facultyPreferences.length !== facultyPreferenceLimit) {
        toast.error(`Please select exactly ${facultyPreferenceLimit} faculty preferences`);
        return;
      }

      const projectData = {
        title: data.title,
        domain: data.domain === 'Other' ? customDomain : data.domain,
        facultyPreferences: facultyPreferences
      };

      // Clear localStorage on successful submission
      localStorage.removeItem(`internship1Registration_${storageKey}_currentStep`);
      localStorage.removeItem(`internship1Registration_${storageKey}_facultyPreferences`);
      localStorage.removeItem(`internship1Registration_${storageKey}_title`);
      localStorage.removeItem(`internship1Registration_${storageKey}_domain`);
      localStorage.removeItem(`internship1Registration_${storageKey}_customDomain`);

      if (isInternship2Route) {
        await sem8RegisterInternship2(projectData);
        toast.success('Internship 2 registered successfully!');
        navigate('/student/sem8/internship2/dashboard');
      } else if (isSem8) {
        const response = await studentAPI.registerInternship1(projectData);
        if (response.success) {
          const project = response.data?.project || response.data;
          if (project) {
            setSem8Internship1Project(project);
          }
          const statusResponse = await studentAPI.checkInternship1Status();
          if (statusResponse.success && statusResponse.data) {
            setSem8Internship1Status(statusResponse.data);
          }
        } else {
          throw new Error(response.message || 'Registration failed');
        }
        toast.success(`${internshipLabel} registered successfully!`);
        navigate('/dashboard/student');
      } else {
        await sem7RegisterInternship1(projectData);
        toast.success(`${internshipLabel} registered successfully!`);
        navigate('/dashboard/student');
      }
    } catch (error) {
      toast.error(`Registration failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = () => {
    reset();
    localStorage.removeItem(`internship1Registration_${storageKey}_currentStep`);
    localStorage.removeItem(`internship1Registration_${storageKey}_facultyPreferences`);
    localStorage.removeItem(`internship1Registration_${storageKey}_title`);
    localStorage.removeItem(`internship1Registration_${storageKey}_domain`);
    localStorage.removeItem(`internship1Registration_${storageKey}_customDomain`);
    navigate('/dashboard/student');
  };

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
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

  const watchedTitle = watch('title');
  const watchedDomain = watch('domain');

  // Persist form data
  useEffect(() => {
    if (watchedTitle !== undefined) {
      localStorage.setItem(`internship1Registration_${storageKey}_title`, watchedTitle || '');
    }
  }, [watchedTitle, storageKey]);

  useEffect(() => {
    if (watchedDomain !== undefined) {
      localStorage.setItem(`internship1Registration_${storageKey}_domain`, watchedDomain || '');
    }
  }, [watchedDomain, storageKey]);

  const renderStep1 = () => (
    <div className="space-y-5">
      <div>
        <label htmlFor="title" className="block text-xs font-medium text-neutral-600 mb-1.5">
          Proposed Title *
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
              value: 200,
              message: 'Title cannot exceed 200 characters'
            }
          })}
          className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm ${
            errors.title ? 'border-error-500' : 'border-neutral-300'
          }`}
          placeholder="Enter your proposed project title (you can write 'TBD' if not decided yet)"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-error-600">{errors.title.message}</p>
        )}
        <p className="mt-1 text-xs text-neutral-500">
          Note: You can write "TBD" if not decided yet. This can be changed later.
        </p>
      </div>

      <div>
        <label htmlFor="domain" className="block text-xs font-medium text-neutral-600 mb-1.5">
          Domain *
        </label>
        <div className="relative">
          <select
            id="domain"
            {...register('domain', {
              required: 'Please select a project domain'
            })}
            className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none text-sm pr-10 ${
              errors.domain ? 'border-error-500' : 'border-neutral-300'
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
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {errors.domain && (
          <p className="mt-1 text-xs text-error-600">{errors.domain.message}</p>
        )}
      
        {watchedDomain === 'Other' && (
          <div className="mt-3">
            <label htmlFor="customDomain" className="block text-xs font-medium text-neutral-600 mb-1.5">
              Specify Domain *
            </label>
            <input
              type="text"
              id="customDomain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              placeholder="Enter your custom domain"
              required={watchedDomain === 'Other'}
            />
            {watchedDomain === 'Other' && !customDomain.trim() && (
              <p className="mt-1 text-xs text-error-600">Please specify the domain</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={watchedDomain === 'Other' && !customDomain.trim()}
          className="px-4 py-2.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Faculty Preferences
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => {
    if (facultyList.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <FiLoader className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-neutral-600">Loading faculty members...</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {/* Instructions */}
        <div className="bg-info-50 border border-info-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <FiInfo className="w-4 h-4 text-info-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-xs font-medium text-info-800 mb-1.5">How to Select Faculty Preferences</h3>
              <div className="text-xs text-info-700 space-y-1">
                <p><strong>1. Browse Faculty:</strong> Use search or filter by department</p>
                <p><strong>2. Add Faculty:</strong> Click on any faculty member to add them</p>
                <p><strong>3. Reorder:</strong> Use ↑ ↓ arrows to change priority</p>
                <p><strong>4. Remove:</strong> Click × button to remove</p>
                <p><strong>5. Complete:</strong> Select exactly {facultyPreferenceLimit} faculty members</p>
                <p className="text-error-600 font-semibold mt-1.5">⚠️ Required: You must select exactly {facultyPreferenceLimit} faculty preferences</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Selected Preferences */}
          <div className="flex flex-col h-[22rem]">
            <div className="flex-shrink-0 mb-2">
              <h3 className="text-sm font-semibold text-neutral-900">
                Your Preferences ({facultyPreferences.length}/{facultyPreferenceLimit})
                {facultyPreferences.length === facultyPreferenceLimit && (
                  <span className="ml-2 text-xs text-success-600 font-medium">✓ Complete</span>
                )}
              </h3>
            </div>
            
            {facultyPreferences.length === 0 ? (
              <div className="flex-1 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center flex flex-col items-center justify-center">
                <FiUserPlus className="w-8 h-8 text-neutral-400 mb-2" />
                <p className="text-xs text-neutral-500 mb-1">No faculty selected yet</p>
                <p className="text-[10px] text-neutral-400">Click on faculty members from the right panel</p>
                <p className="text-[10px] text-error-500 font-medium mt-2">⚠️ You need to select exactly {facultyPreferenceLimit} faculty members</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {facultyPreferences.map((preference, index) => (
                  <div
                    key={preference.faculty._id}
                    className="bg-white border border-neutral-200 rounded-lg px-3 py-2.5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-primary-600">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-neutral-900 truncate">
                            {formatFacultyName(preference.faculty)}
                          </p>
                        </div>
                        <div className="text-[10px] text-neutral-500 flex-shrink-0">
                          {preference.faculty.department}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {index > 0 && (
                          <button
                            onClick={() => movePreference(index, index - 1)}
                            className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                            title="Move up"
                          >
                            <FiChevronUp className="w-3 h-3" />
                          </button>
                        )}
                        {index < facultyPreferences.length - 1 && (
                          <button
                            onClick={() => movePreference(index, index + 1)}
                            className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                            title="Move down"
                          >
                            <FiChevronDown className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => removeFacultyPreference(preference.faculty._id)}
                          className="p-1 text-error-400 hover:text-error-600 transition-colors"
                          title="Remove"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Faculty */}
          <div className="flex flex-col h-[22rem]">
            <div className="flex-shrink-0 mb-2">
              <h3 className="text-sm font-semibold text-neutral-900">Available Faculty</h3>
            </div>
            
            {/* Search and Filter */}
            <div className="flex-shrink-0 space-y-2 mb-2">
              <div className="relative">
                <FiSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search by faculty name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none pr-8"
                >
                  <option value="all">All Departments</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="ASH">ASH</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Faculty List */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1 pr-1">
              {getFilteredFaculty().length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <p className="text-xs">No faculty members found</p>
                  <p className="text-[10px] mt-1">Try adjusting your search or filter</p>
                </div>
              ) : (
                getFilteredFaculty().map(faculty => (
                  <div
                    key={faculty._id}
                    className="bg-white border border-neutral-200 rounded-lg px-3 py-2 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => addFacultyPreference(faculty)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-900 truncate">
                          {formatFacultyName(faculty)}
                        </p>
                      </div>
                      <div className="text-[10px] text-neutral-500 flex-shrink-0">
                        {faculty.department}
                      </div>
                      <div className="flex-shrink-0 ml-1">
                        <FiUserPlus className="w-3.5 h-3.5 text-neutral-400" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={prevStep}
            className="px-4 py-2.5 text-sm text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={facultyPreferences.length !== facultyPreferenceLimit || isSubmitting || loading || !isWindowOpen()}
            className={`px-6 py-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors flex items-center gap-2 ${
              facultyPreferences.length === facultyPreferenceLimit && isWindowOpen()
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" />
                Registering...
              </>
            ) : facultyPreferences.length === facultyPreferenceLimit ? (
              'Complete Registration'
            ) : (
              `Select ${facultyPreferenceLimit - facultyPreferences.length} More Faculty`
            )}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <FiLoader className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-neutral-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const windowOpen = isWindowOpen();

  return (
    <Layout>
      <div className="h-[calc(100vh-64px)] bg-surface-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard/student')}
                className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Back"
              >
                <FiArrowLeft className="w-5 h-5 text-neutral-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-neutral-900">{internshipLabel} Registration</h1>
                <p className="text-xs text-neutral-600">Solo Project • Faculty Mentored</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Close"
            >
              <FiX className="w-5 h-5 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 w-full px-3 py-3">
          <div className="h-full flex flex-col lg:flex-row gap-3 lg:gap-4">
            {/* Left Column */}
            <div className="flex-[0.65] flex flex-col h-full min-h-0 space-y-3 overflow-y-auto custom-scrollbar pr-1">
              {/* Restoration Banner */}
              {isRestoredFromStorage && (
                <div className="flex-shrink-0 bg-info-50 border border-info-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <FiInfo className="w-4 h-4 text-info-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-info-800">
                        We found your previous progress. Your form data has been restored.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Eligibility Status Banner */}
              {effectiveInternship1Status && (
                <div className={`flex-shrink-0 rounded-lg p-3 border ${
                  effectiveInternship1Status.eligible 
                    ? 'bg-success-50 border-success-200' 
                    : 'bg-error-50 border-error-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {effectiveInternship1Status.eligible ? (
                      <FiCheckCircle className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <FiAlertCircle className="w-4 h-4 text-error-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className={`text-xs font-medium ${
                        effectiveInternship1Status.eligible ? 'text-success-800' : 'text-error-800'
                      }`}>
                        {effectiveInternship1Status.eligible ? `Eligible for ${internshipLabel}` : 'Not Eligible'}
                      </h3>
                      {effectiveInternship1Status.reason && (
                        <p className={`text-xs mt-1 ${
                          effectiveInternship1Status.eligible ? 'text-success-700' : 'text-error-700'
                        }`}>
                          {effectiveInternship1Status.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Window Status Banner */}
              {!windowOpen && (
                <div className="flex-shrink-0 bg-warning-50 border border-warning-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <FiAlertTriangle className="w-4 h-4 text-warning-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-warning-800">
                      The registration window is currently closed. Please contact admin for more information.
                    </p>
                  </div>
                </div>
              )}

              {/* Step Card */}
              <div className="flex-shrink-0 bg-white rounded-xl shadow-sm border border-neutral-200">
                <div className="px-4 py-3 border-b border-neutral-200">
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Step {currentStep} · {currentStep === 1 ? 'Project Details' : 'Faculty Preferences'}
                  </h2>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {currentStep === 1 && 'Enter your project title and proposed area'}
                    {currentStep === 2 && `Select ${facultyPreferenceLimit} preferred faculty members`}
                  </p>
                </div>
                <div className="px-4 py-3 flex-1 min-h-0 overflow-visible">
                  {currentStep === 1 && <form onSubmit={handleSubmit(nextStep)}>{renderStep1()}</form>}
                  {currentStep === 2 && renderStep2()}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex-[0.35] flex flex-col h-full min-h-0 space-y-3 mt-4 lg:mt-0 overflow-y-auto custom-scrollbar pl-1">
              {/* Registration Progress */}
              <div className="flex-shrink-0 bg-surface-100 rounded-xl p-4 border border-neutral-200">
                <div className="flex items-center gap-2 mb-3">
                  <FiTarget className="w-4 h-4 text-primary-600" />
                  <h3 className="text-xs font-semibold text-neutral-900">Registration Progress</h3>
                </div>
                <p className="text-[10px] text-neutral-600 mb-3">Step {currentStep} of 2</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    {currentStep > 1 ? (
                      <FiCheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-neutral-300 rounded-full flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-medium text-neutral-800">Project Details</p>
                      <p className="text-[10px] text-neutral-600">{currentStep > 1 ? 'Completed' : currentStep === 1 ? 'In Progress' : 'Pending'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentStep >= 2 && facultyPreferences.length === facultyPreferenceLimit ? (
                      <FiCheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                    ) : (
                      <div className={`w-4 h-4 border-2 rounded-full flex-shrink-0 ${
                        currentStep === 2 ? 'border-primary-500 bg-primary-50' : 'border-neutral-300'
                      }`} />
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-medium text-neutral-800">Faculty Preferences</p>
                      <p className="text-[10px] text-neutral-600">
                        {currentStep >= 2 && facultyPreferences.length === facultyPreferenceLimit 
                          ? 'Completed' 
                          : currentStep === 2 
                          ? 'In Progress' 
                          : 'Pending'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-1 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-600 transition-all duration-300"
                    style={{ width: `${(currentStep / 2) * 100}%` }}
                  />
                </div>
              </div>

              {/* About Internship 1 */}
              <div className="flex-shrink-0 bg-info-50 rounded-xl p-4 border border-info-200">
                <div className="flex items-center gap-2 mb-3">
                  <FiInfo className="w-4 h-4 text-info-600" />
                  <h3 className="text-xs font-semibold text-info-900">About {internshipLabel}</h3>
                </div>
                <div className="text-xs text-info-800 space-y-1.5">
                  <p>• <strong>Type:</strong> Solo project under faculty mentor</p>
                  <p>• <strong>Eligibility:</strong> Students who have not completed an approved 2-month summer internship</p>
                  <p>• <strong>Faculty Preferences:</strong> Select exactly {facultyPreferenceLimit} faculty members</p>
                  <p>• <strong>Duration:</strong> Continues throughout {isSem8 ? 'Semester 8' : 'Semester 7'}</p>
                  <p>• <strong>Next Steps:</strong> After registration, faculty allocation will be processed based on your preferences</p>
                </div>
              </div>

              {/* Tips & Guidelines */}
              <div className="flex-shrink-0 bg-surface-100 rounded-xl p-4 border border-neutral-200">
                <div className="flex items-center gap-2 mb-3">
                  <FiZap className="w-4 h-4 text-warning-600" />
                  <h3 className="text-xs font-semibold text-neutral-900">Tips & Guidelines</h3>
                </div>
                <div className="text-xs text-neutral-700 space-y-1.5">
                  {currentStep === 1 ? (
                    <>
                      <p>• Write a clear, descriptive title</p>
                      <p>• You can use "TBD" if title is not finalized</p>
                      <p>• Choose a domain that matches your project focus</p>
                      <p>• Title and domain can be updated later</p>
                    </>
                  ) : (
                    <>
                      <p>• Research faculty expertise before selecting</p>
                      <p>• Consider faculty availability and workload</p>
                      <p>• Order preferences by priority (1 = highest)</p>
                      <p>• You can reorder preferences before submitting</p>
                    </>
                  )}
                </div>
              </div>

              {/* Important Notes */}
              <div className="flex-shrink-0 bg-warning-50 rounded-xl p-4 border border-warning-200">
                <div className="flex items-center gap-2 mb-3">
                  <FiAlertTriangle className="w-4 h-4 text-warning-600" />
                  <h3 className="text-xs font-semibold text-warning-900">Important Notes</h3>
                </div>
                <div className="text-xs text-warning-800 space-y-1.5">
                  <p>• Registration window may have time restrictions</p>
                  <p>• Faculty allocation is based on preferences and availability</p>
                  <p>• You will be notified once a faculty member is assigned</p>
                  <p>• Project details can be updated after registration</p>
                  <p>• Contact admin if you have questions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Internship1Registration;
