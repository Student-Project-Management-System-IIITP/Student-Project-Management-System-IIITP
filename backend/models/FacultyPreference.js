const mongoose = require('mongoose');

const facultyPreferenceSchema = new mongoose.Schema({
  // Student Information
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  
  // Project Information
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  
  // Group Information (if applicable)
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    index: true
  },
  
  // Faculty Preferences
  preferences: [{
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Academic Information
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
    index: true
  },
  
  // Allocation Status
  status: {
    type: String,
    enum: ['pending', 'allocated', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Allocation Result
  allocatedFaculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    index: true
  },
  allocatedBy: {
    type: String,
    enum: ['faculty_choice', 'admin_allocation'],
    default: 'faculty_choice'
  },
  allocatedAt: {
    type: Date
  },
  
  // Faculty Response
  facultyResponse: {
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    responseAt: Date,
    comments: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty'
    }
  },
  
  // Current faculty index for allocation workflow
  currentFacultyIndex: {
    type: Number,
    default: 0,
    min: 0,
    max: 9, // 0-9 for up to 10 faculty preferences
    validate: {
      validator: function(value) {
        return value >= 0 && value < (this.preferences?.length || 0);
      },
      message: 'Current faculty index must be within preferences range'
    }
  },
  
  // Rejection Reason (if rejected)
  rejectionReason: {
    type: String,
    enum: ['capacity_full', 'not_available', 'not_suitable', 'other'],
    default: 'other'
  },
  rejectionComments: String,
  
  // Priority Score (for admin allocation)
  priorityScore: {
    type: Number,
    default: 0
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
facultyPreferenceSchema.index({ student: 1, semester: 1 });
facultyPreferenceSchema.index({ project: 1, status: 1 });
facultyPreferenceSchema.index({ group: 1, status: 1 });
facultyPreferenceSchema.index({ allocatedFaculty: 1, status: 1 });
facultyPreferenceSchema.index({ status: 1, semester: 1 });
facultyPreferenceSchema.index({ academicYear: 1, semester: 1 });

// Pre-save middleware to update timestamps
facultyPreferenceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware to validate preferences
facultyPreferenceSchema.pre('save', function(next) {
  // Validate that priorities are unique
  const priorities = this.preferences.map(p => p.priority);
  const uniquePriorities = [...new Set(priorities)];
  
  if (priorities.length !== uniquePriorities.length) {
    return next(new Error('Faculty priorities must be unique'));
  }
  
  // Validate priority range
  for (const pref of this.preferences) {
    if (pref.priority < 1 || pref.priority > 10) {
      return next(new Error('Faculty priority must be between 1 and 10'));
    }
  }
  
  // Set allocatedAt when status changes to allocated
  if (this.isModified('status') && this.status === 'allocated' && !this.allocatedAt) {
    this.allocatedAt = new Date();
  }
  
  next();
});

// Virtual for preference count
facultyPreferenceSchema.virtual('preferenceCount').get(function() {
  return this.preferences.length;
});

// Virtual for highest priority faculty
facultyPreferenceSchema.virtual('highestPriorityFaculty').get(function() {
  if (this.preferences.length === 0) return null;
  
  const sortedPreferences = this.preferences.sort((a, b) => a.priority - b.priority);
  return sortedPreferences[0].faculty;
});

// Virtual for allocation status
facultyPreferenceSchema.virtual('isAllocated').get(function() {
  return this.status === 'allocated' && !!this.allocatedFaculty;
});

// Virtual for is pending
facultyPreferenceSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

// Method to add faculty preference
facultyPreferenceSchema.methods.addPreference = function(facultyId, priority) {
  // Check if faculty is already in preferences
  const existingPreference = this.preferences.find(p => 
    p.faculty.toString() === facultyId.toString()
  );
  
  if (existingPreference) {
    throw new Error('Faculty is already in preferences');
  }
  
  // Check if priority is already used
  const existingPriority = this.preferences.find(p => p.priority === priority);
  if (existingPriority) {
    throw new Error('Priority is already used');
  }
  
  // Add preference
  this.preferences.push({
    faculty: facultyId,
    priority: priority,
    submittedAt: new Date()
  });
  
  return this.save();
};

// Method to update faculty preference
facultyPreferenceSchema.methods.updatePreference = function(facultyId, newPriority) {
  const preference = this.preferences.find(p => 
    p.faculty.toString() === facultyId.toString()
  );
  
  if (!preference) {
    throw new Error('Faculty preference not found');
  }
  
  // Check if new priority is already used by another faculty
  const existingPriority = this.preferences.find(p => 
    p.priority === newPriority && p.faculty.toString() !== facultyId.toString()
  );
  
  if (existingPriority) {
    throw new Error('Priority is already used by another faculty');
  }
  
  preference.priority = newPriority;
  return this.save();
};

// Method to remove faculty preference
facultyPreferenceSchema.methods.removePreference = function(facultyId) {
  const preferenceIndex = this.preferences.findIndex(p => 
    p.faculty.toString() === facultyId.toString()
  );
  
  if (preferenceIndex === -1) {
    throw new Error('Faculty preference not found');
  }
  
  this.preferences.splice(preferenceIndex, 1);
  return this.save();
};

// Method to allocate faculty
facultyPreferenceSchema.methods.allocateFaculty = function(facultyId, allocatedBy = 'faculty_choice') {
  if (this.status !== 'pending') {
    throw new Error('Cannot allocate faculty to non-pending preference');
  }
  
  // Check if faculty is in preferences
  const preference = this.preferences.find(p => 
    p.faculty.toString() === facultyId.toString()
  );
  
  if (!preference) {
    throw new Error('Faculty is not in student preferences');
  }
  
  this.allocatedFaculty = facultyId;
  this.allocatedBy = allocatedBy;
  this.status = 'allocated';
  this.allocatedAt = new Date();
  
  return this.save();
};

// Method to reject preference
facultyPreferenceSchema.methods.rejectPreference = function(reason = 'other', comments = '') {
  if (this.status !== 'pending') {
    throw new Error('Cannot reject non-pending preference');
  }
  
  this.status = 'rejected';
  this.rejectionReason = reason;
  this.rejectionComments = comments;
  
  return this.save();
};

// Method to get preference summary
facultyPreferenceSchema.methods.getSummary = function() {
  return {
    id: this._id,
    student: this.student,
    project: this.project,
    group: this.group,
    semester: this.semester,
    academicYear: this.academicYear,
    status: this.status,
    preferenceCount: this.preferenceCount,
    isAllocated: this.isAllocated,
    isPending: this.isPending,
    allocatedFaculty: this.allocatedFaculty,
    allocatedBy: this.allocatedBy,
    allocatedAt: this.allocatedAt
  };
};

// Method to get current faculty being presented to
facultyPreferenceSchema.methods.getCurrentFaculty = function() {
  if (!this.preferences || this.preferences.length === 0) {
    return null;
  }
  
  const currentIndex = this.currentFacultyIndex || 0;
  return this.preferences[currentIndex] || null;
};

// Method to check if all faculty have been presented to
facultyPreferenceSchema.methods.allFacultyPresented = function() {
  return this.currentFacultyIndex >= (this.preferences?.length || 0);
};

// Method to move to next faculty
facultyPreferenceSchema.methods.moveToNextFaculty = function() {
  if (this.allFacultyPresented()) {
    throw new Error('All faculty have been presented to');
  }
  
  this.currentFacultyIndex = (this.currentFacultyIndex || 0) + 1;
  return this.save();
};

// Method to check if ready for admin allocation
facultyPreferenceSchema.methods.isReadyForAdminAllocation = function() {
  return this.allFacultyPresented() && this.status === 'pending';
};

// Method to record faculty response
facultyPreferenceSchema.methods.recordFacultyResponse = function(facultyId, response, comments = '') {
  const preference = this.preferences.find(p => 
    p.faculty.toString() === facultyId.toString()
  );
  
  if (!preference) {
    throw new Error('Faculty is not in preferences');
  }
  
  this.facultyResponse = {
    status: response,
    responseAt: new Date(),
    comments: comments,
    respondedBy: facultyId
  };
  
  return this.save();
};

// Static method to get preferences by student
facultyPreferenceSchema.statics.getByStudent = function(studentId, semester) {
  const query = { student: studentId };
  if (semester) {
    query.semester = semester;
  }
  
  return this.find(query)
    .populate('project group preferences.faculty allocatedFaculty')
    .sort({ createdAt: -1 });
};

// Static method to get preferences by faculty
facultyPreferenceSchema.statics.getByFaculty = function(facultyId, status = 'pending') {
  return this.find({
    'preferences.faculty': facultyId,
    status: status
  })
    .populate('student project group')
    .sort({ createdAt: -1 });
};

// Static method to get pending allocations
facultyPreferenceSchema.statics.getPendingAllocations = function(semester, academicYear) {
  return this.find({
    status: 'pending',
    semester: semester,
    academicYear: academicYear
  })
    .populate('student project group preferences.faculty')
    .sort({ createdAt: 1 });
};

// Static method to get unallocated preferences
facultyPreferenceSchema.statics.getUnallocated = function(semester, academicYear) {
  return this.find({
    status: 'pending',
    semester: semester,
    academicYear: academicYear,
    allocatedFaculty: { $exists: false }
  })
    .populate('student project group preferences.faculty')
    .sort({ priorityScore: -1, createdAt: 1 });
};

// Static method to get groups currently presented to a faculty
facultyPreferenceSchema.statics.getGroupsForFaculty = function(facultyId, semester, academicYear) {
  const query = {
    'preferences.faculty': facultyId,
    status: 'pending',
    semester: semester,
    academicYear: academicYear
  };
  
  console.log(`[FacultyPreference.getGroupsForFaculty] Query:`, JSON.stringify(query, null, 2));
  
  return this.find(query)
    .populate('student')
    .populate({
      path: 'project',
      select: 'title description projectType status currentFacultyIndex facultyPreferences',
      populate: {
        path: 'facultyPreferences.faculty',
        select: 'fullName department designation'
      }
    })
    .populate('group')
    .populate('preferences.faculty', 'fullName department designation')
    .sort({ createdAt: 1 })
    .then(preferences => {
      console.log(`[FacultyPreference.getGroupsForFaculty] Found ${preferences.length} preferences for faculty ${facultyId}, semester ${semester}, academicYear ${academicYear}`);
      
      // Filter to only include preferences where the current faculty is at currentFacultyIndex
      const filtered = preferences.filter(pref => {
        // For solo projects (no group), use Project's currentFacultyIndex and facultyPreferences
        // For group projects, use FacultyPreference's currentFacultyIndex and preferences
        if (pref.project && !pref.group && pref.project.facultyPreferences) {
          // Solo project - check Project's facultyPreferences
          const currentIndex = (pref.project?.currentFacultyIndex || 0);
          const currentFacultyPref = pref.project.facultyPreferences && pref.project.facultyPreferences[currentIndex];
          if (currentFacultyPref && currentFacultyPref.faculty) {
            const matches = currentFacultyPref.faculty._id.toString() === facultyId.toString();
            console.log(`[FacultyPreference.getGroupsForFaculty] Solo project ${pref.project._id}: currentIndex=${currentIndex}, faculty=${currentFacultyPref.faculty._id}, matches=${matches}`);
            return matches;
          }
          console.log(`[FacultyPreference.getGroupsForFaculty] Solo project ${pref.project._id}: No currentFacultyPref found`);
          return false;
        } else {
          // Group project - check FacultyPreference's preferences
          const currentIndex = (pref.project?.currentFacultyIndex || pref.currentFacultyIndex || 0);
          const currentFaculty = pref.preferences && pref.preferences[currentIndex];
          
          console.log(`[FacultyPreference.getGroupsForFaculty] Group project check:`, {
            projectId: pref.project?._id,
            groupId: pref.group?._id,
            currentIndex: currentIndex,
            projectCurrentIndex: pref.project?.currentFacultyIndex,
            prefCurrentIndex: pref.currentFacultyIndex,
            preferencesLength: pref.preferences?.length,
            currentFaculty: currentFaculty ? {
              facultyId: currentFaculty.faculty?._id?.toString(),
              facultyName: currentFaculty.faculty?.fullName,
              priority: currentFaculty.priority
            } : null,
            targetFacultyId: facultyId.toString(),
            preferences: pref.preferences?.map((p, idx) => ({
              index: idx,
              facultyId: p.faculty?._id?.toString(),
              facultyName: p.faculty?.fullName,
              priority: p.priority
            }))
          });
          
          const matches = currentFaculty && currentFaculty.faculty && 
                 currentFaculty.faculty._id.toString() === facultyId.toString();
          
          console.log(`[FacultyPreference.getGroupsForFaculty] Group project ${pref.project?._id}: matches=${matches}`);
          return matches;
        }
      });
      
      console.log(`[FacultyPreference.getGroupsForFaculty] Filtered to ${filtered.length} groups after checking currentFacultyIndex`);
      return filtered;
    });
};

// Static method to get allocated groups for a faculty
facultyPreferenceSchema.statics.getAllocatedGroupsForFaculty = function(facultyId, semester, academicYear) {
  return this.find({
    allocatedFaculty: facultyId,
    status: 'allocated',
    semester: semester,
    academicYear: academicYear
  })
    .populate('student')
    .populate('project', 'title description projectType status currentFacultyIndex')
    .populate('group')
    .sort({ allocatedAt: -1 });
};

module.exports = mongoose.model('FacultyPreference', facultyPreferenceSchema);
