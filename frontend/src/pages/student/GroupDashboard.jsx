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
import Layout from '../../components/common/Layout';
import { formatFacultyName } from '../../utils/formatUtils';
import {
  FiUsers, FiUser, FiUserCheck, FiX, FiCheckCircle, FiAlertCircle,
  FiMail, FiHash, FiStar, FiLogOut, FiUserPlus, FiLock,
  FiUnlock, FiArrowRight, FiLoader, FiSearch, FiXCircle, FiCheck,
  FiClock, FiAlertTriangle, FiInfo, FiBook, FiUserX, FiTrash2, FiFile
} from 'react-icons/fi';

const GroupDashboard = () => {
  const navigate = useNavigate();
  const { id: groupId } = useParams(); // Route uses :id, so we rename it to groupId
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
  
  // Group size limits from admin config
  const [minGroupMembers, setMinGroupMembers] = useState(4); // Default fallback
  const [maxGroupMembers, setMaxGroupMembers] = useState(5); // Default fallback
  
  // Get group management data (mainly for Sem 5, but keep for backward compatibility)
  const { 
    sem5Group, 
    isInGroup, 
    isGroupLeader: isGroupLeaderSem5, 
    fetchSem5Data,
    inviteToGroup,
    canInviteMembers,
    getAvailableSlots,
    finalizeGroup
  } = useGroupManagement();
  
  // Calculate isGroupLeader locally for any semester
  const isGroupLeader = groupDetails?.leader?._id === roleData?._id || 
                        groupDetails?.leader === roleData?._id ||
                        isGroupLeaderSem5;

  // Sync groupDetails with sem5Group from context
  useEffect(() => {
    if (sem5Group && sem5Group._id === groupId) {
      setGroupDetails(sem5Group);
    }
  }, [sem5Group, groupId]);

  // Additional sync to ensure real-time updates
  useEffect(() => {
    if (sem5Group && sem5Group._id === groupId) {
      // Force update if the group status has changed
      setGroupDetails(prev => {
        if (prev && prev.status !== sem5Group.status) {
          return sem5Group;
        }
        return prev;
      });
    }
  }, [sem5Group?.status, groupId]);

  // Load group size limits from admin config
  useEffect(() => {
    const loadGroupConfig = async () => {
      if (!groupDetails) return;
      
      const groupSemester = groupDetails.semester || roleData?.semester || user?.semester || 5;
      
      // Determine config key based on semester
      let minConfigKey, maxConfigKey;
      if (groupSemester === 7) {
        minConfigKey = 'sem7.major1.minGroupMembers';
        maxConfigKey = 'sem7.major1.maxGroupMembers';
      } else if (groupSemester === 8) {
        minConfigKey = 'sem8.major2.group.minGroupMembers';
        maxConfigKey = 'sem8.major2.group.maxGroupMembers';
      } else {
        minConfigKey = 'sem5.minGroupMembers';
        maxConfigKey = 'sem5.maxGroupMembers';
      }
      
      try {
        // Fetch min and max group members from config
        const [minResponse, maxResponse] = await Promise.all([
          studentAPI.getSystemConfig(minConfigKey),
          studentAPI.getSystemConfig(maxConfigKey)
        ]);
        
        if (minResponse.success && minResponse.data?.value) {
          setMinGroupMembers(parseInt(minResponse.data.value));
        }
        
        if (maxResponse.success && maxResponse.data?.value) {
          setMaxGroupMembers(parseInt(maxResponse.data.value));
        }
      } catch (error) {
        console.error('Error loading group config:', error);
        // Keep default values (4, 5) if config fails to load
      }
    };
    
    loadGroupConfig();
  }, [groupDetails, roleData, user]);

  // Finalize group state
  const [finalizeLoading, setFinalizeLoading] = useState(false);

  // Check if group can be finalized
  const canFinalizeGroup = useCallback(() => {
    if (!groupDetails || !isGroupLeader) return false;
    
    // Check if group is already finalized
    if (groupDetails.status === 'finalized' || groupDetails.status === 'locked') {
      return false;
    }
    
    // Sem 6+ groups that have a project are already finalized (continued from previous semester)
    // Only allow finalization for Sem 5 groups that are forming
    if (groupDetails.semester >= 6 && groupDetails.project) {
      return false;
    }
    
    // Check if group has minimum required members (prioritize config over stored value)
    const activeMembers = groupDetails.members?.filter(member => member.isActive) || [];
    const minMembers = minGroupMembers || groupDetails.minMembers;
    
    if (activeMembers.length < minMembers) {
      return false;
    }
    
    // Check if all members have accepted their invitations
    const pendingMembers = activeMembers.filter(member => 
      member.inviteStatus !== 'accepted'
    );
    
    if (pendingMembers.length > 0) {
      return false;
    }
    
    return true;
  }, [groupDetails, isGroupLeader]);

  // Check if group is finalized
  const isGroupFinalized = useCallback(() => {
    return groupDetails?.status === 'finalized' || groupDetails?.status === 'locked';
  }, [groupDetails]);



  // Load group details - only when groupId changes
  useEffect(() => {
    if (!groupId) {
      return;
    }
    
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
        
        // Check if error is due to not being a member
        if (error.response?.status === 403 || error.response?.status === 404) {
          toast.error('You are not a member of this group or group not found');
          // Redirect to dashboard after a brief delay
          setTimeout(() => {
            window.location.assign('/dashboard/student');
          }, 1500);
        } else {
          toast.error('Failed to load group details');
        }
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
      
      // Check if error is due to not being a member anymore
      if (error.response?.status === 403 || error.response?.status === 404) {
        toast.error('You are no longer a member of this group');
        // Redirect to dashboard
        setTimeout(() => {
          window.location.assign('/dashboard/student');
        }, 1500);
      }
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
      // Immediately update local state to reflect finalization
      setGroupDetails(prev => ({
        ...prev,
        status: 'finalized',
        finalizedAt: payload.data.finalizedAt || new Date().toISOString()
      }));
      
      // Update populated invites to show auto-rejected status for pending invitations
      setPopulatedInvites(prev => prev.map(invite => {
        if (invite.status === 'pending') {
          return {
            ...invite,
            status: 'auto-rejected',
            respondedAt: payload.data.finalizedAt || new Date().toISOString(),
            rejectionReason: 'Group has been finalized'
          };
        }
        return invite;
      }));
      
      // Show immediate toast notification
      toast.success('Group has been finalized! All changes are now locked.');
      
      setRealTimeUpdates(prev => [...prev, {
        type: 'group_finalized',
        message: `Group has been finalized by ${payload.data.finalizedBy.fullName}`,
        timestamp: new Date(),
        isPositive: true
      }]);
      
      // Also refresh context data to ensure consistency
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

  // Handle finalize group
  const handleFinalizeGroup = useCallback(async () => {
    if (!groupDetails) return;

    const confirmMessage = `Are you sure you want to finalize this group? This action will:\n\n• Lock all member roles and assignments\n• Cancel all pending invitations\n• Make the group permanent and unchangeable\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setFinalizeLoading(true);
    try {
      const response = await finalizeGroup(groupDetails._id);
      
      // Immediately update local state to reflect finalization
      if (response && response.success) {
        setGroupDetails(prev => ({
          ...prev,
          status: 'finalized',
          finalizedAt: new Date().toISOString()
        }));
        
        // Update populated invites to show auto-rejected status for pending invitations
        setPopulatedInvites(prev => prev.map(invite => {
          if (invite.status === 'pending') {
            return {
              ...invite,
              status: 'auto-rejected',
              respondedAt: new Date().toISOString(),
              rejectionReason: 'Group has been finalized'
            };
          }
          return invite;
        }));

        // Also refresh context data to ensure consistency
        await fetchSem5Data();
        
        // Refresh group details to get the latest data
        await refreshGroupData();

        // Determine project name based on group semester
        const semester = groupDetails.semester || roleData?.semester || user?.semester;
        let projectLabel = 'project';
        if (semester === 4) {
          projectLabel = 'Minor Project 1';
        } else if (semester === 5) {
          projectLabel = 'Minor Project 2';
        } else if (semester === 6) {
          projectLabel = 'Minor Project 3';
        } else if (semester === 7) {
          projectLabel = 'Major Project 1';
        } else if (semester === 8) {
          projectLabel = 'Major Project 2';
        }
        
        // Show success toast guiding next action
        toast.success(`Group finalized successfully. Now go to the dashboard and register for ${projectLabel}.`);
      }
    } catch (error) {
      console.error('Error finalizing group:', error);
      
      let errorMessage = 'Failed to finalize group';
      if (error.message.includes('Only group leader can finalize')) {
        errorMessage = 'Only the group leader can finalize the group';
      } else if (error.message.includes('Group must have at least')) {
        errorMessage = 'Group must have at least 4 members to be finalized';
      } else if (error.message.includes('Group is already finalized')) {
        errorMessage = 'Group is already finalized';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setFinalizeLoading(false);
    }
  }, [groupDetails, finalizeGroup, fetchSem5Data]);

  // Handle leave group
  const [leaveLoading, setLeaveLoading] = useState(false);
  
  const handleLeaveGroup = useCallback(async () => {
    if (!groupDetails) return;

    const confirmMessage = `Are you sure you want to leave this group?\n\nThis action will:\n• Remove you from the group\n• Cancel your membership\n• Allow you to join other groups\n\nYou can only leave before the group is finalized.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLeaveLoading(true);
    try {
      const response = await studentAPI.leaveGroup(groupDetails._id);
      
      if (response && response.success) {
        toast.success('You have successfully left the group.');
        
        // Use navigate with reload to ensure a clean state
        window.location.assign('/dashboard/student');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      
      let errorMessage = 'Failed to leave group';
      if (error.message?.includes('Cannot leave a finalized group')) {
        errorMessage = 'Cannot leave a finalized group';
      } else if (error.message?.includes('Group leader cannot leave')) {
        errorMessage = 'Group leader must transfer leadership before leaving';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLeaveLoading(false);
    }
  }, [groupDetails, fetchSem5Data]);

  // Check if current user can leave the group
  const canLeaveGroup = useCallback(() => {
    if (!groupDetails || !roleData) return false;
    
    // Cannot leave if group is finalized
    if (groupDetails.status === 'finalized' || groupDetails.status === 'locked') {
      return false;
    }
    
    // Check if user is a member (not just invited)
    const currentMember = groupDetails.members?.find(member => 
      member.student?._id === roleData._id || member.student === roleData._id
    );
    
    if (!currentMember || !currentMember.isActive) {
      return false;
    }
    
    // Member must have accepted the invitation
    if (currentMember.inviteStatus !== 'accepted') {
      return false;
    }
    
    return true;
  }, [groupDetails, roleData]);

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

  // Enhanced SearchResults component with all GroupFormation step 2 features
  const SearchResults = ({ searchTerm, selectedStudents, onSelection, maxSelections, groupId }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreStudents, setHasMoreStudents] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalStudents, setTotalStudents] = useState(0);
    const searchTimeoutRef = useRef(null);

    // Debounced search effect
  useEffect(() => {
      if (searchTerm.length >= 2) {
        setHasSearched(true);
        setCurrentPage(1);
        setHasMoreStudents(false);
        
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        
        searchTimeoutRef.current = setTimeout(() => {
          searchStudents(1, false);
        }, 500);
      } else if (searchTerm.length === 0) {
        setHasSearched(false);
        setStudents([]);
        setCurrentPage(1);
        setHasMoreStudents(false);
      }
      
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }, [searchTerm]);

    const searchStudents = async (page = 1, append = false) => {
      if (page === 1) {
      setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);
      
      try {
        const response = await studentAPI.getAvailableStudents({ 
          search: searchTerm,
          query: searchTerm,
          limit: 20,
          page: page,
          groupId: groupId,
          semester: groupDetails?.semester // Pass group semester for proper filtering
        });
        
        if (response.success && response.data) {
          const newStudents = response.data || [];
          const metadata = response.metadata || {};
          
          if (append) {
            setStudents(prev => [...prev, ...newStudents]);
          } else {
            setStudents(newStudents);
          }
          
          setTotalStudents(metadata.total || newStudents.length);
          setHasMoreStudents(newStudents.length === 20 && (page * 20) < (metadata.total || 0));
        } else {
          setError(response.message || 'Failed to search students');
        }
      } catch (error) {
        console.error('Search error:', error);
        setError('Failed to search students: ' + error.message);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    };

    const handleLoadMore = () => {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      searchStudents(nextPage, true);
    };

    const handleStudentSelect = (student) => {
      const inviteStatus = getInviteStatus(student);
      
      // Only allow selection of students who can be invited (exclude disabled Sem 7 students)
      const canSelect = !inviteStatus.disabled && (
        inviteStatus.status === 'available' || 
                       inviteStatus.status === 'selected' || 
        inviteStatus.status === 'rejected_from_current_group'
      );
      
      if (!canSelect) {
        // Show error toast for disabled students
        if (inviteStatus.disabled) {
          toast.error(inviteStatus.message || 'This student cannot be invited');
        }
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
      // Get group semester to check if Sem 7 eligibility checks are needed
      const groupSemester = groupDetails?.semester || 5;
      
      // Check if student is already selected
      if (selectedStudents.some(s => s._id === student._id)) {
        return { status: 'selected', message: 'Selected' };
      }
      
      // For Sem 7: Check coursework eligibility before other checks
      if (groupSemester === 7 && student.semester === 7) {
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
      
      // For Sem 8: Check Type 1 eligibility before other checks
      if (groupSemester === 8 && student.semester === 8) {
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
      if (student.isInGroup || student.status === 'in_group') {
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

    // Handle select all available students
    const handleSelectAll = () => {
      const availableStudents = sortedStudents.filter(student => {
        const status = getInviteStatus(student);
        return status.status === 'available' && selectedStudents.length < maxSelections;
      });
      
      if (availableStudents.length > 0) {
        const newSelection = [...selectedStudents, ...availableStudents.slice(0, maxSelections - selectedStudents.length)];
        onSelection(newSelection);
      }
    };

    // Handle clear all selections
    const handleClearAll = () => {
      onSelection([]);
    };

    // Filter and sort students
    const filteredStudents = students.filter(student => {
      return searchTerm.length < 2 || (
        student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.collegeEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.misNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    // Get group semester for Sem 7 checks
    const groupSemester = groupDetails?.semester || 5;
    
    // Sort students by status priority (Selected → Available → Others → Disabled Sem 7)
    const sortedStudents = filteredStudents.sort((a, b) => {
      const statusA = getInviteStatus(a);
      const statusB = getInviteStatus(b);
      
        const statusPriority = {
          'selected': 1,                      // Selected students first
          'available': 2,                     // Available students second
          'pending_from_current_group': 3,    // Pending invitations third
          'in_group': 4,                      // In group students fourth
          'rejected_from_current_group': 5,   // Previously rejected fifth
          'pending_invites': 6,               // Has pending invites sixth
          'group_full': 7,                    // Group full seventh
          'group_finalized': 8,               // Group finalized
          // Sem 7 disabled statuses (shown but not selectable)
          'no_track_selected': 9,             // No track selected (Sem 7)
          'internship_track': 10,             // Internship track (Sem 7)
          'not_coursework': 11,               // Not coursework (Sem 7)
          // Sem 8 disabled statuses (shown but not selectable)
          'no_sem8_type': 12,                 // Sem 8 type not determined
          'type2_student': 13,                // Type 2 student (Sem 8)
          'not_type1': 14                     // Not Type 1 (Sem 8)
        };
      
      const priorityA = statusPriority[statusA.status] || 999;
      const priorityB = statusPriority[statusB.status] || 999;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

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

    if (!hasSearched) {
      return (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          <p className="text-gray-600 font-medium mb-1">Search for Students</p>
          <p className="text-sm text-gray-500 mb-2">Type at least 2 characters to find and invite students to your group</p>
          <div className="text-xs text-gray-400 space-y-1">
            <p>🔍 Search by <strong>name</strong> (e.g., "John", "Smith")</p>
            <p>📧 Search by <strong>email</strong> (e.g., "john@iiitp.ac.in")</p>
            <p>📱 Search by <strong>phone</strong> (e.g., "9876543210")</p>
            <p>🎓 Search by <strong>MIS number</strong> (e.g., "000000123")</p>
          </div>
        </div>
      );
    }

    if (hasSearched && sortedStudents.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No students found matching your search.</p>
        </div>
      );
    }

    return (
      <div>
        {/* Status Legend and Quick Stats */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Students are sorted by status:</span>
            <span className="text-xs text-gray-500">Selected → Available → Pending → In Group</span>
          </div>
          
          {/* Quick Stats */}
          <div className={`mb-3 grid gap-2 text-xs ${groupSemester === 7 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
            {(() => {
              const stats = sortedStudents.reduce((acc, student) => {
                const status = getInviteStatus(student);
                acc[status.status] = (acc[status.status] || 0) + 1;
                return acc;
              }, {});
              
              // Calculate not eligible count for Sem 7
              const notEligibleCount = groupSemester === 7 
                ? (stats.no_track_selected || 0) + (stats.internship_track || 0) + (stats.not_coursework || 0)
                : 0;
              
              const baseStats = [
                { key: 'selected', label: 'Selected', color: 'blue', count: stats.selected || 0 },
                { key: 'available', label: 'Available', color: 'green', count: stats.available || 0 },
                { key: 'pending_from_current_group', label: 'Invitation Pending', color: 'orange', count: stats.pending_from_current_group || 0 },
                { key: 'in_group', label: 'In Group', color: 'red', count: stats.in_group || 0 }
              ];
              
              // Add "Not Eligible" stat for Sem 7
              if (groupSemester === 7 && notEligibleCount > 0) {
                baseStats.push({ key: 'not_eligible', label: 'Not Eligible', color: 'gray', count: notEligibleCount });
              }
              
              return baseStats.map(({ key, label, color, count }) => (
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
              <div className="w-3 h-3 bg-blue-100 rounded-full border border-blue-300"></div>
              <span className="text-blue-700">Selected</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 rounded-full border border-green-300"></div>
              <span className="text-green-700">Available</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-100 rounded-full border border-orange-300"></div>
              <span className="text-orange-700">Invitation Pending</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 rounded-full border border-red-300"></div>
              <span className="text-red-700">In Group</span>
            </span>
            {(groupSemester === 7 || groupSemester === 8) && (
              <span className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-100 rounded-full border border-gray-300 opacity-50"></div>
                <span className="text-gray-600">Not Eligible {groupSemester === 7 ? '(Sem 7)' : '(Sem 8 Type 2)'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
          {sortedStudents.map((student, index) => {
              const isSelected = selectedStudents.some(s => s._id === student._id);
            const inviteStatus = getInviteStatus(student);
              const canSelect = !inviteStatus.disabled && (
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
                        inviteStatus.status === 'pending_from_current_group' ? 'bg-orange-400' :
                        inviteStatus.status === 'in_group' ? 'bg-red-400' :
                        inviteStatus.disabled ? 'bg-gray-400' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {inviteStatus.status === 'available' ? 'Available Students' :
                         inviteStatus.status === 'selected' ? 'Selected Students' :
                         inviteStatus.status === 'pending_from_current_group' ? 'Invitation Pending' :
                         inviteStatus.status === 'in_group' ? 'Students in Groups' :
                         inviteStatus.disabled ? `Not Eligible Students ${groupSemester === 7 ? '(Sem 7)' : '(Sem 8 Type 2)'}` : 'Other Status'}
                      </span>
                    </div>
                  </div>
                )}
                
                <div
                  onClick={() => canSelect && handleStudentSelect(student)}
                  className={`p-4 transition-all duration-200 ${
                    canSelect ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed'
                  } ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-sm'
                      : inviteStatus.disabled
                      ? 'bg-gray-100 border-gray-200 opacity-50'
                      : canSelect
                      ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Avatar with Status */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-medium ${
                      isSelected
                          ? 'bg-green-200 text-green-800' 
                          : inviteStatus.disabled
                          ? 'bg-gray-200 text-gray-400 opacity-50'
                          : inviteStatus.status === 'available'
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-red-200 text-red-800'
                      }`}>
                        <span className="text-lg">
                          {isSelected
                            ? <FiCheck className="w-4 h-4" />
                            : inviteStatus.disabled
                            ? <FiXCircle className="w-4 h-4" />
                            : inviteStatus.status === 'available'
                            ? <FiUser className="w-4 h-4" />
                            : inviteStatus.status === 'in_group'
                            ? <FiUsers className="w-4 h-4" />
                            : <FiFile className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>
                    
                    {/* Student Information */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className={`font-medium text-lg ${
                            isSelected ? 'text-green-700' : 
                            inviteStatus.disabled ? 'text-gray-500' :
                            inviteStatus.status === 'available' ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {student.fullName}
                            {isSelected && <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Selected</span>}
                            {inviteStatus.disabled && (
                              <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {inviteStatus.message}
                              </span>
                            )}
                      </div>
                          
                          <div className={`text-sm mt-1 space-y-1 ${
                            inviteStatus.disabled ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <div className="flex items-center space-x-4">
                              <span className="font-medium">{student.rollNumber || student.misNumber}</span>
                              {student.semester && <span>Sem {student.semester}</span>}
                              {student.branchCode && <span>• {student.branchCode}</span>}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {student.collegeEmail}
                            </div>
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="flex flex-col items-end space-y-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              inviteStatus.disabled
                                ? 'bg-gray-100 text-gray-500'
                                : inviteStatus.status === 'available'
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
                            }`}
                          >
                            {inviteStatus.message}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Button */}
        {hasMoreStudents && (
          <div className="mt-4 text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading...' : 'Load More Students'}
            </button>
          </div>
        )}

        {/* Search Info */}
        <div className="mt-4 text-center text-sm text-gray-500">
          Showing {sortedStudents.length} search result{sortedStudents.length !== 1 ? 's' : ''}
        </div>
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

  // Only check groupDetails, not isInGroup (which is Sem 5-specific)
  // If we have a groupId from URL, we're loading group details directly
  if (!groupDetails && !loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m0 0h6" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Group Yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                You're not currently in a group. You can create a new group or wait for invitations from other students.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <button
                  onClick={() => navigate('/student/groups/create')}
                  className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 font-semibold flex items-center justify-center space-x-2 shadow-lg"
                >
                  <span className="text-xl">➕</span>
                  <span>Create New Group</span>
                </button>
                
                <button
                  onClick={() => navigate('/dashboard/student')}
                  className="px-6 py-4 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 font-semibold flex items-center justify-center space-x-2"
                >
                  <span className="text-xl">📋</span>
                  <span>View Invitations</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentUserMember = groupDetails?.members?.find(member => member?.student?._id === user._id);



  // Determine project type based on semester
  const groupSemester = groupDetails?.semester || roleData?.semester || user?.semester || 5;
  const projectType = groupSemester === 7 ? 'Major Project 1' : 
                      groupSemester === 8 ? 'Major Project 2' : 
                      'Minor Project 2';

  return (
    <Layout>
      <div className="bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="w-full pt-3">
          {/* Compact Header */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-3 mb-3 mx-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                <FiUsers className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-neutral-800">{groupDetails.name}</h1>
                  {groupDetails.status === 'finalized' && (
                    <span className="text-xs bg-success-100 text-success-700 px-2 py-0.5 rounded-full font-semibold">
                      FINALIZED
                    </span>
                  )}
                  {canFinalizeGroup() && groupDetails.status !== 'finalized' && (
                    <span className="text-xs bg-warning-100 text-warning-700 px-2 py-0.5 rounded-full font-semibold">
                      READY TO FINALIZE
                    </span>
                  )}
                  {groupDetails.status === 'complete' && !canFinalizeGroup() && (
                    <span className="text-xs bg-info-100 text-info-700 px-2 py-0.5 rounded-full font-semibold">
                      READY
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-600 mt-0.5">{projectType}</p>
              </div>
            </div>
            
            {/* Live Status Indicator */}
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Live</span>
            </div>
          </div>

          {/* 3-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 px-3 overflow-hidden" style={{ height: 'calc(100vh - 126px)' }}>
            {/* Left Column (20%) - Role, Stats, Status */}
            <div className="lg:col-span-2 flex flex-col gap-2.5 overflow-y-auto custom-scrollbar lg:pr-1" style={{ minHeight: 0 }}>
              {/* Your Role */}
              <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-4">
                <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-primary-600" />
                  Your Role
                </h3>
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isGroupLeader ? 'bg-gradient-to-br from-primary-600 to-secondary-600 text-white' : 'bg-neutral-200 text-neutral-600'
                  }`}>
                    {isGroupLeader ? <FiStar className="w-5 h-5" /> : <FiUser className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-800 text-sm">
                      {isGroupLeader ? 'Group Leader' : 'Group Member'}
                    </p>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      {isGroupLeader ? 'Manage group & preferences' : 'View details & participate'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Group Stats */}
              <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-4">
                <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2">
                  <FiUsers className="w-4 h-4 text-primary-600" />
                  Group Stats
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600">Current:</span>
                    <span className="font-bold text-neutral-800">
                      {groupDetails?.activeMemberCount ?? (groupDetails.members?.filter?.(m => m.isActive).length || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600">Min Required:</span>
                    <span className={`font-bold ${(groupDetails?.activeMemberCount ?? (groupDetails.members?.filter?.(m => m.isActive).length || 0)) >= (minGroupMembers || groupDetails?.minMembers) ? 'text-success-700' : 'text-warning-700'}`}>
                      {minGroupMembers || groupDetails?.minMembers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600">Max Allowed:</span>
                    <span className="font-bold text-neutral-800">{maxGroupMembers || groupDetails?.maxMembers}</span>
                  </div>
                </div>
              </div>

              {/* Group Status */}
              <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-4">
                <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2">
                  <FiInfo className="w-4 h-4 text-primary-600" />
                  Status
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-600">Group Status:</span>
                    <StatusBadge 
                      status={groupDetails.status === 'finalized' ? 'success' : 
                              groupDetails.status === 'complete' ? 'info' : 'warning'} 
                      text={groupDetails.status === 'finalized' ? 'Finalized' : 
                            groupDetails.status === 'complete' ? 'Complete' : 'Forming'} 
                    />
                  </div>
                  {groupDetails.finalizedAt && (
                    <div className="text-xs text-neutral-600 pt-2 border-t border-neutral-200">
                      <span className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        Finalized: {new Date(groupDetails.finalizedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Leave Group - Only for non-leaders */}
              {canLeaveGroup() && !isGroupLeader && (
                <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-4">
                  <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2">
                    <FiLogOut className="w-4 h-4 text-error-600" />
                    Group Actions
                  </h3>
                  <div className="bg-warning-50 border border-warning-200 rounded-lg p-2 mb-3">
                    <p className="text-xs text-warning-800 flex items-start gap-1">
                      <FiAlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      You can leave before finalization
                    </p>
                  </div>
                  <button
                    onClick={handleLeaveGroup}
                    disabled={leaveLoading || !canLeaveGroup()}
                    className="w-full btn-danger inline-flex items-center justify-center gap-2 text-sm"
                  >
                    {leaveLoading ? (
                      <>
                        <FiLoader className="w-4 h-4 animate-spin" />
                        Leaving...
                      </>
                    ) : (
                      <>
                        <FiLogOut className="w-4 h-4" />
                        Leave Group
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Center Column (55%) - Main Content */}
            <div className="lg:col-span-7 flex flex-col gap-3 overflow-y-auto custom-scrollbar pb-3" style={{ minHeight: 0 }}>

              {/* Group Members */}
              <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 flex-shrink-0">
                <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-4 py-3 border-b border-neutral-200">
                  <h2 className="text-base font-bold text-neutral-800 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center">
                      <FiUsers className="w-4 h-4 text-white" />
                    </div>
                    Group Members
                  </h2>
                </div>
                <div className="p-4">
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
                <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 flex-shrink-0">
                  <div className="bg-gradient-to-r from-info-50 to-primary-50 px-4 py-3 border-b border-neutral-200">
                    <h2 className="text-base font-bold text-neutral-800 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-info-600 to-primary-600 rounded-lg flex items-center justify-center">
                        <FiMail className="w-4 h-4 text-white" />
                      </div>
                      Invited Members
                    </h2>
                    <p className="text-xs text-neutral-600 mt-1.5">Students invited to join this group</p>
                  </div>
                  <div className="p-4">
                  <div className="space-y-2">
        {populatedInvites && populatedInvites.length > 0 ? (() => {
          // Filter out leader from invites
          const leaderId = groupDetails.leader?._id || groupDetails.leader;
          const filteredInvites = populatedInvites.filter(invite => {
            const studentId = invite.student?._id || invite.student;
            return !(leaderId && studentId && studentId === leaderId);
          });
          
          // Group invitations by student and keep only the most recent one for each student
          // Priority: pending > accepted > rejected > auto-rejected
          const statusPriority = {
            'pending': 4,
            'accepted': 3,
            'rejected': 2,
            'auto-rejected': 1
          };
          
          const studentInvitesMap = new Map();
          filteredInvites.forEach(invite => {
                      const studentId = invite.student?._id || invite.student;
            if (!studentId) return;
            
            const existingInvite = studentInvitesMap.get(studentId);
            if (!existingInvite) {
              studentInvitesMap.set(studentId, invite);
            } else {
              // Compare by status priority, then by date (most recent)
              const existingPriority = statusPriority[existingInvite.status] || 0;
              const currentPriority = statusPriority[invite.status] || 0;
              
              if (currentPriority > existingPriority) {
                // Current invite has higher priority (e.g., pending > rejected)
                studentInvitesMap.set(studentId, invite);
              } else if (currentPriority === existingPriority) {
                // Same priority - keep the most recent one
                const existingDate = new Date(existingInvite.invitedAt || 0);
                const currentDate = new Date(invite.invitedAt || 0);
                if (currentDate > existingDate) {
                  studentInvitesMap.set(studentId, invite);
                }
              }
            }
          });
          
          // Convert map to array and sort by status priority (pending first), then by name
          const uniqueInvites = Array.from(studentInvitesMap.values()).sort((a, b) => {
            const aPriority = statusPriority[a.status] || 0;
            const bPriority = statusPriority[b.status] || 0;
            if (bPriority !== aPriority) {
              return bPriority - aPriority; // Higher priority first
            }
            // Same priority - sort by student name
            const aName = a.student?.fullName || '';
            const bName = b.student?.fullName || '';
            return aName.localeCompare(bName);
          });
          
          return uniqueInvites.map((invite, index) => {
                      return (
                      <div key={index} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {invite.student?.fullName?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-neutral-800 text-sm">
                                {invite.student?.fullName || 'Unknown Student'}
                              </h4>
                              <span className="text-xs text-neutral-500">•</span>
                              <span className="text-xs text-neutral-600 font-medium">
                                {invite.student?.misNumber || 'MIS# -'}
                              </span>
                              {invite.student?.branch && (
                                <>
                                  <span className="text-xs text-neutral-400">•</span>
                                  <span className="text-xs text-neutral-500">{invite.student.branch}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                            invite.status === 'pending' 
                              ? 'bg-warning-100 text-warning-700 border border-warning-200' 
                              : invite.status === 'accepted'
                              ? 'bg-success-100 text-success-700 border border-success-200'
                              : invite.status === 'rejected'
                              ? 'bg-error-100 text-error-700 border border-error-200'
                              : invite.status === 'auto-rejected'
                              ? 'bg-warning-100 text-warning-700 border border-warning-200'
                              : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                          }`}>
                            {invite.status === 'pending' && (
                              <>
                                <FiClock className="w-3 h-3" />
                                Pending
                              </>
                            )}
                            {invite.status === 'accepted' && (
                              <>
                                <FiCheckCircle className="w-3 h-3" />
                                Accepted
                              </>
                            )}
                            {invite.status === 'rejected' && (
                              <>
                                <FiXCircle className="w-3 h-3" />
                                Rejected
                              </>
                            )}
                            {invite.status === 'auto-rejected' && (
                              <>
                                <FiAlertCircle className="w-3 h-3" />
                                Auto-Rejected
                              </>
                            )}
                            {!['pending', 'accepted', 'rejected', 'auto-rejected'].includes(invite.status) && (
                              <>
                                <FiAlertTriangle className="w-3 h-3" />
                                Unknown
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      );
          });
        })() : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No invitations have been sent yet.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Invitation Summary */}
                  <div className="mt-4 mb-2 p-3.5 bg-info-50 border border-info-200 rounded-xl">
                    <div className="flex flex-wrap justify-between gap-3 text-xs">
                      <span className="flex items-center gap-1.5 text-info-700">
                        <span className="font-bold">Total:</span>
                        <span className="font-semibold">{groupDetails.invites ? groupDetails.invites.filter(invite => {
                          const studentId = invite.student?._id || invite.student;
                          const leaderId = groupDetails.leader?._id || groupDetails.leader;
                          return !(leaderId && studentId && studentId === leaderId);
                        }).length : 0}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-warning-700">
                        <span className="font-bold">Pending:</span>
                        <span className="font-semibold">{groupDetails.invites ? groupDetails.invites.filter(i => {
                          const studentId = i.student?._id || i.student;
                          const leaderId = groupDetails.leader?._id || groupDetails.leader;
                          return i.status === 'pending' && !(leaderId && studentId && studentId === leaderId);
                        }).length : 0}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-success-700">
                        <span className="font-bold">Accepted:</span>
                        <span className="font-semibold">{groupDetails.invites ? groupDetails.invites.filter(i => {
                          const studentId = i.student?._id || i.student;
                          const leaderId = groupDetails.leader?._id || groupDetails.leader;
                          return i.status === 'accepted' && !(leaderId && studentId && studentId === leaderId);
                        }).length : 0}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-error-700">
                        <span className="font-bold">Rejected:</span>
                        <span className="font-semibold">{groupDetails.invites ? groupDetails.invites.filter(i => {
                          const studentId = i.student?._id || i.student;
                          const leaderId = groupDetails.leader?._id || groupDetails.leader;
                          return i.status === 'rejected' && !(leaderId && studentId && studentId === leaderId);
                        }).length : 0}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-warning-700">
                        <span className="font-bold">Auto-Rejected:</span>
                        <span className="font-semibold">{groupDetails.invites ? groupDetails.invites.filter(i => {
                          const studentId = i.student?._id || i.student;
                          const leaderId = groupDetails.leader?._id || groupDetails.leader;
                          return i.status === 'auto-rejected' && !(leaderId && studentId && studentId === leaderId);
                        }).length : 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            </div>

            {/* Right Column (25%) - Updates, Actions, Invite/Finalize */}
            <div className="lg:col-span-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar" style={{ minHeight: 0 }}>

              {/* Allocated Faculty */}
              {groupDetails.allocatedFaculty && (
                <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-4 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <FiUserCheck className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-bold text-neutral-800">Allocated Faculty</h3>
                  </div>
                  <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg p-3 border border-primary-100">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                        <FiUserCheck className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-neutral-800 mb-1">
                          {formatFacultyName(groupDetails.allocatedFaculty)}
                        </h4>
                        <div className="space-y-0.5 text-xs text-neutral-600">
                          <p className="font-medium">
                            {groupDetails.allocatedFaculty.facultyId} • {groupDetails.allocatedFaculty.department}
                          </p>
                          <p>{groupDetails.allocatedFaculty.designation}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full font-semibold ${
                          groupDetails.allocatedFaculty.mode === 'Regular' 
                            ? 'bg-success-100 text-success-700 border border-success-200' :
                          groupDetails.allocatedFaculty.mode === 'Adjunct' 
                            ? 'bg-info-100 text-info-700 border border-info-200' :
                            'bg-warning-100 text-warning-700 border border-warning-200'
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
                <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-4 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <FiBook className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-bold text-neutral-800">Project Information</h3>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-neutral-200 space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-800 mb-1">
                        {groupDetails.project.title}
                      </h4>
                      {groupDetails.project.description && (
                        <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">
                          {groupDetails.project.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-neutral-200">
                      {groupDetails.project.domain && (
                        <div>
                          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide block mb-0.5">Domain</span>
                          <p className="text-xs font-medium text-neutral-800">{groupDetails.project.domain}</p>
                        </div>
                      )}
                      {groupDetails.project.status && (
                        <div>
                          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide block mb-0.5">Status</span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full font-semibold ${
                            groupDetails.project.status === 'registered' ? 'bg-info-100 text-info-700 border border-info-200' :
                            groupDetails.project.status === 'faculty_allocated' ? 'bg-success-100 text-success-700 border border-success-200' :
                            groupDetails.project.status === 'active' ? 'bg-warning-100 text-warning-700 border border-warning-200' :
                            groupDetails.project.status === 'completed' ? 'bg-success-100 text-success-700 border border-success-200' :
                            'bg-error-100 text-error-700 border border-error-200'
                          }`}>
                            {groupDetails.project.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {groupDetails.project.technicalRequirements && (
                      <div className="pt-2 border-t border-neutral-200">
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide block mb-1">Technical Requirements</span>
                        <p className="text-xs text-neutral-700 leading-relaxed line-clamp-3">{groupDetails.project.technicalRequirements}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Real-time Updates Feed */}
              {realTimeUpdates.length > 0 && (
                <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-4 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                      <FiClock className="w-4 h-4 text-primary-600" />
                      Latest Updates
                    </h3>
                    <button 
                      onClick={() => setRealTimeUpdates([])}
                      className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 hover:bg-neutral-100 rounded"
                      aria-label="Clear updates"
                    >
                      <FiXCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {realTimeUpdates.slice(-3).reverse().map((update, index) => (
                      <div key={index} className={`text-xs p-2.5 rounded-lg ${
                        update.isPositive ? 'bg-success-50 text-success-700 border border-success-100' : 'bg-warning-50 text-warning-700 border border-warning-100'
                      }`}>
                        <span className="font-semibold">{new Date(update.timestamp).toLocaleTimeString()}:</span>
                        <span className="ml-1.5">{update.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite Members Section */}
              <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-4 flex-shrink-0">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <FiUserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-neutral-800">Invite Members</h3>
                    <p className="text-xs text-neutral-600 mt-0.5">Expand your team</p>
                  </div>
                </div>
                
                {/* Capacity Info - Only show for non-finalized groups */}
                {!isGroupFinalized() && (
                  <div className="bg-white rounded-lg p-3.5 border border-neutral-200 mb-4">
                    <div className="grid grid-cols-3 gap-3 mb-3.5">
                      <div className="text-center">
                        <p className="text-[10px] text-neutral-500 mb-1.5 font-medium uppercase tracking-wide">Current</p>
                        <p className="text-xl font-bold text-neutral-800">
                          {groupDetails?.activeMemberCount ?? (groupDetails.members?.filter?.(m => m.isActive).length || 0)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-neutral-500 mb-1.5 font-medium uppercase tracking-wide">Min</p>
                        <p className="text-base font-bold text-warning-700">{minGroupMembers || groupDetails?.minMembers}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-neutral-500 mb-1.5 font-medium uppercase tracking-wide">Max</p>
                        <p className="text-base font-bold text-primary-700">{maxGroupMembers || groupDetails?.maxMembers}</p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-200 rounded-full h-2.5 mb-2.5 overflow-hidden">
                      <div 
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, (((groupDetails?.activeMemberCount ?? (groupDetails.members?.filter?.(m => m.isActive).length || 0)) / (maxGroupMembers || groupDetails.maxMembers)) * 100))}%`,
                          background: (() => {
                            const current = groupDetails?.activeMemberCount ?? (groupDetails.members?.filter?.(m => m.isActive).length || 0);
                            const min = minGroupMembers || groupDetails?.minMembers;
                            const max = maxGroupMembers || groupDetails?.maxMembers;
                            const progress = (current / max) * 100;
                            const minProgress = (min / max) * 100;
                            if (progress < minProgress) return 'linear-gradient(90deg, #f59e0b, #f97316)';
                            if (progress < 100) return 'linear-gradient(90deg, #3b82f6, #6366f1)';
                            return 'linear-gradient(90deg, #10b981, #059669)';
                          })()
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-center text-neutral-600 font-medium">
                      {(() => {
                        const current = groupDetails?.activeMemberCount ?? (groupDetails.members?.filter?.(m => m.isActive).length || 0);
                        const min = minGroupMembers || groupDetails?.minMembers;
                        if (current < min) return `Need ${min - current} more member${min - current !== 1 ? 's' : ''}`;
                        return `${current}/${maxGroupMembers || groupDetails?.maxMembers} members`;
                      })()}
                    </p>
                  </div>
                )}
                
                {/* Invite Button */}
                {isGroupFinalized() ? (
                  <div className="w-full p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <FiLock className="w-4 h-4 text-neutral-600" />
                      <span className="text-xs font-semibold text-neutral-600">Invite Disabled</span>
                    </div>
                    <p className="text-xs text-neutral-500">Group finalized</p>
                  </div>
                ) : isGroupLeader ? (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    disabled={!canInviteMembers()}
                    className={`w-full btn-primary inline-flex items-center justify-center gap-2 text-sm py-2.5 ${
                      !canInviteMembers() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <FiUserPlus className="w-4 h-4" />
                    Invite Members
                  </button>
                ) : (
                  <div className="w-full p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <FiUserPlus className="w-4 h-4 text-neutral-600" />
                      <span className="text-xs font-semibold text-neutral-600">Invite Members</span>
                    </div>
                    <p className="text-xs text-neutral-500">Leader only</p>
                  </div>
                )}
              </div>
                     
              {/* Finalize Group Section */}
              <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-4 flex-shrink-0">
                <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2">
                  <FiLock className="w-4 h-4 text-primary-600" />
                  Finalize Group
                </h3>
                
                {isGroupFinalized() ? (
                  <div className="bg-success-50 border border-success-200 rounded-lg p-4 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-md">
                      <FiCheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-bold text-success-900 text-sm mb-1.5">Group Finalized!</h4>
                    <p className="text-xs text-success-700 mb-2.5">Ready for project allocation</p>
                    {groupDetails.finalizedAt && (
                      <p className="text-xs text-success-600 mb-3 font-medium">
                        {new Date(groupDetails.finalizedAt).toLocaleDateString()}
                      </p>
                    )}
                    <div className="mt-3 bg-success-100 border border-success-200 rounded-lg p-2.5">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <FiLock className="w-3.5 h-3.5 text-success-700" />
                        <span className="text-xs font-semibold text-success-700">Group Locked</span>
                      </div>
                      <p className="text-xs text-success-600">No changes allowed</p>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-4 border ${
                    canFinalizeGroup() && isGroupLeader
                      ? 'bg-success-50 border-success-200'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}>
                    <div className="text-center mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-md ${
                        canFinalizeGroup() && isGroupLeader
                          ? 'bg-gradient-to-br from-success-500 to-success-600'
                          : 'bg-neutral-400'
                      }`}>
                        {canFinalizeGroup() && isGroupLeader ? (
                          <FiCheckCircle className="w-6 h-6 text-white" />
                        ) : (
                          <FiLock className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <h4 className={`font-bold text-sm mb-1.5 ${
                        canFinalizeGroup() && isGroupLeader ? 'text-success-900' : 'text-neutral-700'
                      }`}>
                        {canFinalizeGroup() && isGroupLeader 
                          ? 'Ready to Finalize!' 
                          : 'Finalization'}
                      </h4>
                      <p className={`text-xs leading-relaxed ${
                        canFinalizeGroup() && isGroupLeader ? 'text-success-700' : 'text-neutral-500'
                      }`}>
                        {canFinalizeGroup() && isGroupLeader
                          ? (() => {
                              const current = groupDetails?.activeMemberCount ?? (groupDetails.members?.filter?.(m => m.isActive).length || 0);
                              return `All ${current} members joined`;
                            })()
                          : isGroupLeader
                            ? (() => {
                                const current = groupDetails?.activeMemberCount ?? (groupDetails.members?.filter?.(m => m.isActive).length || 0);
                                const min = minGroupMembers || groupDetails?.minMembers;
                                const needed = Math.max(0, min - current);
                                return `Need ${needed} more member${needed !== 1 ? 's' : ''}`;
                              })()
                            : 'Leader can finalize when ready'
                        }
                      </p>
                    </div>
                    
                    {isGroupLeader ? (
                      <button
                        onClick={handleFinalizeGroup}
                        disabled={finalizeLoading || !canFinalizeGroup()}
                        className={`w-full btn-success inline-flex items-center justify-center gap-2 text-sm py-2.5 ${
                          !canFinalizeGroup() ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {finalizeLoading ? (
                          <>
                            <FiLoader className="w-4 h-4 animate-spin" />
                            Finalizing...
                          </>
                        ) : (
                          <>
                            <FiCheckCircle className="w-4 h-4" />
                            Finalize Group
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="w-full p-2.5 rounded-lg bg-neutral-100 border border-neutral-300 text-center">
                        <p className="text-xs text-neutral-500">Leader only</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invite Members Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-surface-100 rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col border border-neutral-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center shadow-md">
                  <FiUserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-800">Invite Members</h2>
                  <p className="text-xs text-neutral-600">Search and select students to join your group</p>
                </div>
              </div>

              <button
                onClick={handleCloseInviteModal}
                className="text-neutral-500 hover:text-neutral-700 transition-colors p-1.5"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
             
            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface-200">
              {/* Instructions */}
              <div className="flex-shrink-0 p-4">
                <div className="bg-info-50 rounded-xl p-3 border border-info-200">
                  <div className="flex items-center gap-2">
                    <FiInfo className="w-4 h-4 text-info-600 flex-shrink-0" />
                    <p className="text-xs text-info-800">
                      Search by name, MIS, or email. You can invite up to <span className="font-semibold text-info-700">{getAvailableSlots()}</span> more students.
                    </p>
                  </div>
                </div>
              </div>
                    
              {/* Selected Students */}
              {selectedStudents.length > 0 && (
                <div className="flex-shrink-0 px-4 pb-3">
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between p-3 border-b border-neutral-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-success-500 to-success-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{selectedStudents.length}</span>
                        </div>
                        <h3 className="font-semibold text-neutral-800 text-sm">
                          Selected ({selectedStudents.length})
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedStudents([])}
                        className="text-xs text-neutral-500 hover:text-error-600 transition-colors px-2 py-1 hover:bg-error-50 rounded"
                      >
                        <FiXCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="max-h-32 overflow-y-auto custom-scrollbar p-3">
                      <div className="space-y-2">
                        {selectedStudents.map((student) => (
                          <div key={student._id} className="flex items-center justify-between bg-primary-50 p-2 rounded-lg border border-primary-200">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-7 h-7 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-xs">
                                  {student.fullName?.charAt(0) || '?'}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-neutral-800 text-xs truncate">{student.fullName}</p>
                                <p className="text-[11px] text-neutral-600 truncate">{student.misNumber}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedStudents(prev => prev.filter(s => s._id !== student._id))}
                              className="text-error-600 hover:text-error-700 hover:bg-error-50 p-1 rounded transition-colors flex-shrink-0"
                            >
                              <FiX className="w-3.5 h-3.5" />
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
                          {/* Enhanced Search Input */}
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
                              maxLength={50}
                              className="block w-full pl-10 pr-20 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Search CSE & ECE students by name, email, phone, or MIS number..."
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                              <span className="text-xs text-gray-400">
                                {searchTerm.length}/50
                              </span>
                            </div>
                          </div>
                          
                          {/* Search Help Text */}
                          <div className="mb-4 text-sm text-gray-500">
                            <p className="mb-1">💡 Start typing to search for students. This helps load results faster.</p>
                            <p className="text-xs text-gray-400">
                              Search 5th semester <strong>CSE & ECE</strong> students by: <strong>name</strong>, <strong>email</strong>, <strong>phone number</strong>, or <strong>MIS number</strong>
                            </p>
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
                                  <p className="text-sm">Type at least 2 characters to search CSE & ECE students</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
             
              {/* Modal Footer */}
              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 flex items-center justify-between p-4 border-t border-neutral-200 flex-shrink-0">
                <div className="text-xs text-neutral-600">
                  {selectedStudents.length > 0 ? (
                    <span className="font-semibold">
                      {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
                    </span>
                  ) : (
                    <span>No students selected</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCloseInviteModal}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInvitations}
                    disabled={selectedStudents.length === 0 || inviteLoading}
                    className={`btn-primary inline-flex items-center gap-2 text-sm ${
                      selectedStudents.length === 0 || inviteLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {inviteLoading ? (
                      <>
                        <FiLoader className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiUserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Send ({selectedStudents.length})</span>
                        <span className="sm:hidden">Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GroupDashboard;
