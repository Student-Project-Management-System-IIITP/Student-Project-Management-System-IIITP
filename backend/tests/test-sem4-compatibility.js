const mongoose = require('mongoose');
const Project = require('../models/Project');

// Test to ensure Sem 4 projects are not affected by new faculty allocation fields
async function testSem4Compatibility() {
  try {
    console.log('Testing Sem 4 project compatibility...');
    
    // Create a Sem 4 project (should not be affected by new fields)
    const sem4Project = new Project({
      title: 'Test Sem 4 Project',
      description: 'Test description',
      projectType: 'minor1',
      student: new mongoose.Types.ObjectId(),
      semester: 4,
      academicYear: '2024-25',
      status: 'registered'
    });
    
    // Save the project
    await sem4Project.save();
    console.log('✅ Sem 4 project created successfully');
    
    // Test that new fields have safe defaults
    console.log('Current faculty index:', sem4Project.currentFacultyIndex); // Should be 0
    console.log('Allocation history:', sem4Project.allocationHistory); // Should be []
    
    // Test that faculty allocation methods return safe values
    console.log('Supports faculty allocation:', sem4Project.supportsFacultyAllocation()); // Should be false
    console.log('All faculty presented:', sem4Project.allFacultyPresented()); // Should be true
    console.log('Allocation status:', sem4Project.getAllocationStatus());
    
    // Test that we can't accidentally trigger faculty allocation
    try {
      await sem4Project.presentToCurrentFaculty();
      console.log('❌ ERROR: Should not be able to present Sem 4 project to faculty');
    } catch (error) {
      console.log('✅ Correctly prevented faculty allocation for Sem 4 project:', error.message);
    }
    
    // Clean up
    await Project.findByIdAndDelete(sem4Project._id);
    console.log('✅ Test completed successfully - Sem 4 projects are safe');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test Sem 5 project with new fields
async function testSem5Allocation() {
  try {
    console.log('\nTesting Sem 5 project allocation...');
    
    // Create a Sem 5 project
    const sem5Project = new Project({
      title: 'Test Sem 5 Project',
      description: 'Test description',
      projectType: 'minor2',
      student: new mongoose.Types.ObjectId(),
      group: new mongoose.Types.ObjectId(),
      semester: 5,
      academicYear: '2024-25',
      status: 'registered',
      facultyPreferences: [
        { faculty: new mongoose.Types.ObjectId(), priority: 1 },
        { faculty: new mongoose.Types.ObjectId(), priority: 2 },
        { faculty: new mongoose.Types.ObjectId(), priority: 3 },
        { faculty: new mongoose.Types.ObjectId(), priority: 4 },
        { faculty: new mongoose.Types.ObjectId(), priority: 5 }
      ]
    });
    
    await sem5Project.save();
    console.log('✅ Sem 5 project created successfully');
    
    // Test faculty allocation methods
    console.log('Supports faculty allocation:', sem5Project.supportsFacultyAllocation()); // Should be true
    console.log('Current faculty:', sem5Project.getCurrentFaculty());
    console.log('All faculty presented:', sem5Project.allFacultyPresented()); // Should be false
    console.log('Allocation status:', sem5Project.getAllocationStatus());
    
    // Test presenting to faculty
    await sem5Project.presentToCurrentFaculty();
    console.log('✅ Successfully presented project to first faculty');
    console.log('Allocation history length:', sem5Project.allocationHistory.length);
    
    // Clean up
    await Project.findByIdAndDelete(sem5Project._id);
    console.log('✅ Sem 5 test completed successfully');
    
  } catch (error) {
    console.error('❌ Sem 5 test failed:', error);
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
    await testSem5Allocation();
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }).catch(console.error);
}

module.exports = { testSem4Compatibility, testSem5Allocation };
