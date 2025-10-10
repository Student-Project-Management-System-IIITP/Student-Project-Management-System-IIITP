import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSem5Project } from '../../hooks/useSem5Project';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const MinorProject2Registration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { registerMinorProject2, loading } = useSem5Project();
  const { isInGroup, sem5Group, isGroupLeader, getGroupStats, loading: groupLoading } = useGroupManagement();
  
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
  const [customDomain, setCustomDomain] = useState(() => {
    const saved = localStorage.getItem('minorProject2Registration_customDomain');
    return saved || '';
  });
  const [facultyPreferenceLimit, setFacultyPreferenceLimit] = useState(7); // Default to 7
  // Simple access validation - only redirect if we have group data and conditions are not met
  useEffect(() => {
    // Only validate if we have group data loaded
    if (!groupLoading && sem5Group) {
      // Check if group is finalized
      if (sem5Group.status !== 'finalized') {
        toast.error('Your group must be finalized before registering your project');
        navigate('/dashboard/student');
        return;
      }

      // Check if user is group leader
      if (!isGroupLeader) {
        toast.error('Only the group leader can register the project');
      navigate('/dashboard/student');
      return;
    }
    
    const groupStats = getGroupStats();
    if (groupStats.memberCount < 2) {
      toast.error('Your group must have at least 2 members before registering your project');
      navigate('/dashboard/student');
      return;
    }
    }
  }, [groupLoading, sem5Group, isGroupLeader, getGroupStats, navigate]);

  // Load faculty preference limit from system config
  useEffect(() => {
    const loadFacultyPreferenceLimit = async () => {
      try {
        const response = await studentAPI.getSystemConfig('sem5.facultyPreferenceLimit');
        if (response.success && response.data) {
          setFacultyPreferenceLimit(response.data.value);
          console.log('Loaded faculty preference limit:', response.data.value);
        }
      } catch (error) {
        console.error('Failed to load faculty preference limit, using default:', error);
        // Keep default value of 7
      }
    };

    loadFacultyPreferenceLimit();
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
      const notSelected = !facultyPreferences.some(p => p.faculty._id === faculty._id);
      
      return matchesSearch && matchesDepartment && notSelected;
    });
  };

  const getGroupMembers = () => {
    if (!sem5Group || !sem5Group.members) return [];
    
    // Sort members: leader first, then members
    const sortedMembers = [...sem5Group.members].sort((a, b) => {
      if (a.role === 'leader') return -1;
      if (b.role === 'leader') return 1;
      return 0;
    });
    
    return sortedMembers;
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

      <div className="space-y-4">
        {getGroupMembers().map((member, index) => (
          <div key={member._id} className="bg-white border border-gray-200 rounded-lg p-4">
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
                  {member.student?.fullName || 'N/A'}
              </div>
            </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MIS No.</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                  {member.student?.misNumber || 'N/A'}
              </div>
            </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact No.</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                  {member.student?.contactNumber || 'N/A'}
            </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                  {member.student?.branch || 'N/A'}
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 4: Project Details</h2>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 5: Faculty Preferences</h2>
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
        <div className="text-center mb-5">
        </div>

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
            disabled={facultyPreferences.length !== facultyPreferenceLimit || isSubmitting || loading}
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

  // Show loading screen while group data is loading
  if (groupLoading) {
    return (
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

        {/* Progress Indicator */}
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

        {/* Group Information */}
        {sem5Group && (
          <div className="mb-6 bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-900">
                  Group Finalized ({getGroupStats().memberCount} members) - {sem5Group.name || 'Unnamed Group'}
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

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
             <h2 className="text-xl font-semibold text-gray-900">
               {currentStep === 3 && 'Step 3: Group Member Verification'}
               {currentStep === 4 && 'Step 4: Project Details'}
               {currentStep === 5 && 'Step 5: Faculty Preferences'}
             </h2>
             <p className="text-gray-600 mt-1">
               {currentStep === 3 && 'Verify group member details before proceeding'}
               {currentStep === 4 && 'Enter your project information'}
               {currentStep === 5 && 'Select your preferred faculty members'}
             </p>
          </div>

           <div className="p-6">
             {currentStep === 3 && renderStep3()}
             {currentStep === 4 && renderStep4()}
             {currentStep === 5 && renderStep5()}
           </div>
        </div>

        {/* Information Card */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">About Minor Project 2 Registration</h3>
          <div className="text-blue-800 space-y-2">
            <p>• <strong>Progress:</strong> You have successfully completed group formation and finalization ✅</p>
            <p>• <strong>Current Step:</strong> {currentStep === 3 ? 'Verifying group member details' : currentStep === 4 ? 'Entering project details' : 'Selecting faculty preferences'}</p>
            <p>• <strong>Leader Only:</strong> Only the group leader can register the project details</p>
            <p>• <strong>Faculty Allocation:</strong> Faculty selection will be processed after registration</p>
            <p>• <strong>Duration:</strong> 4-5 months of development and implementation</p>
            <p>• <strong>Evaluation:</strong> Group presentation and individual contribution assessment</p>
            <p>• <strong>Next Steps:</strong> After registration, faculty allocation will be processed based on your preferences</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinorProject2Registration;
