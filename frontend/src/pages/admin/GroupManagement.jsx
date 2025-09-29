import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import GroupCard from '../../components/groups/GroupCard';
import GroupMemberList from '../../components/groups/GroupMemberList';

const GroupManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [allocationFilter, setAllocationFilter] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Load groups data
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getSem5Groups();
        setGroups(response.data || []);
      } catch (error) {
        console.error('Failed to load groups:', error);
        toast.error('Failed to load groups data');
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  // Filter groups based on search and filters
  useEffect(() => {
    let filtered = groups;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.project?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.project?.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.members?.some(member => 
          member.student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.student?.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(group => {
        switch (statusFilter) {
          case 'forming':
            return group.status === 'forming';
          case 'complete':
            return group.status === 'complete';
          case 'active':
            return group.status === 'active';
          case 'completed':
            return group.status === 'completed';
          default:
            return true;
        }
      });
    }

    // Allocation filter
    if (allocationFilter !== 'all') {
      filtered = filtered.filter(group => {
        switch (allocationFilter) {
          case 'allocated':
            return group.allocatedFaculty;
          case 'unallocated':
            return !group.allocatedFaculty;
          default:
            return true;
        }
      });
    }

    setFilteredGroups(filtered);
  }, [groups, searchTerm, statusFilter, allocationFilter]);

  const handleViewGroupDetails = async (groupId) => {
    try {
      const response = await adminAPI.getGroupDetails(groupId);
      setSelectedGroup(response.data);
    } catch (error) {
      toast.error('Failed to load group details');
    }
  };

  const handleForceAllocateFaculty = async (groupId, facultyId) => {
    try {
      await adminAPI.forceAllocateFaculty(groupId, facultyId);
      toast.success('Faculty allocated successfully');
      
      // Update the group in the list
      setGroups(prev => prev.map(group => 
        group._id === groupId 
          ? { ...group, allocatedFaculty: { _id: facultyId } }
          : group
      ));
      
      setSelectedGroup(null);
    } catch (error) {
      toast.error(`Failed to allocate faculty: ${error.message}`);
    }
  };

  // Calculate statistics
  const stats = {
    total: groups.length,
    allocated: groups.filter(g => g.allocatedFaculty).length,
    unallocated: groups.filter(g => !g.allocatedFaculty).length,
    complete: groups.filter(g => g.status === 'complete').length,
    forming: groups.filter(g => g.status === 'forming').length,
    totalStudents: groups.reduce((total, group) => total + (group.members?.length || 0), 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading groups data...</p>
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
                Sem 5 Group Management
              </h1>
              <p className="mt-2 text-gray-600">
                Manage and oversee all B.Tech Semester 5 groups
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/admin/groups/unallocated')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                View Unallocated
              </button>
              <button
                onClick={() => navigate('/dashboard/admin')}
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
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Groups</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.allocated}</div>
            <div className="text-sm text-gray-600">Allocated</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.unallocated}</div>
            <div className="text-sm text-gray-600">Unallocated</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.complete}</div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.forming}</div>
            <div className="text-sm text-gray-600">Forming</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalStudents}</div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Groups</label>
              <input
                type="text"
                placeholder="Search by group name, project, or student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="forming">Forming</option>
                <option value="complete">Complete</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allocation Filter</label>
              <select
                value={allocationFilter}
                onChange={(e) => setAllocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Groups</option>
                <option value="allocated">Allocated</option>
                <option value="unallocated">Unallocated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Groups List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Groups ({filteredGroups.length})
            </h2>
            <p className="text-gray-600 mt-1">
              Click on any group to view detailed information and manage allocation.
            </p>
          </div>
          <div className="p-6">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Found</h3>
                <p className="text-gray-600">
                  {groups.length === 0 
                    ? "No groups have been formed yet." 
                    : "No groups match your current filters."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredGroups.map((group) => (
                  <div key={group._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <GroupCard 
                          group={group} 
                          showActions={false}
                          userRole="admin"
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
                        <div className="mt-4 p-3 rounded-lg ${
                          group.allocatedFaculty ? 'bg-green-50' : 'bg-orange-50'
                        }">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                group.allocatedFaculty ? 'bg-green-500' : 'bg-orange-500'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                group.allocatedFaculty ? 'text-green-800' : 'text-orange-800'
                              }`}>
                                {group.allocatedFaculty 
                                  ? `Allocated to ${group.allocatedFaculty.fullName || 'Faculty'}`
                                  : 'Not yet allocated'
                                }
                              </span>
                            </div>
                            <span className="text-xs text-gray-600">
                              {group.allocatedBy === 'faculty_choice' ? 'Faculty Choice' : 'Admin Allocation'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="ml-6 flex flex-col space-y-3">
                        <button
                          onClick={() => handleViewGroupDetails(group._id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-w-[120px]"
                        >
                          View Details
                        </button>
                        {!group.allocatedFaculty && (
                          <button
                            onClick={() => navigate(`/admin/groups/unallocated`)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors min-w-[120px]"
                          >
                            Allocate Faculty
                          </button>
                        )}
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
                    userRole="admin"
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
                  {!selectedGroup.allocatedFaculty && (
                    <button
                      onClick={() => {
                        setSelectedGroup(null);
                        navigate('/admin/groups/unallocated');
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Allocate Faculty
                    </button>
                  )}
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
            <p>• <strong>Allocate Faculty:</strong> Manually assign faculty to unallocated groups</p>
            <p>• <strong>Monitor Progress:</strong> Track group formation and project progress</p>
            <p>• <strong>Filter & Search:</strong> Find specific groups using various filters</p>
            <p>• <strong>Statistics:</strong> Monitor overall group formation and allocation status</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupManagement;
