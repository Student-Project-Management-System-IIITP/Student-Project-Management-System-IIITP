import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { studentAPI, sem7API, internshipAPI, adminAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { toast } from 'react-hot-toast';

const Sem7Context = createContext();

export const useSem7 = () => useContext(Sem7Context);

export const Sem7Provider = ({ children }) => {
  const { user, userRole, roleData } = useAuth();
  const { subscribe, unsubscribe } = useWebSocket();
  
  // Sem 7 State
  const [trackChoice, setTrackChoice] = useState(null);
  const [internshipApplications, setInternshipApplications] = useState([]);
  const [majorProject1, setMajorProject1] = useState(null);
  const [majorProject1Group, setMajorProject1Group] = useState(null);
  const [internship1Project, setInternship1Project] = useState(null);
  const [internship1Status, setInternship1Status] = useState(null);
  const [facultyPreferences, setFacultyPreferences] = useState([]);
  const [groupInvitations, setGroupInvitations] = useState([]);
  
  // Loading States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Sem 7 data based on user role
  const fetchSem7Data = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      if (userRole === 'student') {
        // Only load Sem 7 data for Sem 7 students
        const userSemester = user.semester || roleData?.semester;
        const currentSemester = userSemester || 4;
        
        if (currentSemester === 7) {
          await Promise.all([
            loadStudentSem7Data(),
            loadInternshipApplications(),
            loadGroupInvitations()
          ]);
        } else {
          // Not Sem 7 student - skip loading
          setLoading(false);
          return;
        }
      } else if (userRole === 'admin') {
        // Admin doesn't need Sem 7 context data loaded here
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Failed to fetch Sem 7 data:', err);
      setError(err);
      // Don't show toast for initial load failures
    } finally {
      setLoading(false);
    }
  }, [user, userRole, roleData]);

  // Student-specific data loading
  const loadStudentSem7Data = async () => {
    try {
      // Load track choice
      const choiceResponse = await sem7API.getChoice();
      if (choiceResponse.success) {
        setTrackChoice(choiceResponse.data);
      }
      
      // Load Sem 7 group (for Major Project 1) - load independently of project
      // IMPORTANT: getGroups only returns groups where student is an ACTIVE MEMBER
      // It filters by 'members.student' and 'members.isActive': true
      // So if a student only has a pending invitation (not a member), getGroups will return empty array
      // This ensures isInGroup is false for students with only pending invitations
      try {
        const groupsResponse = await studentAPI.getGroups({ semester: 7 });
        if (groupsResponse.success && groupsResponse.data && groupsResponse.data.length > 0) {
          // CRITICAL: Filter to only include Sem 7 groups
          // The backend might return Sem 6 groups due to promotion logic, so we need to filter here
          const sem7Groups = groupsResponse.data.filter(group => 
            group.semester === 7 || group.semester === '7'
          );
          
          if (sem7Groups.length > 0) {
            // getGroups already filters by active membership, so if we get a group here,
            // the student is definitely an active member (not just invited)
            setMajorProject1Group(sem7Groups[0]);
          } else {
            // No Sem 7 groups found
            setMajorProject1Group(null);
          }
        } else {
          // No groups returned = student is not an active member of any group
          // This includes students who only have pending invitations
          setMajorProject1Group(null);
        }
      } catch (error) {
        console.error('Failed to load Sem 7 group:', error);
        // On error, assume student is not in a group
        setMajorProject1Group(null);
      }
      
      // Load Major Project 1 if exists
      const projectsResponse = await studentAPI.getProjects({ semester: 7, projectType: 'major1' });
      if (projectsResponse.success && projectsResponse.data && projectsResponse.data.length > 0) {
        setMajorProject1(projectsResponse.data[0]);
        
        // Always load group if project has group reference
        // This ensures the group data is up to date, especially after registration
        if (projectsResponse.data[0].group) {
          try {
            const groupId = projectsResponse.data[0].group._id || projectsResponse.data[0].group;
            const groupResponse = await studentAPI.getGroupDetails(groupId);
            if (groupResponse.success && groupResponse.data && groupResponse.data.group) {
              // getGroupDetails returns { data: { group: {...}, myInvites: [...], ... } }
              // So we need to access response.data.group, not response.data
              const group = groupResponse.data.group;
              // CRITICAL: Only set if it's a Sem 7 group
              if (group.semester === 7 || group.semester === '7') {
                setMajorProject1Group(group);
              } else {
                // Group is not Sem 7, don't set it
                console.warn('Project has group but it is not Sem 7:', group.semester);
                setMajorProject1Group(null);
              }
            }
          } catch (error) {
            console.error('Failed to load group details from project:', error);
            // If group loading fails but we have group data from getGroups, keep it
          }
        }
      }
      
      // Load Internship 1 project if exists (exclude cancelled projects)
      const internship1Response = await studentAPI.getProjects({ semester: 7, projectType: 'internship1' });
      if (internship1Response.success && internship1Response.data && internship1Response.data.length > 0) {
        // Filter out cancelled projects - only set active projects
        const activeProject = internship1Response.data.find(p => p.status !== 'cancelled');
        setInternship1Project(activeProject || null);
      } else {
        setInternship1Project(null);
      }
      
      // Load Internship 1 status
      const statusResponse = await studentAPI.checkInternship1Status();
      if (statusResponse.success) {
        setInternship1Status(statusResponse.data);
      }
      
    } catch (error) {
      console.error('Failed to load student Sem 7 data:', error);
    }
  };

  // Load internship applications
  const loadInternshipApplications = async () => {
    try {
      const response = await internshipAPI.getMyApplications();
      if (response.success) {
        setInternshipApplications(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load internship applications:', error);
    }
  };

  // Load group invitations for students
  const loadGroupInvitations = async () => {
    try {
      const response = await studentAPI.getGroupInvitations();
      setGroupInvitations(response.data || []);
    } catch (error) {
      console.error('Failed to load group invitations:', error);
      // Don't set empty array on error - might be a temporary issue
    }
  };

  // Student Actions
  const setSem7Choice = async (choice) => {
    try {
      const response = await sem7API.setChoice(choice);
      if (response.success) {
        setTrackChoice(response.data);
        // Don't show toast here - let the calling component handle it
        return response.data;
      }
    } catch (error) {
      // Don't show toast here - let the calling component handle it
      throw error;
    }
  };

  const createInternshipApplication = async (type, details, files) => {
    try {
      const response = await internshipAPI.createApplication(type, details, files);
      if (response.success) {
        await loadInternshipApplications();
        return response.data;
      }
    } catch (error) {
      toast.error(`Failed to submit application: ${error.message}`);
      throw error;
    }
  };

  const updateInternshipApplication = async (applicationId, details, files) => {
    // Refresh applications after update to get latest data
    try {
      const response = await internshipAPI.updateApplication(applicationId, details, files);
      if (response.success) {
        await loadInternshipApplications();
        return response.data;
      }
    } catch (error) {
      toast.error(`Failed to update application: ${error.message}`);
      throw error;
    }
  };

  const registerMajorProject1 = async (projectData) => {
    try {
      const response = await studentAPI.registerMajorProject1(projectData);
      if (response.success) {
        const project = response.data.project || response.data;
        setMajorProject1(project);
        
        // Always refresh all data after registration to ensure consistency
        // This ensures the group data is fully loaded with all fields (name, status, maxMembers, etc.)
        await loadStudentSem7Data();
        
        toast.success('Major Project 1 registered successfully!');
        return project;
      }
    } catch (error) {
      toast.error(`Project registration failed: ${error.message}`);
      throw error;
    }
  };

  const registerInternship1 = async (projectData) => {
    try {
      const response = await studentAPI.registerInternship1(projectData);
      if (response.success) {
        setInternship1Project(response.data);
        await loadStudentSem7Data(); // Refresh status
        toast.success('Internship 1 registered successfully!');
        return response.data;
      }
    } catch (error) {
      toast.error(`Internship 1 registration failed: ${error.message}`);
      throw error;
    }
  };

  // Group invitation actions
  const acceptGroupInvitation = async (invitationId) => {
    try {
      // First get the invitation to extract groupId
      const invitations = groupInvitations || [];
      const invitation = invitations.find(inv => inv._id === invitationId);
      
      if (!invitation) {
        throw new Error('Invitation not found');
      }
      
      await studentAPI.acceptGroupInvitation(invitation.group._id, invitationId);
      // Refresh data after accepting invitation
      // This will update isInGroup and clear invitations
      // IMPORTANT: Force a full refresh to ensure group data is loaded for new members
      await Promise.all([
        loadStudentSem7Data(), 
        loadGroupInvitations(),
        fetchSem7Data() // Force full context refresh
      ]);
      // Don't show toast here - let the calling component handle it
    } catch (error) {
      // Don't show toast here - let the calling component handle it
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
      // Refresh invitations after rejecting
      await loadGroupInvitations();
      // Don't show toast here - let the calling component handle it
    } catch (error) {
      // Don't show toast here - let the calling component handle it
      throw error;
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
        // Refresh group data when invitation is accepted
        loadStudentSem7Data();
      } else if (data.type === 'rejected') {
        toast.info('Invitation was rejected');
      }
    };

    // Handle group capacity updates
    const handleCapacityUpdate = (data) => {
      console.log('Group capacity update received:', data);
      // Refresh group data to show updated member count
      loadStudentSem7Data();
    };

    // Handle new member joined events (for members who just joined)
    const handleMemberJoined = (data) => {
      console.log('Member joined event received:', data);
      // Force full refresh to ensure new members see the group
      fetchSem7Data();
      loadStudentSem7Data();
    };

    // Handle group finalization events
    const handleGroupFinalized = (data) => {
      console.log('Group finalized event received:', data);
      // Refresh all data to reflect the finalization
      loadStudentSem7Data();
      loadGroupInvitations();
      
      // Show notification
      toast.success('Group has been finalized successfully!');
    };

    // Handle new invitation received
    const handleNewInvitation = (data) => {
      console.log('New invitation received:', data);
      // Refresh invitations to show the new one
      loadGroupInvitations();
      toast.success(`You received a new group invitation from ${data.inviterName}`);
    };

    // Subscribe to WebSocket events
    subscribe('invitation_update', handleInvitationUpdate);
    subscribe('group_capacity_update', handleCapacityUpdate);
    subscribe('group_finalized', handleGroupFinalized);
    subscribe('group_invitation', handleNewInvitation);
    subscribe('member_joined', handleMemberJoined);
    subscribe('invitation_accepted', handleMemberJoined); // Also handle invitation_accepted for members who just joined

    // Cleanup on unmount
    return () => {
      unsubscribe('invitation_update', handleInvitationUpdate);
      unsubscribe('group_capacity_update', handleCapacityUpdate);
      unsubscribe('group_finalized', handleGroupFinalized);
      unsubscribe('group_invitation', handleNewInvitation);
      unsubscribe('member_joined', handleMemberJoined);
      unsubscribe('invitation_accepted', handleMemberJoined);
    };
  }, [userRole, subscribe, unsubscribe, groupInvitations]);

  // Initialize data on mount
  useEffect(() => {
    fetchSem7Data();
  }, [fetchSem7Data]);

  const value = {
    // State
    trackChoice,
    internshipApplications,
    majorProject1,
    majorProject1Group,
    internship1Project,
    internship1Status,
    facultyPreferences,
    groupInvitations,
    loading,
    error,

    // Actions
    setSem7Choice,
    createInternshipApplication,
    updateInternshipApplication,
    registerMajorProject1,
    registerInternship1,
    acceptGroupInvitation,
    rejectGroupInvitation,
    
    // Utility
    fetchSem7Data,
    loadInternshipApplications,
    loadGroupInvitations,
  };

  return <Sem7Context.Provider value={value}>{children}</Sem7Context.Provider>;
};

