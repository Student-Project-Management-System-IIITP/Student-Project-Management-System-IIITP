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
import { formatFacultyName } from '../../utils/formatUtils';
import { 
  FiCheck, FiX, FiUsers, FiUser, FiUserCheck, FiFileText, FiCalendar, FiAlertCircle, 
  FiCheckCircle, FiClock, FiArrowRight, FiFolder, FiSettings,
  FiTrendingUp, FiActivity, FiLoader, FiEdit, FiEye, FiPlus,
  FiAlertTriangle, FiTarget, FiFile, FiAlertOctagon, FiClipboard, FiZap, FiStar, FiInfo, FiMail, FiLock, FiBook, FiBriefcase
} from 'react-icons/fi';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, roleData, isLoading: authLoading } = useAuth();

  // Icon mapping helper
  const getIcon = (iconName, className = "w-5 h-5") => {
    const icons = {
      'edit': <FiEdit className={className} />,
      'fileText': <FiFileText className={className} />,
      'eye': <FiEye className={className} />,
      'users': <FiUsers className={className} />,
      'plus': <FiPlus className={className} />,
      'checkCircle': <FiCheckCircle className={className} />,
      'alertTriangle': <FiAlertTriangle className={className} />,
      'target': <FiTarget className={className} />,
      'file': <FiFile className={className} />,
      'alertOctagon': <FiAlertOctagon className={className} />,
      'clock': <FiClock className={className} />,
      'clipboard': <FiClipboard className={className} />,
      'zap': <FiZap className={className} />,
    };
    return icons[iconName] || null;
  };
  const [mtechProject, setMtechProject] = useState(null);
  const [mtechLoading, setMtechLoading] = useState(false);
  const [mtechSem2Project, setMtechSem2Project] = useState(null);
  const [showSem3Welcome, setShowSem3Welcome] = useState(false);
  const [sem3InternshipApp, setSem3InternshipApp] = useState(null);
  const [sem3AppLoading, setSem3AppLoading] = useState(false);
  
  // Only use M.Tech Sem 3 track hook for M.Tech Sem 3+ students
  const isMTechSem3Plus = roleData?.degree === 'M.Tech' && (roleData?.semester >= 3);
  const { trackChoice: sem3TrackChoice, loading: sem3ChoiceLoading } = useMTechSem3Track();
  const sem3SelectedTrack = isMTechSem3Plus ? (sem3TrackChoice?.finalizedTrack || sem3TrackChoice?.chosenTrack || null) : null;

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
    getMajorProject1ProgressSteps,
    getInternship1ProgressSteps,
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
    getMajorProject2ProgressSteps,
    getInternship2ProgressSteps,
    getSixMonthInternshipProgressSteps,
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
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <FiLoader className="h-6 w-6 animate-spin text-primary-600" />
          <p className="text-neutral-600">Loading dashboard...</p>
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
      
      // Reset state first to ensure clean state
      setSem6Project(null);
      setSem6Group(null);
      
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
          
          if (groupsResponse.success && Array.isArray(groupsResponse.data)) {
            // The group field might be an ObjectId string or a populated object
            const groupId = typeof sem6ProjectData.group === 'string' 
              ? sem6ProjectData.group 
              : sem6ProjectData.group._id;
            
            const sem6GroupData = groupsResponse.data.find(
              g => g._id === groupId || g._id.toString() === groupId.toString()
            );
            
            // Explicitly set to null if not found (student was removed from group)
            setSem6Group(sem6GroupData || null);
          } else {
            // No groups data or invalid response - student is not in any group
            setSem6Group(null);
          }
        } else {
          // If no Sem 6 project registered yet, check for Sem 5 or Sem 6 group
          // (Sem 5 group might have been updated to Sem 6 after promotion)
          const groupsResponse = await studentAPI.getGroups({ allSemesters: true });
          if (groupsResponse.success && Array.isArray(groupsResponse.data)) {
            // Check for Sem 6 group first (in case it was updated), then Sem 5
            const sem6GroupData = groupsResponse.data.find(g => g.semester === 6);
            const sem5GroupData = groupsResponse.data.find(g => g.semester === 5);
            const groupData = sem6GroupData || sem5GroupData;
            
            // Explicitly set to null if not found (student is not in any group)
            setSem6Group(groupData || null);
            } else {
            // No groups data or invalid response - student is not in any group
              setSem6Group(null);
            }
          }
      } else {
        // No projects found or invalid response - reset group state
        setSem6Project(null);
        setSem6Group(null);
      }
    } catch (error) {
      console.error('Error loading Sem 6 project:', error);
      // On error, reset state to ensure no stale data is shown
      setSem6Project(null);
      setSem6Group(null);
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
            icon: 'edit',
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
        icon: 'edit',
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
          icon: 'edit',
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
          icon: 'eye',
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
          icon: 'edit',
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
          icon: 'eye',
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
          icon: 'users',
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
                icon: 'edit',
                link: '/student/sem5/register',
                color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
                textColor: 'text-blue-800',
              });
            } else {
              actions.push({
                title: 'Register Minor Project 2',
                description: 'Only group leader can register project details',
                icon: 'edit',
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
          icon: 'users',
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
          icon: 'users', 
          link: '/student/groups/create',
          color: 'bg-green-50 border-green-200 hover:bg-green-100',
          textColor: 'text-green-800',
        });
      }

      // Add Project Dashboard link if faculty is allocated (Sem 5)
      if (sem5Project && sem5Project._id && hasFacultyAllocated && typeof hasFacultyAllocated === 'function' && hasFacultyAllocated()) {
        actions.push({
          title: 'Project Dashboard',
          description: 'View your project dashboard',
          icon: 'clipboard',
          link: `/projects/${sem5Project._id}`,
          color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
          textColor: 'text-purple-800',
        });
      }
    } else if (currentSemester === 6) {
      // Sem 6 actions
      if (!sem6Project) {
        // Only show register option if student has a Sem 6 group AND faculty is allocated
        if (sem6Group && !sem6ProjectLoading) {
          // Check if group has allocated faculty
          const hasFaculty = sem6Group.allocatedFaculty || sem6Group.allocatedFaculty?._id;
          if (hasFaculty) {
          actions.push({
            title: 'Register Minor Project 3',
            description: 'Register your Minor Project 3 (continue or new)',
            icon: 'edit',
            link: '/student/sem6/register',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
          }
          // If no faculty, don't show register button (message will be shown in status section)
        } else if (!sem6ProjectLoading && !sem6Group) {
          // Student has no group - don't show action (message is shown in Group Status section)
          // No action needed here
        }
      }

      // Show group dashboard if group exists
      if (sem6Group) {
        actions.push({
          title: 'Group Dashboard',
          description: 'Manage your project group',
          icon: 'users',
          link: `/student/groups/${sem6Group._id}/dashboard`,
          color: 'bg-green-50 border-green-200 hover:bg-green-100',
          textColor: 'text-green-800',
        });
      }

      // Add Project Dashboard link if project exists and faculty is allocated (Sem 6)
      if (sem6Project && sem6Project._id) {
        const hasFaculty = sem6Project.faculty || sem6Project.faculty?._id || 
                           sem6Group?.allocatedFaculty || sem6Group?.allocatedFaculty?._id ||
                           sem6Project.status === 'faculty_allocated';
        if (hasFaculty) {
          actions.push({
            title: 'Project Dashboard',
            description: 'View your project dashboard',
            icon: 'clipboard',
            link: `/projects/${sem6Project._id}`,
            color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
            textColor: 'text-purple-800',
        });
        }
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
              icon: 'target',
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
            icon: 'edit',
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
            icon: 'file',
            link: '/student/sem7/internship/apply/6month',
            color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
            textColor: 'text-purple-800',
          });
        } else if (sixMonthApp.status === 'needs_info') {
          actions.push({
            title: 'Update Internship Application',
            description: 'Provide additional information',
            icon: 'edit',
            link: `/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        } else if (sixMonthApp.status === 'pending') {
          actions.push({
            title: 'View Application Status',
            description: 'Application submitted, awaiting admin review',
            icon: 'clock',
            link: `/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else if (sixMonthApp.status === 'approved') {
          actions.push({
            title: 'Application Approved',
            description: 'Your internship application has been approved',
            icon: 'checkCircle',
            link: `/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-green-50 border-green-200 hover:bg-green-100',
            textColor: 'text-green-800',
          });
        }
      }
      
      // Coursework track actions - dynamic action buttons based on status
      if (selectedTrack === 'coursework') {
        // Major Project 1 Actions
        // Check if project exists first (highest priority)
        if (majorProject1) {
          actions.push({
            title: 'Major Project 1 Dashboard',
            description: 'Manage your group and project',
            icon: 'clipboard',
            link: '/student/sem7/major1/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else if (majorProject1Group?.status === 'finalized' || majorProject1Group?.status === 'locked') {
          // Group is finalized or locked (locked means project is registered)
          // If locked, project exists but might not be loaded yet
          actions.push({
            title: 'Major Project 1 - Register',
            description: majorProject1Group?.status === 'locked' ? 'View your registered project' : 'Group finalized - register your project now',
            icon: 'checkCircle',
            link: '/student/sem7/major1/dashboard',
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        } else if (majorProject1Group || isInGroup) {
          // Check both majorProject1Group and isInGroup to catch members who just joined
          actions.push({
            title: 'Major Project 1 - Finalize Group',
            description: 'Finalize your group to register project',
            icon: 'users',
            link: '/student/sem7/major1/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else {
          actions.push({
            title: 'Major Project 1 - Create Group',
            description: 'Create a group for Major Project 1',
            icon: 'plus',
            link: '/student/sem7/major1/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        }

        // Internship 1 Actions
        const summerApp = getInternshipApplication('summer');
        if (hasApprovedSummerInternship) {
          actions.push({
            title: 'Internship 1 - Approved',
            description: 'View your approved internship status',
            icon: 'checkCircle',
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
              title: 'Internship 1 - URGENT: Complete',
              description: 'Application has placeholder values - fill in all details',
              icon: 'alertOctagon',
              link: `/student/sem7/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-red-50 border-red-300 hover:bg-red-100',
              textColor: 'text-red-800',
            });
          } else if (summerApp.adminRemarks === 'Assigned by admin') {
            // Fresh assignment by admin to summer internship application track
            actions.push({
              title: 'Internship 1 - Submit Application',
              description: 'Assigned by admin - submit your summer internship details',
              icon: 'edit',
              link: `/student/sem7/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
              textColor: 'text-orange-800',
            });
          } else {
            // Regular submitted application
            actions.push({
              title: 'Internship 1 - Application',
              description: 'View or update your summer internship application',
              icon: 'clipboard',
              link: `/student/sem7/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
              textColor: 'text-orange-800',
            });
          }
        } else if (summerApp && (summerApp.status === 'verified_fail' || summerApp.status === 'absent')) {
          // Application rejected - show registration link
          if (internship1Project) {
            actions.push({
              title: 'Internship 1 Dashboard',
              description: 'View your registered solo project',
              icon: 'clipboard',
              link: '/student/sem7/internship1/dashboard',
              color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
              textColor: 'text-orange-800',
            });
          } else {
            actions.push({
              title: 'Internship 1 - Register',
              description: 'Application rejected - register for solo project',
              icon: 'alertTriangle',
              link: '/student/sem7/internship1/register',
              color: 'bg-red-50 border-red-200 hover:bg-red-100',
              textColor: 'text-red-800',
            });
          }
        } else if (summerApp?.status === 'needs_info') {
          actions.push({
            title: 'Internship 1 - Update Required',
            description: 'Update required - fix your summer internship application',
            icon: 'alertTriangle',
            link: `/student/sem7/internship/apply/summer/${summerApp._id}/edit`,
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        } else if (summerApp) {
          actions.push({
            title: 'Internship 1 Dashboard',
            description: 'View your summer internship application status',
            icon: 'edit',
            link: '/student/sem7/internship1/dashboard',
            color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
            textColor: 'text-orange-800',
          });
        } else if (internship1Project) {
          actions.push({
            title: 'Internship 1 Dashboard',
            description: 'View your registered solo project',
            icon: 'clipboard',
            link: '/student/sem7/internship1/dashboard',
            color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
            textColor: 'text-orange-800',
          });
        } else {
          actions.push({
            title: 'Internship 1 - Start',
            description: 'Submit evidence or register solo project',
            icon: 'zap',
            link: '/student/sem7/internship1/dashboard',
            color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
            textColor: 'text-orange-800',
          });
        }
      }

      // Add Project Dashboard link if faculty is allocated (Sem 7 - Major Project 1)
      if (majorProject1 && majorProject1._id) {
        const hasFaculty = majorProject1.faculty || majorProject1.faculty?._id || 
                           majorProject1Group?.allocatedFaculty || majorProject1Group?.allocatedFaculty?._id ||
                           majorProject1.status === 'faculty_allocated';
        if (hasFaculty) {
          actions.push({
            title: 'Major Project 1 - Project Dashboard',
            description: 'Open full project dashboard with deliverables',
            icon: 'clipboard',
            link: `/projects/${majorProject1._id}`,
            color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
            textColor: 'text-purple-800',
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
              icon: 'target',
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
            icon: 'edit',
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
            icon: 'file',
            link: '/student/sem8/internship/apply/6month',
            color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
            textColor: 'text-purple-800',
          });
        } else if (sixMonthApp.status === 'needs_info') {
          actions.push({
            title: 'Update Internship Application',
            description: 'Provide additional information required',
            icon: 'edit',
            link: `/student/sem8/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        } else if (sixMonthApp.status === 'verified_pass') {
          actions.push({
            title: '✓ Internship Verified',
            description: 'Your 6-month internship has been approved',
            icon: 'checkCircle',
            link: `/student/sem8/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-green-50 border-green-200 hover:bg-green-100',
            textColor: 'text-green-800',
          });
        } else if (sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent') {
          actions.push({
            title: '✗ Internship Verification Failed',
            description: 'View details and next steps',
            icon: 'alertTriangle',
            link: `/student/sem8/internship/apply/6month/${sixMonthApp._id}/edit`,
            color: 'bg-red-50 border-red-200 hover:bg-red-100',
            textColor: 'text-red-800',
          });
        } else if (sixMonthApp.status === 'submitted' || sixMonthApp.status === 'pending_verification') {
          actions.push({
            title: 'View Application Status',
            description: 'Check your internship application status',
            icon: 'clipboard',
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
            icon: 'clipboard',
            link: '/student/sem8/major2/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else if (isType1 && majorProject2Group?.status === 'finalized') {
          actions.push({
            title: 'Register Major Project 2',
            description: 'Group finalized - register your project now',
            icon: 'checkCircle',
            link: '/student/sem8/major2/dashboard',
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            textColor: 'text-yellow-800',
          });
        } else if (isType1 && majorProject2Group) {
          actions.push({
            title: 'Finalize Group',
            description: 'Finalize your group to register Major Project 2',
            icon: 'users',
            link: '/student/sem8/major2/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else if (isType1 && !majorProject2Group) {
          actions.push({
            title: 'Create Group',
            description: 'Create a group for Major Project 2',
            icon: 'plus',
            link: '/student/sem8/major2/dashboard',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
            textColor: 'text-blue-800',
          });
        } else if (isType2) {
          actions.push({
            title: 'Register Major Project 2',
            description: 'Register your solo Major Project 2',
            icon: 'edit',
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
              icon: 'checkCircle',
              link: '/student/sem8/internship2/dashboard',
              color: 'bg-green-50 border-green-200 hover:bg-green-100',
              textColor: 'text-green-800',
            });
          } else if (internship2Project) {
            // Internship 2 project registered
            actions.push({
              title: 'View Internship 2',
              description: 'View your registered solo project',
              icon: 'clipboard',
              link: '/student/sem8/internship2/dashboard',
              color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
              textColor: 'text-orange-800',
            });
          } else if (summerApp && (summerApp.status === 'verified_fail' || summerApp.status === 'absent')) {
            // Summer internship failed/absent - must register Internship 2 project
            actions.push({
              title: 'Register Internship 2',
              description: 'Summer internship failed - register solo project required',
              icon: 'alertOctagon',
              link: '/student/sem8/internship2/register',
              color: 'bg-red-50 border-red-200 hover:bg-red-100',
              textColor: 'text-red-800',
            });
          } else if (summerApp && summerApp.status === 'needs_info') {
            // Summer app needs update
            actions.push({
              title: 'Update Summer Evidence',
              description: 'Provide additional information for summer internship',
              icon: 'edit',
              link: `/student/sem8/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
              textColor: 'text-yellow-800',
            });
          } else if (hasPlaceholderValues) {
            // URGENT: Application has placeholder values
            actions.push({
              title: 'URGENT: Complete Application',
              description: 'Summer application has placeholder values - fill immediately',
              icon: 'alertOctagon',
              link: `/student/sem8/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-red-50 border-red-300 hover:bg-red-100',
              textColor: 'text-red-800',
            });
          } else if (summerApp && summerApp.status === 'submitted') {
            // Summer app submitted, waiting for verification
            actions.push({
              title: 'View Summer Evidence',
              description: 'Check your summer internship evidence status',
              icon: 'clipboard',
              link: `/student/sem8/internship/apply/summer/${summerApp._id}/edit`,
              color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
              textColor: 'text-blue-800',
            });
          } else if (internship2Status?.eligible) {
            // Eligible for Internship 2 but no summer app submitted yet
            actions.push({
              title: 'Start Internship 2',
              description: 'Submit summer evidence or register solo project',
              icon: 'zap',
              link: '/student/sem8/internship2/dashboard',
              color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
              textColor: 'text-orange-800',
            });
          }
        }
      }

      // Add Project Dashboard link if faculty is allocated (Sem 8 - Major Project 2)
      if (majorProject2 && majorProject2._id) {
        const hasFaculty = majorProject2.faculty || majorProject2.faculty?._id || 
                           majorProject2Group?.allocatedFaculty || majorProject2Group?.allocatedFaculty?._id ||
                           majorProject2.status === 'faculty_allocated';
        if (hasFaculty) {
          actions.push({
            title: 'Project Dashboard',
            description: 'View your Major Project 2 dashboard',
            icon: 'clipboard',
            link: `/projects/${majorProject2._id}`,
            color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
            textColor: 'text-purple-800',
          });
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
              Hey {user?.name || roleData?.fullName || 'there'}!
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

      {/* 3-Column Dashboard Layout with Independent Scrolling */}
      <div className="h-[calc(100vh-64px)] overflow-hidden bg-surface-200">
        <div className="max-w-full mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Left Sidebar - Welcome & Quick Actions */}
          <div className="lg:col-span-2 bg-surface-300 border-r border-neutral-200 overflow-y-auto custom-scrollbar">
            <div className="p-4 space-y-4">
              {/* Welcome Card */}
              <div className="bg-gradient-to-br from-primary-600 to-secondary-600 rounded-xl p-4 shadow-md">
                <p className="text-s text-white/80 mb-1">
                  Welcome!
                </p>
                <h2 className="text-base font-bold text-white mb-2">
                  {roleData?.fullName || user?.fullName || user?.name || 'Student'}
                </h2>
                <div className="flex items-center justify-between text-sm text-white/90">
                  <span>{degree}</span>
                  <span className="font-semibold">Sem {currentSemester}</span>
                </div>
      </div>

              {/* Quick Actions - Compact List */}
              {!(degree === 'M.Tech' && currentSemester === 1 && mtechProject) && quickActions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiTrendingUp className="w-4 h-4 text-secondary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Quick Actions</h3>
                  </div>
                  <div className="space-y-2">
                    {quickActions.map((action, index) => (
                      <Link
                        key={index}
                        to={action.link}
                        className="block p-3 rounded-lg border border-neutral-200 bg-surface-100 hover:bg-surface-200 hover:border-primary-300 transition-all group shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 text-primary-600">{getIcon(action.icon, "w-5 h-5")}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-neutral-800 group-hover:text-primary-700 transition-colors">
                              {action.title}
                            </h4>
                          </div>
                          <FiArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-primary-600 transition-colors flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Sem 4: Project Progress Tracker */}
              {currentSemester === 4 && degree === 'B.Tech' && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiClock className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Progress</h3>
              </div>
                  <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                    <div className="space-y-3">
                    {/* Registration Step */}
                    <div className="flex items-start gap-2">
                      {sem4Project ? (
                        <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-neutral-800">Registration</p>
                        <p className="text-[11px] text-neutral-600">
                          {sem4Project ? 'Completed' : 'Not started'}
        </p>
                      </div>
      </div>

                    {/* Evaluation Schedule Step */}
                    <div className="flex items-start gap-2">
                      {evaluationSchedule ? (
                        <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-neutral-800">Evaluation Scheduled</p>
                        <p className="text-[11px] text-neutral-600">
                          {evaluationSchedule ? 'Date announced' : 'Awaiting schedule'}
                        </p>
                      </div>
                    </div>

                    {/* PPT Upload Step */}
                    <div className="flex items-start gap-2">
                      {projectStatus?.pptSubmitted ? (
                        <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-neutral-800">PPT Upload</p>
                        <p className="text-xs text-neutral-600">
                          {projectStatus?.pptSubmitted ? 'Uploaded ✓' : sem4Project && evaluationSchedule ? 'Ready to upload' : 'Not available yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              )}


              {/* Sem 5: Project Progress Tracker */}
              {currentSemester === 5 && (
                  <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiClock className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Progress</h3>
                  </div>
                  <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                    <div className="space-y-3">
                      {/* Create Group Step */}
                      <div className="flex items-start gap-2">
                        {sem5Group ? (
                          <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Create Group</p>
                          <p className="text-[11px] text-neutral-600">
                            {sem5Group ? 'Completed' : 'Not started'}
                          </p>
                </div>
                      </div>

                      {/* Finalize Group Step */}
                      <div className="flex items-start gap-2">
                        {sem5Group?.status === 'finalized' || sem5Group?.finalizedAt ? (
                          <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Finalize Group</p>
                          <p className="text-[11px] text-neutral-600">
                            {sem5Group?.status === 'finalized' || sem5Group?.finalizedAt ? 'Completed' : sem5Group ? 'In progress' : 'Awaiting group'}
                          </p>
                </div>
                      </div>

                      {/* Register Project Step */}
                      <div className="flex items-start gap-2">
                        {sem5Project ? (
                          <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Register Project</p>
                          <p className="text-[11px] text-neutral-600">
                            {sem5Project ? 'Completed' : (sem5Group?.status === 'finalized' || sem5Group?.finalizedAt) ? 'Ready to register' : 'Not available yet'}
                          </p>
              </div>
                      </div>

                      {/* Faculty Allocation Step */}
                      <div className="flex items-start gap-2">
                        {hasFacultyAllocated() ? (
                          <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Faculty Allocation</p>
                          <p className="text-[11px] text-neutral-600">
                            {hasFacultyAllocated() ? 'Assigned' : sem5Project ? 'Awaiting allocation' : 'Not available yet'}
                          </p>
                        </div>
                      </div>
                    </div>
          </div>
        </div>
      )}

              {/* Sem 6: Project Progress Tracker */}
              {currentSemester === 6 && (
                  <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiClock className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Progress</h3>
                  </div>
                  <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                    <div className="space-y-3">
                      {/* Group from Sem 5 Step */}
                      <div className="flex items-start gap-2">
                        {sem6Group ? (
                          <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Group from Sem 5</p>
                          <p className="text-[11px] text-neutral-600">
                            {sem6Group ? 'Group available' : 'No group found'}
                          </p>
                </div>
          </div>

                      {/* Faculty Allocation Step */}
                      <div className="flex items-start gap-2">
                        {sem6Group?.allocatedFaculty || sem6Group?.allocatedFaculty?._id ? (
                          <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Faculty Allocation</p>
                          <p className="text-[11px] text-neutral-600">
                            {sem6Group?.allocatedFaculty || sem6Group?.allocatedFaculty?._id ? 'Assigned' : sem6Group ? 'Awaiting allocation' : 'Not available yet'}
                          </p>
        </div>
                      </div>

                      {/* Register Project Step */}
                      <div className="flex items-start gap-2">
                        {sem6Project ? (
                          <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Register Project</p>
                          <p className="text-[11px] text-neutral-600">
                            {sem6Project ? 'Completed' : (sem6Group?.allocatedFaculty || sem6Group?.allocatedFaculty?._id) ? 'Ready to register' : 'Not available yet'}
                          </p>
                        </div>
                      </div>

                      {/* Project Active Step */}
                      <div className="flex items-start gap-2">
                        {sem6Project && (sem6Project.faculty || sem6Project.group?.allocatedFaculty) ? (
                          <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        )}
                  <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Project Active</p>
                          <p className="text-[11px] text-neutral-600">
                            {sem6Project && (sem6Project.faculty || sem6Project.group?.allocatedFaculty) ? 'Dashboard available' : sem6Project ? 'Awaiting faculty' : 'Not registered'}
                          </p>
                      </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 7: Separate Progress Trackers */}
              {currentSemester === 7 && finalizedTrack === 'coursework' && (
                <div className="space-y-4">
                  {/* Major Project 1 Progress Tracker */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <FiClock className="w-4 h-4 text-primary-600" />
                      <h3 className="text-sm font-semibold text-neutral-800">Major Project 1 Progress</h3>
                    </div>
                    <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                      <div className="space-y-3">
                        {getMajorProject1ProgressSteps().map((step, index) => (
                          <div key={step.id} className="flex items-start gap-2">
                            {step.completed ? (
                              <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                            ) : step.status === 'current' ? (
                              <div className="w-4 h-4 rounded-full border-2 border-primary-500 bg-primary-50 mt-0.5 flex-shrink-0"></div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                            )}
                            <div className="flex-1">
                              <p className="text-xs font-medium text-neutral-800">{step.title}</p>
                              <p className="text-[11px] text-neutral-600">{step.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Internship 1 Progress Tracker */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <FiClock className="w-4 h-4 text-orange-600" />
                      <h3 className="text-sm font-semibold text-neutral-800">Internship 1 Progress</h3>
                    </div>
                    <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                      <div className="space-y-3">
                        {getInternship1ProgressSteps().map((step, index) => (
                          <div key={step.id} className="flex items-start gap-2">
                            {step.completed ? (
                              <FiCheckCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            ) : step.status === 'current' ? (
                              <div className="w-4 h-4 rounded-full border-2 border-orange-500 bg-orange-50 mt-0.5 flex-shrink-0"></div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                            )}
                            <div className="flex-1">
                              <p className="text-xs font-medium text-neutral-800">{step.title}</p>
                              <p className="text-[11px] text-neutral-600">{step.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 7: Track Selection Progress (when no track selected) */}
              {currentSemester === 7 && !finalizedTrack && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiClock className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Progress</h3>
                  </div>
                  <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                    <div className="space-y-3">
                      {/* Choose Track Step */}
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Choose Track</p>
                          <p className="text-[11px] text-neutral-600">
                            Select Coursework or Internship track
                          </p>
                        </div>
                      </div>
                      
                      {/* Track Approval Step */}
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Track Approval</p>
                          <p className="text-[11px] text-neutral-600">
                            Awaiting track selection
                          </p>
                        </div>
                      </div>

                      {/* Proceed with Track Step */}
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Proceed with Track</p>
                          <p className="text-[11px] text-neutral-600">
                            Not available yet
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 7: Internship Track Progress */}
              {currentSemester === 7 && finalizedTrack === 'internship' && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiClock className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Progress</h3>
                  </div>
                  <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                    <div className="space-y-3">
                      {/* Track Selection Step */}
                      <div className="flex items-start gap-2">
                        {trackChoice?.chosenTrack === 'internship' || finalizedTrack === 'internship' ? (
                          <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Choose Track</p>
                          <p className="text-[11px] text-neutral-600">
                            {finalizedTrack === 'internship' ? 'Approved' : trackChoice?.chosenTrack === 'internship' ? 'Selected' : 'Not started'}
                          </p>
                        </div>
                      </div>

                      {/* Submit 6-Month Internship Application Step */}
                      <div className="flex items-start gap-2">
                          {(() => {
                            const sixMonthApp = getInternshipApplication('6month');
                            return !!sixMonthApp;
                          })() ? (
                            <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                          )}
                          <div className="flex-1">
                            <p className="text-xs font-medium text-neutral-800">Submit 6-Month Internship Application</p>
                            <p className="text-[11px] text-neutral-600">
                              {(() => {
                                const sixMonthApp = getInternshipApplication('6month');
                                if (!sixMonthApp) return finalizedTrack === 'internship' ? 'Ready to submit' : 'Awaiting track approval';
                                if (sixMonthApp.status === 'verified_pass') return 'Verified (Pass)';
                                if (sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent') return 'Verification failed';
                                if (sixMonthApp.status === 'needs_info') return 'Update required';
                                return 'Submitted';
                              })()}
                            </p>
                          </div>
                      </div>
                    
                      {/* Internship Verification Step */}
                      <div className="flex items-start gap-2">
                        {(() => {
                          const sixMonthApp = getInternshipApplication('6month');
                          return sixMonthApp && (sixMonthApp.status === 'verified_pass' || sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent');
                        })() ? (
                          <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-800">Internship Verification</p>
                          <p className="text-[11px] text-neutral-600">
                            {(() => {
                              const sixMonthApp = getInternshipApplication('6month');
                              if (!sixMonthApp) return 'Not available yet';
                              if (sixMonthApp.status === 'verified_pass') return 'Verified (Pass)';
                              if (sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent') return 'Failed/Absent';
                              return 'Pending verification';
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 8: Progress Trackers */}
              {currentSemester === 8 && (
                <div className="space-y-4">
                  {/* Type 1: Major Project 2 + Internship 2 Trackers */}
                  {isType1 && sem8FinalizedTrack === 'coursework' && (
                    <>
                      {/* Major Project 2 Progress Tracker */}
                      <div>
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <FiClock className="w-4 h-4 text-primary-600" />
                          <h3 className="text-sm font-semibold text-neutral-800">Major Project 2 Progress</h3>
                        </div>
                        <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                          <div className="space-y-3">
                            {getMajorProject2ProgressSteps().map((step, index) => (
                              <div key={step.id} className="flex items-start gap-2">
                                {step.completed ? (
                                  <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                                ) : step.status === 'current' ? (
                                  <div className="w-4 h-4 rounded-full border-2 border-primary-500 bg-primary-50 mt-0.5 flex-shrink-0"></div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                                )}
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-neutral-800">{step.title}</p>
                                  <p className="text-[11px] text-neutral-600">{step.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Internship 2 Progress Tracker (if eligible) */}
                      {internship2Status?.eligible && (
                        <div>
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <FiClock className="w-4 h-4 text-orange-600" />
                            <h3 className="text-sm font-semibold text-neutral-800">Internship 2 Progress</h3>
                          </div>
                          <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                            <div className="space-y-3">
                              {getInternship2ProgressSteps().map((step, index) => (
                                <div key={step.id} className="flex items-start gap-2">
                                  {step.completed ? (
                                    <FiCheckCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                  ) : step.status === 'current' ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-orange-500 bg-orange-50 mt-0.5 flex-shrink-0"></div>
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                                  )}
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-neutral-800">{step.title}</p>
                                    <p className="text-[11px] text-neutral-600">{step.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Type 2: Internship Track - 6-Month Internship Progress Tracker */}
                  {isType2 && (sem8FinalizedTrack === 'internship' || sem8TrackChoice?.chosenTrack === 'internship') && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <FiClock className="w-4 h-4 text-purple-600" />
                        <h3 className="text-sm font-semibold text-neutral-800">6-Month Internship Progress</h3>
                      </div>
                      <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                        <div className="space-y-3">
                          {getSixMonthInternshipProgressSteps().map((step, index) => (
                            <div key={step.id} className="flex items-start gap-2">
                              {step.completed ? (
                                <FiCheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              ) : step.status === 'current' ? (
                                <div className="w-4 h-4 rounded-full border-2 border-purple-500 bg-purple-50 mt-0.5 flex-shrink-0"></div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                              )}
                              <div className="flex-1">
                                <p className="text-xs font-medium text-neutral-800">{step.title}</p>
                                <p className="text-[11px] text-neutral-600">{step.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Type 2: Major Project 2 Track - Major Project 2 + Internship 2 Trackers */}
                  {isType2 && (sem8FinalizedTrack === 'major2' || sem8TrackChoice?.chosenTrack === 'major2') && (
                    <>
                      {/* Major Project 2 Progress Tracker */}
                      <div>
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <FiClock className="w-4 h-4 text-primary-600" />
                          <h3 className="text-sm font-semibold text-neutral-800">Major Project 2 Progress</h3>
                        </div>
                        <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                          <div className="space-y-3">
                            {getMajorProject2ProgressSteps().map((step, index) => (
                              <div key={step.id} className="flex items-start gap-2">
                                {step.completed ? (
                                  <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                                ) : step.status === 'current' ? (
                                  <div className="w-4 h-4 rounded-full border-2 border-primary-500 bg-primary-50 mt-0.5 flex-shrink-0"></div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                                )}
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-neutral-800">{step.title}</p>
                                  <p className="text-[11px] text-neutral-600">{step.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Internship 2 Progress Tracker (if eligible) */}
                      {internship2Status?.eligible && (
                        <div>
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <FiClock className="w-4 h-4 text-orange-600" />
                            <h3 className="text-sm font-semibold text-neutral-800">Internship 2 Progress</h3>
                          </div>
                          <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                            <div className="space-y-3">
                              {getInternship2ProgressSteps().map((step, index) => (
                                <div key={step.id} className="flex items-start gap-2">
                                  {step.completed ? (
                                    <FiCheckCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                  ) : step.status === 'current' ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-orange-500 bg-orange-50 mt-0.5 flex-shrink-0"></div>
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-neutral-300 mt-0.5 flex-shrink-0"></div>
                                  )}
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-neutral-800">{step.title}</p>
                                    <p className="text-[11px] text-neutral-600">{step.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Type 2: No Track Chosen - Track Selection Progress */}
                  {isType2 && !sem8TrackChoice?.chosenTrack && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <FiClock className="w-4 h-4 text-primary-600" />
                        <h3 className="text-sm font-semibold text-neutral-800">Progress</h3>
                      </div>
                      <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-primary-500 bg-primary-50 mt-0.5 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-neutral-800">Choose Track</p>
                              <p className="text-[11px] text-neutral-600">Select 6-month internship or Major Project 2</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Stats */}
              <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <FiActivity className="w-4 h-4 text-primary-600" />
                  <h3 className="text-sm font-semibold text-neutral-800">Overview</h3>
                </div>
                <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-200 rounded-lg p-3 text-center">
                      <div className="font-bold text-lg text-neutral-800">{currentSemester}</div>
                      <div className="text-neutral-600 text-xs mt-1">Semester</div>
                    </div>
                    <div className="bg-surface-200 rounded-lg p-3 text-center">
                      <div className="font-bold text-lg text-neutral-800">{previousProjects.length + (sem4Project || sem5Project || sem6Project || majorProject1 || majorProject2 ? 1 : 0)}</div>
                      <div className="text-neutral-600 text-xs mt-1">Projects</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Main Content */}
          <div className="lg:col-span-8 bg-surface-200 overflow-y-auto custom-scrollbar">
            <div className="p-5 space-y-5">

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
                    <p className="text-sm text-gray-600">Faculty Allocated: {formatFacultyName(mtechProject.faculty, 'Assigned Faculty')}</p>
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

              {/* Group Invitations - Temporarily keeping here, will reorganize */}
      {((isSem5 || isSem7) && !isInGroup && groupInvitations && groupInvitations.length > 0) ||
       (isSem8 && isType1 && !majorProject2Group && sem8GroupInvitations && sem8GroupInvitations.length > 0) ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
              <FiMail className="w-4 h-4 text-primary-600" />
              Group Invitations
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium">
              {(isSem8 ? sem8GroupInvitations : groupInvitations).length} pending
            </span>
          </div>
          <p className="text-xs text-neutral-500 mb-3">
            Review and respond to invitations from other groups.
          </p>
          <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {(isSem8 ? sem8GroupInvitations : groupInvitations).map((invitation) => (
              <div
                key={invitation._id}
                className="bg-white rounded-lg border border-neutral-200 px-3 py-2.5 hover:border-primary-200 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <FiUsers className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-neutral-900 truncate">
                            {invitation.group?.name || 'Group Invitation'}
                          </p>
                          {invitation.group?.semester && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-neutral-50 border border-neutral-200 text-[10px] font-medium text-neutral-600">
                              Sem {invitation.group.semester}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 truncate">
                          Invited by {invitation.invitedBy?.fullName}
                          {invitation.invitedBy?.misNumber && ` • ${invitation.invitedBy.misNumber}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                          <FiUsers className="w-3.5 h-3.5" />
                          <span>
                            {invitation.group?.activeMemberCount || invitation.group?.members?.filter?.(m => m.isActive).length || 0}
                            /{invitation.group?.maxMembers || 5} members
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                        {invitation.group?.leader?.fullName && (
                          <span className="inline-flex items-center gap-1">
                            <FiUser className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">
                              Leader: {invitation.group.leader.fullName}
                            </span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          <span>
                            {new Date(invitation.invitedAt || invitation.createdAt).toLocaleString()}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleInvitationResponse(invitation._id, true, isSem8)}
                      disabled={invitationLoading[invitation._id]}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-success-600 text-white text-[11px] font-medium hover:bg-success-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {invitationLoading[invitation._id] ? (
                            <>
                              <svg
                                className="animate-spin h-3 w-3 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v8H4z"
                                ></path>
                              </svg>
                              <span>...</span>
                            </>
                          ) : (
                            <>
                              <FiCheck className="w-3 h-3" />
                      <span>Accept</span>
                            </>
                          )}
                    </button>
                    <button
                      onClick={() => handleInvitationResponse(invitation._id, false, isSem8)}
                      disabled={invitationLoading[invitation._id]}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-600 text-[11px] font-medium border border-red-200 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {invitationLoading[invitation._id] ? (
                            <>
                              <svg
                                className="animate-spin h-3 w-3 text-red-600"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v8H4z"
                                ></path>
                              </svg>
                              <span>...</span>
                            </>
                          ) : (
                            <>
                              <FiX className="w-3 h-3" />
                              <span>Decline</span>
                            </>
                          )}
                    </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

              {/* Main Project Status Section */}
              <div className="bg-surface-100 rounded-xl border border-neutral-200">
                <div className="px-5 py-4 border-b border-neutral-200 bg-primary-50">
                  <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                    <FiFolder className="w-5 h-5 text-primary-600" />
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
                <div className="p-5">
            {isSem7 ? (
              // Sem 7 Project Status
              sem7Loading ? (
                <div className="flex items-center justify-center py-6">
                  <FiLoader className="h-6 w-6 animate-spin text-primary-600" />
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
                                      <div className="flex items-start gap-2 mb-2">
                                        <FiAlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <p className="text-sm text-yellow-800 font-semibold mb-1">Admin Has Requested More Information</p>
                                          <p className="text-xs text-yellow-700 mb-2">
                                            The admin has reviewed your application and needs additional information. Please update your internship application with the required details.
                                          </p>
                                        </div>
                                      </div>
                                      {sixMonthApp.adminRemarks && (
                                        <div className="mt-3 p-3 bg-yellow-100 border-l-4 border-yellow-500 rounded-md">
                                          <p className="text-xs font-semibold text-yellow-900 mb-1.5 flex items-center gap-1.5">
                                            <FiInfo className="w-3.5 h-3.5" />
                                            Admin Remarks:
                                          </p>
                                          <p className="text-xs text-yellow-800 leading-relaxed whitespace-pre-wrap">{sixMonthApp.adminRemarks}</p>
                                        </div>
                                      )}
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
                      <div className="space-y-3">
                        <p className="text-sm text-gray-500">No track choice submitted yet</p>
                        <Link
                          to="/student/sem7/track-selection"
                          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <FiTarget className="w-4 h-4 mr-2" />
                          Choose Track
                        </Link>
                      </div>
                    )}

                    {/* Action Buttons Section - Show buttons/links based on track and status */}
                    {selectedTrack && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
                        {selectedTrack === 'coursework' ? (
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
                        ) : selectedTrack === 'internship' ? (
                          <div className="space-y-2">
                            {(() => {
                              const sixMonthApp = getInternshipApplication('6month');
                              if (!sixMonthApp) {
                                return (
                                  <Link
                                    to="/student/sem7/internship/apply/6month"
                                    className="inline-flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                  >
                                    <FiFileText className="w-5 h-5 mr-2" />
                                    Submit 6-Month Internship Application
                                  </Link>
                                );
                              }
                              if (sixMonthApp.status === 'needs_info') {
                                return (
                                  <div className="space-y-3">
                                    {/* Admin Remarks Alert */}
                                    {sixMonthApp.adminRemarks && (
                                      <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded-md">
                                        <div className="flex items-start gap-2 mb-2">
                                          <FiAlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <p className="text-xs font-semibold text-yellow-900 mb-1">Admin Has Requested More Information</p>
                                            <p className="text-xs text-yellow-800 leading-relaxed whitespace-pre-wrap">{sixMonthApp.adminRemarks}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    <Link
                                      to={`/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit`}
                                      className="inline-flex items-center justify-center w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                                    >
                                      <FiEdit className="w-5 h-5 mr-2" />
                                      Update Application
                                    </Link>
                                  </div>
                                );
                              }
                              return (
                                <Link
                                  to={`/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit`}
                                  className="inline-flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                  <FiEye className="w-5 h-5 mr-2" />
                                  View Application Details
                                </Link>
                              );
                            })()}
                          </div>
                        ) : null}
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
                              <div className="flex items-start gap-2 mb-2">
                                <FiAlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm text-yellow-800 font-semibold mb-1">Admin Has Requested More Information</p>
                                  <p className="text-xs text-yellow-700 mb-2">
                                    The admin has reviewed your track choice and needs additional information. Please update your track choice with the required details.
                                  </p>
                                </div>
                              </div>
                              {sem8TrackChoice?.adminRemarks && (
                                <div className="mt-3 p-3 bg-yellow-100 border-l-4 border-yellow-500 rounded-md">
                                  <p className="text-xs font-semibold text-yellow-900 mb-1.5 flex items-center gap-1.5">
                                    <FiInfo className="w-3.5 h-3.5" />
                                    Admin Remarks:
                                  </p>
                                  <p className="text-xs text-yellow-800 leading-relaxed whitespace-pre-wrap">{sem8TrackChoice.adminRemarks}</p>
                                </div>
                              )}
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
                                        <div className="flex items-start gap-2 mb-2">
                                          <FiAlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <p className="text-sm text-yellow-800 font-semibold mb-1">Admin Has Requested More Information</p>
                                            <p className="text-xs text-yellow-700 mb-2">
                                              The admin has reviewed your application and needs additional information. Please update your internship application with the required details.
                                            </p>
                                          </div>
                                        </div>
                                        {sixMonthApp.adminRemarks && (
                                          <div className="mt-3 p-3 bg-yellow-100 border-l-4 border-yellow-500 rounded-md">
                                            <p className="text-xs font-semibold text-yellow-900 mb-1.5 flex items-center gap-1.5">
                                              <FiInfo className="w-3.5 h-3.5" />
                                              Admin Remarks:
                                            </p>
                                            <p className="text-xs text-yellow-800 leading-relaxed whitespace-pre-wrap">{sixMonthApp.adminRemarks}</p>
                                          </div>
                                        )}
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
                                    <div className="flex items-start gap-2 mb-2">
                                      <FiAlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-sm text-yellow-800 font-semibold mb-1">Admin Has Requested More Information</p>
                                        <p className="text-xs text-yellow-700 mb-2">
                                          The admin has reviewed your track choice and needs additional information. Please update your track choice with the required details.
                                        </p>
                                      </div>
                                    </div>
                                    {sem8TrackChoice?.adminRemarks && (
                                      <div className="mt-3 p-3 bg-yellow-100 border-l-4 border-yellow-500 rounded-md">
                                        <p className="text-xs font-semibold text-yellow-900 mb-1.5 flex items-center gap-1.5">
                                          <FiInfo className="w-3.5 h-3.5" />
                                          Admin Remarks:
                                        </p>
                                        <p className="text-xs text-yellow-800 leading-relaxed whitespace-pre-wrap">{sem8TrackChoice.adminRemarks}</p>
                                      </div>
                                    )}
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
                        <div className="space-y-3">
                          <p className="text-sm text-gray-500">No track choice submitted yet</p>
                          <Link
                            to="/student/sem8/track-selection"
                            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            <FiTarget className="w-4 h-4 mr-2" />
                            Choose Track
                          </Link>
                        </div>
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
                // Check if faculty is allocated
                (() => {
                  const hasFaculty = sem6Project.faculty || sem6Project.group?.allocatedFaculty;
                  
                  return hasFaculty ? (
                    // Faculty allocated - show project card
                <div className="space-y-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                <FiFolder className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                                <h3 className="text-lg font-semibold text-gray-900">Minor Project 3</h3>
                                <p className="text-sm text-gray-500">Project Dashboard</p>
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
                                  {formatFacultyName(sem6Project.faculty) || formatFacultyName(sem6Project.group?.allocatedFaculty) || 'Loading...'}
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
                      
                          <StatusBadge status="success" text="Active" />
                      </div>
                      
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                          <Link 
                            to={`/projects/${sem6Project._id}`} 
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            <FiEye className="w-4 h-4" />
                            View Project Dashboard
                  </Link>
                          {sem6Group && (
                            <Link 
                              to={`/student/groups/${sem6Group._id}/dashboard`} 
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 border border-neutral-300 transition-colors"
                            >
                              <FiUsers className="w-4 h-4" />
                              Group
                            </Link>
                          )}
                </div>
                      </div>
                    </div>
                  ) : (
                    // Show waiting message when faculty is not allocated
                    <div className="space-y-4">
                      {/* Success Status Card */}
                      <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                              <FiCheckCircle className="w-5 h-5 text-success-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-success-900 mb-1">
                              Project Registered Successfully
                            </h3>
                            <p className="text-xs text-success-700">
                              Your Minor Project 3 has been registered and is pending faculty allocation.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Project Information Card */}
                      <div className="bg-white border border-neutral-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                          <FiFileText className="w-4 h-4 text-primary-600" />
                          Registered Project Details
                        </h4>
                        <div className="space-y-2.5">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-neutral-600 min-w-[80px]">Title:</span>
                            <span className="text-xs text-neutral-900 flex-1">{sem6Project.title || 'N/A'}</span>
                          </div>
                          {sem6Project.domain && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-neutral-600 min-w-[80px]">Domain:</span>
                              <span className="text-xs text-neutral-900 flex-1">{sem6Project.domain}</span>
                            </div>
                          )}
                          {sem6Project.isContinuation && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-neutral-600 min-w-[80px]">Type:</span>
                              <span className="text-xs text-neutral-900 flex-1">Continuation from Sem 5</span>
                            </div>
                          )}
                          {sem6Project.createdAt && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-neutral-600 min-w-[80px]">Registered:</span>
                              <span className="text-xs text-neutral-900 flex-1">
                                {new Date(sem6Project.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Waiting Status Card */}
                      <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-warning-100 rounded-full flex items-center justify-center">
                              <FiClock className="w-5 h-5 text-warning-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-warning-900 mb-1">
                              Waiting for Faculty Allocation
                            </h4>
                            <p className="text-xs text-warning-700">
                              The project dashboard will be available once a faculty guide has been assigned by the admin.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : sem6Group ? (
                // Student has a group but no project registered yet - show step-by-step guidance
                (() => {
                  // Check if student is group leader - compare with roleData._id (student ID)
                  const studentId = roleData?._id;
                  const isSem6Leader = studentId && sem6Group.leader && (
                    (typeof sem6Group.leader === 'object' && sem6Group.leader._id?.toString() === studentId.toString()) ||
                    (typeof sem6Group.leader === 'string' && sem6Group.leader.toString() === studentId.toString()) ||
                    sem6Group.members?.some(m => 
                      m.role === 'leader' && (
                        (m.student?._id?.toString() === studentId.toString()) ||
                        (typeof m.student === 'string' && m.student.toString() === studentId.toString())
                      )
                    )
                  );
                  
                  // Check if group has allocated faculty
                  const hasFaculty = sem6Group.allocatedFaculty || sem6Group.allocatedFaculty?._id;
                  const groupStatus = sem6Group.status;
                  
                  // Check if group is finalized (for Sem 6, groups from Sem 5 are usually finalized)
                  const isFinalized = groupStatus === 'finalized' || groupStatus === 'locked' || sem6Group.finalizedAt;
                  
                  if (!hasFaculty) {
                    // Faculty not allocated - show warning message with group info
                    return (
                      <div className="space-y-4">
                        {/* Group Info Card */}
                        <div className="bg-info-50 border border-info-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-info-100 rounded-full flex items-center justify-center">
                                <FiUsers className="w-5 h-5 text-info-600" />
                        </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-info-900 mb-1">
                                Your Sem 5 Group Continues
                              </h4>
                              <p className="text-xs text-info-700 mb-2">
                                Group: <span className="font-medium">{sem6Group.name}</span>
                              </p>
                              <p className="text-xs text-info-700">
                                Members: {sem6Group.members?.filter(m => m.isActive).length || 0}/{sem6Group.maxMembers || 5}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Faculty Not Allocated Warning */}
                        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-warning-100 rounded-full flex items-center justify-center">
                                <FiAlertTriangle className="w-5 h-5 text-warning-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-warning-900 mb-1">
                                Faculty Not Allocated
                              </h4>
                              <p className="text-xs text-warning-700 mb-3">
                                Your group does not have an allocated faculty yet. Please contact your admin to allocate a faculty before registering for Minor Project 3.
                        </p>
                              <div className="bg-white border border-warning-200 rounded-md p-3">
                                <p className="text-xs text-warning-800">
                            <span className="font-medium">Note:</span> You cannot register for Minor Project 3 until a faculty member is allocated to your group.
                          </p>
                        </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Group Dashboard Link */}
                        <Link
                          to={`/student/groups/${sem6Group._id}/dashboard`}
                          className="block w-full text-center px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 border border-neutral-300 transition-colors"
                        >
                          <FiUsers className="w-4 h-4 inline mr-2" />
                          View Group Dashboard
                        </Link>
                      </div>
                    );
                  }
                  
                  // Faculty is allocated - show registration guidance
                  if (isFinalized) {
                    // Group is finalized - show register button (only for group leader)
                  return (
                      <div className="space-y-4">
                        {/* Success Status Card */}
                        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                                <FiCheckCircle className="w-5 h-5 text-success-600" />
                  </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-success-900 mb-1">
                                Group Ready for Registration
                              </h4>
                              <p className="text-xs text-success-700">
                                Your group from Semester 5 is ready. You can now register your Minor Project 3.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Group Info */}
                        <div className="bg-gradient-to-br from-white to-neutral-50 border border-neutral-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Faculty Guide Card */}
                            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-neutral-200 shadow-sm">
                              <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                <FiUserCheck className="w-5 h-5 text-primary-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">Faculty Guide</p>
                                <p className="text-sm font-semibold text-neutral-900 truncate">
                                  {sem6Group.allocatedFaculty ? formatFacultyName(sem6Group.allocatedFaculty) : 'Not allocated'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Members Card */}
                            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-neutral-200 shadow-sm">
                              <div className="flex-shrink-0 w-10 h-10 bg-info-100 rounded-lg flex items-center justify-center">
                                <FiUsers className="w-5 h-5 text-info-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">Members</p>
                                <p className="text-sm font-semibold text-neutral-900">
                                  <span className="text-info-700">{sem6Group.members?.filter(m => m.isActive).length || 0}</span>
                                  <span className="text-neutral-400 mx-1">/</span>
                                  <span className="text-neutral-600">{sem6Group.maxMembers || 5}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Registration Button with Leader Restriction */}
                        <div className="flex flex-col gap-2">
                          {isSem6Leader ? (
                  <Link
                    to="/student/sem6/register"
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                              <FiEdit className="w-4 h-4" />
                    Register Minor Project 3
                  </Link>
                          ) : (
                            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed">
                              <FiLock className="w-4 h-4" />
                              Only Group Leader Can Register
                            </div>
                          )}
                          <Link
                            to={`/student/groups/${sem6Group._id}/dashboard`}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 border border-neutral-300 transition-colors"
                          >
                            <FiUsers className="w-4 h-4" />
                            View Group Dashboard
                          </Link>
                        </div>
                    </div>
                  );
                  } else {
                    // Group not finalized - show guidance
                    return (
                      <div className="text-center py-6">
                        <div className="text-info-400 mb-4">
                          <FiClock className="mx-auto h-12 w-12" />
                        </div>
                        <p className="text-gray-700 mb-2 font-semibold">Group Not Finalized</p>
                        <p className="text-gray-500 text-sm mb-4">
                          Your group needs to be finalized before you can register your project.
                        </p>
                        <Link
                          to={`/student/groups/${sem6Group._id}/dashboard`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <FiUsers className="w-4 h-4" />
                          View Group Dashboard
                        </Link>
                      </div>
                    );
                  }
                })()
              ) : (
                // Student has no group - show simple message (detailed info is in Group Status section)
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Project Available
                  </h3>
                  <p className="text-sm text-gray-600">
                    You need to be part of a group to register for Minor Project 3. See the Group Status section below for more information.
                  </p>
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
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <FiFolder className="w-5 h-5 text-blue-600" />
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
                                {formatFacultyName(sem5Project.faculty) || formatFacultyName(sem5Project.group?.allocatedFaculty) || 'Loading...'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <StatusBadge status="success" text="Active" />
                        </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                        <Link 
                          to={`/projects/${sem5Project._id}`} 
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <FiEye className="w-4 h-4" />
                          View Project Dashboard
                        </Link>
                        <Link 
                          to={`/student/groups/${sem5Project.group?._id || sem5Group?._id}/dashboard`} 
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 border border-neutral-300 transition-colors"
                        >
                          <FiUsers className="w-4 h-4" />
                          Group
                    </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Show waiting message when faculty is not allocated
                  <div className="space-y-4">
                    {/* Success Status Card */}
                    <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                            <FiCheckCircle className="w-5 h-5 text-success-600" />
                      </div>
                    </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-success-900 mb-1">
                            Project Registered Successfully
                    </h3>
                          <p className="text-xs text-success-700">
                            Your Minor Project 2 has been registered and is pending faculty allocation.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Project Information Card */}
                    <div className="bg-white border border-neutral-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                        <FiFileText className="w-4 h-4 text-primary-600" />
                        Registered Project Details
                      </h4>
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-neutral-600 min-w-[80px]">Title:</span>
                          <span className="text-xs text-neutral-900 flex-1">{sem5Project.title || 'N/A'}</span>
                        </div>
                        {sem5Project.domain && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-neutral-600 min-w-[80px]">Domain:</span>
                            <span className="text-xs text-neutral-900 flex-1">{sem5Project.domain}</span>
                          </div>
                        )}
                        {sem5Project.facultyPreferences && sem5Project.facultyPreferences.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-neutral-600 min-w-[80px]">Preferences:</span>
                            <div className="flex-1 flex flex-wrap gap-2">
                              {sem5Project.facultyPreferences.map((preference, index) => {
                                // Handle both populated faculty object and unpopulated ID
                                const faculty = preference.faculty;
                                const facultyName = faculty && typeof faculty === 'object' 
                                  ? formatFacultyName(faculty) 
                                  : faculty && typeof faculty === 'string'
                                  ? `Faculty ID: ${faculty.substring(0, 8)}...`
                                  : 'Unknown';
                                
                                return (
                                  <div key={preference.faculty?._id || preference.faculty || index} className="flex items-center gap-1.5 bg-primary-50 border border-primary-200 rounded-md px-2 py-1">
                                    <span className="text-[10px] font-semibold text-primary-700">
                                      {index + 1}
                                    </span>
                                    <span className="text-xs text-neutral-900">
                                      {facultyName}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {sem5Project.registeredAt && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-neutral-600 min-w-[80px]">Registered:</span>
                            <span className="text-xs text-neutral-900 flex-1">
                              {new Date(sem5Project.registeredAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Waiting Status Card */}
                    <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-warning-100 rounded-full flex items-center justify-center">
                            <FiClock className="w-5 h-5 text-warning-600" />
                        </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-warning-900 mb-1">
                            Waiting for Faculty Allocation
                          </h4>
                          <p className="text-xs text-warning-700">
                            The project dashboard will be available once a faculty guide has been assigned by the admin.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // No project registered - show step-by-step guidance with action buttons
                !isInGroup || !sem5Group ? (
                  <div className="text-center py-6">
                    <div className="text-neutral-400 mb-4">
                      <FiAlertCircle className="mx-auto h-12 w-12" />
                    </div>
                    <p className="text-neutral-700 mb-2 font-semibold">Group Required</p>
                    <p className="text-neutral-500 text-sm">You need to be part of a group to register your project</p>
                    <p className="text-neutral-400 text-xs mt-2">👇 See "Group Status" section below</p>
                  </div>
                ) : sem5Group && sem5Group.status === 'invitations_sent' ? (
                  <div className="text-center py-6">
                    <div className="text-warning-400 mb-4">
                      <FiClock className="mx-auto h-12 w-12" />
                    </div>
                    <p className="text-gray-700 mb-2 font-semibold">Invitations Sent</p>
                    <p className="text-gray-500 text-sm mb-4">Waiting for members to respond to invitations</p>
                    <Link
                      to={`/student/groups/${sem5Group._id}/dashboard`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 border border-neutral-300 transition-colors"
                    >
                      <FiUsers className="w-4 h-4" />
                      View Group
                    </Link>
                  </div>
                ) : sem5Group && sem5Group.status === 'open' ? (
                  <div className="text-center py-6">
                    <div className="text-info-400 mb-4">
                      <FiCheckCircle className="mx-auto h-12 w-12" />
                    </div>
                    <p className="text-gray-700 mb-2 font-semibold">Group Ready!</p>
                    <p className="text-gray-500 text-sm mb-4">Finalize your group to register your project</p>
                    <div className="flex flex-col gap-2">
                      <Link
                        to={`/student/groups/${sem5Group._id}/dashboard`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <FiUsers className="w-4 h-4" />
                        Finalize Group
                      </Link>
                    </div>
                  </div>
                ) : sem5Group && sem5Group.status === 'finalized' ? (
                  <div className="text-center py-6">
                    <div className="text-success-400 mb-4">
                      <FiCheckCircle className="mx-auto h-12 w-12" />
                    </div>
                    <p className="text-gray-700 mb-2 font-semibold">Group Finalized!</p>
                    <p className="text-gray-500 text-sm mb-4">You can now register your Minor Project 2</p>
                    
                    {/* Registration Button with Leader Restriction */}
                    <div className="flex flex-col gap-2">
                    {isGroupLeader ? (
                      <Link
                        to="/student/sem5/register"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                      >
                          <FiEdit className="w-4 h-4" />
                        Register Minor Project 2
                      </Link>
                    ) : (
                        <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed">
                          <FiLock className="w-4 h-4" />
                        Only Group Leader Can Register
                      </div>
                    )}
                      <Link
                        to={`/student/groups/${sem5Group._id}/dashboard`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 border border-neutral-300 transition-colors"
                      >
                        <FiUsers className="w-4 h-4" />
                        View Group
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-neutral-400 mb-4">
                      <FiClock className="mx-auto h-12 w-12" />
                    </div>
                    <p className="text-neutral-500 mb-2">Not Started</p>
                    <p className="text-neutral-400 text-sm">Complete previous steps to proceed</p>
                  </div>
                )
              )
            ) : (
              // Sem 4 Project Status (only for B.Tech Sem 4)
              (degree === 'B.Tech' && currentSemester === 4) ? (
                sem4ProjectLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <FiLoader className="h-6 w-6 animate-spin text-primary-600" />
                  </div>
                ) : sem4Project ? (
                  <div className="space-y-4">
                    {/* Project Header with View Button */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FiFileText className="w-5 h-5 text-primary-600 flex-shrink-0" />
                          <h3 className="font-bold text-neutral-800 text-base line-clamp-2">{sem4Project.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                          <FiClock className="w-4 h-4" />
                          <span>Registered: {new Date(sem4Project.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <StatusBadge status={sem4Project.status} />
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/student/projects/sem4/${sem4Project._id}`} 
                        className="flex-1 btn-primary text-center py-2.5 text-base font-medium"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <FiEye className="w-5 h-5" />
                          View Project
                        </span>
                      </Link>
                    </div>

                    {/* PPT Status Card */}
                    <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                      <div className="flex items-center gap-2 mb-3">
                        <FiFileText className="w-5 h-5 text-secondary-600" />
                        <h4 className="text-base font-bold text-neutral-800">Presentation Status</h4>
                      </div>
                      {statusLoading ? (
                        <div className="flex items-center gap-2">
                          <FiLoader className="h-5 w-5 animate-spin text-primary-600" />
                          <span className="text-sm text-neutral-600">Loading...</span>
                        </div>
                      ) : projectStatus?.pptSubmitted ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FiCheckCircle className="w-5 h-5 text-success-600" />
                            <span className="text-sm font-semibold text-success-700">
                              PPT Uploaded
                              </span>
                            </div>
                          <p className="text-sm text-neutral-700 pl-7">
                            {projectStatus.pptOriginalName || 'Presentation.pptx'}
                          </p>
                          {projectStatus.pptSubmittedAt && (
                            <p className="text-xs text-neutral-500 pl-7">
                              Uploaded: {new Date(projectStatus.pptSubmittedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ) : canUploadPPT() ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FiAlertCircle className="w-5 h-5 text-warning-600" />
                            <span className="text-sm font-semibold text-warning-700">Upload Pending</span>
                          </div>
                          <p className="text-sm text-neutral-700">
                            Evaluation is scheduled. Upload your presentation before the deadline.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FiClock className="w-5 h-5 text-neutral-500" />
                            <span className="text-sm font-medium text-neutral-700">Upload Not Available</span>
                          </div>
                          <p className="text-sm text-neutral-600">
                            Wait for evaluation schedule to be announced.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Evaluation Schedule Info (if available) */}
                    {evaluationSchedule && (
                      <div className="bg-info-50 rounded-lg p-4 border border-info-200">
                        <div className="flex items-center gap-2 mb-3">
                          <FiCalendar className="w-5 h-5 text-info-600" />
                          <h4 className="text-base font-bold text-info-800">Evaluation Schedule</h4>
                        </div>
                        <div className="space-y-1.5 text-sm text-info-700">
                          <p><strong>Date:</strong> {new Date(evaluationSchedule.date).toLocaleDateString()}</p>
                          {evaluationSchedule.time && <p><strong>Time:</strong> {evaluationSchedule.time}</p>}
                          {evaluationSchedule.venue && <p><strong>Venue:</strong> {evaluationSchedule.venue}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiFileText className="w-8 h-8 text-neutral-400" />
                    </div>
                    <p className="text-neutral-700 mb-4 text-base font-medium">No project registered yet</p>
                    <Link to={'/student/projects/register'} className="btn-primary inline-flex items-center gap-2 text-base">
                      <FiPlus className="w-5 h-5" />
                      Register for Minor Project 1
                    </Link>
                  </div>
                )
              ) : null
            )}
          </div>
        </div>

        {/* Second Card - Group Status (Sem 5/6), Evaluation Schedule (Sem 4) */}
        {!isSem7 && !isSem8 && (
          <div className="bg-surface-100 rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-200 bg-primary-50">
              <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                <FiUsers className="w-5 h-5 text-primary-600" />
                {isSem6 ? "Group Status" : "Evaluation Schedule"}
              </h2>
            </div>
            <div className="p-5">
              {isSem6 ? (
                // Sem 6 Group Status content
                <div className="space-y-4">
                  {sem6Group ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-neutral-800">Group: {sem6Group.name}</h3>
                        <StatusBadge status={sem6Group.status === 'finalized' ? 'success' : 'warning'} text={sem6Group.status} />
                      </div>
                      {sem6Group.description && (
                        <p className="text-sm text-neutral-600 mb-3">{sem6Group.description}</p>
                      )}
                      {sem6Group.allocatedFaculty && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-neutral-600 mb-1">Faculty Guide</p>
                          <p className="text-sm font-medium text-neutral-800">{formatFacultyName(sem6Group.allocatedFaculty)}</p>
                        </div>
                      )}
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <p className="text-xs font-medium text-neutral-600 mb-2">Members</p>
                        <div className="space-y-2">
                          {sem6Group.members && sem6Group.members.filter(m => m.isActive).map((member, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
                                {member.student?.fullName?.charAt(0) || '?'}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-neutral-800">{member.student?.fullName || 'Unknown'}</p>
                                <p className="text-xs text-neutral-600">{member.student?.misNumber || member.student?.rollNumber || ''} • {member.student?.branch || ''}</p>
                              </div>
                              {member.role === 'leader' && (
                                <FiStar className="w-4 h-4 text-primary-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-neutral-600 text-center py-4">No group found</p>
                  )}
                </div>
              ) : (
                // Sem 4 Evaluation Schedule content
                evaluationSchedule ? (
                  <div className="space-y-3">
                    <div className="bg-success-50 rounded-lg p-3 border border-success-200">
                      <p className="font-semibold text-sm text-success-900 mb-2 flex items-center gap-1">
                        <FiCheckCircle className="w-3.5 h-3.5" />
                        Scheduled
                      </p>
                      <div className="space-y-2 text-xs text-success-800">
                        <p><strong>Date:</strong> {evaluationSchedule.presentationDates[0]?.date}</p>
                        <p><strong>Time:</strong> {evaluationSchedule.presentationDates[0]?.time}</p>
                        <p><strong>Venue:</strong> {evaluationSchedule.presentationDates[0]?.venue}</p>
                      </div>
                    </div>
                    {evaluationSchedule.presentationDates[0]?.panelMembers && evaluationSchedule.presentationDates[0].panelMembers.length > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-success-200">
                        <p className="font-semibold text-xs text-success-900 mb-2">Panel Members</p>
                        <ul className="space-y-1 text-xs text-success-800">
                          {evaluationSchedule.presentationDates[0].panelMembers.map((member, idx) => (
                            <li key={idx}>• {member.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <FiClock className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-xs text-neutral-700 font-medium mb-1">Not Scheduled Yet</p>
                    <p className="text-xs text-neutral-500">Admin will announce dates soon</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Sem 7 Overview Card - Moved to Right Sidebar */}
        {isSem7 && (
          <div className="bg-surface-100 rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-200 bg-primary-50">
              <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                <FiFolder className="w-5 h-5 text-primary-600" />
                {selectedTrack === 'coursework' ? 'Coursework Overview' : selectedTrack === 'internship' ? '6-Month Internship Overview' : 'Semester 7 Overview'}
              </h2>
            </div>
            <div className="p-5">
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
                              <p>Faculty: {formatFacultyName(majorProject1.faculty) || formatFacultyName(majorProject1Group?.allocatedFaculty)}</p>
                            ) : (
                              <p className="text-gray-500">Waiting for faculty allocation</p>
                            )}
                          </div>
                        </>
                      ) : (majorProject1Group || isInGroup) ? (
                        <>
                          <p className="font-medium text-gray-900">Group: {majorProject1Group?.name || 'Your Group'}</p>
                          {majorProject1Group?.status === 'finalized' ? (
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
                                  <h4 className="font-bold text-red-900 mb-1 flex items-center gap-2">
                                    <FiAlertOctagon className="w-5 h-5 flex-shrink-0" />
                                    URGENT: Complete Application
                                  </h4>
                                  <p className="text-sm text-red-800 mb-2">
                                    Your application contains placeholder information. <strong>This is your TOP PRIORITY.</strong> Please fill in all required details immediately.
                                  </p>
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
                                <p>Faculty: {formatFacultyName(internship1Project.faculty)}</p>
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
                              <p className="text-blue-700 font-medium flex items-center gap-2">
                                <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                                Assigned to Summer Internship Application
                              </p>
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
                                <p className="text-blue-700 font-medium flex items-center gap-2">
                                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                                  Assigned to Internship 1 Project
                                </p>
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
                              <p>Submit your 6-month internship application with company details</p>
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

                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-info-50 rounded-lg p-4 border border-info-200">
                    <div className="flex items-start gap-3">
                      <FiInfo className="w-5 h-5 text-info-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-info-900 mb-2">Choose Your Track</h3>
                        <p className="text-xs text-info-800 mb-3">
                          To proceed with Semester 7, you need to choose between:
                        </p>
                        <div className="space-y-2 text-xs text-info-700">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold">• Coursework Track:</span>
                            <span>Major Project 1 (group) + Internship 1</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-semibold">• Internship Track:</span>
                            <span>6-Month Internship Application</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                    <p className="text-xs font-medium text-neutral-700 mb-2">What happens next?</p>
                    <ul className="space-y-1.5 text-xs text-neutral-600">
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5">1.</span>
                        <span>Choose your track (Coursework or Internship)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5">2.</span>
                        <span>Admin will review and approve your choice</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5">3.</span>
                        <span>Proceed with your selected track requirements</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}



        {/* Sem 5/6 Group Status Card */}
        {(isSem6 || isSem5) && (
          /* Sem 5/6 Group Status Card */
          <div className="bg-surface-100 rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-200 bg-primary-50">
              <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                <FiUsers className="w-5 h-5 text-primary-600" />
                Group Status
              </h2>
            </div>
            <div className="p-5">
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
                      <div className="bg-info-50 border border-info-200 rounded-lg p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <FiInfo className="w-4 h-4 flex-shrink-0 text-info-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-info-800 font-medium mb-1">
                              Your Sem 5 Group Continues
                            </p>
                            <p className="text-xs text-info-700">
                              This group from Semester 5 will continue in Semester 6. Register your Minor Project 3 to proceed.
                        </p>
                          </div>
                        </div>
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
                          {formatFacultyName(sem6Group.allocatedFaculty, 'N/A')}
                        </span>
                      </div>
                    </div>

                    {sem6Group.members && sem6Group.members.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Group Members</h4>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {sem6Group.members
                            .filter(member => member.isActive)
                            .map((member, index) => (
                              <div
                                key={member.student?._id || index}
                                className="flex items-center gap-2.5 px-2 py-1.5 bg-white rounded-lg border border-neutral-200"
                              >
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                  member.role === 'leader' 
                                      ? 'bg-primary-100 text-primary-800'
                                      : 'bg-info-100 text-info-800'
                                  }`}
                                >
                                  {member.student?.fullName?.charAt(0) || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-medium text-neutral-900 truncate">
                                      {member.student?.fullName || 'Unknown Member'}
                                    </p>
                                    {member.role === 'leader' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">
                                        <FiStar className="w-3 h-3" />
                                        <span>Leader</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-neutral-500 truncate">
                                    {member.student?.misNumber || 'MIS# -'} 
                                    {member.student?.branch && ` • ${member.student.branch}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>

                        <Link
                          to={`/student/groups/${sem6Group._id}/dashboard`}
                          className="mt-3 inline-flex items-center justify-center w-full px-4 py-2 bg-success-600 text-white text-sm font-medium rounded-lg hover:bg-success-700 transition-colors"
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
                      <h3 className="text-lg font-semibold text-orange-900 mb-2 flex items-center gap-2">
                        <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
                        No Group Found
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
                    <div>
                      <h3 className="font-medium text-gray-900">{sem5Group.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Minor Project 2 • Group overview
                      </p>
                    </div>
                    <StatusBadge status={sem5Group.status} />
                  </div>
                  
                  {/* Group Stats */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Members</span>
                      <div className="mt-0.5 text-sm font-semibold text-gray-900">
                        {(
                          sem5Group?.activeMemberCount ?? (sem5Group.members?.filter?.(m => m.isActive).length || 0)
                        )}/{sem5Group?.maxMembers || getGroupStats().maxMembers}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Available Slots</span>
                      <div className="mt-0.5 text-sm font-semibold text-gray-900">
                      {
                        (() => {
                          const current = sem5Group?.activeMemberCount ?? (sem5Group.members?.filter?.(m => m.isActive).length || 0);
                          const max = sem5Group?.maxMembers || getGroupStats().maxMembers;
                          return Math.max(0, (max || 0) - (current || 0));
                        })()
                      }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Faculty</span>
                      <div className="mt-0.5 text-sm font-semibold text-gray-900">
                        {formatFacultyName(sem5Group.allocatedFaculty, 'Not allocated')}
                      </div>
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
                    <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center">
                            <FiUsers className="w-3.5 h-3.5 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-neutral-800">Group formation progress</p>
                            <p className="text-[11px] text-neutral-500">
                              {(() => {
                                const current = sem5Group?.activeMemberCount ?? (sem5Group.members?.filter?.(m => m.isActive).length || 0);
                                const min = sem5Group?.minMembers || minGroupMembers;
                                const max = sem5Group?.maxMembers || getGroupStats().maxMembers || maxGroupMembers;
                                return `${current}/${max} members • Min required: ${min}`;
                              })()}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-primary-700">
                          {(() => {
                          const current = sem5Group?.activeMemberCount ?? (sem5Group.members?.filter?.(m => m.isActive).length || 0);
                          const max = sem5Group?.maxMembers || getGroupStats().maxMembers || maxGroupMembers;
                          return `${Math.round((current / max) * 100)}%`;
                          })()}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-1.5 rounded-full transition-all duration-300 bg-gradient-to-r from-primary-500 via-primary-400 to-success-500"
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
                      className={`w-full text-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 ${
                        sem5Group.status === 'finalized'
                          ? 'bg-success-600 hover:bg-success-700'
                          : 'bg-primary-600 hover:bg-primary-700'
                      }`}
                    >
                      <FiUsers className="w-4 h-4" />
                      {sem5Group.status === 'finalized' 
                        ? 'View Group Dashboard' 
                        : 'Manage Group'
                      }
                    </Link>
                    {/* Additional hint for non-finalized groups */}
                    {sem5Group.status !== 'finalized' && !sem5Group.finalizedAt && isGroupLeader && (
                      <div className="bg-info-50 border border-info-200 rounded-lg p-3">
                        <p className="text-xs text-info-800">
                          <FiInfo className="w-3.5 h-3.5 inline mr-1" />
                          <strong>Leader Action Required:</strong> Finalize your group to enable project registration
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-gray-400 mb-4">
                    <FiUsers className="mx-auto h-12 w-12" />
                  </div>
                  <p className="text-gray-700 mb-2 font-semibold">No Group Yet</p>
                  <p className="text-gray-500 text-sm mb-4">Create a group to start your Minor Project 2 journey</p>
                  <Link
                    to="/student/groups/create"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                    Create Group
                  </Link>
                </div>
              )
              )}
            </div>
          </div>
        )}

        {/* Sem 4 Evaluation Schedule Card */}
        {currentSemester === 4 && (
          <div className="bg-surface-100 rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-200 bg-primary-50">
              <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                <FiCalendar className="w-5 h-5 text-primary-600" />
                Evaluation Schedule
              </h2>
            </div>
            <div className="p-5">
              {evaluationSchedule ? (
                <div className="space-y-4">
                  <div className="bg-success-50 rounded-lg p-4 border border-success-200">
                    <div className="flex items-center gap-2 mb-3">
                      <FiCheckCircle className="w-5 h-5 text-success-600" />
                      <h3 className="font-bold text-base text-success-900">Presentation Scheduled</h3>
                  </div>
                    <div className="space-y-2 text-sm text-success-800">
                      <div className="flex items-start gap-2">
                        <FiCalendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p><strong>Date:</strong> {evaluationSchedule.presentationDates[0]?.date}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <FiClock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p><strong>Time:</strong> {evaluationSchedule.presentationDates[0]?.time}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <FiFolder className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p><strong>Venue:</strong> {evaluationSchedule.presentationDates[0]?.venue}</p>
                      </div>
                    </div>
                  </div>
                  {evaluationSchedule.presentationDates[0]?.panelMembers && evaluationSchedule.presentationDates[0].panelMembers.length > 0 && (
                    <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                      <div className="flex items-center gap-2 mb-3">
                        <FiUsers className="w-5 h-5 text-secondary-600" />
                        <h4 className="font-bold text-base text-neutral-800">Evaluation Panel</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-neutral-700">
                        {evaluationSchedule.presentationDates[0].panelMembers.map((member, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <FiUser className="w-4 h-4 mt-0.5 flex-shrink-0 text-neutral-500" />
                            <span>{member.name} {member.role && `(${member.role})`}</span>
                          </li>
                      ))}
                    </ul>
                  </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCalendar className="w-8 h-8 text-neutral-400" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-800 mb-2">No Evaluation Schedule Set</h3>
                  <p className="text-sm text-neutral-600 mb-2">
                    The evaluation schedule has not been set by the administration yet.
                  </p>
                  <p className="text-xs text-neutral-500">
                    This will be updated once the admin schedules the evaluation dates.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Previous Projects Section - Only for Sem 5+ students with projects from previous semesters (but not Sem 7) */}
      {((roleData?.semester || user?.semester) || 4) > 4 && !isSem7 && (
        <div className="mt-8 bg-surface-100 rounded-xl border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-200 bg-primary-50">
            <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
              <FiFolder className="w-5 h-5 text-primary-600" />
              Previous Semester Projects
            </h2>
            <p className="text-xs text-neutral-600 mt-1">
              Completed projects from previous semesters (view-only mode).
            </p>
          </div>
          <div className="p-5">
            {previousProjectsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading previous projects...</span>
              </div>
            ) : previousProjects.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {previousProjects
                  .filter(p => p.status === 'completed' || p.semester < currentSemester)
                  .map((project, index) => (
                    <div
                      key={project._id || index}
                      className="bg-white rounded-lg px-3 py-2.5 border border-neutral-200 hover:border-primary-200 hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 flex items-center gap-2">
                            {project.title}
                            {project.isContinuation && (
                              <span className="text-[11px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full border border-blue-100">
                                Continued
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Semester {project.semester} • {project.projectType === 'minor1' ? 'Minor Project 1' : 
                                                            project.projectType === 'minor2' ? 'Minor Project 2' :
                                                            project.projectType === 'minor3' ? 'Minor Project 3' : project.projectType}
                          </p>
                        </div>
                        <StatusBadge status={project.status} />
                      </div>
                      {project.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{project.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-[11px] text-gray-500">
                          <span>Registered: {new Date(project.createdAt).toLocaleDateString()}</span>
                          {project.faculty && (
                            <span>Faculty: {formatFacultyName(project.faculty, 'N/A')}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1.5 text-[11px] text-gray-400">
                            <FiLock className="w-3.5 h-3.5" />
                            <span>View only</span>
                          </div>
                          <Link 
                            to={
                              // Sem 4 Minor Project 1 (solo project) - redirect to dedicated view-only dashboard
                              project.projectType === 'minor1' && project.semester === 4
                                ? `/student/projects/sem4/${project._id}`
                                : `/projects/${project._id}`
                            }
                            className="ml-3 inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-[11px] font-medium rounded-md hover:bg-primary-700 transition-colors"
                          >
                            View Dashboard
                          </Link>
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
            </div>
          </div>

          {/* Right Sidebar - Info & Updates */}
          <div className="lg:col-span-2 bg-surface-300 border-l border-neutral-200 overflow-y-auto custom-scrollbar">
            <div className="p-4 space-y-4">

              {/* Your Project Section - Compact Design */}
              {((currentSemester === 4 && sem4Project) || 
                (currentSemester === 5 && sem5Project) || 
                (currentSemester === 6 && sem6Project) ||
                (currentSemester === 7 && majorProject1) ||
                (currentSemester === 8 && majorProject2)) && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-7 h-7 bg-gradient-to-br from-accent-600 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <FiFolder className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="text-xs font-bold text-neutral-800">Your Project</h3>
                  </div>
                  <div className="bg-gradient-to-br from-white to-primary-50 rounded-lg p-3 border border-primary-200 shadow-sm">
                    {(() => {
                      const project = currentSemester === 4 ? sem4Project : 
                                     currentSemester === 5 ? sem5Project :
                                     currentSemester === 6 ? sem6Project :
                                     currentSemester === 7 ? majorProject1 :
                                     majorProject2;
                      const projectId = project._id;
                      const projectLink = currentSemester === 4 
                        ? `/student/projects/sem4/${projectId}`
                        : `/projects/${projectId}`;
                      
                      return (
                        <div className="space-y-2">
                          {/* Project Title */}
                          <div>
                            <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wide mb-0.5">Title</p>
                            <p className="text-xs font-bold text-neutral-900 line-clamp-2 leading-tight">{project.title}</p>
                          </div>
                          
                          {/* Faculty Guide (if available) */}
                          {(project.faculty || project.group?.allocatedFaculty || 
                            (currentSemester === 5 && sem5Project?.group?.allocatedFaculty)) && (
                            <div className="pt-1.5 border-t border-primary-100">
                              <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wide mb-0.5">Faculty Guide</p>
                              <p className="text-xs font-medium text-neutral-800 leading-tight">
                                {formatFacultyName(project.faculty) || 
                                 formatFacultyName(project.group?.allocatedFaculty) ||
                                 (currentSemester === 5 && formatFacultyName(sem5Project?.group?.allocatedFaculty))}
                              </p>
                            </div>
                          )}
                          
                          {/* Registered Date */}
                          {project.createdAt && (
                            <div className="pt-1.5 border-t border-primary-100">
                              <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wide mb-0.5">Registered On</p>
                              <p className="text-xs text-neutral-700 leading-tight">{new Date(project.createdAt).toLocaleDateString()}</p>
                            </div>
                          )}
                          
                          {/* Project Dashboard Link */}
                          {projectId && (
                            <Link
                              to={projectLink}
                              className="block w-full mt-2 pt-2 border-t border-primary-200 group"
                            >
                              <div className="flex items-center justify-between group-hover:opacity-80 transition-opacity">
                                <span className="text-[11px] font-semibold text-primary-700">View Dashboard</span>
                                <FiArrowRight className="w-3 h-3 text-primary-600 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </Link>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
              
              {/* Sem 4: Evaluation Schedule */}
              {currentSemester === 4 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiCalendar className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Evaluation</h3>
                  </div>
                  <div className={`rounded-xl p-4 border ${evaluationSchedule ? 'bg-success-50 border-success-200' : 'bg-surface-100 border-neutral-200'}`}>
                    {evaluationSchedule ? (
                      <div className="space-y-3">
                        <div className="bg-white rounded-lg p-3 border border-success-200">
                          <p className="font-semibold text-sm text-success-900 mb-2 flex items-center gap-1">
                            <FiCheckCircle className="w-3.5 h-3.5" />
                            Scheduled
                          </p>
                          <div className="space-y-2 text-xs text-success-800">
                            <p><strong>Date:</strong> {evaluationSchedule.presentationDates[0]?.date}</p>
                            <p><strong>Time:</strong> {evaluationSchedule.presentationDates[0]?.time}</p>
                            <p><strong>Venue:</strong> {evaluationSchedule.presentationDates[0]?.venue}</p>
                          </div>
                        </div>
                        {evaluationSchedule.presentationDates[0]?.panelMembers && evaluationSchedule.presentationDates[0].panelMembers.length > 0 && (
                          <div className="bg-white rounded-lg p-3 border border-success-200">
                            <p className="font-semibold text-xs text-success-900 mb-2">Panel Members</p>
                            <ul className="space-y-1 text-xs text-success-800">
                              {evaluationSchedule.presentationDates[0].panelMembers.map((member, idx) => (
                                <li key={idx}>• {member.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <FiClock className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                        <p className="text-xs text-neutral-700 font-medium mb-1">Not Scheduled Yet</p>
                        <p className="text-xs text-neutral-500">Admin will announce dates soon</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sem 7: Selection Process */}
              {isSem7 && !selectedTrack && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiInfo className="w-4 h-4 text-info-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Selection Process</h3>
                  </div>
                  <div className="bg-info-50 rounded-xl p-4 border border-info-200">
                    <div className="space-y-1 text-xs text-info-800">
                      <p className="flex items-start gap-1.5">
                        <span className="font-medium">1.</span>
                        <span>Select your preferred track</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="font-medium">2.</span>
                        <span>Admin reviews and approves your choice</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="font-medium">3.</span>
                        <span>Proceed with track-specific requirements</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 7: Coursework Track Option */}
              {isSem7 && !selectedTrack && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiFileText className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Coursework Track</h3>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                    <p className="text-xs font-semibold text-primary-900 mb-2">Complete two components simultaneously:</p>
                    <div className="space-y-1.5 text-xs text-primary-800 mb-2">
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span><strong>Major Project 1:</strong> Group project (4-5 members) with faculty guide</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span><strong>Internship 1:</strong> Summer internship OR solo project (admin assigns)</span>
                      </p>
                    </div>
                    <p className="text-xs text-primary-700 italic pt-2 border-t border-primary-300">
                      Best for: Students who want structured on-campus work with faculty guidance
                    </p>
                  </div>
                </div>
              )}

              {/* Sem 7: 6-Month Internship Track Option */}
              {isSem7 && !selectedTrack && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiTarget className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">6-Month Internship Track</h3>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-xs font-semibold text-purple-900 mb-2">Focus on industry internship:</p>
                    <div className="space-y-1.5 text-xs text-purple-800 mb-2">
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>Submit 6-month internship application</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>Admin verifies internship completion</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>Sem 8 coursework required (Major Project 1 if verification fails)</span>
                      </p>
                    </div>
                    <p className="text-xs text-purple-700 italic pt-2 border-t border-purple-300">
                      Best for: Students with confirmed 6-month industry internship offers
                    </p>
                  </div>
                </div>
              )}

              {/* Sem 7: Coursework Track Details */}
              {isSem7 && selectedTrack === 'coursework' && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiFileText className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Coursework Track</h3>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                    <p className="text-xs text-primary-800 mb-3">Complete two components:</p>
                    <div className="space-y-2 text-xs text-primary-800">
                      <div>
                        <p className="font-medium mb-0.5 text-primary-900">Major Project 1</p>
                        <p className="text-[11px] text-primary-700 pl-2">• Form group (4-5 members)</p>
                        <p className="text-[11px] text-primary-700 pl-2">• Register project</p>
                        <p className="text-[11px] text-primary-700 pl-2">• Faculty allocation</p>
                        <p className="text-[11px] text-primary-700 pl-2">• Project dashboard access</p>
                      </div>
                      <div>
                        <p className="font-medium mb-0.5 text-primary-900">Internship 1</p>
                        <p className="text-[11px] text-primary-700 pl-2">• Summer internship OR</p>
                        <p className="text-[11px] text-primary-700 pl-2">• Internship 1 project (solo)</p>
                        <p className="text-[11px] text-primary-700 pl-2">• Admin assigns track</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 7: Coursework Timeline */}
              {isSem7 && selectedTrack === 'coursework' && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiClock className="w-4 h-4 text-info-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Timeline</h3>
                  </div>
                  <div className="bg-info-50 rounded-xl p-4 border border-info-200">
                    <p className="text-xs text-info-800 leading-relaxed">Both components run concurrently. Complete Major Project 1 group formation first, then proceed with Internship 1 based on admin assignment.</p>
                  </div>
                </div>
              )}

              {/* Sem 7: Internship Track Details */}
              {isSem7 && selectedTrack === 'internship' && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiFileText className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">6-Month Internship Track</h3>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-xs text-purple-800 mb-2">Complete internship application:</p>
                    <div className="space-y-1.5 text-xs text-purple-800">
                      <p>• Submit company details</p>
                      <p>• Upload offer letter</p>
                      <p>• Provide internship duration</p>
                      <p>• Include role & nature of work</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 7: Verification Process */}
              {isSem7 && selectedTrack === 'internship' && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiCheckCircle className="w-4 h-4 text-info-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Verification Process</h3>
                  </div>
                  <div className="bg-info-50 rounded-xl p-4 border border-info-200">
                    <div className="space-y-1 text-xs text-info-800">
                      <p>1. Submit application</p>
                      <p>2. Admin reviews & verifies</p>
                      <p>3. Pass: Sem 8 coursework required</p>
                      <p>4. Fail/Absent: Major Project 1 backlog in Sem 8</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 7: Semester 8 Requirements */}
              {isSem7 && selectedTrack === 'internship' && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiAlertCircle className="w-4 h-4 text-warning-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Semester 8</h3>
                  </div>
                  <div className="bg-warning-50 rounded-xl p-4 border border-warning-200">
                    <p className="text-xs text-warning-800 leading-relaxed">All students must complete coursework in Semester 8. If internship verification fails, Major Project 1 becomes a backlog requirement.</p>
                  </div>
                </div>
              )}

              {/* Sem 7: Important Notes */}
              {isSem7 && selectedTrack && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiAlertTriangle className="w-4 h-4 text-warning-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Important Notes</h3>
                  </div>
                  <div className="bg-warning-50 rounded-xl p-4 border border-warning-200">
                    <div className="space-y-2 text-xs text-warning-800">
                      {selectedTrack === 'coursework' ? (
                        <>
                          <p>• Group formation window is limited</p>
                          <p>• Internship 1 track is assigned by admin</p>
                          <p>• Both components must be completed</p>
                          <p>• Regular meetings with faculty guide required</p>
                        </>
                      ) : (
                        <>
                          <p>• Application must be complete and accurate</p>
                          <p>• Verification is mandatory for passing</p>
                          <p>• Sem 8 coursework is always required</p>
                          <p>• Backlog applies if verification fails</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Project Information */}
      {!isSem7 && !isSem8 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiFileText className="w-4 h-4 text-info-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">
                      {isSem6 ? "About Minor Project 3" : isSem5 ? "About Minor Project 2" : "About Minor Project 1"}
                    </h3>
                  </div>
                  <div className="bg-info-50 rounded-xl p-4 border border-info-200">
                    <div className="text-info-800 space-y-2 text-xs">
          {isSem6 ? (
            <>
                          <p>• Group project ({minGroupMembers}-{maxGroupMembers} members)</p>
                          <p>• Continue Sem 5 OR new</p>
                          <p>• Same group & faculty</p>
              <p>• Duration: 4-5 months</p>
            </>
          ) : isSem5 ? (
            <>
                          <p><span className="font-semibold">Type:</span> Group project ({minGroupMembers}-{maxGroupMembers} members)</p>
                          <p><span className="font-semibold">Focus:</span> Advanced programming & application design</p>
                          <p><span className="font-semibold">Guidance:</span> Faculty mentor will be allocated after registration</p>
              <p><span className="font-semibold">Duration:</span> 4-5 months with continuous internal evaluation</p>
            </>
                      ) : degree === 'M.Tech' && currentSemester === 1 ? (
              <>
                          <p>• Individual project (MTech)</p>
                          <p>• Problem-solving focus</p>
                          <p>• PPT & panel evaluation</p>
                <p>• Duration: 3-4 months</p>
              </>
            ) : (
              <>
                          <p>• Individual project (B.Tech)</p>
                          <p>• Basic programming focus</p>
                          <p>• PPT presentation required</p>
                <p>• Duration: 3-4 months</p>
                          <p>• 100% internal assessment</p>
              </>
          )}
                    </div>
        </div>
      </div>
      )}

              {/* Important Reminders - Sem 4 Only */}
              {currentSemester === 4 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiAlertCircle className="w-4 h-4 text-warning-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Reminders</h3>
                  </div>
                  <div className="bg-warning-50 rounded-xl p-4 border border-warning-200">
                    <div className="space-y-2 text-xs text-warning-800">
                      {!sem4Project ? (
                        <>
                          <p>• Register when window opens</p>
                          <p>• Keep title & description ready</p>
                          <p>• Choose a relevant topic</p>
                        </>
                      ) : !evaluationSchedule ? (
                        <>
                          <p>• Schedule will be announced</p>
                          <p>• Start preparing your PPT</p>
                          <p>• Review project requirements</p>
                        </>
                      ) : !projectStatus?.pptSubmitted ? (
                        <>
                          <p>• Upload PPT before deadline</p>
                          <p>• Format: PDF recommended</p>
                          <p>• Keep a backup copy</p>
                        </>
                      ) : (
                        <>
                          <p>• PPT submitted successfully ✓</p>
                          <p>• Note evaluation date & time</p>
                          <p>• Prepare your presentation</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Important Reminders - Sem 5 Only */}
              {currentSemester === 5 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiAlertCircle className="w-4 h-4 text-info-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Tips</h3>
                  </div>
                  <div className="bg-info-50 rounded-xl p-4 border border-info-200">
                    <div className="space-y-2 text-xs text-info-800">
                      {!sem5Group ? (
                        <>
                          <p><FiUsers className="w-3 h-3 inline mr-1" />Form a team of {minGroupMembers}-{maxGroupMembers} members</p>
                          <p><FiTarget className="w-3 h-3 inline mr-1" />Choose teammates wisely</p>
                          <p><FiZap className="w-3 h-3 inline mr-1" />Create group early for better planning</p>
                        </>
                      ) : (sem5Group?.status !== 'finalized' && !sem5Group?.finalizedAt) ? (
                        <>
                          <p><FiCheckCircle className="w-3 h-3 inline mr-1" />Ensure all members accept invitations</p>
                          <p><FiAlertTriangle className="w-3 h-3 inline mr-1" />Min {sem5Group?.minMembers || minGroupMembers} members required</p>
                          <p><FiZap className="w-3 h-3 inline mr-1" />Finalize group to proceed</p>
                        </>
                      ) : !sem5Project ? (
                        <>
                          <p><FiEdit className="w-3 h-3 inline mr-1" />Group leader registers project</p>
                          <p><FiTarget className="w-3 h-3 inline mr-1" />Discuss project idea with team</p>
                          <p><FiClipboard className="w-3 h-3 inline mr-1" />Prepare clear title & description</p>
                        </>
                      ) : !hasFacultyAllocated() ? (
                        <>
                          <p><FiClock className="w-3 h-3 inline mr-1" />Faculty will be assigned soon</p>
                          <p><FiBook className="w-3 h-3 inline mr-1" />Research your project topic</p>
                          <p><FiUsers className="w-3 h-3 inline mr-1" />Coordinate with team regularly</p>
                        </>
                      ) : (
                        <>
                          <p><FiCheckCircle className="w-3 h-3 inline mr-1" />Faculty assigned successfully ✓</p>
                          <p><FiCalendar className="w-3 h-3 inline mr-1" />Schedule meetings with guide</p>
                          <p><FiZap className="w-3 h-3 inline mr-1" />Start project work promptly</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Important Reminders - Sem 6 Only */}
              {currentSemester === 6 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiAlertCircle className="w-4 h-4 text-info-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Tips</h3>
                  </div>
                  <div className="bg-info-50 rounded-xl p-4 border border-info-200">
                    <div className="space-y-2 text-xs text-info-800">
                      {!sem6Group ? (
                        <>
                          <p><FiAlertTriangle className="w-3 h-3 inline mr-1" />You need a group from Sem 5</p>
                          <p><FiUsers className="w-3 h-3 inline mr-1" />Contact admin if you don't have a group</p>
                          <p><FiInfo className="w-3 h-3 inline mr-1" />Groups carry forward from Sem 5</p>
                        </>
                      ) : !sem6Group?.allocatedFaculty && !sem6Group?.allocatedFaculty?._id ? (
                        <>
                          <p><FiClock className="w-3 h-3 inline mr-1" />Faculty allocation pending</p>
                          <p><FiUsers className="w-3 h-3 inline mr-1" />Your Sem 5 group continues</p>
                          <p><FiInfo className="w-3 h-3 inline mr-1" />Contact admin for faculty allocation</p>
                        </>
                      ) : !sem6Project ? (
                        <>
                          <p><FiEdit className="w-3 h-3 inline mr-1" />Group leader registers project</p>
                          <p><FiTarget className="w-3 h-3 inline mr-1" />Choose: Continue Sem 5 OR new project</p>
                          <p><FiClipboard className="w-3 h-3 inline mr-1" />Discuss with team before registering</p>
                        </>
                      ) : !(sem6Project.faculty || sem6Project.group?.allocatedFaculty) ? (
                        <>
                          <p><FiClock className="w-3 h-3 inline mr-1" />Faculty will be assigned soon</p>
                          <p><FiBook className="w-3 h-3 inline mr-1" />Review your Sem 5 project</p>
                          <p><FiUsers className="w-3 h-3 inline mr-1" />Coordinate with team regularly</p>
                        </>
                      ) : (
                        <>
                          <p><FiCheckCircle className="w-3 h-3 inline mr-1" />Faculty assigned successfully ✓</p>
                          <p><FiCalendar className="w-3 h-3 inline mr-1" />Schedule meetings with guide</p>
                          <p><FiZap className="w-3 h-3 inline mr-1" />Continue/advance your project work</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 8: Selection Process */}
              {isSem8 && isType2 && !sem8TrackChoice?.chosenTrack && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiInfo className="w-4 h-4 text-info-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Selection Process</h3>
                  </div>
                  <div className="bg-info-50 rounded-xl p-4 border border-info-200">
                    <div className="space-y-1 text-xs text-info-800">
                      <p className="flex items-start gap-1.5">
                        <span className="font-medium">1.</span>
                        <span>Choose your track (6-Month Internship or Major Project 2)</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="font-medium">2.</span>
                        <span>Admin reviews and approves your choice</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="font-medium">3.</span>
                        <span>Proceed with track-specific requirements</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 8: 6-Month Internship Track Option */}
              {isSem8 && isType2 && !sem8TrackChoice?.chosenTrack && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiTarget className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">6-Month Internship Track</h3>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-xs font-semibold text-purple-900 mb-2">Complete a 6-month internship with a company</p>
                    <div className="space-y-1.5 text-xs text-purple-800 mb-2">
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>Submit application with company details and offer letter</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>Wait for admin verification</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>Complete your 6-month internship</span>
                      </p>
                    </div>
                    <p className="text-xs text-purple-700 italic pt-2 border-t border-purple-300">
                      Best for: Students who have secured a 6-month internship opportunity
                    </p>
                  </div>
                </div>
              )}

              {/* Sem 8: Major Project 2 Track Option */}
              {isSem8 && isType2 && !sem8TrackChoice?.chosenTrack && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiFileText className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Major Project 2 Track</h3>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                    <p className="text-xs font-semibold text-primary-900 mb-2">Complete a solo Major Project 2 under faculty guidance</p>
                    <div className="space-y-1.5 text-xs text-primary-800 mb-2">
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>Register project details (title, domain)</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>Submit faculty preferences</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>Wait for faculty allocation</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>Continue with independent research and development</span>
                      </p>
                    </div>
                    <p className="text-xs text-primary-700 italic pt-2 border-t border-primary-300">
                      Best for: Students who prefer independent research and development work
                    </p>
                  </div>
                </div>
              )}

              {/* Sem 8: Type 1 - About Semester 8 */}
              {isSem8 && isType1 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiInfo className="w-4 h-4 text-info-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">About Semester 8</h3>
                  </div>
                  <div className="bg-info-50 rounded-xl p-4 border border-info-200">
                    <p className="text-xs text-info-800 leading-relaxed">
                      As a Type 1 student (completed 6-month internship in Sem 7), you are required to complete Major Project 2 (group project) and Internship 2 (solo project or summer internship evidence).
                    </p>
                  </div>
                </div>
              )}

              {/* Sem 8: Type 1 - Major Project 2 Workflow */}
              {isSem8 && isType1 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiFileText className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Major Project 2 Workflow</h3>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                    <div className="space-y-1.5 text-xs text-primary-800">
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">1.</span>
                        <span>Form a group (4-5 members)</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">2.</span>
                        <span>Finalize your group</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">3.</span>
                        <span>Register project details and submit faculty preferences</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">4.</span>
                        <span>Wait for faculty allocation</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">5.</span>
                        <span>Continue with project work</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 8: Type 1 - Internship 2 Workflow */}
              {isSem8 && isType1 && internship2Status?.eligible && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiBriefcase className="w-4 h-4 text-orange-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Internship 2 Workflow</h3>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <p className="text-xs text-orange-800 mb-2">You can complete Internship 2 in one of two ways:</p>
                    <div className="space-y-1.5 text-xs text-orange-800">
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span><strong>Project under faculty:</strong> Register a solo internship project</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span><strong>Summer internship evidence:</strong> Submit evidence if you've already completed a 2-month summer internship</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 8: Type 2 - 6-Month Internship Track Details */}
              {isSem8 && isType2 && (sem8FinalizedTrack === 'internship' || sem8TrackChoice?.chosenTrack === 'internship') && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiFileText className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">6-Month Internship Track</h3>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-xs text-purple-800 mb-2">Complete internship application:</p>
                    <div className="space-y-1.5 text-xs text-purple-800">
                      <p>• Submit company details</p>
                      <p>• Upload offer letter</p>
                      <p>• Provide internship duration</p>
                      <p>• Include role & nature of work</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 8: Type 2 - 6-Month Internship Verification Process */}
              {isSem8 && isType2 && (sem8FinalizedTrack === 'internship' || sem8TrackChoice?.chosenTrack === 'internship') && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiUserCheck className="w-4 h-4 text-success-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Verification Process</h3>
                  </div>
                  <div className="bg-success-50 rounded-xl p-4 border border-success-200">
                    <p className="text-xs text-success-800 leading-relaxed">Your internship will be verified by the admin/panel at the end of the semester. You will be notified once the verification is complete.</p>
                  </div>
                </div>
              )}

              {/* Sem 8: Type 2 - Major Project 2 Track Details */}
              {isSem8 && isType2 && (sem8FinalizedTrack === 'major2' || sem8TrackChoice?.chosenTrack === 'major2') && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiFileText className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Major Project 2 Track</h3>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                    <p className="text-xs text-primary-800 mb-2">Complete solo project registration:</p>
                    <div className="space-y-1.5 text-xs text-primary-800">
                      <p>• Register project details (title, domain)</p>
                      <p>• Submit faculty preferences</p>
                      <p>• Wait for faculty allocation</p>
                      <p>• Continue with project work</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sem 8: Type 2 - Major Project 2 Faculty Allocation */}
              {isSem8 && isType2 && (sem8FinalizedTrack === 'major2' || sem8TrackChoice?.chosenTrack === 'major2') && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiUserCheck className="w-4 h-4 text-success-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Faculty Allocation</h3>
                  </div>
                  <div className="bg-success-50 rounded-xl p-4 border border-success-200">
                    <p className="text-xs text-success-800 leading-relaxed">Faculty members review and choose projects based on your preferences. You'll be notified when a faculty member chooses your project.</p>
                  </div>
                </div>
              )}

              {/* Sem 8: Type 2 - Major Project 2 Internship 2 Requirement */}
              {isSem8 && isType2 && (sem8FinalizedTrack === 'major2' || sem8TrackChoice?.chosenTrack === 'major2') && internship2Status?.eligible && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiBriefcase className="w-4 h-4 text-orange-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Internship 2 Requirement</h3>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <p className="text-xs text-orange-800 leading-relaxed">After Major Project 2 is active, you may need to complete Internship 2 (solo project or summer internship evidence) depending on your eligibility.</p>
                  </div>
                </div>
              )}

              {/* Sem 8: Important Notes */}
              {isSem8 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FiAlertCircle className="w-4 h-4 text-warning-600" />
                    <h3 className="text-sm font-semibold text-neutral-800">Important Notes</h3>
                  </div>
                  <div className="bg-warning-50 rounded-xl p-4 border border-warning-200">
                    <ul className="space-y-1.5 text-xs text-warning-800 list-disc list-inside">
                      {isType1 ? (
                        <>
                          <li>Major Project 2 requires group formation (4-5 members)</li>
                          <li>Internship 2 can be completed as a solo project or through summer internship evidence</li>
                          <li>Faculty allocation is done by faculty members reviewing and choosing projects</li>
                          <li>Keep track of deadlines and submission windows</li>
                        </>
                      ) : (sem8FinalizedTrack === 'internship' || sem8TrackChoice?.chosenTrack === 'internship') ? (
                        <>
                          <li>6-month internship must be completed during the semester</li>
                          <li>Verification happens at the end of the semester</li>
                          <li>Contact admin if you have questions about the verification process</li>
                          <li>Ensure all application details are accurate before submission</li>
                        </>
                      ) : (sem8FinalizedTrack === 'major2' || sem8TrackChoice?.chosenTrack === 'major2') ? (
                        <>
                          <li>Major Project 2 is a solo project requiring independent work</li>
                          <li>Faculty members review and choose projects based on preferences</li>
                          <li>You may need to complete Internship 2 after Major Project 2 is active</li>
                          <li>Keep track of deadlines and submission windows</li>
                        </>
                      ) : (
                        <>
                          <li>Track choice is final once approved by admin</li>
                          <li>Choose carefully based on your career goals and opportunities</li>
                          <li>Contact admin if you have questions about either track</li>
                          <li>Track selection window may have deadlines</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
    </div>
    </>
  );
};

export default StudentDashboard;