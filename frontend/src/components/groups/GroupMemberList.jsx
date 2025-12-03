import React from 'react';
import { FiStar, FiUser, FiHelpCircle, FiUsers } from 'react-icons/fi';

const GroupMemberList = ({ 
  members = [], 
  showRoles = true, 
  showContact = false,
  currentUserId = null,
  onRemoveMember = null,
  canManage = false,
  showStats = true
}) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'leader':
        return <FiStar className="w-5 h-5" />;
      case 'member':
        return <FiUser className="w-5 h-5" />;
      default:
        return <FiHelpCircle className="w-5 h-5" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'leader':
        return 'text-primary-700 bg-primary-100 border border-primary-200';
      case 'member':
        return 'text-neutral-700 bg-neutral-100 border border-neutral-200';
      default:
        return 'text-neutral-600 bg-neutral-100 border border-neutral-200';
    }
  };

  const renderMember = (member, index) => {
    const isCurrentUser = currentUserId && member.student?._id === currentUserId;
    
    return (
      <div 
        key={index} 
        className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
          isCurrentUser 
            ? 'bg-primary-50 border-primary-200' 
            : 'bg-white border-neutral-200 hover:bg-neutral-50'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Avatar */}
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            member.role === 'leader' 
              ? 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white' 
              : 'bg-neutral-200 text-neutral-600'
          }`}>
            {getRoleIcon(member.role)}
          </div>

          {/* Member Info - Inline */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-neutral-800 text-sm">
                {member.student?.fullName || 'Unknown Student'}
              </h4>
              {isCurrentUser && (
                <span className="text-xs font-medium text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded">
                  You
                </span>
              )}
              {showRoles && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded font-semibold uppercase tracking-wide ${getRoleColor(member.role)}`}>
                  {member.role}
                </span>
              )}
              <span className="text-xs text-neutral-400">•</span>
              <span className="text-xs text-neutral-600 font-medium">
                {member.student?.misNumber || 'MIS# -'}
              </span>
              {member.student?.branch && (
                <>
                  <span className="text-xs text-neutral-400">•</span>
                  <span className="text-xs text-neutral-500">{member.student.branch}</span>
                </>
              )}
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
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <FiUsers className="w-8 h-8 text-neutral-400" />
        </div>
        <p className="text-neutral-500 font-medium">No members in this group yet</p>
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
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-neutral-600">
              <FiStar className="w-3.5 h-3.5 text-primary-600" />
              Leader
            </span>
            <span className="flex items-center gap-1.5 text-neutral-600">
              <FiUser className="w-3.5 h-3.5 text-neutral-500" />
              Member
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {activeMembers.map((member, index) => renderMember(member, index))}
      </div>
      
      {/* Bottom spacing */}
      <div className="h-2"></div>

      {/* Group Stats */}
      {showStats && (
        <div className="mt-3 pt-3 border-t border-neutral-200">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-primary-700">
                {activeMembers.filter(m => m.role === 'leader').length}
              </span>
              <span className="text-xs text-neutral-600 font-medium">Leader</span>
            </div>
            <div className="w-px h-4 bg-neutral-300"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-neutral-700">
                {activeMembers.filter(m => m.role === 'member').length}
              </span>
              <span className="text-xs text-neutral-600 font-medium">Members</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupMemberList;
