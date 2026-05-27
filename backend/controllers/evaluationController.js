const EvaluationMarks = require('../models/EvaluationMarks');
const Panel = require('../models/Panel');
const Project = require('../models/Project');
const Group = require('../models/Group');

/**
 * Submit marks for a group evaluation
 */
exports.submitMarks = async (req, res) => {
  try {
    const { groupId, panelId } = req.params;
    const { marks, comments, role } = req.body;
    const { facultyId } = req.user; // Assuming faculty info is in req.user

    if (!marks || marks < 0 || marks > 100) {
      return res.status(400).json({
        success: false,
        message: 'Marks must be between 0 and 100'
      });
    }

    // Get panel to verify faculty is a member
    const panel = await Panel.findById(panelId).populate('members.faculty');
    if (!panel) {
      return res.status(404).json({
        success: false,
        message: 'Panel not found'
      });
    }

    const facultyMember = panel.members.find(m => String(m.faculty._id) === String(facultyId));
    if (!facultyMember) {
      return res.status(403).json({
        success: false,
        message: 'Faculty is not a member of this panel'
      });
    }

    // Get group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Get or create evaluation record
    let evaluation = await EvaluationMarks.findOne({
      group: groupId,
      panel: panelId
    });

    if (!evaluation) {
      const project = await Project.findOne({ group: groupId });
      evaluation = new EvaluationMarks({
        project: project ? project._id : null,
        group: groupId,
        panel: panelId,
        semester: project ? project.semester : null,
        academicYear: project ? project.academicYear : null
      });
    }

    // Submit marks based on role
    if (facultyMember.role === 'conveyer') {
      evaluation.marksDetails.conveyer = {
        faculty: facultyId,
        marks: marks,
        comments: comments || '',
        submittedAt: new Date()
      };
    } else {
      // Add marks for panel member
      const existingMember = evaluation.marksDetails.members.find(
        m => String(m.faculty) === String(facultyId)
      );

      if (existingMember) {
        existingMember.marks = marks;
        existingMember.comments = comments || '';
        existingMember.submittedAt = new Date();
      } else {
        evaluation.marksDetails.members.push({
          faculty: facultyId,
          marks: marks,
          comments: comments || '',
          submittedAt: new Date()
        });
      }
    }

    // Update status
    if (evaluation.isCompletelyEvaluated()) {
      evaluation.status = 'completed';
      await evaluation.calculateTotalMarks();
    } else {
      const conveyerDone = evaluation.marksDetails.conveyer && evaluation.marksDetails.conveyer.marks !== undefined;
      const membersDone = evaluation.marksDetails.members.length > 0 &&
        evaluation.marksDetails.members.some(m => m.marks !== undefined);
      evaluation.status = (conveyerDone || membersDone) ? 'partial' : 'pending';
    }

    await evaluation.save();

    return res.status(200).json({
      success: true,
      message: 'Marks submitted successfully',
      data: evaluation
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get evaluation status for a group
 */
exports.getEvaluationStatus = async (req, res) => {
  try {
    const { groupId, panelId } = req.params;

    const evaluation = await EvaluationMarks.findOne({
      group: groupId,
      panel: panelId
    }).populate('panel', 'panelNumber members');

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation record not found'
      });
    }

    // Calculate submission status for each panel member
    const submissionStatus = [];

    const conveyer = evaluation.marksDetails.conveyer;
    if (conveyer) {
      submissionStatus.push({
        role: 'conveyer',
        faculty: conveyer.faculty,
        status: conveyer.marks !== undefined ? 'submitted' : 'pending',
        marks: conveyer.marks,
        submittedAt: conveyer.submittedAt
      });
    }

    evaluation.marksDetails.members.forEach(member => {
      submissionStatus.push({
        role: 'member',
        faculty: member.faculty,
        status: member.marks !== undefined ? 'submitted' : 'pending',
        marks: member.marks,
        submittedAt: member.submittedAt
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        groupId,
        panelId,
        totalMarks: evaluation.totalMarks,
        overallStatus: evaluation.status,
        submissionStatus: submissionStatus
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
 * Get all evaluations for a semester
 */
exports.getSemesterEvaluations = async (req, res) => {
  try {
    const { semester, academicYear } = req.query;

    if (!semester || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Semester and academicYear are required'
      });
    }

    const evaluations = await EvaluationMarks.find({
      semester: parseInt(semester),
      academicYear
    })
      .populate('group', 'groupName')
      .populate('panel', 'panelNumber members')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        count: evaluations.length,
        evaluations: evaluations
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
 * Get evaluation marks for a group
 */
exports.getGroupEvaluationMarks = async (req, res) => {
  try {
    const { groupId } = req.params;

    const evaluations = await EvaluationMarks.find({ group: groupId })
      .populate('panel', 'panelNumber members')
      .populate('marksDetails.conveyer.faculty', 'fullName email')
      .populate('marksDetails.members.faculty', 'fullName email');

    return res.status(200).json({
      success: true,
      data: {
        groupId,
        evaluations: evaluations
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
