/**
 * Async Error Handler Wrapper
 * Wraps async functions to catch errors and pass them to Express error handler
 * Note: Express 5 handles async errors automatically, but this wrapper provides
 * additional flexibility and explicit error handling
 */

/**
 * Catch async errors and pass to next middleware
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Wrap multiple middleware functions
 * @param  {...Function} middlewares - Middleware functions to wrap
 * @returns {Array} Array of wrapped middleware
 */
const catchAsyncAll = (...middlewares) => {
  return middlewares.map(fn => catchAsync(fn));
};

/**
 * Execute async operation with timeout
 * @param {Promise} promise - Promise to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Error message on timeout
 * @returns {Promise} Result or timeout error
 */
const withTimeout = (promise, timeoutMs = 30000, errorMessage = 'Operation timed out') => {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
};

module.exports = {
  catchAsync,
  catchAsyncAll,
  withTimeout
};
