const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Faculty = require('../models/Faculty');
const Project = require('../models/Project');
const Group = require('../models/Group');

const SEED_DATA = {
  // CSE Department Faculty (9)
  cse_faculty: [
    { name: 'Dr. Amit Kumar', department: 'CSE', email: 'amit.kumar@example.com' },
    { name: 'Dr. Priya Sharma', department: 'CSE', email: 'priya.sharma@example.com' },
    { name: 'Dr. Rajesh Patel', department: 'CSE', email: 'rajesh.patel@example.com' },
    { name: 'Prof. Neha Singh', department: 'CSE', email: 'neha.singh@example.com' },
    { name: 'Dr. Vikram Gupta', department: 'CSE', email: 'vikram.gupta@example.com' },
    { name: 'Prof. Anjali Verma', department: 'CSE', email: 'anjali.verma@example.com' },
    { name: 'Dr. Aditya Joshi', department: 'CSE', email: 'aditya.joshi@example.com' },
    { name: 'Prof. Sneha Tripathi', department: 'CSE', email: 'sneha.tripathi@example.com' },
    { name: 'Dr. Rohan Nair', department: 'CSE', email: 'rohan.nair@example.com' }
  ],

  // ECE Department Faculty (9)
  ece_faculty: [
    { name: 'Dr. Ravi Mehta', department: 'ECE', email: 'ravi.mehta@example.com' },
    { name: 'Prof. Deepika Rao', department: 'ECE', email: 'deepika.rao@example.com' },
    { name: 'Dr. Sanjay Mittal', department: 'ECE', email: 'sanjay.mittal@example.com' },
    { name: 'Prof. Pooja Desai', department: 'ECE', email: 'pooja.desai@example.com' },
    { name: 'Dr. Nikhil Chopra', department: 'ECE', email: 'nikhil.chopra@example.com' },
    { name: 'Prof. Ananya Kulkarni', department: 'ECE', email: 'ananya.kulkarni@example.com' },
    { name: 'Dr. Manoj Yadav', department: 'ECE', email: 'manoj.yadav@example.com' },
    { name: 'Prof. Kavya Reddy', department: 'ECE', email: 'kavya.reddy@example.com' },
    { name: 'Dr. Suresh Kumar', department: 'ECE', email: 'suresh.kumar@example.com' }
  ],

  // ASH Department Faculty (9)
  ash_faculty: [
    { name: 'Dr. Ashok Singh', department: 'ASH', email: 'ashok.singh@example.com' },
    { name: 'Prof. Divya Arora', department: 'ASH', email: 'divya.arora@example.com' },
    { name: 'Dr. Karan Malhotra', department: 'ASH', email: 'karan.malhotra@example.com' },
    { name: 'Prof. Meera Bhat', department: 'ASH', email: 'meera.bhat@example.com' },
    { name: 'Dr. Vikrant Singh', department: 'ASH', email: 'vikrant.singh@example.com' },
    { name: 'Prof. Latika Nambiar', department: 'ASH', email: 'latika.nambiar@example.com' },
    { name: 'Dr. Harish Kapoor', department: 'ASH', email: 'harish.kapoor@example.com' },
    { name: 'Prof. Nisha Saxena', department: 'ASH', email: 'nisha.saxena@example.com' },
    { name: 'Dr. Praveen Kumar', department: 'ASH', email: 'praveen.kumar@example.com' }
  ],

  // Sample Projects (30)
  projects: [
    { code: 'PROJ001', title: 'AI-based Chatbot System', description: 'Build intelligent chatbot using NLP' },
    { code: 'PROJ002', title: 'Mobile Banking App', description: 'Secure mobile banking application' },
    { code: 'PROJ003', title: 'IoT Smart Home', description: 'Smart home automation system' },
    { code: 'PROJ004', title: 'E-Commerce Platform', description: 'Full-stack e-commerce solution' },
    { code: 'PROJ005', title: 'Real-time Chat Application', description: 'WebSocket-based messaging platform' },
    { code: 'PROJ006', title: 'Machine Learning Recommender', description: 'Recommendation engine using ML' },
    { code: 'PROJ007', title: 'Blockchain Supply Chain', description: 'Supply chain tracking using blockchain' },
    { code: 'PROJ008', title: 'Cloud Storage System', description: 'Distributed file storage system' },
    { code: 'PROJ009', title: 'Video Streaming Platform', description: 'Streaming service like YouTube' },
    { code: 'PROJ010', title: 'Data Visualization Dashboard', description: 'Real-time analytics dashboard' },
    { code: 'PROJ011', title: 'Social Media Network', description: 'Social networking platform' },
    { code: 'PROJ012', title: 'Fitness Tracking App', description: 'Health and fitness tracking application' },
    { code: 'PROJ013', title: 'Weather Forecasting App', description: 'Real-time weather prediction' },
    { code: 'PROJ014', title: 'Restaurant Booking System', description: 'Online restaurant reservation' },
    { code: 'PROJ015', title: 'Learning Management System', description: 'LMS for online courses' },
    { code: 'PROJ016', title: 'Online Auction Platform', description: 'Bidding and auction system' },
    { code: 'PROJ017', title: 'Task Management Tool', description: 'Project collaboration tool' },
    { code: 'PROJ018', title: 'News Aggregator', description: 'RSS and news aggregation platform' },
    { code: 'PROJ019', title: 'Travel Booking Engine', description: 'Flight and hotel booking system' },
    { code: 'PROJ020', title: 'Expense Tracker', description: 'Personal finance management app' },
    { code: 'PROJ021', title: 'Online Quiz Platform', description: 'Interactive quiz and assessment system' },
    { code: 'PROJ022', title: 'Job Portal', description: 'Job search and recruitment platform' },
    { code: 'PROJ023', title: 'Medical Records System', description: 'Healthcare record management' },
    { code: 'PROJ024', title: 'Automated Testing Framework', description: 'QA automation tool' },
    { code: 'PROJ025', title: 'Crowdfunding Platform', description: 'Kickstarter-like platform' },
    { code: 'PROJ026', title: 'Image Recognition System', description: 'Computer vision application' },
    { code: 'PROJ027', title: 'Virtual Reality Game', description: 'Immersive gaming experience' },
    { code: 'PROJ028', title: 'Traffic Management System', description: 'Smart traffic control' },
    { code: 'PROJ029', title: 'Cryptocurrency Wallet', description: 'Digital wallet for crypto' },
    { code: 'PROJ030', title: 'Environmental Monitoring', description: 'IoT-based environmental tracking' }
  ]
};

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('📦 Connected to MongoDB\n');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Faculty.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    console.log('✅ Cleaned database\n');

    // Seed Faculty
    console.log('👨‍🏫 Seeding Faculty...');
    const allFaculty = [
      ...SEED_DATA.cse_faculty,
      ...SEED_DATA.ece_faculty,
      ...SEED_DATA.ash_faculty
    ];
    const createdFaculty = await Faculty.insertMany(allFaculty);
    console.log(`✅ Created ${createdFaculty.length} faculty members\n`);

    // Seed Projects
    console.log('📋 Seeding Projects...');
    const createdProjects = await Project.insertMany(SEED_DATA.projects);
    console.log(`✅ Created ${createdProjects.length} projects\n`);

    // Seed Groups with Projects
    console.log('👥 Seeding Groups...');
    const groups = [];
    for (let i = 0; i < createdProjects.length; i++) {
      const project = createdProjects[i];
      groups.push({
        code: `GROUP${String(i + 1).padStart(3, '0')}`,
        projectId: project._id,
        semester: 5,
        academicYear: '2025-26',
        members: [
          { name: `Student ${i * 3 + 1}`, email: `student${i * 3 + 1}@example.com`, rollNo: `CS${String(i * 3 + 1).padStart(4, '0')}` },
          { name: `Student ${i * 3 + 2}`, email: `student${i * 3 + 2}@example.com`, rollNo: `CS${String(i * 3 + 2).padStart(4, '0')}` },
          { name: `Student ${i * 3 + 3}`, email: `student${i * 3 + 3}@example.com`, rollNo: `CS${String(i * 3 + 3).padStart(4, '0')}` }
        ]
      });
    }
    const createdGroups = await Group.insertMany(groups);
    console.log(`✅ Created ${createdGroups.length} groups\n`);

    // Print Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Database Seeding Complete!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`
📊 SUMMARY:
  👨‍🏫 Faculty: 27 (9 CSE + 9 ECE + 9 ASH)
  📋 Projects: 30
  👥 Groups: 30 (3 students each)
  🎓 Academic Year: 2025-26
  📅 Semester: 5

🔍 DEPARTMENTS:
  - CSE: ${allFaculty.filter(f => f.department === 'CSE').length} faculty
  - ECE: ${allFaculty.filter(f => f.department === 'ECE').length} faculty
  - ASH: ${allFaculty.filter(f => f.department === 'ASH').length} faculty

Ready for testing! You can now:
1. Configure panels for 27 professors
2. Generate balanced panels (1/3 each department)
3. Assign groups to panels
4. Submit evaluations
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
