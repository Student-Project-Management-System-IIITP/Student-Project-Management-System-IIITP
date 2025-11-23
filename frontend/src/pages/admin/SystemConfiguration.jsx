import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const SystemConfiguration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('sem5'); // 'sem5', 'sem7', or 'sem8'
  
  // Sem 5 configs
  const [configs, setConfigs] = useState([]);
  const [facultyPreferenceLimit, setFacultyPreferenceLimit] = useState(7);
  const [minGroupMembers, setMinGroupMembers] = useState(4);
  const [maxGroupMembers, setMaxGroupMembers] = useState(5);
  const [allowedFacultyTypes, setAllowedFacultyTypes] = useState(['Regular', 'Adjunct', 'On Lien']);
  const [safeMinimumLimit, setSafeMinimumLimit] = useState(null);
  const [loadingSafeLimit, setLoadingSafeLimit] = useState(false);
  
  // Sem 7 configs
  const [sem7Configs, setSem7Configs] = useState([]);
  const [sem7Major1FacultyLimit, setSem7Major1FacultyLimit] = useState(5);
  const [sem7Internship1FacultyLimit, setSem7Internship1FacultyLimit] = useState(5);
  
  // Sem 8 configs
  const [sem8Configs, setSem8Configs] = useState([]);
  const [sem8Major2FacultyLimit, setSem8Major2FacultyLimit] = useState(5);
  const [sem8Internship2FacultyLimit, setSem8Internship2FacultyLimit] = useState(5);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalValues, setOriginalValues] = useState({});
  const [sem7OriginalValues, setSem7OriginalValues] = useState({});
  const [sem8OriginalValues, setSem8OriginalValues] = useState({});
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Warning modal state (for reducing faculty preference limit)
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningData, setWarningData] = useState(null);
  const [pendingSave, setPendingSave] = useState(null);

  // Load system configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        
        // Load Sem 5 configs
        const sem5Response = await adminAPI.getSystemConfigurations('sem5');
        const sem5ConfigData = sem5Response.data || [];
        
        // Load Sem 7 configs
        const sem7Response = await adminAPI.getSystemConfigurations('sem7');
        const sem7ConfigData = sem7Response.data || [];
        
        // Load Sem 8 configs
        const sem8Response = await adminAPI.getSystemConfigurations('sem8');
        const sem8ConfigData = sem8Response.data || [];
        
        // If no configs found, auto-initialize them
        if (sem5ConfigData.length === 0 || sem7ConfigData.length === 0 || sem8ConfigData.length === 0) {
          const loadingToast = toast.loading('Initializing system configurations...');
          try {
            await adminAPI.initializeSystemConfigs();
            // Reload configs after initialization
            const newSem5Response = await adminAPI.getSystemConfigurations('sem5');
            const newSem7Response = await adminAPI.getSystemConfigurations('sem7');
            const newSem8Response = await adminAPI.getSystemConfigurations('sem8');
            const newSem5ConfigData = newSem5Response.data || [];
            const newSem7ConfigData = newSem7Response.data || [];
            const newSem8ConfigData = newSem8Response.data || [];
            setConfigs(newSem5ConfigData);
            setSem7Configs(newSem7ConfigData);
            setSem8Configs(newSem8ConfigData);
            loadSem5ConfigValues(newSem5ConfigData);
            loadSem7ConfigValues(newSem7ConfigData);
            loadSem8ConfigValues(newSem8ConfigData);
            toast.success('System configurations initialized successfully', { id: loadingToast });
          } catch (initError) {
            console.error('Failed to initialize configurations:', initError);
            toast.error('Failed to initialize system configurations', { id: loadingToast });
          }
        } else {
          setConfigs(sem5ConfigData);
          setSem7Configs(sem7ConfigData);
          setSem8Configs(sem8ConfigData);
          loadSem5ConfigValues(sem5ConfigData);
          loadSem7ConfigValues(sem7ConfigData);
          loadSem8ConfigValues(sem8ConfigData);
        }
      } catch (error) {
        console.error('Failed to load system configuration:', error);
        toast.error('Failed to load system configuration');
      } finally {
        setLoading(false);
      }
    };

    const loadSem5ConfigValues = (configData) => {
      // Extract specific values
      const facultyPrefConfig = configData.find(c => c.configKey === 'sem5.facultyPreferenceLimit');
      const minMembersConfig = configData.find(c => c.configKey === 'sem5.minGroupMembers');
      const maxMembersConfig = configData.find(c => c.configKey === 'sem5.maxGroupMembers');
      const allowedFacultyTypesConfig = configData.find(c => c.configKey === 'sem5.minor2.allowedFacultyTypes');
      
      if (facultyPrefConfig) {
        setFacultyPreferenceLimit(facultyPrefConfig.configValue);
      }
      if (minMembersConfig) {
        setMinGroupMembers(minMembersConfig.configValue);
      }
      if (maxMembersConfig) {
        setMaxGroupMembers(maxMembersConfig.configValue);
      }
      if (allowedFacultyTypesConfig && Array.isArray(allowedFacultyTypesConfig.configValue)) {
        setAllowedFacultyTypes(allowedFacultyTypesConfig.configValue);
      }
      
      // Store original values
      setOriginalValues({
        facultyPreferenceLimit: facultyPrefConfig?.configValue || 7,
        minGroupMembers: minMembersConfig?.configValue || 4,
        maxGroupMembers: maxMembersConfig?.configValue || 5,
        allowedFacultyTypes: allowedFacultyTypesConfig?.configValue || ['Regular', 'Adjunct', 'On Lien']
      });
    };

    const loadSem7ConfigValues = (configData) => {
      // Extract specific values
      const major1FacultyLimit = configData.find(c => c.configKey === 'sem7.major1.facultyPreferenceLimit');
      const internship1FacultyLimit = configData.find(c => c.configKey === 'sem7.internship1.facultyPreferenceLimit');
      
      if (major1FacultyLimit) {
        setSem7Major1FacultyLimit(major1FacultyLimit.configValue);
      }
      if (internship1FacultyLimit) {
        setSem7Internship1FacultyLimit(internship1FacultyLimit.configValue);
      }
      
      // Store original values
      setSem7OriginalValues({
        major1FacultyLimit: major1FacultyLimit?.configValue || 5,
        internship1FacultyLimit: internship1FacultyLimit?.configValue || 5
      });
    };

    const loadSem8ConfigValues = (configData) => {
      // Extract specific values
      const major2FacultyLimit = configData.find(c => c.configKey === 'sem8.major2.facultyPreferenceLimit');
      const internship2FacultyLimit = configData.find(c => c.configKey === 'sem8.internship2.facultyPreferenceLimit');
      
      if (major2FacultyLimit) {
        setSem8Major2FacultyLimit(major2FacultyLimit.configValue);
      }
      if (internship2FacultyLimit) {
        setSem8Internship2FacultyLimit(internship2FacultyLimit.configValue);
      }
      
      // Store original values
      setSem8OriginalValues({
        major2FacultyLimit: major2FacultyLimit?.configValue || 5,
        internship2FacultyLimit: internship2FacultyLimit?.configValue || 5
      });
    };

    loadConfig();
  }, []);

  // Load safe minimum faculty preference limit for Sem 5
  useEffect(() => {
    const loadSafeMinimumLimit = async () => {
      if (activeTab === 'sem5') {
        try {
          setLoadingSafeLimit(true);
          const response = await adminAPI.getSafeMinimumFacultyLimit(5, 'minor2');
          if (response.success && response.data) {
            setSafeMinimumLimit(response.data.safeMinimumLimit);
          } else {
            setSafeMinimumLimit(0);
          }
        } catch (error) {
          // Log error for debugging but set safe limit to 0
          console.error('Error loading safe minimum limit:', error);
          setSafeMinimumLimit(0);
        } finally {
          setLoadingSafeLimit(false);
        }
      } else {
        setSafeMinimumLimit(null);
      }
    };

    loadSafeMinimumLimit();
  }, [activeTab]);

  const handleSaveClick = () => {
    if (activeTab === 'sem5') {
      // Validate Sem 5 values
      if (typeof facultyPreferenceLimit !== 'number' || 
          typeof minGroupMembers !== 'number' || 
          typeof maxGroupMembers !== 'number') {
        toast.error('Please enter valid numeric values');
        return;
      }

      // Validate min <= max
      if (minGroupMembers > maxGroupMembers) {
        toast.error('Minimum group members cannot be greater than maximum');
        return;
      }
    } else if (activeTab === 'sem7') {
      // Validate Sem 7 values
      if (typeof sem7Major1FacultyLimit !== 'number' || 
          typeof sem7Internship1FacultyLimit !== 'number') {
        toast.error('Please enter valid numeric values');
        return;
      }
    } else if (activeTab === 'sem8') {
      // Validate Sem 8 values
      if (typeof sem8Major2FacultyLimit !== 'number' || 
          typeof sem8Internship2FacultyLimit !== 'number') {
        toast.error('Please enter valid numeric values');
        return;
      }
    }

    // Show confirmation modal
    setPendingSave({ forceUpdate: false });
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    await executeSave(pendingSave?.forceUpdate || false);
  };

  const executeSave = async (forceUpdate = false) => {
    try {
      setSaving(true);
      
      if (activeTab === 'sem5') {
        // Update Sem 5 configs
        try {
          await adminAPI.updateSystemConfigByKey('sem5.facultyPreferenceLimit', facultyPreferenceLimit, 
            'Number of faculty preferences required for Sem 5 Minor Project 2 registration', forceUpdate);
        } catch (error) {
          // Check if it's a warning about existing registrations
          if (error.response?.data?.warning?.type === 'EXISTING_REGISTRATIONS_AFFECTED') {
            setWarningData(error.response.data.warning);
            setShowWarningModal(true);
            setSaving(false);
            return;
          }
          // Error already handled by warning modal, just throw to prevent further execution
          throw error;
        }
        
        // Update min group members
        await adminAPI.updateSystemConfigByKey('sem5.minGroupMembers', minGroupMembers,
          'Minimum number of members required in a Sem 5 group');
        
        // Update max group members
        await adminAPI.updateSystemConfigByKey('sem5.maxGroupMembers', maxGroupMembers,
          'Maximum number of members allowed in a Sem 5 group');
        
        // Update allowed faculty types
        await adminAPI.updateSystemConfigByKey('sem5.minor2.allowedFacultyTypes', allowedFacultyTypes,
          'Faculty types allowed in dropdown for Sem 5 Minor Project 2 preferences (Regular, Adjunct, On Lien)');
        
        // Update original values to current values
        setOriginalValues({
          facultyPreferenceLimit,
          minGroupMembers,
          maxGroupMembers,
          allowedFacultyTypes
        });
        
        // Reload configs to confirm changes
        const response = await adminAPI.getSystemConfigurations('sem5');
        setConfigs(response.data || []);
      } else if (activeTab === 'sem7') {
        // Update Sem 7 configs
        await adminAPI.updateSystemConfigByKey('sem7.major1.facultyPreferenceLimit', sem7Major1FacultyLimit,
          'Number of faculty preferences required for Sem 7 Major Project 1 registration');
        
        await adminAPI.updateSystemConfigByKey('sem7.internship1.facultyPreferenceLimit', sem7Internship1FacultyLimit,
          'Number of faculty preferences required for Sem 7 Internship 1 registration');
        
        // Update original values
        setSem7OriginalValues({
          major1FacultyLimit: sem7Major1FacultyLimit,
          internship1FacultyLimit: sem7Internship1FacultyLimit
        });
        
        // Reload configs to confirm changes
        const response = await adminAPI.getSystemConfigurations('sem7');
        setSem7Configs(response.data || []);
      } else if (activeTab === 'sem8') {
        // Update Sem 8 configs
        await adminAPI.updateSystemConfigByKey('sem8.major2.facultyPreferenceLimit', sem8Major2FacultyLimit,
          'Number of faculty preferences required for Sem 8 Major Project 2 registration');
        
        await adminAPI.updateSystemConfigByKey('sem8.internship2.facultyPreferenceLimit', sem8Internship2FacultyLimit,
          'Number of faculty preferences required for Sem 8 Internship 2 registration');
        
        // Update original values
        setSem8OriginalValues({
          major2FacultyLimit: sem8Major2FacultyLimit,
          internship2FacultyLimit: sem8Internship2FacultyLimit
        });
        
        // Reload configs to confirm changes
        const response = await adminAPI.getSystemConfigurations('sem8');
        setSem8Configs(response.data || []);
      }
      
      toast.success('Configuration saved successfully!');
      // Reload safe minimum limit after successful save
      if (activeTab === 'sem5') {
        try {
          const response = await adminAPI.getSafeMinimumFacultyLimit(5, 'minor2');
          if (response.success && response.data) {
            setSafeMinimumLimit(response.data.safeMinimumLimit);
          }
        } catch (error) {
          // Ignore errors when reloading safe limit
        }
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      // Only show toast if warning modal is not being shown
      if (error.response?.data?.warning?.type !== 'EXISTING_REGISTRATIONS_AFFECTED') {
      toast.error(error.response?.data?.message || 'Failed to save configuration');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleForceUpdate = async () => {
    setShowWarningModal(false);
    await executeSave(true); // Force update = true
  };

  const handleReset = () => {
    if (activeTab === 'sem5') {
      setFacultyPreferenceLimit(originalValues.facultyPreferenceLimit || 7);
      setMinGroupMembers(originalValues.minGroupMembers || 4);
      setMaxGroupMembers(originalValues.maxGroupMembers || 5);
      setAllowedFacultyTypes(originalValues.allowedFacultyTypes || ['Regular', 'Adjunct', 'On Lien']);
    } else if (activeTab === 'sem7') {
      setSem7Major1FacultyLimit(sem7OriginalValues.major1FacultyLimit || 5);
      setSem7Internship1FacultyLimit(sem7OriginalValues.internship1FacultyLimit || 5);
    } else if (activeTab === 'sem8') {
      setSem8Major2FacultyLimit(sem8OriginalValues.major2FacultyLimit || 5);
      setSem8Internship2FacultyLimit(sem8OriginalValues.internship2FacultyLimit || 5);
    }
    toast.success('Configuration reset to original values');
  };

  const hasChanges = activeTab === 'sem5' 
    ? ((typeof facultyPreferenceLimit === 'number' && facultyPreferenceLimit !== (originalValues.facultyPreferenceLimit || 7)) ||
       (typeof minGroupMembers === 'number' && minGroupMembers !== (originalValues.minGroupMembers || 4)) ||
       (typeof maxGroupMembers === 'number' && maxGroupMembers !== (originalValues.maxGroupMembers || 5)) ||
       (Array.isArray(allowedFacultyTypes) && JSON.stringify(allowedFacultyTypes.sort()) !== JSON.stringify((originalValues.allowedFacultyTypes || ['Regular', 'Adjunct', 'On Lien']).sort())))
    : activeTab === 'sem7'
    ? ((typeof sem7Major1FacultyLimit === 'number' && sem7Major1FacultyLimit !== (sem7OriginalValues.major1FacultyLimit || 5)) ||
       (typeof sem7Internship1FacultyLimit === 'number' && sem7Internship1FacultyLimit !== (sem7OriginalValues.internship1FacultyLimit || 5)))
    : ((typeof sem8Major2FacultyLimit === 'number' && sem8Major2FacultyLimit !== (sem8OriginalValues.major2FacultyLimit || 5)) ||
       (typeof sem8Internship2FacultyLimit === 'number' && sem8Internship2FacultyLimit !== (sem8OriginalValues.internship2FacultyLimit || 5)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
                System Configuration
              </h1>
              <p className="mt-2 text-gray-600">
                Configure system-wide settings for the SPMS platform
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/dashboard/admin')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Info Notice */}
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>System-Wide Settings:</strong> Changes made here will affect all students registering for {activeTab === 'sem5' ? 'Sem 5 Minor Project 2' : activeTab === 'sem7' ? 'Sem 7 Major Project 1 and Internship 1' : 'Sem 8 Major Project 2 and Internship 2'}. You'll be asked to confirm before saving.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('sem5')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'sem5'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Semester 5 (Minor Project 2)
              </button>
              <button
                onClick={() => setActiveTab('sem7')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'sem7'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Semester 7 (Major Project 1 & Internship)
              </button>
              <button
                onClick={() => setActiveTab('sem8')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'sem8'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Semester 8 (Major Project 2 & Internship)
              </button>
            </nav>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Configuration Settings</h2>
            <p className="text-gray-600 mt-1">
              {activeTab === 'sem5' 
                ? 'Adjust system parameters for Sem 5 Minor Project 2'
                : activeTab === 'sem7'
                ? 'Adjust system parameters for Sem 7 Major Project 1 and Internship 1'
                : 'Adjust system parameters for Sem 8 Major Project 2 and Internship 2'}
            </p>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Sem 5 Configuration Section */}
            {activeTab === 'sem5' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded mr-2 text-sm">Sem 5</span>
                Minor Project 2 Settings
              </h3>
              
              <div className="space-y-6">
                {/* Faculty Preference Limit */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Faculty Preference Limit
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Number of faculty preferences required during registration
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={facultyPreferenceLimit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setFacultyPreferenceLimit('');
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 1 && num <= 10) {
                            setFacultyPreferenceLimit(num);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (facultyPreferenceLimit === '' || facultyPreferenceLimit < 1) {
                          setFacultyPreferenceLimit(1);
                        } else if (facultyPreferenceLimit > 10) {
                          setFacultyPreferenceLimit(10);
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        safeMinimumLimit !== null && safeMinimumLimit > 0 && facultyPreferenceLimit < safeMinimumLimit
                          ? 'border-red-300 focus:ring-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-indigo-500'
                      }`}
                    />
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500">
                      Range: 1-10 preferences
                    </p>
                      {safeMinimumLimit !== null && safeMinimumLimit > 0 && 
                       facultyPreferenceLimit !== originalValues.facultyPreferenceLimit && (
                        <div className="flex items-start space-x-2 p-2 rounded-md bg-blue-50 border border-blue-200">
                          <svg className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-blue-800">
                              <strong>Current Projects:</strong> Some registered projects are using <strong>{safeMinimumLimit}</strong> faculty preferences.
                            </p>
                            <p className="text-xs mt-1 text-blue-700">
                              <strong>This will not affect currently registered projects</strong> - they will keep their original preference counts. Only new registrations will be required to use the new limit.
                            </p>
                            {facultyPreferenceLimit !== safeMinimumLimit && (
                              <button
                                type="button"
                                onClick={() => setFacultyPreferenceLimit(safeMinimumLimit)}
                                className="mt-2 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                Use Current Maximum ({safeMinimumLimit})
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {safeMinimumLimit === 0 && !loadingSafeLimit && (
                        <p className="text-xs text-gray-500 italic">
                          No existing registrations found. You can set any value between 1-10.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Min Group Members */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Minimum Group Members
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum number of students required in a group
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={minGroupMembers}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setMinGroupMembers('');
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 1 && num <= 10) {
                            setMinGroupMembers(num);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (minGroupMembers === '' || minGroupMembers < 1) {
                          setMinGroupMembers(1);
                        } else if (minGroupMembers > 10) {
                          setMinGroupMembers(10);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Range: 1-10 members
                    </p>
                  </div>
                </div>

                {/* Max Group Members */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Maximum Group Members
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of students allowed in a group
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={maxGroupMembers}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setMaxGroupMembers('');
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 1 && num <= 10) {
                            setMaxGroupMembers(num);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (maxGroupMembers === '' || maxGroupMembers < 1) {
                          setMaxGroupMembers(1);
                        } else if (maxGroupMembers > 10) {
                          setMaxGroupMembers(10);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Range: 1-10 members
                    </p>
                  </div>
                </div>

                {/* Allowed Faculty Types */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Allowed Faculty Types
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Select which faculty types should appear in the preferences dropdown
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Selected: {allowedFacultyTypes.length}/3 types
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <div className="space-y-3">
                      {['Regular', 'Adjunct', 'On Lien'].map((type) => (
                        <label key={type} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowedFacultyTypes.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAllowedFacultyTypes([...allowedFacultyTypes, type]);
                              } else {
                                // Ensure at least one type is selected
                                if (allowedFacultyTypes.length > 1) {
                                  setAllowedFacultyTypes(allowedFacultyTypes.filter(t => t !== type));
                                } else {
                                  toast.error('At least one faculty type must be selected');
                                }
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{type}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            type === 'Regular' ? 'bg-green-100 text-green-800' :
                            type === 'Adjunct' ? 'bg-blue-100 text-blue-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {type === 'Regular' ? 'Full-time' : type === 'Adjunct' ? 'Part-time' : 'Temporary'}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Only selected faculty types will appear in the faculty preferences dropdown during registration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Sem 7 Configuration Section */}
            {activeTab === 'sem7' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded mr-2 text-sm">Sem 7</span>
                Major Project 1 & Internship 1 Settings
              </h3>
              
              <div className="space-y-6">
                {/* Major Project 1 Faculty Preference Limit */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Major Project 1 Faculty Preference Limit
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Number of faculty preferences required for Major Project 1 registration
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={sem7Major1FacultyLimit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSem7Major1FacultyLimit('');
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 1 && num <= 10) {
                            setSem7Major1FacultyLimit(num);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (sem7Major1FacultyLimit === '' || sem7Major1FacultyLimit < 1) {
                          setSem7Major1FacultyLimit(1);
                        } else if (sem7Major1FacultyLimit > 10) {
                          setSem7Major1FacultyLimit(10);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Range: 1-10 preferences
                    </p>
                  </div>
                </div>

                {/* Internship 1 Faculty Preference Limit */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Internship 1 Faculty Preference Limit
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Number of faculty preferences required for Internship 1 (solo project) registration
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={sem7Internship1FacultyLimit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSem7Internship1FacultyLimit('');
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 1 && num <= 10) {
                            setSem7Internship1FacultyLimit(num);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (sem7Internship1FacultyLimit === '' || sem7Internship1FacultyLimit < 1) {
                          setSem7Internship1FacultyLimit(1);
                        } else if (sem7Internship1FacultyLimit > 10) {
                          setSem7Internship1FacultyLimit(10);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Range: 1-10 preferences
                    </p>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Sem 8 Configuration Section */}
            {activeTab === 'sem8' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded mr-2 text-sm">Sem 8</span>
                Major Project 2 & Internship 2 Settings
              </h3>
              
              <div className="space-y-6">
                {/* Major Project 2 Faculty Preference Limit */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Major Project 2 Faculty Preference Limit
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Number of faculty preferences required for Major Project 2 registration
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={sem8Major2FacultyLimit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSem8Major2FacultyLimit('');
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 1 && num <= 10) {
                            setSem8Major2FacultyLimit(num);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (sem8Major2FacultyLimit === '' || sem8Major2FacultyLimit < 1) {
                          setSem8Major2FacultyLimit(1);
                        } else if (sem8Major2FacultyLimit > 10) {
                          setSem8Major2FacultyLimit(10);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Range: 1-10 preferences
                    </p>
                  </div>
                </div>

                {/* Internship 2 Faculty Preference Limit */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Internship 2 Faculty Preference Limit
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Number of faculty preferences required for Internship 2 (solo project) registration
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={sem8Internship2FacultyLimit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSem8Internship2FacultyLimit('');
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 1 && num <= 10) {
                            setSem8Internship2FacultyLimit(num);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (sem8Internship2FacultyLimit === '' || sem8Internship2FacultyLimit < 1) {
                          setSem8Internship2FacultyLimit(1);
                        } else if (sem8Internship2FacultyLimit > 10) {
                          setSem8Internship2FacultyLimit(10);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Range: 1-10 preferences
                    </p>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Action Buttons */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {hasChanges ? (
                    <span className="text-orange-600 font-medium">● You have unsaved changes</span>
                  ) : (
                    <span className="text-green-600">✓ All changes saved</span>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  disabled={!hasChanges}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveClick}
                  disabled={!hasChanges || saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Current Configuration Display */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Current Active Configurations ({activeTab === 'sem5' ? 'Sem 5' : 'Sem 7'})
          </h3>
          <div className="space-y-2">
            {(activeTab === 'sem5' ? configs : sem7Configs)
              .filter(config => {
                // Filter out window configurations (they're objects with start/end)
                if (activeTab === 'sem5') {
                  return !config.configKey.includes('Window');
                } else {
                  // For Sem 7, only show faculty preference limits (not windows)
                  return config.configKey.includes('facultyPreferenceLimit');
                }
              })
              .map((config) => (
              <div key={config._id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{config.configKey}</p>
                  <p className="text-xs text-gray-500">{config.description}</p>
                </div>
                <div className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">
                  {typeof config.configValue === 'object' ? JSON.stringify(config.configValue) : config.configValue}
                </div>
              </div>
            ))}
            {(activeTab === 'sem5' ? configs : sem7Configs).filter(config => {
              if (activeTab === 'sem5') {
                return !config.configKey.includes('Window');
              } else {
                return config.configKey.includes('facultyPreferenceLimit');
              }
            }).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No configurations to display</p>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-6 h-6 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Confirm Configuration Changes
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 mb-4">
                You are about to update system-wide configuration settings. This will affect:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 text-sm text-gray-600">
                {activeTab === 'sem5' ? (
                  <>
                    <li>All students registering for Sem 5 Minor Project 2</li>
                    <li>Faculty preference requirements</li>
                    <li>Group formation rules</li>
                  </>
                ) : (
                  <>
                    <li>All students registering for Sem 7 Major Project 1</li>
                    <li>All students registering for Sem 7 Internship 1</li>
                    <li>Faculty preference requirements</li>
                  </>
                )}
              </ul>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Changes Summary:</strong>
                    </p>
                    <ul className="text-xs text-blue-600 mt-1">
                      {activeTab === 'sem5' ? (
                        <>
                          <li>Faculty Preferences: {originalValues.facultyPreferenceLimit || 7} → <strong>{facultyPreferenceLimit}</strong></li>
                          <li>Min Group Members: {originalValues.minGroupMembers || 4} → <strong>{minGroupMembers}</strong></li>
                          <li>Max Group Members: {originalValues.maxGroupMembers || 5} → <strong>{maxGroupMembers}</strong></li>
                          <li>Allowed Faculty Types: {originalValues.allowedFacultyTypes?.join(', ') || 'Regular, Adjunct, On Lien'} → <strong>{allowedFacultyTypes.join(', ')}</strong></li>
                        </>
                      ) : (
                        <>
                          <li>Major Project 1 Faculty Preferences: {sem7OriginalValues.major1FacultyLimit || 5} → <strong>{sem7Major1FacultyLimit}</strong></li>
                          <li>Internship 1 Faculty Preferences: {sem7OriginalValues.internship1FacultyLimit || 5} → <strong>{sem7Internship1FacultyLimit}</strong></li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700 font-medium">
                Are you sure you want to proceed?
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingSave(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Confirm & Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal for Reducing Faculty Preference Limit */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
              <h3 className="text-lg font-semibold text-red-900">⚠️ Cannot Reduce Faculty Preference Limit</h3>
            </div>
            <div className="px-6 py-4">
              {/* Safe Minimum Limit Highlight */}
              {warningData?.safeMinimumLimit !== undefined && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">Safe Minimum Limit</h4>
                      <p className="text-sm text-blue-800">
                        Based on existing registrations, the minimum safe limit for this semester is{' '}
                        <strong className="text-lg font-bold text-blue-900">{warningData.safeMinimumLimit}</strong>.
                      </p>
                      <p className="text-xs text-blue-700 mt-2">
                        You can set the limit to <strong>{warningData.safeMinimumLimit}</strong> or higher without affecting existing projects.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-700 mb-4">
                You're trying to set the limit to <strong>{warningData?.newLimit}</strong>, but{' '}
                <strong>{warningData?.affectedCount}</strong> existing project registration(s) have more preferences than this limit.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Affected Projects ({warningData?.affectedProjects?.length || 0}):</h4>
                <ul className="space-y-2">
                  {warningData?.affectedProjects?.slice(0, 10).map((project, index) => (
                    <li key={project.projectId || index} className="text-sm text-gray-700 border-b border-gray-200 pb-2">
                      <p className="font-medium">{project.title || 'Untitled Project'}</p>
                      <p className="text-xs text-gray-500">
                        Group: {project.groupName || 'N/A'} | Current preferences: <strong>{project.currentPreferences}</strong>
                      </p>
                    </li>
                  ))}
                  {warningData?.affectedProjects?.length > 10 && (
                    <li className="text-xs text-gray-500 italic">
                      ... and {warningData.affectedProjects.length - 10} more project(s)
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> {warningData?.suggestion || 'If you proceed, existing projects will keep their original preference count, but new registrations will be limited to the new value.'}
              </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  // Auto-fill the safe minimum limit
                  if (warningData?.safeMinimumLimit !== undefined && activeTab === 'sem5') {
                    setFacultyPreferenceLimit(warningData.safeMinimumLimit);
                  }
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {warningData?.safeMinimumLimit !== undefined ? `Use Safe Limit (${warningData.safeMinimumLimit})` : 'Cancel'}
              </button>
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForceUpdate}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemConfiguration;
