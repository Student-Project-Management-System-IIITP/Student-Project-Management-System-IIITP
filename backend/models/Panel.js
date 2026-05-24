const mongoose = require('mongoose');

const panelSchema = new mongoose.Schema({
  // Panel Metadata
  panelNumber: {
    type: Number,
    required: true,
    min: 1
  },
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

  // Panel Members
  members: [{
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true
    },
    department: {
      type: String,
      enum: ['CSE', 'ECE', 'ASH'],
      required: true
    },
    role: {
      type: String,
      enum: ['conveyer', 'member'],
      required: true,
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Assigned Groups for Evaluation
  assignedGroups: [{
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Panel Constraints
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Index for finding panels by semester and academic year
panelSchema.index({ semester: 1, academicYear: 1, isActive: 1 });

// Get the count of groups assigned to this panel (single source of truth: Group.panel)
panelSchema.methods.getGroupCount = async function() {
  const Group = require('./Group');
  return await Group.countDocuments({ panel: this._id, isActive: true });
};

// Method to get panel details with faculty info
panelSchema.methods.getDetailedInfo = async function() {
  return await this.populate('members.faculty', 'fullName email department facultyId');
};

// Method to find conveyer
panelSchema.methods.getConveyer = function() {
  return this.members.find(m => m.role === 'conveyer');
};

// Method to get non-conveyer members
panelSchema.methods.getMembers = function() {
  return this.members.filter(m => m.role === 'member');
};

// Method to check if panel can accept more groups
panelSchema.methods.canAcceptGroup = async function() {
  const PanelConfiguration = require('./PanelConfiguration');
  const config = await PanelConfiguration.findOne({ academicYear: this.academicYear, isActive: true });
  const maxGroups = config ? config.maxGroupsPerPanel : 10;
  const currentCount = await this.getGroupCount();
  return currentCount < maxGroups;
};

// Method to assign a group to this panel (writes only to Group.panel)
panelSchema.methods.assignGroup = async function(groupId) {
  const Group = require('./Group');

  // Check if group is already assigned to this panel
  const existing = await Group.findOne({ _id: groupId, panel: this._id });
  if (existing) {
    throw new Error('Group is already assigned to this panel');
  }

  // Check capacity
  const canAccept = await this.canAcceptGroup();
  if (!canAccept) {
    throw new Error('Panel has reached maximum group capacity');
  }

  // Write only to Group.panel — single source of truth
  await Group.findByIdAndUpdate(groupId, { panel: this._id });
};

// Method to remove a group from this panel (writes only to Group.panel)
panelSchema.methods.removeGroup = async function(groupId) {
  const Group = require('./Group');

  const group = await Group.findOne({ _id: groupId, panel: this._id });
  if (!group) {
    throw new Error('Group is not assigned to this panel');
  }

  // Write only to Group.panel — single source of truth
  await Group.findByIdAndUpdate(groupId, { panel: null });
};

module.exports = mongoose.model('Panel', panelSchema);

