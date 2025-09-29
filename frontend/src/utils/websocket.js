import { toast } from 'react-hot-toast';

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
    this.listeners = new Map();
    this.heartbeatInterval = null;
  }

  connect(token) {
    if (this.socket && this.isConnected) {
      return;
    }

    try {
      const wsUrl = process.env.VITE_WS_URL || 'ws://localhost:3000';
      this.socket = new WebSocket(`${wsUrl}?token=${token}`);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('disconnected');
        this.attemptReconnect(token);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.stopHeartbeat();
    }
  }

  send(data) {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  unsubscribe(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
      if (this.listeners.get(event).size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  handleMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'group_invitation':
        this.handleGroupInvitation(payload);
        break;
      case 'invitation_accepted':
        this.handleInvitationAccepted(payload);
        break;
      case 'invitation_rejected':
        this.handleInvitationRejected(payload);
        break;
      case 'membership_change':
        this.handleMembershipChange(payload);
        break;
      case 'leadership_transfer':
        this.handleLeadershipTransfer(payload);
        break;
      case 'group_finalized':
        this.handleGroupFinalized(payload);
        break;
      case 'capacity_update':
        this.handleCapacityUpdate(payload);
        break;
      case 'group_allocation':
        this.handleGroupAllocation(payload);
        break;
      case 'faculty_response':
        this.handleFacultyResponse(payload);
        break;
      case 'project_update':
        this.handleProjectUpdate(payload);
        break;
      case 'system_notification':
        this.handleSystemNotification(payload);
        break;
      default:
        this.emit(type, payload);
    }
  }

  handleGroupInvitation(payload) {
    const { groupName, inviterName, groupId } = payload;
    toast.success(`You've been invited to join group "${groupName}" by ${inviterName}`, {
      duration: 6000,
      action: {
        label: 'View',
        onClick: () => {
          // Navigate to group invitations page
          window.location.href = '/student/groups/invitations';
        }
      }
    });
    this.emit('group_invitation', payload);
  }

  handleGroupAllocation(payload) {
    const { groupName, facultyName, status } = payload;
    if (status === 'allocated') {
      toast.success(`Group "${groupName}" has been allocated to ${facultyName}`, {
        duration: 5000
      });
    } else if (status === 'unallocated') {
      toast.error(`Group "${groupName}" allocation failed. Manual allocation required.`, {
        duration: 5000
      });
    }
    this.emit('group_allocation', payload);
  }

  handleFacultyResponse(payload) {
    const { groupName, facultyName, response } = payload;
    if (response === 'accepted') {
      toast.success(`Faculty ${facultyName} has accepted group "${groupName}"`, {
        duration: 5000
      });
    } else if (response === 'rejected') {
      toast.info(`Faculty ${facultyName} has passed on group "${groupName}"`, {
        duration: 5000
      });
    }
    this.emit('faculty_response', payload);
  }

  handleProjectUpdate(payload) {
    const { projectTitle, updateType, message } = payload;
    toast.info(`Project "${projectTitle}": ${message}`, {
      duration: 4000
    });
    this.emit('project_update', payload);
  }

  handleSystemNotification(payload) {
    const { title, message, type = 'info' } = payload;
    toast[type](message, {
      duration: 6000
    });
    this.emit('system_notification', payload);
  }

  // 🔥 NEW: Real-time Group Formation Event Handlers

  handleInvitationAccepted(payload) {
    const { groupId, student, role } = payload;
    toast.success(`${student.fullName} (${student.misNumber}) has joined the group!`, {
      duration: 4000,
      action: {
        label: 'View Group',
        onClick: () => {
          window.location.href = `/student/groups/${groupId}`;
        }
      }
    });
    this.emit('invitation_accepted', payload);
  }

  handleInvitationRejected(payload) {
    const { groupId, student } = payload;
    toast.info(`${student.fullName} declined the invitation`, {
      duration: 3000
    });
    this.emit('invitation_rejected', payload);
  }

  handleMembershipChange(payload) {
    const { groupId, changeType, triggeredBy } = payload;
    switch (changeType) {
      case 'invitations_sent':
        toast.info('New invitations have been sent to your group', {
          duration: 3000
        });
        break;
      case 'member_joined':
        toast.success('A new member has joined your group!', {
          duration: 3000
        });
        break;
      case 'member_left':
        toast.warning('A member has left your group', {
          duration: 4000
        });
        break;
    }
    this.emit('membership_change', payload);
  }

  handleLeadershipTransfer(payload) {
    const { groupId, previousLeader, newLeader } = payload;
    toast.info(`Leadership transferred from ${previousLeader.fullName} to ${newLeader.fullName}`, {
      duration: 5000,
      action: {
        label: 'View Details',
        onClick: () => {
          window.location.href = `/student/groups/${groupId}`;
        }
      }
    });
    this.emit('leadership_transfer', payload);
  }

  handleGroupFinalized(payload) {
    const { groupId, finalizedBy } = payload;
    toast.success(`Group has been finalized by ${finalizedBy.fullName}!`, {
      duration: 6000,
      action: {
        label: 'View Group',
        onClick: () => {
          window.location.href = `/student/groups/${groupId}`;
        }
      }
    });
    this.emit('group_finalized', payload);
  }

  handleCapacityUpdate(payload) {
    const { groupId, currentMemberCount, maxMembers } = payload;
    const filledPercentage = (currentMemberCount / maxMembers) * 100;
    
    if (filledPercentage >= 100) {
      toast.success('Your group is now complete!', {
        duration: 5000
      });
    } else if (filledPercentage >= 80) {
      toast.warning('Your group is almost full!', {
        duration: 4000
      });
    }
    
    this.emit('capacity_update', payload);
  }

  attemptReconnect(token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(token);
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed');
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Specific event methods for Sem 5 workflow
  subscribeToGroupInvitations(callback) {
    this.subscribe('group_invitation', callback);
  }

  subscribeToGroupAllocations(callback) {
    this.subscribe('group_allocation', callback);
  }

  subscribeToFacultyResponses(callback) {
    this.subscribe('faculty_response', callback);
  }

  subscribeToProjectUpdates(callback) {
    this.subscribe('project_update', callback);
  }

  subscribeToSystemNotifications(callback) {
    this.subscribe('system_notification', callback);
  }

  // 🔥 NEW: Group Formation Event Subscriptions
  subscribeToInvitationAccepted(callback) {
    this.subscribe('invitation_accepted', callback);
  }

  subscribeToInvitationRejected(callback) {
    this.subscribe('invitation_rejected', callback);
  }

  subscribeToMembershipChanges(callback) {
    this.subscribe('membership_change', callback);
  }

  subscribeToLeadershipTransfers(callback) {
    this.subscribe('leadership_transfer', callback);
  }

  subscribeToGroupFinalizations(callback) {
    this.subscribe('group_finalized', callback);
  }

  subscribeToCapacityUpdates(callback) {
    this.subscribe('capacity_update', callback);
  }

  // Send specific events
  sendGroupInvitation(invitationData) {
    this.send({
      type: 'group_invitation',
      payload: invitationData
    });
  }

  // 🎊 NEW: Real-time Group Activity Methods
  sendGroupActivity(groupId, eventType, eventData) {
    this.send({
      type: 'group_activity',
      groupId,
      eventType,
      eventData
    });
  }

  joinGroupRoom(groupId) {
    if (this.isConnected) {
      this.send({
        type: 'join_group_rooms'
      });
    }
  }

  leaveGroupRoom() {
    if (this.isConnected) {
      this.send({
        type: 'leave_group_rooms'
      });
    }
  }

  sendGroupAllocation(allocationData) {
    this.send({
      type: 'group_allocation',
      payload: allocationData
    });
  }

  sendFacultyResponse(responseData) {
    this.send({
      type: 'faculty_response',
      payload: responseData
    });
  }

  sendProjectUpdate(updateData) {
    this.send({
      type: 'project_update',
      payload: updateData
    });
  }
}

// Create a singleton instance
const websocketManager = new WebSocketManager();

export default websocketManager;
