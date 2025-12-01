import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSem7Project } from '../../hooks/useSem7Project';
import { useSem8 } from '../../context/Sem8Context';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import { formatFacultyName } from '../../utils/formatUtils';

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
    getInternshipApplication
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
  
  // State for Sem 8 Internship 1 project and status (for Type 1 students who might have Internship 1 in Sem 8)
  const [sem8Internship1Project, setSem8Internship1Project] = useState(null);
  const [sem8Internship1Status, setSem8Internship1Status] = useState(null);
  
  // Use appropriate project and status based on route and semester
  // If Internship 2 route, use internship2Project; otherwise use internship1Project
  const internship1Project = isInternship2Route 
    ? internship2Project 
    : (isSem8 ? sem8Internship1Project : sem7Internship1Project);
  const internship1Status = isInternship2Route
    ? internship2Status
    : (isSem8 ? sem8Internship1Status : sem7Internship1Status);
  const loading = isSem8 ? sem8Loading : sem7Loading;
  
  // Determine display labels based on route
  const internshipLabel = isInternship2Route ? 'Internship 2' : 'Internship 1';
  const internshipProjectLabel = isInternship2Route ? 'Internship 2 Project' : 'Internship 1 Project';

  const [isLoading, setIsLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState(null); // 'completed' or 'not_completed'
  const prevLocationRef = useRef();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      if (isSem7) {
        await fetchSem7Data();
      } else if (isSem8 && isType1) {
        // For Internship 2 route, ensure Sem8Context data is loaded
        if (isInternship2Route) {
          // Ensure Sem8Context data is loaded (this loads internship2Project and internship2Status)
          if (fetchSem8Data) {
            await fetchSem8Data();
          }
        } else {
          // For Internship 1 in Sem 8, load separately
          try {
            let foundProject = null;
            
            // First, try to load projects directly
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
            
            // Also load status for eligibility info
            const statusResponse = await studentAPI.checkInternship1Status();
            if (statusResponse.success && statusResponse.data) {
              setSem8Internship1Status(statusResponse.data);
              // If status response has existingProject but we didn't find it in projects, use it
              if (statusResponse.data.existingProject && !foundProject) {
                // The existingProject from status might have limited fields, but it's better than nothing
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

  // Refresh data when navigating to this page (e.g., after updating application)
  useEffect(() => {
    // If location changed and we're on this page, refresh data
    const isInternshipDashboard = location.pathname === '/student/sem7/internship1/dashboard' || 
                                   location.pathname === '/student/sem8/internship1/dashboard' ||
                                   location.pathname === '/student/sem8/internship2/dashboard';
    if (prevLocationRef.current !== location.pathname && isInternshipDashboard) {
      const refreshData = async () => {
        if (isSem7) {
          await fetchSem7Data();
        } else if (isSem8 && isType1) {
          if (isInternship2Route) {
            // For Internship 2, refresh Sem8Context data to reload internship2Project and internship2Status
            if (fetchSem8Data) {
              await fetchSem8Data();
            }
          } else {
            // Refresh Sem 8 Internship 1 data (not Internship 2)
            try {
              let foundProject = null;
              
              // First, try to load projects directly
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
              
              // Also load status for eligibility info
              const statusResponse = await studentAPI.checkInternship1Status();
              if (statusResponse.success && statusResponse.data) {
                setSem8Internship1Status(statusResponse.data);
                // If status response has existingProject but we didn't find it in projects, use it
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

  // Determine selected track (use chosenTrack - no need to wait for finalization)
  const selectedTrack = isSem8 ? (sem8Status?.selection?.chosenTrack || sem8Status?.selection?.finalizedTrack) : trackChoice?.chosenTrack;

  // Redirect if not eligible (only after data is loaded)
  useEffect(() => {
    // Don't redirect while loading - wait for data to load first
    if (loading) return;
    
    // For Sem 7: Check track choice
    if (isSem7) {
      if (!trackChoice) return;
      if (!selectedTrack || selectedTrack !== 'coursework') {
        navigate('/dashboard/student');
      }
    }
    
    // For Sem 8: Check if Type 1 student
    if (isSem8) {
      if (!isType1) {
        navigate('/dashboard/student');
      }
    }
  }, [selectedTrack, loading, trackChoice, navigate, isSem7, isSem8, isType1, sem8Status]);

  // Check if student has summer internship application
  // For Sem 8, use Sem8Context applications; for Sem 7, use Sem7Context
  const summerApp = isSem8
    ? (sem8InternshipApplications || []).find(app => app.type === 'summer' && app.semester === 8)
    : getInternshipApplication('summer');
  const hasSummerApp = !!summerApp;
  // Check if summer internship is approved (status can be 'approved' or 'verified_pass' depending on when it was reviewed)
  // hasApprovedSummerInternship is already a boolean from the hook, not a function
  const summerAppApproved = hasApprovedSummerInternship || 
                            (summerApp && (summerApp.status === 'approved' || summerApp.status === 'verified_pass'));

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

  if (isLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading {internshipLabel} dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // If student has registered for Internship 1 project and it's not cancelled, show project dashboard (prioritize over application)
  // Note: Context filters out cancelled projects, so if internship1Project exists, it's active
  // But we still check status to be safe
  // For Internship 2, allow projects even if status is undefined/null (newly registered projects might not have status set yet)
  if (internship1Project && (internship1Project.status === undefined || internship1Project.status === null || internship1Project.status !== 'cancelled')) {
    // Redirect directly to project dashboard
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{internshipLabel}</h1>
                <p className="text-gray-600">
                  Manage your solo internship project
                </p>
              </div>
              <Link
                to="/dashboard/student"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            {/* Track Change Notification - Switched from Summer Internship to Project */}
            {summerApp && (summerApp.status === 'verified_fail' || summerApp.status === 'absent') && 
             summerApp.adminRemarks && summerApp.adminRemarks.includes('Switched to Internship-I under Institute Faculty') && (
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
                        Your track has been changed from <strong>Summer Internship Application</strong> to <strong>Internship 1 Project (Institute Faculty)</strong>.
                      </p>
                      {summerApp.adminRemarks && (
                        <p className="mt-2">
                          <strong>Admin Remarks:</strong> {summerApp.adminRemarks}
                        </p>
                      )}
                      <p className="mt-2 text-sm font-medium">
                        You have successfully registered for Internship 1 project. {internship1Project.faculty ? 'Your faculty supervisor has been allocated.' : 'Waiting for faculty supervisor allocation.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{internshipProjectLabel}</h2>
                    <p className="text-sm text-gray-500">Project Dashboard</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-700 w-24">Project:</span>
                    <span className="text-gray-900">{internship1Project.title || 'N/A'}</span>
                  </div>
                  {internship1Project.domain && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-24">Domain:</span>
                      <span className="text-gray-900">{internship1Project.domain}</span>
                    </div>
                  )}
                  {internship1Project.faculty ? (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-24">Faculty:</span>
                      <span className="text-gray-900">{formatFacultyName(internship1Project.faculty, 'Not allocated yet')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-24">Faculty:</span>
                      <span className="text-yellow-600 font-medium">Pending Allocation</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-700 w-24">Status:</span>
                    <StatusBadge 
                      status={
                        internship1Project.status === 'active' ? 'success' :
                        internship1Project.status === 'faculty_allocated' ? 'info' :
                        internship1Project.status === 'registered' ? 'warning' :
                        'warning'
                      }
                      text={
                        internship1Project.status === 'active' ? 'Active' :
                        internship1Project.status === 'faculty_allocated' ? 'Allocated' :
                        internship1Project.status === 'registered' ? 'Registered' :
                        internship1Project.status
                      }
                    />
                  </div>
                </div>
              </div>
              
              <Link
                to={`/projects/${internship1Project._id}`}
                className="ml-4 inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Open Project Dashboard
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // If student has submitted summer internship evidence, show status page
  // But only if track is actually application (not rejected due to track change to project)
  // Check if application was rejected due to track change to project
  const isRejectedDueToTrackChange = summerApp && 
    (summerApp.status === 'verified_fail' || summerApp.status === 'absent') &&
    summerApp.adminRemarks && 
    summerApp.adminRemarks.includes('Switched to Internship-I under Institute Faculty');
  
  // Only show application dashboard if:
  // 1. There's a summer app
  // 2. There's no active (non-cancelled) project
  // 3. The application is NOT rejected due to track change to project
  // Note: If application was rejected due to track change, we show registration prompt instead (handled below)
  // Note: Context filters out cancelled projects, so if internship1Project exists, it's active
  if (hasSummerApp && !internship1Project && !isRejectedDueToTrackChange) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{internshipLabel}</h1>
                <p className="text-gray-600">
                  Manage your 2-month summer internship
                </p>
              </div>
              <Link
                to="/dashboard/student"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          {/* Application Status Card */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Summer Internship Application</h2>
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

            <div className="p-6 space-y-6">
              {/* URGENT: Application has placeholder values - needs to be filled */}
              {/* Only show if application has placeholder values and status is 'submitted' */}
              {hasPlaceholderValues && (
                <div className="mb-6 p-5 bg-red-50 border-l-4 border-red-500 rounded-md shadow-lg animate-pulse">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-lg font-bold text-red-900 mb-2">
                        ⚠️ URGENT: Complete Your Application Immediately
                      </h3>
                      <div className="mt-2 text-sm text-red-800">
                        <p className="font-semibold mb-2">
                          Your summer internship application contains placeholder information and must be completed immediately.
                        </p>
                        <p className="mb-3">
                          <strong>This is your TOP PRIORITY.</strong> Please fill in all required details including:
                        </p>
                        <ul className="list-disc list-inside space-y-1 mb-4 ml-2">
                          <li>Company name and details</li>
                          <li>Actual internship start and end dates</li>
                          <li>Manager/contact information</li>
                          <li>Completion certificate</li>
                        </ul>
                        <Link
                          to={isSem8 ? `/student/sem8/internship/apply/summer/${summerApp._id}/edit` : `/student/sem7/internship/apply/summer/${summerApp._id}/edit`}
                          className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-md mt-2"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Fill Application Now
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Track Change Notification */}
              {summerApp?.adminRemarks && summerApp.adminRemarks.includes('Switched from Internship-I under Institute Faculty') && (
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
                          Your track has been changed from <strong>Internship 1 Project (Institute Faculty)</strong> to <strong>Summer Internship Application</strong>.
                        </p>
                        {summerApp.adminRemarks && (
                          <p className="mt-2">
                            <strong>Admin Remarks:</strong> {summerApp.adminRemarks}
                          </p>
                        )}
                        <p className="mt-2 text-sm font-medium">
                          Please note: Your Internship 1 project has been cancelled and all progress has been reset. Please proceed with the summer internship application.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Message */}
              {summerAppApproved ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-green-900 mb-1">Summer Internship Approved</h3>
                      <p className="text-sm text-green-800">
                        Your 2-month summer internship has been approved. Internship 1 project is not required.
                      </p>
                    </div>
                  </div>
                </div>
              ) : summerApp.status === 'needs_info' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-1">Update Required</h3>
                      <p className="text-sm text-yellow-800">
                        Please update your application with the requested information from the admin.
                      </p>
                    </div>
                  </div>
                </div>
              ) : summerApp.status === 'submitted' && summerApp.adminRemarks === 'Assigned by admin' ? (
                // Fresh assignment by admin to summer internship application track
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-1">Assigned to Summer Internship Application</h3>
                      <p className="text-sm text-blue-800 mb-3">
                        You have been assigned to submit a summer internship application. Please provide your summer internship details and completion certificate.
                      </p>
                      {summerApp.adminRemarks && (
                        <div className="mt-3 p-3 border border-blue-300 rounded-md bg-blue-100">
                          <p className="text-xs font-medium mb-1 text-blue-900">Admin Remarks:</p>
                          <p className="text-sm text-blue-800">{summerApp.adminRemarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : summerApp.status === 'verified_fail' || summerApp.status === 'absent' ? (
                // Check if this is a fresh assignment to project track or a track change/rejection
                // Fresh assignment to project: 'verified_fail' status with 'Assigned by admin' remarks
                // Track change from application: 'verified_fail' status with 'Switched to Internship-I under Institute Faculty' remarks
                // Actual rejection: 'verified_fail' status with other remarks
                (() => {
                  const isFreshProjectAssignment = summerApp.adminRemarks === 'Assigned by admin' || 
                    (summerApp.adminRemarks && summerApp.adminRemarks.includes('Assigned by admin') && 
                     !summerApp.adminRemarks.includes('Switched'));
                  const isTrackChange = summerApp.adminRemarks && summerApp.adminRemarks.includes('Switched to Internship-I under Institute Faculty');
                  
                  if (isFreshProjectAssignment) {
                    // Fresh assignment by admin to project track (not a rejection)
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex-1">
                            <h3 className="font-semibold text-blue-900 mb-1">Assigned to Internship 1 Project</h3>
                            <p className="text-sm text-blue-800 mb-3">
                              You have been assigned to complete an Internship 1 project under an Institute Faculty supervisor. Please register for your Internship 1 solo project.
                            </p>
                            {summerApp.adminRemarks && (
                              <div className="mt-3 p-3 border border-blue-300 rounded-md bg-blue-100">
                                <p className="text-xs font-medium mb-1 text-blue-900">Admin Remarks:</p>
                                <p className="text-sm text-blue-800">{summerApp.adminRemarks}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Track change or actual rejection
                  return (
                    <div className={`border rounded-lg p-4 ${
                      isTrackChange
                        ? 'bg-amber-50 border-amber-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start">
                        <svg className={`w-5 h-5 mt-0.5 mr-3 ${
                          isTrackChange
                            ? 'text-amber-600' 
                            : 'text-red-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                          <h3 className={`font-semibold mb-1 ${
                            isTrackChange
                              ? 'text-amber-900' 
                              : 'text-red-900'
                          }`}>
                            {isTrackChange
                              ? 'Track Changed to Internship 1 Project'
                              : 'Application Rejected'}
                      </h3>
                          <p className={`text-sm mb-3 ${
                            isTrackChange
                              ? 'text-amber-800' 
                              : 'text-red-800'
                          }`}>
                            {isTrackChange
                              ? 'Your track has been changed to Internship 1 Project. Please register for Internship 1 solo project under a faculty member.'
                              : 'Your summer internship application was rejected by the admin. You must complete an Internship 1 solo project under a faculty member.'}
                      </p>
                      {summerApp.adminRemarks && (
                            <div className={`mt-3 p-3 border rounded-md ${
                              isTrackChange
                                ? 'bg-amber-100 border-amber-300' 
                                : 'bg-red-100 border-red-300'
                            }`}>
                              <p className={`text-xs font-medium mb-1 ${
                                isTrackChange
                                  ? 'text-amber-900' 
                                  : 'text-red-900'
                              }`}>Admin Remarks:</p>
                              <p className={`text-sm ${
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Application Submitted</h3>
                      <p className="text-sm text-blue-800">
                        Your summer internship evidence has been submitted and is awaiting admin review.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Remarks */}
              {summerApp.adminRemarks && (summerApp.status === 'needs_info' || summerApp.status === 'verified_fail' || summerApp.status === 'absent') && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Admin Remarks</h3>
                  <p className="text-sm text-gray-700">{summerApp.adminRemarks}</p>
                </div>
              )}

              {/* Internship Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Company Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Company Name</p>
                      <p className="text-sm font-medium text-gray-900">{summerApp.details?.companyName || 'N/A'}</p>
                    </div>
                    {summerApp.details?.location && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Location</p>
                        <p className="text-sm text-gray-900">{summerApp.details.location}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Duration</p>
                      <p className="text-sm text-gray-900">
                        {summerApp.details?.startDate && summerApp.details?.endDate
                          ? `${new Date(summerApp.details.startDate).toLocaleDateString()} - ${new Date(summerApp.details.endDate).toLocaleDateString()}`
                          : 'N/A'}
                      </p>
                    </div>
                    {summerApp.details?.mode && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Mode</p>
                        <p className="text-sm text-gray-900 capitalize">{summerApp.details.mode}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Manager/Contact Details</h3>
                  <div className="space-y-3">
                    {summerApp.details?.mentorName && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Manager Name</p>
                        <p className="text-sm text-gray-900">{summerApp.details.mentorName}</p>
                      </div>
                    )}
                    {summerApp.details?.mentorEmail && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Email Address</p>
                        <p className="text-sm text-gray-900">{summerApp.details.mentorEmail}</p>
                      </div>
                    )}
                    {summerApp.details?.mentorPhone && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Contact Number</p>
                        <p className="text-sm text-gray-900">{summerApp.details.mentorPhone}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Nature of Work */}
              {summerApp.details?.roleOrNatureOfWork && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Nature of Work</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{summerApp.details.roleOrNatureOfWork}</p>
                </div>
              )}

              {/* Stipend Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Stipend/Salary Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Receiving Stipend/Salary?</p>
                    <p className="text-sm font-medium text-gray-900">
                      {summerApp.details?.hasStipend === 'yes' || summerApp.details?.stipendRs > 0 ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {(summerApp.details?.hasStipend === 'yes' || summerApp.details?.stipendRs > 0) && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Monthly Amount (Rs.)</p>
                      <p className="text-sm font-medium text-gray-900">
                        {summerApp.details?.stipendRs?.toLocaleString('en-IN') || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Documents</h3>
                <div className="space-y-2">
                  {summerApp.details?.completionCertificateLink && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Completion Certificate Link</p>
                      <a 
                        href={summerApp.details.completionCertificateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all inline-block"
                      >
                        {summerApp.details.completionCertificateLink}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200">
                {summerApp.status === 'needs_info' ? (
                  <Link
                    to={isSem8 ? `/student/sem8/internship/apply/summer/${summerApp._id}/edit` : `/student/sem7/internship/apply/summer/${summerApp._id}/edit`}
                    className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Update Application
                  </Link>
                ) : summerApp.status === 'verified_fail' || summerApp.status === 'absent' ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-900">Next Steps:</p>
                    <Link
                      to={isSem8 ? "/student/sem8/internship1/register" : "/student/sem7/internship1/register"}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Register for Internship 1 Project
                    </Link>
                    <p className="text-xs text-gray-600">
                      Since your summer internship application was rejected, you must register for an Internship 1 solo project under a faculty member.
                    </p>
                  </div>
                ) : (
                  <Link
                    to={isSem8 ? `/student/sem8/internship/apply/summer/${summerApp._id}/edit` : `/student/sem7/internship/apply/summer/${summerApp._id}/edit`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Application Details
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // If student has Internship 1 project registered and not cancelled, redirect to project dashboard directly
  // (No group dashboard option like Major Project 1 since this is a solo project)
  // Note: Context filters out cancelled projects, so if internship1Project exists, it's active
  // But we still check status to be safe (in case context hasn't refreshed)
  if (internship1Project && internship1Project.status && internship1Project.status !== 'cancelled') {
    // Redirect directly to project dashboard
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{internshipLabel}</h1>
                <p className="text-gray-600">
                  Manage your solo internship project
                </p>
              </div>
              <Link
                to="/dashboard/student"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            {/* Track Change Notification - Switched from Summer Internship to Project */}
            {summerApp && (summerApp.status === 'verified_fail' || summerApp.status === 'absent') && 
             summerApp.adminRemarks && summerApp.adminRemarks.includes('Switched to Internship-I under Institute Faculty') && (
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
                        Your track has been changed from <strong>Summer Internship Application</strong> to <strong>Internship 1 Project (Institute Faculty)</strong>.
                      </p>
                      {summerApp.adminRemarks && (
                        <p className="mt-2">
                          <strong>Admin Remarks:</strong> {summerApp.adminRemarks}
                        </p>
                      )}
                      <p className="mt-2 text-sm font-medium">
                        Please note: Your summer internship application has been rejected. You must now register for and complete an Internship 1 project under a faculty mentor.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{internshipProjectLabel}</h2>
                    <p className="text-sm text-gray-500">Project Dashboard</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-700 w-24">Project:</span>
                    <span className="text-gray-900">{internship1Project.title || 'N/A'}</span>
                  </div>
                  {internship1Project.domain && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-24">Domain:</span>
                      <span className="text-gray-900">{internship1Project.domain}</span>
                    </div>
                  )}
                  {internship1Project.faculty && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-24">Faculty:</span>
                      <span className="text-gray-900">{formatFacultyName(internship1Project.faculty, 'Not allocated yet')}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-700 w-24">Status:</span>
                    <StatusBadge 
                      status={
                        internship1Project.status === 'active' ? 'success' :
                        internship1Project.status === 'faculty_allocated' ? 'info' :
                        internship1Project.status === 'registered' ? 'warning' :
                        'warning'
                      }
                      text={internship1Project.status}
                    />
                  </div>
                </div>
              </div>
              
              <Link
                to={`/projects/${internship1Project._id}`}
                className="ml-4 inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Open Project Dashboard
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show path selection if no selection made yet
  // BUT: For Internship 2 route, if project exists, skip selection screen and show project dashboard
  // (The project check above should have caught this, but if it didn't due to timing, check here too)
  if (!selectedPath && !(isInternship2Route && internship1Project)) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{internshipLabel}</h1>
                <p className="text-gray-600">
                  Complete your 2-month summer internship requirement
                </p>
              </div>
              <Link
                to="/dashboard/student"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          {/* Path Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Option 1: Completed Summer Internship */}
            <div 
              onClick={() => setSelectedPath('completed')}
              className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-blue-200 hover:border-blue-400"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">✅</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    I have completed 2-month internship
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Submit your summer internship evidence and completion certificate
                  </p>
                </div>
              </div>
            </div>

            {/* Option 2: Not Completed - Register Internship 1 Project */}
            {/* Only show if no summer internship application has been submitted */}
            {!hasSummerApp && (
              <div 
                onClick={() => setSelectedPath('not_completed')}
                className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-green-200 hover:border-green-400"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📝</span>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      I haven't completed internship
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Register for {internshipLabel} solo project under a faculty mentor
                    </p>
                    {internship1Status && !internship1Status.eligible && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          {internship1Status.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }
  
  // Fallback: If application was rejected due to track change to project, show registration prompt
  // This handles the case where:
  // 1. Student had a project that was cancelled when track changed to application
  // 2. Track was changed back to project
  // 3. Student needs to register a new project (old one is cancelled)
  // Note: Context filters out cancelled projects, so internship1Project will be null if only cancelled project exists
  // But we also check status explicitly in case context hasn't refreshed yet
  if (isRejectedDueToTrackChange && (!internship1Project || (internship1Project.status && internship1Project.status === 'cancelled'))) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{internshipLabel}</h1>
                <p className="text-gray-600">
                  Track changed to Internship 1 Project
                </p>
              </div>
              <Link
                to="/dashboard/student"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
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
                      Your track has been changed from <strong>Summer Internship Application</strong> to <strong>Internship 1 Project (Institute Faculty)</strong>.
                    </p>
                    {summerApp?.adminRemarks && (
                      <p className="mt-2">
                        <strong>Admin Remarks:</strong> {summerApp.adminRemarks}
                      </p>
                    )}
                    <p className="mt-2 text-sm font-medium">
                      Please note: Your summer internship application has been rejected. You must now register for and complete an Internship 1 project under a faculty mentor.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Register for {internshipLabel} Project</h2>
              <p className="text-gray-600 mb-6">
                You need to register for an {internshipLabel} solo project under an Institute Faculty supervisor.
              </p>
              <Link
                to={isInternship2Route 
                  ? "/student/sem8/internship2/register" 
                  : (isSem8 ? "/student/sem8/internship1/register" : "/student/sem7/internship1/register")}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Register for {internshipLabel} Project
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show selected path content
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{internshipLabel}</h1>
              <p className="text-gray-600">
                {selectedPath === 'completed' ? 'Submit Summer Internship Evidence' : `Register ${internshipLabel} Project`}
              </p>
            </div>
            <button
              onClick={() => setSelectedPath(null)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Options
            </button>
          </div>
        </div>

        {selectedPath === 'completed' ? (
          // Summer Internship Evidence Submission
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Submit Summer Internship Evidence
              </h2>
              <p className="text-gray-600">
                Provide details about your completed 2-month summer internship
              </p>
            </div>

            {hasSummerApp ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Application Status:</strong> {summerApp.status}
                  </p>
                  {summerApp.status === 'needs_info' && (
                    <p className="text-sm text-blue-700 mb-4">
                      Please update your application with the requested information.
                    </p>
                  )}
                </div>
                <Link
                  to={summerApp.status === 'needs_info' 
                    ? (isSem8 ? `/student/sem8/internship/apply/summer/${summerApp._id}/edit` : `/student/sem7/internship/apply/summer/${summerApp._id}/edit`)
                    : (isSem8 ? `/student/sem8/internship/apply/summer/${summerApp._id}/edit` : `/student/sem7/internship/apply/summer/${summerApp._id}/edit`)
                  }
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {summerApp.status === 'needs_info' ? 'Update Application' : 'View Application'}
                </Link>
              </div>
            ) : (
              <Link
                to={isSem8 ? "/student/sem8/internship/apply/summer" : "/student/sem7/internship/apply/summer"}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Submit Internship Evidence
              </Link>
            )}
          </div>
        ) : (
          // Internship Project Registration
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Register {internshipLabel} Project
              </h2>
              <p className="text-gray-600">
                Register for a solo internship project under a faculty mentor
              </p>
            </div>

            {internship1Status && !internship1Status.eligible ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Not Eligible:</strong> {internship1Status.reason}
                </p>
              </div>
            ) : (
              <Link
                to={isInternship2Route 
                  ? "/student/sem8/internship2/register" 
                  : (isSem8 ? "/student/sem8/internship1/register" : "/student/sem7/internship1/register")}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Register {internshipLabel} Project
              </Link>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Internship1Dashboard;

