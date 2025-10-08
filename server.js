require('dotenv').config();

const express = require('express');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const { securityHeaders, requestLogger, createRateLimiter } = require('./middlewares/security');

// Import routes
const userRoutes = require('./routes/user');
const postRoutes = require('./routes/post');

/**
 * Initialize Express application
 */
const app = express();

/**
 * Trust proxy - important for rate limiting and getting correct IP addresses
 */
app.set('trust proxy', 1);

/**
 * Security Middleware
 */
app.use(securityHeaders);

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Request Logging
 */
if (process.env.NODE_ENV !== 'production') {
  app.use(requestLogger);
}

/**
 * Rate Limiting - Global
 * Disabled for testing/development
 */
// const globalLimiter = createRateLimiter();
// app.use(globalLimiter);

/**
 * Root Endpoint
 */
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Social Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/user',
      posts: '/api/posts'
    }
  });
});

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 */
app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);

/**
 * 404 Handler - Must be after all routes
 */
app.use(notFound);

/**
 * Global Error Handler - Must be last
 */
app.use(errorHandler);

/**
 * Start Server
 */
const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Initialize GridFS after database connection
    const { initGridFS } = require('./config/gridfs');
    initGridFS();

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║   Server running on port ${PORT}        ║
║   Environment: ${process.env.NODE_ENV || 'development'}           ║
║   Database: Connected                 ║
║   GridFS: Initialized                 ║
╚═══════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Initialize database for Vercel serverless
const initializeApp = async () => {
  try {
    await connectDB();
    const { initGridFS } = require('./config/gridfs');
    initGridFS();
    console.log('Database and GridFS initialized for serverless');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
};

// For Vercel serverless deployment
if (process.env.VERCEL) {
  initializeApp();
} else {
  // Start the server for local development
  startServer();
}

module.exports = app;
