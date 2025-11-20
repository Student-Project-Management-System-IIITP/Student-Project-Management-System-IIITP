const mongoose = require('mongoose');
const Project = require('../models/Project');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spms';

async function fixInternship2Projects() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all projects that should be Internship 2 but are marked as Internship 1
    // Criteria: semester 8, projectType internship1, student is Type 1 (completed 6-month internship in Sem 7)
    const projects = await Project.find({
      semester: 8,
      projectType: 'internship1'
    }).populate('student');

    console.log(`Found ${projects.length} projects with semester 8 and projectType internship1`);

    let fixedCount = 0;
    for (const project of projects) {
      // Check if this should be Internship 2
      // For now, we'll fix all Sem 8 internship1 projects, but you can add more specific checks
      const student = project.student;
      if (student && student.semester === 8) {
        console.log(`Fixing project ${project._id} - Changing projectType from internship1 to internship2`);
        project.projectType = 'internship2';
        await project.save();
        fixedCount++;
        console.log(`Fixed project ${project._id}`);
      }
    }

    console.log(`\nFixed ${fixedCount} projects`);
    console.log('Done!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixInternship2Projects();

