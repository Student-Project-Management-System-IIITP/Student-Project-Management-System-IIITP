const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    this.connectedUsers = new Map();
    this.groupRooms = new Map();
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', async (socket) => {
      console.log(`Socket.IO: User connected - ${socket.userId}`);
      
      try {
        const student = await Student.findOne({ user: socket.userId });
        if (student) {
          socket.studentId = student._id;
          socket.userData = student;
          
          // Add to connected users map
          this.connectedUsers.set(socket.userId, {
            socketId: socket.id,
            studentId: student._id,
            fullName: student.fullName,
            connectedAt: new Date()
          });

          socket.emit('connected', { 
            message: 'Successfully connected to Sem 5 Group Management',
            studentId: student._id,
            studentName: student.fullName
          });
        }

        // 💼 SEM 5 GROUP FORMATION EVENTS
        this.setupGroupEvents(socket);
        
        // 💬 PROJECT CHAT EVENTS
        this.setupProjectChatEvents(socket);
        
        // Cleanup on disconnect
        socket.on('disconnect', () => {
          this.handleDisconnect(socket);
        });
        
      } catch (error) {
        console.error('Socket connection setup error:', error);
        socket.disconnect();
      }
    });
  }

  setupGroupEvents(socket) {
    // 📩 GROUP INVITATION EVENTS
        
    socket.on('join_group_rooms', async () => {
      try {
        const student = await Student.findOne({ user: socket.userId });
        if (!student) return;

        // Join all relevant group rooms
        if (student.groupId) {
          socket.join(`group_${student.groupId}`);
          socket.emit('joined_group_room', { groupId: student.groupId });
        }

        // Join for group notifications
        socket.join(`notifications_${student._id}`);
      } catch (error) {
        console.error('Error joining group rooms:', error);
      }
    });

    socket.on('leave_group_rooms', () => {
      socket.leave();
    });

    // Listen for group invitations
    socket.on('invitation_status_update', (data) => {
      socket.broadcast.emit('group_update', data);
    });

    // 💻 GROUP ACTIVITY EVENTS
    
    socket.on('group_activity', async (data) => {
      try {
        const { groupId, eventType, eventData } = data;
        
        // Validate that user is part of this group
        const student = await Student.findOne({
          user: socket.userId,
          groupMemberships: {
            $elemMatch: {
              group: groupId,
              isActive: true
            }
          }
        });

        if (!student) {
          socket.emit('error', { message: 'Not authorized for this group' });
          return;
        }

        // Broadcast to group room
        socket.to(`group_${groupId}`).emit('group_activity', {
          ...data,
          timestamp: new Date(),
          triggeredBy: socket.userId
        });
        
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('member_join_update', (data) => {
      socket.to(`group_${data.groupId}`).emit('member_join_update', data);
    });

    socket.on('member_leave_update', (data) => {
      socket.to(`group_${data.groupId}`).emit('member_leave_update', data);
    });

    socket.on('leadership_transfer', (data) => {
      socket.to(`group_${data.groupId}`).emit('leadership_transfer', data);
    });

    socket.on('group_finalization', (data) => {
      socket.to(`group_${data.groupId}`).emit('group_finalization', data);
    });
  }

  setupProjectChatEvents(socket) {
    // Join project room
    socket.on('join_project_room', (projectId) => {
      socket.join(`project_${projectId}`);
      socket.emit('joined_project_room', { projectId });
    });

    // Leave project room
    socket.on('leave_project_room', (projectId) => {
      socket.leave(`project_${projectId}`);
    });

    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(`project_${data.projectId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user?.fullName || 'Unknown',
        isTyping: data.isTyping
      });
    });
  }

  // 🏗️ BUILD SOCKET.IO BROADCASTING METHODS

  // Send real-time group invitation
  async sendGroupInvitation(userId, invitationData) {
    const userConnection = this.connectedUsers.get(userId);
    if (userConnection) {
      this.io.to(userConnection.socketId).emit('group_invitation', {
        type: 'group_invitation',
        data: invitationData,
        timestamp: new Date()
      });
    }
  }

  // Broadcast invitation acceptance to group
  async broadcastInvitationAcceptance(groupId, studentData) {
    this.io.to(`group_${groupId}`).emit('invitation_accepted', {
      type: 'invitation_accepted',
      groupId,
      student: studentData,
      timestamp: new Date()
    });
  }

  // Broadcast invitation rejection 
  async broadcastInvitationRejection(groupId, studentData) {
    this.io.to(`group_${groupId}`).emit('invitation_rejected', {
      type: 'invitation_rejected', 
      groupId,
      student: studentData,
      timestamp: new Date()
    });
  }

  // Broadcast membership changes in real-time
  async broadcastMembershipChange(groupId, changeData) {
    this.io.to(`group_${groupId}`).emit('membership_change', {
      type: 'membership_change',
      groupId,
      data: changeData,
      timestamp: new Date()
    });
  }

  // Broadcast leadership transfer 
  async broadcastLeadershipTransfer(groupId, leadershipData) {
    this.io.to(`group_${groupId}`).emit('leadership_transfer', {
      type: 'leadership_transfer',
      groupId,
      data: leadershipData,
      timestamp: new Date()
    });
  }

  // Broadcast group finalization 
  async broadcastGroupFinalization(groupId, finalizationData) {
    this.io.to(`group_${groupId}`).emit('group_finalized', {
      type: 'group_finalized',
      groupId,
      data: finalizationData,
      timestamp: new Date()
    });
  }

  // Send system notifications to specific student
  async sendSystemNotification(userId, notificationMessage) {
    const userConnection = this.connectedUsers.get(userId);
    if (userConnection) {
      this.io.to(userConnection.socketId).emit('system_notification', {
        type: 'system_notification',
        title: notificationMessage.title || 'Group Update',
        message: notificationMessage.message,
        timestamp: new Date()
      });
    }
  }

  // Broadcast group capacity updates 
  async broadcastCapacityUpdate(groupId, capacityInfo) {
    this.io.to(`group_${groupId}`).emit('capacity_update', {
      type: 'capacity_update',
      groupId,
      currentMemberCount: capacityInfo.currentMemberCount,
      maxMembers: capacityInfo.maxMembers,
      timestamp: new Date()
    });
  }

  // Send live typing indicators for collaborative group chats
  async broadcastTypingStatus(groupId, studentId, typingState) {
    this.io.to(`group_${groupId}`).emit('typing_indicator', {
      groupId,
      studentId, 
      typingState,
      timestamp: new Date()
    });
  }

  // Group room management
  addToGroupRoom(groupId, studentId) {
    this.groupRooms.set(`${groupId}_${studentId}`, true);
  }

  removeFromGroupRoom(groupId, studentId) {
    this.groupRooms.delete(`${groupId}_${studentId}`);
  }

  // Convenience methods for real-time group management
  async notifyGroupInvitationSent(invitedUserIds, invitationData) {
    for (const userId of invitedUserIds) {
      await this.sendGroupInvitation(userId, invitationData);
    }
  }

  async notifyInvitationAccepted(groupId, studentData) {
    await this.broadcastInvitationAcceptance(groupId, studentData);
  }

  async notifyInvitationRejected(groupId, studentData) {
    await this.broadcastInvitationRejection(groupId, studentData);
  }

  async notifyInvitationAutoRejected(studentId, groupId, reason) {
    try {
      const student = await Student.findById(studentId).populate('user');
      if (student && student.user) {
        this.io.to(`user_${student.user._id}`).emit('invitation_update', {
          type: 'auto_rejected',
          groupId,
          reason,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error sending auto-rejection notification:', error);
    }
  }

  async notifyGroupFormationStart(groupId, starterData) {
    this.io.to(`group_${groupId}`).emit('group_formation_start', {
      type: 'group_formation_start',
      groupId,
      startedBy: starterData,
      timestamp: new Date()
    });
  }

  async notifyLeadershipTransfer(groupId, transferData) {
    await this.broadcastLeadershipTransfer(groupId, transferData);
  }

  async notifyGroupFinalized(groupId, finalizationData) {
    await this.broadcastGroupFinalization(groupId, finalizationData);
  }

  async notifyMemberLeave(groupId, leaveData) {
    await this.broadcastMembershipChange(groupId, {
      ...leaveData,
      changeType: 'member_left',
      timestamp: new Date()
    });
  }

  // 💬 PROJECT CHAT BROADCASTING METHODS
  
  async broadcastNewMessage(projectId, messageData) {
    this.io.to(`project_${projectId}`).emit('new_message', {
      type: 'new_message',
      projectId,
      message: messageData,
      timestamp: new Date()
    });
  }

  async broadcastMessageUpdate(projectId, messageId, updateData) {
    this.io.to(`project_${projectId}`).emit('message_updated', {
      type: 'message_updated',
      projectId,
      messageId,
      update: updateData,
      timestamp: new Date()
    });
  }

  async broadcastMessageDelete(projectId, messageId) {
    this.io.to(`project_${projectId}`).emit('message_deleted', {
      type: 'message_deleted',
      projectId,
      messageId,
      timestamp: new Date()
    });
  }

  async broadcastReactionUpdate(projectId, messageId, reactions) {
    this.io.to(`project_${projectId}`).emit('reaction_updated', {
      type: 'reaction_updated',
      projectId,
      messageId,
      reactions,
      timestamp: new Date()
    });
  }

  handleDisconnect(socket) {
    console.log(`Socket.IO: User disconnected - ${socket.userId}`);
    
    if (socket.userId) {
      this.connectedUsers.delete(socket.userId);
    }
    
    socket.leaveAll();
  }

  // Get connection status for monitoring
  getConnectionStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeGroups: [...new Set(Array.from(this.connectedUsers.values()).map(u => u.studentId))].length,
      timestamp: new Date()
    };
  }
}

module.exports = SocketService;
