import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { studentAPI, sem8API, internshipAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { toast } from 'react-hot-toast';

const Sem8Context = createContext();

export const useSem8 = () => useContext(Sem8Context);

export const Sem8Provider = ({ children }) => {
  const { user, userRole, roleData } = useAuth();
  const { subscribe, unsubscribe } = useWebSocket();
  
  // Sem 8 State
  const [sem8Status, setSem8Status] = useState(null); // Contains studentType, selection, etc.
  const [trackChoice, setTrackChoice] = useState(null);
  const [internshipApplications, setInternshipApplications] = useState([]);
  const [majorProject2, setMajorProject2] = useState(null);
  const [majorProject2Group, setMajorProject2Group] = useState(null);
  const [internship2Project, setInternship2Project] = useState(null);
  const [internship2Status, setInternship2Status] = useState(null);
  const [facultyPreferences, setFacultyPreferences] = useState([]);
  const [groupInvitations, setGroupInvitations] = useState([]);
  
  // Loading States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Sem 8 data based on user role
  const fetchSem8Data = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      if (userRole === 'student') {
        // Only load Sem 8 data for Sem 8 students
        const userSemester = user.semester || roleData?.semester;
        const currentSemester = userSemester || 4;
        
        if (currentSemester === 8) {
          // Load Sem 8 status first to determine student type
          await loadStudentSem8Data();
          // Then load other data (group invitations depend on student type)
          await Promise.all([
            loadInternshipApplications(),
            loadGroupInvitations()
          ]);
        } else {
          // Not Sem 8 student - skip loading
          setLoading(false);
          return;
        }
      } else if (userRole === 'admin') {
        // Admin doesn't need Sem 8 context data loaded here
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Failed to fetch Sem 8 data:', err);
      setError(err);
      // Don't show toast for initial load failures
    } finally {
      setLoading(false);
    }
  }, [user, userRole, roleData]);

  // Student-specific data loading
  const loadStudentSem8Data = async () => {
    try {
      // Load Sem 8 status (includes student type and auto-initializes Type 1)
      const statusResponse = await sem8API.getStatus();
      if (statusResponse.success) {
        setSem8Status(statusResponse.data);
        setTrackChoice(statusResponse.data.selection);
      }
      
      // Load Sem 8 group (for Major Project 2 - Type 1 only) - load independently of project
      try {
        const groupsResponse = await studentAPI.getGroups({ semester: 8 });
        if (groupsResponse.success && groupsResponse.data && groupsResponse.data.length > 0) {
          // CRITICAL: Filter to ensure only Sem 8 groups are set
          // This prevents Sem 6 groups from being incorrectly set
          const sem8Groups = groupsResponse.data.filter(group => 
            group.semester === 8 || group.semester === '8'
          );
          if (sem8Groups.length > 0) {
            setMajorProject2Group(sem8Groups[0]);
          } else {
            setMajorProject2Group(null);
          }
        } else {
          setMajorProject2Group(null);
        }
      } catch (error) {
        console.error('Failed to load Sem 8 group:', error);
        setMajorProject2Group(null);
      }
      
      // Load Major Project 2 if exists
      const projectsResponse = await studentAPI.getProjects({ semester: 8, projectType: 'major2' });
      if (projectsResponse.success && projectsResponse.data && projectsResponse.data.length > 0) {
        setMajorProject2(projectsResponse.data[0]);
        
        // Always load group if project has group reference
        if (projectsResponse.data[0].group) {
          try {
            const groupId = projectsResponse.data[0].group._id || projectsResponse.data[0].group;
            const groupResponse = await studentAPI.getGroupDetails(groupId);
            if (groupResponse.success && groupResponse.data && groupResponse.data.group) {
              // CRITICAL: Filter to ensure only Sem 8 groups are set
              // This prevents Sem 6/7 groups from being loaded for Sem 8 students
              const group = groupResponse.data.group;
              if (group.semester === 8 || group.semester === '8') {
                setMajorProject2Group(group);
              } else {
                console.warn(`Ignoring non-Sem 8 group loaded from project: semester ${group.semester}`);
                setMajorProject2Group(null);
              }
            }
          } catch (error) {
            console.error('Failed to load group details from project:', error);
          }
        }
      }
      
      // Load Internship 2 project if exists (exclude cancelled projects)
      const internship2Response = await studentAPI.getProjects({ semester: 8, projectType: 'internship2' });
      if (internship2Response.success && internship2Response.data && internship2Response.data.length > 0) {
        // Filter out cancelled projects - only set active projects
        const activeProject = internship2Response.data.find(p => p.status !== 'cancelled');
        setInternship2Project(activeProject || null);
      } else {
        setInternship2Project(null);
      }
      
      // Load Internship 2 status
      const statusResponse2 = await studentAPI.checkInternship2Status();
      if (statusResponse2.success) {
        setInternship2Status(statusResponse2.data);
      }
      
    } catch (error) {
      console.error('Failed to load student Sem 8 data:', error);
    }
  };

  // Load internship applications
  const loadInternshipApplications = async () => {
    try {
      const response = await internshipAPI.getMyApplications();
      if (response.success) {
        // Filter for semester 8 applications
        const sem8Apps = (response.data || []).filter(app => app.semester === 8);
        setInternshipApplications(sem8Apps);
      }
    } catch (error) {
      console.error('Failed to load internship applications:', error);
    }
  };

  // Load group invitations for students (only for Type 1 students in Sem 8)
  const loadGroupInvitations = async () => {
    try {
      // Only load invitations for Type 1 students (they need groups for Major Project 2)
      if (sem8Status?.studentType !== 'type1') {
        setGroupInvitations([]);
        return;
      }
      
      const response = await studentAPI.getGroupInvitations();
      // Filter for semester 8 invitations
      const sem8Invites = (response.data || []).filter(inv => {
        return inv.group && inv.group.semester === 8;
      });
      setGroupInvitations(sem8Invites);
    } catch (error) {
      // If error is about semester not supported, that's expected for Type 2 students
      if (error.message && error.message.includes('only available for semester')) {
        setGroupInvitations([]);
        return;
      }
      console.error('Failed to load group invitations:', error);
      // Don't set empty array on error - might be a temporary issue
    }
  };

  // Student Actions
  const setSem8Choice = async (choice) => {
    try {
      const response = await sem8API.setChoice(choice);
      if (response.success) {
        setTrackChoice(response.data);
        // Refresh status to get updated data
        await loadStudentSem8Data();
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
        // Refresh all Sem 8 data to ensure Internship 2 status is updated
        await loadStudentSem8Data();
        return response.data;
      }
    } catch (error) {
      toast.error(`Failed to submit application: ${error.message}`);
      throw error;
    }
  };

  const updateInternshipApplication = async (applicationId, details, files) => {
    try {
      const response = await internshipAPI.updateApplication(applicationId, details, files);
      if (response.success) {
        await loadInternshipApplications();
        // Refresh all Sem 8 data to ensure Internship 2 status is updated
        await loadStudentSem8Data();
        return response.data;
      }
    } catch (error) {
      toast.error(`Failed to update application: ${error.message}`);
      throw error;
    }
  };

  const registerMajorProject2 = async (projectData) => {
    try {
      const response = await studentAPI.registerMajorProject2(projectData);
      if (response.success) {
        const project = response.data.project || response.data;
        setMajorProject2(project);
        
        // Always refresh all data after registration to ensure consistency
        await loadStudentSem8Data();
        
        toast.success('Major Project 2 registered successfully!');
        return project;
      }
    } catch (error) {
      toast.error(`Project registration failed: ${error.message}`);
      throw error;
    }
  };

  const registerInternship2 = async (projectData) => {
    try {
      const response = await studentAPI.registerInternship2(projectData);
      if (response.success) {
        // Extract project from response (backend returns { project, facultyPreference, allocationStatus })
        const project = response.data.project || response.data;
        setInternship2Project(project);
        
        // Always refresh all data after registration to ensure consistency
        await loadStudentSem8Data();
        
        toast.success('Internship 2 registered successfully!');
        return project;
      }
    } catch (error) {
      toast.error(`Internship 2 registration failed: ${error.message}`);
      throw error;
    }
  };

  // Group invitation actions
  const acceptGroupInvitation = async (invitationId) => {
    try {
      const invitations = groupInvitations || [];
      const invitation = invitations.find(inv => inv._id === invitationId);
      
      if (!invitation) {
        throw new Error('Invitation not found');
      }
      
      await studentAPI.acceptGroupInvitation(invitation.group._id, invitationId);
      await Promise.all([loadStudentSem8Data(), loadGroupInvitations()]);
    } catch (error) {
      throw error;
    }
  };

  const rejectGroupInvitation = async (invitationId) => {
    try {
      const invitations = groupInvitations || [];
      const invitation = invitations.find(inv => inv._id === invitationId);
      
      if (!invitation) {
        throw new Error('Invitation not found');
      }
      
      await studentAPI.rejectGroupInvitation(invitation.group._id, invitationId);
      await loadGroupInvitations();
    } catch (error) {
      throw error;
    }
  };

  // WebSocket event handlers for real-time updates
  useEffect(() => {
    if (userRole !== 'student') return;

    // Handle invitation updates
    const handleInvitationUpdate = (data) => {
      console.log('Invitation update received:', data);
      loadGroupInvitations();
      
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
        loadStudentSem8Data();
      } else if (data.type === 'rejected') {
        toast.info('Invitation was rejected');
      }
    };

    // Handle group capacity updates
    const handleCapacityUpdate = (data) => {
      console.log('Group capacity update received:', data);
      loadStudentSem8Data();
    };

    // Handle group finalization events
    const handleGroupFinalized = (data) => {
      console.log('Group finalized event received:', data);
      loadStudentSem8Data();
      loadGroupInvitations();
      toast.success('Group has been finalized successfully!');
    };

    // Handle new invitation received
    const handleNewInvitation = (data) => {
      console.log('New invitation received:', data);
      loadGroupInvitations();
      toast.success(`You received a new group invitation from ${data.inviterName}`);
    };

    // Subscribe to WebSocket events
    subscribe('invitation_update', handleInvitationUpdate);
    subscribe('group_capacity_update', handleCapacityUpdate);
    subscribe('group_finalized', handleGroupFinalized);
    subscribe('group_invitation', handleNewInvitation);

    // Cleanup on unmount
    return () => {
      unsubscribe('invitation_update', handleInvitationUpdate);
      unsubscribe('group_capacity_update', handleCapacityUpdate);
      unsubscribe('group_finalized', handleGroupFinalized);
      unsubscribe('group_invitation', handleNewInvitation);
    };
  }, [userRole, subscribe, unsubscribe, groupInvitations]);

  // Initialize data on mount
  useEffect(() => {
    fetchSem8Data();
  }, [fetchSem8Data]);

  const value = {
    // State
    sem8Status,
    trackChoice,
    internshipApplications,
    majorProject2,
    majorProject2Group,
    internship2Project,
    internship2Status,
    facultyPreferences,
    groupInvitations,
    loading,
    error,

    // Actions
    setSem8Choice,
    createInternshipApplication,
    updateInternshipApplication,
    registerMajorProject2,
    registerInternship2,
    acceptGroupInvitation,
    rejectGroupInvitation,
    
    // Utility
    fetchSem8Data,
    loadInternshipApplications,
    loadGroupInvitations,
  };

  return <Sem8Context.Provider value={value}>{children}</Sem8Context.Provider>;
};

