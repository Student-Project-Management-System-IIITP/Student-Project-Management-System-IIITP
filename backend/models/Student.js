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
  
  // Current semester projects
  currentProjects: [{
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'member', 'solo'],
      default: 'solo'
    },
    semester: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Current group
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  
  // Group memberships
  groupMemberships: [{
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'member'],
      default: 'member'
    },
    semester: {
      type: Number,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Student invitations tracking
  invites: [{
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'member'],
      required: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'auto-rejected'],
      default: 'pending'
    }
  }],
  
  // Enhanced Internship Information
  internshipHistory: [{
    type: {
      type: String,
      enum: ['summer', 'winter', '6month'],
      required: true
    },
    company: {
      type: String,
      required: true
    },
    position: String,
    location: String,
    startDate: Date,
    endDate: Date,
    duration: String,
    stipend: {
      type: Number,
      default: 0
    },
    supervisor: String,
    contactEmail: String,
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'cancelled'],
      default: 'ongoing'
    },
    semester: {
      type: Number,
      required: true
    },
    academicYear: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Semester-specific status
  semesterStatus: {
    canFormGroups: {
      type: Boolean,
      default: false
    },
    canJoinProjects: {
      type: Boolean,
      default: true
    },
    canApplyInternships: {
      type: Boolean,
      default: false
    },
    hasCompletedPreviousProject: {
      type: Boolean,
      default: false
    },
    isDoingInternship: {
      type: Boolean,
      default: false
    },
    internshipSemester: Number,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Student Status
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
studentSchema.index({ degree: 1 });
studentSchema.index({ 'currentProjects.project': 1 });
studentSchema.index({ 'groupMemberships.group': 1 });
studentSchema.index({ 'groupMemberships.semester': 1 });
studentSchema.index({ 'internshipHistory.semester': 1 });
studentSchema.index({ 'semesterStatus.isDoingInternship': 1 });
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
  return this.internshipHistory.filter(internship => 
    internship.status === 'completed'
  );
};

// Method to add current project
studentSchema.methods.addCurrentProject = function(projectId, role = 'solo', semester) {
  // Check if project is already added
  const existingProject = this.currentProjects.find(cp => 
    cp.project.toString() === projectId.toString()
  );
  
  if (existingProject) {
    throw new Error('Project is already in current projects');
  }
  
  this.currentProjects.push({
    project: projectId,
    role: role,
    semester: semester || this.semester,
    status: 'active',
    joinedAt: new Date()
  });
  
  return this.save();
};

// Method to complete current project
studentSchema.methods.completeCurrentProject = function(projectId) {
  const project = this.currentProjects.find(cp => 
    cp.project.toString() === projectId.toString()
  );
  
  if (!project) {
    throw new Error('Project not found in current projects');
  }
  
  project.status = 'completed';
  
  // Update semester status
  this.semesterStatus.hasCompletedPreviousProject = true;
  this.semesterStatus.lastUpdated = new Date();
  
  return this.save();
};

// Method to add group membership
studentSchema.methods.addGroupMembership = function(groupId, role = 'member', semester) {
  // Check if already a member
  const existingMembership = this.groupMemberships.find(gm => 
    gm.group.toString() === groupId.toString() && gm.isActive
  );
  
  if (existingMembership) {
    throw new Error('Student is already a member of this group');
  }
  
  this.groupMemberships.push({
    group: groupId,
    role: role,
    semester: semester || this.semester,
    isActive: true,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Enhanced method: Atomic group membership with session support  
studentSchema.methods.addGroupMembershipAtomic = async function(groupId, role = 'member', semester, session = null) {
  try {
    // Check if already a member
    const existingMembership = this.groupMemberships.find(gm => 
      gm.group.toString() === groupId.toString() && gm.isActive
    );
    
    if (existingMembership) {
      throw new Error('Student is already a member of this group');
    }

    // Check if student is already in another group for this semester
    const semesterGroups = this.groupMemberships.filter(gm => 
      gm.semester === (semester || this.semester) && gm.isActive
    );
    
    if (semesterGroups.length > 0) {
      throw new Error('Student is already in another group for this semester');
    }
    
    this.groupMemberships.push({
      group: groupId,
      role: role,
      semester: semester || this.semester,
      isActive: true,
      joinedAt: new Date()
    });
    
    // Update groupId reference
    this.groupId = groupId;
    
    await this.save({ session });
    return true;
  } catch (error) {
    console.error('Add group membership atomic error:', error.message);
    throw error;
  }
};

// Enhanced method: Atomic cleanup when joining new group
studentSchema.methods.cleanupInvitesAtomic = async function(acceptedGroupId, session = null) {
  try {
    // Convert all pending invites to auto-rejected
    const invitesToUpdate = this.invites.filter(invite => 
      invite.status === 'pending' || invite.status === 'pending'
    );

    for (const invite of invitesToUpdate) {
      if (invite.group.toString() !== acceptedGroupId.toString()) {
        invite.status = 'auto-rejected';
      }
    }

    await this.save({ session });
    return invitesToUpdate.length;
  } catch (error) {
    console.error('Cleanup invites atomic error:', error.message);
    throw error;
  }
};

// Advanced feature: Atomically leave current group  
studentSchema.methods.leaveGroupAtomic = async function(groupId, session = null) {
  try {
    // Find the active group membership
    const membership = this.groupMemberships.find(gm => 
      gm.group.toString() === groupId.toString() && 
      gm.isActive && 
      gm.semester === this.semester
    );

    if (!membership) {
      throw new Error('Student is not a member of this group or group is inactive');
    }

    // Verify not trying to leave in a locked semester state
    const currentSemesterStatus = this.semesterStatus.find(s => s.semester === this.semester);
    if (currentSemesterStatus && currentSemesterStatus.phases?.inProgress?.includes('projectSubmission')) {
      throw new Error('Cannot leave group during project submission phase');
    }

    membership.isActive = false;
    this.groupId = null;

    await this.save({ session });
    return true;
  } catch (error) {
    console.error('Leave group atomic error:', error.message);
    throw error;
  }
};

// Advanced feature: Update group role atomically
studentSchema.methods.updateGroupRoleAtomic = async function(groupId, newRole, session = null) {
  try {
    const membership = this.groupMemberships.find(gm => 
      gm.group.toString() === groupId.toString() && 
      gm.isActive && 
      gm.semester === this.semester
    );

    if (!membership) {
      throw new Error('Student is not an active member of this group');
    }

    membership.role = newRole;

    await this.save({ session });
    return true;
  } catch (error) {
    console.error('Update group role atomic error:', error.message);
    throw error;
  }
};

// Method to leave group
studentSchema.methods.leaveGroup = function(groupId) {
  const membership = this.groupMemberships.find(gm => 
    gm.group.toString() === groupId.toString() && gm.isActive
  );
  
  if (!membership) {
    throw new Error('Student is not a member of this group');
  }
  
  membership.isActive = false;
  return this.save();
};

// Method to add internship
studentSchema.methods.addInternship = function(internshipData) {
  this.internshipHistory.push({
    ...internshipData,
    semester: internshipData.semester || this.semester,
    createdAt: new Date()
  });
  
  // Update semester status if it's a 6-month internship
  if (internshipData.type === '6month') {
    this.semesterStatus.isDoingInternship = true;
    this.semesterStatus.internshipSemester = internshipData.semester || this.semester;
    this.semesterStatus.lastUpdated = new Date();
  }
  
  return this.save();
};

// Method to complete internship
studentSchema.methods.completeInternship = function(internshipId) {
  const internship = this.internshipHistory.find(ih => 
    ih._id.toString() === internshipId.toString()
  );
  
  if (!internship) {
    throw new Error('Internship not found');
  }
  
  internship.status = 'completed';
  internship.endDate = new Date();
  
  // Update semester status if it was a 6-month internship
  if (internship.type === '6month') {
    this.semesterStatus.isDoingInternship = false;
    this.semesterStatus.lastUpdated = new Date();
  }
  
  return this.save();
};

// Method to update semester status
studentSchema.methods.updateSemesterStatus = function(statusUpdates) {
  this.semesterStatus = {
    ...this.semesterStatus,
    ...statusUpdates,
    lastUpdated: new Date()
  };
  
  return this.save();
};

// Method to get current semester projects
studentSchema.methods.getCurrentSemesterProjects = function(semester = this.semester) {
  return this.currentProjects.filter(cp => 
    cp.semester === semester && cp.status === 'active'
  );
};

// Method to get active group memberships
studentSchema.methods.getActiveGroupMemberships = function(semester = this.semester) {
  return this.groupMemberships.filter(gm => 
    gm.semester === semester && gm.isActive
  );
};

// Method to check if student can form groups
studentSchema.methods.canFormGroups = function() {
  return this.semesterStatus.canFormGroups && !this.semesterStatus.isDoingInternship;
};

// Method to check if student can join projects
studentSchema.methods.canJoinProjects = function() {
  return this.semesterStatus.canJoinProjects && !this.semesterStatus.isDoingInternship;
};

// Method to check if student can apply for internships
studentSchema.methods.canApplyInternships = function() {
  return this.semesterStatus.canApplyInternships && !this.semesterStatus.isDoingInternship;
};

// Method to get student dashboard data
studentSchema.methods.getDashboardData = function() {
  return {
    id: this._id,
    fullName: this.fullName,
    degree: this.degree,
    semester: this.semester,
    branch: this.branch,
    year: this.year,
    semesterInfo: this.semesterInfo,
    semesterStatus: this.semesterStatus,
    currentProjects: this.getCurrentSemesterProjects(),
    activeGroups: this.getActiveGroupMemberships(),
    internshipHistory: this.getInternshipHistory(),
    canFormGroups: this.canFormGroups(),
    canJoinProjects: this.canJoinProjects(),
    canApplyInternships: this.canApplyInternships()
  };
};

// Sem 7 specific method: Check if student can choose internship
studentSchema.methods.canChooseInternship = function() {
  return this.semester === 7 && 
         this.semesterStatus.canApplyInternships && 
         !this.semesterStatus.isDoingInternship;
};

// Sem 7 specific method: Check if student can choose major project
studentSchema.methods.canChooseMajorProject = function() {
  return this.semester === 7 && 
         this.semesterStatus.canJoinProjects && 
         !this.semesterStatus.isDoingInternship;
};

// Sem 7 specific method: Get internship eligibility
studentSchema.methods.getInternshipEligibility = function() {
  // Check if student has completed minor projects (either in currentProjects or historically)
  const hasCompletedMinorProjects = this.semesterStatus.hasCompletedPreviousProject || 
    this.currentProjects.some(cp => 
      ['minor1', 'minor2', 'minor3'].includes(cp.projectType) && 
      cp.status === 'completed'
    );
  
  const hasGoodAcademicStanding = this.semesterStatus.hasCompletedPreviousProject;
  
  return {
    isEligible: hasCompletedMinorProjects && hasGoodAcademicStanding,
    hasCompletedMinorProjects,
    hasGoodAcademicStanding,
    canApply: this.canChooseInternship(),
    requirements: {
      minorProjects: 'Must have completed at least one minor project',
      academicStanding: 'Must have good academic standing',
      semester: 'Must be in semester 7'
    }
  };
};

// Sem 7 specific method: Get major project eligibility
studentSchema.methods.getMajorProjectEligibility = function() {
  // Check if student has completed minor projects (either in currentProjects or historically)
  const hasCompletedMinorProjects = this.semesterStatus.hasCompletedPreviousProject || 
    this.currentProjects.some(cp => 
      ['minor1', 'minor2', 'minor3'].includes(cp.projectType) && 
      cp.status === 'completed'
    );
  
  const canFormGroups = this.canFormGroups();
  
  return {
    isEligible: hasCompletedMinorProjects && canFormGroups,
    hasCompletedMinorProjects,
    canFormGroups,
    canApply: this.canChooseMajorProject(),
    requirements: {
      minorProjects: 'Must have completed at least one minor project',
      groupFormation: 'Must be able to form groups',
      semester: 'Must be in semester 7'
    }
  };
};

// Sem 7 specific method: Get current internship
studentSchema.methods.getCurrentInternship = function() {
  return this.internshipHistory.find(internship => 
    internship.status === 'ongoing' && 
    internship.type === '6month'
  );
};

// Sem 7 specific method: Get internship statistics
studentSchema.methods.getInternshipStatistics = function() {
  const internships = this.internshipHistory;
  const completed = internships.filter(i => i.status === 'completed');
  const ongoing = internships.filter(i => i.status === 'ongoing');
  
  return {
    total: internships.length,
    completed: completed.length,
    ongoing: ongoing.length,
    summer: internships.filter(i => i.type === 'summer').length,
    winter: internships.filter(i => i.type === 'winter').length,
    sixMonth: internships.filter(i => i.type === '6month').length,
    averageStipend: completed.length > 0 ? 
      completed.reduce((sum, i) => sum + (i.stipend || 0), 0) / completed.length : 0
  };
};

// Sem 8 specific method: Check graduation eligibility
studentSchema.methods.checkGraduationEligibility = function() {
  // Check if student has completed major projects (either in currentProjects or historically)
  const hasCompletedMajorProject = this.semesterStatus.hasCompletedPreviousProject || 
    this.currentProjects.some(cp => 
      ['major1', 'major2'].includes(cp.projectType) && 
      cp.status === 'completed'
    );
  
  const hasCompletedInternship = this.internshipHistory.some(i => 
    i.type === '6month' && i.status === 'completed'
  );
  
  const isFinalSemester = this.semester === 8;
  
  return {
    isEligible: isFinalSemester && (hasCompletedMajorProject || hasCompletedInternship),
    hasCompletedMajorProject,
    hasCompletedInternship,
    isFinalSemester,
    requirements: {
      semester: 'Must be in semester 8',
      majorProject: 'Must have completed Major Project 1 or 2',
      internship: 'Must have completed 6-month internship (if applicable)'
    }
  };
};

// Sem 8 specific method: Get final project portfolio
studentSchema.methods.getFinalProjectPortfolio = function() {
  // Include both current projects and historical completion status
  const allProjects = this.currentProjects.filter(cp => cp.status === 'completed');
  const hasHistoricalProjects = this.semesterStatus.hasCompletedPreviousProject;
  const internshipHistory = this.internshipHistory.filter(i => i.status === 'completed');
  
  // Estimate project counts based on semester progression
  let estimatedMinorProjects = 0;
  let estimatedMajorProjects = 0;
  
  if (this.semester >= 4) estimatedMinorProjects++;
  if (this.semester >= 5) estimatedMinorProjects++;
  if (this.semester >= 6) estimatedMinorProjects++;
  if (this.semester >= 7) estimatedMajorProjects++;
  if (this.semester >= 8) estimatedMajorProjects++;
  
  const totalProjects = Math.max(allProjects.length, estimatedMinorProjects + estimatedMajorProjects);
  
  return {
    totalProjects,
    minorProjects: Math.max(allProjects.filter(p => ['minor1', 'minor2', 'minor3'].includes(p.projectType)).length, estimatedMinorProjects),
    majorProjects: Math.max(allProjects.filter(p => ['major1', 'major2'].includes(p.projectType)).length, estimatedMajorProjects),
    completedInternships: internshipHistory.length,
    projectTypes: allProjects.map(p => p.projectType),
    semesterBreakdown: this.getSemesterBreakdown(),
    academicJourney: this.getAcademicJourney(),
    hasHistoricalProjects
  };
};

// Sem 8 specific method: Get semester breakdown
studentSchema.methods.getSemesterBreakdown = function() {
  const breakdown = {};
  
  // Initialize all semesters
  for (let i = 1; i <= 8; i++) {
    breakdown[`semester${i}`] = {
      semester: i,
      projects: [],
      internships: [],
      status: i > this.semester ? 'future' : i < this.semester ? 'completed' : 'current'
    };
  }
  
  // Add projects to their respective semesters
  this.currentProjects.forEach(cp => {
    const semKey = `semester${cp.semester}`;
    if (breakdown[semKey]) {
      breakdown[semKey].projects.push({
        projectType: cp.projectType,
        status: cp.status,
        role: cp.role
      });
    }
  });
  
  // Add internships to their respective semesters
  this.internshipHistory.forEach(internship => {
    const semKey = `semester${internship.semester}`;
    if (breakdown[semKey]) {
      breakdown[semKey].internships.push({
        type: internship.type,
        company: internship.company,
        status: internship.status
      });
    }
  });
  
  return breakdown;
};

// Sem 8 specific method: Get academic journey
studentSchema.methods.getAcademicJourney = function() {
  const journey = [];
  
  // Add semester progression
  for (let i = 1; i <= this.semester; i++) {
    const semesterProjects = this.currentProjects.filter(cp => cp.semester === i);
    const semesterInternships = this.internshipHistory.filter(internship => internship.semester === i);
    
    journey.push({
      semester: i,
      year: Math.ceil(i / 2),
      projects: semesterProjects.length,
      internships: semesterInternships.length,
      milestones: this.getSemesterMilestones(i)
    });
  }
  
  return journey;
};

// Sem 8 specific method: Get semester milestones
studentSchema.methods.getSemesterMilestones = function(semester) {
  const milestones = [];
  
  switch (semester) {
    case 4:
      milestones.push('Minor Project 1 - Solo Project');
      break;
    case 5:
      milestones.push('Minor Project 2 - Group Project with Faculty Allocation');
      break;
    case 6:
      milestones.push('Minor Project 3 - Project Continuation & Advanced Features');
      break;
    case 7:
      milestones.push('Major Project 1 OR 6-Month Internship');
      break;
    case 8:
      milestones.push('Major Project 2 - Final Project & Graduation');
      break;
  }
  
  return milestones;
};

// Sem 8 specific method: Get graduation summary
studentSchema.methods.getGraduationSummary = function() {
  const eligibility = this.checkGraduationEligibility();
  const portfolio = this.getFinalProjectPortfolio();
  
  return {
    student: {
      fullName: this.fullName,
      degree: this.degree,
      branch: this.branch,
      semester: this.semester,
      misNumber: this.misNumber
    },
    eligibility,
    portfolio,
    graduationStatus: eligibility.isEligible ? 'eligible' : 'not_eligible',
    completionDate: eligibility.isEligible ? new Date() : null,
    finalGPA: this.calculateFinalGPA(),
    achievements: this.getAchievements()
  };
};

// Sem 8 specific method: Calculate final GPA
studentSchema.methods.calculateFinalGPA = function() {
  // This would typically integrate with a grading system
  // For now, we'll return a placeholder
  const completedProjects = this.currentProjects.filter(cp => cp.status === 'completed');
  
  if (completedProjects.length === 0) return 0;
  
  // Simple GPA calculation based on project completion
  let totalScore = 0;
  completedProjects.forEach(cp => {
    // Assign scores based on project type
    switch (cp.projectType) {
      case 'minor1': totalScore += 8; break;
      case 'minor2': totalScore += 8; break;
      case 'minor3': totalScore += 8; break;
      case 'major1': totalScore += 10; break;
      case 'major2': totalScore += 10; break;
      default: totalScore += 6;
    }
  });
  
  return (totalScore / completedProjects.length).toFixed(2);
};

// Sem 8 specific method: Get achievements
studentSchema.methods.getAchievements = function() {
  const achievements = [];
  
  const portfolio = this.getFinalProjectPortfolio();
  
  if (portfolio.totalProjects >= 4) {
    achievements.push('Project Completion Expert');
  }
  
  if (portfolio.majorProjects >= 1) {
    achievements.push('Major Project Graduate');
  }
  
  if (portfolio.completedInternships >= 1) {
    achievements.push('Industry Experience');
  }
  
  if (this.semester === 8) {
    achievements.push('Final Year Student');
  }
  
  return achievements;
};

// M.Tech specific method: Get M.Tech semester options
studentSchema.methods.getMTechSemesterOptions = function() {
  if (this.degree !== 'M.Tech') {
    return { error: 'Student is not in M.Tech program' };
  }
  
  const options = {
    semester: this.semester,
    degree: this.degree,
    branch: this.branch,
    currentFaculty: null,
    canChooseInternship: false,
    canChooseCoursework: false,
    previousProject: null,
    canContinueProject: false
  };
  
  // Get current allocated faculty from previous semester
  const currentProjects = this.currentProjects.filter(cp => 
    cp.semester === this.semester - 1 && cp.status === 'completed'
  );
  
  if (currentProjects.length > 0) {
    options.currentFaculty = currentProjects[0].faculty;
    options.previousProject = currentProjects[0].project;
    options.canContinueProject = true;
  }
  
  // Semester-specific options
  switch (this.semester) {
    case 1:
      options.projectType = 'minor1';
      options.isIndividual = true;
      options.needsFacultyPreferences = true;
      options.needsFacultyAllocation = true;
      break;
      
    case 2:
      options.projectType = 'minor2';
      options.isIndividual = true;
      options.needsFacultyPreferences = false; // Same faculty as Sem 1
      options.needsFacultyAllocation = false;
      options.canChooseContinuation = true;
      break;
      
    case 3:
      options.canChooseInternship = true;
      options.canChooseCoursework = true;
      options.internshipType = '6month';
      options.courseworkProject = 'major1';
      options.needsFacultyPreferences = true; // New faculty for coursework
      break;
      
    case 4:
      options.canChooseInternship = true;
      options.canChooseCoursework = true;
      options.internshipType = '6month';
      options.courseworkProject = 'major2';
      options.needsFacultyPreferences = true; // New faculty for coursework
      break;
  }
  
  return options;
};

// M.Tech specific method: Check M.Tech internship eligibility
studentSchema.methods.checkMTechInternshipEligibility = function() {
  if (this.degree !== 'M.Tech') {
    return { eligible: false, reason: 'Not an M.Tech student' };
  }
  
  if (this.semester < 3) {
    return { eligible: false, reason: 'Internship available from semester 3 onwards' };
  }
  
  // Check if already doing internship
  if (this.semesterStatus.isDoingInternship) {
    return { eligible: false, reason: 'Already doing an internship' };
  }
  
  // Check if has completed required projects
  const hasCompletedProjects = this.semesterStatus.hasCompletedPreviousProject;
  
  return {
    eligible: hasCompletedProjects,
    hasCompletedProjects,
    semester: this.semester,
    internshipType: '6month',
    requirements: {
      projects: 'Must have completed previous semester projects',
      semester: `Must be in semester ${this.semester}`
    }
  };
};

// M.Tech specific method: Check M.Tech coursework eligibility
studentSchema.methods.checkMTechCourseworkEligibility = function() {
  if (this.degree !== 'M.Tech') {
    return { eligible: false, reason: 'Not an M.Tech student' };
  }
  
  if (this.semester < 3) {
    return { eligible: false, reason: 'Coursework projects available from semester 3 onwards' };
  }
  
  // Check if already doing internship
  if (this.semesterStatus.isDoingInternship) {
    return { eligible: false, reason: 'Cannot do coursework while doing internship' };
  }
  
  // Check if has completed required projects
  const hasCompletedProjects = this.semesterStatus.hasCompletedPreviousProject;
  
  const projectType = this.semester === 3 ? 'major1' : 'major2';
  
  return {
    eligible: hasCompletedProjects,
    hasCompletedProjects,
    semester: this.semester,
    projectType,
    requirements: {
      projects: 'Must have completed previous semester projects',
      semester: `Must be in semester ${this.semester}`,
      facultyPreferences: 'Must select faculty preferences'
    }
  };
};

// M.Tech specific method: Get project continuation options
studentSchema.methods.getProjectContinuationOptions = function() {
  if (this.degree !== 'M.Tech' || this.semester !== 2) {
    return { error: 'Project continuation available only in M.Tech semester 2' };
  }
  
  // Find previous semester project
  const previousProject = this.currentProjects.find(cp => 
    cp.semester === 1 && cp.status === 'completed'
  );
  
  if (!previousProject) {
    return {
      canContinue: false,
      reason: 'No completed project from semester 1',
      options: ['start_new']
    };
  }
  
  return {
    canContinue: true,
    previousProject: {
      id: previousProject.project,
      title: 'Previous Project', // Would need to populate this
      status: previousProject.status,
      grade: 'Previous Grade' // Would need to populate this
    },
    options: ['continue_previous', 'start_new'],
    faculty: previousProject.faculty // Same faculty
  };
};

// M.Tech specific method: Get M.Tech academic path
studentSchema.methods.getMTechAcademicPath = function() {
  if (this.degree !== 'M.Tech') {
    return { error: 'Not an M.Tech student' };
  }
  
  const path = [];
  
  for (let i = 1; i <= this.semester; i++) {
    const semesterInfo = {
      semester: i,
      year: Math.ceil(i / 2),
      completed: i < this.semester,
      current: i === this.semester
    };
    
    switch (i) {
      case 1:
        semesterInfo.activity = 'Minor Project 1 (Individual)';
        semesterInfo.type = 'project';
        semesterInfo.projectType = 'minor1';
        break;
      case 2:
        semesterInfo.activity = 'Minor Project 2 (Individual)';
        semesterInfo.type = 'project';
        semesterInfo.projectType = 'minor2';
        break;
      case 3:
        semesterInfo.activity = 'Internship (6-month) OR Coursework (Major Project 1)';
        semesterInfo.type = 'choice';
        semesterInfo.options = ['internship', 'coursework'];
        break;
      case 4:
        semesterInfo.activity = 'Internship (6-month) OR Coursework (Major Project 2)';
        semesterInfo.type = 'choice';
        semesterInfo.options = ['internship', 'coursework'];
        break;
    }
    
    path.push(semesterInfo);
  }
  
  return path;
};

// Enhanced invitation handling methods
studentSchema.methods.addInvitation = function(groupId, role, invitedBy) {
  // Check if already invited
  const existingInvite = this.invites.find(invite => 
    invite.group.toString() === groupId.toString() && 
    invite.status === 'pending'
  );
  
  if (existingInvite) {
    throw new Error('Student already has pending invitation to this group');
  }
  
  this.invites.push({
    group: groupId,
    role,
    invitedBy,
    invitedAt: new Date(),
    status: 'pending'
  });
  
  return this.save();
};

studentSchema.methods.acceptInvitation = async function(groupId, session = null) {
  try {
    const invite = this.invites.find(inv => 
      inv.group.toString() === groupId.toString() && 
      inv.status === 'pending'
    );
    
    if (!invite) {
      throw new Error('No pending invitation found for this group');
    }
    
    // Import Group model
    const Group = require('./Group');
    
    // Get the group and use its acceptInviteAtomic method
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }
    
    // Accept invitation using group's atomic method
    await group.acceptInviteAtomic(invite._id, this._id, session);
    
    // Add group membership to student
    await this.addGroupMembershipAtomic(groupId, invite.role, this.semester, session);
    
    // Clean up other pending invitations (auto-reject)
    await this.cleanupInvitesAtomic(groupId, session);
    
    // Update invitation status in student record
    invite.status = 'accepted';
    await this.save({ session });
    
    return true;
  } catch (error) {
    console.error('Accept invitation error:', error.message);
    throw error;
  }
};

studentSchema.methods.rejectInvitation = async function(groupId, session = null) {
  try {
    const invite = this.invites.find(inv => 
      inv.group.toString() === groupId.toString() && 
      inv.status === 'pending'
    );
    
    if (!invite) {
      throw new Error('No pending invitation found for this group');
    }
    
    // Import Group model
    const Group = require('./Group');
    
    // Get the group and update invitation status there too
    const group = await Group.findById(groupId);
    if (group) {
      const groupInvite = group.invites.id(invite._id);
      if (groupInvite) {
        groupInvite.status = 'rejected';
        await group.save({ session });
      }
    }
    
    // Update invitation status in student record
    invite.status = 'rejected';
    
    await this.save({ session });
    return true;
  } catch (error) {
    console.error('Reject invitation error:', error.message);
    throw error;
  }
};

studentSchema.methods.getPendingInvitations = function() {
  return this.invites.filter(invite => invite.status === 'pending');
};

studentSchema.methods.hasActiveGroupMembership = function(semester = null) {
  const targetSemester = semester || this.semester;
  return this.groupMemberships.some(gm => 
    gm.isActive && gm.semester === targetSemester
  );
};

studentSchema.methods.canFormGroups = function() {
  // Enhanced logic for group formation eligibility
  if (this.semesterStatus && this.semesterStatus.canFormGroups !== undefined) {
    return this.semesterStatus.canFormGroups;
  }
  
  // Default logic: Allow group formation for semesters 5+
  return this.semester >= 5;
};

// Pre-save middleware to update timestamps
studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Student', studentSchema);
