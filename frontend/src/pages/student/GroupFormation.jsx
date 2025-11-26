import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSem5Project } from '../../hooks/useSem5Project';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useSem7 } from '../../context/Sem7Context';
import { useSem8Project } from '../../hooks/useSem8Project';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import websocketManager from '../../utils/websocket';
import GroupCard from '../../components/groups/GroupCard';
import GroupMemberList from '../../components/groups/GroupMemberList';
import StudentSearch from '../../components/groups/StudentSearch';
import StatusBadge from '../../components/common/StatusBadge';
import Layout from '../../components/common/Layout';

const GroupFormation = () => {
  const navigate = useNavigate();
  const { user, roleData } = useAuth();
  // Note: Sem5Project no longer needed for group creation in new workflow
  // Groups are created independently, then linked to projects during registration
  const { 
    sem5Group, 
    majorProject1Group,
    group, // Generic group reference (works for both Sem 5 and Sem 7)
    canCreateGroup, 
    isInGroup, 
    isGroupLeader, 
    getGroupStats,
    createGroup,
    loading: groupLoading,
    fetchSem5Data // This handles both Sem 5 and Sem 7 data refresh
  } = useGroupManagement();
  
  // Determine current semester for group creation
  const currentSemester = roleData?.semester || user?.semester || 5;
  
  // Get Sem 7 context for track checking (only used for error messages)
  const sem7Context = useSem7();
  
  // Get Sem 8 context for Type 1 students
  const sem8Context = useSem8Project();
  const { studentType: sem8StudentType, isType1: sem8IsType1, majorProject2Group: sem8Group, loading: sem8Loading } = sem8Context || {};
  
  // Use the appropriate group based on semester
  const currentGroup = currentSemester === 7 ? majorProject1Group : 
                       currentSemester === 8 ? sem8Group : 
                       sem5Group;

  // WebSocket for real-time updates (optional - not critical for group formation)
  // Note: WebSocket connection status is hidden as it's not required for basic functionality
  const { isConnected } = useWebSocket();

  // Initialize state from localStorage or defaults
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(() => {
    const saved = localStorage.getItem('groupFormation_selectedStudents');
    return saved ? JSON.parse(saved) : [];
  });
  // Removed selectedLeader state - creator is always the leader
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('groupFormation_searchTerm') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('groupFormation_currentStep');
    // Start at step 1 (which is now member invitation, previously step 2)
    return saved ? parseInt(saved) : 1;
  });
  
  // Group size limits from admin config
  const [minGroupMembers, setMinGroupMembers] = useState(4); // Default fallback
  const [maxGroupMembers, setMaxGroupMembers] = useState(5); // Default fallback
  const [configLoading, setConfigLoading] = useState(true);
  
  // Pagination and search optimization
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreStudents, setHasMoreStudents] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [invitationResults, setInvitationResults] = useState(null);
  const [groupData, setGroupData] = useState(null);

  // Removed form for name/description - no longer needed
  // Group name will be auto-generated on backend

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem('groupFormation_selectedStudents', JSON.stringify(selectedStudents));
  }, [selectedStudents]);

  // Removed selectedLeader localStorage persistence

  useEffect(() => {
    localStorage.setItem('groupFormation_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('groupFormation_currentStep', currentStep.toString());
  }, [currentStep]);

  // Load group size limits from admin config
  useEffect(() => {
    const loadGroupConfig = async () => {
      try {
        setConfigLoading(true);
        // Determine config key based on semester
        // Use sem5, sem7.major1, sem8.major2 pattern
        let minConfigKey, maxConfigKey;
        if (currentSemester === 7) {
          minConfigKey = 'sem7.major1.minGroupMembers';
          maxConfigKey = 'sem7.major1.maxGroupMembers';
        } else if (currentSemester === 8) {
          minConfigKey = 'sem8.major2.group.minGroupMembers';
          maxConfigKey = 'sem8.major2.group.maxGroupMembers';
        } else {
          minConfigKey = 'sem5.minGroupMembers';
          maxConfigKey = 'sem5.maxGroupMembers';
        }
        
        // Fetch min and max group members from config
        // Use Promise.allSettled to handle individual failures gracefully
        const [minResult, maxResult] = await Promise.allSettled([
          studentAPI.getSystemConfig(minConfigKey).catch(() => ({ success: false })),
          studentAPI.getSystemConfig(maxConfigKey).catch(() => ({ success: false }))
        ]);
        
        // Handle min config
        if (minResult.status === 'fulfilled' && minResult.value?.success && minResult.value?.data?.value) {
          setMinGroupMembers(parseInt(minResult.value.data.value));
        }
        
        // Handle max config
        if (maxResult.status === 'fulfilled' && maxResult.value?.success && maxResult.value?.data?.value) {
          setMaxGroupMembers(parseInt(maxResult.value.data.value));
        }
      } catch (error) {
        // Silently handle config loading errors - defaults are already set (4, 5)
        // Configs may not exist yet if admin hasn't initialized them
      } finally {
        setConfigLoading(false);
    }
    };
    
    loadGroupConfig();
  }, [currentSemester]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    // Note: Removed all WebSocket toast handlers to avoid duplicates with API response toasts.
    // - Group creation: Toast shown in handleSendInvitations (line ~525)
    // - Invitation responses: Handled in Dashboard.jsx (for the accepting user)
    // - Group updates: Real-time updates shown in GroupDashboard.jsx (not toasts)
  }, [isConnected]);

  // Load available students with pagination and search optimization
  const loadAvailableStudents = async (search = '', page = 1, append = false) => {
    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const response = await studentAPI.getAvailableStudents({ 
        search,
        page: page,
        limit: 20, // Load 20 students at a time
        semester: currentSemester // Pass current semester for proper filtering
      });
      
      if (response.success) {
        const newStudents = response.data || [];
        const total = response.total || 0;
        
        if (append) {
          setAvailableStudents(prev => [...prev, ...newStudents]);
        } else {
          setAvailableStudents(newStudents);
        }
        
        setTotalStudents(total);
        setHasMoreStudents(newStudents.length === 20 && availableStudents.length + newStudents.length < total);
        setCurrentPage(page);
        
        if (search.trim()) {
          setHasSearched(true);
        }
      } else {
        console.error(`[GroupFormation] API Error:`, response.message || 'Unknown error');
        toast.error(response.message || 'Failed to load available students');
        setAvailableStudents([]);
      }
      } catch (error) {
        console.error('Failed to load available students:', error);
        toast.error('Failed to load available students');
      setAvailableStudents([]);
      } finally {
        setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Removed redundant useEffect - search is handled by the debounced search useEffect below

  // Real-time search with debouncing - only on step 1 (invite members)
  useEffect(() => {
    // Only trigger search when on step 1 (invite members step)
    if (currentStep !== 1) return;

    const timeoutId = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 2) {
        setCurrentPage(1);
        setHasSearched(true);
        loadAvailableStudents(searchTerm, 1, false);
      } else if (searchTerm === '') {
        // Clear results when search is empty
        setAvailableStudents([]);
        setHasSearched(false);
        setCurrentPage(1);
        setHasMoreStudents(false);
    }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentStep]);

  // Calculate invite status for a student (internal function)
  const calculateInviteStatus = useCallback((student) => {
    // Check if student is already selected
    if (selectedStudents.some(s => s._id === student._id)) {
      return { status: 'selected', message: 'Selected' };
    }
    
    // For Sem 7: Check if student is eligible for coursework
    if (currentSemester === 7 && student.semester === 7) {
      // Check if student is not eligible for coursework
      if (student.isCourseworkEligible === false || student.isCourseworkEligible === undefined) {
        const trackInfo = student.trackInfo;
        
        if (!trackInfo?.hasSelectedTrack) {
          return { status: 'no_track_selected', message: 'Track not selected', disabled: true };
        } else if (trackInfo?.selectedTrack === 'internship') {
          return { status: 'internship_track', message: '6-month internship track', disabled: true };
        } else {
          return { status: 'not_coursework', message: 'Not in coursework track', disabled: true };
        }
      }
    }
    
    // For Sem 8: Check if student is Type 1 (only Type 1 students can join groups)
    if (currentSemester === 8 && student.semester === 8) {
      // Check if student is not Type 1 eligible
      if (student.isType1Eligible === false || student.isType1Eligible === undefined) {
        const studentType = student.sem8StudentType;
        
        if (!studentType) {
          return { status: 'no_sem8_type', message: 'Sem 8 type not determined', disabled: true };
        } else if (studentType === 'type2') {
          return { status: 'type2_student', message: 'Type 2 student (must do solo project)', disabled: true };
        } else {
          return { status: 'not_type1', message: 'Not Type 1 student', disabled: true };
        }
      }
    }
    
    // Check if student is already in a group
    if (student.isInGroup) {
      return { status: 'in_group', message: 'Already in a group' };
    }
    
    // Check if student has pending invitation from current group
    if (student.status === 'pending_from_current_group' || student.hasPendingInviteFromCurrentGroup) {
      return { status: 'pending_from_current_group', message: 'Invitation pending' };
    }
    
    // Check if student has rejected invitation from current group
    if (student.status === 'rejected_from_current_group' || student.hasRejectedInviteFromCurrentGroup) {
      return { status: 'rejected_from_current_group', message: 'Previously rejected' };
    }
    
    // Check if student has pending invites from other groups
    if (student.status === 'pending_invites' || student.pendingInvites > 0) {
      return { status: 'pending_invites', message: 'Has pending invites' };
    }
    
    // Check if we've reached max group size (from config)
    const currentGroupSize = selectedStudents.length + 1; // +1 for creator
    if (currentGroupSize >= maxGroupMembers) {
      return { status: 'group_full', message: 'Group is full' };
    }
    
    // Student is available
    return { status: 'available', message: 'Available' };
  }, [selectedStudents, currentSemester, maxGroupMembers]);

  // Memoize invite status to avoid excessive recalculations
  const inviteStatusCache = useMemo(() => {
    const cache = new Map();
    availableStudents.forEach(student => {
      const status = calculateInviteStatus(student);
      cache.set(student._id, status);
    });
    return cache;
  }, [availableStudents, selectedStudents, currentSemester, calculateInviteStatus]);

  // Get invite status (uses cache)
  const getInviteStatus = useCallback((student) => {
    return inviteStatusCache.get(student._id) || calculateInviteStatus(student);
  }, [inviteStatusCache, calculateInviteStatus]);

  // Filter students based on search term (for immediate client-side filter)
  const filteredStudents = availableStudents.filter(student =>
    searchTerm === '' || 
    student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.misNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort students by main status categories for better UX
  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents].sort((a, b) => {
    const statusA = getInviteStatus(a);
    const statusB = getInviteStatus(b);
    
    // Define priority order for main statuses (lower number = higher priority)
    const statusPriority = {
      'selected': 1,      // Selected students first
      'available': 2,     // Available students second
        'in_group': 3,      // In group students
        'no_track_selected': 4,  // Disabled: Track not selected (Sem 7)
        'internship_track': 5,   // Disabled: Internship track (Sem 7)
        'not_coursework': 6,     // Disabled: Not coursework (Sem 7)
        'no_sem8_type': 7,       // Disabled: Sem 8 type not determined
        'type2_student': 8,      // Disabled: Type 2 student (Sem 8)
        'not_type1': 9           // Disabled: Not Type 1 (Sem 8)
    };
    
    // Get priority for each status, defaulting to 999 for other statuses
    const priorityA = statusPriority[statusA.status] || 999;
    const priorityB = statusPriority[statusB.status] || 999;
    
    // First sort by status priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // If same status, sort by name alphabetically
    return (a.fullName || '').localeCompare(b.fullName || '');
  });
    
    return sorted;
  }, [filteredStudents, inviteStatusCache, currentSemester, hasSearched, getInviteStatus]);
  
  // Removed excessive debug logging

  // Enhanced multi-step group creation workflow
  // Note: Step 1 (name/description) removed - now starts directly with member invitation

  const onCancel = () => {
    // Clear localStorage persistence
    localStorage.removeItem('groupFormation_selectedStudents');
    localStorage.removeItem('groupFormation_searchTerm');
    localStorage.removeItem('groupFormation_currentStep');
    navigate('/dashboard/student');
  };

  const handleStudentSelection = (student) => {
  const inviteStatus = getInviteStatus(student);
  
  // Check if student is disabled (for Sem 7 track restrictions or Sem 8 Type 1 restrictions)
  if (inviteStatus.disabled) {
    toast.error(`Cannot select ${student.fullName}: ${inviteStatus.message}`);
    return;
  }
  
  // Only allow selection of students who can be invited
  const canSelect = inviteStatus.status === 'available' || 
                   inviteStatus.status === 'selected' || 
                   inviteStatus.status === 'rejected_from_current_group';
  
  if (!canSelect) {
    toast.error(`Cannot select ${student.fullName}: ${inviteStatus.message}`);
    return;
  }
  
  // Moved toast calls OUTSIDE the state updater
  const isSelected = selectedStudents.some(s => s._id === student._id);
  if (isSelected) {
    setSelectedStudents(prev => prev.filter(s => s._id !== student._id));
    toast.success(`${student.fullName} removed from selection`);
  } else {
    // Check if we're at max group size
    const currentGroupSize = selectedStudents.length + 1; // +1 for creator
    if (currentGroupSize >= maxGroupMembers) {
      toast.error(`Group is full (maximum ${maxGroupMembers} members)`);
      return;
    }
    setSelectedStudents(prev => [...prev, student]);
    toast.success(`${student.fullName} added to selection`);
  }
};

  // Load more students for pagination
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreStudents) {
      loadAvailableStudents(searchTerm, currentPage + 1, true);
    }
  };

  // Enhanced bulk invitation handling with leader assignment
  const handleBulkInvitations = async (groupId) => {
    const allInvitees = [...selectedStudents];
    // Removed external leader logic - creator is always the leader

    if (allInvitees.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      const studentIds = allInvitees.map(s => s._id);
      const roles = allInvitees.map(() => 'member'); // All invited students are members
      
      const response = await studentAPI.inviteToGroup(groupId, studentIds, roles);
      
      // Handle partial success (some invitations failed) - similar to Group Dashboard
      if (response && response.results && response.errors) {
        const successCount = response.results.length;
        const errorCount = response.errors.length;
        const reinviteCount = response.results.filter(r => r.status === 'reinvited').length;
        const newInviteCount = successCount - reinviteCount;
        
        if (successCount > 0 && errorCount > 0) {
          if (reinviteCount > 0 && newInviteCount > 0) {
            toast.success(`${newInviteCount} new invitation(s) sent, ${reinviteCount} reinvitation(s) sent!`);
          } else if (reinviteCount > 0) {
            toast.success(`${reinviteCount} reinvitation(s) sent successfully!`);
          } else {
            toast.success(`${newInviteCount} invitation(s) sent successfully!`);
          }
          toast.error(`${errorCount} invitation(s) failed: ${response.errors.join(', ')}`);
        } else if (successCount > 0) {
          if (reinviteCount > 0 && newInviteCount > 0) {
            toast.success(`${newInviteCount} new invitation(s) sent, ${reinviteCount} reinvitation(s) sent!`);
          } else if (reinviteCount > 0) {
            toast.success(`${reinviteCount} reinvitation(s) sent successfully!`);
          } else {
            toast.success(`${newInviteCount} invitation(s) sent successfully!`);
          }
        } else {
          toast.error(`All invitations failed: ${response.errors.join(', ')}`);
        }
        
        const result = {
          successful: response.results || [],
          failed: response.errors || [],
          total: studentIds.length
        };
        setInvitationResults(result);
      } else if (response.success) {
        const result = {
          successful: response.data?.successful || [],
          failed: response.data?.failed || [],
          total: studentIds.length
        };
        setInvitationResults(result);
        toast.success(`Successfully sent ${result.successful.length}/${result.total} invitations!`);
        
        if (result.failed.length > 0) {
          toast(`${result.failed.length} invitations failed to send`, {
            icon: '⚠️',
            duration: 4000
          });
        }
      } else {
        toast.error(`Bulk invitation failed: ${response.message}`);
      }
      
      setCurrentStep(2);
    } catch (error) {
      console.error('Failed to send bulk invitations:', error);
      toast.error(`Failed to send invitations: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    // Validation before proceeding to confirmation step
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student to invite');
      return;
    }
    
    const currentGroupSize = selectedStudents.length + 1; // +1 for creator
    if (currentGroupSize > maxGroupMembers) {
      toast.error(`Group cannot have more than ${maxGroupMembers} members`);
      return;
    }
    
    // Check minimum requirement
    if (currentGroupSize < minGroupMembers) {
      toast(`Group should have at least ${minGroupMembers} members. You can add more members later.`, {
        icon: '⚠️',
        duration: 4000
      });
      // Allow proceeding but warn the user
    }
    
    // Check if any selected students are unavailable or disabled
    const unavailableStudents = selectedStudents.filter(student => {
      const status = getInviteStatus(student);
      // Check if student is disabled (for Sem 7 track restrictions or Sem 8 Type 1 restrictions)
      if (status.disabled) {
        return true;
      }
      return status.status !== 'available' && status.status !== 'selected' && status.status !== 'rejected_from_current_group';
    });
    
    if (unavailableStudents.length > 0) {
      toast.error(`Cannot proceed: Some selected students are unavailable or not eligible (${unavailableStudents.map(s => s.fullName).join(', ')})`);
      return;
    }
    
    // Proceed to step 2 (confirmation page)
    if (currentStep === 1) {
      setCurrentStep(2);
      setInvitationResults(null);
      toast.success('Ready to create group and send invitations!');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else if (currentStep === 1) {
      // On step 1, go back to dashboard
      onCancel();
    }
  };

  const handleCompleteGroupCreation = () => {
    navigate('/dashboard/student');
  };

  const handleSendInvitations = async () => {
    setIsSubmitting(true);
    try {
      // First, create the group (name/description will be auto-generated if not provided)
      const groupData = {
        semester: currentSemester, // Use dynamic semester (5 for Sem 5, 7 for Sem 7)
        academicYear: user.academicYear || '2024-25',
        memberIds: selectedStudents.map(student => student._id),
        maxMembers: maxGroupMembers, // Use config value
        minMembers: minGroupMembers // Use config value
      };

      console.log('Creating group with data:', groupData);
      
      const createResponse = await studentAPI.createGroup(groupData);
      
      if (!createResponse.success) {
        toast.error(createResponse.message || 'Group creation failed');
      return;
    }

      console.log('Group created successfully:', createResponse.data);
      
      // Get group ID from the response
      const groupId = createResponse.data._id || createResponse.data.id || createResponse.data.group?._id;
      
      if (!groupId) {
        console.error('Group creation response:', createResponse.data);
        toast.error('Group ID not found in response');
        return;
      }

      // Refresh context data after creating group
      // This ensures the UI reflects the new group immediately
      if (currentSemester === 8) {
        // Refresh Sem 8 context
        if (sem8Context?.fetchSem8Data) {
          await sem8Context.fetchSem8Data();
        }
      } else if (currentSemester === 7) {
        // Refresh Sem 7 context
        if (sem7Context?.fetchSem7Data) {
          await sem7Context.fetchSem7Data();
        }
      } else {
        // Refresh Sem 5 context
        await fetchSem5Data();
      }

      // Now send invitations (if any)
      if (selectedStudents.length > 0) {
      const memberIds = selectedStudents.map(student => student._id);
      
      const inviteResponse = await studentAPI.sendGroupInvitations(groupId, { memberIds });
      
      if (inviteResponse.success) {
        toast.success('Group created and invitations sent successfully!');
        setInvitationResults(inviteResponse.data);
        } else {
          toast.error(inviteResponse.message || 'Failed to send invitations');
          // Still proceed to navigate even if invitations failed
        }
      } else {
        toast.success('Group created successfully!');
      }
        
        // Clear localStorage on successful completion
        setTimeout(() => {
          localStorage.removeItem('groupFormation_selectedStudents');
          localStorage.removeItem('groupFormation_searchTerm');
          localStorage.removeItem('groupFormation_currentStep');
        }, 3000);
      
      // Refresh context data again after sending invitations (if any)
      await fetchSem5Data();
        
        // Navigate to group dashboard
        setTimeout(() => {
          navigate(`/student/groups/${groupId}/dashboard`);
        }, 2000);
    } catch (error) {
      console.error('Error in group creation or invitation sending:', error);
      toast.error(`Failed to create group or send invitations: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If student is already in a group, show group management
  if (isInGroup && currentGroup) {
    const projectType = currentSemester === 7 ? 'Major Project 1' : 
                        currentSemester === 8 ? 'Major Project 2' : 
                        'Minor Project 2';
    return (
      <Layout>
        <div className="py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Manage Your Group
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage your {projectType} group members and settings
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
                    group={currentGroup} 
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
                    members={currentGroup.members || []}
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
                    
                    {getGroupStats().isComplete && currentSemester === 5 && (
                      <button
                        onClick={() => navigate('/student/sem5/register')}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Register Minor Project 2
                      </button>
                    )}
                    
                    {currentSemester === 7 && currentGroup.status === 'finalized' && (
                    <button
                        onClick={() => navigate('/student/major-project-1/register')}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Register Major Project 1
                      </button>
                    )}
                    
                    <button
                      onClick={() => navigate(`/student/groups/${currentGroup._id}/dashboard`)}
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
      </Layout>
    );
  }

  // For Sem 8, wait for Sem8Context to load before checking canCreateGroup
  if (currentSemester === 8 && sem8Loading) {
    return (
      <Layout>
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading group creation options...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // If student can create a group, show group creation form
  if (canCreateGroup) {
    return (
      <Layout>
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Create Your Group
                </h1>
                <p className="mt-2 text-gray-600">
                  {currentSemester === 7 
                    ? 'Form a new group for your Major Project 1 (coursework students only)'
                    : `Form a group for your Minor Project 2 (${minGroupMembers}-${maxGroupMembers} members)`
                  }
                </p>
                {/* Real-time status indicator - Hidden since WebSocket isn't critical for group formation */}
                {/* WebSocket connection is optional and not required for basic group creation functionality */}
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

          {/* Progress Indicator - Now 2 steps instead of 3 */}
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
                  Invite Members
                </span>
              </div>
              <div className={`flex-1 h-0.5 ${currentStep > 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep >= 2 ? '2' : '2'}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= 2 ? 'font-medium text-blue-600' : 'text-gray-500'
                }`}>
                  Create Group
                </span>
              </div>
            </div>
          </div>

          {/* Multi-Step Group Creation Workflow */}
          {/* Step 1: Member Invitation (previously Step 2) */}
          {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Step 1: Invite Members</h2>
              <p className="text-gray-600 mt-1">
                    Select members to invite to your group. As the group creator, you will be the group leader. Group name will be auto-generated.
                  </p>
              </div>

              <div className="p-6">
                {/* Group Creator Info - Always the Leader */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-900 mb-3">
                    Group Leader & Creator
                  </h3>
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-blue-200">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600">👑</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                        {roleData?.fullName || user?.fullName || user?.name || 'Loading...'}
                        <span className="ml-2 text-sm text-blue-600">(You - Group Creator & Leader)</span>
                          </div>
                          <div className="text-sm text-gray-600">
                        {roleData?.misNumber || roleData?.rollNumber || 'MIS# -'} • {roleData?.collegeEmail || user?.collegeEmail || user?.email || 'Email not available'}
                          </div>
                      <div className="text-xs text-blue-700 mt-1">
                        💡 As the group creator, you will be the group leader. You can transfer leadership later from the group dashboard.
                        </div>
                      </div>
                      </div>
                    </div>
                    
                    {/* Selected Members */}
                {selectedStudents.length > 0 && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-medium text-green-900 mb-3">
                      Members to Invite ({selectedStudents.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
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
                          <button
                            onClick={() => handleStudentSelection(student)}
                            className="px-3 py-1 text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {/* Search and Available Students */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {hasSearched ? `Search Results (${sortedStudents.length} found)` : 'Search Students'}
                  </h3>
                  
                  {/* Search Input */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder={currentSemester === 7 
                        ? "Search Semester 7 coursework students by name, email, phone, or MIS number..."
                        : "Search CSE & ECE students by name, email, phone, or MIS number..."
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      maxLength={50}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="mt-1 flex justify-between items-center">
                      {!hasSearched ? (
                        <div className="text-sm text-gray-500">
                          <p className="mb-1">💡 Start typing to search for students. This helps load results faster.</p>
                          <p className="text-xs text-gray-400">
                            {currentSemester === 7 
                              ? <>Search <strong>Semester 7 coursework</strong> students by: <strong>name</strong>, <strong>email</strong>, <strong>phone number</strong>, or <strong>MIS number</strong>. Students on internship track or without a track selection will be shown but disabled.</>
                              : currentSemester === 8
                              ? <>Search <strong>Semester 8 Type 1</strong> students by: <strong>name</strong>, <strong>email</strong>, <strong>phone number</strong>, or <strong>MIS number</strong>. Only Type 1 students (completed 6-month internship in Sem 7) can join groups. Type 2 students will be shown but disabled.</>
                              : <>Search {currentSemester}th semester <strong>CSE & ECE</strong> students by: <strong>name</strong>, <strong>email</strong>, <strong>phone number</strong>, or <strong>MIS number</strong></>
                            }
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Search results for: "{searchTerm}"
                        </p>
                      )}
                      <span className="text-xs text-gray-400">
                        {searchTerm.length}/50 characters
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Legend and Quick Stats - Only show when search has been performed */}
                  {hasSearched && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Students are sorted by status:</span>
                        <span className="text-xs text-gray-500">Selected → Available → Others</span>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className={`mb-3 grid gap-2 text-xs ${currentSemester === 7 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                        {(() => {
                          const stats = sortedStudents.reduce((acc, student) => {
                            const status = getInviteStatus(student);
                            acc[status.status] = (acc[status.status] || 0) + 1;
                            return acc;
                          }, {});
                          
                          const statItems = [
                            { key: 'selected', label: 'Selected', color: 'blue', count: stats.selected || 0 },
                            { key: 'available', label: 'Available', color: 'green', count: stats.available || 0 },
                            { key: 'in_group', label: 'In Group', color: 'red', count: stats.in_group || 0 }
                          ];
                          
                          // Add disabled stats for Sem 7
                          if (currentSemester === 7) {
                            const disabledCount = (stats.no_track_selected || 0) + (stats.internship_track || 0) + (stats.not_coursework || 0);
                            statItems.push({ key: 'disabled', label: 'Not Eligible', color: 'gray', count: disabledCount });
                          }
                          
                          return statItems.map(({ key, label, color, count }) => (
                            <div key={key} className="flex items-center justify-between p-2 bg-white rounded border">
                              <span className={`text-${color}-700 font-medium`}>{label}</span>
                              <span className={`text-${color}-600 font-bold`}>{count}</span>
                            </div>
                          ));
                        })()}
                      </div>
                      
                      {/* Status Legend */}
                      <div className="flex flex-wrap gap-4 text-xs">
                        <span className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-green-100 rounded-full border border-green-300"></div>
                          <span className="text-green-700">Available</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-blue-100 rounded-full border border-blue-300"></div>
                          <span className="text-blue-700">Selected</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-red-100 rounded-full border border-red-300"></div>
                          <span className="text-red-700">In Group</span>
                        </span>
                        {currentSemester === 7 && (
                          <>
                            <span className="flex items-center space-x-1">
                              <div className="w-3 h-3 bg-gray-200 rounded-full border border-gray-300"></div>
                              <span className="text-gray-600">Track not selected</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <div className="w-3 h-3 bg-gray-200 rounded-full border border-gray-300"></div>
                              <span className="text-gray-600">6-month internship track</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {!hasSearched ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-gray-400 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium mb-1">Search for Students</p>
                      <p className="text-sm text-gray-500 mb-2">Type at least 2 characters to find and invite CSE & ECE students to your group</p>
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>🔍 Search by <strong>name</strong> (e.g., "John", "Smith")</p>
                        <p>📧 Search by <strong>email</strong> (e.g., "john@iiitp.ac.in")</p>
                        <p>📱 Search by <strong>phone</strong> (e.g., "9876543210")</p>
                        <p>🎓 Search by <strong>MIS number</strong> (e.g., "000000123")</p>
                      </div>
                    </div>
                  ) : null}

                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading students...</p>
                    </div>
                  ) : hasSearched && sortedStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No students found matching your search.</p>
                    </div>
                  ) : hasSearched && sortedStudents.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                      {sortedStudents.map((student, index) => {
                        const isSelected = selectedStudents.some(s => s._id === student._id);
                        const inviteStatus = getInviteStatus(student);
                        // Check if student is disabled (for Sem 7 track restrictions or Sem 8 Type 1 restrictions)
                        const isDisabled = inviteStatus.disabled === true;
                        const canSelect = !isDisabled && (
                          inviteStatus.status === 'available' || 
                                         inviteStatus.status === 'selected' || 
                          inviteStatus.status === 'rejected_from_current_group'
                        );
                        
                        // Check if we need to add a separator
                        const prevStudent = index > 0 ? sortedStudents[index - 1] : null;
                        const prevStatus = prevStudent ? getInviteStatus(prevStudent) : null;
                        const showSeparator = prevStatus && prevStatus.status !== inviteStatus.status;
                        
                        return (
                          <div key={student._id}>
                            {/* Status Group Separator */}
                            {showSeparator && (
                              <div className="px-4 py-2 bg-gray-100 border-t border-b border-gray-200">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    inviteStatus.status === 'available' ? 'bg-green-400' :
                                    inviteStatus.status === 'selected' ? 'bg-blue-400' :
                                    inviteStatus.status === 'in_group' ? 'bg-red-400' : 'bg-gray-400'
                                  }`}></div>
                                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                    {inviteStatus.status === 'available' ? 'Available Students' :
                                     inviteStatus.status === 'selected' ? 'Selected Students' :
                                     inviteStatus.status === 'in_group' ? 'Already in Groups' : 'Other'}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Student Card */}
                            <div
                              onClick={() => canSelect && !isDisabled && handleStudentSelection(student)}
                              className={`p-3 mx-4 my-2 rounded-lg border transition-all duration-200 ${
                                canSelect && !isDisabled ? 'cursor-pointer' : 'cursor-not-allowed'
                              } ${
                            isSelected 
                                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-sm'
                                  : canSelect && !isDisabled
                                  ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                  : isDisabled
                                  ? 'bg-gray-100 border-gray-300 opacity-50'
                                  : 'bg-gray-50 border-gray-200 opacity-60'
                              }`}
                            >
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                <span className="font-bold text-sm">
                                  {isSelected ? '✓' : student.fullName?.charAt(0) || '?'}
                                </span>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <p className="font-medium text-gray-900 text-sm truncate">{student.fullName}</p>
                                  {isSelected && (
                                    <span className="bg-blue-100 text-blue-700 text-xs px-1 py-0.5 rounded-full font-medium">
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 truncate">{student.rollNumber || student.misNumber}</p>
                                {student.branch && (
                                  <p className="text-xs text-gray-500 truncate">{student.branch}</p>
                                )}
                                </div>
                              </div>
                            
                            <div className="mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                inviteStatus.status === 'available'
                                  ? 'bg-green-100 text-green-700'
                                  : inviteStatus.status === 'selected'
                                  ? 'bg-blue-100 text-blue-700'
                                  : inviteStatus.status === 'in_group'
                                  ? 'bg-red-100 text-red-700'
                                  : inviteStatus.status === 'pending_from_current_group'
                                  ? 'bg-orange-100 text-orange-700'
                                  : inviteStatus.status === 'rejected_from_current_group'
                                  ? 'bg-pink-100 text-pink-700'
                                  : inviteStatus.status === 'pending_invites'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : inviteStatus.status === 'group_full'
                                  ? 'bg-purple-100 text-purple-700'
                                  : inviteStatus.status === 'no_track_selected' || inviteStatus.status === 'internship_track' || inviteStatus.status === 'not_coursework' || inviteStatus.status === 'no_sem8_type' || inviteStatus.status === 'type2_student' || inviteStatus.status === 'not_type1'
                                  ? 'bg-gray-200 text-gray-600'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {inviteStatus.message}
                              </span>
                            </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Load More Button */}
                  {hasSearched && hasMoreStudents && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoadingMore ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Loading more...</span>
                          </div>
                        ) : (
                          `Load More Students (${totalStudents - availableStudents.length} remaining)`
                        )}
                      </button>
                    </div>
                  )}

                  {/* Search Info */}
                  {hasSearched && (
                    <div className="mt-4 text-center text-sm text-gray-500">
                      Showing {sortedStudents.length} search result{sortedStudents.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Selection Achievement Summary */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <h4 className="font-medium text-blue-900">Ready to Send Invitations</h4>
                      <div className="flex items-center space-x-6 text-sm text-blue-800">
                        <span>👑 Leader: {roleData?.fullName || user?.fullName || user?.name || 'Loading...'} (You)</span>
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
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className={`px-6 py-3 rounded-lg transition-all duration-200 ${
                        selectedStudents.length === 0 || isSubmitting || isLoading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      disabled={selectedStudents.length === 0 || isSubmitting || isLoading}
                    >
                      {selectedStudents.length === 0 
                        ? 'Select at least 1 student to continue'
                        : `Next: Review & Send Invitations (${selectedStudents.length})`
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Invitation Results & Summary (previously Step 3) */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Step 2: Create Group & Send Invitations</h2>
                <p className="text-gray-600 mt-1">
                  Review your group details and create the group with invitations to selected members. Group name will be auto-generated.
                </p>
              </div>

              <div className="p-6">
                {/* Group Summary */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-3">📋 Group Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-800">Group Name:</span>
                      <span className="ml-2 text-blue-700 italic">Will be auto-generated</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Leader:</span>
                      <span className="ml-2 text-blue-700">{roleData?.fullName || user?.fullName || user?.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Total Members:</span>
                      <span className="ml-2 text-blue-700">{selectedStudents.length + 1}</span>
                      <span className="ml-1 text-xs text-blue-600">(You + {selectedStudents.length} invites)</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Semester:</span>
                      <span className="ml-2 text-blue-700">Semester {currentSemester}</span>
                    </div>
                  </div>
                </div>

                {/* Group Members Summary */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">👥 Group Members & Invitations</h3>
                  
                  {/* Group Leader - Always Creator */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Group Leader</h4>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {(roleData?.fullName || user?.fullName || user?.name)?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">
                              {roleData?.fullName || user?.fullName || user?.name || 'Loading...'}
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
                    You are about to create your group and send invitations to {selectedStudents.length} student(s). 
                    Once created, the group will be permanent and invitations will be sent immediately.
                    You can invite more members later from the group dashboard.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <button
                      onClick={() => setCurrentStep(1)}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
                  >
                    Back to Edit
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleSendInvitations}
                    disabled={isSubmitting || selectedStudents.length === 0}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating Group & Sending Invitations...' : `Create Group & Send ${selectedStudents.length} Invitation${selectedStudents.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Information Card */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">🏗️ Group Formation Process</h3>
            <div className="text-blue-800 space-y-2">
              <p>• <strong>Step 1:</strong> Member selection with live student search functionality</p>
              <p>• <strong>Step 2:</strong> Automated bulk invitation sending with results tracking</p>
              <p>• <strong>Auto-generated:</strong> Group name is automatically created based on leader name and semester</p>
              <p>• <strong>Real-time:</strong> WebSocket notifications for invitation responses</p>
              <p>• <strong>Management:</strong> Advanced leader transfer and group finalization controls</p>
            </div>
          </div>
          </div>
        </div>
      </Layout>
    );
  }

  // If student cannot create a group, show message
  // Determine the reason why they can't create a group
  let errorMessage = '';
  let errorAction = null;
  let errorButtonText = 'Go Back';
  
  if (currentSemester === 7) {
    // Check if track is not selected or not coursework
    const selectedTrack = sem7Context.trackChoice?.finalizedTrack || sem7Context.trackChoice?.chosenTrack;
    
    if (!selectedTrack) {
      errorMessage = 'You need to select your track (coursework or internship) before creating a group for Major Project 1.';
      errorAction = () => navigate('/student/sem7/track-selection');
      errorButtonText = 'Select Track First';
    } else if (selectedTrack !== 'coursework') {
      errorMessage = 'Only students in the coursework track can create groups for Major Project 1. You have selected the internship track.';
      errorAction = () => navigate('/student/sem7/track-selection');
      errorButtonText = 'Change Track';
    } else {
      errorMessage = 'You cannot create a group at this time. Please contact the administrator if you believe this is an error.';
    }
  } else if (currentSemester === 8) {
    // Sem 8: Only Type 1 students can create groups for Major Project 2
    // Wait for Sem8Context to load before showing error
    if (sem8Loading) {
      // Still loading - show loading state instead of error
      return (
        <Layout>
          <div className="py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading group creation options...</p>
              </div>
            </div>
          </div>
        </Layout>
      );
    }
    
    // Check student type - sem8IsType1 or sem8StudentType should be available after loading
    const isType1Student = sem8IsType1 === true || sem8StudentType === 'type1';
    const isType2Student = sem8IsType1 === false || sem8StudentType === 'type2';
    
    if (isType2Student) {
      errorMessage = 'Only Type 1 students (completed 6-month internship in Sem 7) can create groups for Major Project 2. Type 2 students must do solo Major Project 2.';
      errorAction = () => navigate('/dashboard/student');
      errorButtonText = 'Go to Dashboard';
    } else if (isType1Student) {
      // Type 1 student but can't create - check if already in group or window issue
      if (currentGroup) {
        errorMessage = 'You are already in a group for Major Project 2.';
        errorAction = () => navigate('/dashboard/student');
        errorButtonText = 'Go to Dashboard';
      } else {
        // Type 1 student, no group, but canCreateGroup is false
        // This could be due to window being closed or other validation
        errorMessage = 'You cannot create a group at this time. The group formation window may be closed. Please contact the administrator if you believe this is an error.';
      }
    } else {
      // Unable to determine student type - this shouldn't happen after loading
      errorMessage = 'Unable to determine your student type. Please refresh the page or contact the administrator.';
    }
  } else if (currentSemester === 5) {
    // For Sem 5, students should be able to create groups without registering first
    // This error should rarely show, but if it does, it means they're not eligible
    errorMessage = 'You are not eligible to create a group for Minor Project 2 at this time. Please contact the administrator if you believe this is an error.';
    errorAction = () => navigate('/dashboard/student');
    errorButtonText = 'Go to Dashboard';
  } else {
    errorMessage = `Group creation is not available for your current semester (${currentSemester}).`;
  }
  
  return (
    <Layout>
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cannot Create Group</h3>
          <p className="text-gray-600 mb-4">
            {errorMessage}
          </p>
          {errorAction && (
          <button
              onClick={errorAction}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
              {errorButtonText}
          </button>
          )}
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default GroupFormation;
