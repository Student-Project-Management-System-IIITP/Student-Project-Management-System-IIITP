const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  // Reference to User
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Personal Information
  prefix: {
    type: String,
    trim: true,
    enum: ['Dr', 'Mr', 'Mrs', 'Miss', 'Prof', 'Ms'],
    default: ''
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number']
  },
  
  // Faculty Information
  facultyId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
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
  
  // Faculty Status
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
// facultyId index is already created by unique: true

// Pre-save middleware to update timestamps
facultySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate facultyId if missing, and validate format
facultySchema.pre('validate', async function(next) {
  try {
    if (!this.facultyId) {
      // Try a few times to generate a unique FAC + 3 digits id
      for (let attempt = 0; attempt < 5; attempt++) {
        const randomNum = Math.floor(Math.random() * 1000);
        const candidate = `FAC${randomNum.toString().padStart(3, '0')}`;
        const existing = await this.constructor.findOne({ facultyId: candidate }).lean();
        if (!existing) {
          this.facultyId = candidate;
          break;
        }
      }
    }

    if (this.isModified('facultyId')) {
      if (!/^FAC\d{3}$/.test(this.facultyId)) {
        return next(new Error('Invalid faculty ID format. Should be FAC followed by 3 digits.'));
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Faculty', facultySchema);
