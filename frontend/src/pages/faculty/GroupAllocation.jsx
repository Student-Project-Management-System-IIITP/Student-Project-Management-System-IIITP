import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { facultyAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import GroupCard from '../../components/groups/GroupCard';
import ChoosePassButtons from '../../components/allocation/ChoosePassButtons';

const GroupAllocation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('unallocated');
  const [unallocatedGroups, setUnallocatedGroups] = useState([]);
  const [allocatedGroups, setAllocatedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  // Load group allocation data
  useEffect(() => {
    const loadGroupData = async () => {
      try {
        setLoading(true);
        
        const [unallocatedResponse, allocatedResponse] = await Promise.all([
          facultyAPI.getUnallocatedGroups(),
          facultyAPI.getAllocatedGroups()
        ]);

        setUnallocatedGroups(unallocatedResponse.data || []);
        setAllocatedGroups(allocatedResponse.data || []);
      } catch (error) {
        console.error('Failed to load group data:', error);
        toast.error('Failed to load group allocation data');
      } finally {
        setLoading(false);
      }
    };

    loadGroupData();
  }, []);

  const handleChooseGroup = async (groupId) => {
    try {
      setActionLoading(prev => ({ ...prev, [groupId]: 'choose' }));
      
      await facultyAPI.chooseGroup(groupId);
      
      // Remove from unallocated and add to allocated
      const chosenGroup = unallocatedGroups.find(g => g._id === groupId);
      if (chosenGroup) {
        setUnallocatedGroups(prev => prev.filter(g => g._id !== groupId));
        setAllocatedGroups(prev => [...prev, { ...chosenGroup, allocatedFaculty: user }]);
      }
      
      toast.success('Group allocated successfully!');
    } catch (error) {
      toast.error(`Failed to allocate group: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [groupId]: null }));
    }
  };

  const handlePassGroup = async (groupId) => {
    try {
      setActionLoading(prev => ({ ...prev, [groupId]: 'pass' }));
      
      await facultyAPI.passGroup(groupId);
      
      // Remove from current faculty's view
      setUnallocatedGroups(prev => prev.filter(g => g._id !== groupId));
      
      toast.success('Group passed to next preference');
    } catch (error) {
      toast.error(`Failed to pass group: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [groupId]: null }));
    }
  };

  const handleViewGroupDetails = async (groupId) => {
    try {
      const response = await facultyAPI.getGroupDetails(groupId);
      // You can implement a modal or navigate to a details page
      console.log('Group details:', response.data);
    } catch (error) {
      toast.error('Failed to load group details');
    }
  };

  // Filter groups for current faculty
  const currentFacultyUnallocatedGroups = unallocatedGroups.filter(
    group => group.currentFaculty?._id === user._id
  );

  const currentFacultyAllocatedGroups = allocatedGroups.filter(
    group => group.allocatedFaculty?._id === user._id
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading group allocation data...</p>
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
                Group Allocation
              </h1>
              <p className="mt-2 text-gray-600">
                Review and allocate groups for Minor Project 2
              </p>
            </div>
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

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">{currentFacultyUnallocatedGroups.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Allocated Groups</p>
                <p className="text-2xl font-bold text-gray-900">{currentFacultyAllocatedGroups.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Groups</p>
                <p className="text-2xl font-bold text-gray-900">{unallocatedGroups.length + allocatedGroups.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Allocation Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allocatedGroups.length > 0 ? 
                    Math.round((currentFacultyAllocatedGroups.length / (currentFacultyAllocatedGroups.length + currentFacultyUnallocatedGroups.length)) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('unallocated')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'unallocated'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Requests ({currentFacultyUnallocatedGroups.length})
              </button>
              <button
                onClick={() => setActiveTab('allocated')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'allocated'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Groups ({currentFacultyAllocatedGroups.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'unallocated' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Pending Allocation Requests</h2>
                <p className="text-gray-600 mt-1">
                  Groups that have selected you as a preference. Choose to allocate or pass to next preference.
                </p>
              </div>
              <div className="p-6">
                {currentFacultyUnallocatedGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
                    <p className="text-gray-600">
                      You don't have any pending group allocation requests at the moment.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {currentFacultyUnallocatedGroups.map((group) => (
                      <div key={group._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <GroupCard 
                          group={group} 
                          showActions={false}
                          userRole="faculty"
                        />
                        
                        {/* Group Details */}
                        <div className="mt-4 space-y-3">
                          {group.project && (
                            <div>
                              <h4 className="font-medium text-gray-900">Project Details:</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Title:</strong> {group.project.title}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Domain:</strong> {group.project.domain}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Description:</strong> {group.project.description?.substring(0, 100)}...
                              </p>
                            </div>
                          )}
                          
                          {group.members && group.members.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900">Group Members:</h4>
                              <div className="mt-1 space-y-1">
                                {group.members.map((member, index) => (
                                  <div key={index} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">
                                      {member.student?.fullName} ({member.student?.rollNumber})
                                    </span>
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      member.role === 'leader' 
                                        ? 'bg-purple-100 text-purple-800' 
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {member.role}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <ChoosePassButtons
                            groupId={group._id}
                            onChoose={() => handleChooseGroup(group._id)}
                            onPass={() => handlePassGroup(group._id)}
                            onViewDetails={() => handleViewGroupDetails(group._id)}
                            loading={actionLoading[group._id]}
                            disabled={actionLoading[group._id]}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">My Allocated Groups</h2>
                <p className="text-gray-600 mt-1">
                  Groups that you have allocated and are currently supervising.
                </p>
              </div>
              <div className="p-6">
                {currentFacultyAllocatedGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Allocated Groups</h3>
                    <p className="text-gray-600">
                      You haven't allocated any groups yet. Check the pending requests tab to allocate groups.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {currentFacultyAllocatedGroups.map((group) => (
                      <div key={group._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <GroupCard 
                          group={group} 
                          showActions={false}
                          userRole="faculty"
                        />
                        
                        {/* Allocation Info */}
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-sm font-medium text-green-800">
                              Allocated on {new Date(group.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleViewGroupDetails(group._id)}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => navigate(`/faculty/groups/${group._id}/manage`)}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
          </div>
        )}

        {/* Information Card */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">About Group Allocation</h3>
          <div className="text-blue-800 space-y-2">
            <p>• <strong>Choose:</strong> Allocate the group to yourself and start supervising</p>
            <p>• <strong>Pass:</strong> Pass the group to the next faculty preference</p>
            <p>• <strong>Review:</strong> View detailed group and project information before deciding</p>
            <p>• <strong>Allocation Order:</strong> Groups are presented based on student preference priority</p>
            <p>• <strong>Workload:</strong> Consider your current workload before allocating groups</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupAllocation;
