/**
 * Service Validation Schemas
 * Joi validation for service operations
 */

const Joi = require('joi');

// MongoDB ObjectId pattern
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * Schema for creating a new service
 */
const createServiceSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'Service name must be at least 2 characters',
      'string.max': 'Service name must be less than 200 characters',
      'any.required': 'Service name is required'
    }),
  description: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must be less than 2000 characters'
    }),
  price: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'Price cannot be negative',
      'any.required': 'Price is required'
    }),
  duration: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.min': 'Duration must be at least 1 minute',
      'number.integer': 'Duration must be a whole number',
      'any.required': 'Duration is required'
    }),
  category: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Category ID must be a valid MongoDB ObjectId',
      'any.required': 'Category is required'
    }),
  images: Joi.array()
    .items(Joi.string().uri())
    .max(10)
    .optional()
    .default([])
    .messages({
      'array.max': 'Maximum 10 images allowed',
      'string.uri': 'Each image must be a valid URI'
    }),
  features: Joi.array()
    .items(Joi.string().max(200))
    .optional()
    .default([]),
  petTypes: Joi.array()
    .items(Joi.string().valid('dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'other'))
    .optional()
    .default(['dog', 'cat']),
  maxCapacity: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),
  isActive: Joi.boolean()
    .optional()
    .default(true)
});

/**
 * Schema for updating a service
 */
const updateServiceSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Service name must be at least 2 characters',
      'string.max': 'Service name must be less than 200 characters'
    }),
  description: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must be less than 2000 characters'
    }),
  price: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Price cannot be negative'
    }),
  duration: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.min': 'Duration must be at least 1 minute',
      'number.integer': 'Duration must be a whole number'
    }),
  category: Joi.string()
    .pattern(objectIdPattern)
    .optional()
    .messages({
      'string.pattern.base': 'Category ID must be a valid MongoDB ObjectId'
    }),
  images: Joi.array()
    .items(Joi.string().uri())
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 images allowed',
      'string.uri': 'Each image must be a valid URI'
    }),
  features: Joi.array()
    .items(Joi.string().max(200))
    .optional(),
  petTypes: Joi.array()
    .items(Joi.string().valid('dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'other'))
    .optional(),
  maxCapacity: Joi.number()
    .integer()
    .min(1)
    .optional(),
  isActive: Joi.boolean()
    .optional()
});

/**
 * Schema for query parameters when getting services
 */
const getServicesQuerySchema = Joi.object({
  search: Joi.string()
    .max(200)
    .optional()
    .allow(''),
  category: Joi.string()
    .pattern(objectIdPattern)
    .optional()
    .messages({
      'string.pattern.base': 'Category ID must be a valid MongoDB ObjectId'
    }),
  categoryId: Joi.string()
    .pattern(objectIdPattern)
    .optional()
    .messages({
      'string.pattern.base': 'Category ID must be a valid MongoDB ObjectId'
    }),
  minPrice: Joi.number()
    .min(0)
    .optional(),
  maxPrice: Joi.number()
    .min(0)
    .optional(),
  petType: Joi.string()
    .valid('dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'other')
    .optional(),
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
    .valid('name', 'price', 'rating', 'createdAt')
    .optional()
    .default('createdAt'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
});

module.exports = {
  createServiceSchema,
  updateServiceSchema,
  getServicesQuerySchema
};
