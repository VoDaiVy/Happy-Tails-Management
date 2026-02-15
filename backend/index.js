/**
 * Happy Tails Management - Backend Server
 * Main entry point with security middleware and authentication
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");

// Load environment variables FIRST
dotenv.config();

// Import configurations and utilities
const { connectDB } = require("./config/database");
const { errorHandler, notFound, handleUncaughtException, handleUnhandledRejection } = require("./middleware/errorHandler");
const { globalLimiter } = require("./middleware/rateLimiter");
const { sanitizeInput } = require("./middleware/validation");
const logger = require("./utils/logger");

// Import routes
const authRoutes = require("./routes/auth");

// Handle uncaught exceptions
handleUncaughtException();

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// ==================== SECURITY MIDDLEWARE ====================

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Rate limiting
if (process.env.NODE_ENV !== "test") {
  app.use("/api", globalLimiter);
}

// Body parser
app.use(express.json({ limit: "10kb" })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Custom input sanitization
app.use(sanitizeInput);

// Prevent HTTP Parameter Pollution
app.use(hpp({
  whitelist: [] // Add params that are allowed to be duplicated
}));

// ==================== REQUEST LOGGING ====================

// Log all requests in development
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.api(req, res.statusCode, duration);
    });
    next();
  });
}

// ==================== ROUTES ====================

// Health check route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🐾 Happy Tails API is running!",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// API health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// Auth routes
app.use("/api/auth", authRoutes);

// ==================== ERROR HANDLING ====================

// Handle 404 routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ==================== SERVER STARTUP ====================

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start server
    const server = app.listen(port, () => {
      logger.info(`🚀 Server running on http://localhost:${port}`);
      logger.info(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
    });

    // Handle unhandled promise rejections
    handleUnhandledRejection(server);

  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
};

// Start the server
startServer();

// Export for testing
module.exports = app;
