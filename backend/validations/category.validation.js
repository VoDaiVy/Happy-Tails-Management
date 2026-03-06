/**
 * Category Validation Schemas
 * Joi validation for category operations
 */

const Joi = require('joi');

/**
 * Schema for creating a new category
 */
const createCategorySchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Category name must be at least 2 characters',
      'string.max': 'Category name must be less than 100 characters',
      'any.required': 'Category name is required'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must be less than 500 characters'
    }),
  imageUrl: Joi.string()
    .uri()
    .optional()
    .allow(null, '')
    .messages({
      'string.uri': 'Image URL must be a valid URI'
    }),
  icon: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Icon URL must be less than 200 characters'
    }),
  isActive: Joi.boolean()
    .optional()
    .default(true)
});

/**
 * Schema for updating a category
 */
const updateCategorySchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Category name must be at least 2 characters',
      'string.max': 'Category name must be less than 100 characters'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must be less than 500 characters'
    }),
  imageUrl: Joi.string()
    .uri()
    .optional()
    .allow(null, '')
    .messages({
      'string.uri': 'Image URL must be a valid URI'
    }),
  icon: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Icon URL must be less than 200 characters'
    }),
  isActive: Joi.boolean()
    .optional()
});

/**
 * Schema for query parameters when getting categories
 */
const getCategoriesQuerySchema = Joi.object({
  search: Joi.string()
    .max(100)
    .optional()
    .allow(''),
  isActive: Joi.string()
    .valid('true', 'false', 'all')
    .optional()
    .default('true'),
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(10),
  sortBy: Joi.string()
    .valid('name', 'createdAt')
    .optional()
    .default('createdAt'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  getCategoriesQuerySchema
};
