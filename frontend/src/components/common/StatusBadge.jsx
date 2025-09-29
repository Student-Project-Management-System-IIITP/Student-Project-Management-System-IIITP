import React from 'react';

const StatusBadge = ({ status, size = 'md', className = '' }) => {
  const getStatusConfig = (status) => {
    const statusMap = {
      // Project Status
      'registered': { color: 'bg-blue-100 text-blue-800', text: 'Registered' },
      'faculty_allocated': { color: 'bg-purple-100 text-purple-800', text: 'Faculty Allocated' },
      'active': { color: 'bg-green-100 text-green-800', text: 'Active' },
      'completed': { color: 'bg-gray-100 text-gray-800', text: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-800', text: 'Cancelled' },
      
      // Evaluation Status
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      'scheduled': { color: 'bg-blue-100 text-blue-800', text: 'Scheduled' },
      'evaluated': { color: 'bg-green-100 text-green-800', text: 'Evaluated' },
      
      // Upload Status
      'not_uploaded': { color: 'bg-gray-100 text-gray-800', text: 'Not Uploaded' },
      'uploaded': { color: 'bg-green-100 text-green-800', text: 'Uploaded' },
      'upload_failed': { color: 'bg-red-100 text-red-800', text: 'Upload Failed' },
      
      // General Status
      'success': { color: 'bg-green-100 text-green-800', text: 'Success' },
      'error': { color: 'bg-red-100 text-red-800', text: 'Error' },
      'warning': { color: 'bg-yellow-100 text-yellow-800', text: 'Warning' },
      'info': { color: 'bg-blue-100 text-blue-800', text: 'Info' },
    };
    
    return statusMap[status] || { color: 'bg-gray-100 text-gray-800', text: status };
  };

  const getSizeClasses = (size) => {
    const sizeMap = {
      'sm': 'px-2 py-1 text-xs',
      'md': 'px-2.5 py-1.5 text-sm',
      'lg': 'px-3 py-2 text-base',
    };
    
    return sizeMap[size] || sizeMap.md;
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);

  return (
    <span 
      className={`
        inline-flex items-center font-medium rounded-full
        ${config.color} ${sizeClasses} ${className}
      `}
    >
      {config.text}
    </span>
  );
};

export default StatusBadge;
