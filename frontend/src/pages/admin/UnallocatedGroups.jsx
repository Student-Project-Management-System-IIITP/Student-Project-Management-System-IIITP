import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, facultyAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import GroupCard from '../../components/groups/GroupCard';
import GroupMemberList from '../../components/groups/GroupMemberList';

const UnallocatedGroups = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [unallocatedGroups, setUnallocatedGroups] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Load unallocated groups and faculty data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        const [groupsResponse, facultyResponse] = await Promise.all([
          adminAPI.getUnallocatedGroups(),
          facultyAPI.getFaculty()
        ]);

        setUnallocatedGroups(groupsResponse.data || []);
        setFaculty(facultyResponse.data || []);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load unallocated groups data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter groups based on search
  const filteredGroups = unallocatedGroups.filter(group => 
    searchTerm === '' ||
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.project?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.project?.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.members?.some(member => 
      member.student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.student?.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleAllocateFaculty = async (groupId, facultyId) => {
    try {
      setActionLoading(prev => ({ ...prev, [groupId]: 'allocating' }));
      
      await adminAPI.forceAllocateFaculty(groupId, facultyId);
      
      // Remove the group from unallocated list
      setUnallocatedGroups(prev => prev.filter(g => g._id !== groupId));
      
      toast.success('Faculty allocated successfully!');
      setSelectedGroup(null);
      setSelectedFaculty('');
    } catch (error) {
      toast.error(`Failed to allocate faculty: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [groupId]: null }));
    }
  };

  const handleViewGroupDetails = async (groupId) => {
    try {
      const response = await adminAPI.getGroupDetails(groupId);
      setSelectedGroup(response.data);
    } catch (error) {
      toast.error('Failed to load group details');
    }
  };

  const handleCloseModal = () => {
    setSelectedGroup(null);
    setSelectedFaculty('');
  };

  const handleAllocateInModal = () => {
    if (!selectedFaculty) {
      toast.error('Please select a faculty member');
      return;
    }
    handleAllocateFaculty(selectedGroup._id, selectedFaculty);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading unallocated groups...</p>
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
                Unallocated Groups
              </h1>
              <p className="mt-2 text-gray-600">
                Manually allocate faculty to groups that were not chosen through preferences
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/admin/groups/sem5')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View All Groups
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unallocated Groups</p>
                <p className="text-2xl font-bold text-gray-900">{unallocatedGroups.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">👨‍🏫</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Faculty</p>
                <p className="text-2xl font-bold text-gray-900">{faculty.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {unallocatedGroups.reduce((total, group) => total + (group.members?.length || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Allocation Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {unallocatedGroups.length > 0 ? 
                    Math.round((unallocatedGroups.length / (unallocatedGroups.length + 10)) * 100) 
                    : 100}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Groups</label>
            <input
              type="text"
              placeholder="Search by group name, project, or student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Unallocated Groups ({filteredGroups.length})
            </h2>
            <p className="text-gray-600 mt-1">
              Groups that need manual faculty allocation. Click on any group to allocate a faculty member.
            </p>
          </div>
          <div className="p-6">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {unallocatedGroups.length === 0 ? 'All Groups Allocated!' : 'No Groups Found'}
                </h3>
                <p className="text-gray-600">
                  {unallocatedGroups.length === 0 
                    ? "All groups have been successfully allocated to faculty members." 
                    : "No groups match your search criteria."}
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

                        {/* Faculty Preferences */}
                        {group.facultyPreferences && group.facultyPreferences.length > 0 && (
                          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Faculty Preferences</h4>
                            <div className="space-y-2">
                              {group.facultyPreferences.map((pref, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">
                                    {index + 1}. {pref.faculty?.fullName || 'Unknown Faculty'}
                                  </span>
                                  <span className="text-gray-500">
                                    {pref.faculty?.mode || 'Regular'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Allocation Status */}
                        <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                            <span className="text-sm font-medium text-orange-800">
                              Awaiting manual allocation
                            </span>
                          </div>
                          <p className="text-xs text-orange-600 mt-1">
                            This group was not chosen by any faculty preference
                          </p>
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
                        <button
                          onClick={() => {
                            setSelectedGroup(group);
                            setSelectedFaculty('');
                          }}
                          disabled={actionLoading[group._id]}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors min-w-[120px]"
                        >
                          {actionLoading[group._id] === 'allocating' ? 'Allocating...' : 'Allocate Faculty'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Allocation Modal */}
        {selectedGroup && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Allocate Faculty</h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Group Information */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Group: {selectedGroup.name}</h4>
                    <p className="text-sm text-gray-600">
                      {selectedGroup.members?.length || 0} members • 
                      {selectedGroup.project?.domain || 'No domain'} • 
                      {selectedGroup.project?.title || 'No project'}
                    </p>
                  </div>

                  {/* Faculty Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Faculty Member
                    </label>
                    <select
                      value={selectedFaculty}
                      onChange={(e) => setSelectedFaculty(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Choose a faculty member...</option>
                      {faculty.map((facultyMember) => (
                        <option key={facultyMember._id} value={facultyMember._id}>
                          {facultyMember.fullName} - {facultyMember.mode} ({facultyMember.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Faculty Information */}
                  {selectedFaculty && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      {(() => {
                        const facultyMember = faculty.find(f => f._id === selectedFaculty);
                        return facultyMember ? (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">
                              Selected Faculty: {facultyMember.fullName}
                            </h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p><strong>Mode:</strong> {facultyMember.mode}</p>
                              <p><strong>Department:</strong> {facultyMember.department}</p>
                              <p><strong>Email:</strong> {facultyMember.collegeEmail}</p>
                              <p><strong>Designation:</strong> {facultyMember.designation}</p>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAllocateInModal}
                    disabled={!selectedFaculty || actionLoading[selectedGroup._id]}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading[selectedGroup._id] === 'allocating' ? 'Allocating...' : 'Allocate Faculty'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Information Card */}
        <div className="mt-8 bg-orange-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-4">About Manual Allocation</h3>
          <div className="text-orange-800 space-y-2">
            <p>• <strong>When to Use:</strong> Groups that were not chosen by any faculty preference</p>
            <p>• <strong>Faculty Selection:</strong> Choose from available faculty members based on expertise</p>
            <p>• <strong>Workload Consideration:</strong> Consider faculty's current workload before allocation</p>
            <p>• <strong>Department Matching:</strong> Match faculty expertise with project domain when possible</p>
            <p>• <strong>Notification:</strong> Both faculty and students will be notified of the allocation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnallocatedGroups;
