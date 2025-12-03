import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSem7Project } from '../../hooks/useSem7Project';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import { formatFacultyName } from '../../utils/formatUtils';
import {
  FiArrowLeft, FiUsers, FiUser, FiFileText, FiCheckCircle, FiClock,
  FiAlertCircle, FiInfo, FiTarget, FiBook, FiUserCheck, FiStar,
  FiAlertTriangle, FiZap, FiTrendingUp, FiCalendar, FiMail, FiPhone,
  FiEdit, FiPlus, FiLock, FiUnlock, FiLoader
} from 'react-icons/fi';

const MajorProject1Dashboard = () => {
  const navigate = useNavigate();
  const { roleData } = useAuth();
  const {
    majorProject1,
    majorProject1Group,
    finalizedTrack,
    trackChoice,
    loading: sem7Loading,
    fetchSem7Data,
    getMajorProject1ProgressSteps,
    getNextStep
  } = useSem7Project();

  // Determine selected track (finalized takes precedence, else chosen)
  const selectedTrack = finalizedTrack || (trackChoice?.chosenTrack);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchSem7Data();
      setIsLoading(false);
    };
    loadData();
  }, [fetchSem7Data]);

  // Redirect if not coursework track
  useEffect(() => {
    if (!sem7Loading && selectedTrack && selectedTrack !== 'coursework') {
      navigate('/dashboard/student');
    }
  }, [selectedTrack, sem7Loading, navigate]);

  // CRITICAL: Ensure majorProject1Group is actually a Sem 7 group
  // For members, verify they are actually in the group's members array
  const validSem7Group = (() => {
    if (!majorProject1Group) return null;
    
    // Check semester
    if (majorProject1Group.semester !== 7 && majorProject1Group.semester !== '7') {
      return null;
    }
    
    // Verify student is actually a member (important for members who just joined)
    const studentId = roleData?._id || user?._id;
    if (!studentId) return null;
    
    const isMember = majorProject1Group.members?.some(m => {
      const memberId = m.student?._id || m.student;
      return memberId && memberId.toString() === studentId.toString() && m.isActive !== false;
    });
    
    return isMember ? majorProject1Group : null;
  })();

  // Check if user is group leader (only for valid Sem 7 group)
  const isGroupLeader = validSem7Group && 
                       (validSem7Group.leader?._id === roleData?._id || 
                        validSem7Group.leader === roleData?._id);

  // Get current step first
  const currentStep = getNextStep ? getNextStep() : 'create_group';

  // Get Major Project 1 progress steps (already filtered and includes Faculty Allocated)
  const progressSteps = getMajorProject1ProgressSteps ? getMajorProject1ProgressSteps() : [];

  // Get member count
  const memberCount = validSem7Group?.members?.filter(m => m.isActive !== false).length || 0;
  const maxMembers = validSem7Group?.maxMembers || 5;
  const minMembers = validSem7Group?.minMembers || 4;

  if (isLoading || sem7Loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen bg-surface-200">
          <div className="text-center">
            <FiLoader className="w-12 h-12 text-primary-600 mx-auto animate-spin" />
            <p className="mt-4 text-neutral-600">Loading Major Project 1 dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiFileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-neutral-800">
                    Major Project 1 Dashboard
                  </h1>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Semester 7 • Coursework Track
                  </p>
                </div>
              </div>
              {majorProject1 && (
                <StatusBadge 
                  status={
                    majorProject1.status === 'active' ? 'success' :
                    majorProject1.status === 'faculty_allocated' ? 'info' :
                    majorProject1.status === 'registered' ? 'warning' :
                    'warning'
                  }
                  text={majorProject1.status}
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
                    <FiTarget className="w-4 h-4 text-primary-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Progress Tracker
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {progressSteps.map((step, index) => (
                      <div key={step.id} className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 mt-0.5">
                          {step.completed ? (
                            <FiCheckCircle className="w-4 h-4 text-success-600" />
                          ) : step.status === 'current' ? (
                            <div className="w-4 h-4 rounded-full border-2 border-primary-600 bg-primary-50 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-primary-600" />
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
                      <span className="text-xs text-neutral-600">Group Status:</span>
                      <span className="text-xs font-medium text-neutral-800">
                        {validSem7Group ? (
                          validSem7Group.status === 'finalized' ? 'Finalized' :
                          validSem7Group.status === 'locked' ? 'Allocated' :
                          'In Progress'
                        ) : 'No Group'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-600">Members:</span>
                      <span className="text-xs font-medium text-neutral-800">
                        {validSem7Group ? `${memberCount}/${maxMembers}` : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-600">Project:</span>
                      <span className="text-xs font-medium text-neutral-800">
                        {majorProject1 ? 'Registered' : 'Not Registered'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-600">Faculty:</span>
                      <span className="text-xs font-medium text-neutral-800">
                        {majorProject1?.faculty || validSem7Group?.allocatedFaculty ? 'Allocated' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Your Role */}
                {validSem7Group && (
                  <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl p-4 border border-primary-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      {isGroupLeader ? (
                        <FiStar className="w-4 h-4 text-primary-600" />
                      ) : (
                        <FiUser className="w-4 h-4 text-info-600" />
                      )}
                      <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                        Your Role
                      </h3>
                    </div>
                    <p className="text-xs font-semibold text-neutral-800">
                      {isGroupLeader ? 'Group Leader' : 'Group Member'}
                    </p>
                    {isGroupLeader && (
                      <p className="text-[11px] text-neutral-600 mt-1">
                        You can register the project and manage group settings
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Center Column - Main Content */}
            <div className="lg:col-span-7 bg-surface-50 overflow-y-auto custom-scrollbar min-h-0 h-full">
              <div className="p-4 lg:p-6 space-y-4 pb-6">
                
                {/* Step 1: Create Group */}
                {!validSem7Group && (
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-primary-500 to-secondary-500 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FiUsers className="w-5 h-5 text-white" />
                        <h2 className="text-lg font-bold text-white">
                          Step 1: Create Your Group
                        </h2>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-neutral-700 mb-4 leading-relaxed">
                        Form a new group for Major Project 1. You can invite other coursework students to join your group. 
                        Groups should have {minMembers}-{maxMembers} members.
                      </p>
                      <Link
                        to="/student/groups/create"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm shadow-sm"
                      >
                        <FiPlus className="w-4 h-4" />
                        Create Group
                      </Link>
                    </div>
                  </div>
                )}

                {/* Project Dashboard Card */}
                {majorProject1 && (
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
                          to={`/projects/${majorProject1._id}`}
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
                          {majorProject1.title}
                        </p>
                      </div>
                      {majorProject1.domain && (
                        <div>
                          <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                            Domain
                          </label>
                          <p className="text-sm text-neutral-800 mt-1">
                            {majorProject1.domain}
                          </p>
                        </div>
                      )}
                      {(majorProject1.faculty || validSem7Group?.allocatedFaculty) && (
                        <div>
                          <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                            Faculty Guide
                          </label>
                          <p className="text-sm text-neutral-800 mt-1">
                            {formatFacultyName(majorProject1.faculty) || 
                             formatFacultyName(validSem7Group?.allocatedFaculty) || 
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
                              majorProject1.status === 'active' ? 'success' :
                              majorProject1.status === 'faculty_allocated' ? 'info' :
                              majorProject1.status === 'registered' ? 'warning' :
                              'warning'
                            }
                            text={majorProject1.status}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Register Project Section */}
                {validSem7Group && 
                 validSem7Group.status === 'finalized' && 
                 !majorProject1 && 
                 isGroupLeader && (
                  <div className="bg-white rounded-xl border border-success-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-success-500 to-emerald-500 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FiCheckCircle className="w-5 h-5 text-white" />
                        <h2 className="text-lg font-bold text-white">
                          Ready to Register Project
                        </h2>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                          <FiCheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-success-900 mb-1">
                              Group Finalized Successfully
                            </p>
                            <p className="text-xs text-success-700">
                              Your group is finalized with {memberCount} members. As the group leader, you can now register the project details and submit faculty preferences.
                            </p>
                          </div>
                        </div>
                      </div>
                      <Link
                        to="/student/sem7/major1/register"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors font-medium text-sm shadow-sm"
                      >
                        <FiFileText className="w-4 h-4" />
                        Register Major Project 1
                      </Link>
                    </div>
                  </div>
                )}

                {/* Waiting for Leader */}
                {validSem7Group && 
                 validSem7Group.status === 'finalized' && 
                 !majorProject1 && 
                 !isGroupLeader && (
                  <div className="bg-info-50 border border-info-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <FiInfo className="w-5 h-5 text-info-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-semibold text-info-900 mb-1">
                          Waiting for Group Leader
                        </h3>
                        <p className="text-xs text-info-700 leading-relaxed">
                          Your group is finalized. Please wait for the group leader to register Major Project 1. 
                          You'll be notified once the project is registered.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Group Dashboard Card */}
                {validSem7Group && validSem7Group._id && (
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FiUsers className="w-5 h-5 text-white" />
                        <h2 className="text-lg font-bold text-white">
                          Group Dashboard
                        </h2>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                          Group Name
                        </label>
                        <p className="text-sm font-semibold text-neutral-900 mt-1">
                          {validSem7Group.name || validSem7Group.groupName || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                          Status
                        </label>
                        <div className="mt-1">
                          <StatusBadge 
                            status={
                              validSem7Group.status === 'finalized' ? 'success' :
                              validSem7Group.status === 'locked' ? 'success' :
                              validSem7Group.status === 'open' ? 'info' :
                              validSem7Group.status === 'invitations_sent' ? 'warning' :
                              'warning'
                            }
                            text={
                              validSem7Group.status === 'locked' ? 'Allocated' :
                              validSem7Group.status === 'finalized' ? 'Finalized' :
                              validSem7Group.status || 'Unknown'
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                          Members
                        </label>
                        <p className="text-sm text-neutral-800 mt-1">
                          {memberCount} / {maxMembers} members
                          {memberCount < minMembers && (
                            <span className="ml-2 text-xs text-warning-600">
                              (Minimum: {minMembers})
                            </span>
                          )}
                        </p>
                      </div>
                      
                      {/* Open Group Dashboard Button - Moved here for better visibility */}
                      <div className="pt-2">
                        <Link
                          to={`/student/groups/${validSem7Group._id}/dashboard`}
                          className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                        >
                          <FiUsers className="w-4 h-4" />
                          Open Group Dashboard
                        </Link>
                      </div>

                      {validSem7Group.status && 
                       validSem7Group.status !== 'finalized' && 
                       validSem7Group.status !== 'locked' &&
                       !majorProject1 && (
                        <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <FiAlertTriangle className="w-4 h-4 text-warning-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-warning-800">
                              <strong>Action Required:</strong> Please finalize your group before registering the project.
                            </p>
                          </div>
                        </div>
                      )}
                      {validSem7Group.status === 'locked' && (
                        <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <FiCheckCircle className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-success-800">
                              <strong>Group Allocated:</strong> Your group has been allocated to a faculty supervisor.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Info & Tips */}
            <div className="lg:col-span-3 bg-surface-100 border-l border-neutral-200 overflow-y-auto custom-scrollbar min-h-0 h-full">
              <div className="p-4 space-y-4 pb-6">
                
                {/* About Major Project 1 */}
                <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FiInfo className="w-4 h-4 text-info-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      About Major Project 1
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs text-neutral-700 leading-relaxed">
                    <p>
                      Major Project 1 is a group-based project for Semester 7 coursework track students. 
                      You'll work with a team of {minMembers}-{maxMembers} members under faculty guidance.
                    </p>
                    <p>
                      The project involves research, development, and regular deliverables throughout the semester.
                    </p>
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
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center mt-0.5">
                        <span className="text-[10px] font-bold text-primary-700">1</span>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed">
                        Create or join a group ({minMembers}-{maxMembers} members)
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center mt-0.5">
                        <span className="text-[10px] font-bold text-primary-700">2</span>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed">
                        Finalize your group (group leader action)
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center mt-0.5">
                        <span className="text-[10px] font-bold text-primary-700">3</span>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed">
                        Register project details and submit faculty preferences
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center mt-0.5">
                        <span className="text-[10px] font-bold text-primary-700">4</span>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed">
                        Wait for faculty allocation
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center mt-0.5">
                        <span className="text-[10px] font-bold text-primary-700">5</span>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed">
                        Begin project work with faculty guidance
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tips & Reminders */}
                <div className="bg-warning-50 rounded-xl p-4 border border-warning-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FiZap className="w-4 h-4 text-warning-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Tips & Reminders
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs text-neutral-700 leading-relaxed">
                    {!validSem7Group && (
                      <>
                        <p>• Choose group members carefully - you'll work together for the entire semester</p>
                        <p>• Ensure all members are on the coursework track</p>
                        <p>• Groups must have {minMembers}-{maxMembers} members to be finalized</p>
                      </>
                    )}
                    {validSem7Group && validSem7Group.status !== 'finalized' && (
                      <>
                        <p>• Finalize your group once all members have joined</p>
                        <p>• Only the group leader can finalize the group</p>
                        <p>• You need at least {minMembers} members to finalize</p>
                      </>
                    )}
                    {validSem7Group && validSem7Group.status === 'finalized' && !majorProject1 && (
                      <>
                        <p>• Group leader should register the project as soon as possible</p>
                        <p>• Submit at least 7 faculty preferences during registration</p>
                        <p>• Faculty members review and choose projects based on your preferences</p>
                      </>
                    )}
                    {majorProject1 && !majorProject1.faculty && !validSem7Group?.allocatedFaculty && (
                      <>
                        <p>• Faculty members are reviewing projects based on preferences</p>
                        <p>• Check back regularly for updates</p>
                        <p>• You'll be notified when a faculty member chooses your project</p>
                      </>
                    )}
                    {majorProject1 && (majorProject1.faculty || validSem7Group?.allocatedFaculty) && (
                      <>
                        <p>• Schedule regular meetings with your faculty guide</p>
                        <p>• Submit deliverables on time</p>
                        <p>• Use the project dashboard for communication and file sharing</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Important Notes */}
                <div className="bg-info-50 rounded-xl p-4 border border-info-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FiAlertCircle className="w-4 h-4 text-info-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Important Notes
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs text-neutral-700 leading-relaxed">
                    <p>• Regular progress updates are required throughout the semester</p>
                    <p>• Submit deliverables on time as per the project timeline</p>
                    <p>• Maintain regular communication with your faculty guide</p>
                    <p>• Contact admin if you face any issues</p>
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

export default MajorProject1Dashboard;
