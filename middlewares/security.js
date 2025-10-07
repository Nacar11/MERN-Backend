const { RATE_LIMIT } = require('../config/constants');

/**
 * Security middleware configurations
 */

/**
 * Rate limiting configuration
 * Prevents brute force attacks
 */
const createRateLimiter = (maxRequests = RATE_LIMIT.MAX_REQUESTS) => {
  // Simple in-memory rate limiter
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - RATE_LIMIT.WINDOW_MS;

    // Get or initialize request log for this IP
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }

    const requestLog = requests.get(ip);

    // Filter out old requests outside the window
    const recentRequests = requestLog.filter((timestamp) => timestamp > windowStart);
    requests.set(ip, recentRequests);

    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(RATE_LIMIT.WINDOW_MS / 1000),
      });
    }

    // Add current request
    recentRequests.push(now);
    requests.set(ip, recentRequests);

    next();
  };
};

/**
 * CORS configuration
 */
const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200,
};

/**
 * Security headers middleware
 * Basic implementation - in production, use helmet package
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString(),
    };
    
    console.log(JSON.stringify(log));
  });
  
  next();
};

module.exports = {
  createRateLimiter,
  corsOptions,
  securityHeaders,
  requestLogger,
};
