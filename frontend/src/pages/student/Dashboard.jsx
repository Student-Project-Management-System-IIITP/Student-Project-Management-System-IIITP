import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSem4Project } from '../../hooks/useSem4Project';
import { useSem5Project } from '../../hooks/useSem5Project';
import { useSem7Project } from '../../hooks/useSem7Project';
import { useMTechSem3Track } from '../../hooks/useMTechSem3Track';
import { useSem8Project } from '../../hooks/useSem8Project';
import { useSem8 } from '../../context/Sem8Context';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useEvaluation } from '../../hooks/useEvaluation';
import { studentAPI, internshipAPI } from '../../utils/api';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import SemesterHeader from '../../components/common/SemesterHeader';
import StatusBadge from '../../components/common/StatusBadge';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, roleData, isLoading: authLoading } = useAuth();
  const [mtechProject, setMtechProject] = useState(null);
  const [mtechLoading, setMtechLoading] = useState(false);
  const [mtechSem2Project, setMtechSem2Project] = useState(null);
  const [showSem3Welcome, setShowSem3Welcome] = useState(false);
  const [sem3InternshipApp, setSem3InternshipApp] = useState(null);
  const [sem3AppLoading, setSem3AppLoading] = useState(false);
  
  const { trackChoice: sem3TrackChoice, loading: sem3ChoiceLoading } = useMTechSem3Track();
  const sem3SelectedTrack = sem3TrackChoice?.finalizedTrack || sem3TrackChoice?.chosenTrack || null;

  // Sem 4 hooks
  const { project: sem4Project, loading: sem4ProjectLoading, canRegisterProject: canRegisterSem4, canUploadPPT, getProjectTimeline } = useSem4Project();
  const { evaluationSchedule, canUploadPPT: canUploadForEvaluation } = useEvaluation();
  
  // Project status state
  const [projectStatus, setProjectStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  
  // Previous projects state
  const [previousProjects, setPreviousProjects] = useState([]);
  const [previousProjectsLoading, setPreviousProjectsLoading] = useState(false);
  
  // Sem 6 state
  const [sem6Project, setSem6Project] = useState(null);
  const [sem6ProjectLoading, setSem6ProjectLoading] = useState(false);
  const [sem6Group, setSem6Group] = useState(null);
  
  // Invitation handling state
  const [invitationLoading, setInvitationLoading] = useState({});
  
  // Group size limits from admin config (for Sem 5)
  const [minGroupMembers, setMinGroupMembers] = useState(4); // Default fallback
  const [maxGroupMembers, setMaxGroupMembers] = useState(5); // Default fallback
  
  // Sem 5 hooks
  const { sem5Project, loading: sem5ProjectLoading, canRegisterProject: canRegisterSem5, getProgressSteps, hasFacultyAllocated } = useSem5Project();
  const { sem5Group, canCreateGroup, isInGroup, isGroupLeader, getGroupStats, getPendingInvitationsCount, groupInvitations, acceptGroupInvitation, rejectGroupInvitation, fetchSem5Data } = useGroupManagement();
  
  // Sem 7 hooks
  const { 
    trackChoice, 
    finalizedTrack, 
    trackChoiceStatus,
    canChooseTrack,
    canRegisterMajorProject1,
    canRegisterInternship1,
    hasApprovedSixMonthInternship,
    hasApprovedSummerInternship,
    majorProject1,
    majorProject1Group,
    internship1Project,
    getInternshipApplication,
    getNextStep,
    getProgressSteps: getSem7ProgressSteps,
    loading: sem7Loading,
    fetchSem7Data
  } = useSem7Project();

  // Sem 8 hooks
  const { 
    trackChoice: sem8TrackChoice, 
    finalizedTrack: sem8FinalizedTrack, 
    trackChoiceStatus: sem8TrackChoiceStatus,
    canChooseTrack: sem8CanChooseTrack,
    canRegisterMajorProject2,
    canRegisterInternship2,
    hasApprovedSixMonthInternship: sem8HasApprovedSixMonthInternship,
    hasApprovedSummerInternship: sem8HasApprovedSummerInternship,
    majorProject2,
    majorProject2Group,
    internship2Project,
    internship2Status,
    getInternshipApplication: sem8GetInternshipApplication,
    getNextStep: sem8GetNextStep,
    getProgressSteps: getSem8ProgressSteps,
    studentType,
    isType1,
    isType2,
    loading: sem8Loading,
    fetchSem8Data
  } = useSem8Project();
  
  // Get Sem 8 group invitations from Sem8Context
  const sem8Context = useSem8();
  const sem8GroupInvitations = sem8Context?.groupInvitations || [];

  // Determine selected track (finalized takes precedence, else chosen)
  const selectedTrack = finalizedTrack || (trackChoice?.chosenTrack);

  // Refresh Sem7 data when dashboard mounts (useful after form submissions)
  useEffect(() => {
    const currentSemester = roleData?.semester || user?.semester;
    if (currentSemester === 7 && fetchSem7Data) {
      fetchSem7Data();
    }
  }, [user, roleData, fetchSem7Data]);

  // Refresh Sem8 data when dashboard mounts (useful after form submissions)
  useEffect(() => {
    const currentSemester = roleData?.semester || user?.semester;
    if (currentSemester === 8 && fetchSem8Data) {
      fetchSem8Data();
    }
  }, [user, roleData, fetchSem8Data]);

  // Load group size limits from admin config (for Sem 5)
  useEffect(() => {
    const loadGroupConfig = async () => {
      const currentSemester = roleData?.semester || user?.semester;
      // Only load config for Sem 5 students
      if (currentSemester !== 5) return;
      
      try {
        // Fetch min and max group members from config
        const [minResponse, maxResponse] = await Promise.all([
          studentAPI.getSystemConfig('sem5.minGroupMembers'),
          studentAPI.getSystemConfig('sem5.maxGroupMembers')
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
  }, [user, roleData]);

  // Show loading screen if authentication is loading or no user data yet
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  const currentSemester = roleData?.semester || user?.semester;
  const degree = roleData?.degree || user?.degree;

  // Show welcome back prompt for newly promoted M.Tech Sem 3 students
  useEffect(() => {
    if (sem3ChoiceLoading) return;
    if (degree === 'M.Tech' && currentSemester === 3) {
      setShowSem3Welcome(!sem3TrackChoice);
    } else {
      setShowSem3Welcome(false);
    }
  }, [sem3ChoiceLoading, sem3TrackChoice, degree, currentSemester]);

  const handleSem3WelcomeChoice = (preselect) => {
    setShowSem3Welcome(false);
    navigate('/student/mtech/sem3/track-selection', { state: { preselect } });
  };

  // Load project status for PPT display
  const loadProjectStatus = async () => {
    if (!sem4Project?._id || statusLoading) return;
    
    setStatusLoading(true);
    try {
      const response = await studentAPI.getSem4Status(sem4Project._id);
      setProjectStatus(response.data);
    } catch (error) {
      console.error('Error loading project status:', error);
      setProjectStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };
  
  // Load status when project loads
  useEffect(() => {
    const loadStatusAsync = async () => {
      if (sem4Project?._id && !statusLoading) {
        await loadProjectStatus();
      }
    };
    
    loadStatusAsync();
  }, [sem4Project?._id]); // Only depend on project ID changes

  // Load previous semester projects
  const loadPreviousProjects = async () => {
    try {
      setPreviousProjectsLoading(true);
      const currentSemester = (roleData?.semester || user?.semester) || 4;
      
      // Only load previous projects if student is in semester 5 or higher
      if (currentSemester > 4) {
        // Get all previous semester projects
        const previousSemesters = Array.from({length: currentSemester - 4}, (_, i) => i + 4);
        const previousProjectsData = [];
        
        // Get all projects across all semesters
        try {
          const response = await studentAPI.getProjects({ allSemesters: true });
          
          if (response.success && response.data) {
            // Filter projects by previous semesters
            const filtered = response.data.filter(p => previousSemesters.includes(p.semester));
            previousProjectsData.push(...filtered);
          }
        } catch (err) {
          console.error('Error loading previous projects:', err);
        }
        
        setPreviousProjects(previousProjectsData);
      }
    } catch (error) {
      console.error('Error in loadPreviousProjects:', error);
      setPreviousProjects([]);
    } finally {
      setPreviousProjectsLoading(false);
    }
  };

  // Load previous projects when student loads
  useEffect(() => {
    if (roleData || user) {
      loadPreviousProjects();
    }
  }, [roleData, user]);

  // M.Tech Sem 1: Load current project
  useEffect(() => {
    if (degree === 'M.Tech') {
      const loadMtechProjects = async () => {
        try {
          setMtechLoading(true);
          const resp = await studentAPI.getProjects({ allSemesters: true });
          const projects = resp?.data || [];
          const sem1 = projects.find(pr => pr.semester === 1 && pr.projectType === 'minor1');
          const sem2 = projects.find(pr => pr.semester === 2 && pr.projectType === 'minor2');
          setMtechProject(sem1 || null);
          setMtechSem2Project(sem2 || null);
        } catch (e) {
          setMtechProject(null);
          setMtechSem2Project(null);
        } finally {
          setMtechLoading(false);
        }
      };
      loadMtechProjects();
    } else {
      setMtechProject(null);
      setMtechSem2Project(null);
    }
  }, [roleData, user]);

  // Load Sem 6 project
  useEffect(() => {
    if (currentSemester === 6) {
      loadSem6Project();
    }
  }, [roleData, user]);

  // Load Sem 3 internship application (M.Tech)
  useEffect(() => {
    const loadSem3Application = async () => {
      if (degree !== 'M.Tech' || currentSemester !== 3) {
        setSem3InternshipApp(null);
        return;
      }
      if (sem3SelectedTrack !== 'internship' || showSem3Welcome) {
        setSem3InternshipApp(null);
        return;
      }
      try {
        setSem3AppLoading(true);
        const response = await internshipAPI.getMyApplications();
        const apps = response?.data || [];
        const latest = apps
          .filter(app => app.semester === 3 && app.type === '6month')
          .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
        setSem3InternshipApp(latest || null);
      } catch (error) {
        console.error('Failed to load Sem 3 internship application:', error);
        setSem3InternshipApp(null);
      } finally {
        setSem3AppLoading(false);
      }
    };

    loadSem3Application();
  }, [degree, currentSemester, sem3SelectedTrack, showSem3Welcome]);

  const loadSem6Project = async () => {
    try {
      setSem6ProjectLoading(true);
      
      // Get all projects to find Sem 6 project
      const response = await studentAPI.getProjects({ allSemesters: true });
      
      if (response.success && response.data) {
        const sem6ProjectData = response.data.find(
          p => p.semester === 6 && p.projectType === 'minor3'
        );
        setSem6Project(sem6ProjectData || null);
        
        // Load Sem 6 group
        if (sem6ProjectData?.group) {
          // Get all groups (not filtered by semester)
          const groupsResponse = await studentAPI.getGroups({ allSemesters: true });
          
          if (groupsResponse.success && groupsResponse.data) {
            // The group field might be an ObjectId string or a populated object
            const groupId = typeof sem6ProjectData.group === 'string' 
              ? sem6ProjectData.group 
              : sem6ProjectData.group._id;
            
            const sem6GroupData = groupsResponse.data.find(
              g => g._id === groupId || g._id.toString() === groupId.toString()
            );
            
            setSem6Group(sem6GroupData || null);
          }
        } else {
          // If no Sem 6 project registered yet, check for Sem 5 group
          const groupsResponse = await studentAPI.getGroups({ allSemesters: true });
          if (groupsResponse.success && groupsResponse.data) {
            const sem5GroupData = groupsResponse.data.find(g => g.semester === 5);
            if (sem5GroupData) {
              // Store Sem 5 group info so we can display it
              setSem6Group(sem5GroupData);
            } else {
              // No Sem 5 group found - student cannot proceed with Sem 6 registration
              setSem6Group(null);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading Sem 6 project:', error);
    } finally {
      setSem6ProjectLoading(false);
    }
  };

  // Handle invitation response (works for Sem 5, Sem 7, and Sem 8)
  const handleInvitationResponse = async (invitationId, accept = true, isSem8Student = false) => {
    try {
      setInvitationLoading(prev => ({ ...prev, [invitationId]: true }));
      
      const currentSemester = (roleData?.semester || user?.semester) || 4;
      
      if (accept) {
        if (isSem8Student && sem8Context?.acceptGroupInvitation) {
          // Use Sem 8 context method for Sem 8 students
          await sem8Context.acceptGroupInvitation(invitationId);
        } else {
          // Use group management method for Sem 5 and Sem 7
        await acceptGroupInvitation(invitationId);
        }
        toast.success('Invitation accepted successfully!');
        // Refresh group data after accepting invitation
        // This ensures isInGroup updates correctly and invitations are refreshed
        if (currentSemester === 5 || currentSemester === 7) {
          // fetchSem5Data from useGroupManagement works for both Sem 5 and Sem 7
          // It internally calls the correct context's fetch function
          await fetchSem5Data();
        } else if (currentSemester === 8) {
          // Refresh Sem 8 data
          if (fetchSem8Data) {
            await fetchSem8Data();
          }
        }
      } else {
        if (isSem8Student && sem8Context?.rejectGroupInvitation) {
          // Use Sem 8 context method for Sem 8 students
          await sem8Context.rejectGroupInvitation(invitationId);
        } else {
          // Use group management method for Sem 5 and Sem 7
        await rejectGroupInvitation(invitationId);
        }
        toast.success('Invitation rejected');
        // Refresh invitations after rejecting
        // fetchSem5Data will refresh invitations for both Sem 5 and Sem 7
        if (currentSemester === 5 || currentSemester === 7) {
          await fetchSem5Data();
        } else if (currentSemester === 8) {
          // Refresh Sem 8 data
          if (fetchSem8Data) {
            await fetchSem8Data();
          }
        }
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error(error.message || 'Failed to respond to invitation');
    } finally {
      setInvitationLoading(prev => ({ ...prev, [invitationId]: false }));
    }
  };
  

  // Get quick actions based on semester (B.Tech only currently)
  const getQuickActions = () => {
      const actions = [];
      const degree = (roleData?.degree || user?.degree) || 'B.Tech';
      const currentSemester = (roleData?.semester || user?.semester) || 4;

    // B.Tech flows
    if (degree === 'B.Tech') {
      if (currentSemester === 4) {
        if (!sem4Project && canRegisterSem4()) {
          actions.push({
            title: 'Register for Minor Project 1',
            description: 'Register your Minor Project 1',
            icon: '📝',
            link: '/student/projects/register',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        }
      }
    }

    // M.Tech Sem 1 registration
    if (degree === 'M.Tech' && currentSemester === 1) {
      actions.push({
        title: 'Register for Minor Project 1',
        description: 'Register your Minor Project 1',
        icon: '📝',
        link: '/student/mtech/sem1/register',
        color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
        textColor: 'text-blue-800',
      });
    }

    if (degree === 'M.Tech' && currentSemester === 2) {
      if (!mtechSem2Project) {
        actions.push({
          title: 'Register for Minor Project 2',
          description: 'Continue or start a new project for Semester 2',
          icon: '📝',
          link: '/student/mtech/sem2/register',
          color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
          textColor: 'text-blue-800',
        });
      } else {
        actions.push({
          title: 'View Minor Project 2',
          description: mtechSem2Project.isContinuation
            ? 'View your continued Semester 2 project'
            : 'View your Semester 2 project details',
          icon: '👁️',
          link: `/projects/${mtechSem2Project._id}`,
          color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
          textColor: 'text-purple-800',
        });
      }
    }

    if (currentSemester === 4) {
      // Sem 4 actions
      // Note: B.Tech Sem 4 registration is handled in the B.Tech flows section above
      if (!sem4Project && canRegisterSem4() && degree !== 'B.Tech') {
        actions.push({
          title: 'Register for Minor Project 1',
          description: 'Register your Minor Project 1',
          icon: '📝',
          link: '/student/projects/register',
          color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
          textColor: 'text-blue-800',
        });
      }

      // Removed Upload PPT quick action - now integrated into project dashboard

      if (sem4Project && (sem4Project.status === 'registered' || sem4Project.status === 'active')) {
        actions.push({
          title: 'View Project',
          description: 'View your project details',
          icon: '👁️',
          link: `/student/projects/sem4/${sem4Project._id}`,
          color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
          textColor: 'text-purple-800',
        });
      }
    } else if (currentSemester === 5) {
      // Sem 5 actions - NEW WORKFLOW: Progressive disclosure based on group status
      
      if (!isInGroup && !sem5Group) {
        // No group exists - show create group action
        actions.push({
          title: 'Create Group',
          description: 'Form a group for your project (Required first step)',
          icon: '👥',
          link: '/student/groups/create',
          color: 'bg-green-50 border-green-200 hover:bg-green-100',
          textColor: 'text-green-800',
        });
      } else if (sem5Group) {
        // Group exists - show actions based on group status
        const groupStatus = sem5Group.status;
        const groupStats = getGroupStats && getGroupStats();
        const memberCount = groupStats ? groupStats.memberCount : 0;
        
        if (groupStatus === 'finalized') {
          // Group finalized - show register project (only for group leader)
          if (!sem5Project && canRegisterSem5) {
            if (isGroupLeader) {
              actions.push({
                title: 'Register Minor Project 2',
                description: 'Register project details (Group finalized)',
                icon: '📝',
                link: '/student/sem5/register',
                color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
                textColor: 'text-blue-800',
              });
            } else {
              actions.push({
                title: 'Register Minor Project 2',
                description: 'Only group leader can register project details',
                icon: '📝',
                link: '#',
                color: 'bg-gray-50 border-gray-200',
                textColor: 'text-gray-500',
                disabled: true,
              });
            }
          }
        }
        
        // Always show group dashboard for group management
        actions.push({
          title: 'Group Dashboard',
          description: 'Manage your project group',
          icon: '👥',
          link: `/student/groups/${sem5Group._id}/dashboard`,
          color: 'bg-green-50 border-green-200 hover:bg-green-100',
          textColor: 'text-green-800',
        });
      }

      // Additional actions if applicable
      // Note: Group Invitations removed from quick actions as it's handled in the dedicated section below


      // Fallback: Ensure Sem 5 students ALWAYS get Create Group if no actions exist
      if (actions.length === 0 && currentSemester === 5) {
        actions.push({
          title: 'Create Group',
          description: 'Form a group for your project (Required first step)',
          icon: '👥', 
          link: '/student/groups/create',
          color: 'bg-green-50 border-green-200 hover:bg-green-100',
          textColor: 'text-green-800',
        });
      }
    } else if (currentSemester === 6) {
      // Sem 6 actions
      if (!sem6Project) {
        // Only show register option if student has a Sem 5 group (carried forward)
        if (sem6Group && !sem6ProjectLoading) {
          actions.push({
            title: 'Register Minor Project 3',
            description: 'Register your Minor Project 3 (continue or new)',
            icon: '📝',
            link: '/student/sem6/register',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else if (!sem6ProjectLoading && !sem6Group) {
          // Student has no group - show warning (no link needed, handled in group status card)
          actions.push({
            title: '⚠️ No Group Found',
            description: 'Contact admin to be added to a group',
            icon: '⚠️',
            link: null,
            color: 'bg-orange-50 border-orange-200',
            textColor: 'text-orange-800',
          });
        }
      } else {
        // Project registered - show project dashboard
        actions.push({
          title: 'View Project',
          description: sem6Project.isContinuation 
            ? 'View your continued Minor Project 3'
            : 'View your Minor Project 3',
          icon: '👁️',
          link: `/projects/${sem6Project._id}`,
          color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
          textColor: 'text-purple-800',
        });
      }

      // Show group dashboard if group exists
      if (sem6Group) {
        actions.push({
          title: 'Group Dashboard',
          description: 'Manage your project group',
          icon: '👥',
          link: `/student/groups/${sem6Group._id}/dashboard`,
          color: 'bg-green-50 border-green-200 hover:bg-green-100',
          textColor: 'text-green-800',
        });
      }
    } else if (currentSemester === 7) {
      // Sem 7 actions
      const nextStep = getNextStep();
      
      // Track selection - only show if no choice submitted or needs_info
      if (!finalizedTrack) {
        if (!trackChoice || !trackChoice.chosenTrack) {
          // No choice submitted yet
          if ((typeof canChooseTrack === 'function' ? canChooseTrack() : canChooseTrack)) {
            actions.push({
              title: 'Choose Track',
              description: 'Select internship or coursework track',
              icon: '🎯',
              link: '/student/sem7/track-selection',
              color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
              textColor: 'text-blue-800',
            });
          }
        } else if (trackChoice.verificationStatus === 'needs_info') {
          // Choice submitted but needs info
          actions.push({
            title: 'Update Track Choice',
            description: 'Provide additional information',
            icon: '📝',
            link: '/student/sem7/track-selection',
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        }
        // If choice is submitted and pending, don't show any track selection action
      }
      
      // Determine selected track (finalized takes precedence, else chosen)
      const selectedTrack = finalizedTrack || (trackChoice && trackChoice.chosenTrack);

      // Internship track actions
      if (selectedTrack === 'internship') {
        const sixMonthApp = getInternshipApplication('6month');
        if (!sixMonthApp) {
          actions.push({
            title: 'Submit 6-Month Internship Application',
            description: 'Submit company details and offer letter',
            icon: '📄',
            link: '/student/sem7/internship/apply/6month',
            color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
            textColor: 'text-purple-800',
          });
        } else if (sixMonthApp.status === 'needs_info') {
          actions.push({
            title: 'Update Internship Application',
            description: 'Provide additional information',
            icon: '📝',
            link: `/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        } else if (sixMonthApp.status === 'pending') {
          actions.push({
            title: 'View Application Status',
            description: 'Application submitted, awaiting admin review',
            icon: '⏳',
            link: `/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else if (sixMonthApp.status === 'approved') {
          actions.push({
            title: 'Application Approved',
            description: 'Your internship application has been approved',
            icon: '✅',
            link: `/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-green-50 border-green-200 hover:bg-green-100',
            textColor: 'text-green-800',
          });
        }
      }
      
      // Coursework track actions - dynamic action buttons based on status
      if (selectedTrack === 'coursework') {
        // Major Project 1 Actions
        if (majorProject1) {
          actions.push({
            title: 'View Major Project 1',
            description: 'View your registered project details',
            icon: '📋',
            link: '/student/sem7/major1/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else if (majorProject1Group?.status === 'finalized') {
          actions.push({
            title: 'Register Major Project 1',
            description: 'Group finalized - register your project now',
            icon: '✅',
            link: '/student/sem7/major1/dashboard',
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        } else if (majorProject1Group) {
          actions.push({
            title: 'Finalize Group',
            description: 'Finalize your group to register Major Project 1',
            icon: '👥',
            link: '/student/sem7/major1/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else {
          actions.push({
            title: 'Create Group',
            description: 'Create a group for Major Project 1',
            icon: '➕',
            link: '/student/sem7/major1/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        }

        // Internship 1 Actions
        const summerApp = getInternshipApplication('summer');
        if (hasApprovedSummerInternship) {
          actions.push({
            title: 'Internship 1 Approved',
            description: 'View your approved internship status',
            icon: '✅',
            link: '/student/sem7/internship1/dashboard',
            color: 'bg-green-50 border-green-200 hover:bg-green-100',
            textColor: 'text-green-800',
          });
        } else if (summerApp && summerApp.status === 'submitted') {
          // Check if application has placeholder values
          // Only show urgent notification if:
          // 1. Application was assigned/changed by admin (has adminRemarks indicating assignment OR track change)
          // 2. AND still has placeholder/incomplete values
          // Once student fills in required fields, this should become false
          const wasAssignedOrChangedByAdmin = summerApp.adminRemarks === 'Assigned by admin' || 
            (summerApp.adminRemarks && (
              summerApp.adminRemarks.includes('Assigned by admin') ||
              summerApp.adminRemarks.includes('Switched from Internship-I under Institute Faculty')
            )) ||
            summerApp.internship1TrackChangedByAdminAt; // Track change indicator
          
          const hasPlaceholderValues = wasAssignedOrChangedByAdmin && (
            // Check for placeholder company name
            !summerApp.details?.companyName || 
            summerApp.details?.companyName === 'To be provided by student' ||
            summerApp.details?.companyName === 'N/A - Assigned to Internship 1 Project' ||
            // Check for placeholder dates (same start and end date)
            (summerApp.details?.startDate && summerApp.details?.endDate && 
             new Date(summerApp.details.startDate).getTime() === new Date(summerApp.details.endDate).getTime()) ||
            // Check for missing required fields
            !summerApp.details?.completionCertificateLink ||
            !summerApp.details?.roleOrNatureOfWork
          );
          
          if (hasPlaceholderValues) {
            // URGENT: Application has placeholder values - needs immediate attention
            actions.push({
              title: '⚠️ URGENT: Complete Application',
              description: 'Application has placeholder values - fill in all details immediately',
              icon: '🚨',
              link: `/student/sem7/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-red-50 border-red-300 hover:bg-red-100',
              textColor: 'text-red-800',
            });
          } else if (summerApp.adminRemarks === 'Assigned by admin') {
            // Fresh assignment by admin to summer internship application track
            actions.push({
              title: 'Submit Summer Internship Application',
              description: 'Assigned by admin - submit your summer internship details',
              icon: '📝',
              link: `/student/sem7/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
              textColor: 'text-blue-800',
            });
          } else {
            // Regular submitted application
            actions.push({
              title: 'View/Update Application',
              description: 'View or update your summer internship application',
              icon: '📋',
              link: `/student/sem7/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
              textColor: 'text-blue-800',
            });
          }
        } else if (summerApp && (summerApp.status === 'verified_fail' || summerApp.status === 'absent')) {
          // Application rejected - show registration link
          if (internship1Project) {
            actions.push({
              title: 'View Internship 1 Project',
              description: 'View your registered solo project',
              icon: '📋',
              link: '/student/sem7/internship1/dashboard',
              color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
              textColor: 'text-orange-800',
            });
          } else {
            actions.push({
              title: 'Register Internship 1',
              description: 'Application rejected - register for solo project',
              icon: '⚠️',
              link: '/student/sem7/internship1/register',
              color: 'bg-red-50 border-red-200 hover:bg-red-100',
              textColor: 'text-red-800',
            });
          }
        } else if (summerApp?.status === 'needs_info') {
          actions.push({
            title: 'Update Application',
            description: 'Update required - fix your summer internship application',
            icon: '⚠️',
            link: `/student/sem7/internship/apply/summer/${summerApp._id}/edit`,
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        } else if (summerApp) {
          actions.push({
            title: 'View Application',
            description: 'View your summer internship application status',
            icon: '📝',
            link: '/student/sem7/internship1/dashboard',
            color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
            textColor: 'text-orange-800',
          });
        } else if (internship1Project) {
          actions.push({
            title: 'View Internship 1',
            description: 'View your registered solo project',
            icon: '📋',
            link: '/student/sem7/internship1/dashboard',
            color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
            textColor: 'text-orange-800',
          });
        } else {
          actions.push({
            title: 'Start Internship 1',
            description: 'Submit evidence or register solo project',
            icon: '🚀',
            link: '/student/sem7/internship1/dashboard',
            color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
            textColor: 'text-orange-800',
          });
        }
      }
    } else if (currentSemester === 8) {
      // Sem 8 actions
      const sem8NextStep = sem8GetNextStep();
      const sem8SelectedTrack = sem8FinalizedTrack || (sem8TrackChoice?.chosenTrack);
      
      // Type 2: Track selection - only show if no choice submitted or needs_info
      if (isType2 && !sem8FinalizedTrack) {
        if (!sem8TrackChoice || !sem8TrackChoice.chosenTrack) {
          // No choice submitted yet
          if ((typeof sem8CanChooseTrack === 'function' ? sem8CanChooseTrack() : sem8CanChooseTrack)) {
            actions.push({
              title: 'Choose Track',
              description: 'Select 6-month internship or Major Project 2',
              icon: '🎯',
              link: '/student/sem8/track-selection',
              color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
              textColor: 'text-blue-800',
            });
          }
        } else if (sem8TrackChoice.verificationStatus === 'needs_info') {
          // Choice submitted but needs info
          actions.push({
            title: 'Update Track Choice',
            description: 'Provide additional information',
            icon: '📝',
            link: '/student/sem8/track-selection',
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        }
      }
      
      // Internship track actions (Type 2 only - Type 1 can't choose internship track)
      if (isType2 && sem8SelectedTrack === 'internship') {
        const sixMonthApp = sem8GetInternshipApplication('6month');
        if (!sixMonthApp) {
          actions.push({
            title: 'Submit 6-Month Internship Application',
            description: 'Submit company details and offer letter',
            icon: '📄',
            link: '/student/sem8/internship/apply/6month',
            color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
            textColor: 'text-purple-800',
          });
        } else if (sixMonthApp.status === 'needs_info') {
          actions.push({
            title: '⚠️ Update Internship Application',
            description: 'Provide additional information required',
            icon: '📝',
            link: `/student/sem8/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        } else if (sixMonthApp.status === 'verified_pass') {
          actions.push({
            title: '✓ Internship Verified',
            description: 'Your 6-month internship has been approved',
            icon: '✅',
            link: `/student/sem8/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-green-50 border-green-200 hover:bg-green-100',
            textColor: 'text-green-800',
          });
        } else if (sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent') {
          actions.push({
            title: '✗ Internship Verification Failed',
            description: 'View details and next steps',
            icon: '⚠️',
            link: `/student/sem8/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-red-50 border-red-200 hover:bg-red-100',
            textColor: 'text-red-800',
          });
        } else if (sixMonthApp.status === 'submitted' || sixMonthApp.status === 'pending_verification') {
          actions.push({
            title: 'View Application Status',
            description: 'Check your internship application status',
            icon: '📋',
            link: `/student/sem8/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        }
      }
      
      // Major Project 2 track actions (Type 1 auto-enrolled in 'coursework', Type 2 chooses 'major2')
      // Type 1 students have 'coursework' track (which represents major2 for them)
      // Type 2 students have 'major2' track (converted from 'coursework' by backend)
      if ((isType1 && sem8SelectedTrack === 'coursework') || (isType2 && sem8SelectedTrack === 'major2')) {
        // Major Project 2 Actions
        if (majorProject2) {
          actions.push({
            title: 'View Major Project 2',
            description: 'View your registered project details',
            icon: '📋',
            link: '/student/sem8/major2/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else if (isType1 && majorProject2Group?.status === 'finalized') {
          actions.push({
            title: 'Register Major Project 2',
            description: 'Group finalized - register your project now',
            icon: '✅',
            link: '/student/sem8/major2/dashboard',
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        } else if (isType1 && majorProject2Group) {
          actions.push({
            title: 'Finalize Group',
            description: 'Finalize your group to register Major Project 2',
            icon: '👥',
            link: '/student/sem8/major2/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else if (isType1 && !majorProject2Group) {
          actions.push({
            title: 'Create Group',
            description: 'Create a group for Major Project 2',
            icon: '➕',
            link: '/student/sem8/major2/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else if (isType2) {
          actions.push({
            title: 'Register Major Project 2',
            description: 'Register your solo Major Project 2',
            icon: '📝',
            link: '/student/sem8/major2/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        }

        // Internship 2 Actions - Only for Type 1 students (Type 2 students on major2 track only do Major Project 2)
        if (isType1) {
          const summerApp = sem8GetInternshipApplication('summer');
          
          // Check if summer app has placeholder values that need completion
          const wasAssignedOrChangedByAdmin = summerApp?.adminRemarks === 'Assigned by admin' || 
            (summerApp?.adminRemarks && (
              summerApp.adminRemarks.includes('Assigned by admin') ||
              summerApp.adminRemarks.includes('Switched from Internship-I under Institute Faculty')
            )) ||
            summerApp?.internship1TrackChangedByAdminAt;
          
          const hasPlaceholderValues = summerApp && 
            summerApp.status === 'submitted' && 
            wasAssignedOrChangedByAdmin && (
              !summerApp.details?.companyName || 
              summerApp.details?.companyName === 'To be provided by student' ||
              summerApp.details?.companyName === 'N/A - Assigned to Internship 1 Project' ||
              (summerApp.details?.startDate && summerApp.details?.endDate && 
               new Date(summerApp.details.startDate).getTime() === new Date(summerApp.details.endDate).getTime()) ||
              !summerApp.details?.completionCertificateLink ||
              !summerApp.details?.roleOrNatureOfWork
            );
          
          if (sem8HasApprovedSummerInternship) {
            // Summer internship approved - Internship 2 not required
            actions.push({
              title: '✓ Internship 2 Approved',
              description: 'Summer internship approved - no project needed',
              icon: '✅',
              link: '/student/sem8/internship2/dashboard',
              color: 'bg-green-50 border-green-200 hover:bg-green-100',
              textColor: 'text-green-800',
            });
          } else if (internship2Project) {
            // Internship 2 project registered
            actions.push({
              title: 'View Internship 2',
              description: 'View your registered solo project',
              icon: '📋',
              link: '/student/sem8/internship2/dashboard',
              color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
              textColor: 'text-orange-800',
            });
          } else if (summerApp && (summerApp.status === 'verified_fail' || summerApp.status === 'absent')) {
            // Summer internship failed/absent - must register Internship 2 project
            actions.push({
              title: '⚠️ Register Internship 2',
              description: 'Summer internship failed - register solo project required',
              icon: '🚨',
              link: '/student/sem8/internship2/register',
              color: 'bg-red-50 border-red-200 hover:bg-red-100',
              textColor: 'text-red-800',
            });
          } else if (summerApp && summerApp.status === 'needs_info') {
            // Summer app needs update
            actions.push({
              title: '⚠️ Update Summer Evidence',
              description: 'Provide additional information for summer internship',
              icon: '📝',
              link: `/student/sem8/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
              textColor: 'text-yellow-800',
            });
          } else if (hasPlaceholderValues) {
            // URGENT: Application has placeholder values
            actions.push({
              title: '🚨 URGENT: Complete Application',
              description: 'Summer application has placeholder values - fill immediately',
              icon: '🚨',
              link: `/student/sem8/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-red-50 border-red-300 hover:bg-red-100',
              textColor: 'text-red-800',
            });
          } else if (summerApp && summerApp.status === 'submitted') {
            // Summer app submitted, waiting for verification
            actions.push({
              title: 'View Summer Evidence',
              description: 'Check your summer internship evidence status',
              icon: '📋',
              link: `/student/sem8/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
              textColor: 'text-blue-800',
            });
          } else if (internship2Status?.eligible) {
            // Eligible for Internship 2 but no summer app submitted yet
            actions.push({
              title: 'Start Internship 2',
              description: 'Submit summer evidence or register solo project',
              icon: '🚀',
              link: '/student/sem8/internship2/dashboard',
              color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
              textColor: 'text-orange-800',
            });
          }
        }
      }
    }

    return actions;
  };

  const renderSem3InternshipPanel = () => {
    if (
      degree !== 'M.Tech' ||
      normalizedSemester !== 3 ||
      showSem3Welcome ||
      sem3SelectedTrack !== 'internship'
    ) {
      return null;
    }

    const statusMap = {
      submitted: { status: 'warning', text: 'Submitted' },
      pending_verification: { status: 'warning', text: 'Pending Verification' },
      needs_info: { status: 'error', text: 'Needs Info' },
      verified_pass: { status: 'success', text: 'Verified (Pass)' },
      verified_fail: { status: 'error', text: 'Verified (Fail)' },
      absent: { status: 'error', text: 'Absent' }
    };

    const statusConfig = statusMap[sem3InternshipApp?.status] || { status: 'warning', text: 'Not Submitted' };

    return (
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-teal-600 font-semibold">
                Internship 1 (M.Tech Sem 3)
              </p>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">6-Month Internship Dashboard</h2>
              <p className="text-gray-600 mt-2">
                Track your internship submission status and respond to admin feedback.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={statusConfig.status} text={statusConfig.text} />
              <button
                onClick={() =>
                  navigate('/student/mtech/sem3/track-selection', { state: { preselect: 'internship' } })
                }
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
              >
                View / Update Details
              </button>
            </div>
          </div>

          {sem3AppLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : sem3InternshipApp ? (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-teal-50 border border-teal-100 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-teal-900 mb-2">Company Details</h3>
                <p className="text-gray-900 font-medium">{sem3InternshipApp.details?.companyName || '—'}</p>
                <p className="text-sm text-gray-600">{sem3InternshipApp.details?.location || 'Location not provided'}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {sem3InternshipApp.details?.startDate
                    ? new Date(sem3InternshipApp.details.startDate).toLocaleDateString()
                    : 'Start date'}{' '}
                  -{' '}
                  {sem3InternshipApp.details?.endDate
                    ? new Date(sem3InternshipApp.details.endDate).toLocaleDateString()
                    : 'End date'}
                </p>
                <p className="text-sm text-gray-600">
                  Mode: {sem3InternshipApp.details?.mode ? sem3InternshipApp.details.mode.toUpperCase() : '—'}
                </p>
                <p className="text-sm text-gray-600">
                  Stipend:{' '}
                  {sem3InternshipApp.details?.hasStipend === 'yes'
                    ? `₹${sem3InternshipApp.details.stipendRs || 0}/month`
                    : 'No stipend'}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Nature of Work</p>
                  <p className="text-gray-900 text-sm mt-1">
                    {sem3InternshipApp.details?.roleOrNatureOfWork || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Reporting Manager</p>
                  <p className="text-gray-900 text-sm mt-1">{sem3InternshipApp.details?.mentorName || 'Not provided'}</p>
                  <p className="text-gray-600 text-sm">
                    {sem3InternshipApp.details?.mentorEmail || '—'}
                    {sem3InternshipApp.details?.mentorPhone ? ` • ${sem3InternshipApp.details.mentorPhone}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Offer Letter</p>
                  {sem3InternshipApp.details?.offerLetterLink ? (
                    <a
                      href={sem3InternshipApp.details.offerLetterLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      View Document
                    </a>
                  ) : (
                    <p className="text-sm text-gray-600">Upload pending</p>
                  )}
                </div>
                {sem3InternshipApp.adminRemarks && (
                  <div className="bg-white border border-yellow-200 rounded-md p-3">
                    <p className="text-xs uppercase tracking-wide text-yellow-600 font-semibold">Admin Remarks</p>
                    <p className="text-sm text-gray-800 mt-1">{sem3InternshipApp.adminRemarks}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 border border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-gray-700 font-medium">No internship application submitted yet.</p>
              <p className="text-gray-500 text-sm mt-1">
                Click "View / Update Details" to complete your Internship 1 submission.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const normalizedSemester = currentSemester || 4;
  const normalizedDegree = degree || 'B.Tech';
  const isSem5 = normalizedSemester === 5;
  const isSem6 = normalizedSemester === 6;
  const isSem7 = normalizedSemester === 7;
  const isSem8 = normalizedSemester === 8;


  const quickActions = getQuickActions();

  // Check if we have critical sources loading
  const criticalDataLoading = !user && !roleData && authLoading;


  return (
    <>
      {showSem3Welcome && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8">
            <p className="text-sm uppercase tracking-wide text-indigo-600 font-semibold">
              Welcome back
            </p>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">
              Hey {user?.name || roleData?.fullName || 'there'} 👋
            </h2>
            <p className="text-gray-600 mt-3">
              You are now in M.Tech Semester 3. Choose how you want to start: continue with Internship
              1 or focus on Major Project 1 with an institute guide.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleSem3WelcomeChoice('internship')}
                className="text-left p-5 rounded-xl border-2 border-indigo-100 hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500 transition shadow-sm bg-indigo-50"
              >
                <p className="text-xs uppercase tracking-wide text-indigo-600">Option 1</p>
                <h3 className="text-xl font-semibold text-gray-900 mt-1">Internship 1</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Start with Internship 1 and submit your 6-month internship details for verification.
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleSem3WelcomeChoice('coursework')}
                className="text-left p-5 rounded-xl border-2 border-orange-100 hover:border-orange-300 focus:ring-2 focus:ring-orange-500 transition shadow-sm bg-orange-50"
              >
                <p className="text-xs uppercase tracking-wide text-orange-600">Option 2</p>
                <h3 className="text-xl font-semibold text-gray-900 mt-1">Major Project 1</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Begin Major Project 1 on campus, form your team, and align with a faculty mentor.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Removed semester header as requested */}

      {/* Welcome Message */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {roleData?.fullName || user?.fullName || user?.name || 'Student'}!
        </h1>
        <p className="text-gray-600 mt-2">
          {isSem8
            ? "Manage your Semester 8 track, projects, and internships"
            : isSem7
            ? "Manage your Semester 7 track, projects, and internships"
            : isSem6
            ? "Manage your Minor Project 3 and track your progress"
            : isSem5 
            ? "Manage your Minor Project 2, form groups, and track your progress"
            : "Manage your Minor Project 1 and track your progress"
          }
        </p>
      </div>

      {renderSem3InternshipPanel()}

      {/* M.Tech Sem 1 Project Section */}
      {(normalizedDegree === 'M.Tech') && (normalizedSemester === 1) && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Minor Project 1</h2>
          <div className="bg-white rounded-lg shadow p-6">
            {mtechLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : mtechProject ? (
              mtechProject.faculty ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{mtechProject.title || 'Your Project'}</h3>
                    <p className="text-sm text-gray-600">Faculty Allocated: {mtechProject.faculty?.fullName || 'Assigned Faculty'}</p>
                  </div>
                  <Link to={`/projects/${mtechProject._id}`} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Open Project Dashboard</Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-700 font-medium mb-1">Project Registered</p>
                  <p className="text-gray-500">Please wait while a faculty is allocated to your project.</p>
                </div>
              )
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-3">No project registered yet</p>
                <Link to="/student/mtech/sem1/register" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Register for Minor Project 1</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions (hide when M.Tech Sem 1 has registered project) */}
      {!(degree === 'M.Tech' && currentSemester === 1 && mtechProject) && quickActions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                className={`p-4 rounded-lg border-2 transition-colors ${action.color}`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{action.icon}</span>
                  <div>
                    <h3 className={`font-medium ${action.textColor}`}>{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Group Invitations Section - For Sem 5, Sem 7, and Sem 8 Type 1 students with pending invitations */}
      {((isSem5 || isSem7) && !isInGroup && groupInvitations && groupInvitations.length > 0) ||
       (isSem8 && isType1 && !majorProject2Group && sem8GroupInvitations && sem8GroupInvitations.length > 0) ? (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Invitations</h2>
          <div className="space-y-4">
            {/* Display invitations - use sem8GroupInvitations for Sem 8, groupInvitations for Sem 5/7 */}
            {(isSem8 ? sem8GroupInvitations : groupInvitations).map((invitation) => (
              <div key={invitation._id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-lg">👥</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {invitation.group?.name || 'Group Invitation'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Invited by {invitation.invitedBy?.fullName} ({invitation.invitedBy?.misNumber})
                        </p>
                      </div>
                    </div>
                    
                    {invitation.group?.description && (
                      <p className="text-gray-700 mb-3">{invitation.group.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-medium">Group Leader:</span>
                        <span className="ml-2">{invitation.group?.leader?.fullName}</span>
                      </div>
                      <div>
                        <span className="font-medium">Max Members:</span>
                        <span className="ml-2">{invitation.group?.maxMembers}</span>
                      </div>
                      <div>
                        <span className="font-medium">Min Members:</span>
                        <span className="ml-2">{invitation.group?.minMembers}</span>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <span className="ml-2">
                          <StatusBadge status={invitation.group?.status} />
                        </span>
                      </div>
                      {invitation.group?.semester && (
                        <div>
                          <span className="font-medium">Semester:</span>
                          <span className="ml-2">Sem {invitation.group.semester}</span>
                          {invitation.group.semester === 7 && (
                            <span className="ml-2 text-xs text-blue-600">(Major Project 1)</span>
                          )}
                          {invitation.group.semester === 8 && (
                            <span className="ml-2 text-xs text-blue-600">(Major Project 2)</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Invited on: {new Date(invitation.invitedAt || invitation.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 ml-6">
                    <button
                      onClick={() => handleInvitationResponse(invitation._id, true, isSem8)}
                      disabled={invitationLoading[invitation._id]}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {invitationLoading[invitation._id] ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <span>✓</span>
                      )}
                      <span>Accept</span>
                    </button>
                    
                    <button
                      onClick={() => handleInvitationResponse(invitation._id, false, isSem8)}
                      disabled={invitationLoading[invitation._id]}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {invitationLoading[invitation._id] ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <span>✕</span>
                      )}
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Project Status Card */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {isSem8
                ? "Semester 8 Status"
                : isSem7
                ? "Semester 7 Status"
                : isSem6 
                ? "Minor Project 3 Status" 
                : isSem5 
                ? "Minor Project 2 Status" 
                : "Minor Project 1 Status"}
            </h2>
          </div>
          <div className="p-6">
            {isSem7 ? (
              // Sem 7 Project Status
              sem7Loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Track Choice Status */}
                  <div className="border-b pb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Track Choice</h3>
                    {finalizedTrack ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            finalizedTrack === 'internship' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {finalizedTrack === 'internship' ? '6-Month Internship' : 'Coursework'}
                          </span>
                          {trackChoiceStatus && (
                            <StatusBadge status={trackChoiceStatus === 'approved' ? 'success' : trackChoiceStatus === 'needs_info' ? 'error' : 'warning'} text={trackChoiceStatus} />
                          )}
                        </div>
                        {trackChoiceStatus === 'needs_info' && (
                          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-800 font-medium mb-1">Action Required</p>
                            <p className="text-xs text-yellow-700">Please update your track choice with the additional information requested by the admin.</p>
                          </div>
                        )}
                      </div>
                    ) : trackChoice && trackChoice.chosenTrack ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            trackChoice.chosenTrack === 'internship' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {trackChoice.chosenTrack === 'internship' ? '6-Month Internship' : 'Coursework'}
                          </span>
                          {(() => {
                            // For internship track, check application status
                            if (trackChoice.chosenTrack === 'internship') {
                              const sixMonthApp = getInternshipApplication('6month');
                              if (sixMonthApp) {
                                if (sixMonthApp.status === 'verified_pass') {
                                  return <StatusBadge status="success" text="Verified (Pass)" />;
                                } else if (sixMonthApp.status === 'needs_info') {
                                  return <StatusBadge status="error" text="Update Required" />;
                                } else if (sixMonthApp.status === 'pending_verification') {
                                  return <StatusBadge status="info" text="Pending Verification" />;
                                } else if (sixMonthApp.status === 'submitted') {
                                  return <StatusBadge status="info" text="Application Submitted" />;
                                } else if (sixMonthApp.status === 'verified_fail') {
                                  return <StatusBadge status="error" text="Verified (Fail)" />;
                                } else if (sixMonthApp.status === 'absent') {
                                  return <StatusBadge status="error" text="Absent" />;
                                }
                              }
                              return <StatusBadge status="info" text="Proceed to Application" />;
                            }
                            // For coursework track
                            if (trackChoiceStatus === 'needs_info') {
                              return <StatusBadge status="error" text="Needs Info" />;
                            }
                            return <StatusBadge status="info" text="Pending Review" />;
                          })()}
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          {(() => {
                            // For internship track, show application status
                            if (trackChoice.chosenTrack === 'internship') {
                              const sixMonthApp = getInternshipApplication('6month');
                              if (sixMonthApp) {
                                if (sixMonthApp.status === 'verified_pass') {
                                  return (
                                    <>
                                      <p className="text-sm text-green-800 font-medium mb-1">Internship Verified (Pass)</p>
                                      <p className="text-xs text-green-700 mb-2">
                                        Your 6-month internship has been verified. Sem 8 coursework is required.
                                      </p>
                                    </>
                                  );
                                } else if (sixMonthApp.status === 'needs_info') {
                                  return (
                                    <>
                                      <p className="text-sm text-yellow-800 font-medium mb-1">Update Required</p>
                                      <p className="text-xs text-yellow-700 mb-2">
                                        The admin has requested additional information. Please update your internship application with the required details.
                                      </p>
                                    </>
                                  );
                                } else if (sixMonthApp.status === 'submitted') {
                                  return (
                                    <>
                                      <p className="text-sm text-blue-800 font-medium mb-1">Application Submitted</p>
                                      <p className="text-xs text-blue-700 mb-2">
                                        Your 6-month internship application has been submitted and is awaiting review.
                                      </p>
                                    </>
                                  );
                                } else if (sixMonthApp.status === 'pending_verification') {
                                  return (
                                    <>
                                      <p className="text-sm text-blue-800 font-medium mb-1">Pending Verification</p>
                                      <p className="text-xs text-blue-700 mb-2">
                                        Your internship will be verified by the admin/panel. You will be notified once it is decided.
                                      </p>
                                    </>
                                  );
                                } else if (sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent') {
                                  return (
                                    <>
                                      <p className="text-sm text-red-800 font-medium mb-1">Verification Failed / Absent</p>
                                      <p className="text-xs text-red-700 mb-2">
                                        You must complete Major Project 1 as backlog next semester. Sem 8 coursework is required.
                                      </p>
                                      {sixMonthApp.adminRemarks && (
                                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                                          <p className="text-xs text-red-800"><strong>Admin Remarks:</strong> {sixMonthApp.adminRemarks}</p>
                                        </div>
                                      )}
                                    </>
                                  );
                                }
                              }
                              return (
                                <>
                                  <p className="text-sm text-blue-800 font-medium mb-1">Next Step</p>
                                  <p className="text-xs text-blue-700 mb-2">
                                    You selected Internship. Please submit your 6-month internship application with company details now.
                                  </p>
                                </>
                              );
                            }
                            // For coursework track
                            if (trackChoiceStatus === 'needs_info') {
                              return (
                                <>
                                  <p className="text-sm text-yellow-800 font-medium mb-1">Update Required</p>
                                  <p className="text-xs text-yellow-700 mb-2">
                                    The admin has requested additional information. Please update your track choice with the required details.
                                  </p>
                                </>
                              );
                            }
                            return (
                              <>
                                <p className="text-sm text-blue-800 font-medium mb-1">Awaiting Admin Review</p>
                                <p className="text-xs text-blue-700 mb-2">
                                  You selected Coursework. You can proceed with Major Project 1 group formation and Internship 1 registration as per windows.
                                </p>
                              </>
                            );
                          })()}
                          {/* Admin remarks for internship when present */}
                          {(() => {
                            if (trackChoice?.chosenTrack === 'internship') {
                              const app = getInternshipApplication('6month');
                              if (app?.adminRemarks && (app.status === 'needs_info' || app.status === 'verified_fail' || app.status === 'absent')) {
                                return (
                                  <div className="mt-2 p-3 bg-white border border-gray-200 rounded">
                                    <p className="text-xs text-gray-700"><strong>Admin Remarks:</strong> {app.adminRemarks}</p>
                                  </div>
                                );
                              }
                            }
                            return null;
                          })()}
                          <p className="text-xs text-blue-600 mt-2">
                            <strong>Need help?</strong> Contact the admin if you have any questions or concerns.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No track choice submitted yet</p>
                    )}

                    {/* Coursework track - Quick redirect links (only show for coursework track, not internship) */}
                    {selectedTrack === 'coursework' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Access</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <Link
                            to="/student/sem7/major1/dashboard"
                            className="text-center px-4 py-3 bg-indigo-50 border-2 border-indigo-300 rounded-lg hover:bg-indigo-100 hover:border-indigo-400 transition-colors shadow-sm"
                          >
                            <p className="text-sm font-semibold text-indigo-900">Major Project 1</p>
                            <p className="text-xs text-indigo-700 mt-1">View Dashboard</p>
                          </Link>
                          {(() => {
                            const summerApp = getInternshipApplication('summer');
                            // If fresh assignment to application track, show application submission link
                            if (summerApp && summerApp.status === 'submitted' && summerApp.adminRemarks === 'Assigned by admin') {
                              return (
                                <Link
                                  to={`/student/sem7/internship/apply/summer/${summerApp._id}/edit`}
                                  className="text-center px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-colors shadow-sm"
                                >
                                  <p className="text-sm font-semibold text-blue-900">Internship 1</p>
                                  <p className="text-xs text-blue-700 mt-1">Submit Application</p>
                                </Link>
                              );
                            }
                            // If fresh assignment to project track (verified_fail with 'Assigned by admin'), show blue registration link
                            const isFreshProjectAssignment = summerApp && (summerApp.status === 'verified_fail' || summerApp.status === 'absent') && 
                              (summerApp.adminRemarks === 'Assigned by admin' || 
                               (summerApp.adminRemarks && summerApp.adminRemarks.includes('Assigned by admin')));
                            if (isFreshProjectAssignment && !internship1Project) {
                              return (
                                <Link
                                  to="/student/sem7/internship1/register"
                                  className="text-center px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-colors shadow-sm"
                                >
                                  <p className="text-sm font-semibold text-blue-900">Internship 1</p>
                                  <p className="text-xs text-blue-700 mt-1">Register Project</p>
                                </Link>
                              );
                            }
                            // If application is rejected and no project registered, show red registration link
                            if (summerApp && (summerApp.status === 'verified_fail' || summerApp.status === 'absent') && !internship1Project) {
                              return (
                                <Link
                                  to="/student/sem7/internship1/register"
                                  className="text-center px-4 py-3 bg-red-50 border-2 border-red-300 rounded-lg hover:bg-red-100 hover:border-red-400 transition-colors shadow-sm"
                                >
                                  <p className="text-sm font-semibold text-red-900">Internship 1</p>
                                  <p className="text-xs text-red-700 mt-1">Register Project</p>
                                </Link>
                              );
                            }
                            // Otherwise show dashboard link
                            return (
                              <Link
                                to="/student/sem7/internship1/dashboard"
                                className="text-center px-4 py-3 bg-teal-50 border-2 border-teal-300 rounded-lg hover:bg-teal-100 hover:border-teal-400 transition-colors shadow-sm"
                              >
                                <p className="text-sm font-semibold text-teal-900">Internship 1</p>
                                <p className="text-xs text-teal-700 mt-1">View Dashboard</p>
                              </Link>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )
            ) : isSem8 ? (
              // Sem 8 Project Status
              sem8Loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Student Type Indicator */}
                  {studentType && (
                    <div className="border-b pb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Student Type</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isType1
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isType1 ? 'Type 1: Completed 6-Month Internship in Sem 7' : 'Type 2: Did Coursework in Sem 7'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Track Choice Status (Type 2 only) */}
                  {isType2 && (
                    <div className="border-b pb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Track Choice</h3>
                      {sem8FinalizedTrack ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sem8FinalizedTrack === 'internship' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {sem8FinalizedTrack === 'internship' ? '6-Month Internship' : 'Major Project 2'}
                            </span>
                            {sem8TrackChoiceStatus && (
                              <StatusBadge status={sem8TrackChoiceStatus === 'approved' ? 'success' : sem8TrackChoiceStatus === 'needs_info' ? 'error' : 'warning'} text={sem8TrackChoiceStatus} />
                            )}
                          </div>
                          {sem8TrackChoiceStatus === 'needs_info' && (
                            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-sm text-yellow-800 font-medium mb-1">Action Required</p>
                              <p className="text-xs text-yellow-700">Please update your track choice with the additional information requested by the admin.</p>
                            </div>
                          )}
                        </div>
                      ) : sem8TrackChoice && sem8TrackChoice.chosenTrack ? (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sem8TrackChoice.chosenTrack === 'internship' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {sem8TrackChoice.chosenTrack === 'internship' ? '6-Month Internship' : 'Major Project 2'}
                            </span>
                            {(() => {
                              // For internship track, check application status
                              if (sem8TrackChoice.chosenTrack === 'internship') {
                                const sixMonthApp = sem8GetInternshipApplication('6month');
                                if (sixMonthApp) {
                                  if (sixMonthApp.status === 'verified_pass') {
                                    return <StatusBadge status="success" text="Verified (Pass)" />;
                                  } else if (sixMonthApp.status === 'needs_info') {
                                    return <StatusBadge status="error" text="Update Required" />;
                                  } else if (sixMonthApp.status === 'pending_verification') {
                                    return <StatusBadge status="info" text="Pending Verification" />;
                                  } else if (sixMonthApp.status === 'submitted') {
                                    return <StatusBadge status="info" text="Application Submitted" />;
                                  } else if (sixMonthApp.status === 'verified_fail') {
                                    return <StatusBadge status="error" text="Verified (Fail)" />;
                                  } else if (sixMonthApp.status === 'absent') {
                                    return <StatusBadge status="error" text="Absent" />;
                                  }
                                }
                                return <StatusBadge status="info" text="Proceed to Application" />;
                              }
                              // For major2 track
                              if (sem8TrackChoiceStatus === 'needs_info') {
                                return <StatusBadge status="error" text="Needs Info" />;
                              }
                              return <StatusBadge status="info" text="Pending Review" />;
                            })()}
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                            {(() => {
                              // For internship track, show application status
                              if (sem8TrackChoice.chosenTrack === 'internship') {
                                const sixMonthApp = sem8GetInternshipApplication('6month');
                                if (sixMonthApp) {
                                  if (sixMonthApp.status === 'verified_pass') {
                                    return (
                                      <>
                                        <p className="text-sm text-green-800 font-medium mb-1">Internship Verified (Pass)</p>
                                        <p className="text-xs text-green-700 mb-2">
                                          Your 6-month internship has been verified.
                                        </p>
                                      </>
                                    );
                                  } else if (sixMonthApp.status === 'needs_info') {
                                    return (
                                      <>
                                        <p className="text-sm text-yellow-800 font-medium mb-1">Update Required</p>
                                        <p className="text-xs text-yellow-700 mb-2">
                                          The admin has requested additional information. Please update your internship application with the required details.
                                        </p>
                                      </>
                                    );
                                  } else if (sixMonthApp.status === 'submitted') {
                                    return (
                                      <>
                                        <p className="text-sm text-blue-800 font-medium mb-1">Application Submitted</p>
                                        <p className="text-xs text-blue-700 mb-2">
                                          Your 6-month internship application has been submitted and is awaiting review.
                                        </p>
                                      </>
                                    );
                                  } else if (sixMonthApp.status === 'pending_verification') {
                                    return (
                                      <>
                                        <p className="text-sm text-blue-800 font-medium mb-1">Pending Verification</p>
                                        <p className="text-xs text-blue-700 mb-2">
                                          Your internship will be verified by the admin/panel. You will be notified once it is decided.
                                        </p>
                                      </>
                                    );
                                  } else if (sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent') {
                                    return (
                                      <>
                                        <p className="text-sm text-red-800 font-medium mb-1">Verification Failed / Absent</p>
                                        <p className="text-xs text-red-700 mb-2">
                                          Your internship verification failed. Please contact admin for next steps.
                                        </p>
                                        {sixMonthApp.adminRemarks && (
                                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                                            <p className="text-xs text-red-800"><strong>Admin Remarks:</strong> {sixMonthApp.adminRemarks}</p>
                                          </div>
                                        )}
                                      </>
                                    );
                                  }
                                }
                                return (
                                  <>
                                    <p className="text-sm text-blue-800 font-medium mb-1">Next Step</p>
                                    <p className="text-xs text-blue-700 mb-2">
                                      You selected 6-Month Internship. Please submit your internship application with company details now.
                                    </p>
                                  </>
                                );
                              }
                              // For major2 track
                              if (sem8TrackChoiceStatus === 'needs_info') {
                                return (
                                  <>
                                    <p className="text-sm text-yellow-800 font-medium mb-1">Update Required</p>
                                    <p className="text-xs text-yellow-700 mb-2">
                                      The admin has requested additional information. Please update your track choice with the required details.
                                    </p>
                                  </>
                                );
                              }
                              return (
                                <>
                                  <p className="text-sm text-blue-800 font-medium mb-1">Awaiting Admin Review</p>
                                  <p className="text-xs text-blue-700 mb-2">
                                    You selected Major Project 2. You can proceed with project registration once approved.
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No track choice submitted yet</p>
                      )}
                    </div>
                  )}

                  {/* Coursework track - Quick redirect links (Type 1 or Type 2 with Major Project 2) */}
                  {((isType1 && sem8FinalizedTrack === 'coursework') || (isType2 && (sem8FinalizedTrack === 'major2' || sem8TrackChoice?.chosenTrack === 'major2'))) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Access</h3>
                      <div className={`grid gap-3 ${isType1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <Link
                          to="/student/sem8/major2/dashboard"
                          className="text-center px-4 py-3 bg-indigo-50 border-2 border-indigo-300 rounded-lg hover:bg-indigo-100 hover:border-indigo-400 transition-colors shadow-sm"
                        >
                          <p className="text-sm font-semibold text-indigo-900">Major Project 2</p>
                          <p className="text-xs text-indigo-700 mt-1">View Dashboard</p>
                        </Link>
                        {/* Internship 2 link - Only for Type 1 students (Type 2 students on major2 track only do Major Project 2) */}
                        {isType1 && (() => {
                          const summerApp = sem8GetInternshipApplication('summer');
                          // If application is rejected and no project registered, show red registration link
                          if (summerApp && (summerApp.status === 'verified_fail' || summerApp.status === 'absent') && !internship2Project) {
                            return (
                              <Link
                                to="/student/sem8/internship2/register"
                                className="text-center px-4 py-3 bg-red-50 border-2 border-red-300 rounded-lg hover:bg-red-100 hover:border-red-400 transition-colors shadow-sm"
                              >
                                <p className="text-sm font-semibold text-red-900">Internship 2</p>
                                <p className="text-xs text-red-700 mt-1">Register Project</p>
                              </Link>
                            );
                          }
                          // Otherwise show dashboard link
                          return (
                            <Link
                              to="/student/sem8/internship2/dashboard"
                              className="text-center px-4 py-3 bg-teal-50 border-2 border-teal-300 rounded-lg hover:bg-teal-100 hover:border-teal-400 transition-colors shadow-sm"
                            >
                              <p className="text-sm font-semibold text-teal-900">Internship 2</p>
                              <p className="text-xs text-teal-700 mt-1">View Dashboard</p>
                            </Link>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                </div>
              )
            ) : isSem6 ? (
              // Sem 6 Project Status
              sem6ProjectLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : sem6Project ? (
                <div className="space-y-4">
                  <Link 
                    to={`/projects/${sem6Project._id}`} 
                    className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {sem6Project.isContinuation 
                                ? `Minor Project 3 (Continued)` 
                                : 'Minor Project 3'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {sem6Project.isContinuation 
                                ? 'Continued from Sem 5' 
                                : 'Project Dashboard'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium w-20">Project:</span>
                            <span className="text-gray-900">{sem6Project.title}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium w-20">Faculty:</span>
                            <span className="text-gray-900">
                              {sem6Project.faculty?.fullName || sem6Project.group?.allocatedFaculty?.fullName || 'N/A'}
                            </span>
                          </div>
                          {sem6Project.isContinuation && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-xs text-blue-800">
                                <span className="font-medium">🔄 Continuation:</span> This project continues from your Semester 5 Minor Project 2
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Project Registered Yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Register your Minor Project 3 to continue with your group from Semester 5
                  </p>
                  <Link
                    to="/student/sem6/register"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Register Minor Project 3
                  </Link>
                </div>
              )
            ) : isSem5 ? (
              // Sem 5 Project Status
              sem5ProjectLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : sem5Project ? (
                // Check if faculty is allocated
                hasFacultyAllocated() ? (
                  // Show project card when faculty is allocated
                  <div className="space-y-4">
                    <Link 
                      to={`/projects/${sem5Project._id}`} 
                      className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Minor Project 2</h3>
                              <p className="text-sm text-gray-500">Project Dashboard</p>
                            </div>
                          </div>
                          
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="font-medium w-20">Project:</span>
                              <span className="text-gray-900">{sem5Project.title}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="font-medium w-20">Faculty:</span>
                              <span className="text-gray-900">
                                {sem5Project.faculty?.fullName || sem5Project.group?.allocatedFaculty?.fullName || 'Loading...'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  </div>
                ) : (
                  // Show waiting message when faculty is not allocated
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Project Registration Complete
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Your Minor Project 2 has been successfully registered.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-800">
                            <strong>Project dashboard will be visible once a faculty has been allocated.</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // No project registered - show step-by-step guidance
                !isInGroup || !sem5Group ? (
                  <div className="text-center py-6">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-700 mb-2">Form Your Group First</p>
                    <p className="text-gray-500 text-sm">Create a group before registering your project</p>
                  </div>
                ) : sem5Group && sem5Group.status === 'invitations_sent' ? (
                  <div className="text-center py-6">
                    <div className="text-yellow-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-700 mb-2">Invitations Sent</p>
                    <p className="text-gray-500 text-sm">Waiting for members to respond to invitations</p>
                  </div>
                ) : sem5Group && sem5Group.status === 'open' ? (
                  <div className="text-center py-6">
                    <div className="text-blue-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-700 mb-2">Group Ready!</p>
                    <p className="text-gray-500 text-sm">Finalize your group to register your project</p>
                  </div>
                ) : sem5Group && sem5Group.status === 'finalized' ? (
                  <div className="text-center py-6">
                    <div className="text-green-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-700 mb-2">Group Finalized!</p>
                    <p className="text-gray-500 text-sm mb-4">You can now register your Minor Project 2</p>
                    
                    {/* Registration Button with Leader Restriction */}
                    {isGroupLeader ? (
                      <Link
                        to="/student/sem5/register"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Register Minor Project 2
                      </Link>
                    ) : (
                      <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Only Group Leader Can Register
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-2">Status: Not Started</p>
                    <p className="text-gray-400 text-sm">Form your group to begin</p>
                  </div>
                )
              )
            ) : (
              // Sem 4 Project Status (only for B.Tech Sem 4)
              (degree === 'B.Tech' && currentSemester === 4) ? (
                sem4ProjectLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : sem4Project ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{sem4Project.title}</h3>
                      <StatusBadge status={sem4Project.status} />
                    </div>
                    <div className="text-xs text-gray-500">
                      Registered: {new Date(sem4Project.createdAt).toLocaleDateString()}
                    </div>
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">PPT Status</h4>
                      {statusLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-gray-500">Loading...</span>
                        </div>
                      ) : projectStatus?.pptSubmitted ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-500">✓</span>
                              <span className="text-sm text-gray-600">
                                PPT Uploaded ({projectStatus.pptOriginalName || 'Presentation'})
                              </span>
                            </div>
                            <Link to={`/student/projects/sem4/${sem4Project._id}`} className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">View/Replace</Link>
                          </div>
                          {projectStatus.pptSubmittedAt && (
                            <div className="text-xs text-gray-500">{new Date(projectStatus.pptSubmittedAt).toLocaleString()}</div>
                          )}
                        </div>
                      ) : canUploadPPT() ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">PPT Upload Available</span>
                          <Link to={`/student/projects/sem4/${sem4Project._id}`} className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Upload PPT</Link>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          <span className="text-sm text-gray-500">Evaluation schedule required for upload</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No project registered yet</p>
                    <Link to={'/student/projects/register'} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Register for Minor Project 1</Link>
                  </div>
                )
              ) : null
            )}
          </div>
        </div>

        {/* Second Card - Group Status (Sem 5/6), Evaluation Schedule (Sem 4), or Sem 7 Overview */}
        {isSem7 ? (
          /* Sem 7 Status Overview Card */
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedTrack === 'coursework' ? 'Coursework Overview' : selectedTrack === 'internship' ? '6-Month Internship Overview' : 'Semester 7 Overview'}
              </h2>
            </div>
            <div className="p-6">
              {/* Track Change Notification - Main Track (Coursework <-> 6-Month Internship) */}
              {trackChoice?.trackChangedByAdminAt && trackChoice?.previousTrack && (
                <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-amber-800">
                        Your track has been changed by admin
                      </h3>
                      <div className="mt-2 text-sm text-amber-700">
                        <p>
                          Your track has been changed from <strong>{trackChoice.previousTrack === 'internship' ? '6-Month Internship' : 'Coursework'}</strong> to <strong>{selectedTrack === 'internship' ? '6-Month Internship' : 'Coursework'}</strong>.
                        </p>
                        {trackChoice.adminRemarks && (
                          <p className="mt-2">
                            <strong>Admin Remarks:</strong> {trackChoice.adminRemarks}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-amber-600">
                          Changed on: {new Date(trackChoice.trackChangedByAdminAt).toLocaleString()}
                        </p>
                        <p className="mt-2 text-sm font-medium">
                          Please note: Your workflow flags have been reset, and any active projects may have been cancelled. Please proceed with the new track requirements.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Track Change Notification - Internship 1 Track (Project <-> Summer Internship Application) */}
              {(() => {
                const summerApp = getInternshipApplication('summer');
                if (summerApp?.internship1TrackChangedByAdminAt && summerApp?.previousInternship1Track) {
                  const previousTrack = summerApp.previousInternship1Track === 'project' 
                    ? 'Internship 1 Project (Institute Faculty)' 
                    : 'Summer Internship Application';
                  const currentTrack = summerApp.previousInternship1Track === 'project'
                    ? 'Summer Internship Application'
                    : 'Internship 1 Project (Institute Faculty)';
                  
                  return (
                    <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-md">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-medium text-amber-800">
                            Your Internship 1 track has been changed by admin
                          </h3>
                          <div className="mt-2 text-sm text-amber-700">
                            <p>
                              Your Internship 1 track has been changed from <strong>{previousTrack}</strong> to <strong>{currentTrack}</strong>.
                            </p>
                            {summerApp.adminRemarks && (
                              <p className="mt-2">
                                <strong>Admin Remarks:</strong> {summerApp.adminRemarks}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-amber-600">
                              Changed on: {new Date(summerApp.internship1TrackChangedByAdminAt).toLocaleString()}
                            </p>
                            <p className="mt-2 text-sm font-medium">
                              {summerApp.previousInternship1Track === 'project'
                                ? 'Please note: Your Internship 1 project has been cancelled and all progress has been reset. Please proceed with the summer internship application.'
                                : 'Please note: Your summer internship application status has been updated. Please follow the instructions for your new Internship 1 track.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {sem7Loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : selectedTrack === 'coursework' ? (
                <div className="space-y-6">
                  {/* Major Project 1 Status */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900">Major Project 1</h3>
                      {(() => {
                        if (majorProject1) {
                          return (
                            <StatusBadge 
                              status={
                                majorProject1.faculty || majorProject1Group?.allocatedFaculty ? 'success' : 'info'
                              }
                              text={
                                majorProject1.faculty || majorProject1Group?.allocatedFaculty ? 'Active' : 'Pending Faculty'
                              }
                            />
                          );
                        } else if (majorProject1Group?.status === 'finalized') {
                          return (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                              Ready to Register
                            </span>
                          );
                        } else if (majorProject1Group) {
                          return (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                              Group Formed
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full font-medium">
                              Not Started
                            </span>
                          );
                        }
                      })()}
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      {majorProject1 ? (
                        <>
                          <div className="space-y-1">
                            <p className="font-medium text-gray-900">{majorProject1.title}</p>
                            {majorProject1.faculty || majorProject1Group?.allocatedFaculty ? (
                              <p>Faculty: {majorProject1.faculty?.fullName || majorProject1Group?.allocatedFaculty?.fullName}</p>
                            ) : (
                              <p className="text-gray-500">Waiting for faculty allocation</p>
                            )}
                          </div>
                        </>
                      ) : majorProject1Group ? (
                        <>
                          <p className="font-medium text-gray-900">Group: {majorProject1Group.name}</p>
                          {majorProject1Group.status === 'finalized' ? (
                            <p className="text-gray-500">Group is finalized. You can now register your project.</p>
                          ) : (
                            <p className="text-gray-500">Finalize your group to register the project.</p>
                          )}
                        </>
                      ) : (
                        <p>Create a group to get started with Major Project 1</p>
                      )}
                    </div>
                  </div>

                  {/* Internship 1 Status */}
                  <div className="border-l-4 border-orange-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900">Internship 1</h3>
                      {(() => {
                        const summerApp = getInternshipApplication('summer');
                        // Prioritize project status over application status
                        // If project is registered and not cancelled, show project status
                        if (internship1Project && internship1Project.status !== 'cancelled') {
                          return (
                            <StatusBadge 
                              status={
                                internship1Project.faculty ? 'success' : 'info'
                              }
                              text={
                                internship1Project.faculty ? 'Registered' : 'Pending Faculty'
                              }
                            />
                          );
                        } else if (hasApprovedSummerInternship) {
                          return (
                            <StatusBadge status="success" text="Approved" />
                          );
                        } else if (summerApp) {
                          // Check if it's a fresh assignment by admin to application track
                          // status = 'submitted' with 'Assigned by admin' remarks = application track assignment
                          // status = 'verified_fail' with 'Assigned by admin' remarks = project track assignment (marker)
                          const isFreshApplicationAssignment = summerApp.status === 'submitted' && 
                            (summerApp.adminRemarks === 'Assigned by admin' || 
                             (summerApp.adminRemarks && summerApp.adminRemarks.includes('Assigned by admin')));
                          
                          // Handle fresh application assignment
                          if (isFreshApplicationAssignment) {
                            return (
                              <StatusBadge 
                                status="info"
                                text="Assigned to Application"
                              />
                            );
                          }
                          
                          return (
                            <StatusBadge 
                              status={
                                summerApp.status === 'approved' || summerApp.status === 'verified_pass' ? 'success' :
                                summerApp.status === 'needs_info' ? 'error' :
                                summerApp.status === 'verified_fail' || summerApp.status === 'absent' ? 'error' :
                                'info'
                              }
                              text={
                                summerApp.status === 'approved' || summerApp.status === 'verified_pass' ? 'Approved' :
                                summerApp.status === 'needs_info' ? 'Update Required' :
                                summerApp.status === 'verified_fail' ? 'Rejected' :
                                summerApp.status === 'absent' ? 'Absent' :
                                summerApp.status === 'submitted' ? 'Submitted' :
                                summerApp.status === 'pending_verification' ? 'Pending Review' :
                                summerApp.status
                              }
                            />
                          );
                        } else {
                          return (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full font-medium">
                              Not Started
                            </span>
                          );
                        }
                      })()}
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      {(() => {
                        const summerApp = getInternshipApplication('summer');
                        
                        // Check if application has placeholder values that need to be filled
                        // Only show urgent notification if:
                        // 1. Application was assigned/changed by admin (has adminRemarks indicating assignment OR track change)
                        // 2. Status is 'submitted' (not yet reviewed)
                        // 3. AND still has placeholder/incomplete values
                        // Once student fills in required fields, this should become false
                        const wasAssignedOrChangedByAdmin = summerApp?.adminRemarks === 'Assigned by admin' || 
                          (summerApp?.adminRemarks && (
                            summerApp.adminRemarks.includes('Assigned by admin') ||
                            summerApp.adminRemarks.includes('Switched from Internship-I under Institute Faculty')
                          )) ||
                          summerApp?.internship1TrackChangedByAdminAt; // Track change indicator
                        
                        const hasPlaceholderValues = summerApp && 
                          summerApp.status === 'submitted' && 
                          wasAssignedOrChangedByAdmin && (
                            // Check for placeholder company name
                            !summerApp.details?.companyName || 
                            summerApp.details?.companyName === 'To be provided by student' ||
                            summerApp.details?.companyName === 'N/A - Assigned to Internship 1 Project' ||
                            // Check for placeholder dates (same start and end date)
                            (summerApp.details?.startDate && summerApp.details?.endDate && 
                             new Date(summerApp.details.startDate).getTime() === new Date(summerApp.details.endDate).getTime()) ||
                            // Check for missing required fields
                            !summerApp.details?.completionCertificateLink ||
                            !summerApp.details?.roleOrNatureOfWork
                          );
                        
                        // URGENT: Show placeholder warning first if application has placeholder values
                        if (hasPlaceholderValues) {
                          return (
                            <div className="p-4 bg-red-50 rounded-md">
                              <div className="flex items-start">
                                <svg className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                  <h4 className="font-bold text-red-900 mb-1">⚠️ URGENT: Complete Application</h4>
                                  <p className="text-sm text-red-800 mb-2">
                                    Your application contains placeholder information. <strong>This is your TOP PRIORITY.</strong> Please fill in all required details immediately.
                                  </p>
                                  <Link
                                    to={`/student/sem7/internship/apply/summer/${summerApp._id}/edit`}
                                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700 transition-colors"
                                  >
                                    Fill Application Now →
                                  </Link>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Prioritize project status over application status
                        // If project is registered and not cancelled, show project details instead of application status
                        if (internship1Project && internship1Project.status !== 'cancelled') {
                          return (
                            <>
                              <p className="font-medium text-gray-900">{internship1Project.title}</p>
                              {internship1Project.faculty ? (
                                <p>Faculty: {internship1Project.faculty.fullName}</p>
                              ) : (
                                <p className="text-gray-500">Waiting for faculty allocation</p>
                              )}
                            </>
                          );
                        } else if (hasApprovedSummerInternship) {
                          return (
                            <>
                              <p className="text-green-700 font-medium">✓ Summer internship approved</p>
                              {summerApp?.details?.companyName && (
                                <p>Company: {summerApp.details.companyName}</p>
                              )}
                            </>
                          );
                        } else if (summerApp && summerApp.status === 'submitted' && summerApp.adminRemarks === 'Assigned by admin') {
                          // Fresh assignment by admin to summer internship application track
                          // When admin assigns to application track, creates app with 'submitted' status
                          return (
                            <>
                              <p className="text-blue-700 font-medium">ℹ️ Assigned to Summer Internship Application</p>
                              {summerApp.adminRemarks && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                  <p className="text-xs font-medium text-blue-900 mb-1">Admin Remarks:</p>
                                  <p className="text-xs text-blue-800">{summerApp.adminRemarks}</p>
                                </div>
                              )}
                              <p className="text-blue-600 mt-2">
                                Please submit your summer internship application with company details and completion certificate.
                              </p>
                            </>
                          );
                        } else if (summerApp && (summerApp.status === 'verified_fail' || summerApp.status === 'absent')) {
                          // Check if this is a fresh assignment to project track or actual rejection
                          const isFreshProjectAssignment = summerApp.adminRemarks === 'Assigned by admin' || 
                            (summerApp.adminRemarks && summerApp.adminRemarks.includes('Assigned by admin'));
                          
                          if (isFreshProjectAssignment) {
                            // Fresh assignment by admin to project track (not a rejection)
                            return (
                              <>
                                <p className="text-blue-700 font-medium">ℹ️ Assigned to Internship 1 Project</p>
                                {summerApp.adminRemarks && (
                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs font-medium text-blue-900 mb-1">Admin Remarks:</p>
                                    <p className="text-xs text-blue-800">{summerApp.adminRemarks}</p>
                                  </div>
                                )}
                                {!internship1Project && (
                                  <p className="text-blue-600 mt-2">Please register for your Internship 1 project</p>
                                )}
                              </>
                            );
                          } else {
                            // Actual application rejection
                          return (
                            <>
                              <p className="text-red-700 font-medium">✗ Application rejected</p>
                              {summerApp.adminRemarks && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-xs font-medium text-red-900 mb-1">Admin Remarks:</p>
                                  <p className="text-xs text-red-800">{summerApp.adminRemarks}</p>
                                </div>
                              )}
                              {!internship1Project && (
                                <p className="text-red-600 mt-2">Register for Internship 1 project required</p>
                              )}
                            </>
                          );
                          }
                        } else if (summerApp) {
                          return (
                            <>
                              <div className="space-y-1">
                                {summerApp.details?.companyName && (
                                  <p className="font-medium text-gray-900">Company: {summerApp.details.companyName}</p>
                                )}
                                {summerApp.details?.startDate && summerApp.details?.endDate && (
                                  <p className="text-gray-600">
                                    Duration: {new Date(summerApp.details.startDate).toLocaleDateString()} - {new Date(summerApp.details.endDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              {summerApp.status === 'needs_info' && summerApp.adminRemarks && (
                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <p className="text-xs font-medium text-yellow-900 mb-1">Admin Remarks:</p>
                                  <p className="text-xs text-yellow-800">{summerApp.adminRemarks}</p>
                                </div>
                              )}
                            </>
                          );
                        } else {
                          return (
                            <p>Submit summer internship evidence or register for solo project</p>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              ) : selectedTrack === 'internship' ? (
                <div className="space-y-6">
                  {/* 6-Month Internship Application Status */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900">6-Month Internship Application</h3>
                      {(() => {
                        const sixMonthApp = getInternshipApplication('6month');
                        if (!sixMonthApp) {
                          return (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full font-medium">
                              Not Submitted
                            </span>
                          );
                        }
                        return (
                          <StatusBadge 
                            status={
                              sixMonthApp.status === 'verified_pass' ? 'success' :
                              sixMonthApp.status === 'verified_fail' ? 'error' :
                              sixMonthApp.status === 'absent' ? 'error' :
                              sixMonthApp.status === 'needs_info' ? 'error' :
                              sixMonthApp.status === 'pending_verification' ? 'info' :
                              sixMonthApp.status === 'submitted' ? 'info' :
                              'warning'
                            }
                            text={
                              sixMonthApp.status === 'verified_pass' ? 'Verified (Pass)' :
                              sixMonthApp.status === 'verified_fail' ? 'Verified (Fail)' :
                              sixMonthApp.status === 'absent' ? 'Absent' :
                              sixMonthApp.status === 'needs_info' ? 'Update Required' :
                              sixMonthApp.status === 'pending_verification' ? 'Pending Verification' :
                              sixMonthApp.status === 'submitted' ? 'Submitted' :
                              sixMonthApp.status
                            }
                          />
                        );
                      })()}
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      {(() => {
                        const sixMonthApp = getInternshipApplication('6month');
                        if (!sixMonthApp) {
                          return (
                            <>
                              <p>Submit your 6-month internship application with company details</p>
                              <Link
                                to="/student/sem7/internship/apply/6month"
                                className="inline-flex items-center mt-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                Submit Application
                              </Link>
                            </>
                          );
                        }
                        return (
                          <>
                            <div className="space-y-1">
                              <p className="font-medium text-gray-900">Company: {sixMonthApp.details?.companyName || 'N/A'}</p>
                              {sixMonthApp.details?.startDate && sixMonthApp.details?.endDate && (
                                <p className="text-gray-600">
                                  Duration: {new Date(sixMonthApp.details.startDate).toLocaleDateString()} - {new Date(sixMonthApp.details.endDate).toLocaleDateString()}
                                </p>
                              )}
                              {sixMonthApp.details?.offerLetterLink && (
                                <p className="text-gray-600">
                                  <a href={sixMonthApp.details.offerLetterLink} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 underline">
                                    View Offer Letter
                                  </a>
                                </p>
                              )}
                            </div>
                            {(sixMonthApp.status === 'needs_info' || sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent') && sixMonthApp.adminRemarks && (
                              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-xs font-medium text-yellow-900 mb-1">Admin Remarks:</p>
                                <p className="text-xs text-yellow-800">{sixMonthApp.adminRemarks}</p>
                              </div>
                            )}
                            {sixMonthApp.status === 'needs_info' && (
                              <Link
                                to={`/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit`}
                                className="inline-flex items-center mt-2 px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
                              >
                                Update Application
                              </Link>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Sem 8 Coursework Requirement */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Semester 8 Requirements</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Coursework Required:</span>
                        <span className="font-medium text-blue-900">Yes</span>
                      </div>
                      {(() => {
                        const sixMonthApp = getInternshipApplication('6month');
                        const isBacklog = sixMonthApp && (sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent');
                        return (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Backlog (Major Project 1):</span>
                            <span className={`font-medium ${isBacklog ? 'text-red-900' : 'text-green-900'}`}>
                              {isBacklog ? 'Yes' : 'No'}
                            </span>
                          </div>
                        );
                      })()}
                      <p className="text-xs text-gray-500 mt-2">
                        {(() => {
                          const sixMonthApp = getInternshipApplication('6month');
                          if (sixMonthApp && (sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent')) {
                            return 'You must complete Major Project 1 as backlog in Semester 8 due to internship verification failure/absence.';
                          }
                          return 'Semester 8 coursework is mandatory for all students who completed 6-month internship in Semester 7.';
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="pt-4 border-t border-gray-200">
                    {(() => {
                      const sixMonthApp = getInternshipApplication('6month');
                      if (!sixMonthApp) {
                        return (
                          <Link
                            to="/student/sem7/internship/apply/6month"
                            className="inline-flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Submit Internship Application
                          </Link>
                        );
                      }
                      if (sixMonthApp.status === 'needs_info') {
                        return (
                          <Link
                            to={`/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit`}
                            className="inline-flex items-center justify-center w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Update Application
                          </Link>
                        );
                      }
                      return (
                        <Link
                          to={`/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit`}
                          className="inline-flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          View Application Details
                        </Link>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Select your track to see status</p>
              )}
            </div>
          </div>
        ) : isSem8 ? (
          /* Sem 8 Status Overview Card */
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {isType1 ? 'Coursework Overview' : 
                 (sem8FinalizedTrack || sem8TrackChoice?.chosenTrack) === 'internship' ? '6-Month Internship Overview' : 
                 (sem8FinalizedTrack || sem8TrackChoice?.chosenTrack) === 'major2' ? 'Major Project 2 Overview' : 
                 'Semester 8 Overview'}
              </h2>
            </div>
            <div className="p-6">
              {sem8Loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : ((isType1 && (sem8FinalizedTrack || sem8TrackChoice?.chosenTrack) === 'coursework') || (isType2 && (sem8FinalizedTrack || sem8TrackChoice?.chosenTrack) === 'major2')) ? (
                <div className="space-y-6">
                  {/* Major Project 2 Status */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900">Major Project 2</h3>
                      {(() => {
                        if (majorProject2) {
                          return (
                            <StatusBadge 
                              status={
                                majorProject2.faculty || majorProject2Group?.allocatedFaculty ? 'success' : 'info'
                              }
                              text={
                                majorProject2.faculty || majorProject2Group?.allocatedFaculty ? 'Active' : 'Pending Faculty'
                              }
                            />
                          );
                        } else if (isType1 && majorProject2Group?.status === 'finalized') {
                          return (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                              Ready to Register
                            </span>
                          );
                        } else if (isType2 && (sem8FinalizedTrack || sem8TrackChoice?.chosenTrack) === 'major2') {
                          return (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                              Ready to Register
                            </span>
                          );
                        }
                        return (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full font-medium">
                            Not Registered
                          </span>
                        );
                      })()}
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      {majorProject2 ? (
                        <>
                          <p className="font-medium text-gray-900">{majorProject2.title}</p>
                          {majorProject2.faculty || majorProject2Group?.allocatedFaculty ? (
                            <>
                              <p>Faculty: {majorProject2.faculty?.fullName || majorProject2Group?.allocatedFaculty?.fullName}</p>
                              <p className="text-green-600 font-medium">✓ Project active and allocated</p>
                            </>
                          ) : (
                            <>
                              <p className="text-yellow-600 font-medium">⏳ Waiting for faculty allocation</p>
                              <p className="text-xs text-gray-500">Your project is registered and pending faculty assignment</p>
                            </>
                          )}
                        </>
                      ) : isType1 ? (
                        <>
                          {majorProject2Group?.status === 'finalized' ? (
                            <>
                              <p className="text-green-600 font-medium">✓ Group finalized</p>
                              <p className="text-sm text-gray-600">Your group is ready. Register your Major Project 2 now.</p>
                            </>
                          ) : majorProject2Group ? (
                            <>
                              <p className="text-blue-600 font-medium">👥 Group formed</p>
                              <p className="text-sm text-gray-600">Finalize your group to proceed with project registration.</p>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-700">Form a group and register for Major Project 2</p>
                              <p className="text-xs text-gray-500 mt-1">Create or join a group to start your Major Project 2</p>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-gray-700">Register for Major Project 2 (solo project)</p>
                          <p className="text-xs text-gray-500 mt-1">Complete project registration to begin your solo Major Project 2</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Internship 2 Status - Only for Type 1 students (Type 2 students on major2 track only do Major Project 2) */}
                  {isType1 && (
                  <div className="border-l-4 border-teal-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900">Internship 2</h3>
                      {(() => {
                        if (internship2Project) {
                          return (
                            <StatusBadge 
                              status={internship2Project.faculty ? 'success' : 'info'}
                              text={internship2Project.faculty ? 'Active' : 'Pending Faculty'}
                            />
                          );
                        }
                        const summerApp = sem8GetInternshipApplication('summer');
                        if (summerApp) {
                          if (summerApp.status === 'approved' || summerApp.status === 'verified_pass') {
                            return <StatusBadge status="success" text="Evidence Approved" />;
                          } else if (summerApp.status === 'verified_fail' || summerApp.status === 'absent') {
                            return <StatusBadge status="error" text="Project Required" />;
                          } else if (summerApp.status === 'needs_info') {
                            return <StatusBadge status="error" text="Update Required" />;
                          }
                          return <StatusBadge status="info" text={summerApp.status} />;
                        }
                        return (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full font-medium">
                            Not Started
                          </span>
                        );
                      })()}
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      {(() => {
                        const summerApp = sem8GetInternshipApplication('summer');
                        
                        // Check for placeholder values
                        const wasAssignedOrChangedByAdmin = summerApp?.adminRemarks === 'Assigned by admin' || 
                          (summerApp?.adminRemarks && (
                            summerApp.adminRemarks.includes('Assigned by admin') ||
                            summerApp.adminRemarks.includes('Switched from Internship-I under Institute Faculty')
                          )) ||
                          summerApp?.internship1TrackChangedByAdminAt;
                        
                        const hasPlaceholderValues = summerApp && 
                          summerApp.status === 'submitted' && 
                          wasAssignedOrChangedByAdmin && (
                            !summerApp.details?.companyName || 
                            summerApp.details?.companyName === 'To be provided by student' ||
                            summerApp.details?.companyName === 'N/A - Assigned to Internship 1 Project' ||
                            (summerApp.details?.startDate && summerApp.details?.endDate && 
                             new Date(summerApp.details.startDate).getTime() === new Date(summerApp.details.endDate).getTime()) ||
                            !summerApp.details?.completionCertificateLink ||
                            !summerApp.details?.roleOrNatureOfWork
                          );
                        
                        if (internship2Project) {
                          return (
                            <>
                              <p className="font-medium text-gray-900">{internship2Project.title}</p>
                              {internship2Project.faculty ? (
                                <>
                                  <p>Faculty: {internship2Project.faculty.fullName}</p>
                                  <p className="text-green-600 font-medium">✓ Project active and allocated</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-yellow-600 font-medium">⏳ Waiting for faculty allocation</p>
                                  <p className="text-xs text-gray-500">Your project is registered and pending faculty assignment</p>
                                </>
                              )}
                            </>
                          );
                        } else if (summerApp) {
                          if (summerApp.status === 'approved' || summerApp.status === 'verified_pass') {
                            return (
                              <>
                                <p className="text-green-700 font-medium">✓ Evidence approved</p>
                                <p className="text-sm text-gray-600">Your 2-month summer internship evidence has been approved. No Internship 2 project required.</p>
                                <div className="mt-2 space-y-1">
                                  {summerApp.details?.companyName && (
                                    <p className="text-xs text-gray-600">Company: {summerApp.details.companyName}</p>
                                  )}
                                  {summerApp.details?.startDate && summerApp.details?.endDate && (
                                    <p className="text-xs text-gray-600">
                                      Duration: {new Date(summerApp.details.startDate).toLocaleDateString()} - {new Date(summerApp.details.endDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </>
                            );
                          } else if (summerApp.status === 'verified_fail' || summerApp.status === 'absent') {
                            return (
                              <>
                                <p className="text-red-700 font-medium">✗ Evidence rejected</p>
                                <p className="text-sm text-gray-600">Your summer internship evidence was not approved. You must register for an Internship 2 solo project.</p>
                                {summerApp.adminRemarks && (
                                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-xs font-medium text-red-900 mb-1">Admin Remarks:</p>
                                    <p className="text-xs text-red-800">{summerApp.adminRemarks}</p>
                                  </div>
                                )}
                              </>
                            );
                          } else if (summerApp.status === 'needs_info') {
                            return (
                              <>
                                <p className="text-yellow-700 font-medium">⚠️ Update Required</p>
                                <p className="text-sm text-gray-600">Additional information is required for your summer internship evidence.</p>
                                {summerApp.adminRemarks && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-xs font-medium text-yellow-900 mb-1">Admin Remarks:</p>
                                    <p className="text-xs text-yellow-800">{summerApp.adminRemarks}</p>
                                  </div>
                                )}
                              </>
                            );
                          } else if (hasPlaceholderValues) {
                            return (
                              <>
                                <p className="text-red-700 font-medium">🚨 URGENT: Complete Application</p>
                                <p className="text-sm text-gray-600">Your application contains placeholder values. Fill in all details immediately.</p>
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-xs font-medium text-red-900 mb-1">Required:</p>
                                  <ul className="text-xs text-red-800 list-disc list-inside space-y-1">
                                    <li>Company name and details</li>
                                    <li>Actual internship start and end dates</li>
                                    <li>Completion certificate link</li>
                                    <li>Role/nature of work</li>
                                  </ul>
                                </div>
                              </>
                            );
                          } else if (summerApp.status === 'submitted' || summerApp.status === 'pending_verification') {
                            return (
                              <>
                                <p className="text-blue-700 font-medium">⏳ Pending Verification</p>
                                <p className="text-sm text-gray-600">Your summer internship evidence is submitted and awaiting admin review.</p>
                                <div className="mt-2 space-y-1">
                                  {summerApp.details?.companyName && (
                                    <p className="text-xs text-gray-600">Company: {summerApp.details.companyName}</p>
                                  )}
                                  {summerApp.details?.startDate && summerApp.details?.endDate && (
                                    <p className="text-xs text-gray-600">
                                      Duration: {new Date(summerApp.details.startDate).toLocaleDateString()} - {new Date(summerApp.details.endDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <div className="space-y-1">
                                  {summerApp.details?.companyName && (
                                    <p className="font-medium text-gray-900">Company: {summerApp.details.companyName}</p>
                                  )}
                                  {summerApp.details?.startDate && summerApp.details?.endDate && (
                                    <p className="text-gray-600">
                                      Duration: {new Date(summerApp.details.startDate).toLocaleDateString()} - {new Date(summerApp.details.endDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </>
                            );
                          }
                        } else {
                          return (
                            <>
                              <p className="text-gray-700">Submit summer internship evidence or register for solo project</p>
                              <p className="text-xs text-gray-500 mt-1">Complete your 2-month summer internship requirement</p>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>
                  )}
                </div>
              ) : (sem8FinalizedTrack || sem8TrackChoice?.chosenTrack) === 'internship' ? (
                <div className="space-y-6">
                  {/* 6-Month Internship Application Status */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900">6-Month Internship Application</h3>
                      {(() => {
                        const sixMonthApp = sem8GetInternshipApplication('6month');
                        if (!sixMonthApp) {
                          return (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full font-medium">
                              Not Submitted
                            </span>
                          );
                        }
                        return (
                          <StatusBadge 
                            status={
                              sixMonthApp.status === 'verified_pass' ? 'success' :
                              sixMonthApp.status === 'verified_fail' ? 'error' :
                              sixMonthApp.status === 'absent' ? 'error' :
                              sixMonthApp.status === 'needs_info' ? 'error' :
                              sixMonthApp.status === 'pending_verification' ? 'info' :
                              sixMonthApp.status === 'submitted' ? 'info' :
                              'warning'
                            }
                            text={
                              sixMonthApp.status === 'verified_pass' ? 'Verified (Pass)' :
                              sixMonthApp.status === 'verified_fail' ? 'Verified (Fail)' :
                              sixMonthApp.status === 'absent' ? 'Absent' :
                              sixMonthApp.status === 'needs_info' ? 'Update Required' :
                              sixMonthApp.status === 'pending_verification' ? 'Pending Verification' :
                              sixMonthApp.status === 'submitted' ? 'Submitted' :
                              sixMonthApp.status
                            }
                          />
                        );
                      })()}
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      {(() => {
                        const sixMonthApp = sem8GetInternshipApplication('6month');
                        if (!sixMonthApp) {
                          return (
                            <>
                              <p className="text-gray-700">Submit your 6-month internship application with company details</p>
                              <p className="text-xs text-gray-500 mt-1">Provide company information and offer letter to complete your application</p>
                            </>
                          );
                        }
                        
                        if (sixMonthApp.status === 'verified_pass') {
                          return (
                            <>
                              <p className="text-green-700 font-medium">✓ Internship Verified</p>
                              <p className="text-sm text-gray-600">Your 6-month internship has been approved and verified.</p>
                              <div className="mt-2 space-y-1">
                                <p className="font-medium text-gray-900">Company: {sixMonthApp.details?.companyName || 'N/A'}</p>
                                {sixMonthApp.details?.startDate && sixMonthApp.details?.endDate && (
                                  <p className="text-gray-600">
                                    Duration: {new Date(sixMonthApp.details.startDate).toLocaleDateString()} - {new Date(sixMonthApp.details.endDate).toLocaleDateString()}
                                  </p>
                                )}
                                {sixMonthApp.details?.offerLetterLink && (
                                  <p className="text-gray-600">
                                    <a href={sixMonthApp.details.offerLetterLink} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 underline">
                                      View Offer Letter
                                    </a>
                                  </p>
                                )}
                              </div>
                            </>
                          );
                        } else if (sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent') {
                          return (
                            <>
                              <p className="text-red-700 font-medium">✗ Verification Failed</p>
                              <p className="text-sm text-gray-600">Your 6-month internship application was not approved.</p>
                              {sixMonthApp.adminRemarks && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-xs font-medium text-red-900 mb-1">Admin Remarks:</p>
                                  <p className="text-xs text-red-800">{sixMonthApp.adminRemarks}</p>
                                </div>
                              )}
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-600">Company: {sixMonthApp.details?.companyName || 'N/A'}</p>
                              </div>
                            </>
                          );
                        } else if (sixMonthApp.status === 'needs_info') {
                          return (
                            <>
                              <p className="text-yellow-700 font-medium">⚠️ Update Required</p>
                              <p className="text-sm text-gray-600">Additional information is required for your application.</p>
                              {sixMonthApp.adminRemarks && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <p className="text-xs font-medium text-yellow-900 mb-1">Admin Remarks:</p>
                                  <p className="text-xs text-yellow-800">{sixMonthApp.adminRemarks}</p>
                                </div>
                              )}
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-600">Company: {sixMonthApp.details?.companyName || 'N/A'}</p>
                              </div>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <p className="text-blue-700 font-medium">⏳ {sixMonthApp.status === 'submitted' ? 'Submitted' : 'Pending Verification'}</p>
                              <p className="text-sm text-gray-600">Your application is {sixMonthApp.status === 'submitted' ? 'submitted' : 'pending verification'}.</p>
                              <div className="mt-2 space-y-1">
                                <p className="font-medium text-gray-900">Company: {sixMonthApp.details?.companyName || 'N/A'}</p>
                                {sixMonthApp.details?.startDate && sixMonthApp.details?.endDate && (
                                  <p className="text-gray-600">
                                    Duration: {new Date(sixMonthApp.details.startDate).toLocaleDateString()} - {new Date(sixMonthApp.details.endDate).toLocaleDateString()}
                                  </p>
                                )}
                                {sixMonthApp.details?.offerLetterLink && (
                                  <p className="text-gray-600">
                                    <a href={sixMonthApp.details.offerLetterLink} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 underline">
                                      View Offer Letter
                                    </a>
                                  </p>
                                )}
                              </div>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="pt-4 border-t border-gray-200">
                    {(() => {
                      const sixMonthApp = sem8GetInternshipApplication('6month');
                      if (!sixMonthApp) {
                        return (
                          <Link
                            to="/student/sem8/internship/apply/6month"
                            className="inline-flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Submit Internship Application
                          </Link>
                        );
                      }
                      if (sixMonthApp.status === 'needs_info') {
                        return (
                          <Link
                            to={`/student/sem8/internship/apply/6month/${sixMonthApp._id}/edit`}
                            className="inline-flex items-center justify-center w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Update Application
                          </Link>
                        );
                      }
                      return (
                        <Link
                          to={`/student/sem8/internship/apply/6month/${sixMonthApp._id}/edit`}
                          className="inline-flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          View Application Details
                        </Link>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  {isType2 ? 'Select your track to see status' : 'Loading status...'}
                </p>
              )}
            </div>
          </div>
        ) : isSem6 || isSem5 ? (
          /* Sem 5/6 Group Status Card */
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Group Status</h2>
            </div>
            <div className="p-6">
              {isSem6 ? (
                // Sem 6 Group
                sem6ProjectLoading ? (
                  <div className="text-center py-6">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <p className="text-gray-500">Loading group information...</p>
                    </div>
                  </div>
                ) : sem6Group ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{sem6Group.name}</h3>
                      <StatusBadge status={sem6Group.status} />
                    </div>
                    
                    {!sem6Project && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">📋 Your Sem 5 Group</span> - This group will continue in Semester 6 after registration.
                        </p>
                      </div>
                    )}
                    
                    {sem6Project && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-green-800">
                          <strong>✓ Same Group:</strong> Your group from Semester 5 continues in Semester 6
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Members:</span>
                        <span className="ml-2 font-medium">
                          {sem6Group.members?.filter(m => m.isActive).length || 0}/{sem6Group.maxMembers || 5}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Faculty:</span>
                        <span className="ml-2 font-medium">
                          {sem6Group.allocatedFaculty?.fullName || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {sem6Group.members && sem6Group.members.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Group Members</h4>
                        <div className="space-y-2">
                          {sem6Group.members
                            .filter(member => member.isActive)
                            .map((member, index) => (
                              <div key={member.student?._id || index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                  member.role === 'leader' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {member.student?.fullName?.charAt(0) || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {member.student?.fullName || 'Unknown Member'}
                                    </p>
                                    {member.role === 'leader' && (
                                      <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-medium">
                                        👑 Leader
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 truncate">
                                    {member.student?.misNumber || 'MIS# -'} 
                                    {member.student?.branch && ` • ${member.student.branch}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>

                        <Link
                          to={`/student/groups/${sem6Group._id}/dashboard`}
                          className="mt-4 inline-flex items-center justify-center w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                          View Group Dashboard
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  // No group found - Show warning message
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <svg className="mx-auto h-16 w-16 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 max-w-2xl mx-auto">
                      <h3 className="text-lg font-semibold text-orange-900 mb-2">
                        ⚠️ No Group Found
                      </h3>
                      <p className="text-sm text-orange-800 mb-4">
                        You are currently not part of any group for Semester 6. Group creation was available in Semester 5, and groups are carried forward to Semester 6.
                      </p>
                      <div className="bg-white border border-orange-200 rounded-md p-4 text-left">
                        <p className="text-sm font-medium text-gray-900 mb-2">What to do:</p>
                        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                          <li>Contact your admin to be added to a group</li>
                          <li>Check if you missed group formation in Semester 5</li>
                          <li>Admin can manually assign you to an existing group</li>
                        </ul>
                      </div>
                      <div className="mt-4 pt-4 border-t border-orange-200">
                        <p className="text-xs text-gray-600">
                          <strong>Note:</strong> You cannot register for Semester 6 project without being part of a group. Please contact your admin for assistance.
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // Sem 5 Group (existing code)
                sem5Group ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{sem5Group.name}</h3>
                    <StatusBadge status={sem5Group.status} />
                  </div>
                  
                  {/* Group Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Members:</span>
                      <span className="ml-2 font-medium">
                        {(
                          sem5Group?.activeMemberCount ?? (sem5Group.members?.filter?.(m => m.isActive).length || 0)
                        )}/{sem5Group?.maxMembers || getGroupStats().maxMembers}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Available Slots:</span>
                      <span className="ml-2 font-medium">{
                        (() => {
                          const current = sem5Group?.activeMemberCount ?? (sem5Group.members?.filter?.(m => m.isActive).length || 0);
                          const max = sem5Group?.maxMembers || getGroupStats().maxMembers;
                          return Math.max(0, (max || 0) - (current || 0));
                        })()
                      }</span>
                    </div>
                  </div>

                  {/* Group Members - Show when group is finalized or has been finalized before */}
                  {(sem5Group.status === 'finalized' || sem5Group.finalizedAt) && sem5Group.members && sem5Group.members.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Group Members</h4>
                      <div className="space-y-2">
                        {sem5Group.members
                          .filter(member => member.isActive)
                          .map((member, index) => (
                          <div key={member.student?._id || index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              member.role === 'leader' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {member.student?.fullName?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {member.student?.fullName || 'Unknown Member'}
                                </p>
                                {member.role === 'leader' && (
                                  <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-medium">
                                    👑 Leader
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {member.student?.misNumber || 'MIS# -'} 
                                {member.student?.branch && ` • ${member.student.branch}`}
                              </p>
                            </div>
                            <div className="text-xs text-gray-400">
                              {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Finalized status indicator - Show if group was ever finalized */}
                      {(sem5Group.status === 'finalized' || sem5Group.finalizedAt) && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-xs font-medium text-green-800">
                              Group Finalized • {sem5Group.finalizedAt ? new Date(sem5Group.finalizedAt).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Warning for incomplete groups */}
                  {(
                    sem5Group?.activeMemberCount ?? (sem5Group.members?.filter?.(m => m.isActive).length || 0)
                  ) < (sem5Group?.minMembers || minGroupMembers) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <div className="text-yellow-400 mr-3">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Group Not Complete</p>
                          <p className="text-xs text-yellow-700">You need at least {sem5Group?.minMembers || minGroupMembers} members to register your project</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Group Progress - Only show if group is not finalized */}
                  {sem5Group.status !== 'finalized' && !sem5Group.finalizedAt && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Group Formation Progress</span>
                        <span>{(() => {
                          const current = sem5Group?.activeMemberCount ?? (sem5Group.members?.filter?.(m => m.isActive).length || 0);
                          const max = sem5Group?.maxMembers || getGroupStats().maxMembers || maxGroupMembers;
                          return `${Math.round((current / max) * 100)}%`;
                        })()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300 bg-blue-600"
                          style={{ 
                            width: (() => {
                              const current = sem5Group?.activeMemberCount ?? (sem5Group.members?.filter?.(m => m.isActive).length || 0);
                              const max = sem5Group?.maxMembers || getGroupStats().maxMembers || maxGroupMembers;
                              return `${Math.round((current / max) * 100)}%`;
                            })()
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {/* Actions */}
                  <div className="mt-4 space-y-2">
                    <Link
                      to={`/student/groups/${sem5Group._id}/dashboard`}
                      className={`block w-full text-center px-4 py-2 text-white text-sm font-medium rounded-md ${
                        sem5Group.status === 'finalized'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {sem5Group.status === 'finalized' 
                        ? 'View Finalized Group' 
                        : 'View Group Dashboard'
                      }
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-700 mb-2">No Group Yet</p>
                  <p className="text-gray-500 text-sm">Use the Quick Actions above to create your group</p>
                </div>
              )
              )}
            </div>
          </div>
        ) : (
          /* Sem 4 Evaluation Schedule Card */
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Evaluation Schedule</h2>
            </div>
            <div className="p-6">
              {evaluationSchedule ? (
                <div className="space-y-4">
                  <StatusBadge status="scheduled" />
                  <div>
                    <h3 className="font-medium text-gray-900">Presentation Scheduled</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Date: {evaluationSchedule.presentationDates[0]?.date}<br />
                      Time: {evaluationSchedule.presentationDates[0]?.time}<br />
                      Venue: {evaluationSchedule.presentationDates[0]?.venue}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Evaluation Panel</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {evaluationSchedule.presentationDates[0]?.panelMembers.map((member, index) => (
                        <li key={index}>• {member.name} ({member.role})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Evaluation Schedule Set</h3>
                  <p className="text-gray-600 mb-2">
                    The evaluation schedule has not been set by the administration yet.
                  </p>
                  <p className="text-sm text-gray-500">
                    This will be updated once the admin schedules the evaluation dates.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Previous Projects Section - Only for Sem 5+ students with projects from previous semesters (but not Sem 7) */}
      {((roleData?.semester || user?.semester) || 4) > 4 && !isSem7 && (
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Previous Semester Projects</h2>
            <p className="text-sm text-gray-500 mt-1">
              Completed projects from previous semesters (chat and actions disabled)
            </p>
          </div>
          <div className="p-6">
            {previousProjectsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading previous projects...</span>
              </div>
            ) : previousProjects.length > 0 ? (
              <div className="space-y-4">
                {previousProjects
                  .filter(p => p.status === 'completed' || p.semester < currentSemester)
                  .map((project, index) => (
                    <div key={project._id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 flex items-center">
                            {project.title}
                            {project.isContinuation && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                Continued
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Semester {project.semester} • {project.projectType === 'minor1' ? 'Minor Project 1' : 
                                                            project.projectType === 'minor2' ? 'Minor Project 2' :
                                                            project.projectType === 'minor3' ? 'Minor Project 3' : project.projectType}
                          </p>
                        </div>
                        <StatusBadge status={project.status} />
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>Registered: {new Date(project.createdAt).toLocaleDateString()}</span>
                          {project.faculty && (
                            <span>Faculty: {project.faculty?.fullName || 'N/A'}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-gray-400">
                          <span>🔒</span>
                          <span>View Only</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No previous semester projects found</p>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Information Section - Hide for Sem 7 */}
      {!isSem7 && (
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">
          {isSem6 
            ? "About Minor Project 3" 
            : isSem5 
            ? "About Minor Project 2" 
            : "About Minor Project 1"}
        </h2>
        <div className="text-blue-800 space-y-2">
          {isSem6 ? (
            <>
              <p>• Group project continuation from Semester 5 ({minGroupMembers}-{maxGroupMembers} members)</p>
              <p>• Continue your Sem 5 project OR start a new project</p>
              <p>• Same group members and faculty supervisor from Sem 5</p>
              <p>• Advanced features and project continuation</p>
              <p>• Duration: 4-5 months</p>
            </>
          ) : isSem5 ? (
            <>
              <p>• Group project for B.Tech 5th semester students ({minGroupMembers}-{maxGroupMembers} members)</p>
              <p>• Focus on advanced programming concepts and team collaboration</p>
              <p>• Includes group formation, faculty allocation, and project management</p>
              <p>• Duration: 4-5 months</p>
              <p>• Evaluation: Group presentation and individual contribution assessment</p>
            </>
          ) : (
            degree === 'M.Tech' && currentSemester === 1 ? (
              <>
                <p>• Individual project for MTech 1th semester students</p>
                <p>• Focus on problem-solving</p>
                <p>• Includes PPT presentation and evaluation by faculty panel</p>
                <p>• Duration: 3-4 months</p>
                <p>• Evaluation: 100% internal assessment</p>
              </>
            ) : (
              <>
                <p>• Individual project for B.Tech 4th semester students</p>
                <p>• Focus on basic programming concepts and problem-solving</p>
                <p>• Includes PPT presentation and evaluation by faculty panel</p>
                <p>• Duration: 3-4 months</p>
                <p>• Evaluation: 100% internal assessment</p>
              </>
            )
          )}
        </div>
      </div>
      )}
    </div>
    </>
  );
};

export default StudentDashboard;