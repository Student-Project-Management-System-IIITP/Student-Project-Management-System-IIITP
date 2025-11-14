const mongoose = require('mongoose');

const internshipApplicationSchema = new mongoose.Schema({
  // Ownership
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },

  // Academic context
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8,
    index: true
  },
  academicYear: {
    type: String,
    required: true,
    trim: true,
    match: [/^\d{4}-\d{2}$/, 'Academic year must be in format YYYY-YY (e.g., 2024-25)'],
    index: true
  },

  // Application type: 6-month internship or 2-month (summer) evidence
  type: {
    type: String,
    enum: ['6month', 'summer'],
    required: true,
    index: true
  },

  // Review workflow (extended to support end-of-semester verification)
  status: {
    type: String,
    enum: ['submitted', 'needs_info', 'pending_verification', 'verified_pass', 'verified_fail', 'absent'],
    default: 'submitted',
    index: true
  },
  adminRemarks: {
    type: String,
    maxlength: 500
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewedAt: Date,
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  verificationRemarks: { type: String, maxlength: 500 },

  // Internship 1 Track Change History (for summer internships)
  internship1TrackChangedByAdminAt: { type: Date, default: null }, // Track if admin changed the Internship 1 track
  previousInternship1Track: { type: String, enum: ['project', 'application'], default: null }, // Store the previous Internship 1 track

  // Details (basic set; can be extended later without breaking API)
  details: {
    companyName: { type: String, required: true },
    location: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    mentorName: { type: String },
    mentorEmail: { type: String },
    mentorPhone: { type: String },
    roleOrNatureOfWork: { type: String },
    mode: { type: String, enum: ['onsite', 'remote', 'hybrid'], default: 'onsite' },
    hasStipend: { type: String, enum: ['yes', 'no'], default: 'no' },
    stipendRs: { type: Number, default: 0 },
    // Google Drive links
    offerLetterLink: { type: String }, // For 6-month internship (Google Drive link)
    completionCertificateLink: { type: String } // For summer internship (Google Drive link) - REQUIRED
  },

  // Upload fields (paths/filenames stored; actual files handled by upload middleware)
  // Note: File uploads are deprecated for summer internships (now using Google Drive links)
  // Keeping for backward compatibility with existing data
  uploads: {
    offerLetterFile: { type: String }, // Legacy: optional for summer
    completionCertificateFile: { type: String } // Legacy: kept for backward compatibility
  },

  // Metadata
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
internshipApplicationSchema.index({ student: 1, semester: 1, type: 1 });
internshipApplicationSchema.index({ status: 1, type: 1 });

// Hooks
internshipApplicationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Helpers
internshipApplicationSchema.methods.isSixMonth = function() {
  return this.type === '6month';
};

internshipApplicationSchema.methods.isSummer = function() {
  return this.type === 'summer';
};

module.exports = mongoose.model('InternshipApplication', internshipApplicationSchema);


