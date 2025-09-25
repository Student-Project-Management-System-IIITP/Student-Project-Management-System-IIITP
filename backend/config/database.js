const mongoose = require('mongoose');

// MongoDB Atlas connection string - MUST be in .env file
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

// Connect to MongoDB using Mongoose
const connectDB = async () => {
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas with Mongoose');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
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

module.exports = {
  connectDB,
  closeDB
};