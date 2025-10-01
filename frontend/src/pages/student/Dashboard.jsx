import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSem4Project } from '../../hooks/useSem4Project';
import { useSem5Project } from '../../hooks/useSem5Project';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useEvaluation } from '../../hooks/useEvaluation';
import { studentAPI } from '../../utils/api';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import SemesterHeader from '../../components/common/SemesterHeader';
import StatusBadge from '../../components/common/StatusBadge';
import ProgressTimeline from '../../components/common/ProgressTimeline';

const StudentDashboard = () => {
  const { user, roleData, isLoading: authLoading } = useAuth();
  
  // Sem 4 hooks
  const { project: sem4Project, loading: sem4ProjectLoading, canRegisterProject: canRegisterSem4, canUploadPPT, getProjectTimeline } = useSem4Project();
  const { evaluationSchedule, canUploadPPT: canUploadForEvaluation } = useEvaluation();
  
  // Project status state
  const [projectStatus, setProjectStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  
  // Previous projects state
  const [previousProjects, setPreviousProjects] = useState([]);
  const [previousProjectsLoading, setPreviousProjectsLoading] = useState(false);
  
  // Invitation handling state
  const [invitationLoading, setInvitationLoading] = useState({});
  
  // Sem 5 hooks
  const { sem5Project, loading: sem5ProjectLoading, canRegisterProject: canRegisterSem5, getProgressSteps } = useSem5Project();
  const { sem5Group, canCreateGroup, isInGroup, isGroupLeader, getGroupStats, getPendingInvitationsCount, groupInvitations, acceptGroupInvitation, rejectGroupInvitation } = useGroupManagement();

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
        
        // First, try to get all projects and filter by semester  
        try {
          const response = await studentAPI.getProjects();
          if (response.success && response.data) {
            // Filter projects by previous semesters
            previousProjectsData.push(...response.data.filter(p => previousSemesters.includes(p.semester)));
          }
        } catch (err) {
          console.error('Error loading previous projects:', err);
        }
        setPreviousProjects(previousProjectsData);
      }
    } catch (error) {
      console.error('Error loading previous projects:', error);
      setPreviousProjects([]);
    } finally {
      setPreviousProjectsLoading(false);
    }
  };

  // Load previous projects on component mount
  useEffect(() => {
    const currentSemester = (roleData?.semester || user?.semester) || 4;
    if (currentSemester > 4) {
      loadPreviousProjects();
    }
  }, [user, roleData]);

  // Handle invitation response
  const handleInvitationResponse = async (invitationId, accept = true) => {
    try {
      setInvitationLoading(prev => ({ ...prev, [invitationId]: true }));
      
      if (accept) {
        await acceptGroupInvitation(invitationId);
        toast.success('Invitation accepted successfully!');
      } else {
        await rejectGroupInvitation(invitationId);
        toast.success('Invitation rejected');
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error(error.message || 'Failed to respond to invitation');
    } finally {
      setInvitationLoading(prev => ({ ...prev, [invitationId]: false }));
    }
  };
  

  // Get quick actions based on semester  
  const getQuickActions = () => {
    const actions = [];
    const currentSemester = (roleData?.semester || user?.semester) || 4;

    if (currentSemester === 4) {
      // Sem 4 actions
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

      if (sem4Project && canUploadPPT()) {
        actions.push({
          title: 'Upload PPT',
          description: 'Upload your presentation file',
          icon: '📊',
          link: `/student/projects/${sem4Project._id}/upload`,
          color: 'bg-green-50 border-green-200 hover:bg-green-100',
          textColor: 'text-green-800',
        });
      }

      if (sem4Project && (sem4Project.status === 'registered' || sem4Project.status === 'active')) {
        actions.push({
          title: 'View Project',
          description: 'View your project details',
          icon: '👁️',
          link: `/student/projects/${sem4Project._id}`,
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
    }

    return actions;
  };

  const currentSemester = (roleData?.semester || user?.semester) || 4;
  const isSem5 = currentSemester === 5;


  const quickActions = getQuickActions();

  // Check if we have critical sources loading
  const criticalDataLoading = !user && !roleData && authLoading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Semester Header */}
      <SemesterHeader 
        semester={currentSemester} 
        degree="B.Tech" 
        title={isSem5 ? "B.Tech Semester 5 - Minor Project 2" : "B.Tech Semester 4 - Minor Project 1"}
      />

      {/* Welcome Message */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {roleData?.fullName || user?.fullName || user?.name || 'Student'}!
        </h1>
        <p className="text-gray-600 mt-2">
          {isSem5 
            ? "Manage your Minor Project 2, form groups, and track your progress"
            : "Manage your Minor Project 1 and track your progress"
          }
        </p>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
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

      {/* Group Invitations Section - Only for Sem 5 students with pending invitations */}
      {isSem5 && !isInGroup && groupInvitations && groupInvitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Invitations</h2>
          <div className="space-y-4">
            {groupInvitations.map((invitation) => (
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
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Invited on: {new Date(invitation.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 ml-6">
                    <button
                      onClick={() => handleInvitationResponse(invitation._id, true)}
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
                      onClick={() => handleInvitationResponse(invitation._id, false)}
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Project Status Card */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {isSem5 ? "Minor Project 2 Status" : "Minor Project 1 Status"}
            </h2>
          </div>
          <div className="p-6">
            {isSem5 ? (
              // Sem 5 Project Status
              sem5ProjectLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : sem5Project ? (
                // Show waiting message instead of project details
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
              // Sem 4 Project Status
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
                  <p className="text-sm text-gray-600">{sem4Project.description}</p>
                  <div className="text-xs text-gray-500">
                    Registered: {new Date(sem4Project.createdAt).toLocaleDateString()}
                  </div>
                  
                  {/* PPT Status */}
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
                          <Link
                            to={`/student/projects/${sem4Project._id}/upload`}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                          >
                            View/Replace
                          </Link>
                        </div>
                        {projectStatus.pptSubmittedAt && (
                          <div className="text-xs text-gray-500">
                            {new Date(projectStatus.pptSubmittedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ) : canUploadPPT() ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">PPT Upload Available</span>
                        <Link
                          to={`/student/projects/${sem4Project._id}/upload`}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                        >
                          Upload PPT
                        </Link>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">Evaluation schedule required for upload</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No project registered yet</p>
                  <Link
                    to="/student/projects/register"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    Register for Minor Project 1
                  </Link>
                </div>
              )
            )}
          </div>
        </div>

        {/* Second Card - Group Status (Sem 5) or Evaluation Schedule (Sem 4) */}
        {isSem5 ? (
          /* Sem 5 Group Status Card */
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Group Status</h2>
            </div>
            <div className="p-6">
              {sem5Group ? (
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
                        {getGroupStats().memberCount}/{getGroupStats().maxMembers}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Available Slots:</span>
                      <span className="ml-2 font-medium">{getGroupStats().availableSlots}</span>
                    </div>
                  </div>

                  {/* Group Members - Show when group is finalized */}
                  {sem5Group.status === 'finalized' && sem5Group.members && sem5Group.members.length > 0 && (
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
                      
                      {/* Finalized status indicator */}
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
                    </div>
                  )}

                  {/* Warning for incomplete groups */}
                  {getGroupStats().memberCount < 2 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <div className="text-yellow-400 mr-3">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Group Not Complete</p>
                          <p className="text-xs text-yellow-700">You need at least 2 members to register your project</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Group Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>
                        {sem5Group.status === 'finalized' ? 'Group Status' : 'Group Formation Progress'}
                      </span>
                      <span>
                        {sem5Group.status === 'finalized' 
                          ? 'Finalized' 
                          : `${Math.round(getGroupStats().memberCount / getGroupStats().maxMembers * 100)}%`
                        }
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          sem5Group.status === 'finalized' 
                            ? 'bg-green-500' 
                            : 'bg-blue-600'
                        }`}
                        style={{ 
                          width: sem5Group.status === 'finalized' 
                            ? '100%' 
                            : `${Math.round(getGroupStats().memberCount / getGroupStats().maxMembers * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

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

      {/* Previous Projects Section - Only for Sem 5+ students with projects from previous semesters */}
      {((roleData?.semester || user?.semester) || 4) > 4 && (
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Previous Semester Projects</h2>
          </div>
          <div className="p-6">
            {previousProjectsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading previous projects...</span>
              </div>
            ) : previousProjects.length > 0 ? (
              <div className="space-y-4">
                {previousProjects.map((project, index) => (
                  <div key={project._id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{project.title}</h3>
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Semester {project.semester}</span>
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                    {project.faculty && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="font-medium">Faculty:</span> {project.faculty?.fullName || 'N/A'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No previous semester projects found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project Timeline - Only show for Sem 4 or Sem 5 with faculty allocated */}
      {((isSem5 && sem5Project && sem5Project.group?.allocatedFaculty) || (!isSem5 && sem4Project)) && (
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {isSem5 ? "Project Progress Timeline" : "Project Timeline"}
            </h2>
          </div>
          <div className="p-6">
            {isSem5 ? (
              <ProgressTimeline steps={getProgressSteps()} />
            ) : (
              <ProgressTimeline steps={getProjectTimeline()} />
            )}
          </div>
        </div>
      )}

      {/* Information Section */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">
          {isSem5 ? "About Minor Project 2" : "About Minor Project 1"}
        </h2>
        <div className="text-blue-800 space-y-2">
          {isSem5 ? (
            <>
              <p>• Group project for B.Tech 5th semester students (4-5 members)</p>
              <p>• Focus on advanced programming concepts and team collaboration</p>
              <p>• Includes group formation, faculty allocation, and project management</p>
              <p>• Duration: 4-5 months</p>
              <p>• Evaluation: Group presentation and individual contribution assessment</p>
            </>
          ) : (
            <>
              <p>• Individual project for B.Tech 4th semester students</p>
              <p>• Focus on basic programming concepts and problem-solving</p>
              <p>• Includes PPT presentation and evaluation by faculty panel</p>
              <p>• Duration: 3-4 months</p>
              <p>• Evaluation: 100% internal assessment</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;