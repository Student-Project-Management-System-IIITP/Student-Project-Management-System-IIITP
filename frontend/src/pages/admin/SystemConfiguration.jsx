import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const SystemConfiguration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('sem5'); // 'sem5' or 'sem7'
  
  // Sem 5 configs
  const [configs, setConfigs] = useState([]);
  const [facultyPreferenceLimit, setFacultyPreferenceLimit] = useState(7);
  const [minGroupMembers, setMinGroupMembers] = useState(4);
  const [maxGroupMembers, setMaxGroupMembers] = useState(5);
  
  // Sem 7 configs
  const [sem7Configs, setSem7Configs] = useState([]);
  const [sem7Major1FacultyLimit, setSem7Major1FacultyLimit] = useState(5);
  const [sem7Internship1FacultyLimit, setSem7Internship1FacultyLimit] = useState(5);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalValues, setOriginalValues] = useState({});
  const [sem7OriginalValues, setSem7OriginalValues] = useState({});
  
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
        
        // If no configs found, auto-initialize them
        if (sem5ConfigData.length === 0 || sem7ConfigData.length === 0) {
          const loadingToast = toast.loading('Initializing system configurations...');
          try {
            await adminAPI.initializeSystemConfigs();
            // Reload configs after initialization
            const newSem5Response = await adminAPI.getSystemConfigurations('sem5');
            const newSem7Response = await adminAPI.getSystemConfigurations('sem7');
            const newSem5ConfigData = newSem5Response.data || [];
            const newSem7ConfigData = newSem7Response.data || [];
            setConfigs(newSem5ConfigData);
            setSem7Configs(newSem7ConfigData);
            loadSem5ConfigValues(newSem5ConfigData);
            loadSem7ConfigValues(newSem7ConfigData);
            toast.success('System configurations initialized successfully', { id: loadingToast });
          } catch (initError) {
            console.error('Failed to initialize configurations:', initError);
            toast.error('Failed to initialize system configurations', { id: loadingToast });
          }
        } else {
          setConfigs(sem5ConfigData);
          setSem7Configs(sem7ConfigData);
          loadSem5ConfigValues(sem5ConfigData);
          loadSem7ConfigValues(sem7ConfigData);
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
      
      if (facultyPrefConfig) {
        setFacultyPreferenceLimit(facultyPrefConfig.configValue);
      }
      if (minMembersConfig) {
        setMinGroupMembers(minMembersConfig.configValue);
      }
      if (maxMembersConfig) {
        setMaxGroupMembers(maxMembersConfig.configValue);
      }
      
      // Store original values
      setOriginalValues({
        facultyPreferenceLimit: facultyPrefConfig?.configValue || 7,
        minGroupMembers: minMembersConfig?.configValue || 4,
        maxGroupMembers: maxMembersConfig?.configValue || 5
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

    loadConfig();
  }, []);


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
    } else {
      // Validate Sem 7 values
      if (typeof sem7Major1FacultyLimit !== 'number' || 
          typeof sem7Internship1FacultyLimit !== 'number') {
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
          throw error;
        }
        
        // Update min group members
        await adminAPI.updateSystemConfigByKey('sem5.minGroupMembers', minGroupMembers,
          'Minimum number of members required in a Sem 5 group');
        
        // Update max group members
        await adminAPI.updateSystemConfigByKey('sem5.maxGroupMembers', maxGroupMembers,
          'Maximum number of members allowed in a Sem 5 group');
        
        // Update original values to current values
        setOriginalValues({
          facultyPreferenceLimit,
          minGroupMembers,
          maxGroupMembers
        });
        
        // Reload configs to confirm changes
        const response = await adminAPI.getSystemConfigurations('sem5');
        setConfigs(response.data || []);
      } else {
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
      }
      
      toast.success('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error(error.response?.data?.message || 'Failed to save configuration');
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
    } else {
      setSem7Major1FacultyLimit(sem7OriginalValues.major1FacultyLimit || 5);
      setSem7Internship1FacultyLimit(sem7OriginalValues.internship1FacultyLimit || 5);
    }
    toast.success('Configuration reset to original values');
  };

  const hasChanges = activeTab === 'sem5' 
    ? ((typeof facultyPreferenceLimit === 'number' && facultyPreferenceLimit !== (originalValues.facultyPreferenceLimit || 7)) ||
       (typeof minGroupMembers === 'number' && minGroupMembers !== (originalValues.minGroupMembers || 4)) ||
       (typeof maxGroupMembers === 'number' && maxGroupMembers !== (originalValues.maxGroupMembers || 5)))
    : ((typeof sem7Major1FacultyLimit === 'number' && sem7Major1FacultyLimit !== (sem7OriginalValues.major1FacultyLimit || 5)) ||
       (typeof sem7Internship1FacultyLimit === 'number' && sem7Internship1FacultyLimit !== (sem7OriginalValues.internship1FacultyLimit || 5)));

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
                <strong>System-Wide Settings:</strong> Changes made here will affect all students registering for {activeTab === 'sem5' ? 'Sem 5 Minor Project 2' : 'Sem 7 Major Project 1 and Internship 1'}. You'll be asked to confirm before saving.
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
                : 'Adjust system parameters for Sem 7 Major Project 1 and Internship 1'}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Range: 1-10 preferences
                    </p>
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
              <h3 className="text-lg font-semibold text-red-900">⚠️ Warning: Existing Registrations Affected</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 mb-4">
                Reducing the faculty preference limit will affect <strong>{warningData?.affectedCount}</strong> existing project registration(s).
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Affected Projects:</h4>
                <ul className="space-y-2">
                  {warningData?.affectedProjects?.map((project) => (
                    <li key={project._id} className="text-sm text-gray-700 border-b border-gray-200 pb-2">
                      <p className="font-medium">{project.title || 'Untitled Project'}</p>
                      <p className="text-xs text-gray-500">
                        Group: {project.group?.name || 'N/A'} | Current preferences: {project.currentPreferences}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-red-600">
                Do you want to proceed with this change? This action cannot be undone automatically.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
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
