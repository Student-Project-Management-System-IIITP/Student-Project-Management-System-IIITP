import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSem5Project } from '../../hooks/useSem5Project';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import FacultySelector from '../../components/faculty/FacultySelector';

const FacultyPreferences = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user } = useAuth();
  const { sem5Project, submitFacultyPreferences } = useSem5Project();
  const { sem5Group, isGroupLeader } = useGroupManagement();

  const [allowedFacultyTypes, setAllowedFacultyTypes] = useState(['Regular', 'Adjunct', 'On Lien']);
  const [facultyPreferenceLimit, setFacultyPreferenceLimit] = useState(7); // Default to 7
  const [selectedFaculties, setSelectedFaculties] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load system configuration for faculty preferences
  useEffect(() => {
    const loadSystemConfig = async () => {
      try {
        setIsLoading(true);
        
        // Load Sem 5 faculty preference limit and allowed faculty types
        const [limitResponse, allowedTypesResponse] = await Promise.all([
          studentAPI.getSystemConfig('sem5.facultyPreferenceLimit'),
          studentAPI.getSystemConfig('sem5.minor2.allowedFacultyTypes')
        ]);
        
        if (limitResponse.success && limitResponse.data) {
          const limitValue = limitResponse.data.value || limitResponse.data.configValue;
          if (limitValue !== undefined && limitValue !== null) {
            setFacultyPreferenceLimit(limitValue);
          }
        }
        
        if (allowedTypesResponse.success && allowedTypesResponse.data?.value && Array.isArray(allowedTypesResponse.data.value)) {
          setAllowedFacultyTypes(allowedTypesResponse.data.value);
        }
      } catch (error) {
        console.error('Failed to load system configuration:', error);
        toast.error('Failed to load system configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadSystemConfig();
  }, []);

  // Check if user can submit faculty preferences
  const canSubmitPreferences = 
    isGroupLeader && 
    sem5Group && 
    sem5Group.status === 'complete' && 
    systemConfig &&
    facultyPreferenceLimit;

  const handleFacultySelection = (faculties) => {
    setSelectedFaculties(faculties);
  };

  const handleSubmit = async () => {
    if (selectedFaculties.length === 0) {
      toast.error('Please select at least one faculty member');
      return;
    }

    if (selectedFaculties.length > facultyPreferenceLimit) {
      toast.error(`You can select maximum ${facultyPreferenceLimit} faculty members`);
      return;
    }

    try {
      setIsSubmitting(true);
      
      const preferences = selectedFaculties.map(item => ({
        faculty: item.faculty._id,
        priority: item.priority
      }));

      const targetProjectId = projectId || sem5Project?._id;
      if (!targetProjectId) {
        throw new Error('No project ID found');
      }

      await submitFacultyPreferences(targetProjectId, preferences);
      
      toast.success('Faculty preferences submitted successfully!');
      navigate('/dashboard/student');
    } catch (error) {
      toast.error(`Failed to submit preferences: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = () => {
    setSelectedFaculties([]);
    navigate('/dashboard/student');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading system configuration...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canSubmitPreferences) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Cannot Submit Faculty Preferences</h3>
            <p className="text-gray-600 mb-4">
              {!isGroupLeader 
                ? "Only the group leader can submit faculty preferences."
                : !sem5Group 
                ? "You need to be in a group to submit faculty preferences."
                : sem5Group.status !== 'complete'
                ? "Your group must be complete before submitting faculty preferences."
                : "System configuration is not available."
              }
            </p>
            <button
              onClick={() => navigate('/dashboard/student')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
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
                Faculty Preferences
              </h1>
              <p className="mt-2 text-gray-600">
                Select your preferred faculty members for Minor Project 2
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
              <span className="ml-2 text-sm font-medium text-green-600">Project Registration</span>
            </div>
            <div className="flex-1 h-0.5 bg-green-600"></div>
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
              <span className="ml-2 text-sm font-medium text-green-600">Project Details</span>
            </div>
            <div className="flex-1 h-0.5 bg-blue-600"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                4
              </div>
              <span className="ml-2 text-sm font-medium text-blue-600">Faculty Preferences</span>
            </div>
          </div>
        </div>

        {/* Faculty Selection */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Select Faculty Members</h2>
            <p className="text-gray-600 mt-1">
              Choose your preferred faculty members in order of priority. Faculty will be allocated based on your preferences.
            </p>
          </div>

          <div className="p-6">
            <FacultySelector
              selectedFaculties={selectedFaculties}
              onSelectionChange={handleFacultySelection}
              facultyTypes={allowedFacultyTypes}
              maxSelections={facultyPreferenceLimit}
              disabled={isSubmitting}
              placeholder="Search and select faculty members..."
            />
          </div>
        </div>

        {/* Selection Summary */}
        {selectedFaculties.length > 0 && (
          <div className="mt-6 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Selection Summary</h3>
            <div className="space-y-3">
              {selectedFaculties
                .sort((a, b) => a.priority - b.priority)
                .map((item, index) => (
                  <div key={item.faculty._id} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {item.priority}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{item.faculty.fullName}</h4>
                        <p className="text-sm text-gray-600">
                          {item.faculty.facultyId} • {item.faculty.department} • {item.faculty.designation}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      item.faculty.mode === 'Regular' ? 'bg-green-100 text-green-800' :
                      item.faculty.mode === 'Adjunct' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {item.faculty.mode}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="mt-8 flex items-center justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedFaculties.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              `Submit Preferences (${selectedFaculties.length})`
            )}
          </button>
        </div>

        {/* Information Card */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">About Faculty Preferences</h3>
          <div className="text-blue-800 space-y-2">
            <p>• <strong>Priority Order:</strong> Faculty will be contacted in the order of your preferences</p>
            <p>• <strong>Faculty Types:</strong> You can select from {allowedFacultyTypes.join(', ')} faculty</p>
            <p>• <strong>Selection Limit:</strong> You can select up to {facultyPreferenceLimit} faculty members</p>
            <p>• <strong>Allocation Process:</strong> Faculty will receive your group details and can choose to accept or pass</p>
            <p>• <strong>Next Steps:</strong> After submission, wait for faculty allocation results</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyPreferences;
