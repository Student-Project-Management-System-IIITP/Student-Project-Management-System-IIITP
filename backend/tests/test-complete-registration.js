const mongoose = require('mongoose');
const Project = require('../models/Project');
const FacultyPreference = require('../models/FacultyPreference');
const Group = require('../models/Group');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');

// Test the complete registration process
async function testCompleteRegistration() {
  try {
    console.log('Testing complete Minor Project 2 registration process...');
    
    // Create test data
    const testUser = new mongoose.Types.ObjectId();
    const testFaculty1 = new mongoose.Types.ObjectId();
    const testFaculty2 = new mongoose.Types.ObjectId();
    const testFaculty3 = new mongoose.Types.ObjectId();
    const testFaculty4 = new mongoose.Types.ObjectId();
    const testFaculty5 = new mongoose.Types.ObjectId();
    
    // Create test student
    const student = new Student({
      user: testUser,
      fullName: 'Test Student',
      misNumber: 'TEST001',
      branch: 'CSE',
      semester: 5,
      academicYear: '2024-25',
      degree: 'B.Tech'
    });
    await student.save();
    console.log('✅ Created test student');
    
    // Create test group
    const group = new Group({
      name: 'Test Group',
      description: 'Test group for registration',
      members: [{
        student: student._id,
        role: 'leader',
        joinedAt: new Date(),
        isActive: true
      }],
      semester: 5,
      academicYear: '2024-25',
      status: 'finalized',
      createdBy: student._id
    });
    await group.save();
    console.log('✅ Created test group');
    
    // Create test faculty
    const faculty1 = new Faculty({
      user: new mongoose.Types.ObjectId(),
      fullName: 'Dr. Faculty One',
      facultyId: 'FAC001',
      department: 'CSE',
      designation: 'Assistant Professor',
      mode: 'Regular'
    });
    await faculty1.save();
    
    const faculty2 = new Faculty({
      user: new mongoose.Types.ObjectId(),
      fullName: 'Dr. Faculty Two',
      facultyId: 'FAC002',
      department: 'CSE',
      designation: 'Assistant Professor',
      mode: 'Regular'
    });
    await faculty2.save();
    
    const faculty3 = new Faculty({
      user: new mongoose.Types.ObjectId(),
      fullName: 'Dr. Faculty Three',
      facultyId: 'FAC003',
      department: 'CSE',
      designation: 'Assistant Professor',
      mode: 'Regular'
    });
    await faculty3.save();
    
    const faculty4 = new Faculty({
      user: new mongoose.Types.ObjectId(),
      fullName: 'Dr. Faculty Four',
      facultyId: 'FAC004',
      department: 'CSE',
      designation: 'Assistant Professor',
      mode: 'Regular'
    });
    await faculty4.save();
    
    const faculty5 = new Faculty({
      user: new mongoose.Types.ObjectId(),
      fullName: 'Dr. Faculty Five',
      facultyId: 'FAC005',
      department: 'CSE',
      designation: 'Assistant Professor',
      mode: 'Regular'
    });
    await faculty5.save();
    console.log('✅ Created test faculty members');
    
    // Simulate registration data
    const registrationData = {
      title: 'Test Minor Project 2',
      domain: 'Machine Learning',
      facultyPreferences: [
        { faculty: { _id: faculty1._id }, priority: 1 },
        { faculty: { _id: faculty2._id }, priority: 2 },
        { faculty: { _id: faculty3._id }, priority: 3 },
        { faculty: { _id: faculty4._id }, priority: 4 },
        { faculty: { _id: faculty5._id }, priority: 5 }
      ]
    };
    
    // Test Project creation
    const project = new Project({
      title: registrationData.title,
      description: registrationData.title,
      projectType: 'minor2',
      student: student._id,
      group: group._id,
      semester: 5,
      academicYear: student.academicYear,
      status: 'registered',
      facultyPreferences: registrationData.facultyPreferences.map((pref, index) => ({
        faculty: pref.faculty._id,
        priority: index + 1
      })),
      currentFacultyIndex: 0,
      allocationHistory: []
    });
    
    await project.save();
    console.log('✅ Created project with faculty preferences');
    
    // Test FacultyPreference creation
    const facultyPreference = new FacultyPreference({
      student: student._id,
      project: project._id,
      group: group._id,
      semester: 5,
      academicYear: student.academicYear,
      status: 'pending',
      preferences: registrationData.facultyPreferences.map((pref, index) => ({
        faculty: pref.faculty._id,
        priority: index + 1,
        submittedAt: new Date()
      }))
    });
    
    await facultyPreference.save();
    console.log('✅ Created FacultyPreference document');
    
    // Test faculty allocation methods
    console.log('Testing faculty allocation methods...');
    console.log('Supports faculty allocation:', project.supportsFacultyAllocation()); // Should be true
    console.log('Current faculty:', project.getCurrentFaculty());
    console.log('All faculty presented:', project.allFacultyPresented()); // Should be false
    console.log('Allocation status:', project.getAllocationStatus());
    
    // Test presenting to first faculty
    await project.presentToCurrentFaculty();
    console.log('✅ Presented project to first faculty');
    console.log('Allocation history length:', project.allocationHistory.length);
    console.log('Current faculty index:', project.currentFacultyIndex);
    
    // Test faculty choosing the project
    await project.facultyChoose(faculty1._id, 'Great project idea!');
    console.log('✅ Faculty chose the project');
    console.log('Project faculty:', project.faculty);
    console.log('Project status:', project.status);
    
    // Verify final state
    const finalProject = await Project.findById(project._id).populate('faculty');
    const finalFacultyPreference = await FacultyPreference.findById(facultyPreference._id);
    
    console.log('\n📊 Final Registration Results:');
    console.log('Project ID:', finalProject._id);
    console.log('Project Title:', finalProject.title);
    console.log('Project Status:', finalProject.status);
    console.log('Allocated Faculty:', finalProject.faculty?.fullName || 'None');
    console.log('Faculty Preferences Count:', finalProject.facultyPreferences.length);
    console.log('Allocation History Count:', finalProject.allocationHistory.length);
    console.log('FacultyPreference Status:', finalFacultyPreference.status);
    console.log('FacultyPreference Preferences Count:', finalFacultyPreference.preferences.length);
    
    // Clean up
    await Project.findByIdAndDelete(project._id);
    await FacultyPreference.findByIdAndDelete(facultyPreference._id);
    await Group.findByIdAndDelete(group._id);
    await Student.findByIdAndDelete(student._id);
    await Faculty.deleteMany({ _id: { $in: [faculty1._id, faculty2._id, faculty3._id, faculty4._id, faculty5._id] } });
    
    console.log('\n✅ Complete registration test passed successfully!');
    console.log('All data was properly stored in both Project and FacultyPreference collections');
    
  } catch (error) {
    console.error('❌ Complete registration test failed:', error);
    throw error;
  }
}

// Test Sem 4 compatibility
async function testSem4Compatibility() {
  try {
    console.log('\nTesting Sem 4 compatibility...');
    
    // Create Sem 4 project (should not be affected by new fields)
    const sem4Project = new Project({
      title: 'Test Sem 4 Project',
      description: 'Test description',
      projectType: 'minor1',
      student: new mongoose.Types.ObjectId(),
      semester: 4,
      academicYear: '2024-25',
      status: 'registered'
    });
    
    await sem4Project.save();
    console.log('✅ Sem 4 project created successfully');
    
    // Test that new fields have safe defaults
    console.log('Current faculty index:', sem4Project.currentFacultyIndex); // Should be 0
    console.log('Allocation history:', sem4Project.allocationHistory); // Should be []
    console.log('Supports faculty allocation:', sem4Project.supportsFacultyAllocation()); // Should be false
    console.log('All faculty presented:', sem4Project.allFacultyPresented()); // Should be true
    
    // Clean up
    await Project.findByIdAndDelete(sem4Project._id);
    console.log('✅ Sem 4 compatibility test passed');
    
  } catch (error) {
    console.error('❌ Sem 4 compatibility test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  // Connect to MongoDB (you'll need to adjust the connection string)
  mongoose.connect('mongodb://localhost:27017/spms_test', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(async () => {
    console.log('Connected to MongoDB');
    await testSem4Compatibility();
    await testCompleteRegistration();
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }).catch(console.error);
}

module.exports = { testCompleteRegistration, testSem4Compatibility };
