import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSem7Project } from '../../hooks/useSem7Project';
import { useSem8 } from '../../context/Sem8Context';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import { formatFacultyName } from '../../utils/formatUtils';
import {
  FiArrowLeft, FiFileText, FiCheckCircle, FiClock, FiAlertCircle,
  FiInfo, FiTarget, FiUserCheck, FiAlertTriangle, FiZap, FiTrendingUp,
  FiUser, FiCalendar, FiMail, FiPhone, FiEdit, FiPlus, FiLoader,
  FiXCircle, FiBriefcase, FiMapPin, FiDollarSign, FiLink
} from 'react-icons/fi';

const Internship1Dashboard = () => {
  const navigate = useNavigate();
  const { user, roleData } = useAuth();
  const location = useLocation();
  
  // Determine if this is Internship 2 route (Sem 8)
  const isInternship2Route = location.pathname === '/student/sem8/internship2/dashboard';
  
  const {
    internship1Project: sem7Internship1Project,
    internship1Status: sem7Internship1Status,
    finalizedTrack,
    trackChoice,
    loading: sem7Loading,
    fetchSem7Data,
    hasApprovedSummerInternship,
    getInternshipApplication,
    getInternship1ProgressSteps
  } = useSem7Project();
  const { 
    sem8Status, 
    loading: sem8Loading,
    internship2Project,
    internship2Status,
    fetchSem8Data,
    internshipApplications: sem8InternshipApplications
  } = useSem8();
  
  // Determine current semester and student type
  const currentSemester = roleData?.semester || user?.semester;
  const isSem8 = currentSemester === 8;
  const isSem7 = currentSemester === 7;
  const isType1 = isSem8 && sem8Status?.studentType === 'type1';
  
  // State for Sem 8 Internship 1 project and status
  const [sem8Internship1Project, setSem8Internship1Project] = useState(null);
  const [sem8Internship1Status, setSem8Internship1Status] = useState(null);
  
  // Use appropriate project and status based on route and semester
  const internship1Project = isInternship2Route 
    ? internship2Project 
    : (isSem8 ? sem8Internship1Project : sem7Internship1Project);
  const internship1Status = isInternship2Route
    ? internship2Status
    : (isSem8 ? sem8Internship1Status : sem7Internship1Status);
  const loading = isSem8 ? sem8Loading : sem7Loading;
  
  // Determine display labels
  const internshipLabel = isInternship2Route ? 'Internship 2' : 'Internship 1';
  const internshipProjectLabel = isInternship2Route ? 'Internship 2 Project' : 'Internship 1 Project';

  const [isLoading, setIsLoading] = useState(true);
  const prevLocationRef = useRef();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      if (isSem7) {
        await fetchSem7Data();
      } else if (isSem8 && isType1) {
        if (isInternship2Route) {
          if (fetchSem8Data) {
            await fetchSem8Data();
          }
        } else {
          try {
            let foundProject = null;
            const projectResponse = await studentAPI.getProjects({ 
              semester: 8, 
              projectType: 'internship1' 
            });
            if (projectResponse.success && projectResponse.data && projectResponse.data.length > 0) {
              const activeProject = projectResponse.data.find(p => p.status !== 'cancelled');
              if (activeProject) {
                foundProject = activeProject;
                setSem8Internship1Project(activeProject);
              }
            }
            const statusResponse = await studentAPI.checkInternship1Status();
            if (statusResponse.success && statusResponse.data) {
              setSem8Internship1Status(statusResponse.data);
              if (statusResponse.data.existingProject && !foundProject) {
                setSem8Internship1Project(statusResponse.data.existingProject);
              }
            }
          } catch (error) {
            console.error('Failed to load Sem 8 Internship 1 data:', error);
          }
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, [fetchSem7Data, fetchSem8Data, isSem7, isSem8, isType1, isInternship2Route]);

  // Refresh data when navigating to this page
  useEffect(() => {
    const isInternshipDashboard = location.pathname === '/student/sem7/internship1/dashboard' || 
                                   location.pathname === '/student/sem8/internship1/dashboard' ||
                                   location.pathname === '/student/sem8/internship2/dashboard';
    if (prevLocationRef.current !== location.pathname && isInternshipDashboard) {
      const refreshData = async () => {
        if (isSem7) {
          await fetchSem7Data();
        } else if (isSem8 && isType1) {
          if (isInternship2Route) {
            if (fetchSem8Data) {
              await fetchSem8Data();
            }
          } else {
            try {
              let foundProject = null;
              const projectResponse = await studentAPI.getProjects({ 
                semester: 8, 
                projectType: 'internship1' 
              });
              if (projectResponse.success && projectResponse.data && projectResponse.data.length > 0) {
                const activeProject = projectResponse.data.find(p => p.status !== 'cancelled');
                if (activeProject) {
                  foundProject = activeProject;
                  setSem8Internship1Project(activeProject);
                }
              }
              const statusResponse = await studentAPI.checkInternship1Status();
              if (statusResponse.success && statusResponse.data) {
                setSem8Internship1Status(statusResponse.data);
                if (statusResponse.data.existingProject && !foundProject) {
                  setSem8Internship1Project(statusResponse.data.existingProject);
                }
              }
            } catch (error) {
              console.error('Failed to refresh Sem 8 Internship 1 data:', error);
            }
          }
        }
      };
      refreshData();
    }
    prevLocationRef.current = location.pathname;
  }, [location.pathname, fetchSem7Data, fetchSem8Data, isSem7, isSem8, isType1, isInternship2Route]);

  // Determine selected track
  const selectedTrack = isSem8 ? (sem8Status?.selection?.chosenTrack || sem8Status?.selection?.finalizedTrack) : trackChoice?.chosenTrack;

  // Redirect if not eligible
  useEffect(() => {
    if (loading) return;
    if (isSem7) {
      if (!trackChoice) return;
      if (!selectedTrack || selectedTrack !== 'coursework') {
        navigate('/dashboard/student');
      }
    }
    if (isSem8) {
      if (!isType1) {
        navigate('/dashboard/student');
      }
    }
  }, [selectedTrack, loading, trackChoice, navigate, isSem7, isSem8, isType1, sem8Status]);

  // Check if student has summer internship application
  const summerApp = isSem8
    ? (sem8InternshipApplications || []).find(app => app.type === 'summer' && app.semester === 8)
    : getInternshipApplication('summer');
  const hasSummerApp = !!summerApp;
  const summerAppApproved = hasApprovedSummerInternship || 
                            (summerApp && (summerApp.status === 'approved' || summerApp.status === 'verified_pass'));

  // Check if application was rejected due to track change to project
  const isRejectedDueToTrackChange = summerApp && 
    (summerApp.status === 'verified_fail' || summerApp.status === 'absent') &&
    summerApp.adminRemarks && 
    summerApp.adminRemarks.includes('Switched to Internship-I under Institute Faculty');

  // Determine selected path
  const selectedPath = internship1Project ? 'project' : (hasSummerApp ? 'summer' : null);

  // Get progress steps
  const progressSteps = getInternship1ProgressSteps ? getInternship1ProgressSteps() : [];

  if (isLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen bg-surface-200">
          <div className="text-center">
            <FiLoader className="w-12 h-12 text-orange-600 mx-auto animate-spin" />
            <p className="mt-4 text-neutral-600">Loading {internshipLabel} dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // If project exists and is active, show project dashboard card in center (not redirect)
  const hasActiveProject = internship1Project && 
    (internship1Project.status === undefined || 
     internship1Project.status === null || 
     internship1Project.status !== 'cancelled');

  return (
    <Layout>
      <div className="h-[calc(100vh-64px)] bg-surface-200 overflow-hidden flex flex-col">
        {/* Compact Header */}
        <div className="bg-white border-b border-neutral-200 shadow-sm flex-shrink-0">
          <div className="max-w-full mx-auto px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard/student')}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <FiArrowLeft className="w-5 h-5 text-neutral-600" />
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiBriefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-neutral-800">
                    {internshipLabel} Dashboard
                  </h1>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {isSem8 ? 'Semester 8' : 'Semester 7'} • {selectedPath === 'summer' ? 'Summer Application' : selectedPath === 'project' ? 'Solo Project' : 'Select Path'}
                  </p>
                </div>
              </div>
              {hasActiveProject && (
                <StatusBadge 
                  status={
                    internship1Project.status === 'active' ? 'success' :
                    internship1Project.status === 'faculty_allocated' ? 'info' :
                    internship1Project.status === 'registered' ? 'warning' :
                    'warning'
                  }
                  text={internship1Project.status || 'Registered'}
                />
              )}
            </div>
          </div>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* Left Sidebar - Progress & Quick Info */}
            <div className="lg:col-span-2 bg-surface-100 border-r border-neutral-200 overflow-y-auto custom-scrollbar min-h-0 h-full">
              <div className="p-4 space-y-4">
                
                {/* Progress Tracker */}
                <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <FiClock className="w-4 h-4 text-orange-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      {internshipLabel} Progress
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {progressSteps.map((step, index) => (
                      <div key={step.id} className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 mt-0.5">
                          {step.completed ? (
                            <FiCheckCircle className="w-4 h-4 text-orange-600" />
                          ) : step.status === 'current' ? (
                            <div className="w-4 h-4 rounded-full border-2 border-orange-600 bg-orange-50 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-orange-600" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-neutral-800 leading-tight">
                            {step.title}
                          </p>
                          {step.description && (
                            <p className="text-[11px] text-neutral-600 mt-0.5 leading-tight">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FiTrendingUp className="w-4 h-4 text-info-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Quick Stats
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-600">Path Selected:</span>
                      <span className="text-xs font-medium text-neutral-800">
                        {selectedPath === 'summer' ? 'Summer App' : 
                         selectedPath === 'project' ? 'Solo Project' : 
                         'Not Selected'}
                      </span>
                    </div>
                    {selectedPath === 'summer' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-600">App Status:</span>
                        <span className="text-xs font-medium text-neutral-800">
                          {summerApp?.status === 'verified_pass' ? 'Approved' :
                           summerApp?.status === 'needs_info' ? 'Update Required' :
                           summerApp?.status === 'submitted' ? 'Submitted' :
                           summerApp?.status || 'N/A'}
                        </span>
                      </div>
                    )}
                    {selectedPath === 'project' && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-600">Project:</span>
                          <span className="text-xs font-medium text-neutral-800">
                            {hasActiveProject ? 'Registered' : 'Not Registered'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-600">Faculty:</span>
                          <span className="text-xs font-medium text-neutral-800">
                            {internship1Project?.faculty ? 'Allocated' : 'Pending'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Your Status */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <FiUser className="w-4 h-4 text-orange-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Your Status
                    </h3>
                  </div>
                  {selectedPath === 'summer' ? (
                    <>
                      <p className="text-xs font-semibold text-neutral-800">
                        {summerAppApproved ? 'Application Approved' :
                         summerApp?.status === 'needs_info' ? 'Update Required' :
                         summerApp?.status === 'submitted' ? 'Application Submitted' :
                         'No Application'}
                      </p>
                      <p className="text-[11px] text-neutral-600 mt-1">
                        {summerAppApproved ? `${internshipLabel} project not required` :
                         summerApp?.status === 'needs_info' ? 'Review admin remarks and update' :
                         summerApp?.status === 'submitted' ? 'Waiting for admin review' :
                         'Submit your summer internship evidence'}
                      </p>
                    </>
                  ) : selectedPath === 'project' ? (
                    <>
                      <p className="text-xs font-semibold text-neutral-800">
                        {hasActiveProject ? 'Project Registered' : 'Not Registered'}
                      </p>
                      <p className="text-[11px] text-neutral-600 mt-1">
                        {hasActiveProject 
                          ? (internship1Project?.faculty ? 'Faculty allocated' : 'Waiting for faculty allocation')
                          : 'Register your solo project'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-neutral-800">
                        No Path Selected
                      </p>
                      <p className="text-[11px] text-neutral-600 mt-1">
                        Choose your {internshipLabel} path
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Center Column - Main Content */}
            <div className="lg:col-span-7 bg-surface-50 overflow-y-auto custom-scrollbar min-h-0 h-full">
              <div className="p-4 lg:p-6 space-y-4 pb-6">
                
                {/* Track Change Notification - Switched from Summer to Project */}
                {summerApp && (summerApp.status === 'verified_fail' || summerApp.status === 'absent') && 
                 summerApp.adminRemarks && summerApp.adminRemarks.includes('Switched to Internship-I under Institute Faculty') && hasActiveProject && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <FiAlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-amber-900 mb-1">
                          Your {internshipLabel} track has been changed by admin
                        </h3>
                        <p className="text-xs text-amber-800 mb-2">
                          Your track has been changed from <strong>Summer Internship Application</strong> to <strong>{internshipLabel} Project (Institute Faculty)</strong>.
                        </p>
                        {summerApp.adminRemarks && (
                          <p className="text-xs text-amber-700">
                            <strong>Admin Remarks:</strong> {summerApp.adminRemarks}
                          </p>
                        )}
                        <p className="text-xs text-amber-800 mt-2 font-medium">
                          You have successfully registered for {internshipLabel} project. {internship1Project?.faculty ? 'Your faculty supervisor has been allocated.' : 'Waiting for faculty supervisor allocation.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Path Selection Cards (When No Path Selected) */}
                {!selectedPath && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Option 1: Completed Summer Internship */}
                    <div 
                      onClick={() => navigate(isSem8 ? '/student/sem8/internship/apply/summer' : '/student/sem7/internship/apply/summer')}
                      className="bg-white rounded-xl border-2 border-blue-200 hover:border-blue-400 cursor-pointer transition-all shadow-sm hover:shadow-md p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FiCheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-lg font-bold text-neutral-900 mb-2">
                            I have completed 2-month internship
                          </h2>
                          <p className="text-sm text-neutral-600">
                            Submit your summer internship evidence and completion certificate
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Option 2: Not Completed - Register Internship 1 Project */}
                    {!hasSummerApp && (
                      <div 
                        onClick={() => navigate(isInternship2Route 
                          ? '/student/sem8/internship2/register' 
                          : (isSem8 ? '/student/sem8/internship1/register' : '/student/sem7/internship1/register'))}
                        className="bg-white rounded-xl border-2 border-orange-200 hover:border-orange-400 cursor-pointer transition-all shadow-sm hover:shadow-md p-5"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FiFileText className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h2 className="text-lg font-bold text-neutral-900 mb-2">
                              I haven't completed internship
                            </h2>
                            <p className="text-sm text-neutral-600">
                              Register for {internshipLabel} solo project under a faculty mentor
                            </p>
                            {internship1Status && !internship1Status.eligible && (
                              <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                                <p className="text-xs text-yellow-800">
                                  {internship1Status.reason}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Summer Internship Application Status Card */}
                {selectedPath === 'summer' && hasSummerApp && !hasActiveProject && !isRejectedDueToTrackChange && (
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FiBriefcase className="w-5 h-5 text-white" />
                          <h2 className="text-lg font-bold text-white">
                            Summer Internship Application
                          </h2>
                        </div>
                        <StatusBadge
                          status={
                            summerApp.status === 'verified_pass' ? 'success' :
                            summerApp.status === 'verified_fail' || summerApp.status === 'absent' ? 'error' :
                            summerApp.status === 'needs_info' ? 'error' :
                            summerApp.status === 'pending_verification' ? 'info' :
                            summerApp.status === 'submitted' ? 'info' :
                            'warning'
                          }
                          text={
                            summerApp.status === 'verified_pass' ? 'Verified (Pass)' :
                            summerApp.status === 'verified_fail' ? 'Verified (Fail)' :
                            summerApp.status === 'absent' ? 'Absent' :
                            summerApp.status === 'needs_info' ? 'Update Required' :
                            summerApp.status === 'pending_verification' ? 'Pending Verification' :
                            summerApp.status === 'submitted' ? 'Submitted' :
                            summerApp.status
                          }
                        />
                      </div>
                    </div>

                    <div className="p-5 space-y-5">
                      {/* URGENT: Application has placeholder values */}
                      {summerApp.status === 'submitted' && 
                       (summerApp.adminRemarks === 'Assigned by admin' || summerApp.adminRemarks?.includes('Assigned by admin')) &&
                       (!summerApp.details?.companyName || 
                        summerApp.details?.companyName === 'To be provided by student' ||
                        summerApp.details?.companyName === 'N/A - Assigned to Internship 1 Project') && (
                        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <FiAlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h3 className="text-sm font-bold text-red-900 mb-2">
                                ⚠️ URGENT: Complete Your Application Immediately
                              </h3>
                              <p className="text-xs text-red-800 mb-2">
                                Your summer internship application contains placeholder information and must be completed immediately.
                              </p>
                              <Link
                                to={isSem8 ? `/student/sem8/internship/apply/summer/${summerApp._id}/edit` : `/student/sem7/internship/apply/summer/${summerApp._id}/edit`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm mt-2"
                              >
                                <FiEdit className="w-4 h-4" />
                                Fill Application Now
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Status Message */}
                      {summerAppApproved ? (
                        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <FiCheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h3 className="font-semibold text-success-900 mb-1 text-sm">Summer Internship Approved</h3>
                              <p className="text-xs text-success-800">
                                Your 2-month summer internship has been approved. {internshipLabel} project is not required.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : summerApp.status === 'needs_info' ? (
                        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <FiAlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h3 className="font-semibold text-warning-900 mb-1 text-sm">Update Required</h3>
                              <p className="text-xs text-warning-800">
                                Please update your application with the requested information from the admin.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : summerApp.status === 'submitted' && summerApp.adminRemarks === 'Assigned by admin' ? (
                        <div className="bg-info-50 border border-info-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <FiInfo className="w-5 h-5 text-info-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-info-900 mb-1 text-sm">Assigned to Summer Internship Application</h3>
                              <p className="text-xs text-info-800 mb-3">
                                You have been assigned to submit a summer internship application. Please provide your summer internship details and completion certificate.
                              </p>
                              {summerApp.adminRemarks && (
                                <div className="mt-3 p-3 border border-info-300 rounded-md bg-info-100">
                                  <p className="text-[10px] font-medium mb-1 text-info-900">Admin Remarks:</p>
                                  <p className="text-xs text-info-800">{summerApp.adminRemarks}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : summerApp.status === 'verified_fail' || summerApp.status === 'absent' ? (
                        (() => {
                          const isFreshProjectAssignment = summerApp.adminRemarks === 'Assigned by admin' || 
                            (summerApp.adminRemarks && summerApp.adminRemarks.includes('Assigned by admin') && 
                             !summerApp.adminRemarks.includes('Switched'));
                          const isTrackChange = summerApp.adminRemarks && summerApp.adminRemarks.includes('Switched to Internship-I under Institute Faculty');
                          
                          if (isFreshProjectAssignment) {
                            return (
                              <div className="bg-info-50 border border-info-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                  <FiInfo className="w-5 h-5 text-info-600 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-info-900 mb-1 text-sm">Assigned to {internshipLabel} Project</h3>
                                    <p className="text-xs text-info-800 mb-3">
                                      You have been assigned to complete an {internshipLabel} project under an Institute Faculty supervisor. Please register for your {internshipLabel} solo project.
                                    </p>
                                    {summerApp.adminRemarks && (
                                      <div className="mt-3 p-3 border border-info-300 rounded-md bg-info-100">
                                        <p className="text-[10px] font-medium mb-1 text-info-900">Admin Remarks:</p>
                                        <p className="text-xs text-info-800">{summerApp.adminRemarks}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div className={`border rounded-lg p-4 ${
                              isTrackChange
                                ? 'bg-amber-50 border-amber-200' 
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <div className="flex items-start gap-3">
                                <FiXCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                  isTrackChange
                                    ? 'text-amber-600' 
                                    : 'text-red-600'
                                }`} />
                                <div className="flex-1">
                                  <h3 className={`font-semibold mb-1 text-sm ${
                                    isTrackChange
                                      ? 'text-amber-900' 
                                      : 'text-red-900'
                                  }`}>
                                    {isTrackChange
                                      ? `Track Changed to ${internshipLabel} Project`
                                      : 'Application Rejected'}
                                  </h3>
                                  <p className={`text-xs mb-3 ${
                                    isTrackChange
                                      ? 'text-amber-800' 
                                      : 'text-red-800'
                                  }`}>
                                    {isTrackChange
                                      ? `Your track has been changed to ${internshipLabel} Project. Please register for ${internshipLabel} solo project under a faculty member.`
                                      : `Your summer internship application was rejected by the admin. You must complete an ${internshipLabel} solo project under a faculty member.`}
                                  </p>
                                  {summerApp.adminRemarks && (
                                    <div className={`mt-3 p-3 border rounded-md ${
                                      isTrackChange
                                        ? 'bg-amber-100 border-amber-300' 
                                        : 'bg-red-100 border-red-300'
                                    }`}>
                                      <p className={`text-[10px] font-medium mb-1 ${
                                        isTrackChange
                                          ? 'text-amber-900' 
                                          : 'text-red-900'
                                      }`}>Admin Remarks:</p>
                                      <p className={`text-xs ${
                                        isTrackChange
                                          ? 'text-amber-800' 
                                          : 'text-red-800'
                                      }`}>{summerApp.adminRemarks}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="bg-info-50 border border-info-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <FiInfo className="w-5 h-5 text-info-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h3 className="font-semibold text-info-900 mb-1 text-sm">Application Submitted</h3>
                              <p className="text-xs text-info-800">
                                Your summer internship evidence has been submitted and is awaiting admin review.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Admin Remarks */}
                      {summerApp.adminRemarks && (summerApp.status === 'needs_info' || summerApp.status === 'verified_fail' || summerApp.status === 'absent') && (
                        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                          <h3 className="font-semibold text-neutral-900 mb-2 text-sm">Admin Remarks</h3>
                          <p className="text-xs text-neutral-700">{summerApp.adminRemarks}</p>
                        </div>
                      )}

                      {/* Internship Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <h3 className="font-semibold text-neutral-900 mb-3 text-sm">Company Information</h3>
                          <div className="space-y-2.5">
                            <div>
                              <p className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wide">Company Name</p>
                              <p className="text-xs font-medium text-neutral-900">{summerApp.details?.companyName || 'N/A'}</p>
                            </div>
                            {summerApp.details?.location && (
                              <div>
                                <p className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wide">Location</p>
                                <p className="text-xs text-neutral-900">{summerApp.details.location}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wide">Duration</p>
                              <p className="text-xs text-neutral-900">
                                {summerApp.details?.startDate && summerApp.details?.endDate
                                  ? `${new Date(summerApp.details.startDate).toLocaleDateString()} - ${new Date(summerApp.details.endDate).toLocaleDateString()}`
                                  : 'N/A'}
                              </p>
                            </div>
                            {summerApp.details?.mode && (
                              <div>
                                <p className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wide">Mode</p>
                                <p className="text-xs text-neutral-900 capitalize">{summerApp.details.mode}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold text-neutral-900 mb-3 text-sm">Manager/Contact Details</h3>
                          <div className="space-y-2.5">
                            {summerApp.details?.mentorName && (
                              <div>
                                <p className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wide">Manager Name</p>
                                <p className="text-xs text-neutral-900">{summerApp.details.mentorName}</p>
                              </div>
                            )}
                            {summerApp.details?.mentorEmail && (
                              <div>
                                <p className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wide">Email Address</p>
                                <p className="text-xs text-neutral-900">{summerApp.details.mentorEmail}</p>
                              </div>
                            )}
                            {summerApp.details?.mentorPhone && (
                              <div>
                                <p className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wide">Contact Number</p>
                                <p className="text-xs text-neutral-900">{summerApp.details.mentorPhone}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Nature of Work */}
                      {summerApp.details?.roleOrNatureOfWork && (
                        <div>
                          <h3 className="font-semibold text-neutral-900 mb-2 text-sm">Nature of Work</h3>
                          <p className="text-xs text-neutral-700 bg-neutral-50 p-3 rounded-md">{summerApp.details.roleOrNatureOfWork}</p>
                        </div>
                      )}

                      {/* Stipend Information */}
                      <div>
                        <h3 className="font-semibold text-neutral-900 mb-2 text-sm">Stipend/Salary Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wide">Receiving Stipend/Salary?</p>
                            <p className="text-xs font-medium text-neutral-900">
                              {summerApp.details?.hasStipend === 'yes' || summerApp.details?.stipendRs > 0 ? 'Yes' : 'No'}
                            </p>
                          </div>
                          {(summerApp.details?.hasStipend === 'yes' || summerApp.details?.stipendRs > 0) && (
                            <div>
                              <p className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wide">Monthly Amount (Rs.)</p>
                              <p className="text-xs font-medium text-neutral-900">
                                {summerApp.details?.stipendRs?.toLocaleString('en-IN') || 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Documents */}
                      {summerApp.details?.completionCertificateLink && (
                        <div>
                          <h3 className="font-semibold text-neutral-900 mb-2 text-sm">Documents</h3>
                          <div className="space-y-2">
                            <div>
                              <p className="text-[10px] text-neutral-500 mb-1 uppercase tracking-wide">Completion Certificate Link</p>
                              <a 
                                href={summerApp.details.completionCertificateLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline break-all inline-flex items-center gap-1"
                              >
                                <FiLink className="w-3 h-3" />
                                {summerApp.details.completionCertificateLink}
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-4 border-t border-neutral-200">
                        {summerApp.status === 'needs_info' ? (
                          <Link
                            to={isSem8 ? `/student/sem8/internship/apply/summer/${summerApp._id}/edit` : `/student/sem7/internship/apply/summer/${summerApp._id}/edit`}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-warning-600 text-white rounded-lg hover:bg-warning-700 transition-colors text-sm font-medium"
                          >
                            <FiEdit className="w-4 h-4" />
                            Update Application
                          </Link>
                        ) : summerApp.status === 'verified_fail' || summerApp.status === 'absent' ? (
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-neutral-900">Next Steps:</p>
                            <Link
                              to={isInternship2Route 
                                ? "/student/sem8/internship2/register" 
                                : (isSem8 ? "/student/sem8/internship1/register" : "/student/sem7/internship1/register")}
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                              <FiPlus className="w-4 h-4" />
                              Register for {internshipLabel} Project
                            </Link>
                            <p className="text-[11px] text-neutral-600">
                              Since your summer internship application was rejected, you must register for an {internshipLabel} solo project under a faculty member.
                            </p>
                          </div>
                        ) : (
                          <Link
                            to={isSem8 ? `/student/sem8/internship/apply/summer/${summerApp._id}/edit` : `/student/sem7/internship/apply/summer/${summerApp._id}/edit`}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-info-600 text-white rounded-lg hover:bg-info-700 transition-colors text-sm font-medium"
                          >
                            <FiInfo className="w-4 h-4" />
                            View Application Details
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Internship 1 Project Registration Card (No Project) */}
                {selectedPath === 'project' && !hasActiveProject && (
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FiFileText className="w-5 h-5 text-white" />
                        <h2 className="text-lg font-bold text-white">
                          Register {internshipLabel} Project
                        </h2>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-neutral-700 mb-4 leading-relaxed">
                        Register for a solo internship project under a faculty mentor. You'll need to provide project details and select faculty preferences.
                      </p>
                      {internship1Status && !internship1Status.eligible ? (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                          <p className="text-xs text-yellow-800">
                            <strong>Not Eligible:</strong> {internship1Status.reason}
                          </p>
                        </div>
                      ) : (
                        <Link
                          to={isInternship2Route 
                            ? "/student/sem8/internship2/register" 
                            : (isSem8 ? "/student/sem8/internship1/register" : "/student/sem7/internship1/register")}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm shadow-sm"
                        >
                          <FiPlus className="w-4 h-4" />
                          Register {internshipLabel} Project
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Internship 1 Project Dashboard Card */}
                {hasActiveProject && (
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FiFileText className="w-5 h-5 text-white" />
                          <h2 className="text-lg font-bold text-white">
                            Project Dashboard
                          </h2>
                        </div>
                        <Link
                          to={`/projects/${internship1Project._id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-xs font-medium"
                        >
                          Open Dashboard
                          <FiArrowLeft className="w-3 h-3 rotate-180" />
                        </Link>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                          Project Title
                        </label>
                        <p className="text-sm font-semibold text-neutral-900 mt-1">
                          {internship1Project.title}
                        </p>
                      </div>
                      {internship1Project.domain && (
                        <div>
                          <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                            Domain
                          </label>
                          <p className="text-sm text-neutral-800 mt-1">
                            {internship1Project.domain}
                          </p>
                        </div>
                      )}
                      {(internship1Project.faculty || internship1Project.allocatedFaculty) && (
                        <div>
                          <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                            Faculty Guide
                          </label>
                          <p className="text-sm text-neutral-800 mt-1">
                            {formatFacultyName(internship1Project.faculty) || 
                             formatFacultyName(internship1Project.allocatedFaculty) || 
                             'Not allocated yet'}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                          Status
                        </label>
                        <div className="mt-1">
                          <StatusBadge 
                            status={
                              internship1Project.status === 'active' ? 'success' :
                              internship1Project.status === 'faculty_allocated' ? 'info' :
                              internship1Project.status === 'registered' ? 'warning' :
                              'warning'
                            }
                            text={internship1Project.status || 'Registered'}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Waiting for Faculty Allocation Card */}
                {hasActiveProject && !internship1Project?.faculty && (
                  <div className="bg-success-50 border border-success-200 rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <FiCheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-success-900 mb-1 text-sm">Project Registered Successfully</h3>
                        <p className="text-xs text-success-800">
                          Your {internshipLabel} has been registered and is pending faculty allocation.
                        </p>
                      </div>
                    </div>
                    <div className="bg-white border border-success-200 rounded-lg p-4 mt-3">
                      <div className="flex items-start gap-3">
                        <FiClock className="w-4 h-4 text-warning-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-neutral-900 mb-1 text-xs">Waiting for Faculty Allocation</h4>
                          <p className="text-[11px] text-neutral-700">
                            Faculty members review and choose projects based on your preferences. You'll be notified when a faculty member chooses your project.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Track Change - Register Prompt */}
                {isRejectedDueToTrackChange && (!internship1Project || (internship1Project.status && internship1Project.status === 'cancelled')) && (
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                      <div className="flex items-start gap-3">
                        <FiAlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-amber-900 mb-1">
                            Your {internshipLabel} track has been changed by admin
                          </h3>
                          <p className="text-xs text-amber-800 mb-2">
                            Your track has been changed from <strong>Summer Internship Application</strong> to <strong>{internshipLabel} Project (Institute Faculty)</strong>.
                          </p>
                          {summerApp?.adminRemarks && (
                            <p className="text-xs text-amber-700">
                              <strong>Admin Remarks:</strong> {summerApp.adminRemarks}
                            </p>
                          )}
                          <p className="text-xs text-amber-800 mt-2 font-medium">
                            Please note: Your summer internship application has been rejected. You must now register for and complete an {internshipLabel} project under a faculty mentor.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 text-center">
                      <h2 className="text-lg font-semibold text-neutral-900 mb-2">Register for {internshipLabel} Project</h2>
                      <p className="text-sm text-neutral-600 mb-4">
                        You need to register for an {internshipLabel} solo project under an Institute Faculty supervisor.
                      </p>
                      <Link
                        to={isInternship2Route 
                          ? "/student/sem8/internship2/register" 
                          : (isSem8 ? "/student/sem8/internship1/register" : "/student/sem7/internship1/register")}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors shadow-md text-sm"
                      >
                        <FiPlus className="w-4 h-4" />
                        Register for {internshipLabel} Project
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Information & Tips */}
            <div className="lg:col-span-3 bg-surface-100 border-l border-neutral-200 overflow-y-auto custom-scrollbar min-h-0 h-full">
              <div className="p-4 space-y-4">
                
                {/* About Internship 1 */}
                <div className="bg-info-50 rounded-xl p-4 border border-info-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FiInfo className="w-4 h-4 text-info-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      About {internshipLabel}
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs text-info-800">
                    <p>• <strong>Type:</strong> Solo project under faculty mentor</p>
                    <p>• <strong>Eligibility:</strong> Students who have not completed an approved 2-month summer internship</p>
                    <p>• <strong>Faculty Preferences:</strong> Select preferred faculty members</p>
                    <p>• <strong>Duration:</strong> Continues throughout {isSem8 ? 'Semester 8' : 'Semester 7'}</p>
                    <p>• <strong>Next Steps:</strong> After registration, faculty allocation will be processed based on your preferences</p>
                  </div>
                </div>

                {/* Workflow Steps */}
                <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FiTarget className="w-4 h-4 text-primary-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Workflow Steps
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                        1
                      </div>
                      <p className="text-xs text-neutral-700">
                        Choose your path (Summer Application or Solo Project)
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                        2
                      </div>
                      <p className="text-xs text-neutral-700">
                        {selectedPath === 'summer' 
                          ? 'Submit evidence and wait for admin review'
                          : 'Register project and submit faculty preferences'}
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                        3
                      </div>
                      <p className="text-xs text-neutral-700">
                        {selectedPath === 'summer'
                          ? 'Admin reviews and approves/rejects'
                          : 'Wait for faculty allocation'}
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                        4
                      </div>
                      <p className="text-xs text-neutral-700">
                        {selectedPath === 'summer'
                          ? 'If approved, no project needed'
                          : 'Faculty allocated, project active'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tips & Reminders */}
                <div className="bg-warning-50 rounded-xl p-4 border border-warning-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FiZap className="w-4 h-4 text-warning-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Tips & Reminders
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {!selectedPath ? (
                      <>
                        <p className="text-xs text-warning-800">• Choose your path based on whether you've completed a summer internship</p>
                        <p className="text-xs text-warning-800">• Summer internship applications require completion certificate</p>
                        <p className="text-xs text-warning-800">• Solo projects require faculty preferences</p>
                      </>
                    ) : selectedPath === 'summer' ? (
                      <>
                        <p className="text-xs text-warning-800">• Ensure all details are accurate before submission</p>
                        <p className="text-xs text-warning-800">• Upload completion certificate as proof</p>
                        <p className="text-xs text-warning-800">• Respond promptly to admin requests for updates</p>
                      </>
                    ) : selectedPath === 'project' && !hasActiveProject ? (
                      <>
                        <p className="text-xs text-warning-800">• Register your project as soon as possible</p>
                        <p className="text-xs text-warning-800">• Select faculty preferences carefully</p>
                        <p className="text-xs text-warning-800">• Project title should be clear and descriptive</p>
                      </>
                    ) : selectedPath === 'project' && hasActiveProject && !internship1Project?.faculty ? (
                      <>
                        <p className="text-xs text-warning-800">• Faculty allocation is based on your preferences</p>
                        <p className="text-xs text-warning-800">• Faculty members review and choose projects</p>
                        <p className="text-xs text-warning-800">• You'll be notified when a faculty member chooses your project</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-warning-800">• Schedule regular meetings with your faculty guide</p>
                        <p className="text-xs text-warning-800">• Work on project deliverables throughout the semester</p>
                        <p className="text-xs text-warning-800">• Submit deliverables on time</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Important Notes */}
                <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FiAlertTriangle className="w-4 h-4 text-warning-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Important Notes
                    </h3>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-neutral-700">
                    <p>• {internshipLabel} is a solo project (no groups)</p>
                    <p>• Faculty allocation is not guaranteed</p>
                    <p>• Project must be completed within the semester</p>
                    <p>• Deliverables must be submitted on time</p>
                    <p>• Track changes by admin may affect your path</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Internship1Dashboard;
