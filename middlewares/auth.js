const AuthService = require('../services/authService');
const { AuthenticationError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Modern authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('No token provided. Please include Bearer token in Authorization header');
  }

  // Extract token
  const token = authHeader.split(' ')[1];

  if (!token) {
    throw new AuthenticationError('Invalid token format');
  }

  // Verify token
  const decoded = AuthService.verifyToken(token);

  // Get user from token
  const user = await AuthService.getUserById(decoded._id);

  // Attach user to request
  req.user = {
    _id: user._id,
    email: user.email,
  };

  next();
});

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for routes that work differently for authenticated users
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = AuthService.verifyToken(token);
      const user = await AuthService.getUserById(decoded._id);
      
      req.user = {
        _id: user._id,
        email: user.email,
      };
    } catch (error) {
      // Continue without user if token is invalid
      req.user = null;
    }
  }

  next();
});

module.exports = {
  authenticate,
  optionalAuth,
};
