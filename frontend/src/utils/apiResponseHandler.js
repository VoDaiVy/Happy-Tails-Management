/**
 * API Response Handler
 * Normalizes different backend response formats into a consistent structure
 */

/**
 * Normalize API response to consistent format
 * Handles both old format: { status: 'success', data: {...}, results }
 *        and new format: { success: true, message, data, pagination }
 */
export const normalizeResponse = (axiosResponse) => {
  const data = axiosResponse.data || axiosResponse;

  // New format: { success: true, message, data, pagination }
  // Also handles error format: { success: false, error: { message, ... }, data, pagination }
  if (data.success !== undefined) {
    return {
      success: data.success,
      message: data.message || data.error?.message,
      data: data.data,
      pagination: data.pagination,
    };
  }

  // Old format: { status: 'success', results, data: {...} }
  if (data.status === 'success') {
    return {
      success: true,
      message: data.message,
      data: data.data,
      pagination: data.pagination,
      results: data.results,
    };
  }

  // Fallback
  return {
    success: false,
    message: 'Unknown response format',
    data: null,
    pagination: null,
  };
};

/**
 * Extract data from normalized response
 * Handles nested data structures from old format
 */
export const extractResponseData = (normalizedResponse, entityKey) => {
  const { data } = normalizedResponse;

  if (!data) return null;

  // If data is already the entity (new format or direct array)
  if (Array.isArray(data)) {
    return data;
  }

  // If data is an object, try to extract the entity
  if (typeof data === 'object') {
    // If entityKey is provided, use it
    if (entityKey && data[entityKey]) {
      return data[entityKey];
    }
    // Otherwise return data as-is
    return data;
  }

  return null;
};

/**
 * Handle API error response
 */
export const getErrorMessage = (error) => {
  // Axios error with response
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.errors) {
    return error.response.data.errors[0] || 'An error occurred';
  }
  // Axios error message
  if (error.message) {
    return error.message;
  }
  // Fallback
  return 'An unexpected error occurred';
};

export default {
  normalizeResponse,
  extractResponseData,
  getErrorMessage,
};
