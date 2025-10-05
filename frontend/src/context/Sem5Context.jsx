import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { studentAPI, facultyAPI, adminAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { toast } from 'react-hot-toast';

const Sem5Context = createContext();

export const useSem5 = () => useContext(Sem5Context);

export const Sem5Provider = ({ children }) => {
  const { user, userRole, roleData } = useAuth();
  const { subscribe, unsubscribe } = useWebSocket();
  
  // Sem 5 State
  const [sem5Project, setSem5Project] = useState(null);
  const [sem5Group, setSem5Group] = useState(null);
  const [groupInvitations, setGroupInvitations] = useState([]);
  const [facultyPreferences, setFacultyPreferences] = useState([]);
  const [allocationStatus, setAllocationStatus] = useState(null);
  const [systemConfig, setSystemConfig] = useState(null);
  
  // Loading States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Sem 5 data based on user role
  const fetchSem5Data = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      if (userRole === 'student') {
        // Only load Sem 5 data for Sem 5 students
        const userSemester = user.semester || roleData?.semester || user?.semester;
        const currentSemester = userSemester || 4;
        
        if (currentSemester === 5) {
          await Promise.all([
            loadStudentSem5Data(),
            loadGroupInvitations()
          ]);
        } else {
          // Not Sem 5 student - skip loading
          setLoading(false);
          return;
        }
      } else if (userRole === 'faculty') {
        await loadFacultySem5Data();
      } else if (userRole === 'admin') {
        await loadAdminSem5Data();
      }
    } catch (err) {
      console.error('Failed to fetch Sem 5 data:', err);
      setError(err);
      toast.error(`Failed to load Sem 5 data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  // Student-specific data loading
  const loadStudentSem5Data = async () => {
    try {
      const dashboardResponse = await studentAPI.getSem5Dashboard();
      const dashboardData = dashboardResponse.data;
      
      setSem5Project(dashboardData.project);
      setSem5Group(dashboardData.group);
      setFacultyPreferences(dashboardData.facultyPreferences || []);
      setAllocationStatus(dashboardData.allocationStatus);
    } catch (error) {
      console.error('Failed to load student Sem 5 data:', error);
    }
  };

  // Load group invitations for students
  const loadGroupInvitations = async () => {
    try {
      const response = await studentAPI.getGroupInvitations();
      setGroupInvitations(response.data || []);
    } catch (error) {
      console.error('Failed to load group invitations:', error);
    }
  };

  // WebSocket event handlers for real-time updates
  useEffect(() => {
    if (userRole !== 'student') return;

    // Handle invitation updates (acceptance, rejection, auto-rejection)
    const handleInvitationUpdate = (data) => {
      console.log('Invitation update received:', data);
      // Refresh invitations to reflect the latest state
      loadGroupInvitations();
      
      // Show appropriate notification
      if (data.type === 'auto_rejected') {
        if (data.reason === 'Group has been finalized') {
          toast.error('Your invitation was automatically rejected - group has been finalized');
        } else if (data.reason === 'Group is now full') {
          toast.error('Your invitation was automatically rejected - group is now full');
        } else {
          toast.error(`Your invitation was automatically rejected - ${data.reason}`);
        }
      } else if (data.type === 'accepted') {
        toast.success('Invitation accepted successfully!');
      } else if (data.type === 'rejected') {
        toast.info('Invitation was rejected');
      }
    };

    // Handle group capacity updates
    const handleCapacityUpdate = (data) => {
      console.log('Group capacity update received:', data);
      // Refresh group data to show updated member count
      loadStudentSem5Data();
    };

    // Handle group finalization events
    const handleGroupFinalized = (data) => {
      console.log('Group finalized event received:', data);
      // Refresh all data to reflect the finalization
      loadStudentSem5Data();
      loadGroupInvitations();
      
      // Show notification
      toast.success('Group has been finalized successfully!');
    };

    // Subscribe to WebSocket events
    subscribe('invitation_update', handleInvitationUpdate);
    subscribe('group_capacity_update', handleCapacityUpdate);
    subscribe('group_finalized', handleGroupFinalized);

    // Cleanup on unmount
    return () => {
      unsubscribe('invitation_update', handleInvitationUpdate);
      unsubscribe('group_capacity_update', handleCapacityUpdate);
      unsubscribe('group_finalized', handleGroupFinalized);
    };
  }, [userRole, subscribe, unsubscribe]);

  // Faculty-specific data loading
  const loadFacultySem5Data = async () => {
    try {
      const [unallocatedResponse, allocatedResponse, statsResponse] = await Promise.all([
        facultyAPI.getUnallocatedGroups(),
        facultyAPI.getAllocatedGroups(),
        facultyAPI.getSem5Statistics()
      ]);
      
      // Store faculty data in context
      setAllocationStatus({
        unallocatedGroups: unallocatedResponse.data || [],
        allocatedGroups: allocatedResponse.data || [],
        statistics: statsResponse.data || {}
      });
    } catch (error) {
      console.error('Failed to load faculty Sem 5 data:', error);
      // Set empty data on error
      setAllocationStatus({
        unallocatedGroups: [],
        allocatedGroups: [],
        statistics: {}
      });
    }
  };

  // Admin-specific data loading
  const loadAdminSem5Data = async () => {
    try {
      // TODO: Implement admin Sem 5 endpoints
      // For now, set empty data to prevent 404 errors
      setSem5Group([]);
      setSystemConfig({});
      setAllocationStatus({});
      
      console.log('Admin Sem 5 data loading - endpoints not yet implemented');
    } catch (error) {
      console.error('Failed to load admin Sem 5 data:', error);
    }
  };

  // Student Actions
  const registerMinorProject2 = async (projectData) => {
    try {
      const response = await studentAPI.registerMinorProject2(projectData);
      setSem5Project(response.data);
      toast.success('Minor Project 2 registered successfully!');
      return response.data;
    } catch (error) {
      toast.error(`Project registration failed: ${error.message}`);
      throw error;
    }
  };

  const createGroup = async (groupData) => {
    try {
      const response = await studentAPI.createGroup(groupData);
      setSem5Group(response.data);
      toast.success('Group created successfully!');
      return response.data;
    } catch (error) {
      toast.error(`Group creation failed: ${error.message}`);
      throw error;
    }
  };

  const inviteToGroup = async (groupId, studentIds, roles) => {
    try {
      await studentAPI.inviteToGroup(groupId, studentIds, roles);
      toast.success('Invitations sent successfully!');
      await loadGroupInvitations(); // Refresh invitations
    } catch (error) {
      toast.error(`Failed to send invitations: ${error.message}`);
      throw error;
    }
  };

  const acceptGroupInvitation = async (invitationId) => {
    try {
      // First get the invitation to extract groupId
      const invitations = groupInvitations || [];
      const invitation = invitations.find(inv => inv._id === invitationId);
      
      if (!invitation) {
        throw new Error('Invitation not found');
      }
      
      await studentAPI.acceptGroupInvitation(invitation.group._id, invitationId);
      toast.success('Invitation accepted successfully!');
      await Promise.all([loadStudentSem5Data(), loadGroupInvitations()]);
    } catch (error) {
      // Provide more specific error messages
      let errorMessage = 'Failed to accept invitation';
      if (error.message.includes('already in another group')) {
        errorMessage = 'You are already in another group for this semester';
      } else if (error.message.includes('Group is now full')) {
        errorMessage = 'This group is now full';
      } else if (error.message.includes('Group is finalized')) {
        errorMessage = 'This group is already finalized';
      } else if (error.message.includes('not for you')) {
        errorMessage = 'This invitation is not for you';
      } else if (error.message.includes('already been processed')) {
        errorMessage = 'This invitation has already been processed';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
      // Always refresh invitations after any error to reflect backend state changes
      // This handles cases like auto-rejection when group becomes full
      try {
        await loadGroupInvitations();
      } catch (refreshError) {
        console.error('Error refreshing invitations after accept failure:', refreshError);
      }
      throw error;
    }
  };

  const rejectGroupInvitation = async (invitationId) => {
    try {
      // First get the invitation to extract groupId
      const invitations = groupInvitations || [];
      const invitation = invitations.find(inv => inv._id === invitationId);
      
      if (!invitation) {
        throw new Error('Invitation not found');
      }
      
      await studentAPI.rejectGroupInvitation(invitation.group._id, invitationId);
      toast.success('Invitation rejected');
      await loadGroupInvitations();
    } catch (error) {
      // Provide more specific error messages
      let errorMessage = 'Failed to reject invitation';
      if (error.message.includes('not for you')) {
        errorMessage = 'This invitation is not for you';
      } else if (error.message.includes('already been processed')) {
        errorMessage = 'This invitation has already been processed';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const submitFacultyPreferences = async (projectId, preferences) => {
    try {
      await studentAPI.submitFacultyPreferences(projectId, preferences);
      setFacultyPreferences(preferences);
      toast.success('Faculty preferences submitted successfully!');
    } catch (error) {
      toast.error(`Failed to submit preferences: ${error.message}`);
      throw error;
    }
  };

  // Faculty Actions
  const chooseGroup = async (groupId) => {
    try {
      await facultyAPI.chooseGroup(groupId);
      toast.success('Group allocated successfully!');
      await loadFacultySem5Data();
    } catch (error) {
      toast.error(`Failed to allocate group: ${error.message}`);
      throw error;
    }
  };

  const passGroup = async (groupId) => {
    try {
      await facultyAPI.passGroup(groupId);
      toast.success('Group passed to next preference');
      await loadFacultySem5Data();
    } catch (error) {
      toast.error(`Failed to pass group: ${error.message}`);
      throw error;
    }
  };

  // Admin Actions
  const forceAllocateFaculty = async (groupId, facultyId) => {
    try {
      await adminAPI.forceAllocateFaculty(groupId, facultyId);
      toast.success('Faculty allocated successfully!');
      await loadAdminSem5Data();
    } catch (error) {
      toast.error(`Failed to allocate faculty: ${error.message}`);
      throw error;
    }
  };

  const updateSystemConfig = async (config) => {
    try {
      const response = await adminAPI.updateSystemConfig(config);
      setSystemConfig(response.data);
      toast.success('System configuration updated successfully!');
      return response.data;
    } catch (error) {
      toast.error(`Failed to update configuration: ${error.message}`);
      throw error;
    }
  };

  // Initialize data on mount
  useEffect(() => {
    fetchSem5Data();
  }, [fetchSem5Data]);

  const value = {
    // State
    sem5Project,
    sem5Group,
    groupInvitations,
    facultyPreferences,
    allocationStatus,
    systemConfig,
    loading,
    error,

    // Student Actions
    registerMinorProject2,
    createGroup,
    inviteToGroup,
    acceptGroupInvitation,
    rejectGroupInvitation,
    submitFacultyPreferences,

    // Faculty Actions
    chooseGroup,
    passGroup,

    // Admin Actions
    forceAllocateFaculty,
    updateSystemConfig,

    // Utility
    fetchSem5Data,
  };

  return <Sem5Context.Provider value={value}>{children}</Sem5Context.Provider>;
};
