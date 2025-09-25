const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  // Reference to User
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Student Information
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  degree: {
    type: String,
    required: true,
    enum: ['B.Tech', 'M.Tech'],
    default: 'B.Tech'
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  misNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\d{9}$/, 'MIS number must be exactly 9 digits']
  },
  collegeEmail: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number']
  },
  branch: {
    type: String,
    required: true,
    enum: ['CSE', 'ECE', 'ASH'],
    uppercase: true
  },
  
  // Internship Information (simplified)
  internships: [{
    type: {
      type: String,
      enum: ['summer', 'winter'],
      required: true
    },
    company: {
      type: String,
      required: true
    },
    position: String,
    startDate: Date,
    endDate: Date,
    stipend: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'cancelled'],
      default: 'ongoing'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isGraduated: {
    type: Boolean,
    default: false
  },
  graduationYear: Number,
  
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
studentSchema.index({ branch: 1 });
studentSchema.index({ semester: 1 });
studentSchema.index({ isActive: 1 });
// misNumber index is already created by unique: true

// Virtual for auto-detecting year from semester
studentSchema.virtual('year').get(function() {
  if (this.degree === 'B.Tech') {
    return Math.ceil(this.semester / 2);
  } else if (this.degree === 'M.Tech') {
    return Math.ceil(this.semester / 2);
  }
  return null;
});

// Virtual for student's current semester info
studentSchema.virtual('semesterInfo').get(function() {
  return {
    year: this.year,
    semester: this.semester,
    degree: this.degree,
    isGraduated: this.isGraduated
  };
});

// Method to get internship history
studentSchema.methods.getInternshipHistory = function() {
  return this.internships.filter(internship => 
    internship.status === 'completed'
  );
};

// Pre-save middleware to update timestamps
studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Student', studentSchema);
