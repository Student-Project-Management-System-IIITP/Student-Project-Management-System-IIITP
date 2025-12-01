import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { formatFacultyName } from '../../utils/formatUtils';

const GroupCard = ({ 
  group, 
  showActions = false, 
  onJoin = null, 
  onLeave = null, 
  onView = null,
  userRole = 'student' 
}) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getMemberCount = () => {
    return group.members ? group.members.length : 0;
  };

  const getAvailableSlots = () => {
    return (group.maxMembers || 5) - getMemberCount();
  };

  const isGroupFull = () => {
    return getMemberCount() >= (group.maxMembers || 5);
  };

  const canJoin = () => {
    if (userRole !== 'student') return false;
    if (isGroupFull()) return false;
    if (group.status !== 'forming') return false;
    return true;
  };

  const renderMembers = () => {
    if (!group.members || group.members.length === 0) {
      return <span className="text-gray-500 text-sm">No members yet</span>;
    }

    return (
      <div className="space-y-1">
        {group.members.slice(0, 3).map((member, index) => (
          <div key={index} className="flex items-center text-sm">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              member.role === 'leader' ? 'bg-yellow-500' : 'bg-blue-500'
            }`}></div>
            <span className="text-gray-700">
              {member.student?.fullName || 'Unknown Student'}
              {member.role === 'leader' && <span className="text-yellow-600 ml-1">(Leader)</span>}
            </span>
          </div>
        ))}
        {group.members.length > 3 && (
          <div className="text-xs text-gray-500">
            +{group.members.length - 3} more members
          </div>
        )}
      </div>
    );
  };

  const renderActions = () => {
    if (!showActions) return null;

    return (
      <div className="flex items-center space-x-2 mt-4">
        {onView && (
          <Link
            to={`/groups/${group._id}`}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View Details
          </Link>
        )}
        
        {userRole === 'student' && canJoin() && onJoin && (
          <button
            onClick={() => onJoin(group._id)}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Join Group
          </button>
        )}
        
        {userRole === 'student' && group.members?.some(m => m.student?._id) && onLeave && (
          <button
            onClick={() => onLeave(group._id)}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Leave Group
          </button>
        )}
      </div>
    );
  };

  const renderFacultyInfo = () => {
    if (!group.allocatedFaculty) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-sm">
          <span className="font-medium text-gray-700">Allocated Faculty:</span>
          <div className="mt-1 text-gray-600">
            {formatFacultyName(group.allocatedFaculty)} ({group.allocatedFaculty.facultyId})
          </div>
          <div className="text-xs text-gray-500">
            {group.allocatedFaculty.department} • {group.allocatedFaculty.designation}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {group.name || 'Unnamed Group'}
          </h3>
          {group.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {group.description}
            </p>
          )}
        </div>
        <StatusBadge status={group.status} />
      </div>

      {/* Group Details */}
      <div className="space-y-3">
        {/* Member Count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">Members:</span>
          <span className="font-medium">
            {getMemberCount()}/{group.maxMembers || 5}
            {!isGroupFull() && (
              <span className="text-green-600 ml-1">
                ({getAvailableSlots()} slots available)
              </span>
            )}
          </span>
        </div>

        {/* Project Information */}
        {group.project && (
          <div className="text-sm">
            <span className="text-gray-700">Project:</span>
            <div className="font-medium text-gray-900 mt-1">
              {group.project.title}
            </div>
          </div>
        )}

        {/* Academic Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">Semester:</span>
          <span className="font-medium">B.Tech Sem {group.semester}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">Academic Year:</span>
          <span className="font-medium">{group.academicYear}</span>
        </div>

        {/* Created Date */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">Created:</span>
          <span className="font-medium">{formatDate(group.createdAt)}</span>
        </div>
      </div>

      {/* Members List */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Members:</h4>
        {renderMembers()}
      </div>

      {/* Faculty Information */}
      {renderFacultyInfo()}

      {/* Actions */}
      {renderActions()}
    </div>
  );
};

export default GroupCard;
