/**
 * Validation Utilities
 * Custom validators and sanitizers for user input
 */

const validator = require('validator');

/**
 * Password strength requirements
 */
const passwordRequirements = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
const validatePassword = (password) => {
  const errors = [];

  if (!password) {
    return { isValid: false, errors: ['Password is required'] };
  }

  if (password.length < passwordRequirements.minLength) {
    errors.push(`Password must be at least ${passwordRequirements.minLength} characters`);
  }

  if (password.length > passwordRequirements.maxLength) {
    errors.push(`Password must be less than ${passwordRequirements.maxLength} characters`);
  }

  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (passwordRequirements.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (passwordRequirements.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} { isValid: boolean, error: string|null }
 */
const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const normalizedEmail = validator.normalizeEmail(email.toLowerCase().trim());
  
  if (!validator.isEmail(normalizedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true, error: null, normalizedEmail };
};

/**
 * Validate name
 * @param {string} name - Name to validate
 * @returns {Object} { isValid: boolean, error: string|null }
 */
const validateName = (name) => {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmedName.length > 100) {
    return { isValid: false, error: 'Name must be less than 100 characters' };
  }

  // Only allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-ZÀ-ỹ\s'-]+$/.test(trimmedName)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }

  return { isValid: true, error: null, trimmedName };
};

/**
 * Sanitize input string
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return validator.escape(validator.trim(input));
};

/**
 * Validate registration input
 * @param {Object} data - Registration data
 * @returns {Object} { isValid: boolean, errors: Object, sanitizedData: Object }
 */
const validateRegistration = (data) => {
  const errors = {};
  const sanitizedData = {};

  // Validate email
  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.error;
  } else {
    sanitizedData.email = emailResult.normalizedEmail;
  }

  // Validate name
  const nameResult = validateName(data.name);
  if (!nameResult.isValid) {
    errors.name = nameResult.error;
  } else {
    sanitizedData.name = nameResult.trimmedName;
  }

  // Validate password
  const passwordResult = validatePassword(data.password);
  if (!passwordResult.isValid) {
    errors.password = passwordResult.errors;
  } else {
    sanitizedData.password = data.password;
  }

  // Validate confirm password
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Validate role if provided
  if (data.role) {
    const validRoles = ['user', 'admin', 'moderator'];
    if (!validRoles.includes(data.role)) {
      errors.role = 'Invalid role';
    } else {
      sanitizedData.role = data.role;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData
  };
};

/**
 * Validate login input
 * @param {Object} data - Login data
 * @returns {Object} { isValid: boolean, errors: Object }
 */
const validateLogin = (data) => {
  const errors = {};

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!validator.isEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate password change input
 * @param {Object} data - Password change data
 * @returns {Object} { isValid: boolean, errors: Object }
 */
const validatePasswordChange = (data) => {
  const errors = {};

  if (!data.currentPassword) {
    errors.currentPassword = 'Current password is required';
  }

  const newPasswordResult = validatePassword(data.newPassword);
  if (!newPasswordResult.isValid) {
    errors.newPassword = newPasswordResult.errors;
  }

  if (data.newPassword !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (data.currentPassword === data.newPassword) {
    errors.newPassword = ['New password must be different from current password'];
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  passwordRequirements,
  validatePassword,
  validateEmail,
  validateName,
  sanitizeInput,
  validateRegistration,
  validateLogin,
  validatePasswordChange
};
