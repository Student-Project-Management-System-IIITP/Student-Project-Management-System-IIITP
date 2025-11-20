import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSem7Project } from '../../hooks/useSem7Project';
import { useSem8 } from '../../context/Sem8Context';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';

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
  const internship1Status = isSem8 ? null : sem7Internship1Status; // Will load separately for Sem 8
  const internship1Project = isSem8 ? null : sem7Internship1Project; // Will load separately for Sem 8
  const loading = isSem8 ? sem8Loading : sem7Loading;

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [facultyPreferences, setFacultyPreferences] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [windowStatus, setWindowStatus] = useState(null);
  const [facultyPreferenceLimit, setFacultyPreferenceLimit] = useState(5); // Default to 5

  const [customDomain, setCustomDomain] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: {
      title: '',
      domain: ''
    }
  });

  // State for Sem 8 Internship 1 status (only for Internship 1, not Internship 2)
  const [sem8Internship1Status, setSem8Internship1Status] = useState(null);
  const [sem8Internship1Project, setSem8Internship1Project] = useState(null);
  
  // Load eligibility status first
  useEffect(() => {
    if (isSem7 && !internship1Status && !sem7Loading) {
      fetchSem7Data();
    } else if (isSem8 && !isInternship2Route && !sem8Internship1Status && !sem8Loading) {
      // Load Internship 1 status for Sem 8 Type 1 students (not Internship 2)
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
    // For Internship 2 route, status is already loaded via useSem8 hook
  }, [isSem7, isSem8, isInternship2Route, internship1Status, sem7Loading, sem8Internship1Status, sem8Loading, fetchSem7Data]);
  
  // Use the appropriate status and project based on route and semester
  const effectiveInternship1Status = isInternship2Route 
    ? internship2Status 
    : (isSem8 ? sem8Internship1Status : internship1Status);
  const effectiveInternship1Project = isInternship2Route
    ? internship2Project
    : (isSem8 ? sem8Internship1Project : internship1Project);

  // Combined validation: Check eligibility, track choice, and project status
  // Only run after all data is loaded to avoid false positives and duplicate errors
  useEffect(() => {
    // Don't validate while loading
    if (loading) return;
    
    // Wait for data to be loaded
    if (!isSem7 && !isSem8) {
      const internshipLabel = isInternship2Route ? 'Internship 2' : 'Internship 1';
      toast.error(`${internshipLabel} registration is only available for Semester 7 or Semester 8 students`);
      navigate('/dashboard/student');
      return;
    }
    
    // For Sem 8 Internship 1, check if Type 1 student
    if (isSem8 && !isInternship2Route && !isType1) {
      toast.error('Only Type 1 students (who completed 6-month internship in Sem 7) can register for Internship 1 in Sem 8');
      navigate('/dashboard/student');
      return;
    }
    
    // For Sem 8 Internship 2, Type 1 students are eligible (summer internship failed/absent)
    // Eligibility is checked via internship2Status from backend

    // Check if already registered (exclude cancelled projects)
    if (effectiveInternship1Project && effectiveInternship1Project.status !== 'cancelled') {
      const internshipLabel = isInternship2Route ? 'Internship 2' : 'Internship 1';
      toast(`You have already registered for ${internshipLabel}`, { icon: 'ℹ️' });
      navigate(isInternship2Route ? '/student/sem8/internship2/dashboard' : '/dashboard/student');
      return;
    }

    // Check eligibility status from backend (this includes track choice check)
    // This is the single source of truth - don't duplicate track choice check
    if (effectiveInternship1Status) {
      if (!effectiveInternship1Status.eligible) {
        // Only show error if we have a reason (backend should provide it)
        if (effectiveInternship1Status.reason) {
          toast.error(effectiveInternship1Status.reason);
        }
        navigate('/dashboard/student');
        return;
      }
      // If eligible, allow access to registration form
    } else {
      // If no eligibility status yet, wait (data might still be loading)
      // Don't show error yet
      return;
    }
  }, [isSem7, isSem8, isType1, effectiveInternship1Status, effectiveInternship1Project, loading, navigate]);

  // Load faculty preference limit from system config
  useEffect(() => {
    const loadFacultyPreferenceLimit = async () => {
      try {
        // Try semester-specific Internship limit first
        if (isSem8) {
          if (isInternship2Route) {
            // For Internship 2: Try Sem 8 Internship 2 config, then default to 5
            try {
              const response = await studentAPI.getSystemConfig('sem8.internship2.facultyPreferenceLimit');
              if (response.success && response.data) {
                setFacultyPreferenceLimit(response.data.value);
                return;
              }
            } catch (error) {
              // Config doesn't exist, use default
            }
            // Default to 5 for Sem 8 Internship 2
            setFacultyPreferenceLimit(5);
          } else {
            // For Sem 8 Internship 1: Try Sem 8 specific config, then Sem 7 config, then default to 5
            try {
              const response = await studentAPI.getSystemConfig('sem8.internship1.facultyPreferenceLimit');
              if (response.success && response.data) {
                setFacultyPreferenceLimit(response.data.value);
                return;
              }
            } catch (error) {
              // Config doesn't exist, continue to next check
            }
            
            // Fallback to Sem 7 Internship 1 limit
            try {
              const response = await studentAPI.getSystemConfig('sem7.internship1.facultyPreferenceLimit');
              if (response.success && response.data) {
                setFacultyPreferenceLimit(response.data.value);
                return;
              }
            } catch (error) {
              // Config doesn't exist, use default
            }
            
            // Default to 5 for Sem 8 Internship 1
            setFacultyPreferenceLimit(5);
          }
        } else {
          // For Sem 7: Try Sem 7 specific config, then default to 5
          // Note: We don't fallback to sem5.facultyPreferenceLimit (which is 7) for Internship 1
          try {
            const response = await studentAPI.getSystemConfig('sem7.internship1.facultyPreferenceLimit');
            if (response.success && response.data) {
              setFacultyPreferenceLimit(response.data.value);
              return;
            }
          } catch (error) {
            // Config doesn't exist, use default
          }
          
          // Default to 5 for Sem 7 Internship 1
          setFacultyPreferenceLimit(5);
        }
      } catch (error) {
        console.error('Failed to load faculty preference limit, using default:', error);
        // Keep default value of 5
        setFacultyPreferenceLimit(5);
      }
    };

    loadFacultyPreferenceLimit();
  }, [isSem8]);

  // Load window status
  useEffect(() => {
    const checkWindow = async () => {
      try {
        // Try semester-specific window first
        const configKey = isSem8 
          ? (isInternship2Route ? 'sem8.internship2.registrationWindow' : 'sem8.internship1.registrationWindow')
          : 'sem7.internship1.registrationWindow';
        let response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/student/system-config/${configKey}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        // Fallback to Sem 7 window if Sem 8 window doesn't exist (only for Internship 1, not Internship 2)
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
  }, [isSem8]);

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

      // Use appropriate registration function based on route
      if (isInternship2Route) {
        // Register Internship 2 using Sem8Context function
        await sem8RegisterInternship2(projectData);
        toast.success('Internship 2 registered successfully!');
        navigate('/student/sem8/internship2/dashboard');
      } else if (isSem8) {
        // Register Internship 1 for Sem 8 Type 1 students
        const response = await studentAPI.registerInternship1(projectData);
        if (response.success) {
          // Refresh Sem 8 data - response.data contains { project, facultyPreference, allocationStatus }
          const project = response.data?.project || response.data;
          if (project) {
            setSem8Internship1Project(project);
          }
          // Refresh status
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
        // Register Internship 1 for Sem 7
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
      const notSelected = !facultyPreferences.some(p => p.faculty._id === faculty._id);
      
      return matchesSearch && matchesDepartment && notSelected;
    });
  };

  const watchedDomain = watch('domain');

  // Determine labels based on route
  const internshipLabel = isInternship2Route ? 'Internship 2' : 'Internship 1';
  const internshipProjectLabel = isInternship2Route ? 'Internship 2 Project' : 'Internship 1 Project';

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 1: Project Details</h2>
        <p className="text-gray-600">Enter your {internshipLabel} project details</p>
      </div>

      <form onSubmit={handleSubmit(nextStep)} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
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
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your proposed project title (you can write 'TBD' if not decided yet)"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Note: You can write "TBD" if not decided yet. This can be changed later.
          </p>
        </div>

        <div>
          <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
            Domain *
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">About {internshipLabel}</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>This is a solo project that you will complete under a faculty mentor. You need to select {facultyPreferenceLimit} faculty preferences.</p>
                <p className="mt-1">Note: You can write "TBD" for the proposed title if not decided yet. This can be changed later.</p>
              </div>
            </div>
          </div>
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
            type="submit"
            disabled={watchedDomain === 'Other' && !customDomain.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Faculty Preferences
          </button>
        </div>
      </form>
    </div>
  );

  const renderStep2 = () => {
    if (facultyList.length === 0) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 2: Faculty Preferences</h2>
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
            disabled={facultyPreferences.length !== facultyPreferenceLimit || isSubmitting || loading || !isWindowOpen()}
            className={`px-6 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center ${
              facultyPreferences.length === facultyPreferenceLimit && isWindowOpen()
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const windowOpen = isWindowOpen();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{internshipLabel} Registration</h1>
          <p className="text-gray-600">
            Register for your solo {internshipLabel} project (2-month internship project under faculty mentor)
          </p>
        </div>

        {/* Eligibility Status */}
        {effectiveInternship1Status && (
          <div className={`mb-6 p-4 rounded-lg border ${
            effectiveInternship1Status.eligible 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {effectiveInternship1Status.eligible ? (
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  effectiveInternship1Status.eligible ? 'text-green-800' : 'text-red-800'
                }`}>
                  {effectiveInternship1Status.eligible ? `Eligible for ${internshipLabel}` : 'Not Eligible'}
                </h3>
                {effectiveInternship1Status.reason && (
                  <p className={`text-sm mt-1 ${
                    effectiveInternship1Status.eligible ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {effectiveInternship1Status.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Window Status */}
        {!windowOpen && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              The registration window is currently closed. Please contact admin for more information.
            </p>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mb-8">
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
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentStep === 1 && 'Step 1: Project Details'}
              {currentStep === 2 && 'Step 2: Faculty Preferences'}
            </h2>
            <p className="text-gray-600 mt-1">
              {currentStep === 1 && 'Enter your project title and proposed area'}
              {currentStep === 2 && 'Select 1 to 5 preferred faculty members'}
            </p>
          </div>

          <div className="p-6">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
          </div>
        </div>

        {/* Information Card */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">About {internshipLabel}</h3>
          <div className="text-blue-800 space-y-2">
            <p>• <strong>Type:</strong> Solo project under faculty mentor</p>
            <p>• <strong>Eligibility:</strong> Students who have not completed an approved 2-month summer internship</p>
            <p>• <strong>Faculty Preferences:</strong> Select exactly {facultyPreferenceLimit} faculty members as your preferences</p>
            <p>• <strong>Duration:</strong> Continues throughout Semester 7</p>
            <p>• <strong>Next Steps:</strong> After registration, faculty allocation will be processed based on your preferences</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Internship1Registration;

