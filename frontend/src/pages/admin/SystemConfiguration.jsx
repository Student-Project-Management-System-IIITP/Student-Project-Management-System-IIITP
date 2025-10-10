import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const SystemConfiguration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [configs, setConfigs] = useState([]);
  const [facultyPreferenceLimit, setFacultyPreferenceLimit] = useState(7);
  const [minGroupMembers, setMinGroupMembers] = useState(4);
  const [maxGroupMembers, setMaxGroupMembers] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalValues, setOriginalValues] = useState({});
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningData, setWarningData] = useState(null);
  const [configsNotFound, setConfigsNotFound] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // Load system configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getSystemConfigurations('sem5');
        const configData = response.data || [];
        
        setConfigs(configData);
        
        // Check if configs exist
        if (configData.length === 0) {
          setConfigsNotFound(true);
          toast.error('System configurations not found. Please initialize them first.');
        } else {
          setConfigsNotFound(false);
        }
        
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
      } catch (error) {
        console.error('Failed to load system configuration:', error);
        toast.error('Failed to load system configuration');
        setConfigsNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleSave = async (forceUpdate = false) => {
    // Validate that all values are numbers
    if (typeof facultyPreferenceLimit !== 'number' || 
        typeof minGroupMembers !== 'number' || 
        typeof maxGroupMembers !== 'number') {
      toast.error('Please enter valid numeric values');
      setSaving(false);
      return;
    }
    
    try {
      setSaving(true);
      
      // Update faculty preference limit
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
      
      // Update original values
      setOriginalValues({
        facultyPreferenceLimit,
        minGroupMembers,
        maxGroupMembers
      });
      
      toast.success('System configuration updated successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Failed to update configuration: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleForceUpdate = async () => {
    setShowWarningModal(false);
    await handleSave(true);
  };

  const handleInitialize = async () => {
    try {
      setInitializing(true);
      
      await adminAPI.initializeSystemConfigs();
      
      toast.success('System configurations initialized successfully!');
      
      // Reload configs
      window.location.reload();
    } catch (error) {
      console.error('Failed to initialize configurations:', error);
      toast.error('Failed to initialize configurations');
    } finally {
      setInitializing(false);
    }
  };

  const handleReset = () => {
    setFacultyPreferenceLimit(originalValues.facultyPreferenceLimit || 7);
    setMinGroupMembers(originalValues.minGroupMembers || 4);
    setMaxGroupMembers(originalValues.maxGroupMembers || 5);
    toast.success('Configuration reset to original values');
  };

  const hasChanges = 
    (typeof facultyPreferenceLimit === 'number' && facultyPreferenceLimit !== (originalValues.facultyPreferenceLimit || 7)) ||
    (typeof minGroupMembers === 'number' && minGroupMembers !== (originalValues.minGroupMembers || 4)) ||
    (typeof maxGroupMembers === 'number' && maxGroupMembers !== (originalValues.maxGroupMembers || 5));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading system configuration...</p>
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

        {/* Initialization Banner - Show if configs not found */}
        {configsNotFound && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-red-800">
                  System Configurations Not Initialized
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>The system configurations have not been set up yet. Click the button below to initialize default settings.</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleInitialize}
                    disabled={initializing}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {initializing ? 'Initializing...' : 'Initialize System Configurations'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Configuration Settings</h2>
            <p className="text-gray-600 mt-1">
              Adjust system parameters to customize the SPMS workflow
            </p>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Sem 5 Configuration Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded mr-2 text-sm">Sem 5</span>
                Minor Project 2 Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faculty Preference Limit
                  </label>
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
                      // On blur, ensure we have a valid number
                      if (facultyPreferenceLimit === '' || facultyPreferenceLimit < 1) {
                        setFacultyPreferenceLimit(1);
                      } else if (facultyPreferenceLimit > 10) {
                        setFacultyPreferenceLimit(10);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of faculty preferences students must select (1-10)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Group Members
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={minGroupMembers}
                    onChange={(e) => setMinGroupMembers(parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum members required in a group
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Group Members
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={maxGroupMembers}
                    onChange={(e) => setMaxGroupMembers(parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum members allowed in a group
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {hasChanges && (
                  <span className="text-sm text-orange-600 font-medium">
                    You have unsaved changes
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleReset}
                  disabled={!hasChanges}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Current Configuration Summary */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Current Configuration</h2>
            <p className="text-gray-600 mt-1">
              Overview of current Sem 5 system settings
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Faculty Preferences</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p className="text-2xl font-bold">{facultyPreferenceLimit}</p>
                  <p>Faculty preferences required</p>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Minimum Group Size</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p className="text-2xl font-bold">{minGroupMembers}</p>
                  <p>Minimum members per group</p>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-2">Maximum Group Size</h4>
                <div className="text-sm text-purple-800 space-y-1">
                  <p className="text-2xl font-bold">{maxGroupMembers}</p>
                  <p>Maximum members per group</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Information Card */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">About System Configuration</h3>
          <div className="text-blue-800 space-y-2 text-sm">
            <p>• <strong>Faculty Preference Limit:</strong> Controls how many faculty preferences students must select during registration</p>
            <p>• <strong>Group Size Limits:</strong> Defines the minimum and maximum members allowed in a Sem 5 group</p>
            <p>• <strong>Dynamic Updates:</strong> Changes are applied immediately and affect new registrations</p>
            <p>• <strong>Impact:</strong> Students will see the updated limits when they register for Minor Project 2</p>
            <p>• <strong>Safety:</strong> System will warn you if reducing limits affects existing registrations</p>
          </div>
        </div>

        {/* Warning Modal */}
        {showWarningModal && warningData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-red-900">Warning: Existing Registrations Affected</h3>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-700 mb-2">
                    You are trying to reduce the faculty preference limit from <strong>{warningData.oldLimit}</strong> to <strong>{warningData.newLimit}</strong>.
                  </p>
                  <p className="text-gray-700 mb-4">
                    <strong className="text-red-600">{warningData.affectedCount}</strong> group(s) have already submitted <strong>{warningData.oldLimit}</strong> preferences.
                  </p>
                </div>

                {warningData.affectedProjects && warningData.affectedProjects.length > 0 && (
                  <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <h4 className="font-medium text-yellow-900 mb-2">Affected Groups:</h4>
                    <ul className="space-y-2 text-sm">
                      {warningData.affectedProjects.map((project, idx) => (
                        <li key={idx} className="text-yellow-800">
                          • <strong>{project.studentName}</strong> - {project.title} ({project.currentPreferences} preferences)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> {warningData.suggestion}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">What will happen?</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>✓ Existing registrations will keep their {warningData.oldLimit} preferences (no data lost)</li>
                    <li>✓ New registrations will require {warningData.newLimit} preferences</li>
                    <li>✓ Admin tables will show all preferences dynamically</li>
                  </ul>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowWarningModal(false);
                    setWarningData(null);
                    // Reset to original value
                    setFacultyPreferenceLimit(originalValues.facultyPreferenceLimit);
                  }}
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
    </div>
  );
};

export default SystemConfiguration;
