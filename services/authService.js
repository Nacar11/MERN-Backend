const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { AuthenticationError, ValidationError } = require('../utils/errors');
const { TOKEN_EXPIRY } = require('../config/constants');

/**
 * Authentication Service
 * Handles all authentication-related business logic
 */
class AuthService {
  /**
   * Generate JWT token
   */
  static generateToken(userId, expiresIn = TOKEN_EXPIRY.ACCESS_TOKEN) {
    return jwt.sign({ _id: userId }, process.env.SECRET, { expiresIn });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token');
      }
      throw new AuthenticationError('Token verification failed');
    }
  }

  /**
   * Register a new user
   */
  static async signup(email, password) {
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await User.signup(email, password);
    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        email: user.email,
      },
      token,
    };
  }

  /**
   * Login user
   */
  static async login(email, password) {
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await User.login(email, password);
    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        email: user.email,
      },
      token,
    };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    return user;
  }
}

module.exports = AuthService;
