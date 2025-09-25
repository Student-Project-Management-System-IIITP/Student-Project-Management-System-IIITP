const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Admin = require('./models/Admin');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Close database connection
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
};

// Admin data to be added
const adminData = [
  {
    // User data
    name: "Amrut Pathane",
    email: "pathaneamrut@gmail.com",
    password: "Amrut@123", // Change this to a secure password
    phone: "8600947050",
    role: "admin",
    
    // Admin specific data
    adminId: "ADMIN001",
    department: "Administration",
    designation: "Super Admin",
    isSuperAdmin: true
  },
  {
    // User data
    name: "Anurag Kawade",
    email: "anurag.workzone@gmail.com",
    password: "Anurag@123", // Change this to a secure password
    phone: "7276570717",
    role: "admin",
    
    // Admin specific data
    adminId: "ADMIN002",
    department: "Administration",
    designation: "Super Admin",
    isSuperAdmin: true
  },
  {
    // User data
    name: "Mohd Samar",
    email: "mohdsamarbinmehtab0786@gmail.com",
    password: "Samar@123", // Change this to a secure password
    phone: "9621972940",
    role: "admin",
    
    // Admin specific data
    adminId: "ADMIN003",
    department: "Administration",
    designation: "Super Admin",
    isSuperAdmin: true
  },
  {
    // User data
    name: "Omkar Dhumal",
    email: "omkardhumal@gmail.com",
    password: "Omkar@123", // Change this to a secure password
    phone: "9876543210",
    role: "admin",
    
    // Admin specific data
    adminId: "ADMIN004",
    department: "Administration",
    designation: "Super Admin",
    isSuperAdmin: true
  }
];

// Function to create admin users
const createAdminUsers = async () => {
  try {
    console.log('🚀 Starting admin user creation process...\n');

    for (const adminInfo of adminData) {
      console.log(`📝 Creating admin: ${adminInfo.name} (${adminInfo.email})`);

      // Check if user already exists
      const existingUser = await User.findOne({ email: adminInfo.email });
      if (existingUser) {
        console.log(`⚠️  User with email ${adminInfo.email} already exists. Skipping...`);
        continue;
      }

      // Check if admin ID already exists
      const existingAdmin = await Admin.findOne({ adminId: adminInfo.adminId });
      if (existingAdmin) {
        console.log(`⚠️  Admin with ID ${adminInfo.adminId} already exists. Skipping...`);
        continue;
      }

      // Create User document
      const userData = {
        name: adminInfo.name,
        email: adminInfo.email,
        password: adminInfo.password,
        phone: adminInfo.phone,
        role: adminInfo.role
      };

      const user = new User(userData);
      await user.save();
      console.log(`✅ User created with ID: ${user._id}`);

      // Create Admin document
      const adminData_doc = {
        user: user._id,
        adminId: adminInfo.adminId,
        department: adminInfo.department,
        designation: adminInfo.designation,
        isSuperAdmin: adminInfo.isSuperAdmin
      };

      const admin = new Admin(adminData_doc);
      await admin.save();
      console.log(`✅ Admin profile created with ID: ${admin._id}`);
      console.log(`   Admin ID: ${admin.adminId}`);
      console.log(`   Department: ${admin.department}`);
      console.log(`   Designation: ${admin.designation}`);
      console.log(`   Super Admin: ${admin.isSuperAdmin}\n`);
    }

    console.log('🎉 All admin users created successfully!');
    console.log('\n📋 Summary of created admins:');
    
    const createdAdmins = await Admin.find({}).populate('user', 'name email');
    createdAdmins.forEach(admin => {
      console.log(`   • ${admin.user.name} (${admin.user.email}) - ${admin.adminId} - ${admin.department}`);
    });

  } catch (error) {
    console.error('❌ Error creating admin users:', error);
    throw error;
  }
};

// Function to clear all admin users (for testing purposes)
const clearAdminUsers = async () => {
  try {
    console.log('🗑️  Clearing all admin users...');
    
    // Find all admin users
    const admins = await Admin.find({});
    const userIds = admins.map(admin => admin.user);
    
    // Delete admin documents
    await Admin.deleteMany({});
    console.log(`✅ Deleted ${admins.length} admin profiles`);
    
    // Delete corresponding user documents
    await User.deleteMany({ _id: { $in: userIds }, role: 'admin' });
    console.log(`✅ Deleted ${userIds.length} admin user accounts`);
    
    console.log('🧹 All admin users cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing admin users:', error);
    throw error;
  }
};

// Main execution function
const main = async () => {
  try {
    await connectDB();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--clear')) {
      await clearAdminUsers();
    } else {
      await createAdminUsers();
    }
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  } finally {
    await closeDB();
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createAdminUsers,
  clearAdminUsers,
  adminData
};
