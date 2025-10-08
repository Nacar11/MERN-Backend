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
 * CORS Middleware
 */
app.use((req, res, next) => {
  const allowedOrigins = process.env.CLIENT_URL 
    ? process.env.CLIENT_URL.split(',') 
    : ['*'];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

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
 * Database Initialization for Serverless (Vercel)
 * This middleware ensures DB is connected before handling requests
 */
let isInitialized = false;
let initializationPromise = null;

const initializeApp = async () => {
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Return immediately if already initialized
  if (isInitialized) {
    return Promise.resolve();
  }

  // Create initialization promise
  initializationPromise = (async () => {
    try {
      await connectDB();
      const { initGridFS } = require('./config/gridfs');
      initGridFS();
      isInitialized = true;
      console.log('✅ Database and GridFS initialized for serverless');
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      initializationPromise = null; // Reset to allow retry
      throw error;
    }
  })();

  return initializationPromise;
};

// Apply initialization middleware only in Vercel environment
if (process.env.VERCEL) {
  app.use(async (req, res, next) => {
    try {
      await initializeApp();
      next();
    } catch (error) {
      console.error('Initialization error:', error);
      return res.status(503).json({
        status: 'error',
        message: 'Service temporarily unavailable. Database connection failed.',
      });
    }
  });
}

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

// Start server for local development (not Vercel)
if (!process.env.VERCEL) {
  startServer();
}

module.exports = app;
