const mongoose = require('mongoose');

const facultyNotificationSchema = new mongoose.Schema({
  // Faculty who receives the notification
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true,
    index: true
  },
  
  // Notification type
  type: {
    type: String,
    enum: ['project_cancelled', 'track_change', 'allocation_change'],
    required: true
  },
  
  // Notification content
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Related project (if applicable)
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Related student (if applicable)
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  
  // Notification status
  dismissed: {
    type: Boolean,
    default: false,
    index: true
  },
  dismissedAt: Date,
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
facultyNotificationSchema.index({ faculty: 1, dismissed: 1, createdAt: -1 });
facultyNotificationSchema.index({ type: 1, dismissed: 1 });

module.exports = mongoose.model('FacultyNotification', facultyNotificationSchema);

