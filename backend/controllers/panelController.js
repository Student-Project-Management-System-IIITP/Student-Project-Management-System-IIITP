const Panel = require('../models/Panel');
const PanelConfiguration = require('../models/PanelConfiguration');
const EvaluationMarks = require('../models/EvaluationMarks');
const Faculty = require('../models/Faculty');
const panelAllocationService = require('../services/panelAllocationService');

// ============ PANEL CONFIGURATION ENDPOINTS ============

/**
 * Get or Create Panel Configuration for an academic year
 */
exports.getPanelConfiguration = async (req, res) => {
  try {
    const { academicYear } = req.query;

    let config = await PanelConfiguration.findOne({
      academicYear: academicYear || new Date().getFullYear().toString()
    });

    if (!config) {
      throw new Error('Panel configuration not found');
    }

    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Create or Update Panel Configuration
 */
exports.setPanelConfiguration = async (req, res) => {
  try {
    const { academicYear } = req.params;
    const {
      panelSize,
      departmentDistribution,
      studentGroupSize,
      marksDistribution,
      totalProfessors,
      maxGroupsPerPanel,
      maxPanelsPerProfessor,
      conveyerRotationEnabled,
      noConveyerRepeatInSemester
    } = req.body;

    // Validate marks distribution
    if (marksDistribution) {
      const tempConfig = {
        panelSize: panelSize || 3,
        marksDistribution,
        numberOfPanels: Math.ceil((totalProfessors || 27) / (panelSize || 3))
      };

      const numMembers = tempConfig.panelSize - 1;
      const totalMarks = (marksDistribution.conveyer || 40) + ((marksDistribution.member || 30) * numMembers);
      
      if (totalMarks !== 100) {
        return res.status(400).json({
          success: false,
          message: `Marks distribution must total 100. Current total: ${totalMarks}`
        });
      }
    }

    let config = await PanelConfiguration.findOne({ academicYear });

    if (config) {
      // Update existing
      Object.assign(config, {
        panelSize: panelSize !== undefined ? panelSize : config.panelSize,
        departmentDistribution: departmentDistribution || config.departmentDistribution,
        studentGroupSize: studentGroupSize || config.studentGroupSize,
        marksDistribution: marksDistribution || config.marksDistribution,
        totalProfessors: totalProfessors !== undefined ? totalProfessors : config.totalProfessors,
        maxGroupsPerPanel: maxGroupsPerPanel !== undefined ? maxGroupsPerPanel : config.maxGroupsPerPanel,
        maxPanelsPerProfessor: maxPanelsPerProfessor !== undefined ? maxPanelsPerProfessor : config.maxPanelsPerProfessor,
        conveyerRotationEnabled: conveyerRotationEnabled !== undefined ? conveyerRotationEnabled : config.conveyerRotationEnabled,
        noConveyerRepeatInSemester: noConveyerRepeatInSemester !== undefined ? noConveyerRepeatInSemester : config.noConveyerRepeatInSemester
      });
    } else {
      // Create new
      config = new PanelConfiguration({
        academicYear,
        panelSize: panelSize || 3,
        departmentDistribution: departmentDistribution || { CSE: 1, ECE: 1, ASH: 1 },
        studentGroupSize: studentGroupSize || { min: 4, max: 5 },
        marksDistribution: marksDistribution || { conveyer: 40, member: 30 },
        totalProfessors: totalProfessors || 27,
        maxGroupsPerPanel: maxGroupsPerPanel || 10,
        maxPanelsPerProfessor: maxPanelsPerProfessor || 3,
        conveyerRotationEnabled: conveyerRotationEnabled !== undefined ? conveyerRotationEnabled : true,
        noConveyerRepeatInSemester: noConveyerRepeatInSemester !== undefined ? noConveyerRepeatInSemester : true
      });
    }

    await config.save();

    return res.status(200).json({
      success: true,
      message: config._id ? 'Configuration updated successfully' : 'Configuration created successfully',
      data: config
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ============ PANEL GENERATION ENDPOINTS ============

/**
 * Generate panels for a semester
 */
exports.generatePanels = async (req, res) => {
  try {
    const { semester, academicYear } = req.body;

    if (!semester || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Semester and academicYear are required'
      });
    }

    // Check if panels already exist
    const existingPanels = await Panel.findOne({ semester, academicYear, isActive: true });
    if (existingPanels) {
      return res.status(400).json({
        success: false,
        message: `Panels already exist for semester ${semester} in ${academicYear}`
      });
    }

    const panels = await panelAllocationService.generatePanels(semester, academicYear);

    return res.status(201).json({
      success: true,
      message: `Successfully generated ${panels.length} panels`,
      data: {
        count: panels.length,
        panels: panels
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ============ PANEL RETRIEVAL ENDPOINTS ============

/**
 * Get all panels for a semester
 */
exports.getPanelsBySemester = async (req, res) => {
  try {
    const { semester, academicYear } = req.query;

    if (!semester || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Semester and academicYear are required'
      });
    }

    const panels = await Panel.find({ semester: parseInt(semester), academicYear, isActive: true })
      .populate('members.faculty', 'fullName email facultyId department');

    return res.status(200).json({
      success: true,
      data: {
        count: panels.length,
        panels: panels
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get specific panel details
 */
exports.getPanelDetails = async (req, res) => {
  try {
    const { panelId } = req.params;

    const panel = await Panel.findById(panelId)
      .populate('members.faculty', 'fullName email facultyId department');

    if (!panel) {
      return res.status(404).json({
        success: false,
        message: 'Panel not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: panel
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ============ PANEL MANAGEMENT ENDPOINTS ============

/**
 * Update panel members
 */
exports.updatePanelMembers = async (req, res) => {
  try {
    const { panelId } = req.params;
    const { members } = req.body;

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Members array is required and must not be empty'
      });
    }

    const panel = await Panel.findById(panelId);
    if (!panel) {
      return res.status(404).json({
        success: false,
        message: 'Panel not found'
      });
    }

    // Ensure one conveyer
    let conveyerCount = 0;
    members.forEach(m => {
      if (m.role === 'conveyer') conveyerCount++;
    });

    if (conveyerCount === 0) {
      members[0].role = 'conveyer';
    } else if (conveyerCount > 1) {
      return res.status(400).json({
        success: false,
        message: 'Only one member can be a conveyer'
      });
    }

    panel.members = members;
    await panel.save();

    await panel.populate('members.faculty', 'fullName email facultyId department');

    return res.status(200).json({
      success: true,
      message: 'Panel members updated successfully',
      data: panel
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Rotate conveyers across panels
 */
exports.rotateConveyers = async (req, res) => {
  try {
    const { academicYear, semester } = req.body;

    if (!academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: 'academicYear and semester are required'
      });
    }

    const result = await panelAllocationService.rotateConveyers(academicYear, semester);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get panel load distribution
 */
exports.getPanelLoadDistribution = async (req, res) => {
  try {
    const { academicYear } = req.query;

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'academicYear is required'
      });
    }

    const distribution = await panelAllocationService.getPanelLoadDistribution(academicYear);

    return res.status(200).json({
      success: true,
      data: distribution
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete panel
 */
exports.deletePanel = async (req, res) => {
  try {
    const { panelId } = req.params;

    const panel = await Panel.findByIdAndDelete(panelId);

    if (!panel) {
      return res.status(404).json({
        success: false,
        message: 'Panel not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Panel deleted successfully'
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ============ FACULTY PANEL VIEW ENDPOINTS ============

/**
 * Get panels assigned to a faculty member
 */
exports.getFacultyPanels = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const panels = await Panel.find({
      'members.faculty': facultyId,
      isActive: true
    })
      .populate('members.faculty', 'fullName email facultyId department');

    return res.status(200).json({
      success: true,
      data: {
        count: panels.length,
        panels: panels
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get evaluation marks for faculty submissions
 */
exports.getFacultyEvaluations = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { semester, academicYear } = req.query;

    const query = {
      semester: semester ? parseInt(semester) : { $exists: true },
      academicYear: academicYear || { $exists: true }
    };

    // Check if faculty is a member of the panel
    const evaluations = await EvaluationMarks.find(query)
      .populate('panel')
      .lean();

    // Filter evaluations where this faculty submitted marks
    const facultyEvaluations = evaluations.filter(eval => {
      const hasConveyerMarks = eval.marksDetails.conveyer &&
        String(eval.marksDetails.conveyer.faculty) === String(facultyId);
      const hasMemberMarks = eval.marksDetails.members &&
        eval.marksDetails.members.some(m => String(m.faculty) === String(facultyId));

      return hasConveyerMarks || hasMemberMarks;
    });

    return res.status(200).json({
      success: true,
      data: {
        count: facultyEvaluations.length,
        evaluations: facultyEvaluations
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = exports;
