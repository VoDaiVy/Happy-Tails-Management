/**
 * API Response Utility
 * Consistent response format builder
 */

/**
 * Build a success response
 * @param {string} message - Success message
 * @param {*} data - Response data
 * @param {Object} pagination - Pagination metadata (optional)
 * @returns {Object} Response object
 */
const success = (message, data = null, pagination = null) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  if (pagination) {
    response.pagination = pagination;
  }

  return response;
};

/**
 * Build an error response
 * @param {string} message - Error message
 * @param {Array|null} errors - Field-level errors (optional)
 * @returns {Object} Response object
 */
const error = (message, errors = null) => {
  return {
    success: false,
    message,
    errors
  };
};

module.exports = {
  success,
  error
};
