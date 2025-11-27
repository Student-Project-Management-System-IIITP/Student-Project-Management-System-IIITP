const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  domain: {
    type: String,
    trim: true,
    maxlength: 100
  },
  projectType: {
    type: String,
    required: true,
    enum: ['minor1', 'minor2', 'minor3', 'major1', 'major2', 'internship1', 'internship2'],
    index: true
  },
  
  // Student Information
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    index: true
  },
  
  // Faculty Information
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    index: true
  },
  facultyPreferences: [{
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 10 // Support up to 10 faculty preferences
    }
  }],
  
  // Semester Information
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
  
  // Status Management
  status: {
    type: String,
    enum: ['registered', 'faculty_allocated', 'active', 'completed', 'cancelled'],
    default: 'registered',
    index: true
  },
  
  // Project Continuation
  isContinuation: {
    type: Boolean,
    default: false
  },
  previousProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Internship Specific
  isInternship: {
    type: Boolean,
    default: false
  },
  companyDetails: {
    name: String,
    location: String,
    duration: String,
    stipend: {
      type: Number,
      default: 0
    },
    supervisor: String,
    contactEmail: String
  },
  
  // Timeline
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  submissionDeadline: Date,
  nextMeeting: {
    scheduledAt: Date,
    location: {
      type: String,
      trim: true,
      maxlength: 200
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  meetingHistory: [{
    scheduledAt: Date,
    location: {
      type: String,
      trim: true,
      maxlength: 200
    },
    agenda: {
      type: String,
      trim: true,
      maxlength: 500
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Deliverables
  deliverables: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    deadline: Date,
    isRequired: {
      type: Boolean,
      default: true
    },
    submitted: {
      type: Boolean,
      default: false
    },
    submittedAt: Date,
    filePath: String,
    fileType: { 
      type: String, 
      enum: ['ppt', 'pdf', 'doc', 'video', 'other'],
      default: 'ppt'
    },
    fileSize: Number, // File size in bytes
    submissionNotes: String,
    // File metadata for upload tracking
    filename: String, // Saved filename
    originalName: String, // Original uploaded filename
    uploadVersion: {
      type: Number,
      default: 1
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadMetadata: {
      batchInfo: String,
      degreeProgram: String,
      semester: Number,
      projectType: String,
      storagePath: String
    },
    versionHistory: [{
      filename: String,
      originalName: String,
      filePath: String,
      fileSize: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      notes: String
    }],
    // Sem 4 specific fields
    presentationDate: Date,
    presentationVenue: String,
    presentationDuration: Number, // in minutes
    panelMembers: [String] // Names of panel members
  }],
  
  // Evaluation
  grade: String,
  feedback: String,
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  evaluatedAt: Date,
  
  // Allocation Information
  allocatedBy: {
    type: String,
    enum: ['faculty_choice', 'admin_allocation'],
    default: 'faculty_choice'
  },
  
  // Faculty Allocation Process (Sem 5+ only)
  currentFacultyIndex: {
    type: Number,
    default: 0,
    min: 0,
    max: 9, // 0-9 for up to 10 faculty preferences
    validate: {
      validator: function(value) {
        // Only validate for projects that support faculty allocation
        // This includes Sem 5+ projects and M.Tech Sem 1-4 projects
        const supportsAllocation = (this.semester >= 5 && 
          ['minor2', 'minor3', 'major1', 'major2', 'internship1'].includes(this.projectType)) ||
          (this.semester === 1 && this.projectType === 'minor1' && this.facultyPreferences && this.facultyPreferences.length > 0) ||
          ((this.semester === 3 || this.semester === 4) && ['major1', 'major2'].includes(this.projectType) && this.facultyPreferences && this.facultyPreferences.length > 0);
        return !supportsAllocation || (value >= 0 && value <= 9);
      },
      message: 'Current faculty index must be between 0 and 9 for projects that support faculty allocation'
    }
  },
  allocationHistory: [{
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty'
    },
    priority: {
      type: Number,
      min: 1,
      max: 5
    },
    action: {
      type: String,
      enum: ['presented', 'passed', 'chosen'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    comments: {
      type: String,
      maxlength: 500
    }
  }],
  
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
projectSchema.index({ student: 1, semester: 1 });
projectSchema.index({ projectType: 1, semester: 1 });
projectSchema.index({ status: 1, semester: 1 });
projectSchema.index({ faculty: 1, status: 1 });
projectSchema.index({ academicYear: 1, semester: 1 });

// Pre-save middleware to update timestamps
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// Virtual for days until deadline
projectSchema.virtual('daysUntilDeadline').get(function() {
  if (this.submissionDeadline) {
    const now = new Date();
    const diffTime = this.submissionDeadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// Method to check if project is overdue
projectSchema.methods.isOverdue = function() {
  if (this.submissionDeadline) {
    return new Date() > this.submissionDeadline && this.status !== 'completed';
  }
  return false;
};

// Method to get project summary
projectSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    projectType: this.projectType,
    semester: this.semester,
    status: this.status,
    isInternship: this.isInternship,
    isContinuation: this.isContinuation,
    daysUntilDeadline: this.daysUntilDeadline,
    isOverdue: this.isOverdue()
  };
};

// Static method to get projects by semester
projectSchema.statics.getBySemester = function(semester, academicYear) {
  return this.find({ semester, academicYear }).populate('student faculty group');
};

// Static method to get projects by type
projectSchema.statics.getByType = function(projectType, semester) {
  return this.find({ projectType, semester }).populate('student faculty group');
};

// Sem 4 specific method: Submit PPT
projectSchema.methods.submitPPT = async function(pptData) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const pptDeliverable = this.deliverables.find(d => d.name.toLowerCase().includes('ppt'));
  
  // Delete old file if it exists (when replacing)
  if (pptDeliverable && pptDeliverable.filePath) {
    try {
      const oldFilePath = pptDeliverable.filePath;
      // Check if file exists before attempting to delete
      await fs.access(oldFilePath);
      await fs.unlink(oldFilePath);
      console.log(`Deleted old PPT file: ${oldFilePath}`);
    } catch (error) {
      // File doesn't exist or couldn't be deleted, log but continue
      console.log('Could not delete old PPT file:', error.message);
    }
  }
  
  // Prepare comprehensive metadata
  const now = new Date();
  const metadata = {
    ...pptData,
    submitted: true,
    submittedAt: now,
    uploadVersion: 1
  };
  
  // Add version history entry (metadata only, not the actual file)
  if (pptDeliverable) {
    // Track previous upload metadata
    const previousVersion = {
      filename: pptDeliverable.filename,
      originalName: pptDeliverable.originalName,
      fileSize: pptDeliverable.fileSize,
      uploadedAt: pptDeliverable.submittedAt,
      notes: 'Replaced version (file deleted)'
    };
    
    pptDeliverable.versionHistory = pptDeliverable.versionHistory || [];
    pptDeliverable.versionHistory.push(previousVersion);
    pptDeliverable.uploadVersion = (pptDeliverable.uploadVersion || 0) + 1;
  }
  
  if (!pptDeliverable) {
    // Create PPT deliverable if it doesn't exist
    this.deliverables.push({
      name: 'Project Presentation (PPT)',
      description: 'PowerPoint presentation for project',
      fileType: 'ppt',
      isRequired: true,
      ...metadata
    });
  } else {
    Object.assign(pptDeliverable, metadata);
  }
  
  return this.save();
};

// Sem 4 specific method: Schedule presentation
projectSchema.methods.schedulePresentation = function(presentationData) {
  const presentationDeliverable = this.deliverables.find(d => d.name.toLowerCase().includes('presentation'));
  if (!presentationDeliverable) {
    this.deliverables.push({
      name: 'Project Presentation',
      description: 'Live presentation of the project',
      fileType: 'other',
      isRequired: true,
      ...presentationData
    });
  } else {
    Object.assign(presentationDeliverable, presentationData);
  }
  return this.save();
};

// Sem 4 specific method: Check if project is ready for presentation
projectSchema.methods.isReadyForPresentation = function() {
  const pptSubmitted = this.deliverables.some(d => 
    d.name.toLowerCase().includes('ppt') && d.submitted
  );
  const presentationScheduled = this.deliverables.some(d => 
    d.name.toLowerCase().includes('presentation') && d.presentationDate
  );
  return pptSubmitted && presentationScheduled;
};

// Sem 4 specific method: Get project status for Sem 4
projectSchema.methods.getSem4Status = function() {
  const pptDeliverable = this.deliverables.find(d => d.name.toLowerCase().includes('ppt'));
  const presentationDeliverable = this.deliverables.find(d => d.name.toLowerCase().includes('presentation'));
  
  return {
    pptSubmitted: pptDeliverable ? pptDeliverable.submitted : false,
    pptFilePath: pptDeliverable ? pptDeliverable.filePath : null,
    pptFileName: pptDeliverable ? pptDeliverable.filename : null,
    pptOriginalName: pptDeliverable ? pptDeliverable.originalName : null,
    pptFileSize: pptDeliverable ? pptDeliverable.fileSize : null,
    pptSubmittedAt: pptDeliverable ? pptDeliverable.submittedAt : null,
    pptSubmissionNotes: pptDeliverable ? pptDeliverable.submissionNotes : null,
    presentationScheduled: presentationDeliverable ? !!presentationDeliverable.presentationDate : false,
    isReadyForPresentation: this.isReadyForPresentation(),
    pptDeadline: pptDeliverable ? pptDeliverable.deadline : null,
    presentationDate: presentationDeliverable ? presentationDeliverable.presentationDate : null,
    status: this.status
  };
};

// Sem 6 specific method: Get project continuation status
projectSchema.methods.getContinuationStatus = function() {
  return {
    isContinuation: this.isContinuation,
    previousProject: this.previousProject,
    continuationLevel: this.isContinuation ? this.getContinuationLevel() : 0,
    canContinue: this.canBeContinued(),
    continuationHistory: this.getContinuationHistory()
  };
};

// Sem 6 specific method: Get continuation level
projectSchema.methods.getContinuationLevel = function() {
  if (!this.isContinuation) return 0;
  
  // Count how many projects this project has continued from
  let level = 1;
  let currentProject = this.previousProject;
  
  while (currentProject) {
    const prevProject = this.constructor.findById(currentProject);
    if (prevProject && prevProject.isContinuation) {
      level++;
      currentProject = prevProject.previousProject;
    } else {
      break;
    }
  }
  
  return level;
};

// Sem 6 specific method: Check if project can be continued
projectSchema.methods.canBeContinued = function() {
  return this.status === 'completed' && 
         this.grade && 
         this.grade !== 'Fail' && 
         this.grade !== 'F';
};

// Sem 6 specific method: Get continuation history
projectSchema.methods.getContinuationHistory = function() {
  const history = [];
  let currentProject = this.previousProject;
  
  while (currentProject) {
    history.unshift({
      projectId: currentProject,
      level: history.length + 1
    });
    // This would need to be populated in actual implementation
    currentProject = null; // Simplified for now
  }
  
  return history;
};

// Sem 6 specific method: Create continuation project
projectSchema.methods.createContinuation = async function(continuationData) {
  if (!this.canBeContinued()) {
    throw new Error('Project cannot be continued');
  }
  
  const continuationProject = new this.constructor({
    ...continuationData,
    isContinuation: true,
    previousProject: this._id,
    student: this.student,
    group: this.group,
    faculty: this.faculty
  });
  
  return await continuationProject.save();
};

// Sem 6 specific method: Get project milestones
projectSchema.methods.getMilestones = function() {
  return this.deliverables.map(deliverable => ({
    id: deliverable._id,
    name: deliverable.name,
    description: deliverable.description,
    deadline: deliverable.deadline,
    isRequired: deliverable.isRequired,
    submitted: deliverable.submitted,
    submittedAt: deliverable.submittedAt,
    status: deliverable.submitted ? 'completed' : 'pending'
  }));
};

// Sem 6 specific method: Update milestone
projectSchema.methods.updateMilestone = function(milestoneId, updates) {
  const milestone = this.deliverables.id(milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }
  
  Object.assign(milestone, updates);
  return this.save();
};

// Sem 6 specific method: Get project progress
projectSchema.methods.getProgress = function() {
  const totalMilestones = this.deliverables.length;
  const completedMilestones = this.deliverables.filter(d => d.submitted).length;
  
  return {
    totalMilestones,
    completedMilestones,
    progressPercentage: totalMilestones > 0 ? (completedMilestones / totalMilestones * 100).toFixed(2) : 0,
    status: this.status,
    isOnTrack: this.isOnTrack(),
    daysRemaining: this.getDaysRemaining()
  };
};

// Sem 6 specific method: Check if project is on track
projectSchema.methods.isOnTrack = function() {
  if (!this.submissionDeadline) return true;
  
  const now = new Date();
  const deadline = new Date(this.submissionDeadline);
  const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  
  const progress = this.getProgress();
  const expectedProgress = Math.max(0, 100 - (daysRemaining / 30 * 100)); // Assuming 30 days total
  
  return parseFloat(progress.progressPercentage) >= expectedProgress;
};

// Sem 6 specific method: Get days remaining
projectSchema.methods.getDaysRemaining = function() {
  if (!this.submissionDeadline) return null;
  
  const now = new Date();
  const deadline = new Date(this.submissionDeadline);
  const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysRemaining);
};

// Sem 7 specific method: Get major project status
projectSchema.methods.getMajorProjectStatus = function() {
  const isMajorProject = ['major1', 'major2'].includes(this.projectType);
  const isInternship = this.isInternship;
  
  return {
    isMajorProject,
    isInternship,
    projectType: this.projectType,
    status: this.status,
    progress: this.getProgress(),
    milestones: this.getMilestones(),
    continuationStatus: this.getContinuationStatus(),
    isOnTrack: this.isOnTrack(),
    daysRemaining: this.getDaysRemaining(),
    deliverables: this.deliverables.length,
    completedDeliverables: this.deliverables.filter(d => d.submitted).length
  };
};

// Sem 7 specific method: Get project analytics
projectSchema.methods.getProjectAnalytics = function() {
  const progress = this.getProgress();
  const milestones = this.getMilestones();
  const now = new Date();
  
  // Calculate time-based analytics
  const startDate = this.startDate || this.createdAt;
  const endDate = this.submissionDeadline || this.endDate;
  const totalDuration = endDate ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : null;
  const elapsedDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
  
  // Calculate milestone analytics
  const completedMilestones = milestones.filter(m => m.status === 'completed');
  const overdueMilestones = milestones.filter(m => 
    !m.submitted && m.deadline && new Date(m.deadline) < now
  );
  
  // Calculate performance metrics
  const performanceScore = this.calculatePerformanceScore();
  
  return {
    progress: progress.progressPercentage,
    totalMilestones: milestones.length,
    completedMilestones: completedMilestones.length,
    overdueMilestones: overdueMilestones.length,
    totalDuration: totalDuration,
    elapsedDays: elapsedDays,
    remainingDays: this.getDaysRemaining(),
    performanceScore,
    isOnTrack: this.isOnTrack(),
    riskLevel: this.getRiskLevel(),
    recommendations: this.getRecommendations()
  };
};

// Sem 7 specific method: Calculate performance score
projectSchema.methods.calculatePerformanceScore = function() {
  const progress = this.getProgress();
  const isOnTrack = this.isOnTrack();
  const daysRemaining = this.getDaysRemaining();
  
  let score = 0;
  
  // Progress score (40%)
  score += parseFloat(progress.progressPercentage) * 0.4;
  
  // On-track score (30%)
  score += isOnTrack ? 30 : 0;
  
  // Time management score (30%)
  if (daysRemaining !== null) {
    const timeScore = Math.max(0, 30 - (daysRemaining / 30 * 30));
    score += timeScore;
  } else {
    score += 30; // No deadline set
  }
  
  return Math.min(100, Math.max(0, score));
};

// Sem 7 specific method: Get risk level
projectSchema.methods.getRiskLevel = function() {
  const progress = parseFloat(this.getProgress().progressPercentage);
  const isOnTrack = this.isOnTrack();
  const daysRemaining = this.getDaysRemaining();
  
  if (progress < 30 && daysRemaining < 7) return 'high';
  if (progress < 50 && daysRemaining < 14) return 'medium';
  if (!isOnTrack) return 'medium';
  return 'low';
};

// Sem 7 specific method: Get recommendations
projectSchema.methods.getRecommendations = function() {
  const recommendations = [];
  const progress = this.getProgress();
  const isOnTrack = this.isOnTrack();
  const daysRemaining = this.getDaysRemaining();
  
  if (progress.progressPercentage < 25) {
    recommendations.push('Consider increasing work pace to meet deadlines');
  }
  
  if (!isOnTrack) {
    recommendations.push('Project is behind schedule - review timeline');
  }
  
  if (daysRemaining < 7 && progress.progressPercentage < 80) {
    recommendations.push('Urgent: Focus on critical deliverables');
  }
  
  const overdueMilestones = this.deliverables.filter(d => 
    !d.submitted && d.deadline && new Date(d.deadline) < new Date()
  );
  
  if (overdueMilestones.length > 0) {
    recommendations.push(`${overdueMilestones.length} milestone(s) overdue`);
  }
  
  return recommendations;
};

// Sem 7 specific method: Get project timeline
projectSchema.methods.getProjectTimeline = function() {
  const milestones = this.getMilestones();
  const startDate = this.startDate || this.createdAt;
  const endDate = this.submissionDeadline || this.endDate;
  
  return {
    startDate,
    endDate,
    totalDuration: endDate ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : null,
    milestones: milestones.map(milestone => ({
      name: milestone.name,
      deadline: milestone.deadline,
      status: milestone.status,
      isOverdue: milestone.deadline && new Date(milestone.deadline) < new Date() && !milestone.submitted
    }))
  };
};

// Sem 8 specific method: Get final project status
projectSchema.methods.getFinalProjectStatus = function() {
  const isFinalProject = this.projectType === 'major2';
  const isCompleted = this.status === 'completed';
  const hasGrade = !!this.grade && this.grade !== 'Fail' && this.grade !== 'F';
  
  return {
    isFinalProject,
    isCompleted,
    hasGrade,
    isGraduationReady: isFinalProject && isCompleted && hasGrade,
    projectType: this.projectType,
    status: this.status,
    grade: this.grade,
    completionDate: this.evaluatedAt,
    graduationEligible: isFinalProject && isCompleted && hasGrade
  };
};

// Sem 8 specific method: Get comprehensive project summary
projectSchema.methods.getComprehensiveSummary = function() {
  const analytics = this.getProjectAnalytics();
  const timeline = this.getProjectTimeline();
  const finalStatus = this.getFinalProjectStatus();
  const continuationStatus = this.getContinuationStatus();
  
  return {
    basicInfo: {
      id: this._id,
      title: this.title,
      description: this.description,
      projectType: this.projectType,
      semester: this.semester,
      academicYear: this.academicYear,
      status: this.status
    },
    analytics,
    timeline,
    finalStatus,
    continuationStatus,
    deliverables: {
      total: this.deliverables.length,
      completed: this.deliverables.filter(d => d.submitted).length,
      pending: this.deliverables.filter(d => !d.submitted).length,
      overdue: this.deliverables.filter(d => 
        !d.submitted && d.deadline && new Date(d.deadline) < new Date()
      ).length
    },
    evaluation: {
      grade: this.grade,
      feedback: this.feedback,
      evaluatedBy: this.evaluatedBy,
      evaluatedAt: this.evaluatedAt
    }
  };
};

// Sem 8 specific method: Calculate project completion score
projectSchema.methods.calculateCompletionScore = function() {
  const analytics = this.getProjectAnalytics();
  const deliverables = this.deliverables;
  
  let score = 0;
  let maxScore = 100;
  
  // Progress score (40%)
  score += parseFloat(analytics.progress) * 0.4;
  
  // Deliverable completion score (30%)
  const completedDeliverables = deliverables.filter(d => d.submitted).length;
  const deliverableScore = deliverables.length > 0 ? 
    (completedDeliverables / deliverables.length) * 30 : 0;
  score += deliverableScore;
  
  // Quality score based on grade (20%)
  if (this.grade) {
    const gradeScore = this.getGradeScore(this.grade) * 20;
    score += gradeScore;
  } else {
    score += 10; // Partial score if not graded yet
  }
  
  // Timeliness score (10%)
  const timelinessScore = analytics.isOnTrack ? 10 : 5;
  score += timelinessScore;
  
  return Math.min(100, Math.max(0, score));
};

// Sem 8 specific method: Get grade score
projectSchema.methods.getGradeScore = function(grade) {
  const gradeScores = {
    'A+': 1.0, 'A': 0.9, 'A-': 0.85,
    'B+': 0.8, 'B': 0.7, 'B-': 0.65,
    'C+': 0.6, 'C': 0.5, 'C-': 0.45,
    'D': 0.3, 'F': 0.0, 'Fail': 0.0
  };
  
  return gradeScores[grade] || 0.5;
};

// Sem 8 specific method: Get project achievements
projectSchema.methods.getProjectAchievements = function() {
  const achievements = [];
  const analytics = this.getProjectAnalytics();
  const completionScore = this.calculateCompletionScore();
  
  if (completionScore >= 90) {
    achievements.push('Excellent Project Completion');
  }
  
  if (analytics.isOnTrack && completionScore >= 80) {
    achievements.push('On-Track Project Management');
  }
  
  if (this.deliverables.filter(d => d.submitted).length === this.deliverables.length) {
    achievements.push('Complete Deliverable Submission');
  }
  
  if (this.grade && ['A+', 'A', 'A-'].includes(this.grade)) {
    achievements.push('High Grade Achievement');
  }
  
  if (this.projectType === 'major2') {
    achievements.push('Final Year Project Completion');
  }
  
  if (this.isContinuation) {
    achievements.push('Project Continuation Success');
  }
  
  return achievements;
};

// Faculty Allocation Methods (Sem 5+ and M.Tech Sem 1)
// Check if project supports faculty allocation
projectSchema.methods.supportsFacultyAllocation = function() {
  // Standard case: Sem 5+ projects with specific types
  if (this.semester >= 5 && 
      ['minor2', 'minor3', 'major1', 'major2', 'internship1'].includes(this.projectType)) {
    return true;
  }
  
  // Special case: M.Tech Sem 1 minor1 (has facultyPreferences array with items)
  // This is identified by: semester === 1, projectType === 'minor1', and has facultyPreferences
  // B.Tech Sem 4 minor1 doesn't have facultyPreferences, so it won't match
  if (this.semester === 1 && 
      this.projectType === 'minor1' && 
      this.facultyPreferences && 
      Array.isArray(this.facultyPreferences) && 
      this.facultyPreferences.length > 0) {
    return true;
  }
  
  // M.Tech Sem 3 major1 and Sem 4 major2 (semester 3-4)
  if ((this.semester === 3 || this.semester === 4) && 
      ['major1', 'major2'].includes(this.projectType) &&
      this.facultyPreferences && 
      Array.isArray(this.facultyPreferences) && 
      this.facultyPreferences.length > 0) {
    return true;
  }
  
  return false;
};

// Get current faculty being presented to
projectSchema.methods.getCurrentFaculty = function() {
  if (!this.supportsFacultyAllocation() || !this.facultyPreferences || this.facultyPreferences.length === 0) {
    return null;
  }
  
  const currentIndex = this.currentFacultyIndex || 0;
  return this.facultyPreferences[currentIndex] || null;
};

// Check if all faculty have been presented to
projectSchema.methods.allFacultyPresented = function() {
  if (!this.supportsFacultyAllocation()) {
    return true; // Sem 4 projects don't need faculty allocation
  }
  
  return this.currentFacultyIndex >= (this.facultyPreferences?.length || 0);
};

// Present project to current faculty
projectSchema.methods.presentToCurrentFaculty = function() {
  if (!this.supportsFacultyAllocation()) {
    throw new Error('This project does not support faculty allocation');
  }
  
  const currentFaculty = this.getCurrentFaculty();
  if (!currentFaculty) {
    throw new Error('No more faculty to present to');
  }
  
  // Add to allocation history
  this.allocationHistory.push({
    faculty: currentFaculty.faculty,
    priority: currentFaculty.priority,
    action: 'presented',
    timestamp: new Date()
  });
  
  return this.save();
};

// Faculty chooses the project
projectSchema.methods.facultyChoose = function(facultyId, comments = '') {
  if (!this.supportsFacultyAllocation()) {
    throw new Error('This project does not support faculty allocation');
  }
  
  const currentFaculty = this.getCurrentFaculty();
  if (!currentFaculty || currentFaculty.faculty.toString() !== facultyId.toString()) {
    throw new Error('Invalid faculty choice');
  }
  
  // Update project with allocated faculty
  this.faculty = facultyId;
  this.status = 'faculty_allocated';
  this.allocatedBy = 'faculty_choice';
  
  // Add to allocation history
  this.allocationHistory.push({
    faculty: facultyId,
    priority: currentFaculty.priority,
    action: 'chosen',
    timestamp: new Date(),
    comments: comments
  });
  
  return this.save();
};

// Faculty passes the project
projectSchema.methods.facultyPass = function(facultyId, comments = '') {
  if (!this.supportsFacultyAllocation()) {
    throw new Error('This project does not support faculty allocation');
  }
  
  const currentFaculty = this.getCurrentFaculty();
  if (!currentFaculty || currentFaculty.faculty.toString() !== facultyId.toString()) {
    throw new Error('Invalid faculty pass');
  }
  
  // Add to allocation history
  this.allocationHistory.push({
    faculty: facultyId,
    priority: currentFaculty.priority,
    action: 'passed',
    timestamp: new Date(),
    comments: comments
  });
  
  // Move to next faculty
  this.currentFacultyIndex = (this.currentFacultyIndex || 0) + 1;
  
  return this.save();
};

// Check if project is ready for admin allocation
projectSchema.methods.isReadyForAdminAllocation = function() {
  if (!this.supportsFacultyAllocation()) {
    return false;
  }
  
  return this.allocationHistory.length > 0 && 
         this.allocationHistory.every(entry => entry.action === 'passed') &&
         this.allFacultyPresented();
};

// Get allocation status summary
projectSchema.methods.getAllocationStatus = function() {
  if (!this.supportsFacultyAllocation()) {
    return {
      supportsAllocation: false,
      status: 'not_applicable',
      message: 'This project does not support faculty allocation'
    };
  }
  
  if (this.faculty) {
    return {
      supportsAllocation: true,
      status: 'allocated',
      allocatedFaculty: this.faculty,
      allocatedBy: this.allocatedBy,
      message: 'Project has been allocated to faculty'
    };
  }
  
  if (this.allFacultyPresented()) {
    return {
      supportsAllocation: true,
      status: 'all_faculty_passed',
      message: 'All faculty have passed - ready for admin allocation',
      currentFacultyIndex: this.currentFacultyIndex,
      totalFaculty: this.facultyPreferences?.length || 0
    };
  }
  
  const currentFaculty = this.getCurrentFaculty();
  return {
    supportsAllocation: true,
    status: 'pending',
    currentFaculty: currentFaculty,
    currentFacultyIndex: this.currentFacultyIndex,
    totalFaculty: this.facultyPreferences?.length || 0,
    message: `Presented to faculty ${(this.currentFacultyIndex || 0) + 1} of ${this.facultyPreferences?.length || 0}`
  };
};

// Sem 8 specific method: Get project recommendations for future
projectSchema.methods.getFutureRecommendations = function() {
  const recommendations = [];
  const analytics = this.getProjectAnalytics();
  const completionScore = this.calculateCompletionScore();
  
  if (completionScore >= 90) {
    recommendations.push('Consider pursuing advanced research in this domain');
    recommendations.push('This project demonstrates strong technical skills');
  }
  
  if (analytics.performanceScore >= 85) {
    recommendations.push('Excellent project management skills demonstrated');
  }
  
  if (this.projectType === 'major1' && this.grade && ['A+', 'A', 'A-'].includes(this.grade)) {
    recommendations.push('Consider continuing this project for Major Project 2');
  }
  
  if (this.deliverables.length >= 4) {
    recommendations.push('Strong deliverable management capabilities');
  }
  
  return recommendations;
};

// New methods for systematic file upload tracking and retrieval

// Instance method: Get all uploads for this specific project
projectSchema.methods.getAllUploads = function() {
  return this.deliverables
    .filter(d => d.submitted && d.filePath)
    .map(deliverable => ({
      id: deliverable._id,
      name: deliverable.name,
      type: deliverable.fileType,
      size: deliverable.fileSize,
      originalFilename: deliverable.originalName,
      savedFilename: deliverable.filename,
      filePath: deliverable.filePath,
      uploadedAt: deliverable.submittedAt,
      submittedBy: deliverable.uploadedBy,
      version: deliverable.uploadVersion || 1,
      notes: deliverable.submissionNotes,
      metadata: deliverable.uploadMetadata,
      versionHistory: deliverable.versionHistory
    }));
};

// Instance method: Get uploads by file type
projectSchema.methods.getUploadsByType = function(fileType) {
  return this.deliverables
    .filter(d => d.submitted && d.fileType === fileType)
    .map(deliverable => ({
      id: deliverable._id,
      name: deliverable.name,
      type: deliverable.fileType,
      size: deliverable.fileSize,
      originalFilename: deliverable.originalName,
      savedFilename: deliverable.filename,
      filePath: deliverable.filePath,
      uploadedAt: deliverable.submittedAt,
      submittedBy: deliverable.uploadedBy,
      version: deliverable.uploadVersion || 1,
      notes: deliverable.submissionNotes,
      metadata: deliverable.uploadMetadata
    }));
};

// Static method: Get uploads by student
projectSchema.statics.getUploadsByStudent = function(studentId) {
  return this.find({ student: studentId })
    .populate('student', 'fullName misNumber')
    .then(projects => {
      const allUploads = [];
      projects.forEach(project => {
        const projectUploads = project.deliverables
          .filter(d => d.submitted && d.filePath)
          .map(deliverable => ({
            projectId: project._id,
            projectTitle: project.title,
            projectType: project.projectType,
            semester: project.semester,
            academicYear: project.academicYear,
            id: deliverable._id,
            name: deliverable.name,
            type: deliverable.fileType,
            size: deliverable.fileSize,
            originalFilename: deliverable.originalName,
            savedFilename: deliverable.filename,
            filePath: deliverable.filePath,
            uploadedAt: deliverable.submittedAt,
            submittedBy: deliverable.uploadedBy,
            version: deliverable.uploadVersion || 1,
            notes: deliverable.submissionNotes,
            metadata: deliverable.uploadMetadata
          }));
        allUploads.push(...projectUploads);
      });
      return allUploads;
    });
};

// Static method: Get uploads by academic organization filters
projectSchema.statics.getUploadsByFilters = function(filters = {}) {
  const query = {};
  
  if (filters.semester) query.semester = filters.semester;
  if (filters.projectType) query.projectType = filters.projectType;
  if (filters.academicYear) query.academicYear = filters.academicYear;
  if (filters.degree) query['student.degree'] = filters.degree;
  
  return this.find(query)
    .populate('student', 'fullName misNumber degree semester academicYear')
    .then(projects => {
      const allUploads = [];
      const fileTypeFilter = filters.fileType;
      const submittedOnly = filters.submittedOnly !== false; // Default to true
      
      projects.forEach(project => {
        let projectUploads = project.deliverables;
        
        if (submittedOnly) {
          projectUploads = projectUploads.filter(d => d.submitted && d.filePath);
        }
        
        if (fileTypeFilter) {
          projectUploads = projectUploads.filter(d => d.fileType === fileTypeFilter);
        }
        
        const formattedUploads = projectUploads.map(deliverable => ({
          projectId: project._id,
          projectTitle: project.title,
          projectType: project.projectType,
          semester: project.semester,
          academicYear: project.academicYear,
          student: {
            id: project.student._id,
            name: project.student.fullName,
            mis: project.student.misNumber,
            degree: project.student.degree
          },
          id: deliverable._id,
          name: deliverable.name,
          type: deliverable.fileType,
          size: deliverable.fileSize,
          originalFilename: deliverable.originalName,
          savedFilename: deliverable.filename,
          filePath: deliverable.filePath,
          uploadedAt: deliverable.submittedAt,
          submittedBy: deliverable.uploadedBy,
          version: deliverable.uploadVersion || 1,
          notes: deliverable.submissionNotes,
          metadata: deliverable.uploadMetadata
        }));
        
        allUploads.push(...formattedUploads);
      });
      return allUploads;
    });
};

module.exports = mongoose.model('Project', projectSchema);
