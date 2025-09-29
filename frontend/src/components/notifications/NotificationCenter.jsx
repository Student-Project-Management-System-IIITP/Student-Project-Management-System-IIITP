import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket, useGroupInvitations, useGroupAllocations, useFacultyResponses, useProjectUpdates, useSystemNotifications } from '../../hooks/useWebSocket';
import { toast } from 'react-hot-toast';

const NotificationCenter = () => {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // WebSocket event handlers
  const handleGroupInvitation = (data) => {
    const notification = {
      id: Date.now(),
      type: 'group_invitation',
      title: 'Group Invitation',
      message: `You've been invited to join group "${data.groupName}" by ${data.inviterName}`,
      timestamp: new Date(),
      read: false,
      data: data
    };
    addNotification(notification);
  };

  const handleGroupAllocation = (data) => {
    const notification = {
      id: Date.now(),
      type: 'group_allocation',
      title: 'Group Allocation Update',
      message: data.status === 'allocated' 
        ? `Group "${data.groupName}" has been allocated to ${data.facultyName}`
        : `Group "${data.groupName}" allocation failed. Manual allocation required.`,
      timestamp: new Date(),
      read: false,
      data: data
    };
    addNotification(notification);
  };

  const handleFacultyResponse = (data) => {
    const notification = {
      id: Date.now(),
      type: 'faculty_response',
      title: 'Faculty Response',
      message: data.response === 'accepted'
        ? `Faculty ${data.facultyName} has accepted group "${data.groupName}"`
        : `Faculty ${data.facultyName} has passed on group "${data.groupName}"`,
      timestamp: new Date(),
      read: false,
      data: data
    };
    addNotification(notification);
  };

  const handleProjectUpdate = (data) => {
    const notification = {
      id: Date.now(),
      type: 'project_update',
      title: 'Project Update',
      message: `Project "${data.projectTitle}": ${data.message}`,
      timestamp: new Date(),
      read: false,
      data: data
    };
    addNotification(notification);
  };

  const handleSystemNotification = (data) => {
    const notification = {
      id: Date.now(),
      type: 'system_notification',
      title: data.title || 'System Notification',
      message: data.message,
      timestamp: new Date(),
      read: false,
      data: data
    };
    addNotification(notification);
  };

  // Subscribe to WebSocket events
  useGroupInvitations(handleGroupInvitation);
  useGroupAllocations(handleGroupAllocation);
  useFacultyResponses(handleFacultyResponse);
  useProjectUpdates(handleProjectUpdate);
  useSystemNotifications(handleSystemNotification);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50 notifications
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  const clearNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'group_invitation':
        return '👥';
      case 'group_allocation':
        return '🎯';
      case 'faculty_response':
        return '👨‍🏫';
      case 'project_update':
        return '📚';
      case 'system_notification':
        return '🔔';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'group_invitation':
        return 'text-blue-600 bg-blue-50';
      case 'group_allocation':
        return 'text-green-600 bg-green-50';
      case 'faculty_response':
        return 'text-purple-600 bg-purple-50';
      case 'project_update':
        return 'text-orange-600 bg-orange-50';
      case 'system_notification':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 17h5l-5 5v-5zM9 17v5H4l5-5z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <span className="absolute -bottom-1 -right-1 bg-yellow-500 text-white text-xs rounded-full h-3 w-3"></span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
            {!isConnected && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                🔌 Connection lost. Notifications may be delayed.
              </div>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 17h5l-5 5v-5zM9 17v5H4l5-5z" />
                </svg>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <div className="mt-2">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationCenter;
