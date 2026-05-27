const mongoose = require('mongoose');

const evaluationMarksSchema = new mongoose.Schema({
  // Project/Group Reference
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
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

  // Panel Reference
  panel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Panel',
    required: true,
    index: true
  },

  // Individual Marks from Panel Members
  marksDetails: {
    conveyer: {
      faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty'
      },
      marks: {
        type: Number,
        min: 0,
        max: 100
      },
      comments: String,
      submittedAt: Date
    },
    members: [{
      faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty'
      },
      marks: {
        type: Number,
        min: 0,
        max: 100
      },
      comments: String,
      submittedAt: Date
    }]
  },

  // Calculated Total Marks (based on distribution percentage)
  totalMarks: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'partial', 'completed'],
    default: 'pending',
    index: true
  },

  // Evaluation Metadata
  evaluationRound: {
    type: Number,
    default: 1,
    min: 1
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

// Index for finding evaluations
evaluationMarksSchema.index({ project: 1, panel: 1 });
evaluationMarksSchema.index({ group: 1, semester: 1, academicYear: 1 });

// Method to calculate total marks based on panel distribution
evaluationMarksSchema.methods.calculateTotalMarks = async function() {
  try {
    const PanelConfiguration = require('./PanelConfiguration');
    const config = await PanelConfiguration.findOne({ academicYear: this.academicYear });

    if (!config) {
      throw new Error('Panel configuration not found for this academic year');
    }

    let totalMarks = 0;

    // Add conveyer marks if submitted
    if (this.marksDetails.conveyer && this.marksDetails.conveyer.marks !== undefined) {
      totalMarks += (this.marksDetails.conveyer.marks * config.marksDistribution.conveyer) / 100;
    }

    // Add member marks if submitted
    if (this.marksDetails.members && this.marksDetails.members.length > 0) {
      const submittedMembers = this.marksDetails.members.filter(m => m.marks !== undefined);
      const avgMemberMarks = submittedMembers.length > 0
        ? submittedMembers.reduce((sum, m) => sum + m.marks, 0) / submittedMembers.length
        : 0;

      totalMarks += (avgMemberMarks * config.marksDistribution.member) / 100;
    }

    this.totalMarks = Math.round(totalMarks);
    return this.totalMarks;
  } catch (error) {
    console.error('Error calculating total marks:', error);
    throw error;
  }
};

// Method to check if all panel members have submitted marks
evaluationMarksSchema.methods.isCompletelyEvaluated = function() {
  const hasConveyerMarks = this.marksDetails.conveyer && this.marksDetails.conveyer.marks !== undefined;
  const allMembersSubmitted = this.marksDetails.members && this.marksDetails.members.every(m => m.marks !== undefined);

  return hasConveyerMarks && allMembersSubmitted && this.marksDetails.members.length > 0;
};

module.exports = mongoose.model('EvaluationMarks', evaluationMarksSchema);
