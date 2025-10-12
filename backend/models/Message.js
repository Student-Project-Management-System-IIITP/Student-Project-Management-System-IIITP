const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderModel: {
    type: String,
    enum: ['Student', 'Faculty'],
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: false,
    trim: true,
    maxlength: 2000,
    default: ''
  },
  // Message Editing
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  editHistory: [{
    previousMessage: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Emoji Reactions
  reactions: [{
    emoji: {
      type: String,
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: String,
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    fileType: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ project: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });

// Methods
messageSchema.methods.markAsRead = async function(userId) {
  if (!this.readBy.some(r => r.user.toString() === userId.toString())) {
    this.readBy.push({ user: userId });
    this.isRead = true;
    await this.save();
  }
};

// Edit message (only within 5 minutes)
messageSchema.methods.editMessage = async function(newMessage, userId) {
  const now = new Date();
  const messageAge = (now - this.createdAt) / 1000 / 60; // in minutes
  
  // Check if sender is the one editing
  if (this.sender.toString() !== userId.toString()) {
    throw new Error('Only the sender can edit this message');
  }
  
  // Check if within 5 minute window
  if (messageAge > 5) {
    throw new Error('Messages can only be edited within 5 minutes of sending');
  }
  
  // Save to edit history
  this.editHistory.push({
    previousMessage: this.message,
    editedAt: now
  });
  
  this.message = newMessage;
  this.isEdited = true;
  this.editedAt = now;
  
  await this.save();
  return this;
};

// Add reaction
messageSchema.methods.addReaction = async function(emoji, userId, userName) {
  // Check if user already reacted with this emoji
  const existingReaction = this.reactions.find(
    r => r.user.toString() === userId.toString() && r.emoji === emoji
  );
  
  if (existingReaction) {
    throw new Error('You have already reacted with this emoji');
  }
  
  this.reactions.push({
    emoji,
    user: userId,
    userName,
    reactedAt: new Date()
  });
  
  await this.save();
  return this;
};

// Remove reaction
messageSchema.methods.removeReaction = async function(emoji, userId) {
  const reactionIndex = this.reactions.findIndex(
    r => r.user.toString() === userId.toString() && r.emoji === emoji
  );
  
  if (reactionIndex === -1) {
    throw new Error('Reaction not found');
  }
  
  this.reactions.splice(reactionIndex, 1);
  await this.save();
  return this;
};

// Check if message can be edited
messageSchema.methods.canEdit = function(userId) {
  const now = new Date();
  const messageAge = (now - this.createdAt) / 1000 / 60; // in minutes
  
  return this.sender.toString() === userId.toString() && messageAge <= 5;
};

// Check if message can be deleted (also 5 minute window)
messageSchema.methods.canDelete = function(userId) {
  const now = new Date();
  const messageAge = (now - this.createdAt) / 1000 / 60; // in minutes
  
  return this.sender.toString() === userId.toString() && messageAge <= 5;
};

// Statics
messageSchema.statics.getProjectMessages = async function(projectId, limit = 50, skip = 0) {
  return this.find({ project: projectId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'fullName email')
    .lean();
};

messageSchema.statics.searchMessages = async function(projectId, searchQuery) {
  return this.find({
    project: projectId,
    message: { $regex: searchQuery, $options: 'i' }
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', 'fullName email')
    .lean();
};

messageSchema.statics.getUnreadCount = async function(projectId, userId) {
  return this.countDocuments({
    project: projectId,
    sender: { $ne: userId },
    'readBy.user': { $ne: userId }
  });
};

module.exports = mongoose.model('Message', messageSchema);

