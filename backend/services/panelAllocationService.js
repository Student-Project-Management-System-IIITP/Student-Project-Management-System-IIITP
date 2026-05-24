const Faculty = require('../models/Faculty');
const Panel = require('../models/Panel');
const PanelConfiguration = require('../models/PanelConfiguration');

class PanelAllocationService {
  /**
   * Generate panels for a semester
   * @param {Number} semester - Semester number
   * @param {String} academicYear - Academic year
   * @returns {Promise<Array>} - Array of created panels
   */
  async generatePanels(semester, academicYear) {
    try {
      // Get panel configuration
      const config = await PanelConfiguration.findOne({ academicYear, isActive: true });
      if (!config) {
        throw new Error(`Panel configuration not found for academic year ${academicYear}`);
      }

      // Get all available faculty
      const allFaculty = await Faculty.find({ isRetired: false })
        .lean()
        .exec();

      if (allFaculty.length < config.panelSize) {
        throw new Error(`Insufficient faculty members. Need at least ${config.panelSize}, have ${allFaculty.length}`);
      }

      // Group faculty by department
      const facultyByDepartment = this._groupFacultyByDepartment(allFaculty);

      // Validate department distribution
      this._validateDepartmentDistribution(facultyByDepartment, config);

      // Shuffle faculty within each department
      Object.keys(facultyByDepartment).forEach(dept => {
        facultyByDepartment[dept] = this._shuffleArray(facultyByDepartment[dept]);
      });

      // Generate panels
      const panels = [];
      for (let i = 0; i < config.numberOfPanels; i++) {
        const panelMembers = this._selectPanelMembers(
          facultyByDepartment,
          config,
          i,
          academicYear,
          semester
        );

        if (panelMembers.length === config.panelSize) {
          const panel = {
            panelNumber: i + 1,
            semester,
            academicYear,
            members: panelMembers,
            isActive: true
          };
          panels.push(panel);
        }
      }

      // Create panels in database
      const createdPanels = await Panel.insertMany(panels);
      return createdPanels;
    } catch (error) {
      console.error('Error generating panels:', error);
      throw error;
    }
  }

  /**
   * Group faculty by department
   * @private
   */
  _groupFacultyByDepartment(faculty) {
    const grouped = {
      CSE: [],
      ECE: [],
      ASH: []
    };

    faculty.forEach(f => {
      const dept = f.department || 'CSE';
      if (grouped[dept]) {
        grouped[dept].push(f);
      }
    });

    return grouped;
  }

  /**
   * Validate that we have enough faculty in each department
   * @private
   */
  _validateDepartmentDistribution(facultyByDepartment, config) {
    const { CSE, ECE, ASH } = config.departmentDistribution;
    const required = {
      CSE: CSE * config.numberOfPanels,
      ECE: ECE * config.numberOfPanels,
      ASH: ASH * config.numberOfPanels
    };

    for (const dept in required) {
      if (facultyByDepartment[dept].length < required[dept]) {
        throw new Error(
          `Insufficient ${dept} faculty. Need ${required[dept]}, have ${facultyByDepartment[dept].length}`
        );
      }
    }
  }

  /**
   * Select panel members with department distribution
   * @private
   */
  _selectPanelMembers(facultyByDepartment, config, panelIndex, academicYear, semester) {
    const members = [];
    const { CSE, ECE, ASH } = config.departmentDistribution;
    const startIndex = panelIndex * config.panelSize;

    // Add CSE faculty
    for (let i = 0; i < CSE; i++) {
      const idx = (startIndex + i) % facultyByDepartment.CSE.length;
      const faculty = facultyByDepartment.CSE[idx];
      if (!this._memberAlreadyInPanel(members, faculty._id)) {
        members.push({
          faculty: faculty._id,
          department: 'CSE',
          role: members.length === 0 ? 'conveyer' : 'member'
        });
      }
    }

    // Add ECE faculty
    for (let i = 0; i < ECE; i++) {
      const idx = (startIndex + i) % facultyByDepartment.ECE.length;
      const faculty = facultyByDepartment.ECE[idx];
      if (!this._memberAlreadyInPanel(members, faculty._id)) {
        members.push({
          faculty: faculty._id,
          department: 'ECE',
          role: members.length === 0 ? 'conveyer' : 'member'
        });
      }
    }

    // Add ASH faculty
    for (let i = 0; i < ASH; i++) {
      const idx = (startIndex + i) % facultyByDepartment.ASH.length;
      const faculty = facultyByDepartment.ASH[idx];
      if (!this._memberAlreadyInPanel(members, faculty._id)) {
        members.push({
          faculty: faculty._id,
          department: 'ASH',
          role: members.length === 0 ? 'conveyer' : 'member'
        });
      }
    }

    // Ensure conveyer exists and is the first member
    if (members.length > 0 && members[0].role !== 'conveyer') {
      members[0].role = 'conveyer';
    }

    return members;
  }

  /**
   * Check if faculty member is already in this panel
   * @private
   */
  _memberAlreadyInPanel(members, facultyId) {
    return members.some(m => String(m.faculty) === String(facultyId));
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   * @private
   */
  _shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Rotate conveyers to ensure no professor gets same role in multiple panels
   * @param {String} academicYear
   * @param {Number} semester
   */
  async rotateConveyers(academicYear, semester) {
    try {
      const panels = await Panel.find({
        academicYear,
        semester,
        isActive: true
      }).populate('members.faculty');

      if (panels.length === 0) {
        throw new Error('No panels found to rotate conveyers');
      }

      // Get conveyer assignments for this academic year
      const conveyerAssignments = {};
      panels.forEach(panel => {
        const conveyer = panel.getConveyer();
        if (conveyer) {
          const facultyId = String(conveyer.faculty._id);
          conveyerAssignments[facultyId] = (conveyerAssignments[facultyId] || 0) + 1;
        }
      });

      // Find faculty with multiple conveyer assignments
      const overloadedFaculty = Object.entries(conveyerAssignments)
        .filter(([id, count]) => count > 1)
        .map(([id]) => id);

      if (overloadedFaculty.length === 0) {
        return { rotated: 0, message: 'No conveyer rotation needed' };
      }

      // Rotate roles
      let rotationCount = 0;
      for (const facultyId of overloadedFaculty) {
        const panelsWithThisFaculty = panels.filter(panel =>
          panel.members.some(m => String(m.faculty._id) === facultyId)
        );

        // Keep this faculty as conveyer in only one panel
        for (let i = 1; i < panelsWithThisFaculty.length; i++) {
          const panel = panelsWithThisFaculty[i];
          const member = panel.members.find(m => String(m.faculty._id) === facultyId);
          if (member && member.role === 'conveyer') {
            member.role = 'member';
            // Make another member the conveyer
            const otherMember = panel.members.find(m => m.role === 'member');
            if (otherMember) {
              otherMember.role = 'conveyer';
              rotationCount++;
            }
          }
        }
      }

      // Save rotated panels
      for (const panel of panels) {
        await panel.save();
      }

      return {
        rotated: rotationCount,
        message: `Successfully rotated ${rotationCount} conveyer assignments`
      };
    } catch (error) {
      console.error('Error rotating conveyers:', error);
      throw error;
    }
  }

  /**
   * Get panel load distribution
   * @param {String} academicYear
   */
  async getPanelLoadDistribution(academicYear) {
    try {
      const panels = await Panel.find({
        academicYear,
        isActive: true
      }).populate('members.faculty', 'fullName email facultyId department');

      const distribution = {
        totalPanels: panels.length,
        facultyLoad: {},
        departmentLoad: {
          CSE: { count: 0, panels: 0 },
          ECE: { count: 0, panels: 0 },
          ASH: { count: 0, panels: 0 }
        }
      };

      panels.forEach(panel => {
        panel.members.forEach(member => {
          const facultyId = String(member.faculty._id);
          const dept = member.department;

          if (!distribution.facultyLoad[facultyId]) {
            distribution.facultyLoad[facultyId] = {
              name: member.faculty.fullName,
              email: member.faculty.email,
              facultyId: member.faculty.facultyId,
              department: dept,
              totalPanels: 0,
              conveyerPanels: 0,
              memberPanels: 0
            };
          }

          distribution.facultyLoad[facultyId].totalPanels++;
          if (member.role === 'conveyer') {
            distribution.facultyLoad[facultyId].conveyerPanels++;
          } else {
            distribution.facultyLoad[facultyId].memberPanels++;
          }

          distribution.departmentLoad[dept].count++;
          if (!distribution.departmentLoad[dept].panels) {
            distribution.departmentLoad[dept].panels = [];
          }
          distribution.departmentLoad[dept].panels.push(panel.panelNumber);
        });
      });

      return distribution;
    } catch (error) {
      console.error('Error getting panel load distribution:', error);
      throw error;
    }
  }

  /**
   * Assign groups to panels (distribute groups evenly)
   * @param {String} academicYear
   * @param {Number} semester
   * @param {Array} groups - Array of group IDs
   */
  async assignGroupsToPanels(academicYear, semester, groups) {
    try {
      const panels = await Panel.find({
        academicYear,
        semester,
        isActive: true
      });

      if (panels.length === 0) {
        throw new Error('No active panels found for this semester and academic year');
      }

      const assignment = {};
      const groupsPerPanel = Math.ceil(groups.length / panels.length);

      groups.forEach((groupId, index) => {
        const panelIndex = Math.floor(index / groupsPerPanel);
        const panelId = String(panels[Math.min(panelIndex, panels.length - 1)]._id);

        if (!assignment[panelId]) {
          assignment[panelId] = [];
        }
        assignment[panelId].push(groupId);
      });

      return assignment;
    } catch (error) {
      console.error('Error assigning groups to panels:', error);
      throw error;
    }
  }

  /**
   * Get panels for a specific semester
   */
  async getPanelsBySemester(semester, academicYear) {
    try {
      const panels = await Panel.find({
        semester,
        academicYear,
        isActive: true
      }).populate('members.faculty', 'fullName email facultyId department');

      return panels;
    } catch (error) {
      console.error('Error fetching panels:', error);
      throw error;
    }
  }
}

module.exports = new PanelAllocationService();
