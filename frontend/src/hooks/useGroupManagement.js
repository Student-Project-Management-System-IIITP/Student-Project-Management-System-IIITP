import { useSem5 } from '../context/Sem5Context';
import { useSem7 } from '../context/Sem7Context';
import { useSem8 } from '../context/Sem8Context';
import { useAuth } from '../context/AuthContext';

export const useGroupManagement = () => {
  const { user, userRole, roleData } = useAuth();
  const currentSemester = roleData?.semester || user?.semester || 5;
  
  // Use appropriate context based on semester
  const sem5Context = useSem5();
  const sem7Context = useSem7();
  const sem8Context = useSem8();
  
  // Select context and group data based on semester
  const context = currentSemester === 7 ? sem7Context : 
                  currentSemester === 8 ? sem8Context : 
                  sem5Context;
  const group = currentSemester === 7 ? sem7Context.majorProject1Group : 
                currentSemester === 8 ? sem8Context.majorProject2Group : 
                sem5Context.sem5Group;
  const groupInvitations = currentSemester === 7 ? sem7Context.groupInvitations : 
                           currentSemester === 8 ? sem8Context.groupInvitations : 
                           sem5Context.groupInvitations;
  const loading = context?.loading || false;
  const error = context?.error || null;

  // Check if student can create a group
  // For Sem 5: Basic eligibility check
  // For Sem 7: Must be coursework track and no existing group
  // For Sem 8: Must be Type 1 student (coursework track) and no existing group
  const canCreateGroup = (() => {
    if (userRole !== 'student') return false;
    if (user?.degree !== 'B.Tech' && roleData?.degree !== 'B.Tech') return false;
    
    if (currentSemester === 5) {
      return !group;
    } else if (currentSemester === 7) {
      // Sem 7: Check if student is in coursework track
      const selectedTrack = sem7Context.trackChoice?.finalizedTrack || sem7Context.trackChoice?.chosenTrack;
      return selectedTrack === 'coursework' && !group;
    } else if (currentSemester === 8) {
      // Sem 8: Check if student is Type 1 (auto-enrolled in coursework for Major Project 2)
      // Wait for Sem8Context to load before checking
      if (sem8Context?.loading) {
        return false; // Still loading, can't determine yet
      }
      // studentType is in sem8Status object, not directly on context
      const studentType = sem8Context?.sem8Status?.studentType;
      const isType1 = studentType === 'type1';
      return isType1 && !group;
    }
    
    return false;
  })();

  // Check if student is already in a group
  const isInGroup = !!group;

  // Check if student is group leader
  const isGroupLeader = 
    group && 
    group.leader && 
    ((typeof group.leader === 'object' && group.leader._id === roleData?._id) ||
     (typeof group.leader === 'string' && group.leader === roleData?._id));

  // Check if group is complete (for Sem 5) or finalized (for Sem 7 and Sem 8)
  const isGroupComplete = (currentSemester === 7 || currentSemester === 8)
    ? group?.status === 'finalized' 
    : group?.status === 'complete';

  // Check if group is ready for faculty allocation (count only active members)
  const activeMembersForAllocation = group?.members?.filter(m => m.isActive !== false) || [];
  const isReadyForAllocation = 
    isGroupComplete && 
    activeMembersForAllocation.length >= (group?.minMembers || 2);

  // Get available slots in current group (count only active members)
  const getAvailableSlots = () => {
    if (!group) return 0;
    const activeMembers = group.members?.filter(m => m.isActive !== false) || [];
    const currentMembers = activeMembers.length;
    const maxMembers = group.maxMembers || 5;
    return Math.max(0, maxMembers - currentMembers);
  };

  // Get group member count (only active members)
  const getMemberCount = () => {
    if (!group) return 0;
    const activeMembers = group.members?.filter(m => m.isActive !== false) || [];
    return activeMembers.length;
  };

  // Get pending invitations count
  const getPendingInvitationsCount = () => {
    return groupInvitations?.filter(invitation => invitation.status === 'pending').length || 0;
  };

  // Check if student can invite more members
  // Allow invites if: leader, has available slots, and group is not finalized/locked
  const canInviteMembers = () => {
    if (!isGroupLeader) return false;
    // Block if group is finalized or locked
    if (group?.status === 'finalized' || group?.status === 'locked') return false;
    // Allow if there are available slots (even if status is 'complete' - admin might have added members)
    return getAvailableSlots() > 0;
  };

  // Check if student can accept/reject invitations
  const canRespondToInvitations = () => {
    return userRole === 'student' && 
           !isInGroup && 
           getPendingInvitationsCount() > 0;
  };

  // Get group status
  const getGroupStatus = () => {
    if (!group) return 'no_group';
    return group.status || 'forming';
  };

  // Get group statistics (count only active members)
  const getGroupStats = () => {
    if (!group) {
      return {
        memberCount: 0,
        maxMembers: 5,
        availableSlots: 5,
        leadersCount: 0,
        membersCount: 0,
        isComplete: false,
        isReadyForAllocation: false
      };
    }

    const allMembers = group.members || [];
    const activeMembers = allMembers.filter(m => m.isActive !== false);
    const leadersCount = activeMembers.filter(m => m.role === 'leader').length;
    const membersCount = activeMembers.filter(m => m.role === 'member').length;
    const maxMembers = group.maxMembers || 5;

    return {
      memberCount: activeMembers.length,
      maxMembers,
      availableSlots: Math.max(0, maxMembers - activeMembers.length),
      leadersCount,
      membersCount,
      isComplete: isGroupComplete,
      isReadyForAllocation
    };
  };

  // Get group formation progress
  const getGroupProgress = () => {
    if (!group) return 0;
    
    const stats = getGroupStats();
    const minMembers = group.minMembers || 2;
    
    if (stats.memberCount === 0) return 0;
    if (stats.memberCount < minMembers) return Math.round((stats.memberCount / minMembers) * 50);
    if (!isGroupComplete) return 75;
    return 100;
  };

  // Get next action for group management
  const getNextGroupAction = () => {
    if (!group) return 'create_group';
    if (!isGroupComplete && getAvailableSlots() > 0) return 'invite_members';
    if (!isGroupComplete && getAvailableSlots() === 0) return 'mark_complete';
    if (isGroupComplete && !isReadyForAllocation) return 'wait_for_approval';
    if (isReadyForAllocation) return 'submit_preferences';
    return 'group_active';
  };

  // Get group formation steps
  const getGroupFormationSteps = () => {
    const currentAction = getNextGroupAction();
    const projectType = currentSemester === 7 ? 'Major Project 1' : 'Minor Project 2';
    
    return [
      {
        id: 'create_group',
        title: 'Create Group',
        description: `Create a new group for ${projectType}`,
        status: group ? 'completed' : (currentAction === 'create_group' ? 'current' : 'upcoming'),
        completed: !!group
      },
      {
        id: 'invite_members',
        title: 'Invite Members',
        description: 'Invite other students to join your group',
        status: group && getAvailableSlots() > 0 ? (currentAction === 'invite_members' ? 'current' : 'completed') : (currentAction === 'invite_members' ? 'current' : 'upcoming'),
        completed: isGroupComplete
      },
      {
        id: 'mark_complete',
        title: 'Complete Group',
        description: 'Mark group as complete when all members are added',
        status: isGroupComplete ? 'completed' : (currentAction === 'mark_complete' ? 'current' : 'upcoming'),
        completed: isGroupComplete
      },
      {
        id: 'submit_preferences',
        title: 'Submit Faculty Preferences',
        description: 'Select preferred faculty members for your group',
        status: isReadyForAllocation ? (currentAction === 'submit_preferences' ? 'current' : 'completed') : 'upcoming',
        completed: isReadyForAllocation
      }
    ];
  };

  // Handle group creation with validation
  const handleCreateGroup = async (groupData) => {
    try {
      if (!canCreateGroup) {
        throw new Error('You cannot create a group at this time');
      }
      
      // Use appropriate createGroup function based on semester
      if (currentSemester === 7) {
        // For Sem 7, use studentAPI directly since Sem7Context doesn't have createGroup
        const { studentAPI } = await import('../utils/api');
        const response = await studentAPI.createGroup(groupData);
        if (!response.success) {
          throw new Error(response.message || 'Failed to create group');
        }
        // Refresh Sem 7 data
        await sem7Context.fetchSem7Data();
        return response.data;
      } else if (currentSemester === 8) {
        // For Sem 8, use studentAPI directly
        const { studentAPI } = await import('../utils/api');
        const response = await studentAPI.createGroup(groupData);
        if (!response.success) {
          throw new Error(response.message || 'Failed to create group');
        }
        // Refresh Sem 8 data
        if (sem8Context?.fetchSem8Data) {
          await sem8Context.fetchSem8Data();
        }
        return response.data;
      } else {
        // For Sem 5, use context method
        await sem5Context.createGroup(groupData);
      }
    } catch (error) {
      throw error;
    }
  };

  // Handle member invitation with validation
  const handleInviteMembers = async (groupId, studentIds, roles) => {
    try {
      if (!canInviteMembers()) {
        throw new Error('You cannot invite members at this time');
      }
      
      if (!groupId) {
        throw new Error('Group ID is required');
      }
      
      // Use appropriate invite function based on semester
      if (currentSemester === 7) {
        // For Sem 7, use studentAPI directly
        const { studentAPI } = await import('../utils/api');
        const response = await studentAPI.sendGroupInvitations(groupId, { memberIds: studentIds });
        if (!response.success) {
          throw new Error(response.message || 'Failed to send invitations');
        }
        // Refresh Sem 7 data
        await sem7Context.fetchSem7Data();
        return response.data;
      } else if (currentSemester === 8) {
        // For Sem 8, use studentAPI directly
        const { studentAPI } = await import('../utils/api');
        const response = await studentAPI.sendGroupInvitations(groupId, { memberIds: studentIds });
        if (!response.success) {
          throw new Error(response.message || 'Failed to send invitations');
        }
        // Refresh Sem 8 data
        if (sem8Context?.fetchSem8Data) {
          await sem8Context.fetchSem8Data();
        }
        return response.data;
      } else {
        // For Sem 5, use context method
        await sem5Context.inviteToGroup(groupId, studentIds, roles);
      }
    } catch (error) {
      throw error;
    }
  };

  // Handle group finalization with validation
  const handleFinalizeGroup = async (groupId) => {
    try {
      if (!isGroupLeader) {
        throw new Error('Only the group leader can finalize the group');
      }
      
      if (!groupId) {
        throw new Error('Group ID is required');
      }
      
      // Import the API function
      const { studentAPI } = await import('../utils/api');
      const response = await studentAPI.finalizeGroup(groupId);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to finalize group');
      }
      
      // Immediately refresh data after successful finalization
      // This ensures the UI updates right away, not just via WebSocket
      if (currentSemester === 7) {
        await sem7Context.fetchSem7Data();
      } else if (currentSemester === 8) {
        if (sem8Context?.fetchSem8Data) {
          await sem8Context.fetchSem8Data();
        }
      } else {
        await sem5Context.fetchSem5Data();
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Handle invitation responses (works for both Sem 5 and Sem 7)
  const handleInvitationResponse = async (invitationId, accept = true) => {
    try {
      if (currentSemester === 5) {
        if (accept) {
          await sem5Context.acceptGroupInvitation(invitationId);
        } else {
          await sem5Context.rejectGroupInvitation(invitationId);
        }
      } else if (currentSemester === 7) {
        if (accept) {
          await sem7Context.acceptGroupInvitation(invitationId);
        } else {
          await sem7Context.rejectGroupInvitation(invitationId);
        }
      } else {
        throw new Error('Invitation responses are only available for Semester 5 and 7');
      }
    } catch (error) {
      throw error;
    }
  };

  return {
    // State
    sem5Group: currentSemester === 5 ? group : null, // Keep for backward compatibility
    majorProject1Group: currentSemester === 7 ? group : null, // For Sem 7
    group, // Generic group reference
    groupInvitations,
    loading,
    error,

    // Capabilities
    canCreateGroup,
    isInGroup,
    isGroupLeader,
    isGroupComplete,
    isReadyForAllocation,
    canInviteMembers,
    canRespondToInvitations,

    // Statistics
    getAvailableSlots,
    getMemberCount,
    getPendingInvitationsCount,
    getGroupStatus,
    getGroupStats,
    getGroupProgress,
    getNextGroupAction,
    getGroupFormationSteps,

    // Actions
    createGroup: handleCreateGroup,
    inviteToGroup: handleInviteMembers,
    acceptGroupInvitation: currentSemester === 5 ? sem5Context.acceptGroupInvitation : sem7Context.acceptGroupInvitation,
    rejectGroupInvitation: currentSemester === 5 ? sem5Context.rejectGroupInvitation : sem7Context.rejectGroupInvitation,
    handleInvitationResponse,
    finalizeGroup: handleFinalizeGroup,
    fetchSem5Data: currentSemester === 5 ? sem5Context.fetchSem5Data : sem7Context.fetchSem7Data,
  };
};
