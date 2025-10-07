const express = require('express');
const AuthService = require('../services/authService');
const { authenticate } = require('../middlewares/auth');
const { createRateLimiter } = require('../middlewares/security');
const { RATE_LIMIT } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/response');

const router = express.Router();

// Apply stricter rate limiting to auth routes
// Disabled for testing/development
// const authLimiter = createRateLimiter(RATE_LIMIT.AUTH_MAX_REQUESTS);

/**
 * @route   POST /api/user/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', asyncHandler(async (req, res) => {
  // Security: Reject credentials in query parameters
  if (req.query.email || req.query.password) {
    return ApiResponse.error(res, 'Credentials must be sent in request body, not URL', 400);
  }
  
  const { email, password } = req.body;
  const result = await AuthService.signup(email, password);
  ApiResponse.created(res, result, 'User registered successfully');
}));

/**
 * @route   POST /api/user/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', asyncHandler(async (req, res) => {
  // Security: Reject credentials in query parameters
  if (req.query.email || req.query.password) {
    return ApiResponse.error(res, 'Credentials must be sent in request body, not URL', 400);
  }
  
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  ApiResponse.success(res, result, 'Login successful');
}));

/**
 * @route   GET /api/user/profile
 * @desc    Get current user profile
 * @access  Private (requires authentication)
 */
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const user = await AuthService.getUserById(req.user._id);
  ApiResponse.success(res, { user }, 'Profile retrieved successfully');
}));

module.exports = router;