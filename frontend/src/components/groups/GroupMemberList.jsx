import React from 'react';

const GroupMemberList = ({ 
  members = [], 
  showRoles = true, 
  showContact = false,
  currentUserId = null,
  onRemoveMember = null,
  canManage = false 
}) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
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
        return 'text-yellow-600 bg-yellow-100';
      case 'member':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderMember = (member, index) => {
    const isCurrentUser = currentUserId && member.student?._id === currentUserId;
    
    return (
      <div 
        key={index} 
        className={`flex items-center justify-between p-3 rounded-lg border ${
          isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-lg">
              {getRoleIcon(member.role)}
            </span>
          </div>

          {/* Member Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900">
                {member.student?.fullName || 'Unknown Student'}
                {isCurrentUser && <span className="text-blue-600 ml-1">(You)</span>}
              </h4>
              {showRoles && (
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getRoleColor(member.role)}`}>
                  {member.role}
                </span>
              )}
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                MIS: {member.student?.misNumber || 'N/A'}
              </div>
              <div>
                Branch: {member.student?.branch || 'N/A'}
              </div>
              {showContact && member.student?.collegeEmail && (
                <div>
                  Email: {member.student.collegeEmail}
                </div>
              )}
              <div className="text-xs text-gray-500">
                Joined: {member.joinedAt ? formatDate(member.joinedAt) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {canManage && onRemoveMember && member.role !== 'leader' && (
          <button
            onClick={() => onRemoveMember(member.student._id)}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="Remove member from group"
          >
            Remove
          </button>
        )}
      </div>
    );
  };

  // Only use active members for display and counts
  const activeMembers = Array.isArray(members)
    ? members.filter(m => m?.isActive && m?.student)
    : [];

  if (activeMembers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <p className="text-gray-500">No members in this group yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Group Members ({activeMembers.length})
        </h3>
        {showRoles && (
          <div className="flex items-center space-x-2 text-sm">
            <span className="flex items-center">
              <span className="mr-1">👑</span>
              Leader
            </span>
            <span className="flex items-center">
              <span className="mr-1">👤</span>
              Member
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {activeMembers.map((member, index) => renderMember(member, index))}
      </div>

      {/* Group Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-900">
              {activeMembers.filter(m => m.role === 'leader').length}
            </div>
            <div className="text-gray-600">Leaders</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">
              {activeMembers.filter(m => m.role === 'member').length}
            </div>
            <div className="text-gray-600">Members</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupMemberList;
