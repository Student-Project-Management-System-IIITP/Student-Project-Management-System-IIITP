import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import websocketManager from '../../utils/websocket';
import GroupCard from '../../components/groups/GroupCard';
import GroupMemberList from '../../components/groups/GroupMemberList';
import StudentSearch from '../../components/groups/StudentSearch';
import StatusBadge from '../../components/common/StatusBadge';

const GroupManager = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { user } = useAuth();
  const { 
    sem5Group, 
    isInGroup, 
    isGroupLeader, 
    getGroupStats,
    fetchSem5Data 
  } = useGroupManagement();

  // Enhanced State Management for Advanced Group Management
  const [groupDetails, setGroupDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [sortBy, setSortBy] = useState('joined'); // 'joined', 'name', 'role'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'pending'

  // 🔥 ENHANCED REAL-TIME WEBSOCKET INTEGRATION
  useEffect(() => {
    if (!groupDetails?._id) return;

    const handleMembershipChange = (payload) => {
      setRealTimeUpdates(prev => [...prev, {
        type: 'membership_change',
        message: payload.changeType === 'member_joined' ? 'Member joined the group' : 
                payload.changeType === 'member_left' ? 'Member left the group' :
                'Group membership updated',
        timestamp: new Date(),
        isPositive: ['member_joined', 'invitations_sent'].includes(payload.changeType)
      }]);
      loadGroupDetails();
      fetchSem5Data();
    };

    const handleLeadershipTransfer = (payload) => {
      setRealTimeUpdates(prev => [...prev, {
        type: 'leadership_transfer',
        message: `Leadership transferred to ${payload.data?.newLeader?.fullName}`,
        timestamp: new Date(),
        isPositive: true
      }]);
      loadGroupDetails();
    };

    const handleGroupFinalized = (payload) => {
      setRealTimeUpdates(prev => [...prev, {
        type: 'group_finalized',
        message: `Group finalized by ${payload.data?.finalizedBy?.fullName}`,
        timestamp: new Date(),
        isPositive: true
      }]);
      loadGroupDetails();
    };

    // Subscribe to WebSocket events for real-time updates
    websocketManager.subscribeToMembershipChanges(handleMembershipChange);
    websocketManager.subscribeToLeadershipTransfers(handleLeadershipTransfer);
    websocketManager.subscribeToGroupFinalizations(handleGroupFinalized);
    websocketManager.joinGroupRoom(groupDetails._id);

    return () => {
      websocketManager.unsubscribe('membership_change', handleMembershipChange);
      websocketManager.unsubscribe('leadership_transfer', handleLeadershipTransfer);
      websocketManager.unsubscribe('group_finalized', handleGroupFinalized);
      websocketManager.leaveGroupRoom();
    };
  }, [groupDetails?._id, user._id]);

  // Load group details with enhanced error handling
  const loadGroupDetails = async () => {
    try {
      setLoading(true);
      if (groupId) {
        const response = await studentAPI.getGroupDetails(groupId);
        setGroupDetails(response.data || response);
      } else if (sem5Group) {
        setGroupDetails(sem5Group);
      }
    } catch (error) {
      console.error('Failed to load group details:', error);
      toast.error('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    loadGroupDetails();
    fetchSem5Data();
  }, [groupId]);

  // 🎯 ENHANCED GROUP MANAGEMENT FUNCTIONS
  const handleSearchStudents = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await studentAPI.getAvailableStudents();
      if (response.success) {
        const filtered = response.data.filter(student => 
          student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.collegeEmail.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSearchResults(filtered.slice(0, 10)); // Limit to 10 results
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Failed to search students');
    }
  };

  const handleInviteStudents = async (students) => {
    if (!students.length) return;

    try {
      setActionLoading(true);
      const studentIds = students.map(s => s._id);
      const roles = students.map(() => 'member'); // All invited students are members initially
      
      const response = await studentAPI.inviteToGroup(groupDetails._id, studentIds, roles);
      
      if (response.success) {
        toast.success(`Invitations sent to ${students.length} students`);
        loadGroupDetails(); // Refresh group data
        setSelectedStudents([]);
      } else {
        throw new Error(response.message || 'Failed to send invitations');
      }
    } catch (error) {
      toast.error(`Failed to invite students: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferLeadership = async (newLeaderId) => {
    try {
      setActionLoading(true);
      const response = await studentAPI.transferLeadership(groupDetails._id, { newLeaderId });
      
      if (response.success) {
        toast.success('Leadership transferred successfully');
        loadGroupDetails();
        fetchSem5Data();
        setShowTransferModal(false);
      } else {
        throw new Error(response.message || 'Failed to transfer leadership');
      }
    } catch (error) {
      toast.error(`Failed to transfer leadership: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeGroup = async () => {
    if (!window.confirm('Are you sure you want to finalize this group? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await studentAPI.finalizeGroup(groupDetails._id);
      
      if (response.success) {
        toast.success('Group finalized successfully');
        loadGroupDetails();
        fetchSem5Data();
        setShowFinalizeModal(false);
      } else {
        throw new Error(response.message || 'Failed to finalize group');
      }
    } catch (error) {
      toast.error(`Failed to finalize group: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered members based on current filters
  const getFilteredMembers = () => {
    if (!groupDetails?.members) return [];

    let filtered = [...groupDetails.members];

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(member => member.isActive);
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(member => member.inviteStatus === 'pending' || member.inviteStatus === 'pending');
    }

    // Sort members
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.student?.fullName?.localeCompare(b.student?.fullName) || 0;
        case 'role':
          if (a.role === 'leader' && b.role !== 'leader') return -1;
          if (b.role === 'leader' && a.role !== 'leader') return 1;
          return a.student?.fullName?.localeCompare(b.student?.fullName) || 0;
        case 'joined':
        default:
          return new Date(b.joinedAt) - new Date(a.joinedAt);
      }
    });

    return filtered;
  };

  const canFinalizeGroup = () => {
    const stats = getGroupStats();
    return isGroupLeader && 
           stats.isComplete && 
           groupDetails.status !== 'finalized' &&
           groupDetails.members?.every(member => member.inviteStatus === 'accepted');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading group management...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isInGroup || !groupDetails) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Group Access</h3>
            <p className="text-gray-600 mb-4">
              You are not authorized to manage this group or it doesn't exist.
            </p>
            <button
              onClick={() => navigate('/dashboard/student')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentUserMember = groupDetails.members?.find(member => member.student?._id === user._id);
  const filteredMembers = getFilteredMembers();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Advanced Group Management
              </h1>
              <p className="mt-2 text-gray-600">
                Manage group members, roles, settings, and finalization for {groupDetails.name}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Real-time Status */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Management</span>
              </div>
              
              <button
                onClick={() => navigate('/dashboard/student')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Real-time Updates */}
          {realTimeUpdates.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-32 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-blue-900">Live Group Management Updates</h3>
                <button 
                  onClick={() => setRealTimeUpdates([])}
                  className="text-blue-600 text-xs hover:text-blue-800"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {realTimeUpdates.slice(-3).reverse().map((update, index) => (
                  <div key={index} className={`text-xs ${update.isPositive ? 'text-green-700' : 'text-orange-700'}`}>
                    <span className="font-medium">{new Date(update.timestamp).toLocaleTimeString()}:</span>
                    {update.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Management Panel */}
          <div className="lg:col-span-2 space-y-8">
            {/* Member Management */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Member Management</h2>
                  
                  {/* Filter and Sort Controls */}
                  <div className="flex items-center space-x-3">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1"
                    >
                      <option value="all">All Members</option>
                      <option value="active">Active Only</option>
                      <option value="pending">Pending Only</option>
                    </select>
                    
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1"
                    >
                      <option value="joined">Sort by Joined Date</option>
                      <option value="name">Sort by Name</option>
                      <option value="role">Sort by Role</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <GroupMemberList 
                  members={filteredMembers}
                  showRoles={true}
                  showContact={true}
                  currentUserId={user._id}
                  canManage={isGroupLeader}
                />
              </div>
            </div>

            {/* Invite New Members */}
            {isGroupLeader && getGroupStats().availableSlots > 0 && (
              <div className="bg-white rounded-lg shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Invite New Members</h2>
                  <p className="text-gray-600 mt-1">
                    Search for available students to invite to your group
                  </p>
                </div>

                <div className="p-6">
                  <StudentSearch
                    onSelection={setSelectedStudents}
                    selectedStudents={selectedStudents}
                    multiple={true}
                    maxSelections={getGroupStats().availableSlots}
                    showLeadershipOptions={false}
                  />

                  {selectedStudents.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleInviteStudents(selectedStudents)}
                        disabled={actionLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                      >
                        {actionLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Sending Invitations...</span>
                          </>
                        ) : (
                          <>
                            <span>Send Invitations ({selectedStudents.length})</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Group Information */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Group Information</h2>
              </div>
              <div className="p-6">
                <GroupCard 
                  group={groupDetails} 
                  showActions={false}
                  userRole="student"
                />
              </div>
            </div>
          </div>

          {/* Management Actions Sidebar */}
          <div className="space-y-6">
            {/* Your Role Panel */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Role</h3>
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                  currentUserMember?.role === 'leader' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentUserMember?.role === 'leader' ? '👑' : '👤'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {currentUserMember?.role === 'leader' ? 'Group Leader' : 'Group Member'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentUserMember?.role === 'leader' 
                      ? 'Manage group settings and assignments'
                      : 'Participate in group activities'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {isGroupLeader && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Leader Actions</h3>
                <div className="space-y-3">
                  {getGroupStats().memberCount > 1 && (
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>Transfer Leadership</span>
                    </button>
                  )}

                  {canFinalizeGroup() && (
                    <button
                      onClick={() => setShowFinalizeModal(true)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Finalize Group</span>
                    </button>
                  )}

                  <button
                    onClick={() => navigate(`/student/groups/${groupDetails._id}/dashboard`)}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>View Dashboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* Group Statistics */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Members:</span>
                  <span className="font-medium">{getGroupStats().memberCount}/{getGroupStats().maxMembers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Available:</span>
                  <span className="font-medium text-green-600">{getGroupStats().availableSlots}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Complete:</span>
                  <span className={`font-medium ${
                    getGroupStats().isComplete ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {getGroupStats().isComplete ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <StatusBadge status={groupDetails.status} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Leadership Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Transfer Leadership
              </h3>
              <p className="text-gray-600 mb-4">
                Select a new group leader from current members:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {groupDetails.members
                  ?.filter(member => member.isActive && member.role === 'member')
                  .map((member, index) => (
                  <button
                    key={index}
                    onClick={() => handleTransferLeadership(member.student._id)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={actionLoading}
                  >
                    <div className="font-medium text-gray-900">
                      {member.student?.fullName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {member.student?.misNumber} • {member.student?.collegeEmail}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Finalize Group Modal */}
        {showFinalizeModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Finalize Group
              </h3>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Finalizing the group will:
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Lock all member roles and assignments</li>
                  <li>• Prevent new member invitations</li>
                  <li>• Enable project registration and faculty preference submission</li>
                  <li>• Make all changes permanent and irreversible</li>
                </ul>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowFinalizeModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalizeGroup}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {actionLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Finalizing...</span>
                    </>
                  ) : (
                    <span>Finalize Group</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {actionLoading && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-25 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Updating...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupManager;
