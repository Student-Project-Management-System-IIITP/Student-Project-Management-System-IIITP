const Group = require('../models/Group');
const Project = require('../models/Project');
const Panel = require('../models/Panel');
const PanelConfiguration = require('../models/PanelConfiguration');

class AdminPanelService {
  /**
   * Assign groups to panels for a semester
   * @param {String} academicYear
   * @param {Number} semester
   */
  async assignGroupsToPanels(academicYear, semester) {
    try {
      // Get panels for this semester
      const panels = await Panel.find({
        academicYear,
        semester,
        isActive: true
      });

      if (panels.length === 0) {
        throw new Error(`No active panels found for semester ${semester} in ${academicYear}`);
      }

      // Get configuration
      const config = await PanelConfiguration.findOne({ academicYear });
      if (!config) {
        throw new Error('Panel configuration not found');
      }

      // Get all groups that don't have a panel assigned
      const groups = await Group.find({
        semester,
        academicYear,
        status: { $in: ['complete', 'locked', 'finalized'] },
        panel: { $exists: false }
      }).lean();

      if (groups.length === 0) {
        return { assigned: 0, message: 'No groups available for assignment' };
      }

      // Calculate groups per panel
      const groupsPerPanel = Math.ceil(groups.length / panels.length);

      // Assign groups
      let assignmentCount = 0;
      for (let i = 0; i < groups.length; i++) {
        const panelIndex = Math.floor(i / groupsPerPanel);
        const panel = panels[Math.min(panelIndex, panels.length - 1)];

        const result = await Group.updateOne(
          { _id: groups[i]._id },
          { panel: panel._id }
        );

        if (result.modifiedCount > 0) {
          assignmentCount++;
        }
      }

      return {
        assigned: assignmentCount,
        totalGroups: groups.length,
        panelsUsed: panels.length,
        groupsPerPanel: groupsPerPanel,
        message: `Successfully assigned ${assignmentCount} groups to ${panels.length} panels`
      };
    } catch (error) {
      console.error('Error assigning groups to panels:', error);
      throw error;
    }
  }

  /**
   * Get panel statistics for admin dashboard
   */
  async getPanelStatistics(academicYear) {
    try {
      const panels = await Panel.find({
        academicYear,
        isActive: true
      }).populate('members.faculty', 'fullName department');

      const groups = await Group.find({
        academicYear,
        panel: { $exists: true, $ne: null }
      }).lean();

      const statistics = {
        totalPanels: panels.length,
        totalPanelMembers: 0,
        conveyerCount: 0,
        memberCount: 0,
        departmentDistribution: {
          CSE: 0,
          ECE: 0,
          ASH: 0
        },
        groupsAssigned: groups.length,
        panelLoadDistribution: {}
      };

      // Calculate statistics
      panels.forEach(panel => {
        panel.members.forEach(member => {
          statistics.totalPanelMembers++;
          if (member.role === 'conveyer') {
            statistics.conveyerCount++;
          } else {
            statistics.memberCount++;
          }

          statistics.departmentDistribution[member.department]++;
        });

        const panelId = String(panel._id);
        const groupsInPanel = groups.filter(g => String(g.panel) === panelId).length;
        statistics.panelLoadDistribution[panelId] = {
          panelNumber: panel.panelNumber,
          groupsAssigned: groupsInPanel
        };
      });

      return statistics;
    } catch (error) {
      console.error('Error getting panel statistics:', error);
      throw error;
    }
  }

  /**
   * Validate panel setup for a semester
   */
  async validatePanelSetup(academicYear, semester) {
    try {
      const config = await PanelConfiguration.findOne({ academicYear });
      if (!config) {
        return {
          valid: false,
          issues: ['No panel configuration found for this academic year']
        };
      }

      const panels = await Panel.find({
        academicYear,
        semester,
        isActive: true
      });

      const issues = [];

      // Check if panels exist
      if (panels.length === 0) {
        issues.push(`No panels created for semester ${semester}`);
      }

      // Check if each panel has correct number of members
      panels.forEach(panel => {
        if (panel.members.length !== config.panelSize) {
          issues.push(`Panel ${panel.panelNumber} has ${panel.members.length} members, expected ${config.panelSize}`);
        }

        // Check if conveyer exists
        const conveyer = panel.members.find(m => m.role === 'conveyer');
        if (!conveyer) {
          issues.push(`Panel ${panel.panelNumber} has no conveyer assigned`);
        }
      });

      // Check department distribution
      const deptCount = { CSE: 0, ECE: 0, ASH: 0 };
      panels.forEach(panel => {
        panel.members.forEach(member => {
          deptCount[member.department]++;
        });
      });

      for (const dept in config.departmentDistribution) {
        const required = config.departmentDistribution[dept] * panels.length;
        const actual = deptCount[dept];
        if (actual !== required) {
          issues.push(`${dept} department: expected ${required} members, have ${actual}`);
        }
      }

      return {
        valid: issues.length === 0,
        panelCount: panels.length,
        totalPanelMembers: panels.reduce((sum, p) => sum + p.members.length, 0),
        issues: issues
      };
    } catch (error) {
      console.error('Error validating panel setup:', error);
      throw error;
    }
  }

  /**
   * Bulk update panel configuration
   */
  async updateMultiplePanels(panelIds, updates) {
    try {
      const result = await Panel.updateMany(
        { _id: { $in: panelIds } },
        { $set: updates }
      );

      return {
        modifiedCount: result.modifiedCount,
        message: `Updated ${result.modifiedCount} panels`
      };
    } catch (error) {
      console.error('Error updating panels:', error);
      throw error;
    }
  }

  /**
   * Auto-assign conveyers to balance load
   */
  async autoBalanceConveyers(academicYear, semester) {
    try {
      const panels = await Panel.find({
        academicYear,
        semester,
        isActive: true
      }).populate('members.faculty', '_id');

      if (panels.length === 0) {
        throw new Error('No panels found');
      }

      // Get load for each faculty
      const facultyLoad = {};
      panels.forEach(panel => {
        panel.members.forEach(member => {
          const facultyId = String(member.faculty._id);
          if (!facultyLoad[facultyId]) {
            facultyLoad[facultyId] = { conveyer: 0, member: 0 };
          }
          if (member.role === 'conveyer') {
            facultyLoad[facultyId].conveyer++;
          } else {
            facultyLoad[facultyId].member++;
          }
        });
      });

      // Re-assign conveyers to balance
      let rebalancedCount = 0;
      panels.forEach(panel => {
        if (panel.members.length === 0) return;

        // Find member with lowest conveyer load
        let lowestLoadFaculty = panel.members[0];
        let lowestLoad = facultyLoad[String(lowestLoadFaculty.faculty._id)].conveyer;

        panel.members.forEach(member => {
          const load = facultyLoad[String(member.faculty._id)].conveyer;
          if (load < lowestLoad) {
            lowestLoad = load;
            lowestLoadFaculty = member;
          }
        });

        // Update roles
        const currentConveyer = panel.members.find(m => m.role === 'conveyer');
        if (currentConveyer && String(currentConveyer.faculty._id) !== String(lowestLoadFaculty.faculty._id)) {
          currentConveyer.role = 'member';
          lowestLoadFaculty.role = 'conveyer';
          facultyLoad[String(currentConveyer.faculty._id)].conveyer--;
          facultyLoad[String(lowestLoadFaculty.faculty._id)].conveyer++;
          rebalancedCount++;
        }
      });

      // Save all panels
      for (const panel of panels) {
        await panel.save();
      }

      return {
        rebalanced: rebalancedCount,
        message: `Rebalanced conveyer assignments in ${rebalancedCount} panels`
      };
    } catch (error) {
      console.error('Error auto-balancing conveyers:', error);
      throw error;
    }
  }
}

module.exports = new AdminPanelService();
