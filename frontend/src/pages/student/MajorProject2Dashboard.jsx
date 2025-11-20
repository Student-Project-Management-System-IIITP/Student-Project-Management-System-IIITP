import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSem8Project } from '../../hooks/useSem8Project';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';

const MajorProject2Dashboard = () => {
  const navigate = useNavigate();
  const { roleData } = useAuth();
  const {
    majorProject2,
    majorProject2Group,
    finalizedTrack,
    trackChoice,
    studentType,
    isType1,
    isType2,
    loading: sem8Loading,
    fetchSem8Data
  } = useSem8Project();

  // Determine selected track (finalized takes precedence, else chosen)
  const selectedTrack = finalizedTrack || (trackChoice?.chosenTrack);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchSem8Data();
      setIsLoading(false);
    };
    loadData();
  }, [fetchSem8Data]);

  // Redirect if not eligible for Major Project 2
  // Type 1 students have 'coursework' track, Type 2 students have 'major2' track
  useEffect(() => {
    if (!sem8Loading) {
      // Type 1 students should always have access (they're auto-enrolled in coursework)
      if (isType1) {
        // Allow access - Type 1 students are always on coursework track for Major Project 2
        return;
      }
      
      // Type 2 students: Only allow if track is 'major2'
      if (isType2 && selectedTrack && selectedTrack !== 'major2') {
        navigate('/dashboard/student');
        return;
      }
      
      // If not Type 1 or Type 2, or no track selected, redirect
      if (!isType1 && !isType2) {
        navigate('/dashboard/student');
      }
    }
  }, [selectedTrack, sem8Loading, navigate, isType1, isType2]);

  // Check if user is group leader (Type 1 only)
  const isGroupLeader = isType1 && (
    majorProject2Group?.leader?._id === roleData?._id || 
    majorProject2Group?.leader === roleData?._id
  );

  if (isLoading || sem8Loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading Major Project 2 dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Major Project 2</h1>
              <p className="text-gray-600">
                {isType1 
                  ? 'Manage your group project for Semester 8' 
                  : 'Manage your solo project for Semester 8'}
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

        {/* Content based on current state */}
        <div className="space-y-6">
          {/* Type 1: Step 1: Create Group */}
          {isType1 && !majorProject2Group && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Step 1: Create Group
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Form a new group for Major Project 2. You can invite other Type 1 students to join your group.
                  </p>
                  <Link
                    to="/student/groups/create"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Group
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Project Dashboard (if project exists) - Show first */}
          {majorProject2 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Major Project 2</h2>
                      <p className="text-sm text-gray-500">Project Dashboard</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-24">Project:</span>
                      <span className="text-gray-900">{majorProject2.title}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-24">Faculty:</span>
                      {majorProject2.faculty || majorProject2Group?.allocatedFaculty ? (
                        <span className="text-gray-900">
                          {majorProject2.faculty?.fullName || 
                           majorProject2Group?.allocatedFaculty?.fullName || 
                           (typeof majorProject2Group?.allocatedFaculty === 'string' ? majorProject2Group.allocatedFaculty : 'Not allocated yet')}
                        </span>
                      ) : (
                        <span className="text-yellow-600 font-medium">Pending Allocation</span>
                      )}
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-24">Status:</span>
                      <StatusBadge 
                        status={
                          majorProject2.status === 'active' ? 'success' :
                          majorProject2.status === 'faculty_allocated' ? 'info' :
                          majorProject2.status === 'registered' ? 'warning' :
                          'warning'
                        }
                        text={majorProject2.status}
                      />
                    </div>
                  </div>
                </div>
                
                <Link
                  to={`/projects/${majorProject2._id}`}
                  className="ml-4 inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Open Project Dashboard
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          )}

          {/* Type 1: Register Major Project 2 Section (when group is finalized) */}
          {isType1 && 
           majorProject2Group && 
           majorProject2Group.status === 'finalized' && 
           !majorProject2 && 
           isGroupLeader && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📝</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Register Major Project 2
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Your group is finalized! As the group leader, you can now register the project details and submit faculty preferences.
                  </p>
                  <Link
                    to="/student/sem8/major2/register"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Register Major Project 2
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Type 1: Waiting for leader message */}
          {isType1 && 
           majorProject2Group && 
           majorProject2Group.status === 'finalized' && 
           !majorProject2 && 
           !isGroupLeader && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Waiting for Group Leader</h3>
                  <p className="mt-1 text-sm text-blue-700">
                    Your group is finalized. Please wait for the group leader to register Major Project 2.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Type 2: Register Major Project 2 Section (solo project) */}
          {isType2 && 
           selectedTrack === 'major2' && 
           !majorProject2 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📝</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Register Major Project 2
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Register your solo Major Project 2. You will need to provide project details and submit faculty preferences.
                  </p>
                  <Link
                    to="/student/sem8/major2/register"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Register Major Project 2
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Type 1: Group Dashboard Section */}
          {isType1 && majorProject2Group && majorProject2Group._id && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-2xl">👥</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Group Dashboard</h2>
                      <p className="text-sm text-gray-500">Manage your group members and invitations</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-24">Group Name:</span>
                      <span className="text-gray-900">{majorProject2Group.name || majorProject2Group.groupName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-24">Status:</span>
                      <StatusBadge 
                        status={
                          majorProject2Group.status === 'finalized' ? 'success' :
                          majorProject2Group.status === 'locked' ? 'success' :
                          majorProject2Group.status === 'open' ? 'info' :
                          majorProject2Group.status === 'invitations_sent' ? 'warning' :
                          majorProject2Group.status || 'warning'
                        }
                        text={
                          majorProject2Group.status === 'locked' ? 'Allocated' :
                          majorProject2Group.status === 'finalized' ? 'Finalized' :
                          majorProject2Group.status || 'Unknown'
                        }
                      />
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-700 w-24">Members:</span>
                      <span className="text-gray-900">
                        {majorProject2Group.members?.filter(m => m.isActive || m.isActive === undefined).length || 
                         majorProject2Group.members?.length || 
                         0} / {majorProject2Group.maxMembers || 5}
                      </span>
                    </div>
                    {majorProject2Group.status && 
                     majorProject2Group.status !== 'finalized' && 
                     majorProject2Group.status !== 'locked' &&
                     !majorProject2 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Action Required:</strong> Please finalize your group before registering the project.
                        </p>
                      </div>
                    )}
                    {majorProject2Group.status === 'locked' && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>✓ Group Allocated:</strong> Your group has been allocated to a faculty supervisor.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {majorProject2Group._id && (
                  <Link
                    to={`/student/groups/${majorProject2Group._id}/dashboard`}
                    className="ml-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Open Group Dashboard
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MajorProject2Dashboard;

