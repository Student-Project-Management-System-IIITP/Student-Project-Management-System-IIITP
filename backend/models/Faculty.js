const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  // Reference to User
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Faculty Information
  department: {
    type: String,
    required: true,
    enum: ['CSE', 'ECE', 'ASH'],
    uppercase: true
  },
  mode: {
    type: String,
    required: true,
    enum: ['Regular', 'Adjunct', 'On Lien'],
    default: 'Regular'
  },
  designation: {
    type: String,
    required: true,
    enum: ['HOD', 'Assistant Professor', 'Adjunct Assistant Professor', 'Assistant Registrar', 'TPO', 'Warden', 'Chief Warden', 'Associate Dean', 'Coordinator(PG, PhD)', 'Tenders/Purchase'],
    default: 'Assistant Professor'
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isRetired: {
    type: Boolean,
    default: false
  },
  retirementDate: Date,
  
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
facultySchema.index({ department: 1 });
facultySchema.index({ isActive: 1 });

// Pre-save middleware to update timestamps
facultySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Faculty', facultySchema);
