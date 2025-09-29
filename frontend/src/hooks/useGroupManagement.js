import { useSem5 } from '../context/Sem5Context';
import { useAuth } from '../context/AuthContext';

export const useGroupManagement = () => {
  const { user, userRole, roleData } = useAuth();
  const {
    sem5Group,
    groupInvitations,
    loading,
    error,
    createGroup,
    inviteToGroup,
    acceptGroupInvitation,
    rejectGroupInvitation,
    fetchSem5Data,
  } = useSem5();

  // Check if student can create a group
  const canCreateGroup = 
    userRole === 'student' &&
    (user?.degree === 'B.Tech' || roleData?.degree === 'B.Tech') &&
    ((roleData?.semester || user?.semester) === 5) &&
    !sem5Group;

  // Check if student is already in a group
  const isInGroup = !!sem5Group;

  // Check if student is group leader
  const isGroupLeader = 
    sem5Group && 
    sem5Group.leader && 
    ((typeof sem5Group.leader === 'object' && sem5Group.leader._id === roleData?._id) ||
     (typeof sem5Group.leader === 'string' && sem5Group.leader === roleData?._id));

  // Check if group is complete
  const isGroupComplete = sem5Group?.status === 'complete';

  // Check if group is ready for faculty allocation
  const isReadyForAllocation = 
    isGroupComplete && 
    sem5Group?.members && 
    sem5Group.members.length >= (sem5Group?.minMembers || 2);

  // Get available slots in current group
  const getAvailableSlots = () => {
    if (!sem5Group) return 0;
    const currentMembers = sem5Group.members?.length || 0;
    const maxMembers = sem5Group.maxMembers || 5;
    return Math.max(0, maxMembers - currentMembers);
  };

  // Get group member count
  const getMemberCount = () => {
    return sem5Group?.members?.length || 0;
  };

  // Get pending invitations count
  const getPendingInvitationsCount = () => {
    return groupInvitations?.filter(invitation => invitation.status === 'pending').length || 0;
  };

  // Check if student can invite more members
  const canInviteMembers = () => {
    return isGroupLeader && 
           !isGroupComplete && 
           getAvailableSlots() > 0;
  };

  // Check if student can accept/reject invitations
  const canRespondToInvitations = () => {
    return userRole === 'student' && 
           !isInGroup && 
           getPendingInvitationsCount() > 0;
  };

  // Get group status
  const getGroupStatus = () => {
    if (!sem5Group) return 'no_group';
    return sem5Group.status || 'forming';
  };

  // Get group statistics
  const getGroupStats = () => {
    if (!sem5Group) {
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

    const members = sem5Group.members || [];
    const leadersCount = members.filter(m => m.role === 'leader').length;
    const membersCount = members.filter(m => m.role === 'member').length;
    const maxMembers = sem5Group.maxMembers || 5;

    return {
      memberCount: members.length,
      maxMembers,
      availableSlots: Math.max(0, maxMembers - members.length),
      leadersCount,
      membersCount,
      isComplete: isGroupComplete,
      isReadyForAllocation
    };
  };

  // Get group formation progress
  const getGroupProgress = () => {
    if (!sem5Group) return 0;
    
    const stats = getGroupStats();
    const minMembers = sem5Group.minMembers || 2;
    
    if (stats.memberCount === 0) return 0;
    if (stats.memberCount < minMembers) return Math.round((stats.memberCount / minMembers) * 50);
    if (!isGroupComplete) return 75;
    return 100;
  };

  // Get next action for group management
  const getNextGroupAction = () => {
    if (!sem5Group) return 'create_group';
    if (!isGroupComplete && getAvailableSlots() > 0) return 'invite_members';
    if (!isGroupComplete && getAvailableSlots() === 0) return 'mark_complete';
    if (isGroupComplete && !isReadyForAllocation) return 'wait_for_approval';
    if (isReadyForAllocation) return 'submit_preferences';
    return 'group_active';
  };

  // Get group formation steps
  const getGroupFormationSteps = () => {
    const currentAction = getNextGroupAction();
    
    return [
      {
        id: 'create_group',
        title: 'Create Group',
        description: 'Create a new group for Minor Project 2',
        status: sem5Group ? 'completed' : (currentAction === 'create_group' ? 'current' : 'upcoming'),
        completed: !!sem5Group
      },
      {
        id: 'invite_members',
        title: 'Invite Members',
        description: 'Invite other students to join your group',
        status: sem5Group && getAvailableSlots() > 0 ? (currentAction === 'invite_members' ? 'current' : 'completed') : (currentAction === 'invite_members' ? 'current' : 'upcoming'),
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

  // Handle group invitation response
  const handleInvitationResponse = async (invitationId, accept = true) => {
    try {
      if (accept) {
        await acceptGroupInvitation(invitationId);
      } else {
        await rejectGroupInvitation(invitationId);
      }
    } catch (error) {
      throw error;
    }
  };

  // Handle group creation with validation
  const handleCreateGroup = async (groupData) => {
    try {
      if (!canCreateGroup) {
        throw new Error('You cannot create a group at this time');
      }
      
      await createGroup(groupData);
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
      
      await inviteToGroup(groupId, studentIds, roles);
    } catch (error) {
      throw error;
    }
  };

  return {
    // State
    sem5Group,
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
    acceptGroupInvitation,
    rejectGroupInvitation,
    handleInvitationResponse,
    fetchSem5Data,
  };
};
