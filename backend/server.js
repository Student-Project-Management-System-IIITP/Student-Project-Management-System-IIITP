const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database connection
const { connectDB } = require('./config/database');

// Import routes and middleware
const indexRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', indexRoutes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 SPMS Backend Server running on port ${PORT}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}`);
      console.log(`🏗️  MVC Structure: Controllers, Models, Routes, Middleware`);
      console.log(`🗄️  Database: MongoDB Atlas Connected`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
