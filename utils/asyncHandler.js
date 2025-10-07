/**
 * Wrapper for async route handlers to catch errors
 * Eliminates the need for try-catch blocks in every controller
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
