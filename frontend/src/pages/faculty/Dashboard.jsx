import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { facultyAPI } from '../../utils/api';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';

const FacultyDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  
  // Sem 4 specific state
  const [sem4Stats, setSem4Stats] = useState({
    evaluationAssignments: 0,
    sem4Projects: 0,
    pendingEvaluations: 0,
    completedEvaluations: 0
  });
  const [sem4Projects, setSem4Projects] = useState([]);
  const [evaluationAssignments, setEvaluationAssignments] = useState([]);
  
  // Sem 5 specific state
  const [sem5Stats, setSem5Stats] = useState({
    unallocatedGroups: 0,
    allocatedGroups: 0,
    pendingAllocations: 0,
    totalGroups: 0
  });
  const [unallocatedGroups, setUnallocatedGroups] = useState([]);
  const [allocatedGroups, setAllocatedGroups] = useState([]);
  
  const [loading, setLoading] = useState(true);

  // Load both Sem 4 and Sem 5 data
  useEffect(() => {
    const loadFacultyData = async () => {
      if (!user?._id) return; // Don't load if not logged in
      try {
        setLoading(true);
        
        // Load faculty Sem 4 data
        const [projectsResponse, assignmentsResponse] = await Promise.all([
          facultyAPI.getSem4Projects(),
          facultyAPI.getEvaluationAssignments()
        ]);

        setSem4Projects(projectsResponse.data || []);
        setEvaluationAssignments(assignmentsResponse.data || []);
        
        // Calculate Sem 4 stats
        const projects = projectsResponse.data || [];
        const assignments = assignmentsResponse.data || [];
        const sem4Stats = {
          evaluationAssignments: assignments.length,
          sem4Projects: projects.length,
          pendingEvaluations: assignments.filter(a => !a.evaluatedAt).length,
          completedEvaluations: assignments.filter(a => a.evaluatedAt).length
        };
        
        setSem4Stats(sem4Stats);

        // Load faculty Sem 5 data
        try {
          const [unallocatedResponse, allocatedResponse] = await Promise.all([
            facultyAPI.getUnallocatedGroups(),
            facultyAPI.getAllocatedGroups()
          ]);

          setUnallocatedGroups(unallocatedResponse.data || []);
          setAllocatedGroups(allocatedResponse.data || []);
          
          // Calculate Sem 5 stats
          const unallocated = unallocatedResponse.data || [];
          const allocated = allocatedResponse.data || [];
          const sem5Stats = {
            unallocatedGroups: unallocated.length,
            allocatedGroups: allocated.length,
            pendingAllocations: unallocated.filter(g => g.currentFaculty?._id === user._id).length,
            totalGroups: unallocated.length + allocated.length
          };
          
          setSem5Stats(sem5Stats);
        } catch (sem5Error) {
          console.warn('Sem 5 data not available:', sem5Error);
          // Set default Sem 5 stats if not available
          setSem5Stats({
            unallocatedGroups: 0,
            allocatedGroups: 0,
            pendingAllocations: 0,
            totalGroups: 0
          });
        }
      } catch (error) {
        console.error('Failed to load faculty data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFacultyData();
  }, [user?._id]);

  // Show loading screen if authentication is loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading faculty dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Faculty Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Welcome, {user?.name || 'Faculty Member'}! Manage your students and projects
        </p>
      </div>

      {/* Sem 4 Statistics */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">B.Tech Semester 4 - Minor Project 1</h2>
          <p className="text-green-200 mb-6">Your evaluation assignments and project oversight</p>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem4Stats.evaluationAssignments}</div>
                <div className="text-green-200 text-sm">Evaluation Assignments</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem4Stats.sem4Projects}</div>
                <div className="text-green-200 text-sm">Sem 4 Projects</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem4Stats.pendingEvaluations}</div>
                <div className="text-green-200 text-sm">Pending Evaluations</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem4Stats.completedEvaluations}</div>
                <div className="text-green-200 text-sm">Completed Evaluations</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sem 5 Statistics */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">B.Tech Semester 5 - Minor Project 2</h2>
          <p className="text-blue-200 mb-6">Group allocation requests and project supervision</p>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem5Stats.unallocatedGroups}</div>
                <div className="text-blue-200 text-sm">Unallocated Groups</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem5Stats.allocatedGroups}</div>
                <div className="text-blue-200 text-sm">Allocated Groups</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem5Stats.pendingAllocations}</div>
                <div className="text-blue-200 text-sm">Pending Requests</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem5Stats.totalGroups}</div>
                <div className="text-blue-200 text-sm">Total Groups</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Link
            to="/faculty/evaluations"
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            📝 Manage Evaluations
          </Link>
          <Link
            to="/faculty/projects/sem4"
            className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            📚 View Sem 4 Projects
          </Link>
          <Link
            to="/faculty/groups/allocation"
            className="inline-flex items-center px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            👥 Group Allocation
          </Link>
          <Link
            to="/faculty/groups/allocated"
            className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            📋 My Groups
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">👨‍🎓</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Students</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">📚</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">📝</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">🔔</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Notifications</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Sem 4 Evaluation Assignments</h2>
            <Link
              to="/faculty/evaluations"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : evaluationAssignments.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No evaluation assignments yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {evaluationAssignments.slice(0, 5).map((assignment) => (
                  <div key={assignment._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{assignment.project?.title || 'Project Title'}</h3>
                      <p className="text-sm text-gray-600">
                        {assignment.student?.fullName || 'Student Name'} • 
                        {assignment.student?.rollNumber || 'Roll Number'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Assigned: {new Date(assignment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <StatusBadge status={assignment.evaluatedAt ? 'completed' : 'pending'} />
                      <Link
                        to={`/faculty/evaluations/${assignment._id}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Evaluate
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Sem 4 Students</h2>
            <Link
              to="/faculty/students/sem4"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              </div>
            ) : sem4Projects.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">No Sem 4 students assigned yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sem4Projects.slice(0, 5).map((project) => (
                  <div key={project._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{project.student?.fullName || 'Student Name'}</h3>
                      <p className="text-sm text-gray-600">
                        {project.student?.rollNumber || 'Roll Number'} • 
                        {project.student?.collegeEmail || 'Email'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Project: {project.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Registered: {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <StatusBadge status={project.status} />
                      <Link
                        to={`/faculty/projects/${project._id}`}
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Sem 5 Group Requests</h2>
            <Link
              to="/faculty/groups/allocation"
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
              </div>
            ) : unallocatedGroups.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">No group allocation requests yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {unallocatedGroups
                  .filter(group => group.currentFaculty?._id === user._id)
                  .slice(0, 5)
                  .map((group) => (
                    <div key={group._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{group.name}</h3>
                        <p className="text-sm text-gray-600">
                          {group.members?.length || 0} members • {group.project?.domain || 'No domain'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(group.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <StatusBadge status="pending" />
                        <Link
                          to={`/faculty/groups/${group._id}/review`}
                          className="text-sm text-orange-600 hover:text-orange-700"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
