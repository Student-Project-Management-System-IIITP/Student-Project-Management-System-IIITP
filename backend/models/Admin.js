const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  // Reference to User
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Personal Information
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number']
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
    enum: ['CSE', 'ECE', 'ASH', 'ADMINISTRATION'],
    uppercase: true
  },
  designation: {
    type: String,
    required: true,
    enum: ['Super Admin', 'Department Admin', 'System Admin', 'Academic Admin'],
    default: 'Department Admin'
  },
  
  // Admin Status
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
adminSchema.index({ isSuperAdmin: 1 });

// Pre-save middleware to update timestamps
adminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate adminId if missing, and validate format
adminSchema.pre('validate', async function(next) {
  try {
    if (!this.adminId) {
      // Try a few times to generate a unique ADMIN + 3 digits id
      for (let attempt = 0; attempt < 5; attempt++) {
        const randomNum = Math.floor(Math.random() * 1000);
        const candidate = `ADMIN${randomNum.toString().padStart(3, '0')}`;
        const existing = await this.constructor.findOne({ adminId: candidate }).lean();
        if (!existing) {
          this.adminId = candidate;
          break;
        }
      }
    }

    if (this.isModified('adminId')) {
      if (!/^ADMIN\d{3}$/.test(this.adminId)) {
        return next(new Error('Invalid admin ID format. Should be ADMIN followed by 3 digits.'));
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Admin', adminSchema);
