import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { facultyAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import GroupCard from '../../components/groups/GroupCard';
import GroupMemberList from '../../components/groups/GroupMemberList';

const AllocatedGroups = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [allocatedGroups, setAllocatedGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  // Load allocated groups data
  useEffect(() => {
    const loadAllocatedGroups = async () => {
      try {
        setLoading(true);
        const response = await facultyAPI.getAllocatedGroups();
        setAllocatedGroups(response.data || []);
      } catch (error) {
        console.error('Failed to load allocated groups:', error);
        toast.error('Failed to load allocated groups');
      } finally {
        setLoading(false);
      }
    };

    loadAllocatedGroups();
  }, []);

  const handleViewGroupDetails = async (groupId) => {
    try {
      setActionLoading(prev => ({ ...prev, [groupId]: 'loading' }));
      const response = await facultyAPI.getGroupDetails(groupId);
      setSelectedGroup(response.data);
    } catch (error) {
      toast.error('Failed to load group details');
    } finally {
      setActionLoading(prev => ({ ...prev, [groupId]: null }));
    }
  };

  const handleManageGroup = (groupId) => {
    navigate(`/faculty/groups/${groupId}/manage`);
  };

  // Filter groups for current faculty
  const currentFacultyGroups = allocatedGroups.filter(
    group => group.allocatedFaculty?._id === user._id
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading allocated groups...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                My Allocated Groups
              </h1>
              <p className="mt-2 text-gray-600">
                Manage and supervise your allocated Minor Project 2 groups
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/faculty/groups/allocation')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Allocation Requests
              </button>
              <button
                onClick={() => navigate('/dashboard/faculty')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Groups</p>
                <p className="text-2xl font-bold text-gray-900">{currentFacultyGroups.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">👨‍🎓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentFacultyGroups.reduce((total, group) => total + (group.members?.filter(m => m.isActive !== false).length || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📚</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentFacultyGroups.filter(group => group.project?.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Group Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentFacultyGroups.length > 0 ? 
                    Math.round(currentFacultyGroups.reduce((total, group) => total + (group.members?.filter(m => m.isActive !== false).length || 0), 0) / currentFacultyGroups.length * 10) / 10 
                    : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Groups List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Allocated Groups</h2>
            <p className="text-gray-600 mt-1">
              Click on any group to view detailed information and manage the group.
            </p>
          </div>
          <div className="p-6">
            {currentFacultyGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Allocated Groups</h3>
                <p className="text-gray-600 mb-4">
                  You haven't allocated any groups yet. Check the allocation requests to allocate groups.
                </p>
                <button
                  onClick={() => navigate('/faculty/groups/allocation')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Allocation Requests
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {currentFacultyGroups.map((group) => (
                  <div key={group._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <GroupCard 
                          group={group} 
                          showActions={false}
                          userRole="faculty"
                        />
                        
                        {/* Project Information */}
                        {group.project && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Project Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-600">Title:</span>
                                <p className="text-gray-900">{group.project.title}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Domain:</span>
                                <p className="text-gray-900">{group.project.domain}</p>
                              </div>
                              <div className="md:col-span-2">
                                <span className="font-medium text-gray-600">Description:</span>
                                <p className="text-gray-900">{group.project.description}</p>
                              </div>
                              {group.project.technicalRequirements && (
                                <div className="md:col-span-2">
                                  <span className="font-medium text-gray-600">Technical Requirements:</span>
                                  <p className="text-gray-900">{group.project.technicalRequirements}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Group Members */}
                        {group.members && group.members.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-3">Group Members</h4>
                            <GroupMemberList 
                              members={group.members}
                              showRoles={true}
                              showContact={true}
                              currentUserId={null}
                              canManage={false}
                            />
                          </div>
                        )}

                        {/* Allocation Info */}
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                              <span className="text-sm font-medium text-green-800">
                                Allocated on {new Date(group.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <span className="text-xs text-green-600">
                              {group.allocatedBy === 'faculty_choice' ? 'Faculty Choice' : 'Admin Allocation'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="ml-6 flex flex-col space-y-3">
                        <button
                          onClick={() => handleViewGroupDetails(group._id)}
                          disabled={actionLoading[group._id]}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[120px]"
                        >
                          {actionLoading[group._id] === 'loading' ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Loading...
                            </>
                          ) : (
                            'View Details'
                          )}
                        </button>
                        <button
                          onClick={() => handleManageGroup(group._id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-w-[120px]"
                        >
                          Manage Group
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Group Details Modal */}
        {selectedGroup && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Group Details</h3>
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <GroupCard 
                    group={selectedGroup} 
                    showActions={false}
                    userRole="faculty"
                  />
                  
                  {selectedGroup.project && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Project Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Title:</span>
                          <p className="text-gray-900">{selectedGroup.project.title}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Domain:</span>
                          <p className="text-gray-900">{selectedGroup.project.domain}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Description:</span>
                          <p className="text-gray-900">{selectedGroup.project.description}</p>
                        </div>
                        {selectedGroup.project.technicalRequirements && (
                          <div>
                            <span className="font-medium text-gray-600">Technical Requirements:</span>
                            <p className="text-gray-900">{selectedGroup.project.technicalRequirements}</p>
                          </div>
                        )}
                        {selectedGroup.project.methodology && (
                          <div>
                            <span className="font-medium text-gray-600">Methodology:</span>
                            <p className="text-gray-900">{selectedGroup.project.methodology}</p>
                          </div>
                        )}
                        {selectedGroup.project.expectedOutcome && (
                          <div>
                            <span className="font-medium text-gray-600">Expected Outcome:</span>
                            <p className="text-gray-900">{selectedGroup.project.expectedOutcome}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGroup(null);
                      handleManageGroup(selectedGroup._id);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Manage Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Information Card */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">About Group Management</h3>
          <div className="text-blue-800 space-y-2">
            <p>• <strong>View Details:</strong> View comprehensive group and project information</p>
            <p>• <strong>Manage Group:</strong> Access group management tools and student communication</p>
            <p>• <strong>Project Supervision:</strong> Monitor project progress and provide guidance</p>
            <p>• <strong>Student Support:</strong> Assist students with technical and academic challenges</p>
            <p>• <strong>Evaluation:</strong> Evaluate group performance and individual contributions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllocatedGroups;
