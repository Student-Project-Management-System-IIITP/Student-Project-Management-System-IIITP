import React from 'react';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const GroupManagementList = ({ 
  members = [], 
  showRoles = true, 
  showContact = false,
  currentUserId = null,
  onRemoveMember = null,
  onTransferLeadership = null,
  canManage = false,
  sortBy = 'joined'
}) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'leader':
        return '👑';
      case 'member':
        return '👤';
      default:
        return '❓';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'leader':
        return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'member':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusBadge = (member) => {
    if (member.inviteStatus === 'pending') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 font-medium">
          📧 Pending
        </span>
      );
    }
    if (member.inviteStatus === 'accepted') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
          ✅ Active
        </span>
      );
    }
    if (member.inviteStatus === 'rejected') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">
          ❌ Declined
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">
        ⏳ Processing
      </span>
    );
  };

  const handleTransferLeadershipToMember = async (member) => {
    if (!window.confirm(`Are you sure you want to transfer leadership to ${member.student?.fullName}? This cannot be undone.`)) {
      return;
    }

    try {
      if (onTransferLeadership) {
        await onTransferLeadership(member.student._id);
        toast.success(`Leadership transferred to ${member.student?.fullName}`);
      }
    } catch (error) {
      toast.error(`Failed to transfer leadership: ${error.message}`);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.student?.fullName} from the group?`)) {
      return;
    }

    try {
      if (onRemoveMember) {
        await onRemoveMember(member.student._id);
        toast.success(`${member.student?.fullName} removed from group`);
      }
    } catch (error) {
      toast.error(`Failed to remove member: ${error.message}`);
    }
  };

  const renderMember = (member, index) => {
    const isCurrentUser = currentUserId && member.student?._id === currentUserId;
    const canTransferLeadership = canManage && 
                                 member.role !== 'leader' && 
                                 member.inviteStatus === 'accepted' && 
                                 member.isActive;
    const canRemoveMember = canManage && 
                           member.role !== 'leader' && 
                           member.student?._id !== currentUserId;
    
    return (
      <div 
        key={index} 
        className={`transition-all duration-200 p-4 rounded-lg border ${
          isCurrentUser 
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md' 
            : 'bg-gray-50 border-gray-200 hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              member.role === 'leader' 
                ? 'bg-purple-200 text-purple-800' 
                : 'bg-blue-200 text-blue-800'
            }`}>
              <span className="text-xl">{getRoleIcon(member.role)}</span>
            </div>

            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <h4 className={`font-medium truncate ${
                  isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {member.student?.fullName || 'Unknown Student'}
                  {isCurrentUser && <span className="ml-2 text-blue-600 text-xs">(You)</span>}
                </h4>
                
                {member.role === 'leader' && (
                  <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 font-medium">
                    Leader
                  </span>
                )}
              </div>
              
              <div className="mt-1 text-sm text-gray-600 space-y-1">
                <div className="flex items-center space-x-4">
                  <span>Roll: {member.student?.rollNumber || 'N/A'}</span>
                  {showContact && member.student?.collegeEmail && (
                    <span>Email: {member.student.collegeEmail}</span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <span>
                    Joined: {formatTimeAgo(member.joinedAt)}
                  </span>
                  {getStatusBadge(member)}
                </div>
              </div>
            </div>

            {/* Role Indicator */}
            {showRoles && (
              <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getRoleColor(member.role)}`}>
                {member.role === 'leader' ? '👑 Leader' : '👤 Member'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-4">
            {canTransferLeadership && (
              <button
                onClick={() => handleTransferLeadershipToMember(member)}
                className="px-3 py-1 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded-full duration-200 transition-colors"
                title="Transfer leadership to this member"
              >
                👑 Transfer Leadership
              </button>
            )}
            
            {canRemoveMember && (
              <button
                onClick={() => handleRemoveMember(member)}
                className="px-3 py-1 text-xs text-red-700 hover:text-red-900 hover:bg-red-100 rounded-full duration-200 transition-colors"
                title="Remove member from group"
              >
                🔥 Remove
              </button>
            )}
          </div>
        </div>

        {/* Additional Info for Pending Members */}
        {member.inviteStatus === 'pending' && (
          <div className="mt-3 pt-3 border-t border-orange-200">
            <div className="flex items-center space-x-2 text-sm text-orange-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Invitation sent • Awaiting acceptance...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!members || members.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No members in this group yet</p>
        <p className="text-gray-400 text-sm mt-1">Members will appear here once they join the group</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Management Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Group Members ({members.length})
        </h3>
        {showRoles && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="flex items-center space-x-1">
              <span>👑 Leader</span>
              <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">1</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>👤 Members</span>
              <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                {members.filter(m => m.role === 'member' && m.inviteStatus === 'accepted').length}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Member List */}
      <div className="space-y-3">
        {members.map((member, index) => renderMember(member, index))}
      </div>

      {/* Group Management Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-900">
              {members.filter(m => m.role === 'leader' && m.isActive).length}
            </div>
            <div className="text-gray-600">Leaders</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">
              {members.filter(m => m.role === 'member' && m.inviteStatus === 'accepted' && m.isActive).length}
            </div>
            <div className="text-gray-600">Active Members</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-orange-600">
              {members.filter(m => m.inviteStatus === 'pending').length}
            </div>
            <div className="text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">
              {members.filter(m => m.isActive).length}
            </div>
            <div className="text-gray-600">Total Active</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupManagementList;
