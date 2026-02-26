/**
 * Logger Utility
 * Provides consistent logging across the application
 */

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level from environment
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Format log message with timestamp
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted log string
 */
const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 
    ? ` | ${JSON.stringify(meta)}` 
    : '';
  return `[${timestamp}] [${level}] ${message}${metaString}`;
};

/**
 * Logger object with different log levels
 */
const logger = {
  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Object} meta - Additional metadata
   */
  error: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(formatLog('ERROR', message, meta));
    }
  },

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} meta - Additional metadata
   */
  warn: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(formatLog('WARN', message, meta));
    }
  },

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} meta - Additional metadata
   */
  info: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.info(formatLog('INFO', message, meta));
    }
  },

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} meta - Additional metadata
   */
  debug: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.log(formatLog('DEBUG', message, meta));
    }
  },

  /**
   * Log authentication event
   * @param {string} event - Event type
   * @param {Object} details - Event details
   */
  auth: (event, details = {}) => {
    const icon = {
      'register': '📝',
      'login': '🔐',
      'logout': '🚪',
      'password_reset': '🔑',
      'email_verified': '✉️',
      'login_failed': '❌',
      'account_locked': '🔒'
    }[event] || '🔐';

    logger.info(`${icon} AUTH: ${event}`, {
      ...details,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log API request
   * @param {Object} req - Express request object
   * @param {number} statusCode - Response status code
   * @param {number} responseTime - Response time in ms
   */
  api: (req, statusCode, responseTime) => {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.originalUrl}`, {
      statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 50)
    });
  },

  /**
   * Log database event
   * @param {string} event - Event type
   * @param {Object} details - Event details
   */
  db: (event, details = {}) => {
    const icon = {
      'connected': '✅',
      'disconnected': '⚠️',
      'error': '❌',
      'query': '📊'
    }[event] || '📦';

    logger.info(`${icon} DB: ${event}`, details);
  }
};

module.exports = logger;
