const { ValidationError } = require('../utils/errors');

/**
 * Validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message);
      throw new ValidationError(messages.join(', '));
    }

    next();
  };
};

/**
 * Validate pagination query parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1) {
    throw new ValidationError('Page must be greater than 0');
  }

  if (limit < 1 || limit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }

  req.pagination = { page, limit };
  next();
};

module.exports = {
  validate,
  validatePagination,
};
