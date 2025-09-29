// Quick script to update your student record to Semester 5 for testing
const mongoose = require('mongoose');
const Student = require('../models/Student');

async function updateStudentToSem5() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/spms');

    // Find your student record - UPDATE EMAIL HERE
    const yourEmail = 'your-current-email@iiitp.ac.in'; // CHANGE THIS
    
    const student = await Student.findOne({ collegeEmail: yourEmail });
    
    if (!student) {
      console.log('❌ Student record not found');
      return;
    }

    // Update to Semester 5
    student.semester = 5;
    student.academicYear = '2024-25';
    student.degree = 'B.Tech';
    
    await student.save();
    
    console.log('✅ Student record updated to Semester 5 for testing!');
    console.log(`📱 You can now test Sem 5 features with: ${yourEmail}`);
    
  } catch (error) {
    console.error('Error updating student:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
updateStudentToSem5();
