import React from 'react';

const GroupStatusBadge = ({ status, size = 'default' }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'forming':
        return {
          colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          text: 'Forming',
          icon: '👥'
        };
      case 'complete':
        return {
          colorClass: 'bg-green-100 text-green-800 border-green-200',
          text: 'Complete',
          icon: '✅'
        };
      case 'locked':
        return {
          colorClass: 'bg-blue-100 text-blue-800 border-blue-200',
          text: 'Locked',
          icon: '🔒'
        };
      case 'disbanded':
        return {
          colorClass: 'bg-red-100 text-red-800 border-red-200',
          text: 'Disbanded',
          icon: '❌'
        };
      case 'allocated':
        return {
          colorClass: 'bg-purple-100 text-purple-800 border-purple-200',
          text: 'Allocated',
          icon: '🎯'
        };
      case 'pending':
        return {
          colorClass: 'bg-orange-100 text-orange-800 border-orange-200',
          text: 'Pending',
          icon: '⏳'
        };
      default:
        return {
          colorClass: 'bg-gray-100 text-gray-800 border-gray-200',
          text: 'Unknown',
          icon: '❓'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    default: 'px-3 py-1 text-sm',
    large: 'px-4 py-2 text-base'
  };

  return (
    <span 
      className={`inline-flex items-center rounded-full border font-medium ${config.colorClass} ${sizeClasses[size]}`}
      title={`Group Status: ${config.text}`}
    >
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </span>
  );
};

export default GroupStatusBadge;
