const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  // Reference to User
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Admin Information
  adminId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  department: {
    type: String,
    required: true,
    enum: ['CSE', 'ECE', 'ASH', 'Administration'],
    uppercase: true
  },
  designation: {
    type: String,
    required: true,
    enum: ['Super Admin', 'Department Admin', 'System Admin', 'Academic Admin'],
    default: 'Department Admin'
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
adminSchema.index({ department: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ isSuperAdmin: 1 });

// Pre-save middleware to update timestamps
adminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware to validate admin ID format
adminSchema.pre('save', function(next) {
  if (this.isModified('adminId')) {
    // Admin ID format: ADMIN + 3 digits (e.g., ADMIN001)
    if (!/^ADMIN\d{3}$/.test(this.adminId)) {
      return next(new Error('Invalid admin ID format. Should be ADMIN followed by 3 digits.'));
    }
  }
  next();
});

module.exports = mongoose.model('Admin', adminSchema);
