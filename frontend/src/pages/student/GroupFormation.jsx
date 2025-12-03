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
import { 
  FiUsers, FiUserPlus, FiX, FiSearch, FiCheck, FiCheckCircle, 
  FiAlertCircle, FiArrowRight, FiArrowLeft, FiStar, FiMail,
  FiPhone, FiHash, FiLoader
} from 'react-icons/fi';

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

  // If student is already in a group, redirect to group dashboard
  if (isInGroup && currentGroup) {
    const projectType = currentSemester === 7 ? 'Major Project 1' : 
                        currentSemester === 8 ? 'Major Project 2' : 
                        'Minor Project 2';
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50">
          {/* Compact Header */}
          <div className="bg-white border-b border-neutral-200 shadow-sm">
            <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <FiUsers className="w-5 h-5 text-white" />
                  </div>
              <div>
                    <h1 className="text-xl font-bold text-neutral-800">Manage Your Group</h1>
                    <p className="text-xs text-neutral-600 mt-0.5">{projectType} Group Management</p>
                  </div>
              </div>
              <button
                onClick={() => navigate('/dashboard/student')}
                  className="text-neutral-500 hover:text-neutral-700 transition-colors p-2"
                  aria-label="Close"
              >
                  <FiX className="w-6 h-6" />
              </button>
            </div>
                </div>
              </div>

          {/* Main Content */}
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-5 pb-8">

            {/* Info Message - Already in Group */}
            <div className="bg-info-50 rounded-xl border border-info-200 p-6 text-center">
              <FiUsers className="w-16 h-16 text-info-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-neutral-800 mb-2">You're Already in a Group!</h2>
              <p className="text-sm text-neutral-600 mb-6">
                You cannot create a new group while being part of an existing group for {projectType}.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                  onClick={() => navigate(`/student/groups/${currentGroup._id}/dashboard`)}
                  className="btn-primary inline-flex items-center gap-2"
                      >
                  <FiUsers className="w-4 h-4" />
                  View Group Dashboard
                      </button>
                      <button
                  onClick={() => navigate('/dashboard/student')}
                  className="btn-secondary inline-flex items-center gap-2"
                      >
                  <FiArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                    </button>
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
        <div className="min-h-screen bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50 flex items-center justify-center">
          <div className="text-center">
            <FiLoader className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-neutral-700 font-medium">Loading group options...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // If student can create a group, show group creation form
  if (canCreateGroup) {
    return (
      <Layout>
        <div className="bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
          {/* Main Content - Flexible */}
          <div className="flex-1 overflow-hidden">
            <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-full py-3">

            {/* Step 1: Member Invitation */}
            {currentStep === 1 && (
              <div className="h-full flex flex-col gap-2.5">
                {/* Progress Bar - Top */}
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-3 flex items-center justify-center flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {/* Step 1 */}
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        currentStep >= 1 ? 'bg-gradient-to-br from-primary-600 to-secondary-600 text-white shadow-lg' : 'bg-neutral-200 text-neutral-500'
                }`}>
                        {currentStep > 1 ? <FiCheck className="w-4 h-4" /> : '1'}
                </div>
                      <span className={`text-sm font-semibold ${currentStep >= 1 ? 'text-neutral-800' : 'text-neutral-500'}`}>
                  Invite Members
                </span>
              </div>
                    
                    {/* Connector */}
                    <div className={`h-1 w-16 rounded-full transition-all ${currentStep > 1 ? 'bg-gradient-to-r from-primary-600 to-secondary-600' : 'bg-neutral-200'}`}></div>
                    
                    {/* Step 2 */}
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        currentStep >= 2 ? 'bg-gradient-to-br from-primary-600 to-secondary-600 text-white shadow-lg' : 'bg-neutral-200 text-neutral-500'
                }`}>
                        2
                </div>
                      <span className={`text-sm font-semibold ${currentStep >= 2 ? 'text-neutral-800' : 'text-neutral-500'}`}>
                  Create Group
                </span>
              </div>
            </div>
          </div>

                {/* Main Content Grid - Flexible */}
                <div className="grid lg:grid-cols-12 gap-2.5 flex-1 overflow-hidden">
                  {/* Left Column - Group Summary */}
                  <div className="lg:col-span-4 flex flex-col gap-2.5 overflow-y-auto custom-scrollbar pr-1">
                  {/* Group Leader Card */}
                  <div className="bg-gradient-to-br from-primary-600 to-secondary-600 rounded-xl p-4 shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                        <FiStar className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="flex-1 text-white min-w-0">
                        <p className="text-xs font-medium text-white/80 mb-0.5">Group Leader</p>
                        <p className="text-sm font-bold truncate">{roleData?.fullName || user?.fullName || user?.name || 'Loading...'}</p>
                        <p className="text-xs text-white/90 mt-0.5 flex items-center gap-1">
                          <FiHash className="w-3 h-3" />
                          {roleData?.misNumber || roleData?.rollNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2 text-xs text-white/90">
                      <FiAlertCircle className="w-3 h-3 inline mr-1" />
                      You'll be the group leader automatically
                    </div>
              </div>

                  {/* Selected Members Count */}
                  <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FiUsers className="w-4 h-4 text-primary-600" />
                        <h3 className="text-sm font-bold text-neutral-800">Selected</h3>
                        </div>
                      <span className="text-xs font-semibold text-primary-700 bg-primary-100 px-2 py-1 rounded-full">
                        {selectedStudents.length + 1} members
                      </span>
                          </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">Total:</span>
                        <span className="font-bold text-neutral-800">{selectedStudents.length + 1}</span>
                          </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">Min Required:</span>
                        <span className={`font-bold ${(selectedStudents.length + 1) >= minGroupMembers ? 'text-success-700' : 'text-warning-700'}`}>
                          {minGroupMembers}
                        </span>
                        </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">Max Allowed:</span>
                        <span className="font-bold text-neutral-800">{maxGroupMembers}</span>
                      </div>
                      </div>
                    {(selectedStudents.length + 1) < minGroupMembers && (
                      <div className="mt-3 bg-warning-50 border border-warning-200 rounded-lg p-2 text-xs text-warning-800">
                        <FiAlertCircle className="w-3 h-3 inline mr-1" />
                        Need {minGroupMembers - (selectedStudents.length + 1)} more member(s)
                      </div>
                    )}
                    </div>
                    
                  {/* Selected Members List */}
                {selectedStudents.length > 0 && (
                    <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                      <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2">
                        <FiUserPlus className="w-4 h-4 text-success-600" />
                        To Invite ({selectedStudents.length})
                    </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {selectedStudents.map((student) => (
                          <div key={student._id} className="flex items-center justify-between p-2 bg-success-50 rounded-lg border border-success-200">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-7 h-7 bg-success-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {student.fullName?.charAt(0) || 'S'}
                          </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-neutral-800 text-xs truncate">{student.fullName}</p>
                                <p className="text-[11px] text-neutral-600 truncate">{student.misNumber || student.rollNumber}</p>
                          </div>
                        </div>
                          <button
                            onClick={() => handleStudentSelection(student)}
                              className="text-error-600 hover:text-error-700 p-1.5 hover:bg-error-50 rounded transition-colors flex-shrink-0"
                              aria-label="Remove"
                          >
                              <FiX className="w-4 h-4" />
                          </button>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                  </div>

                  {/* Right Column - Search and Students */}
                  <div className="lg:col-span-8 flex flex-col gap-2.5 overflow-hidden">
                    {/* Search Input - Fixed */}
                    <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FiSearch className="w-4 h-4 text-primary-600" />
                        <h3 className="text-sm font-bold text-neutral-800">
                          {hasSearched ? `Found ${sortedStudents.length} student${sortedStudents.length !== 1 ? 's' : ''}` : 'Search Students'}
                  </h3>
                      </div>
                  
                      {/* Search Input with proper icon alignment */}
                      <div className="relative">
                    <input
                      type="text"
                      placeholder={currentSemester === 7 
                            ? "Search Sem 7 coursework students..."
                            : currentSemester === 8
                            ? "Search Sem 8 Type 1 students..."
                            : "Search by name, MIS, email, or phone..."
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      maxLength={50}
                          className="w-full px-4 py-2.5 pl-10 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm bg-white placeholder:text-neutral-400"
                        />
                        <FiSearch className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      
                      <div className="mt-2 flex justify-between items-center text-xs">
                        <p className="text-neutral-500">
                          {!hasSearched ? 'Type at least 2 characters' : `Showing ${sortedStudents.length} result${sortedStudents.length !== 1 ? 's' : ''}`}
                        </p>
                        <span className="text-neutral-400 font-mono">
                          {searchTerm.length}/50
                      </span>
                    </div>
                  </div>
                  
                    {/* Student List with Status Legend - Scrollable */}
                    <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                      {/* Status Legend - Sticky */}
                      {hasSearched && sortedStudents.length > 0 && (
                        <div className="bg-gradient-to-r from-neutral-50 to-white px-4 py-2.5 border-b border-neutral-200 flex-shrink-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-neutral-600 mr-1">Status:</span>
                            <span className="flex items-center gap-1.5 bg-success-100 px-2 py-0.5 rounded-full text-xs">
                              <div className="w-1.5 h-1.5 bg-success-500 rounded-full"></div>
                              <span className="text-success-700 font-semibold">Available</span>
                        </span>
                            <span className="flex items-center gap-1.5 bg-primary-100 px-2 py-0.5 rounded-full text-xs">
                              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                              <span className="text-primary-700 font-semibold">Selected</span>
                        </span>
                            <span className="flex items-center gap-1.5 bg-error-100 px-2 py-0.5 rounded-full text-xs">
                              <div className="w-1.5 h-1.5 bg-error-500 rounded-full"></div>
                              <span className="text-error-700 font-semibold">In Group</span>
                        </span>
                        {currentSemester === 7 && (
                              <span className="flex items-center gap-1.5 bg-neutral-100 px-2 py-0.5 rounded-full text-xs">
                                <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full"></div>
                                <span className="text-neutral-600 font-semibold">Not Eligible</span>
                            </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                      {/* Scrollable List */}
                      <div className="flex-1 overflow-y-auto bg-neutral-50" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                  {!hasSearched ? (
                          <div className="text-center py-8 px-4">
                            <FiSearch className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                            <p className="text-neutral-700 font-medium mb-1 text-sm">Start Searching</p>
                            <p className="text-xs text-neutral-500">Type at least 2 characters to find students</p>
                      </div>
                        ) : isLoading ? (
                    <div className="text-center py-8">
                            <FiLoader className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
                            <p className="text-sm text-neutral-600">Loading students...</p>
                    </div>
                        ) : sortedStudents.length === 0 ? (
                    <div className="text-center py-8">
                            <FiAlertCircle className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                            <p className="text-neutral-500 text-sm">No students found matching your search</p>
                    </div>
                        ) : (
                          sortedStudents.map((student, index) => {
                        const isSelected = selectedStudents.some(s => s._id === student._id);
                        const inviteStatus = getInviteStatus(student);
                        const isDisabled = inviteStatus.disabled === true;
                        const canSelect = !isDisabled && (
                          inviteStatus.status === 'available' || 
                                         inviteStatus.status === 'selected' || 
                          inviteStatus.status === 'rejected_from_current_group'
                        );
                        
                          // Check if we need to add a status separator
                        const prevStudent = index > 0 ? sortedStudents[index - 1] : null;
                        const prevStatus = prevStudent ? getInviteStatus(prevStudent) : null;
                        const showSeparator = prevStatus && prevStatus.status !== inviteStatus.status;
                        
                        return (
                          <div key={student._id}>
                            {/* Status Group Separator */}
                            {showSeparator && (
                                <div className="sticky top-0 px-4 py-2 bg-gradient-to-r from-neutral-100 to-neutral-50 border-y border-neutral-200 z-10">
                                  <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                      inviteStatus.status === 'available' ? 'bg-success-500' :
                                      inviteStatus.status === 'selected' ? 'bg-primary-500' :
                                      inviteStatus.status === 'in_group' ? 'bg-error-500' : 'bg-neutral-400'
                                  }`}></div>
                                    <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                                      {inviteStatus.status === 'available' ? '✓ Available Students' :
                                       inviteStatus.status === 'selected' ? '★ Selected Students' :
                                       inviteStatus.status === 'in_group' ? '⚠ Already in Groups' : 'Other'}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Student Card */}
                            <div
                              onClick={() => canSelect && !isDisabled && handleStudentSelection(student)}
                                className={`p-3 mx-3 my-2 rounded-lg border transition-all ${
                                  canSelect && !isDisabled ? 'cursor-pointer hover:shadow-md hover:border-primary-300' : 'cursor-not-allowed'
                              } ${
                            isSelected 
                                    ? 'bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-300 shadow-sm' 
                                  : canSelect && !isDisabled
                                    ? 'bg-white border-neutral-200'
                                  : isDisabled
                                    ? 'bg-neutral-100 border-neutral-300 opacity-60'
                                    : 'bg-neutral-50 border-neutral-200 opacity-60'
                              }`}
                            >
                                <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                      ? 'bg-gradient-to-br from-primary-600 to-secondary-600 text-white shadow-md'
                                      : 'bg-neutral-200 text-neutral-600'
                              }`}>
                                    {isSelected ? <FiCheck className="w-5 h-5" /> : <span className="font-bold text-sm">{student.fullName?.charAt(0) || '?'}</span>}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-neutral-800 text-sm truncate">{student.fullName}</p>
                                    <div className="flex items-center gap-2 text-xs text-neutral-600 mt-1">
                                      <span className="flex items-center gap-1">
                                        <FiHash className="w-3 h-3" />
                                        {student.rollNumber || student.misNumber}
                                    </span>
                                {student.branch && (
                                        <>
                                          <span>•</span>
                                          <span>{student.branch}</span>
                                        </>
                                )}
                                </div>
                              </div>
                            
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                                inviteStatus.status === 'available'
                                      ? 'bg-success-100 text-success-700 border border-success-200'
                                  : inviteStatus.status === 'selected'
                                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                                  : inviteStatus.status === 'in_group'
                                      ? 'bg-error-100 text-error-700 border border-error-200'
                                      : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                              }`}>
                                {inviteStatus.message}
                              </span>
                            </div>
                            </div>
                          </div>
                        );
                        })
                        )}

                  {/* Load More Button */}
                  {hasSearched && hasMoreStudents && (
                          <div className="p-3 border-t border-neutral-200 bg-gradient-to-b from-white to-neutral-50 flex-shrink-0">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                              className="w-full btn-secondary inline-flex items-center justify-center gap-2 text-sm"
                      >
                        {isLoadingMore ? (
                                <>
                                  <FiLoader className="w-4 h-4 animate-spin" />
                                  Loading...
                                </>
                        ) : (
                                <>
                                  <FiArrowRight className="w-4 h-4" />
                                  Load More ({totalStudents - availableStudents.length} remaining)
                                </>
                        )}
                      </button>
                    </div>
                  )}
                    </div>
                </div>
                      </div>
                    </div>
                
                {/* Action Bar - Bottom */}
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {/* Member Count */}
                    <div className="flex items-center gap-2">
                      <FiUsers className="w-4 h-4 text-primary-600" />
                      <span className="font-bold text-neutral-800 text-sm">
                        {selectedStudents.length + 1} / {maxGroupMembers} members
                      </span>
                      {selectedStudents.length > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-success-100 text-success-700 rounded-full font-medium ml-1">
                          {selectedStudents.length} invitation{selectedStudents.length > 1 ? 's' : ''} ready
                        </span>
                      )}
                  </div>
                </div>

                  <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousStep}
                      className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
                  >
                      <FiArrowLeft className="w-3.5 h-3.5" />
                      Back
                  </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={selectedStudents.length === 0 || isSubmitting || isLoading}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        selectedStudents.length === 0 || isSubmitting || isLoading
                          ? 'bg-neutral-200 text-neutral-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:shadow-lg focus:ring-primary-500'
                      }`}
                    >
                      {selectedStudents.length === 0 ? (
                        <>
                          <FiAlertCircle className="w-3.5 h-3.5" />
                          Select members first
                        </>
                      ) : (
                        <>
                          Next: Review
                          <FiArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Confirmation */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Summary Header */}
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5">
                <h2 className="text-lg font-bold text-neutral-800 mb-1 flex items-center gap-2">
                  <FiCheckCircle className="w-5 h-5 text-primary-600" />
                  Review & Confirm
                </h2>
                <p className="text-sm text-neutral-600">
                  Verify details before creating your group
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {/* Left - Group Summary */}
                <div className="space-y-4">
                  <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-5">
                    <h3 className="text-sm font-bold text-neutral-800 mb-4 flex items-center gap-2">
                      <FiUsers className="w-4 h-4 text-primary-600" />
                      Group Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                        <label className="text-xs font-medium text-neutral-600 mb-1 block">Group Name</label>
                        <p className="text-sm font-semibold text-neutral-800 italic">Auto-generated</p>
                    </div>
                      <div className="bg-primary-50 rounded-lg p-3 border border-primary-200">
                        <label className="text-xs font-medium text-primary-700 mb-1 flex items-center gap-1">
                          <FiStar className="w-3 h-3" />
                          Leader
                        </label>
                        <p className="text-sm font-bold text-primary-900">{roleData?.fullName || user?.fullName || user?.name}</p>
                    </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary-50 rounded-lg p-3 border border-secondary-200">
                          <label className="text-xs font-medium text-secondary-700 mb-1 block">Total</label>
                          <p className="text-lg font-bold text-secondary-900">{selectedStudents.length + 1}</p>
                          <p className="text-xs text-secondary-700">members</p>
                    </div>
                        <div className="bg-accent-50 rounded-lg p-3 border border-accent-200">
                          <label className="text-xs font-medium text-accent-700 mb-1 block">Semester</label>
                          <p className="text-lg font-bold text-accent-900">{currentSemester}</p>
                          <p className="text-xs text-accent-700">current</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right - Members List */}
                <div className="space-y-4">
                  <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-5">
                    <h3 className="text-sm font-bold text-neutral-800 mb-4 flex items-center gap-2">
                      <FiUsers className="w-4 h-4 text-primary-600" />
                      Group Members ({selectedStudents.length + 1})
                    </h3>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                      {/* Group Leader */}
                      <div className="bg-success-50 rounded-lg p-3 border border-success-200">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-success-500 to-success-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {(roleData?.fullName || user?.fullName || user?.name)?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-neutral-800 text-sm truncate">{roleData?.fullName || user?.fullName || user?.name || 'Loading...'}</p>
                            <p className="text-xs text-neutral-600 flex items-center gap-1">
                              <FiHash className="w-3 h-3" />
                              {roleData?.misNumber || roleData?.rollNumber || 'MIS# -'}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-success-100 text-success-800 flex-shrink-0">
                            <FiStar className="w-3 h-3" />
                            Leader
                        </span>
                    </div>
                  </div>

                      {/* Invited Members */}
                      {selectedStudents.length > 0 ? (
                        selectedStudents.map((student, index) => (
                          <div key={index} className="bg-warning-50 rounded-lg p-3 border border-warning-200">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-warning-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                  {student.fullName?.charAt(0) || 'S'}
                                </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-neutral-800 text-sm truncate">{student.fullName}</p>
                                <p className="text-xs text-neutral-600 flex items-center gap-1">
                                  <FiHash className="w-3 h-3" />
                                  {student.misNumber || student.rollNumber || 'MIS# -'}
                                  {student.branch && (
                                    <>
                                      <span className="mx-1">•</span>
                                      <span>{student.branch}</span>
                                    </>
                                  )}
                                </p>
                                </div>
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-warning-100 text-warning-800 flex-shrink-0">
                                <FiMail className="w-3 h-3" />
                                Pending
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 bg-neutral-50 rounded-lg">
                          <p className="text-neutral-500 text-sm">No additional members</p>
                          <p className="text-neutral-400 text-xs mt-1">Invite members later from group dashboard</p>
                    </div>
                  )}
                    </div>
                  </div>
                </div>
                </div>


                {/* Confirmation Message */}
              <div className="bg-warning-50 rounded-xl border border-warning-200 p-4">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-warning-900 mb-1 text-sm">Confirm Group Creation</h3>
                    <p className="text-xs text-warning-800">
                      You're creating a group with {selectedStudents.length + 1} member{selectedStudents.length > 0 ? 's' : ''}. 
                      {selectedStudents.length > 0 && ` ${selectedStudents.length} invitation${selectedStudents.length !== 1 ? 's' : ''} will be sent immediately.`}
                      {' '}You can invite more members later.
                  </p>
                  </div>
                </div>
                </div>

                {/* Action Buttons */}
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                      onClick={() => setCurrentStep(1)}
                    className="btn-secondary inline-flex items-center gap-2"
                  >
                    <FiArrowLeft className="w-4 h-4" />
                    Back to Edit
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleSendInvitations}
                    disabled={isSubmitting}
                    className="bg-success-600 hover:bg-success-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <FiLoader className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FiCheckCircle className="w-4 h-4" />
                        Create Group {selectedStudents.length > 0 && `& Send ${selectedStudents.length} Invitation${selectedStudents.length !== 1 ? 's' : ''}`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

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
      <div className="min-h-screen bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-8 text-center">
            <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle className="w-8 h-8 text-error-600" />
          </div>
            <h3 className="text-lg font-bold text-neutral-800 mb-2">Cannot Create Group</h3>
            <p className="text-sm text-neutral-600 mb-6">
            {errorMessage}
          </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {errorAction && (
          <button
              onClick={errorAction}
                  className="btn-primary inline-flex items-center gap-2"
          >
                  <FiCheckCircle className="w-4 h-4" />
              {errorButtonText}
          </button>
          )}
              <button
                onClick={() => navigate('/dashboard/student')}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <FiArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            </div>
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default GroupFormation;
