import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import websocketManager from '../../utils/websocket';
import GroupCard from '../../components/groups/GroupCard';

const GroupInvitations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    groupInvitations, 
    canRespondToInvitations,
    handleInvitationResponse,
    getPendingInvitationsCount,
    fetchSem5Data
  } = useGroupManagement();

  const [loading, setLoading] = useState({});
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 🔥 ENHANCED REAL-TIME WEBSOCKET INTEGRATION
  useEffect(() => {
    // Subscribe to invitation-related real-time events
    const handleInvitationAccepted = (payload) => {
      setRealTimeUpdates(prev => [...prev, {
        type: 'invitation_accepted',
        message: `Invitation accepted for ${payload.group?.name || 'unknown group'}`,
        timestamp: new Date(),
        isPositive: true,
        action: 'accepted'
      }]);
      
      // Refresh invitation data
      fetchSem5Data();
      setRefreshTrigger(prev => prev + 1);
      toast.success('Invitation accepted! Welcome to the group.');
    };

    const handleInvitationRejected = (payload) => {
      setRealTimeUpdates(prev => [...prev, {
        type: 'invitation_rejected', 
        message: `Invitation to ${payload.group?.name || 'unknown group'} has been rejected`,
        timestamp: new Date(),
        isPositive: false,
        action: 'rejected'
      }]);
      
      fetchSem5Data();
      setRefreshTrigger(prev => prev + 1);
      toast.info('Invitation was rejected.');
    };

    const handleNewInvitation = (payload) => {
      if (payload.student?._id === user._id) {
        setRealTimeUpdates(prev => [...prev, {
          type: 'new_invitation',
          message: `New invitation received from ${payload.invitedBy?.fullName || 'Unknown'}`,
          timestamp: new Date(),
          isPositive: true,
          action: 'received'
        }]);
        
        fetchSem5Data();
        setRefreshTrigger(prev => prev + 1);
        toast.success(`🎉 New group invitation: ${payload.group?.name}`);
      }
    };

    const handleMembershipChange = (payload) => {
      setRealTimeUpdates(prev => [...prev, {
        type: 'membership_change',
        message: `Group membership updated: ${payload.changeType}`,
        timestamp: new Date(),
        isPositive: payload.changeType.includes('joined') || payload.changeType.includes('joined'),
        action: 'membership'
      }]);
      
      fetchSem5Data();
      setRefreshTrigger(prev => prev + 1);
    };

    // Subscribe to real-time events
    websocketManager.subscribeToInvitationAccepted(handleInvitationAccepted);
    websocketManager.subscribeToInvitationRejected(handleInvitationRejected);
    websocketManager.subscribeToMembershipChanges(handleMembershipChange);

    // Register custom new invitation handler
    websocketManager.subscribe('new_invitation', handleNewInvitation);

    return () => {
      websocketManager.unsubscribe('invitation_accepted', handleInvitationAccepted);
      websocketManager.unsubscribe('invitation_rejected', handleInvitationRejected);
      websocketManager.unsubscribe('membership_change', handleMembershipChange);
      websocketManager.unsubscribe('new_invitation', handleNewInvitation);
    };
  }, [user._id, fetchSem5Data]);

  // Refresh invitations when component mounts
  useEffect(() => {
    fetchSem5Data();
  }, [fetchSem5Data, refreshTrigger]);

  // 🔥 ENHANCED INVITATION MANAGEMENT WITH BULK OPERATIONS
  const handleAccept = async (invitation) => {
    try {
      setLoading(prev => ({ ...prev, [invitation._id]: 'accepting' }));
      
      // Use direct API call with enhanced error handling
      const response = await studentAPI.acceptGroupInvitation(invitation.group._id, invitation._id);
      
      if (response.success) {
        // Real-time event will be sent by backend
        setRealTimeUpdates(prev => [...prev, {
          type: 'action_success',
          message: 'Invitation accepted successfully!',
          timestamp: new Date(),
          isPositive: true,
          action: 'accepted'
        }]);
        
        // Fetch fresh data and trigger nav refresh
        fetchSem5Data();
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(response.message || 'Failed to accept invitation');
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to accept invitation';
      toast.error(errorMessage);
      
      setRealTimeUpdates(prev => [...prev, {
        type: 'action_error',
        message: `Error: ${errorMessage}`,
        timestamp: new Date(),
        isPositive: false,
        action: 'error'
      }]);
    } finally {
      setLoading(prev => ({ ...prev, [invitation._id]: null }));
    }
  };

  const handleReject = async (invitation) => {
    try {
      setLoading(prev => ({ ...prev, [invitation._id]: 'rejecting' }));
      
      const response = await studentAPI.rejectGroupInvitation(invitation.group._id, invitation._id);
      
      if (response.success) {
        toast.success('Invitation rejected');
        
        setRealTimeUpdates(prev => [...prev, {
          type: 'action_success',
          message: 'Invitation rejected successfully!',
          timestamp: new Date(),
          isPositive: true,
          action: 'rejected'
        }]);
        
        fetchSem5Data();
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(response.message || 'Failed to reject invitation');
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to reject invitation';
      toast.error(errorMessage);
      
      setRealTimeUpdates(prev => [...prev, {
        type: 'action_error',
        message: `Error: ${errorMessage}`,
        timestamp: new Date(),
        isPositive: false,
        action: 'error'
      }]);
    } finally {
      setLoading(prev => ({ ...prev, [invitation._id]: null }));
    }
  };

  // ✅ BULK EMERGENCY REJECT ALL FUNCTION
  const handleRejectAll = async () => {
    const confirmMessage = `Are you sure you want to reject ALL ${pendingInvitations.length} pending invitations? This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(prev => ({ ...prev, 'bulk': 'rejecting' }));

    try {
      const promises = pendingInvitations.map(inv => 
        studentAPI.rejectGroupInvitation(inv.group._id, inv._id)
      );
      
      await Promise.all(promises);
      
      toast.success(`Successfully rejected ${pendingInvitations.length} invitations`);
      fetchSem5Data();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error('Some invitations failed to reject. Please try individually.');
    } finally {
      setLoading(prev => ({ ...prev, 'bulk': null }));
    }
  };

  const pendingInvitations = groupInvitations.filter(inv => inv.status === 'pending');
  const acceptedInvitations = groupInvitations.filter(inv => inv.status === 'accepted');
  const rejectedInvitations = groupInvitations.filter(inv => inv.status === 'rejected');

  if (!canRespondToInvitations()) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Group Invitations</h3>
            <p className="text-gray-600 mb-4">
              You don't have any pending group invitations at the moment.
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header with Real-time Settings */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Group Invitations
                {(getPendingInvitationsCount() > 0) && (
                  <span className="ml-3 px-2 py-1 bg-orange-100 text-orange-800 text-sm rounded-full font-medium">
                    {getPendingInvitationsCount()} Pending
                  </span>
                )}
              </h1>
              <p className="mt-2 text-gray-600">
                Manage your Minor Project 2 group invitations with real-time updates
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Real-time notifications toggle */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  showNotifications 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15 17h5l-5 5v-5zM12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm">Live</span>
              </button>

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
          
          {/* Real-time Updates Panel */}
          {showNotifications && realTimeUpdates.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-blue-900">Latest Real-time Updates</h3>
                <button 
                  onClick={() => setRealTimeUpdates([])}
                  className="text-blue-600 text-xs hover:text-blue-800"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-2">
                {realTimeUpdates.slice(-5).reverse().map((update, index) => (
                  <div key={index} className={`text-xs flex items-center space-x-2 ${
                    update.isPositive ? 'text-green-700' : 'text-red-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      update.isPositive ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <span className="font-medium">
                      {new Date(update.timestamp).toLocaleTimeString()}:
                    </span>
                    {update.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Invitation Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-2xl">📨</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingInvitations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Accepted</p>
                <p className="text-2xl font-bold text-gray-900">{acceptedInvitations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-2xl">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{rejectedInvitations.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Pending Invitations ({pendingInvitations.length})
              </h2>
              
              {/* Bulk Operations */}
              <div className="flex space-x-3">
                <button
                  onClick={handleRejectAll}
                  disabled={loading['bulk'] === 'rejecting'}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {loading['bulk'] === 'rejecting' ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Rejecting All...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Reject All</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    fetchSem5Data();
                    setRefreshTrigger(prev => prev + 1);
                    toast.success('Invitations refreshed');
                  }}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingInvitations.map((invitation) => (
                <div key={invitation._id} className={`bg-white rounded-lg shadow-lg border-2 transition-all duration-200 ${
                  loading[invitation._id] ? 'border-blue-200 bg-blue-50' : 'border-orange-200'
                } hover:shadow-xl`}>
                  <div className="p-6">
                    {/* Group Information with Real-time Status */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {invitation.group?.name || 'Unnamed Group'}
                          </h3>
                          {loading[invitation._id] && (
                            <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            invitation.role === 'leader' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {invitation.role === 'leader' ? '👑 Leader' : '👤 Member'}
                          </span>
                          {invitation.role === 'leader' && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              PRIORITY
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">
                        {invitation.group?.description || 'No description provided'}
                      </p>
                    </div>

                    {/* Group Details */}
                    <div className="mb-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Members:</span>
                        <span className="font-medium">
                          {invitation.group?.members?.length || 0}/{invitation.group?.maxMembers || 5}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Invited by:</span>
                        <span className="font-medium">
                          {invitation.invitedBy?.fullName || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Invited on:</span>
                        <span className="font-medium">
                          {new Date(invitation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Group Members Preview */}
                    {invitation.group?.members && invitation.group.members.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Group Members:</h4>
                        <div className="flex flex-wrap gap-2">
                          {invitation.group.members.slice(0, 3).map((member, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              {member.student?.fullName || 'Unknown'}
                            </span>
                          ))}
                          {invitation.group.members.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              +{invitation.group.members.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Enhanced Action Buttons with Priority Handling */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleAccept(invitation._id)}
                        disabled={loading[invitation._id]}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center font-medium ${
                          invitation.role === 'leader' 
                            ? 'bg-purple-600 text-white hover:bg-purple-700' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {loading[invitation._id] === 'accepting' ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {invitation.role === 'leader' ? 'Accepting Leadership...' : 'Accepting...'}
                          </>
                        ) : (
                          <>
                            {invitation.role === 'leader' ? '👑 Accept Leader Role' : '✅ Accept'}
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleReject(invitation._id)}
                        disabled={loading[invitation._id]}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center font-medium"
                      >
                        {loading[invitation._id] === 'rejecting' ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Rejecting...
                          </>
                        ) : (
                          '❌ Reject'
                        )}
                      </button>
                    </div>
                    
                    {/* Priority Steps Notice for Leaders */}
                    {invitation.role === 'leader' && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium">You're invited as the group leader!</p>
                            <p className="text-xs text-yellow-700 mt-1">If you accept, you'll be responsible for group management and finalization.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted Invitations */}
        {acceptedInvitations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Accepted Invitations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {acceptedInvitations.map((invitation) => (
                <div key={invitation._id} className="bg-white rounded-lg shadow-lg border-2 border-green-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {invitation.group?.name || 'Unnamed Group'}
                      </h3>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Accepted
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Role:</span>
                        <span className="font-medium">{invitation.role || 'Member'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Accepted on:</span>
                        <span className="font-medium">
                          {new Date(invitation.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/student/groups/${invitation.group?._id}/dashboard`)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      View Group Dashboard
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Invitations */}
        {rejectedInvitations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Rejected Invitations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rejectedInvitations.map((invitation) => (
                <div key={invitation._id} className="bg-white rounded-lg shadow-lg border-2 border-red-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {invitation.group?.name || 'Unnamed Group'}
                      </h3>
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                        Rejected
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Role:</span>
                        <span className="font-medium">{invitation.role || 'Member'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rejected on:</span>
                        <span className="font-medium">
                          {new Date(invitation.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Information Card */}
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">📧 Real-Time Invitation Management</h3>
            <div className="text-blue-800 space-y-2">
              <p>• <strong>Accept Invitation:</strong> Join the group and become a member instantly</p>
              <p>• <strong>Reject Invitation:</strong> Decline the invitation (cannot be undone immediately)</p>
              <p>• <strong>Leadership Priority:</strong> Leader invitations are highlighted with purple badges</p>
              <p>• <strong>Auto-Reject Security:</strong> Accepting one invitation automatically rejects others</p>
              <p>• <strong>Real-Time Notifications:</strong> Live updates for invitation acceptance/rejection</p>
              <p>• <strong>Bulk Operations:</strong> Emergency bulk reject all if overwhelmed</p>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">🎯 Smart Features</h3>
            <div className="text-green-800 space-y-2">
              <p>• <strong>Priority Badges:</strong> Leader invitations get priority display and yellow background</p>
              <p>• <strong>Loading Indicators:</strong> Real-time feedback on all acceptance/rejection actions</p>
              <p>• <strong>Enhanced Cards:</strong> Visual distinctions between member and leader roles</p>
              <p>• <strong>Error Handling:</strong> Graceful error recovery with retry options</p>
              <p>• <strong>WebSocket Updates:</strong> Subscribe to group-level event feeds, navigate seamlessly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupInvitations;
