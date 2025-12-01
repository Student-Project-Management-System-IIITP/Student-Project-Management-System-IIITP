import React from 'react';

const StatusBadge = ({ status, text, size = 'md', className = '' }) => {
  const getStatusConfig = (status) => {
    const statusMap = {
      // Project Status
      'registered': { color: 'bg-info-100 text-info-700', text: 'Registered' },
      'faculty_allocated': { color: 'bg-purple-100 text-purple-700', text: 'Faculty Allocated' },
      'active': { color: 'bg-success-100 text-success-700', text: 'Active' },
      'completed': { color: 'bg-neutral-100 text-neutral-700', text: 'Completed' },
      'cancelled': { color: 'bg-error-100 text-error-700', text: 'Cancelled' },
      
      // Evaluation Status
      'pending': { color: 'bg-warning-100 text-warning-700', text: 'Pending' },
      'scheduled': { color: 'bg-info-100 text-info-700', text: 'Scheduled' },
      'evaluated': { color: 'bg-success-100 text-success-700', text: 'Evaluated' },
      
      // Upload Status
      'not_uploaded': { color: 'bg-neutral-100 text-neutral-700', text: 'Not Uploaded' },
      'uploaded': { color: 'bg-success-100 text-success-700', text: 'Uploaded' },
      'upload_failed': { color: 'bg-error-100 text-error-700', text: 'Upload Failed' },
      
      // General Status
      'success': { color: 'bg-success-100 text-success-700', text: 'Success' },
      'error': { color: 'bg-error-100 text-error-700', text: 'Error' },
      'warning': { color: 'bg-warning-100 text-warning-700', text: 'Warning' },
      'info': { color: 'bg-info-100 text-info-700', text: 'Info' },
      
      // Internship/Application Status
      'submitted': { color: 'bg-warning-100 text-warning-700', text: 'Submitted' },
      'needs_info': { color: 'bg-error-100 text-error-700', text: 'Needs Info' },
      'pending_verification': { color: 'bg-info-100 text-info-700', text: 'Pending Verification' },
      'verified_pass': { color: 'bg-success-100 text-success-700', text: 'Verified (Pass)' },
      'verified_fail': { color: 'bg-error-100 text-error-700', text: 'Verified (Fail)' },
      'absent': { color: 'bg-error-100 text-error-700', text: 'Absent' },
      'approved': { color: 'bg-success-100 text-success-700', text: 'Approved' },
      'rejected': { color: 'bg-error-100 text-error-700', text: 'Rejected' },
    };
    
    return statusMap[status] || { color: 'bg-neutral-100 text-neutral-700', text: status };
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
  // Use custom text if provided, otherwise use the default from statusMap
  const displayText = text || config.text;

  return (
    <span 
      className={`
        inline-flex items-center font-medium rounded-full
        ${config.color} ${sizeClasses} ${className}
      `}
    >
      {displayText}
    </span>
  );
};

export default StatusBadge;
