const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB Atlas connection string - MUST be in .env file
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

// Connect to MongoDB
const connectDB = async () => {
  try {
    await client.connect();
    db = client.db('spms'); // Database name
    console.log('✅ Connected to MongoDB Atlas');
    console.log('📊 Database: SPMS');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Get database instance
const getDB = () => {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
};

// Close database connection
const closeDB = async () => {
  try {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
};

module.exports = {
  connectDB,
  getDB,
  closeDB
};