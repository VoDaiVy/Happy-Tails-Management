/**
 * Pagination Utility
 * Helper for consistent pagination across all list endpoints
 */

/**
 * Paginate a Mongoose query
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Pagination options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.limit - Items per page
 * @param {Object} options.sort - Sort object (e.g., { createdAt: -1 })
 * @param {string|Object} options.populate - Populate options
 * @param {string} options.select - Fields to select
 * @returns {Promise<Object>} { data, pagination }
 */
const paginate = async (model, filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sort = { createdAt: -1 },
    populate = null,
    select = null
  } = options;

  // Ensure valid page and limit
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  // Build query
  let query = model.find(filter);

  // Apply select
  if (select) {
    query = query.select(select);
  }

  // Apply populate
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach(p => {
        query = query.populate(p);
      });
    } else {
      query = query.populate(populate);
    }
  }

  // Apply sort, skip, limit
  query = query.sort(sort).skip(skip).limit(limitNum);

  // Execute query and count in parallel
  const [data, total] = await Promise.all([
    query.exec(),
    model.countDocuments(filter)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    data,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage,
      hasPrevPage
    }
  };
};

/**
 * Build sort object from sortBy and sortOrder
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - 'asc' or 'desc'
 * @returns {Object} Sort object for Mongoose
 */
const buildSort = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const order = sortOrder === 'asc' ? 1 : -1;
  return { [sortBy]: order };
};

module.exports = {
  paginate,
  buildSort
};
