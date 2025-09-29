import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const ChoosePassButtons = ({ 
  groupId, 
  onChoose, 
  onPass, 
  disabled = false,
  loading = false,
  groupInfo = null 
}) => {
  const [actionLoading, setActionLoading] = useState(null);

  const handleChoose = async () => {
    if (disabled || loading) return;

    setActionLoading('choose');
    try {
      await onChoose(groupId);
      toast.success('Group allocated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to allocate group');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePass = async () => {
    if (disabled || loading) return;

    setActionLoading('pass');
    try {
      await onPass(groupId);
      toast.success('Group passed to next preference');
    } catch (error) {
      toast.error(error.message || 'Failed to pass group');
    } finally {
      setActionLoading(null);
    }
  };

  const isChooseLoading = actionLoading === 'choose';
  const isPassLoading = actionLoading === 'pass';
  const isAnyLoading = loading || isChooseLoading || isPassLoading;

  return (
    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Group Info */}
      {groupInfo && (
        <div className="flex-1">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Group:</span> {groupInfo.name || 'Unnamed Group'}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Members:</span> {groupInfo.memberCount || 0}/{groupInfo.maxMembers || 5}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Choose Button */}
        <button
          onClick={handleChoose}
          disabled={disabled || isAnyLoading}
          className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
            disabled || isAnyLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
          }`}
        >
          {isChooseLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Choosing...
            </div>
          ) : (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Choose
            </div>
          )}
        </button>

        {/* Pass Button */}
        <button
          onClick={handlePass}
          disabled={disabled || isAnyLoading}
          className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
            disabled || isAnyLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-orange-600 text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2'
          }`}
        >
          {isPassLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Passing...
            </div>
          ) : (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Pass
            </div>
          )}
        </button>
      </div>

      {/* Loading Overlay */}
      {isAnyLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
          <div className="text-sm text-gray-600">Processing...</div>
        </div>
      )}
    </div>
  );
};

export default ChoosePassButtons;
