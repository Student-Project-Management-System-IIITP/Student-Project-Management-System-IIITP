const mongoose = require('mongoose');

const panelConfigurationSchema = new mongoose.Schema({
  // Configuration Settings
  academicYear: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Panel Size Configuration
  panelSize: {
    type: Number,
    required: true,
    default: 3,
    min: 2,
    max: 10
  },

  // Department Distribution (in percentage or count)
  departmentDistribution: {
    CSE: {
      type: Number,
      required: true,
      default: 1,
      min: 0
    },
    ECE: {
      type: Number,
      required: true,
      default: 1,
      min: 0
    },
    ASH: {
      type: Number,
      required: true,
      default: 1,
      min: 0
    }
  },

  // Student Group Configuration
  studentGroupSize: {
    min: {
      type: Number,
      required: true,
      default: 4,
      min: 1
    },
    max: {
      type: Number,
      required: true,
      default: 5,
      min: 1
    }
  },

  // Marks Distribution (as percentages)
  marksDistribution: {
    conveyer: {
      type: Number,
      required: true,
      default: 40,
      min: 0,
      max: 100
    },
    member: {
      type: Number,
      required: true,
      default: 30,
      min: 0,
      max: 100
    }
  },

  // Total Available Professors
  totalProfessors: {
    type: Number,
    required: true,
    default: 27,
    min: 1
  },

  // Auto-calculated number of panels
  numberOfPanels: {
    type: Number,
    required: true,
    default: 9,
    min: 1
  },

  // Load Balancing Settings
  maxGroupsPerPanel: {
    type: Number,
    required: true,
    default: 10,
    min: 1
  },
  
  maxPanelsPerProfessor: {
    type: Number,
    required: true,
    default: 3,
    min: 1
  },

  // Conveyer Assignment Rules
  conveyerRotationEnabled: {
    type: Boolean,
    default: true
  },
  noConveyerRepeatInSemester: {
    type: Boolean,
    default: true
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
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

// Pre-save hook to calculate number of panels
panelConfigurationSchema.pre('save', function(next) {
  if (this.totalProfessors && this.panelSize) {
    this.numberOfPanels = Math.ceil(this.totalProfessors / this.panelSize);
  }
  next();
});

// Method to validate marks distribution
panelConfigurationSchema.methods.isValidMarksDistribution = function() {
  const numMembers = this.panelSize - 1; // excluding conveyer
  const totalMarks = this.marksDistribution.conveyer + (this.marksDistribution.member * numMembers);
  return totalMarks === 100;
};

module.exports = mongoose.model('PanelConfiguration', panelConfigurationSchema);
