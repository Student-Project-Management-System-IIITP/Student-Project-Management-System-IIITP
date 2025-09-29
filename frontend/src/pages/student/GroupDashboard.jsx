import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import websocketManager from '../../utils/websocket';
import GroupMemberList from '../../components/groups/GroupMemberList';
import StatusBadge from '../../components/common/StatusBadge';
import StudentSearch from '../../components/groups/StudentSearch';

const GroupDashboard = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { user, roleData } = useAuth();
  
  // States
  const [groupDetails, setGroupDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [populatedInvites, setPopulatedInvites] = useState([]);
  
  // Invitation states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get group management data
  const { 
    sem5Group, 
    isInGroup, 
    isGroupLeader, 
    fetchSem5Data,
    inviteToGroup,
    canInviteMembers,
    getAvailableSlots
  } = useGroupManagement();



  // Load group details - only when groupId changes
  useEffect(() => {
    if (!groupId) return;
    
    const loadGroupDetails = async () => {
      try {
        setLoading(true);
          const response = await studentAPI.getGroupDetails(groupId);
          setGroupDetails(response.data.group);
        
        // Populate student data for invites
        if (response.data.group.invites && response.data.group.invites.length > 0) {
          const populatedInvitesData = await Promise.all(
            response.data.group.invites.map(async (invite) => {
              if (typeof invite.student === 'object' && invite.student.fullName) {
                return invite;
              }

              const studentId = typeof invite.student === 'string' ? invite.student : invite.student._id;
              if (studentId) {
                try {
                  const studentResponse = await studentAPI.testStudentLookup(studentId);
                  return {
                    ...invite,
                    student: studentResponse.data.student
                  };
                } catch (error) {
                  console.error('Failed to fetch student data:', error);
                  return {
                    ...invite,
                    student: { fullName: 'Unknown Student', misNumber: 'N/A' }
                  };
                }
              }
              return invite;
            })
          );
          setPopulatedInvites(populatedInvitesData);
        } else {
          setPopulatedInvites([]);
        }
      } catch (error) {
        console.error('Failed to load group details:', error);
        toast.error('Failed to load group details');
      } finally {
        setLoading(false);
      }
    };

    loadGroupDetails();
  }, [groupId]);

  // Handle sem5Group data separately - only when we don't have a groupId and sem5Group exists
  const sem5GroupProcessed = useRef(false);
  
  useEffect(() => {
    if (!groupId && sem5Group && !sem5GroupProcessed.current) {
      setGroupDetails(sem5Group);
      
      // Populate student data for invites
      if (sem5Group.invites && sem5Group.invites.length > 0) {
        const populateInvites = async () => {
          const populatedInvitesData = await Promise.all(
            sem5Group.invites.map(async (invite) => {
              if (typeof invite.student === 'object' && invite.student.fullName) {
                return invite;
              }

              const studentId = typeof invite.student === 'string' ? invite.student : invite.student._id;
              if (studentId) {
                try {
                  const studentResponse = await studentAPI.testStudentLookup(studentId);
                  return {
                    ...invite,
                    student: studentResponse.data.student
                  };
                } catch (error) {
                  console.error('Failed to fetch student data:', error);
                  return {
                    ...invite,
                    student: { fullName: 'Unknown Student', misNumber: 'N/A' }
                  };
                }
              }
              return invite;
            })
          );
          setPopulatedInvites(populatedInvitesData);
        };
        populateInvites();
      } else {
        setPopulatedInvites([]);
      }
      
      setLoading(false);
      sem5GroupProcessed.current = true;
    }
  }, [sem5Group?._id, groupId]); // Only depend on the ID and groupId

  // Function to refresh group data
  const refreshGroupData = useCallback(async () => {
    if (!groupId) return;
    
    try {
      const response = await studentAPI.getGroupDetails(groupId);
      setGroupDetails(response.data.group);
      
      // Populate student data for invites
      if (response.data.group.invites && response.data.group.invites.length > 0) {
        const populatedInvitesData = await Promise.all(
          response.data.group.invites.map(async (invite) => {
            if (typeof invite.student === 'object' && invite.student.fullName) {
              return invite;
            }

            const studentId = typeof invite.student === 'string' ? invite.student : invite.student._id;
            if (studentId) {
              try {
                const studentResponse = await studentAPI.testStudentLookup(studentId);
                return {
                  ...invite,
                  student: studentResponse.data.student
                };
              } catch (error) {
                console.error('Failed to fetch student data:', error);
                return {
                  ...invite,
                  student: { fullName: 'Unknown Student', misNumber: 'N/A' }
                };
              }
            }
            return invite;
          })
        );
        setPopulatedInvites(populatedInvitesData);
      } else {
        setPopulatedInvites([]);
      }
    } catch (error) {
      console.error('Failed to refresh group details:', error);
    }
  }, [groupId]);

  // 🔥 REAL-TIME WEBSOCKET INTEGRATION
  useEffect(() => {
    if (!groupDetails?._id) return;

    // Join group room for real-time updates
    websocketManager.joinGroupRoom(groupDetails._id);

    // Subscribe to real-time group events
    const handleInvitationAccepted = (payload) => {
      setRealTimeUpdates(prev => [...prev, {
        type: 'member_joined',
        message: `${payload.student.fullName} joined the group`,
        timestamp: new Date(),
        isPositive: true
      }]);
      // Refresh group data
      refreshGroupData();
      fetchSem5Data();
    };

    const handleMembershipChange = (payload) => {
      setRealTimeUpdates(prev => [...prev, {
        type: payload.changeType,
        message: payload.changeType === 'invitations_sent' ? 'New invitations have been sent' : 
                payload.changeType === 'member_joined' ? 'A member has joined' :
                'A member has left the group',
        timestamp: new Date(),
        isPositive: payload.changeType !== 'member_left'
      }]);
      fetchSem5Data();
    };

    const handleLeadershipTransfer = (payload) => {
      setRealTimeUpdates(prev => [...prev, {
        type: 'leadership_transfer',
        message: `Leadership transferred to ${payload.data.newLeader.fullName}`,
        timestamp: new Date(),
        isPositive: true
      }]);
      // Refresh to get updated roles
      refreshGroupData();
      fetchSem5Data();
    };

    const handleGroupFinalized = (payload) => {
      setRealTimeUpdates(prev => [...prev, {
        type: 'group_finalized',
        message: `Group has been finalized by ${payload.data.finalizedBy.fullName}`,
        timestamp: new Date(),
        isPositive: true
      }]);
      fetchSem5Data();
    };

    const handleCapacityUpdate = (payload) => {
      setRealTimeUpdates(prev => [...prev, {
        type: 'capacity_warning',
        message: payload.currentMemberCount >= payload.maxMembers * 0.8 ?
          'Group is almost full!' : 'Group capacity updated',
        timestamp: new Date(),
        isPositive: payload.currentMemberCount >= payload.maxMembers
      }]);
    };

    // Subscribe to WebSocket events
    websocketManager.subscribeToInvitationAccepted(handleInvitationAccepted);
    websocketManager.subscribeToMembershipChanges(handleMembershipChange);
    websocketManager.subscribeToLeadershipTransfers(handleLeadershipTransfer);
    websocketManager.subscribeToGroupFinalizations(handleGroupFinalized);
    websocketManager.subscribeToCapacityUpdates(handleCapacityUpdate);

    // Cleanup subscriptions on unmount
    return () => {
      websocketManager.unsubscribe('invitation_accepted', handleInvitationAccepted);
      websocketManager.unsubscribe('membership_change', handleMembershipChange);
      websocketManager.unsubscribe('leadership_transfer', handleLeadershipTransfer);
      websocketManager.unsubscribe('group_finalized', handleGroupFinalized);
      websocketManager.unsubscribe('capacity_update', handleCapacityUpdate);
      websocketManager.leaveGroupRoom();
    };
  }, [groupId, refreshGroupData]);


  // Initialize sem5 data once - with a ref to prevent multiple calls
  const sem5DataInitialized = useRef(false);
  
  useEffect(() => {
    if (!sem5DataInitialized.current) {
      fetchSem5Data();
      sem5DataInitialized.current = true;
    }
  }, []); // Only run once on mount

  // Handle student selection for invitations
  const handleStudentSelection = useCallback((students) => {
    setSelectedStudents(students);
  }, []);

  // Handle sending invitations
  const handleSendInvitations = useCallback(async () => {
    if (!selectedStudents.length || !groupDetails) return;

    // Pre-validation checks
    const availableSlots = getAvailableSlots();
    if (availableSlots <= 0) {
      toast.error('Cannot send invitations: Group is full');
      return;
    }

    if (groupDetails.status === 'finalized' || groupDetails.status === 'locked') {
      toast.error('Cannot send invitations: Group is finalized');
      return;
    }

    if (selectedStudents.length > availableSlots) {
      toast.error(`Cannot send invitations: Only ${availableSlots} slot(s) available, but ${selectedStudents.length} student(s) selected`);
      return;
    }

    setInviteLoading(true);
    try {
      const studentIdsToInvite = selectedStudents.map(student => student._id);
      const rolesToAssign = selectedStudents.map(() => 'member'); // All invited as members
      
      
      const response = await inviteToGroup(groupDetails._id, studentIdsToInvite, rolesToAssign);
      
      // Handle partial success (some invitations failed)
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
      } else {
        toast.success(`Invitations sent to ${selectedStudents.length} student(s)!`);
      }
      
      setShowInviteModal(false);
      setSelectedStudents([]);
      
      // Refresh group data to show updated invites
      await refreshGroupData();
    } catch (error) {
      console.error('Error sending invitations:', error);
      
      // Handle specific error cases
      let errorMessage = 'Failed to send invitations';
      if (error.message.includes('Group is finalized')) {
        errorMessage = 'Cannot send invitations: Group is finalized';
      } else if (error.message.includes('Group is now full')) {
        errorMessage = 'Cannot send invitations: Group is now full';
      } else if (error.message.includes('Student already in group')) {
        errorMessage = 'Some students are already in groups';
      } else if (error.message.includes('Student already has pending invitation')) {
        errorMessage = 'Some students already have pending invitations';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setInviteLoading(false);
    }
  }, [selectedStudents, groupDetails, inviteToGroup, refreshGroupData]);

  // Handle closing invite modal
  const handleCloseInviteModal = useCallback(() => {
    setShowInviteModal(false);
    setSelectedStudents([]);
    setSearchTerm('');
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showInviteModal) {
      // Disable body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showInviteModal]);

  // SearchResults component
  const SearchResults = ({ searchTerm, selectedStudents, onSelection, maxSelections, groupId }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);


  useEffect(() => {
      if (searchTerm.length >= 2) {
        searchStudents();
      } else {
        setStudents([]);
      }
    }, [searchTerm]);


    const searchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await studentAPI.getAvailableStudents({ 
          search: searchTerm,
          query: searchTerm,
          limit: 50,
          groupId: groupId
        });
        
        if (response.success && response.data) {
          setStudents(response.data || []);
        } else {
          setError(response.message || 'Failed to search students');
        }
      } catch (error) {
        console.error('Search error:', error);
        setError('Failed to search students: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    const handleStudentSelect = (student) => {
      const inviteStatus = getInviteStatus(student);
      
      // Only allow selection of students who can be invited
      const canSelect = inviteStatus.status === 'available' || 
                       inviteStatus.status === 'selected' || 
                       inviteStatus.status === 'rejected_from_current_group';
      
      if (!canSelect) {
        return; // Don't allow selection
      }
      
      const isSelected = selectedStudents.some(s => s._id === student._id);
      if (isSelected) {
        // Remove student
        onSelection(selectedStudents.filter(s => s._id !== student._id));
      } else {
        // Add student (if under max limit)
        if (selectedStudents.length < maxSelections) {
          onSelection([...selectedStudents, student]);
        }
      }
    };

    const getInviteStatus = (student) => {
      // Check if student is already selected
      if (selectedStudents.some(s => s._id === student._id)) {
        return { status: 'selected', message: 'Selected' };
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
      
      // Check if group is full
      if (getAvailableSlots() <= 0) {
        return { status: 'group_full', message: 'Group is full' };
      }
      
      // Check if group is finalized
      if (groupDetails?.status === 'finalized' || groupDetails?.status === 'locked') {
        return { status: 'group_finalized', message: 'Group is finalized' };
      }
      
      // Student is available
      return { status: 'available', message: 'Available' };
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Searching students...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      );
    }

    if (students.length === 0 && searchTerm.length >= 2) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">No students found</p>
            <p className="text-xs text-gray-500 mt-1">Try a different search term</p>
          </div>
        </div>
      );
    }

    // Show all students with proper status indicators
    const studentsToShow = students;

    return (
      <div>
        {studentsToShow.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 p-3">
            {studentsToShow.map((student) => {
              const inviteStatus = getInviteStatus(student);
              const isSelected = selectedStudents.some(s => s._id === student._id);
              const canSelect = inviteStatus.status === 'available' || 
                               inviteStatus.status === 'selected' || 
                               inviteStatus.status === 'rejected_from_current_group';
              
              return (
                <div
                  key={student._id}
                  onClick={() => canSelect && handleStudentSelect(student)}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    canSelect ? 'cursor-pointer' : 'cursor-not-allowed'
                  } ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-sm'
                      : canSelect
                      ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      <span className="font-bold text-xs">
                        {student.fullName?.charAt(0) || '?'}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 mb-1">
                        <p className="font-medium text-gray-900 text-xs truncate">{student.fullName}</p>
                        {isSelected && (
                          <span className="bg-blue-100 text-blue-700 text-xs px-1 py-0.5 rounded-full font-medium">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate">{student.misNumber}</p>
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
                        : inviteStatus.status === 'group_finalized'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {inviteStatus.message}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">No eligible students found</p>
              <p className="text-xs text-gray-500 mt-1">All students are either in groups or have pending invites</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading group details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isInGroup || !groupDetails) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Group Found</h3>
            <p className="text-gray-600 mb-4">
              You are not a member of this group or the group doesn't exist.
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

  const currentUserMember = groupDetails.members?.find(member => member.student._id === user._id);



  return (
    <>
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 12px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #3b82f6;
            border-radius: 6px;
            border: 2px solid #f1f5f9;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #2563eb;
          }
        `}
      </style>
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Real-time Status */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Group Dashboard
                {groupDetails.status === 'finalized' && (
                  <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                    FINALIZED
                  </span>
                )}
                {groupDetails.status === 'complete' && (
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                    READY
                  </span>
                )}
              </h1>
              <p className="mt-2 text-gray-600">
                {groupDetails.name} - Minor Project 2
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Real-time status indicator */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live</span>
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
          
          {/* Real-time updates feed */}
          {realTimeUpdates.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-32 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-blue-900">Latest Updates</h3>
                <button 
                  onClick={() => setRealTimeUpdates([])}
                  className="text-blue-600 text-xs hover:text-blue-800"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {realTimeUpdates.slice(-3).reverse().map((update, index) => (
                  <div key={index} className={`text-xs ${update.isPositive ? 'text-green-700' : 'text-orange-700'}`}>
                    <span className="font-medium">{new Date(update.timestamp).toLocaleTimeString()}:</span>
                    {update.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">

            {/* Group Members */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Group Members</h2>
              </div>
              <div className="p-6">
                <GroupMemberList 
                  members={groupDetails.members || []}
                  showRoles={true}
                  showContact={true}
                  currentUserId={user._id}
                  canManage={isGroupLeader}
                />
              </div>
            </div>

            {/* Invited Members */}
            {populatedInvites && populatedInvites.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Invited Members</h2>
                  <p className="text-sm text-gray-600 mt-1">Students who have been invited to join this group</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
        {populatedInvites && populatedInvites.length > 0 ? populatedInvites.map((invite, index) => {
                      
                      // Skip leader from invited members list
                      const studentId = invite.student?._id || invite.student;
                      const leaderId = groupDetails.leader?._id || groupDetails.leader;
                      
                      if (leaderId && studentId && studentId === leaderId) {
                        return null;
                      }
                      
                      return (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {invite.student?.fullName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {invite.student?.fullName || 'Unknown Student'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {invite.student?.misNumber || 'MIS# -'} 
                              {invite.student?.branch && ` • ${invite.student.branch}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              Invited: {invite.invitedAt ? new Date(invite.invitedAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invite.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : invite.status === 'accepted'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invite.status === 'pending' && '⏳ Pending'}
                            {invite.status === 'accepted' && '✅ Accepted'}
                            {invite.status === 'rejected' && '❌ Rejected'}
                          </span>
                          {invite.status === 'accepted' && (
                            <p className="text-xs text-gray-500 mt-1">
                              Joined: {invite.respondedAt ? new Date(invite.respondedAt).toLocaleDateString() : 'N/A'}
                            </p>
                          )}
                          {invite.status === 'rejected' && (
                            <p className="text-xs text-gray-500 mt-1">
                              Declined: {invite.respondedAt ? new Date(invite.respondedAt).toLocaleDateString() : 'N/A'}
                            </p>
                          )}
                        </div>
                      </div>
                      );
                    }) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No invitations have been sent yet.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Invitation Summary */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-800">
                        <strong>Total Invited:</strong> {groupDetails.invites ? groupDetails.invites.filter(invite => {
                          const studentId = invite.student?._id || invite.student;
                          const leaderId = groupDetails.leader?._id || groupDetails.leader;
                          return !(leaderId && studentId && studentId === leaderId);
                        }).length : 0}
                      </span>
                      <span className="text-blue-800">
                        <strong>Pending:</strong> {groupDetails.invites ? groupDetails.invites.filter(i => {
                          const studentId = i.student?._id || i.student;
                          const leaderId = groupDetails.leader?._id || groupDetails.leader;
                          return i.status === 'pending' && !(leaderId && studentId && studentId === leaderId);
                        }).length : 0}
                      </span>
                      <span className="text-green-800">
                        <strong>Accepted:</strong> {groupDetails.invites ? groupDetails.invites.filter(i => {
                          const studentId = i.student?._id || i.student;
                          const leaderId = groupDetails.leader?._id || groupDetails.leader;
                          return i.status === 'accepted' && !(leaderId && studentId && studentId === leaderId);
                        }).length : 0}
                      </span>
                      <span className="text-red-800">
                        <strong>Rejected:</strong> {groupDetails.invites ? groupDetails.invites.filter(i => {
                          const studentId = i.student?._id || i.student;
                          const leaderId = groupDetails.leader?._id || groupDetails.leader;
                          return i.status === 'rejected' && !(leaderId && studentId && studentId === leaderId);
                        }).length : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Faculty Information */}
            {groupDetails.allocatedFaculty && (
              <div className="bg-white rounded-lg shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Allocated Faculty</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👨‍🏫</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {groupDetails.allocatedFaculty.fullName}
                      </h3>
                      <p className="text-gray-600">
                        {groupDetails.allocatedFaculty.facultyId} • {groupDetails.allocatedFaculty.department}
                      </p>
                      <p className="text-sm text-gray-500">
                        {groupDetails.allocatedFaculty.designation}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        groupDetails.allocatedFaculty.mode === 'Regular' ? 'bg-green-100 text-green-800' :
                        groupDetails.allocatedFaculty.mode === 'Adjunct' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {groupDetails.allocatedFaculty.mode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Project Information */}
            {groupDetails.project && (
              <div className="bg-white rounded-lg shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Project Information</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {groupDetails.project.title}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        {groupDetails.project.description}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Domain:</span>
                        <p className="text-gray-900">{groupDetails.project.domain}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Status:</span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${
                          groupDetails.project.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                          groupDetails.project.status === 'faculty_allocated' ? 'bg-green-100 text-green-800' :
                          groupDetails.project.status === 'active' ? 'bg-yellow-100 text-yellow-800' :
                          groupDetails.project.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {groupDetails.project.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {groupDetails.project.technicalRequirements && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Technical Requirements:</span>
                        <p className="text-gray-900 mt-1">{groupDetails.project.technicalRequirements}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Your Role */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Role</h3>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  (groupDetails.leader && 
                   ((typeof groupDetails.leader === 'object' && groupDetails.leader._id === roleData?._id) ||
                    (typeof groupDetails.leader === 'string' && groupDetails.leader === roleData?._id)))
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {(groupDetails.leader && 
                    ((typeof groupDetails.leader === 'object' && groupDetails.leader._id === roleData?._id) ||
                     (typeof groupDetails.leader === 'string' && groupDetails.leader === roleData?._id))) 
                    ? '👑' : '👤'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {(groupDetails.leader && 
                      ((typeof groupDetails.leader === 'object' && groupDetails.leader._id === roleData?._id) ||
                       (typeof groupDetails.leader === 'string' && groupDetails.leader === roleData?._id))) 
                      ? 'Group Leader' : 'Group Member'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {(groupDetails.leader && 
                      ((typeof groupDetails.leader === 'object' && groupDetails.leader._id === roleData?._id) ||
                       (typeof groupDetails.leader === 'string' && groupDetails.leader === roleData?._id)))
                      ? 'You can manage the group and submit preferences'
                      : 'You can view group details and participate in discussions'
                    }
                  </p>
                </div>
              </div>
            </div>

             {/* Invite Members Section - Only for Group Leaders */}
                {isGroupLeader && (
               <div className="bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-2xl shadow-xl border border-blue-100 p-6 relative overflow-hidden">
                 {/* Background decoration */}
                 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100 to-transparent rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                 <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-100 to-transparent rounded-full translate-y-12 -translate-x-12 opacity-50"></div>
                 
                 <div className="relative z-10">
                   <div className="flex items-center space-x-3 mb-6">
                     <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                       <span className="text-white text-xl">👥</span>
                     </div>
                     <div>
                       <h3 className="text-xl font-bold text-gray-900">Invite Members</h3>
                       <p className="text-sm text-gray-600">Expand your team</p>
                     </div>
                   </div>
                   
                   <div className="space-y-6">
                     {/* Capacity Info */}
                     <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                       <div className="flex items-center justify-between mb-3">
                         <div>
                           <p className="text-sm font-medium text-gray-700">Available Space</p>
                           <p className="text-2xl font-bold text-blue-600">{getAvailableSlots()}</p>
                         </div>
                         <div className="text-right">
                           <p className="text-xs text-gray-500">Max Members</p>
                           <p className="text-sm font-semibold text-gray-900">
                             {groupDetails?.maxMembers || 5}
                           </p>
                         </div>
                       </div>
                       
                       {/* Progress bar */}
                       <div className="w-full bg-gray-200 rounded-full h-2">
                         <div 
                           className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                           style={{ 
                             width: `${Math.min(100, ((groupDetails.members?.length || 0) / (groupDetails.maxMembers || 5)) * 100)}%` 
                           }}
                         ></div>
                       </div>
                       
                       <p className="text-xs text-gray-500 mt-2 text-center">
                         {groupDetails.members?.length || 0} of {groupDetails?.maxMembers || 5} members
                       </p>
                     </div>
                     
                     {/* Invite Button */}
                  <button
                       onClick={() => setShowInviteModal(true)}
                       disabled={!canInviteMembers()}
                       className={`w-full px-6 py-4 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 ${
                         canInviteMembers() 
                           ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
                           : 'bg-gray-300 cursor-not-allowed'
                       }`}
                     >
                       <span className="text-xl">👥</span>
                       <span>Invite New Members</span>
                  </button>
                     
                     {/* Status Messages */}
                     {!canInviteMembers() && (
                       <div className={`rounded-xl p-4 text-center ${
                         getAvailableSlots() === 0 
                           ? 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200' 
                           : 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
                       }`}>
                         <div className="flex items-center justify-center space-x-2 mb-2">
                           <span className="text-lg">
                             {getAvailableSlots() === 0 ? '🔒' : '⚠️'}
                           </span>
                           <p className="font-medium text-sm">
                             {getAvailableSlots() === 0 ? 'Group is Full' : 'Group is Finalized'}
                           </p>
              </div>
                         <p className="text-xs text-gray-600">
                           {getAvailableSlots() === 0 
                             ? 'No more members can be added to this group.' 
                             : 'This group has been finalized and no changes are allowed.'}
                         </p>
            </div>
                     )}
                     
                     {/* Quick Stats */}
                     {groupDetails.invites && groupDetails.invites.length > 0 && (
                       <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/50">
                         <div className="flex items-center justify-between text-xs">
                           <span className="text-gray-600">
                             <span className="font-semibold text-yellow-600">
                               {groupDetails.invites.filter(i => i.status === 'pending').length}
                             </span> pending
                           </span>
                           <span className="text-gray-600">
                             <span className="font-semibold text-green-600">
                               {groupDetails.invites.filter(i => i.status === 'accepted').length}
                             </span> accepted
                           </span>
                           <span className="text-gray-600">
                             <span className="font-semibold text-red-600">
                               {groupDetails.invites.filter(i => i.status === 'rejected').length}
                             </span> declined
                    </span>
                  </div>
                </div>
                     )}
                  </div>
                </div>
               </div>
             )}

                  </div>
                </div>

        


              </div>

       {/* Invite Members Modal */}
       {showInviteModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
             {/* Modal Header */}
             <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0 relative overflow-hidden">
               {/* Background decoration */}
               <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full -translate-y-20 translate-x-20"></div>
               <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/50 to-transparent rounded-full translate-y-16 -translate-x-16"></div>
               
               <div className="flex items-center space-x-4 relative z-10">
                 <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                   <span className="text-white text-2xl">👥</span>
            </div>
                 <div>
                   <h2 className="text-2xl font-bold text-gray-900">Invite Members</h2>
                   <p className="text-gray-600">Search and select students to join your group</p>
          </div>
        </div>

               <button
                 onClick={handleCloseInviteModal}
                 className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-2 hover:bg-white/80 rounded-xl relative z-10"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
             
                  {/* Modal Body - Scrollable Structure */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-gray-50 to-white">
                    {/* Instructions - Fixed */}
                    <div className="flex-shrink-0 p-6 pb-4">
                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 text-sm">💡</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-600 text-sm">
                              Search for students by name, MIS number, or email. You can invite up to <span className="font-semibold text-blue-600">{getAvailableSlots()}</span> more students.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Selected Students - Fixed */}
                    {selectedStudents.length > 0 && (
                      <div className="flex-shrink-0 px-6 pb-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{selectedStudents.length}</span>
                              </div>
                              <h3 className="font-semibold text-gray-900">
                                Selected ({selectedStudents.length})
                              </h3>
                            </div>
                  <button
                              onClick={() => setSelectedStudents([])}
                              className="text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 hover:bg-red-50 rounded"
                            >
                              Clear all
                            </button>
                    </div>
                          
                          <div className="max-h-32 overflow-y-auto p-4">
                            <div className="grid grid-cols-1 gap-2">
                              {selectedStudents.map((student) => (
                                <div key={student._id} className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-100 hover:shadow-sm transition-all duration-200">
                                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <span className="text-white font-bold text-xs">
                                        {student.fullName?.charAt(0) || '?'}
                                      </span>
                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-gray-900 text-sm truncate">{student.fullName}</p>
                                      <p className="text-xs text-gray-600 truncate">{student.misNumber}</p>
              </div>
                                  </div>
                <button
                                    onClick={() => setSelectedStudents(prev => prev.filter(s => s._id !== student._id))}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-all duration-200 flex-shrink-0"
                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                </button>
                                </div>
                              ))}
                            </div>
              </div>
            </div>
          </div>
        )}

                    {/* Search Section - Auto-expanding */}
                    <div className="px-6 pb-6">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex-shrink-0 p-4 border-b border-gray-100">
                          <h3 className="font-semibold text-gray-900">Search Students</h3>
                          <p className="text-gray-600 text-sm mt-1">Type to search for students to invite</p>
                        </div>
                        
                        <div className="p-4">
                          {/* Search Input */}
                          <div className="flex-shrink-0 relative mb-4">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Search by name, MIS number, or email..."
                            />
                          </div>
                          
                          {/* Search Results - Auto-expanding */}
                          <div className="border border-gray-200 rounded-lg">
                            {searchTerm.length >= 2 ? (
                              <SearchResults 
                                searchTerm={searchTerm}
                                selectedStudents={selectedStudents}
                                onSelection={handleStudentSelection}
                                maxSelections={getAvailableSlots()}
                                groupId={groupDetails?._id}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                  </div>
                                  <p className="text-sm">Type at least 2 characters to search</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
             
             {/* Modal Footer - Fixed */}
             <div className="bg-gradient-to-r from-gray-50 to-blue-50 flex items-center justify-between p-6 border-t border-gray-100 flex-shrink-0">
               <div className="text-sm text-gray-600">
                 {selectedStudents.length > 0 ? (
                   <span className="font-medium">
                     {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
                   </span>
                 ) : (
                   <span>No students selected</span>
                 )}
               </div>
               
               <div className="flex items-center space-x-4">
                <button
                   onClick={handleCloseInviteModal}
                   className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                 >
                   Cancel
                </button>
                <button
                   onClick={handleSendInvitations}
                   disabled={selectedStudents.length === 0 || inviteLoading}
                   className={`px-8 py-3 text-sm font-semibold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-3 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
                     selectedStudents.length === 0 || inviteLoading
                       ? 'bg-gray-300 cursor-not-allowed'
                       : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                   }`}
                 >
                   {inviteLoading ? (
                     <>
                       <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                       <span>Sending Invitations...</span>
                     </>
                   ) : (
                     <>
                       <span className="text-lg">👥</span>
                       <span className="hidden sm:inline">Send Invitations ({selectedStudents.length})</span>
                       <span className="sm:hidden">Send ({selectedStudents.length})</span>
                     </>
                   )}
                </button>
              </div>
            </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GroupDashboard;
