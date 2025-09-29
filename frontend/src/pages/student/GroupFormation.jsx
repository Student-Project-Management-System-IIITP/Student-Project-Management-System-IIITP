import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSem5Project } from '../../hooks/useSem5Project';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import websocketManager from '../../utils/websocket';
import GroupCard from '../../components/groups/GroupCard';
import GroupMemberList from '../../components/groups/GroupMemberList';
import StudentSearch from '../../components/groups/StudentSearch';
import StatusBadge from '../../components/common/StatusBadge';

const GroupFormation = () => {
  const navigate = useNavigate();
  const { user, roleData } = useAuth();
  // Note: Sem5Project no longer needed for group creation in new workflow
  // Groups are created independently, then linked to projects during registration
  const { 
    sem5Group, 
    canCreateGroup, 
    isInGroup, 
    isGroupLeader, 
    getGroupStats,
    createGroup,
    loading: groupLoading 
  } = useGroupManagement();

  // Initialize state from localStorage or defaults
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(() => {
    const saved = localStorage.getItem('groupFormation_selectedStudents');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedLeader, setSelectedLeader] = useState(() => {
    const saved = localStorage.getItem('groupFormation_selectedLeader');
    return saved ? JSON.parse(saved) : null;
  });
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('groupFormation_searchTerm') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('groupFormation_currentStep');
    return saved ? parseInt(saved) : 1;
  });
  const [invitationResults, setInvitationResults] = useState(null);
  const [groupData, setGroupData] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm({
    defaultValues: {
      name: localStorage.getItem('groupFormation_name') || '',
      description: localStorage.getItem('groupFormation_description') || ''
    }
  });

  // Watch form fields for persistence
  const watchedName = watch('name');
  const watchedDescription = watch('description');

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem('groupFormation_selectedStudents', JSON.stringify(selectedStudents));
  }, [selectedStudents]);

  useEffect(() => {
    localStorage.setItem('groupFormation_selectedLeader', JSON.stringify(selectedLeader));
  }, [selectedLeader]);

  useEffect(() => {
    localStorage.setItem('groupFormation_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('groupFormation_currentStep', currentStep.toString());
  }, [currentStep]);

  // Persist form data 
  useEffect(() => {
    if (watchedName !== undefined) {
      localStorage.setItem('groupFormation_name', watchedName || '');
    }
  }, [watchedName]);

  useEffect(() => {
    if (watchedDescription !== undefined) {
      localStorage.setItem('groupFormation_description', watchedDescription || '');
    }
  }, [watchedDescription]);

  // Load available students function - can be called repeatedly for search
  const loadAvailableStudents = async (search = '') => {
      try {
        setIsLoading(true);
      const response = await studentAPI.getAvailableStudents({ search });
      if (response.success) {
        setAvailableStudents(response.data || []);
      } else {
        toast.error(response.message || 'Failed to load available students');
        setAvailableStudents([]);
      }
      } catch (error) {
        console.error('Failed to load available students:', error);
        toast.error('Failed to load available students');
      setAvailableStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

  // Load students when step 2 is shown
  useEffect(() => {
    if (currentStep === 2) {
      loadAvailableStudents();
    }
  }, [currentStep]);

  // Real-time search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 2) {
        loadAvailableStudents(searchTerm);
      } else if (searchTerm === '') {
      loadAvailableStudents();
    }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Filter students based on search term (for immediate client-side filter)
  const filteredStudents = availableStudents.filter(student =>
    searchTerm === '' || 
    student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.misNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Enhanced multi-step group creation workflow
  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      
      const groupData = {
        ...data,
        semester: 5,
        academicYear: user.academicYear || '2024-25',
        leaderId: selectedLeader ? selectedLeader._id : null, // Use null to indicate current user is leader
        memberIds: selectedStudents.map(student => student._id) // Include selected members for invitation
      };

      // STEP 1: Just advance to step 2 for member invitation
      if (currentStep === 1) {
        setCurrentStep(2);
        toast.success('Group details saved. Now invite members.');
        return;
      }

      // STEP 2: Create the group and proceed to confirmation
      const response = await studentAPI.createGroup(groupData);
      
      if (response.success) {
      toast.success('Group created successfully!');
        
        // Proceed to step 3 (confirmation page)
        setCurrentStep(3);
        setInvitationResults(null);
        
        // Store group data for invitation sending
        setGroupData(response.data);
      } else {
        toast.error(response.message || 'Group creation failed');
      }
    } catch (error) {
      toast.error(`Group creation failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = () => {
    reset();
    // Clear localStorage persistence
    localStorage.removeItem('groupFormation_selectedStudents');
    localStorage.removeItem('groupFormation_selectedLeader');
    localStorage.removeItem('groupFormation_searchTerm');
    localStorage.removeItem('groupFormation_currentStep');
    localStorage.removeItem('groupFormation_name');
    localStorage.removeItem('groupFormation_description');
    navigate('/dashboard/student');
  };

  const handleStudentSelection = (student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.some(s => s._id === student._id);
      if (isSelected) {
        toast.success(`${student.fullName} removed from selection`);
        return prev.filter(s => s._id !== student._id);
      } else {
        toast.success(`${student.fullName} added to selection`);
        return [...prev, student];
      }
    });
  };

  // Enhanced bulk invitation handling with leader assignment
  const handleBulkInvitations = async (groupId) => {
    const allInvitees = [...selectedStudents];
    if (selectedLeader && selectedLeader._id !== user._id && 
        !allInvitees.some(s => s._id === selectedLeader._id)) {
      allInvitees.push(selectedLeader);
    }

    if (allInvitees.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      const studentIds = allInvitees.map(s => s._id);
      const roles = allInvitees.map(student => 
        (selectedLeader && student._id === selectedLeader._id) ? 'leader' : 'member'
      );
      
      const response = await studentAPI.inviteToGroup(groupId, studentIds, roles);
      
      if (response.success) {
        const result = {
          successful: response.data?.successful || [],
          failed: response.data?.failed || [],
          total: studentIds.length
        };
        setInvitationResults(result);
        toast.success(`Successfully sent ${result.successful.length}/${result.total} invitations!`);
        
        if (result.failed.length > 0) {
          toast.warning(`${result.failed.length} invitations failed to send`);
        }
      } else {
        toast.error(`Bulk invitation failed: ${response.message}`);
      }
      
      setCurrentStep(3);
    } catch (error) {
      console.error('Failed to send bulk invitations:', error);
      toast.error(`Failed to send invitations: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && (selectedStudents.length > 0 || selectedLeader)) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteGroupCreation = () => {
    navigate('/dashboard/student');
  };

  const handleSendInvitations = async () => {
    if (!groupData || !groupData._id) {
      toast.error('Group data not available');
      return;
    }

    setIsSubmitting(true);
    try {
      const memberIds = selectedStudents.map(student => student._id);
      
      const response = await studentAPI.sendGroupInvitations(groupData._id, { memberIds });
      
      if (response.success) {
        toast.success('Invitations sent successfully!');
        
        // Clear localStorage on successful completion
        setTimeout(() => {
          localStorage.removeItem('groupFormation_selectedStudents');
          localStorage.removeItem('groupFormation_selectedLeader');
          localStorage.removeItem('groupFormation_searchTerm');
          localStorage.removeItem('groupFormation_currentStep');
          localStorage.removeItem('groupFormation_name');
          localStorage.removeItem('groupFormation_description');
        }, 3000);
        
        // Navigate to group invitations page
        navigate('/student/groups/invitations');
      } else {
        toast.error(response.message || 'Failed to send invitations');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast.error(`Failed to send invitations: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If student is already in a group, show group management
  if (isInGroup && sem5Group) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Manage Your Group
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage your Minor Project 2 group members and settings
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard/student')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Group Information */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Group Information</h2>
                </div>
                <div className="p-6">
                  <GroupCard 
                    group={sem5Group} 
                    showActions={false}
                    userRole="student"
                  />
                </div>
              </div>

              {/* Group Members */}
              <div className="mt-8 bg-white rounded-lg shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Group Members</h2>
                </div>
                <div className="p-6">
                  <GroupMemberList 
                    members={sem5Group.members || []}
                    showRoles={true}
                    showContact={true}
                    currentUserId={user._id}
                    canManage={isGroupLeader}
                  />
                </div>
              </div>
            </div>

            {/* Group Actions */}
            <div className="space-y-6">
              {/* Group Stats */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Members:</span>
                    <span className="font-medium">{getGroupStats().memberCount}/{getGroupStats().maxMembers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available Slots:</span>
                    <span className="font-medium">{getGroupStats().availableSlots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getGroupStats().isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getGroupStats().isComplete ? 'Complete' : 'Forming'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {isGroupLeader && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Actions</h3>
                  <div className="space-y-3">
                    {getGroupStats().availableSlots > 0 && (
                      <button
                        onClick={() => navigate('/student/groups/invite')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Invite Members
                      </button>
                    )}
                    
                    {getGroupStats().isComplete && (
                      <button
                        onClick={() => navigate('/student/projects/details')}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Add Project Details
                      </button>
                    )}
                    
                    <button
                      onClick={() => navigate(`/student/groups/${sem5Group._id}/dashboard`)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Group Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If student can create a group, show group creation form
  if (canCreateGroup) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Create Your Group
                </h1>
                <p className="mt-2 text-gray-600">
                  Form a group for your Minor Project 2 (4-5 members)
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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > 1 ? '✓' : '1'}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= 1 ? 'font-medium text-blue-600' : 'text-gray-500'
                }`}>
                  Create Group
                </span>
              </div>
              <div className={`flex-1 h-0.5 ${currentStep > 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > 2 ? '✓' : '2'}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= 2 ? 'font-medium text-blue-600' : 'text-gray-500'
                }`}>
                  Invite Members
                </span>
              </div>
              <div className={`flex-1 h-0.5 ${currentStep > 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > 3 ? '✓' : '3'}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= 3 ? 'font-medium text-blue-600' : 'text-gray-500'
                }`}>
                  Complete Group
                </span>
              </div>
            </div>
          </div>

          {/* Multi-Step Group Creation Workflow */}
          {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Step 1: Group Details</h2>
              <p className="text-gray-600 mt-1">
                  Set basic group information and optional leadership assignment.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              {/* Group Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  id="name"
                  {...register('name', {
                    required: 'Group name is required',
                    minLength: {
                      value: 3,
                      message: 'Group name must be at least 3 characters long'
                    },
                    maxLength: {
                      value: 50,
                      message: 'Group name cannot exceed 50 characters'
                    }
                  })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your group name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Group Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Group Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  {...register('description', {
                    maxLength: {
                      value: 300,
                      message: 'Description cannot exceed 300 characters'
                    }
                  })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Briefly describe your group's focus and objectives..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || groupLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    currentStep === 1 ? 'Next' : 'Create Group'
                  )}
                </button>
              </div>
            </form>
          </div>
          )}

          {/* Step 2: Leader Selection & Member Search */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Step 2: Invite Members</h2>
                  <p className="text-gray-600 mt-1">
                    Select members to invite to your group. This will first create your group, then send invitations.
                  </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                {/* Selected Students Section - Always Visible (includes current user + selected members) */}
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-lg font-medium text-green-900 mb-3">
                    Group Members ({selectedStudents.length + 1})
                  </h3>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {/* Current User (Group Creator) - Always at top */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">👤</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {user.fullName || user.name}
                            <span className="ml-2 text-xs text-blue-600">(You - Group Creator)</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {roleData?.misNumber || roleData?.rollNumber || user?.misNumber || user?.rollNumber || 'MIS# -'} • {roleData?.collegeEmail || user?.collegeEmail || user?.email || 'Email not available'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center text-sm">
                          <input
                            type="radio"
                            name="leaderChoice"
                            checked={!selectedLeader || selectedLeader === null}
                            onChange={() => setSelectedLeader(null)}
                            className="mr-1"
                          />
                          Set as leader
                        </label>
                      </div>
                    </div>
                    
                    {/* Selected Members */}
                    {selectedStudents.map((student) => (
                      <div key={student._id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm">✓</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{student.fullName}</div>
                            <div className="text-sm text-gray-600">{student.rollNumber} • {student.collegeEmail}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center text-sm">
                            <input
                              type="radio"
                              name="leaderChoice"
                              checked={selectedLeader?._id === student._id}
                              onChange={() => setSelectedLeader(student)}
                              className="mr-1"
                            />
                            Set as leader
                          </label>
                          <button
                            onClick={() => handleStudentSelection(student)}
                            className="px-3 py-1 text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Search and Available Students */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Search Students ({filteredStudents.length} found)
                  </h3>
                  
                  {/* Search Input */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search students by name or roll number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {!searchTerm || searchTerm.length < 2 ? (
                    <p className="text-sm text-gray-500 mb-4">Start typing to search for students...</p>
                  ) : null}

                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading students...</p>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {searchTerm && searchTerm.length >= 2 
                          ? 'No students found matching your search.' 
                          : 'No students available for invitation.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                      {filteredStudents.map((student) => {
                        const isSelected = selectedStudents.some(s => s._id === student._id);
                        return (
                          <label key={student._id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-300' 
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleStudentSelection(student)}
                              className="mr-3 rounded"
                            />
                            <div className="flex items-center space-x-4 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-300 text-gray-600'
                              }`}>
                                <span className="text-lg">{isSelected ? '✓' : '👤'}</span>
                              </div>
                              <div className="flex-1">
                                <div className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                  {student.fullName}
                                  {isSelected && <span className="ml-2 text-xs text-blue-600">(Selected)</span>}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {student.rollNumber} • {student.collegeEmail}
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selection Achievement Summary */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <h4 className="font-medium text-blue-900">Ready to Send Invitations</h4>
                      <div className="flex items-center space-x-6 text-sm text-blue-800">
                        <span>👨‍🏫 Leader: {selectedLeader?.fullName || user.fullName || user.name || 'You (current)'}</span>
                        <span>👥 Total Members: {selectedStudents.length + 1}</span>
                      </div>
                    </div>
                    <div className="text-sm text-blue-600">
                      {selectedStudents.length > 0 
                        ? `${selectedStudents.length} invitation${selectedStudents.length > 1 ? 's' : ''} will be sent`
                        : 'Group will be created with just you (the leader)'
                      }
                    </div>
                  </div>
                </div>

                {/* Step Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handlePreviousStep}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    ← Back
                  </button>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Skip Invitations
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      disabled={isSubmitting || isLoading}
                    >
                      Next: Send Invitations
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Invitation Results & Summary */}
          {currentStep === 3 && (
            <div className="bg-white rounded-lg shadow-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Step 3: Send Invitations</h2>
                <p className="text-gray-600 mt-1">
                  Review your group and send invitations to selected members.
                </p>
              </div>

              <div className="p-6">
                {/* Group Summary */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-3">📋 Group Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-800">Group Name:</span>
                      <span className="ml-2 text-blue-700">{watchedName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Description:</span>
                      <span className="ml-2 text-blue-700">{watchedDescription}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Leader:</span>
                      <span className="ml-2 text-blue-700">{user.fullName || user.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Total Members:</span>
                      <span className="ml-2 text-blue-700">{selectedStudents.length + 1}</span>
                      <span className="ml-1 text-xs text-blue-600">(You + {selectedStudents.length} invites)</span>
                    </div>
                  </div>
                </div>

                {/* Group Members Summary */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">👥 Group Members & Invitations</h3>
                  
                  {/* Current Leader (You) */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Group Leader</h4>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {user.fullName?.charAt(0) || user.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">
                              {user.fullName || user.name}
                            </span>
                            <span className="ml-2 text-sm text-gray-600">
                              • {roleData?.misNumber || roleData?.rollNumber || 'MIS# -'}
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Leader (You)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Members to Invite */}
                  {selectedStudents.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Members to Invite ({selectedStudents.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedStudents.map((student, index) => (
                          <div key={index} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {student.fullName?.charAt(0) || 'S'}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-900">{student.fullName}</span>
                                  <span className="ml-2 text-sm text-gray-600">
                                    • {student.misNumber || student.rollNumber || 'MIS# -'}
                                  </span>
                                  {student.branch && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      • {student.branch}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                📤 Will invite
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No members selected */}
                  {selectedStudents.length === 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-500 text-sm">No additional members selected</p>
                      <p className="text-gray-400 text-xs mt-1">You can invite members later from the group dashboard</p>
                    </div>
                  )}
                </div>

                {/* Confirmation Message */}
                <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h3 className="font-medium text-yellow-900 mb-2">⚠️ Confirmation Required</h3>
                  <p className="text-sm text-yellow-800">
                    You are about to send invitations to {selectedStudents.length} student(s). 
                    Once sent, they will receive notifications and can accept or reject the invitations.
                  </p>
                  {selectedStudents.length > 0 && (selectedStudents.length + 1) < 4 && (
                    <p className="text-sm text-orange-800 mt-2">
                      ⚠️ <strong>Note:</strong> You need at least 3 more students to meet the minimum group size of 4 members.
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
                  >
                    Back to Edit
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleSendInvitations}
                    disabled={isSubmitting || selectedStudents.length === 0 || (selectedStudents.length + 1) < 4}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending Invitations...' : `Send ${selectedStudents.length} Invitation${selectedStudents.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Information Card */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">🏗️ Enhanced Group Formation Process</h3>
            <div className="text-blue-800 space-y-2">
              <p>• <strong>Step 1:</strong> Basic group details and optional leadership assignment</p>
              <p>• <strong>Step 2:</strong> Member selection with live student search functionality</p>
              <p>• <strong>Step 3:</strong> Automated bulk invitation sending with results tracking</p>
              <p>• <strong>Real-time:</strong> WebSocket notifications for invitation responses</p>
              <p>• <strong>Management:</strong> Advanced leader transfer and group finalization controls</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If student cannot create a group, show message
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cannot Create Group</h3>
          <p className="text-gray-600 mb-4">
            You need to register for Minor Project 2 before creating a group.
          </p>
          <button
            onClick={() => navigate('/student/sem5/register')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Register Project First
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupFormation;
