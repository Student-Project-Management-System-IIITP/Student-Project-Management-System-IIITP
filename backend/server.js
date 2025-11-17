require("dotenv").config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const SocketService = require('./services/socketService');

// Suppress dotenv messages
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('[dotenv@')) {
    return; // Suppress dotenv messages
  }
  originalConsoleLog(...args);
};

require('dotenv').config({ debug: false, silent: true });

// Import database connection
const { connectDB } = require('./config/database');

// Import routes and middleware
const indexRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Routes
app.use('/', indexRoutes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Initialize Socket.IO service
let socketService;

// Start server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start the HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
    });
    
    // Initialize Socket.IO after server is running
    socketService = new SocketService(server);
    console.log(`🔥 Socket.IO real-time service ready`);
    
    // Make socket service available to routes/middleware 
    app.set('socketService', socketService);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
