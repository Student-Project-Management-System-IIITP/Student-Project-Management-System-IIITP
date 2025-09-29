import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const SystemConfiguration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [config, setConfig] = useState({
    facultyPreferenceLimit: 7,
    minGroupSize: 2,
    maxGroupSize: 5,
    groupFormationDeadline: '',
    facultyResponseDeadline: '',
    autoAllocationEnabled: false,
    allowedFacultyTypes: {
      regular: true,
      adjunct: true,
      onLien: false
    },
    projectRegistrationDeadline: '',
    evaluationDeadline: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalConfig, setOriginalConfig] = useState(null);

  // Load system configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getSystemConfig();
        const configData = response.data || {};
        
        // Set default values if not present
        const defaultConfig = {
          facultyPreferenceLimit: 7,
          minGroupSize: 2,
          maxGroupSize: 5,
          groupFormationDeadline: '',
          facultyResponseDeadline: '',
          autoAllocationEnabled: false,
          allowedFacultyTypes: {
            regular: true,
            adjunct: true,
            onLien: false
          },
          projectRegistrationDeadline: '',
          evaluationDeadline: ''
        };
        
        const mergedConfig = { ...defaultConfig, ...configData };
        setConfig(mergedConfig);
        setOriginalConfig(mergedConfig);
      } catch (error) {
        console.error('Failed to load system configuration:', error);
        toast.error('Failed to load system configuration');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFacultyTypeChange = (type, checked) => {
    setConfig(prev => ({
      ...prev,
      allowedFacultyTypes: {
        ...prev.allowedFacultyTypes,
        [type]: checked
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminAPI.updateSystemConfig(config);
      setOriginalConfig(config);
      toast.success('System configuration updated successfully!');
    } catch (error) {
      toast.error(`Failed to update configuration: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      toast.success('Configuration reset to original values');
    }
  };

  const hasChanges = originalConfig && JSON.stringify(config) !== JSON.stringify(originalConfig);

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

        {/* Configuration Form */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Configuration Settings</h2>
            <p className="text-gray-600 mt-1">
              Adjust system parameters to customize the SPMS workflow
            </p>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Faculty Preferences Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Faculty Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faculty Preference Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.facultyPreferenceLimit}
                    onChange={(e) => handleInputChange('facultyPreferenceLimit', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum number of faculty preferences students can submit
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faculty Response Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={config.facultyResponseDeadline}
                    onChange={(e) => handleInputChange('facultyResponseDeadline', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deadline for faculty to respond to allocation requests
                  </p>
                </div>
              </div>
            </div>

            {/* Group Management Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Group Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Group Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.minGroupSize}
                    onChange={(e) => handleInputChange('minGroupSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum number of members required in a group
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Group Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.maxGroupSize}
                    onChange={(e) => handleInputChange('maxGroupSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum number of members allowed in a group
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Formation Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={config.groupFormationDeadline}
                    onChange={(e) => handleInputChange('groupFormationDeadline', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deadline for students to form groups
                  </p>
                </div>
              </div>
            </div>

            {/* Faculty Types Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Allowed Faculty Types</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="regular"
                    checked={config.allowedFacultyTypes.regular}
                    onChange={(e) => handleFacultyTypeChange('regular', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="regular" className="ml-3 text-sm text-gray-700">
                    Regular Faculty
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="adjunct"
                    checked={config.allowedFacultyTypes.adjunct}
                    onChange={(e) => handleFacultyTypeChange('adjunct', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="adjunct" className="ml-3 text-sm text-gray-700">
                    Adjunct Faculty
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="onLien"
                    checked={config.allowedFacultyTypes.onLien}
                    onChange={(e) => handleFacultyTypeChange('onLien', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="onLien" className="ml-3 text-sm text-gray-700">
                    On Lien Faculty
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select which types of faculty can be chosen as preferences by students
              </p>
            </div>

            {/* Project Management Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Registration Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={config.projectRegistrationDeadline}
                    onChange={(e) => handleInputChange('projectRegistrationDeadline', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deadline for students to register for projects
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evaluation Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={config.evaluationDeadline}
                    onChange={(e) => handleInputChange('evaluationDeadline', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deadline for project evaluations
                  </p>
                </div>
              </div>
            </div>

            {/* Auto Allocation Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Allocation Settings</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoAllocation"
                  checked={config.autoAllocationEnabled}
                  onChange={(e) => handleInputChange('autoAllocationEnabled', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="autoAllocation" className="ml-3 text-sm text-gray-700">
                  Enable Automatic Allocation
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Automatically allocate unallocated groups to available faculty after the response deadline
              </p>
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
              Overview of current system settings
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Faculty Preferences</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Limit: {config.facultyPreferenceLimit} preferences</p>
                  <p>Response Deadline: {config.facultyResponseDeadline || 'Not set'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Group Settings</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Size: {config.minGroupSize} - {config.maxGroupSize} members</p>
                  <p>Formation Deadline: {config.groupFormationDeadline || 'Not set'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Faculty Types</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Regular: {config.allowedFacultyTypes.regular ? '✓' : '✗'}</p>
                  <p>Adjunct: {config.allowedFacultyTypes.adjunct ? '✓' : '✗'}</p>
                  <p>On Lien: {config.allowedFacultyTypes.onLien ? '✓' : '✗'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Project Deadlines</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Registration: {config.projectRegistrationDeadline || 'Not set'}</p>
                  <p>Evaluation: {config.evaluationDeadline || 'Not set'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Allocation</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Auto Allocation: {config.autoAllocationEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Information Card */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">About System Configuration</h3>
          <div className="text-blue-800 space-y-2">
            <p>• <strong>Faculty Preferences:</strong> Control how many faculty preferences students can submit</p>
            <p>• <strong>Group Management:</strong> Set group size limits and formation deadlines</p>
            <p>• <strong>Faculty Types:</strong> Choose which faculty types are available for selection</p>
            <p>• <strong>Deadlines:</strong> Set important dates for various workflow stages</p>
            <p>• <strong>Auto Allocation:</strong> Enable automatic allocation for unallocated groups</p>
            <p>• <strong>Changes:</strong> All changes are saved immediately and affect the entire system</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfiguration;
