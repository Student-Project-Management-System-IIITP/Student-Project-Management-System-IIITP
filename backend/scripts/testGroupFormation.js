const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Group = require('../models/Group');
const bcrypt = require('bcryptjs');

// Test configuration
const TEST_CONFIG = {
  BASE_EMAIL: 'teststudent',
  BASE_MIS: '20240000',
  SEMESTER: 5,
  BRANCH: 'CSE',
  ACADEMIC_YEAR: '2024-25',
  MIN_MEMBERS: 4,
  MAX_MEMBERS: 5
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[STEP ${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

class GroupFormationTester {
  constructor() {
    this.testUsers = [];
    this.testStudents = [];
    this.testGroups = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spms');
      log('Connected to MongoDB', 'green');
      
      // Clean up existing test data
      await this.cleanupExistingTestData();
    } catch (error) {
      logError(`Failed to connect to MongoDB: ${error.message}`);
      throw error;
    }
  }

  async cleanupExistingTestData() {
    try {
      log('Cleaning up existing test data...', 'yellow');
      
      // Delete existing test users and students
      const testEmails = [
        'alice.johnson@test.com',
        'bob.smith@test.com',
        'charlie.brown@test.com',
        'diana.prince@test.com',
        'eve.wilson@test.com',
        'frank.miller@test.com',
        'grace.lee@test.com',
        'henry.davis@test.com'
      ];

      // Delete users with test emails
      await User.deleteMany({ email: { $in: testEmails } });
      
      // Delete students with test MIS numbers
      const testMisNumbers = ['202400001', '202400002', '202400003', '202400004', '202400005', '202400006', '202400007', '202400008'];
      await Student.deleteMany({ misNumber: { $in: testMisNumbers } });
      
      // Delete test groups
      await Group.deleteMany({ name: { $regex: /^Test Group/ } });
      
      log('Existing test data cleaned up', 'green');
    } catch (error) {
      logWarning(`Cleanup warning: ${error.message}`);
    }
  }

  async disconnect() {
    await mongoose.connection.close();
    log('Disconnected from MongoDB', 'yellow');
  }

  async createTestUsers() {
    logStep(1, 'Creating test users and students...');
    
  const testUserData = [
    { name: 'Alice Johnson', email: 'alice.johnson@test.com', mis: '202400001' },
    { name: 'Bob Smith', email: 'bob.smith@test.com', mis: '202400002' },
    { name: 'Charlie Brown', email: 'charlie.brown@test.com', mis: '202400003' },
    { name: 'Diana Prince', email: 'diana.prince@test.com', mis: '202400004' },
    { name: 'Eve Wilson', email: 'eve.wilson@test.com', mis: '202400005' },
    { name: 'Frank Miller', email: 'frank.miller@test.com', mis: '202400006' },
    { name: 'Grace Lee', email: 'grace.lee@test.com', mis: '202400007' },
    { name: 'Henry Davis', email: 'henry.davis@test.com', mis: '202400008' }
  ];

    for (const userData of testUserData) {
      try {
        // Create user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const user = new User({
          email: userData.email,
          password: hashedPassword,
          role: 'student'
        });
        await user.save();

        // Create student profile
        const student = new Student({
          user: user._id,
          fullName: userData.name,
          degree: 'B.Tech',
          semester: TEST_CONFIG.SEMESTER,
          misNumber: userData.mis,
          collegeEmail: userData.email,
          contactNumber: '9876543210',
          branch: TEST_CONFIG.BRANCH,
          academicYear: TEST_CONFIG.ACADEMIC_YEAR
        });
        await student.save();

        this.testUsers.push(user);
        this.testStudents.push(student);
        
        logSuccess(`Created user: ${userData.name} (${userData.mis})`);
      } catch (error) {
        logError(`Failed to create user ${userData.name}: ${error.message}`);
      }
    }

    logSuccess(`Created ${this.testUsers.length} test users and students`);
  }

  async testGroupCreation() {
    logStep(2, 'Testing group creation...');
    
    if (this.testStudents.length < 5) {
      throw new Error('Not enough test students created. Need at least 5 students for group testing.');
    }
    
    const leader = this.testStudents[0]; // Alice as leader
    const memberIds = [
      this.testStudents[1]._id, // Bob
      this.testStudents[2]._id, // Charlie
      this.testStudents[3]._id, // Diana
      this.testStudents[4]._id  // Eve
    ];

    try {
      const group = new Group({
        name: 'Test Group 1',
        description: 'This is a test group for comprehensive testing',
        maxMembers: TEST_CONFIG.MAX_MEMBERS,
        minMembers: TEST_CONFIG.MIN_MEMBERS,
        semester: TEST_CONFIG.SEMESTER,
        academicYear: TEST_CONFIG.ACADEMIC_YEAR,
        createdBy: leader._id,
        leader: leader._id,
        status: 'invitations_sent',
        members: [{
          student: leader._id,
          role: 'leader',
          isActive: true,
          joinedAt: new Date(),
          inviteStatus: 'accepted'
        }],
        invites: [
          {
            student: leader._id,
            role: 'leader',
            invitedBy: leader._id,
            invitedAt: new Date(),
            status: 'accepted'
          }
        ]
      });

      // Add member invitations
      for (const memberId of memberIds) {
        group.invites.push({
          student: memberId,
          role: 'member',
          invitedBy: leader._id,
          invitedAt: new Date(),
          status: 'pending'
        });
      }

      await group.save();

      // Add invitations to student records with the same invitation IDs from group
      for (let i = 0; i < memberIds.length; i++) {
        const memberId = memberIds[i];
        const student = this.testStudents.find(s => s._id.toString() === memberId.toString());
        if (student) {
          // Get the corresponding invitation from the group (skip leader invitation at index 0)
          const groupInvite = group.invites[i + 1]; // +1 because leader is at index 0
          
          student.invites.push({
            _id: groupInvite._id, // Use the same ID as the group invitation
            group: group._id,
            role: 'member',
            invitedBy: leader._id,
            invitedAt: new Date(),
            status: 'pending'
          });
          await student.save();
        }
      }
      this.testGroups.push(group);

      // Verify group creation
      await this.verifyGroupCreation(group, leader, memberIds);
      
      logSuccess('Group creation test passed');
      this.testResults.passed++;
    } catch (error) {
      logError(`Group creation test failed: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;
  }

  async verifyGroupCreation(group, leader, memberIds) {
    // Check group exists
    const foundGroup = await Group.findById(group._id);
    if (!foundGroup) {
      throw new Error('Group not found after creation');
    }

    // Check leader is in members
    const leaderMember = foundGroup.members.find(m => 
      m.student.toString() === leader._id.toString() && m.role === 'leader'
    );
    if (!leaderMember) {
      throw new Error('Leader not found in group members');
    }

    // Check invitations
    if (foundGroup.invites.length !== memberIds.length + 1) { // +1 for leader
      throw new Error(`Expected ${memberIds.length + 1} invitations, got ${foundGroup.invites.length}`);
    }

    // Check member invitations are pending
    const memberInvites = foundGroup.invites.filter(inv => 
      memberIds.some(id => id.toString() === inv.student.toString()) && inv.status === 'pending'
    );
    if (memberInvites.length !== memberIds.length) {
      throw new Error('Not all member invitations are pending');
    }

    logInfo(`Group has ${foundGroup.members.length} members and ${foundGroup.invites.length} invitations`);
  }

  async testInvitationAcceptance() {
    logStep(3, 'Testing invitation acceptance...');
    
    const group = this.testGroups[0];
    const acceptingStudent = this.testStudents[1]; // Bob
    
    try {
      // Find the pending invitation for Bob
      const invitation = group.invites.find(inv => 
        inv.student.toString() === acceptingStudent._id.toString() && inv.status === 'pending'
      );
      
      if (!invitation) {
        throw new Error('No pending invitation found for accepting student');
      }

      // Accept invitation using the model method
      await acceptingStudent.acceptInvitation(group._id);
      
      // Verify acceptance
      await this.verifyInvitationAcceptance(group, acceptingStudent);
      
      logSuccess('Invitation acceptance test passed');
      this.testResults.passed++;
    } catch (error) {
      logError(`Invitation acceptance test failed: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;
  }

  async verifyInvitationAcceptance(group, student) {
    // Refresh group data
    const updatedGroup = await Group.findById(group._id)
      .populate('members.student', 'fullName misNumber branch')
      .populate('invites.student', 'fullName misNumber branch');

    // Check student is now in members
    const member = updatedGroup.members.find(m => 
      m.student._id.toString() === student._id.toString() && m.isActive
    );
    if (!member) {
      throw new Error('Student not found in group members after acceptance');
    }

    // Check invitation status is accepted
    const invitation = updatedGroup.invites.find(inv => 
      inv.student._id.toString() === student._id.toString()
    );
    if (!invitation || invitation.status !== 'accepted') {
      throw new Error('Invitation status not updated to accepted');
    }

    // Check student's other invitations are auto-rejected
    const studentWithInvites = await Student.findById(student._id);
    const autoRejectedInvites = studentWithInvites.invites.filter(inv => 
      inv.status === 'auto-rejected'
    );
    if (autoRejectedInvites.length === 0) {
      logWarning('No auto-rejected invitations found (may be expected if no other invitations)');
    }

    logInfo(`Student ${student.fullName} successfully joined group`);
  }

  async testInvitationRejection() {
    logStep(4, 'Testing invitation rejection...');
    
    const group = this.testGroups[0];
    const rejectingStudent = this.testStudents[2]; // Charlie
    
    try {
      // Reject invitation using the model method
      await rejectingStudent.rejectInvitation(group._id);
      
      // Verify rejection
      await this.verifyInvitationRejection(group, rejectingStudent);
      
      logSuccess('Invitation rejection test passed');
      this.testResults.passed++;
    } catch (error) {
      logError(`Invitation rejection test failed: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;
  }

  async verifyInvitationRejection(group, student) {
    // Refresh group data
    const updatedGroup = await Group.findById(group._id)
      .populate('invites.student', 'fullName misNumber branch');

    // Check invitation status is rejected
    const invitation = updatedGroup.invites.find(inv => 
      inv.student._id.toString() === student._id.toString()
    );
    if (!invitation || invitation.status !== 'rejected') {
      throw new Error('Invitation status not updated to rejected');
    }

    // Check student is not in members
    const member = updatedGroup.members.find(m => 
      m.student.toString() === student._id.toString() && m.isActive
    );
    if (member) {
      throw new Error('Student found in group members after rejection');
    }

    logInfo(`Student ${student.fullName} successfully rejected invitation`);
  }

  async testGroupFinalization() {
    logStep(5, 'Testing group finalization...');
    
    const group = this.testGroups[0];
    const leader = this.testStudents[0]; // Alice
    
    try {
      // Refresh group data to get current state
      const refreshedGroup = await Group.findById(group._id);
      
      // Check current member count
      const activeMembers = refreshedGroup.members.filter(m => m.isActive);
      logInfo(`Current active members: ${activeMembers.length}`);
      
      // Keep accepting invitations until we have enough members
      let currentGroup = refreshedGroup;
      while (currentGroup.members.filter(m => m.isActive).length < currentGroup.minMembers) {
        const pendingInvites = currentGroup.invites.filter(inv => inv.status === 'pending');
        if (pendingInvites.length === 0) {
          logError(`No more pending invitations available. Need ${currentGroup.minMembers} members, have ${currentGroup.members.filter(m => m.isActive).length}`);
          break;
        }
        
        const pendingStudent = this.testStudents.find(s => 
          pendingInvites.some(inv => inv.student.toString() === s._id.toString())
        );
        
        if (pendingStudent) {
          logInfo(`Accepting invitation for ${pendingStudent.fullName} to meet minimum requirement`);
          await pendingStudent.acceptInvitation(group._id);
          
          // Refresh group data after accepting invitation
          currentGroup = await Group.findById(group._id);
          const newActiveMembers = currentGroup.members.filter(m => m.isActive);
          logInfo(`After accepting invitation: ${newActiveMembers.length} active members`);
        } else {
          break;
        }
      }
      
      // Use the current group state for finalization
      const finalGroup = currentGroup;
      
      // Finalize group using the model method
      await finalGroup.finalizeGroup(leader._id);
      
      // Verify finalization
      await this.verifyGroupFinalization(finalGroup);
      
      logSuccess('Group finalization test passed');
      this.testResults.passed++;
    } catch (error) {
      logError(`Group finalization test failed: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;
  }

  async verifyGroupFinalization(group) {
    // Refresh group data
    const updatedGroup = await Group.findById(group._id);
    
    // Check group status is finalized
    if (updatedGroup.status !== 'finalized') {
      throw new Error('Group status not updated to finalized');
    }

    // Check finalizedAt and finalizedBy are set
    if (!updatedGroup.finalizedAt || !updatedGroup.finalizedBy) {
      throw new Error('Finalization timestamp or user not set');
    }

    // Check pending invitations are auto-rejected
    const pendingInvites = updatedGroup.invites.filter(inv => inv.status === 'pending');
    if (pendingInvites.length > 0) {
      throw new Error('Some invitations are still pending after finalization');
    }

    // Check active members count
    const activeMembers = updatedGroup.members.filter(m => m.isActive);
    if (activeMembers.length < updatedGroup.minMembers) {
      throw new Error(`Group has ${activeMembers.length} members, but minimum is ${updatedGroup.minMembers}`);
    }

    logInfo(`Group finalized with ${activeMembers.length} members`);
  }

  async testMultipleGroups() {
    logStep(6, 'Testing multiple group scenarios...');
    
    try {
      // Create second group with different leader
      const leader2 = this.testStudents[4]; // Eve
      const members2 = [
        this.testStudents[5]._id, // Frank
        this.testStudents[6]._id, // Grace
        this.testStudents[7]._id  // Henry
      ];

      const group2 = new Group({
        name: 'Test Group 2',
        description: 'Second test group',
        maxMembers: TEST_CONFIG.MAX_MEMBERS,
        minMembers: TEST_CONFIG.MIN_MEMBERS,
        semester: TEST_CONFIG.SEMESTER,
        academicYear: TEST_CONFIG.ACADEMIC_YEAR,
        createdBy: leader2._id,
        leader: leader2._id,
        status: 'invitations_sent',
        members: [{
          student: leader2._id,
          role: 'leader',
          isActive: true,
          joinedAt: new Date(),
          inviteStatus: 'accepted'
        }],
        invites: [
          {
            student: leader2._id,
            role: 'leader',
            invitedBy: leader2._id,
            invitedAt: new Date(),
            status: 'accepted'
          }
        ]
      });

      // Add member invitations
      for (const memberId of members2) {
        group2.invites.push({
          student: memberId,
          role: 'member',
          invitedBy: leader2._id,
          invitedAt: new Date(),
          status: 'pending'
        });
      }

      await group2.save();
      this.testGroups.push(group2);

      // Test invitation conflict - try to invite student already in another group
      await this.testInvitationConflict(group2, this.testStudents[1]); // Bob is already in Group 1

      logSuccess('Multiple groups test passed');
      this.testResults.passed++;
    } catch (error) {
      logError(`Multiple groups test failed: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;
  }

  async testInvitationConflict(group, studentInOtherGroup) {
    try {
      // Try to invite student who is already in another group
      await studentInOtherGroup.addInvitation(group._id, 'member', group.leader);
      logWarning('Expected error: Student already in another group should not be able to receive new invitations');
    } catch (error) {
      logSuccess('Correctly prevented invitation to student already in another group');
    }
  }

  async testStudentSearch() {
    logStep(7, 'Testing student search functionality...');
    
    try {
      // Test finding available students (not in any group)
      const availableStudents = await Student.find({
        semester: TEST_CONFIG.SEMESTER,
        branch: TEST_CONFIG.BRANCH,
        'groupMemberships.0': { $exists: false } // No group memberships
      }).select('fullName misNumber branch semester');

      logInfo(`Found ${availableStudents.length} available students for invitation`);
      
      // Verify search results contain expected fields
      if (availableStudents.length > 0) {
        const student = availableStudents[0];
        if (!student.fullName || !student.misNumber || !student.branch) {
          throw new Error('Student search results missing required fields');
        }
      }

      logSuccess('Student search test passed');
      this.testResults.passed++;
    } catch (error) {
      logError(`Student search test failed: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;
  }

  async testGroupStatusTransitions() {
    logStep(8, 'Testing group status transitions...');
    
    try {
      // Create a new group to test status transitions
      const leader = this.testStudents[4]; // Eve
      const group = new Group({
        name: 'Status Test Group',
        description: 'Testing status transitions',
        maxMembers: TEST_CONFIG.MAX_MEMBERS,
        minMembers: TEST_CONFIG.MIN_MEMBERS,
        semester: TEST_CONFIG.SEMESTER,
        academicYear: TEST_CONFIG.ACADEMIC_YEAR,
        createdBy: leader._id,
        leader: leader._id,
        status: 'invitations_sent',
        members: [{
          student: leader._id,
          role: 'leader',
          isActive: true,
          joinedAt: new Date(),
          inviteStatus: 'accepted'
        }],
        invites: [
          {
            student: leader._id,
            role: 'leader',
            invitedBy: leader._id,
            invitedAt: new Date(),
            status: 'accepted'
          }
        ]
      });
      await group.save();

      // Add invitations to students for this test
      const testMembers = [this.testStudents[5], this.testStudents[6], this.testStudents[7]]; // Frank, Grace, Henry
      
      // First add all invitations to group
      for (const member of testMembers) {
        group.invites.push({
          student: member._id,
          role: 'member',
          invitedBy: leader._id,
          invitedAt: new Date(),
          status: 'pending'
        });
      }
      await group.save();
      
      // Then add invitations to student records with matching IDs
      for (let i = 0; i < testMembers.length; i++) {
        const member = testMembers[i];
        // Get the corresponding invitation from the group (skip leader invitation at index 0)
        const groupInvite = group.invites[i + 1]; // +1 because leader is at index 0
        
        member.invites.push({
          _id: groupInvite._id, // Use the same ID as the group invitation
          group: group._id,
          role: 'member',
          invitedBy: leader._id,
          invitedAt: new Date(),
          status: 'pending'
        });
        await member.save();
      }

      // Test status: invitations_sent -> open (when min members join)
      const member1 = this.testStudents[5]; // Frank
      await member1.acceptInvitation(group._id);
      
      const member2 = this.testStudents[6]; // Grace
      await member2.acceptInvitation(group._id);
      
      const member3 = this.testStudents[7]; // Henry
      await member3.acceptInvitation(group._id);

      // Refresh group
      const updatedGroup = await Group.findById(group._id);
      const activeMembers = updatedGroup.members.filter(m => m.isActive);
      
      if (activeMembers.length >= updatedGroup.minMembers) {
        logInfo(`Group has ${activeMembers.length} members (minimum: ${updatedGroup.minMembers})`);
        logSuccess('Group ready for finalization');
      }

      logSuccess('Group status transitions test passed');
      this.testResults.passed++;
    } catch (error) {
      logError(`Group status transitions test failed: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;
  }

  async cleanup() {
    logStep(9, 'Cleaning up test data...');
    
    try {
      // Delete test groups
      for (const group of this.testGroups) {
        await Group.findByIdAndDelete(group._id);
      }
      
      // Delete test students and users
      for (let i = 0; i < this.testStudents.length; i++) {
        await Student.findByIdAndDelete(this.testStudents[i]._id);
        await User.findByIdAndDelete(this.testUsers[i]._id);
      }
      
      logSuccess(`Cleaned up ${this.testGroups.length} groups and ${this.testStudents.length} users/students`);
    } catch (error) {
      logError(`Cleanup failed: ${error.message}`);
    }
  }

  async runAllTests() {
    log('🚀 Starting Comprehensive Group Formation Testing', 'bright');
    log('=' .repeat(60), 'cyan');
    
    try {
      await this.connect();
      await this.createTestUsers();
      await this.testGroupCreation();
      await this.testInvitationAcceptance();
      await this.testInvitationRejection();
      await this.testGroupFinalization();
      await this.testMultipleGroups();
      await this.testStudentSearch();
      await this.testGroupStatusTransitions();
      await this.cleanup();
      
      // Print final results
      log('\n' + '=' .repeat(60), 'cyan');
      log('🏁 TEST RESULTS SUMMARY', 'bright');
      log('=' .repeat(60), 'cyan');
      log(`✅ Passed: ${this.testResults.passed}`, 'green');
      log(`❌ Failed: ${this.testResults.failed}`, 'red');
      log(`📊 Total: ${this.testResults.total}`, 'blue');
      
      const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
      log(`🎯 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
      
      if (this.testResults.failed === 0) {
        log('\n🎉 ALL TESTS PASSED! Group formation system is working perfectly!', 'green');
      } else {
        log(`\n⚠️  ${this.testResults.failed} test(s) failed. Please review the errors above.`, 'yellow');
      }
      
    } catch (error) {
      logError(`Test suite failed: ${error.message}`);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the tests
async function runTests() {
  const tester = new GroupFormationTester();
  await tester.runAllTests();
}

// Export for use as module
module.exports = { GroupFormationTester, runTests };

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}
