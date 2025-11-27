const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: false, // Made optional - will be auto-generated if not provided
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '' // Default to empty string
  },
  
  // Members
  members: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    inviteStatus: {
      type: String,
      enum: ['accepted', 'pending', 'rejected', 'auto-rejected'],
      default: 'accepted'
    }
  }],
  
  // Invites tracking
  invites: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
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
    },
    respondedAt: {
      type: Date
    }
  }],
  
  // Project Association
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  
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
    trim: true,
    match: [/^\d{4}-\d{2}$/, 'Academic year must be in format YYYY-YY (e.g., 2024-25)'],
    default: function() {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      return `${currentYear}-${nextYear.toString().slice(-2)}`;
    },
    index: true
  },
  
  // Group Settings
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  maxMembers: {
    type: Number,
    default: 5,
    min: 2,
    max: 10 // Allow up to 10 members (matches admin config UI limit)
  },
  minMembers: {
    type: Number,
    default: 4,
    min: 2
  },
  
  // Group Status
  status: {
    type: String,
    enum: ['invitations_sent', 'open', 'forming', 'complete', 'locked', 'finalized', 'disbanded'],
    default: 'invitations_sent',
    index: true
  },
  
  // Faculty Allocation
  allocatedFaculty: {
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
      max: 5
    }
  }],
  
  // Group Leader
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  
  // Creation Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  
  // Group finalization
  finalizedAt: {
    type: Date
  },
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
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
groupSchema.index({ semester: 1, academicYear: 1 });
groupSchema.index({ status: 1, semester: 1 });
groupSchema.index({ 'members.student': 1 });
groupSchema.index({ allocatedFaculty: 1, status: 1 });
groupSchema.index({ createdBy: 1 });

// Pre-save middleware to update timestamps
groupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware to generate default name if not provided
groupSchema.pre('save', function(next) {
  // Generate default name if not provided: "Group - [Leader Name] - [Semester]"
  if (!this.name || this.name.trim() === '') {
    if (this.isNew && this.leader) {
      // Will be populated later, use a temporary name
      this.name = `Group - Semester ${this.semester}`;
    } else if (!this.isNew && this.name === '') {
      // Keep existing name if updating
      return next();
    }
  }
  next();
});

// Pre-save middleware to validate group
groupSchema.pre('save', function(next) {
  // Ensure leader is in members array
  if (this.leader && !this.members.some(member => member.student.toString() === this.leader.toString())) {
    return next(new Error('Group leader must be a member of the group'));
  }
  
  // Validate member count
  const activeMembers = this.members.filter(member => member.isActive);
  if (activeMembers.length > this.maxMembers) {
    return next(new Error(`Group cannot have more than ${this.maxMembers} members`));
  }
  
  if (activeMembers.length < this.minMembers && this.status === 'complete') {
    return next(new Error(`Group must have at least ${this.minMembers} members to be complete`));
  }
  
  next();
});

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Virtual for available slots
groupSchema.virtual('availableSlots').get(function() {
  return this.maxMembers - this.memberCount;
});

// Virtual for group completion status
groupSchema.virtual('isComplete').get(function() {
  return this.memberCount >= this.minMembers && this.memberCount <= this.maxMembers;
});

// Method to add member
groupSchema.methods.addMember = function(studentId, role = 'member') {
  // Check if student is already a member
  const existingMember = this.members.find(member => 
    member.student.toString() === studentId.toString()
  );
  
  if (existingMember) {
    if (existingMember.isActive) {
      throw new Error('Student is already a member of this group');
    } else {
      // Reactivate existing member
      existingMember.isActive = true;
      existingMember.joinedAt = new Date();
      return this.save();
    }
  }
  
  // Check if group has available slots
  if (this.memberCount >= this.maxMembers) {
    throw new Error('Group is full');
  }
  
  // Add new member
  this.members.push({
    student: studentId,
    role: role,
    joinedAt: new Date(),
    isActive: true
  });
  
  // Update group status if complete
  if (this.isComplete) {
    this.status = 'complete';
  }
  
  return this.save();
};

// Method to remove member
groupSchema.methods.removeMember = function(studentId) {
  const memberIndex = this.members.findIndex(member => 
    member.student.toString() === studentId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('Student is not a member of this group');
  }
  
  // If removing the leader, assign new leader
  if (this.leader.toString() === studentId.toString()) {
    const remainingMembers = this.members.filter(member => 
      member.student.toString() !== studentId.toString() && member.isActive
    );
    
    if (remainingMembers.length === 0) {
      throw new Error('Cannot remove the last member of the group');
    }
    
    // Assign new leader (first remaining member)
    this.leader = remainingMembers[0].student;
    remainingMembers[0].role = 'leader';
  }
  
  // Mark member as inactive
  this.members[memberIndex].isActive = false;
  
  // Update group status
  if (this.memberCount < this.minMembers) {
    this.status = 'forming';
  }
  
  return this.save();
};

// Method to change leader
groupSchema.methods.changeLeader = function(newLeaderId) {
  const newLeader = this.members.find(member => 
    member.student.toString() === newLeaderId.toString() && member.isActive
  );
  
  if (!newLeader) {
    throw new Error('New leader must be an active member of the group');
  }
  
  // Update old leader role
  const oldLeader = this.members.find(member => 
    member.student.toString() === this.leader.toString()
  );
  if (oldLeader) {
    oldLeader.role = 'member';
  }
  
  // Set new leader
  this.leader = newLeaderId;
  newLeader.role = 'leader';
  
  return this.save();
};

// Method to get group summary
groupSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    semester: this.semester,
    academicYear: this.academicYear,
    status: this.status,
    memberCount: this.memberCount,
    maxMembers: this.maxMembers,
    availableSlots: this.availableSlots,
    isComplete: this.isComplete,
    hasProject: !!this.project,
    hasFaculty: !!this.allocatedFaculty
  };
};

// Static method to get groups by semester
groupSchema.statics.getBySemester = function(semester, academicYear) {
  return this.find({ semester, academicYear, isActive: true })
    .populate('members.student leader createdBy allocatedFaculty project');
};

// Static method to get groups by status
groupSchema.statics.getByStatus = function(status, semester) {
  return this.find({ status, semester, isActive: true })
    .populate('members.student leader allocatedFaculty project');
};

// Static method to get student's groups
groupSchema.statics.getByStudent = function(studentId, semester) {
  const query = {
    'members.student': studentId,
    'members.isActive': true,
    isActive: true
  };
  
  if (semester) {
    query.semester = semester;
  }
  
  return this.find(query)
    .populate('members.student leader allocatedFaculty project');
};

// Sem 5 specific method: Check if group is ready for faculty allocation
groupSchema.methods.isReadyForAllocation = function() {
  const activeMembers = this.members.filter(member => member.isActive);
  return this.status === 'complete' && 
         activeMembers.length >= this.minMembers && 
         activeMembers.length <= this.maxMembers &&
         activeMembers.some(member => member.role === 'leader');
};

// Sem 5 specific method: Get group summary for faculty allocation
groupSchema.methods.getGroupSummary = function() {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    memberCount: this.members.length,
    leader: this.leader,
    members: this.members.map(member => ({
      student: member.student,
      role: member.role,
      joinedAt: member.joinedAt
    })),
    semester: this.semester,
    academicYear: this.academicYear,
    status: this.status,
    isReadyForAllocation: this.isReadyForAllocation(),
    allocatedFaculty: this.allocatedFaculty,
    project: this.project
  };
};

// Sem 5 specific method: Add faculty preferences
groupSchema.methods.addFacultyPreferences = function(preferences) {
  this.facultyPreferences = preferences.map(pref => ({
    faculty: pref.faculty,
    priority: pref.priority
  }));
  return this.save();
};

// Sem 5 specific method: Get available slots for new members
groupSchema.methods.getAvailableSlots = function() {
  return this.maxMembers - this.members.length;
};

// Sem 5 specific method: Check if student can join
groupSchema.methods.canStudentJoin = function(studentId) {
  // Check if group is finalized or locked
  if (this.status === 'finalized' || this.status === 'locked') {
    return { canJoin: false, reason: 'Group is finalized or locked' };
  }
  
  // Check if group is full
  const activeMembers = this.members.filter(member => member.isActive);
  if (activeMembers.length >= this.maxMembers) {
    return { canJoin: false, reason: 'Group is full' };
  }
  
  // Check if student is already a member
  if (activeMembers.some(member => member.student.toString() === studentId.toString())) {
    return { canJoin: false, reason: 'Student is already a member' };
  }
  
  // Check if group is still accepting members
  if (this.status !== 'forming' && this.status !== 'complete') {
    return { canJoin: false, reason: 'Group is not accepting new members' };
  }
  
  return { canJoin: true, reason: 'Student can join' };
};

// Instance method to mark group as complete
groupSchema.methods.markAsComplete = async function() {
  const activeMembers = this.members.filter(member => member.isActive);
  if (activeMembers.length < this.minMembers || activeMembers.length > this.maxMembers) {
    throw new Error(`Group must have between ${this.minMembers} and ${this.maxMembers} members to be marked complete.`);
  }
  if (!activeMembers.some(member => member.role === 'leader')) {
    throw new Error('A group must have at least one leader to be marked complete.');
  }
  this.status = 'complete';
  return this.save();
};

// New method: Add invite
groupSchema.methods.addInvite = function(studentId, role, invitedBy) {
  // Check if group has slots
  const activeMembers = this.members.filter(member => member.isActive);
  if (activeMembers.length >= this.maxMembers) {
    throw new Error('Group is full');
  }
  
  // Check if not already invited
  const existingInvite = this.invites.find(invite => 
    invite.student.toString() === studentId.toString() && 
    invite.status === 'pending'
  );
  
  if (existingInvite) {
    throw new Error('Student already has pending invitation');
  }
  
  this.invites.push({
    student: studentId,
    role,
    invitedBy,
    invitedAt: new Date(),
    status: 'pending'
  });
  
  return this.save();
};

// Enhanced method: Accept invite with concurrency protection
groupSchema.methods.acceptInvite = async function(inviteId, studentId) {
  const invite = this.invites.id(inviteId);
  if (!invite) {
    throw new Error('Invitation not found');
  }
  
  if (invite.student.toString() !== studentId.toString()) {
    throw new Error('This invitation does not belong to you');
  }
  
  if (invite.status !== 'pending') {
    throw new Error('This invitation has already been processed');
  }
  
    // Check group locks
    if (this.status === 'finalized' || this.status === 'locked') {
      invite.status = 'auto-rejected';
      invite.respondedAt = new Date();
      throw new Error('Group is finalized or locked');
    }
  
  // Re-check group capacity with fresh data to avoid race conditions
  const activeMembers = this.members.filter(member => member.isActive);
  if (activeMembers.length >= this.maxMembers) {
    invite.status = 'auto-rejected';
    invite.respondedAt = new Date();
    throw new Error('Group is now full');
  }

  // Check if student is already a member
  const alreadyMember = this.members.find(m => 
    m.student.toString() === studentId.toString() && m.isActive
  );
  if (alreadyMember) {
    throw new Error('Student is already a member of this group');
  }
  
  // Accept the invite
  invite.status = 'accepted';
  invite.respondedAt = new Date();
  
  // Add to members
  this.members.push({
    student: studentId,
    role: invite.role,
    joinedAt: new Date(),
    isActive: true,
    inviteStatus: 'accepted'
  });
  
  // Update group status
  const newMemberCount = this.members.filter(m => m.isActive).length;
  if (newMemberCount >= this.maxMembers) {
    this.status = 'complete';
  }
  
  // Auto-reject other pending invites for this student in other groups
  // This will be handled at the controller level with transactions
  
  return this.save();
};

// Enhanced method: Atomic invitation acceptance with transaction
groupSchema.methods.acceptInviteAtomic = async function(inviteId, studentId, session = null) {
  try {
    // Perform the same validation but with session
    const invite = this.invites.id(inviteId);
    if (!invite) {
      throw new Error('Invitation not found');
    }
    
    if (invite.student.toString() !== studentId.toString()) {
      throw new Error('This invitation does not belong to you');
    }
    
    if (invite.status !== 'pending') {
      throw new Error('This invitation has already been processed');
    }
    
    // Check group locks
    if (this.status === 'finalized' || this.status === 'locked') {
      invite.status = 'auto-rejected';
      invite.respondedAt = new Date();
      await this.save({ session });
      throw new Error('Group is finalized or locked');
    }
    
    // Re-check group capacity
    const activeMembers = this.members.filter(member => member.isActive);
    if (activeMembers.length >= this.maxMembers) {
      invite.status = 'auto-rejected';
      invite.respondedAt = new Date();
      await this.save({ session });
      throw new Error('Group is now full');
    }

    // Check if student is already a member
    const alreadyMember = this.members.find(m => 
      m.student.toString() === studentId.toString() && m.isActive
    );
    if (alreadyMember) {
      throw new Error('Student is already a member of this group');
    }
    
    // Accept the invite
    invite.status = 'accepted';
    invite.respondedAt = new Date();
    
    // Add to members
    this.members.push({
      student: studentId,
      role: invite.role,
      joinedAt: new Date(),
      isActive: true,
      inviteStatus: 'accepted'
    });
    
    // Update group status
    const newMemberCount = this.members.filter(m => m.isActive).length;
    if (newMemberCount >= this.minMembers && this.status === 'invitations_sent') {
      this.status = 'open';
    }
    
    await this.save({ session });
    return true;
  } catch (error) {
    // Log the error for debugging
    console.error('Accept invite atomic error:', error.message);
    throw error;
  }
};

// Helper method to auto-reject pending invites for a student
// IMPORTANT: Only rejects invitations from the same semester as this group
groupSchema.methods.autoRejectStudentInvites = async function(studentId, session = null) {
  try {
    // Auto-reject all pending invites for this student in other groups
    // BUT ONLY from the same semester (to prevent cross-semester conflicts)
    const otherGroups = await this.constructor.find({
      '_id': { $ne: this._id },
      'semester': this.semester, // CRITICAL: Only same semester groups
      'invites.student': studentId,
      'invites.status': 'pending'
    }).session(session || null);

    for (const group of otherGroups) {
      const invitesToUpdate = group.invites.filter(invite => 
        invite.student.toString() === studentId.toString() && 
        invite.status === 'pending'
      );

      for (const invite of invitesToUpdate) {
        invite.status = 'auto-rejected';
        invite.respondedAt = new Date();
        invite.rejectionReason = `Student joined another group in semester ${this.semester}`;
      }

      if (invitesToUpdate.length > 0) {
        await group.save({ session });
      }
    }

    return otherGroups.length;
  } catch (error) {
    console.error('Auto-reject student invites error:', error.message);
    throw error;
  }
};

// New method: Reject invite
groupSchema.methods.rejectInvite = function(inviteId, studentId) {
  const invite = this.invites.id(inviteId);
  if (!invite) {
    throw new Error('Invitation not found');
  }
  
  if (invite.student.toString() !== studentId.toString()) {
    throw new Error('This invitation does not belong to you');
  }
  
  if (invite.status !== 'pending') {
    throw new Error('This invitation has already been processed');
  }
  
  invite.status = 'rejected';
  invite.respondedAt = new Date();
  return this.save();
};

// Advanced feature: Transfer group leadership
groupSchema.methods.transferLeadership = async function(newLeaderId, currentLeaderId, session = null) {
  if (!this.leader || this.leader.toString() !== currentLeaderId.toString()) {
    throw new Error('Only current leader can transfer leadership');
  }
  
  if (this.status === 'finalized' || this.status === 'locked') {
    throw new Error('Cannot transfer leadership in finalized or locked groups');
  }

  const newLeader = this.members.find(member => 
    member.student.toString() === newLeaderId.toString() && 
    member.isActive &&
    member.inviteStatus === 'accepted'
  );

  if (!newLeader) {
    throw new Error('New leader must be an active accepted member');
  }

  // Verify all members have accepted their invites
  const pendingMembers = this.members.filter(member => 
    member.isActive && 
    member.inviteStatus !== 'accepted'
  );

  if (pendingMembers.length > 0) {
    throw new Error('All group members must have accepted their invitations before leadership transfer');
  }

  const oldLeader = this.members.find(member => 
    member.student.toString() === currentLeaderId.toString()
  );

  if (oldLeader) {
    oldLeader.role = 'member';
  }

  newLeader.role = 'leader';
  this.leader = newLeaderId;

  await this.save({ session });
  return true;
};

// Advanced feature: Finalize group
groupSchema.methods.finalizeGroup = async function(leaderId, session = null) {
  if (!this.leader || this.leader.toString() !== leaderId.toString()) {
    throw new Error('Only group leader can finalize the group');
  }

  if (this.status === 'finalized') {
    throw new Error('Group is already finalized');
  }

  if (this.status === 'locked' || this.status === 'disbanded') {
    throw new Error('Cannot finalize locked or disbanded groups');
  }

  // Verify all members have accepted their invites
  const pendingMembers = this.members.filter(member => 
    member.isActive && 
    member.inviteStatus !== 'accepted'
  );

  if (pendingMembers.length > 0) {
    throw new Error('All group members must have accepted their invitations before finalizing');
  }

  // Check minimum and maximum member counts
  const activeMembers = this.members.filter(member => member.isActive);
  if (activeMembers.length < this.minMembers) {
    throw new Error(`Group must have at least ${this.minMembers} members to be finalized`);
  }

  if (activeMembers.length > this.maxMembers) {
    throw new Error(`Group cannot have more than ${this.maxMembers} members`);
  }

  // Cancel all pending invitations
  this.invites.forEach(invite => {
    if (invite.status === 'pending') {
      invite.status = 'auto-rejected';
      invite.respondedAt = new Date();
    }
  });

  this.status = 'finalized';
  this.finalizedAt = new Date();
  this.finalizedBy = leaderId;

  await this.save({ session });
  return true;
};

// Advanced feature: Enable member leave with restrictions
groupSchema.methods.allowMemberLeave = async function(studentId, session = null) {
  const member = this.members.find(member => 
    member.student.toString() === studentId.toString() && 
    member.isActive
  );

  if (!member) {
    throw new Error('Student is not a member of this group');
  }

  if (this.status === 'finalized') {
    throw new Error('Cannot leave a finalized group');
  }

  // Check if it's the leader leaving
  if (this.leader.toString() === studentId.toString()) {
    const otherActiveMembers = this.members.filter(m => 
      m.student.toString() !== studentId.toString() && 
      m.isActive && 
      m.inviteStatus === 'accepted'
    );

    if (otherActiveMembers.length === 0) {
      throw new Error('Group leader cannot leave as the only active member');
    }

    // Transfer leadership to first available member
    const newLeader = otherActiveMembers[0];
    await this.transferLeadership(newLeader.student, studentId, session);
  }

  // Completely remove member from the members array
  this.members.pull({ _id: member._id });

  // Find and remove the original invitation for this member to allow re-invites
  const inviteIndex = this.invites.findIndex(inv => inv.student.toString() === studentId.toString());
  if (inviteIndex > -1) {
    this.invites.splice(inviteIndex, 1);
  }

  // Update group status if dropping below minimum
  // Since we're removing members entirely, just check members.length
  if (this.members.length < this.minMembers && this.status !== 'complete') {
    this.status = 'forming';
  }

  await this.save({ session });
  return true;
};

// Advanced feature: Force disband group (admin function)
groupSchema.methods.disbandGroup = async function(adminId, session = null) {
  if (this.status === 'disbanded') {
    throw new Error('Group is already disbanded');
  }

  this.status = 'disbanded';
  this.disbandedAt = new Date();
  this.disbandedBy = adminId;

  // Mark all members as inactive
  this.members.forEach(member => {
    member.isActive = false;
  });

  await this.save({ session });
  return true;
};

// Add the new methods here, right before the model is created

// Add active member count helper
groupSchema.methods.getActiveMemberCount = function() {
  return this.members.filter(member => member.isActive).length;
};

// Add toJSON transform to include activeMemberCount
groupSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.activeMemberCount = doc.getActiveMemberCount();
    return ret;
  }
});

// The model is created here
const Group = mongoose.model('Group', groupSchema);
module.exports = Group;

