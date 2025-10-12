const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');

async function resetPassword(email, newPassword) {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to database');

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Role: ${user.role}`);

    // Set the new password (the pre-save hook will hash it automatically)
    user.password = newPassword;
    await user.save();

    console.log('\n✓ Password reset successfully!');
    console.log(`Email: ${email}`);
    console.log(`New Password: ${newPassword}`);
    console.log('\nYou can now login with these credentials.');

    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('Error resetting password:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node resetPassword.js <email> <newPassword>');
  console.log('Example: node resetPassword.js faculty@iiit.ac.in newPassword123');
  process.exit(1);
}

const [email, newPassword] = args;

resetPassword(email, newPassword);

