require("dotenv").config();
const dns = require('dns');

// Force IPv4 resolution first to prevent IPv6 ENETUNREACH errors on environments like Render
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Routes
// Keep-alive route (temporary for Render free tier)
if (process.env.KEEP_ALIVE_ENABLED === 'true') {
  const { createKeepAliveRouter } = require('./keepalive');
  app.use('/api/health', createKeepAliveRouter());
}

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
