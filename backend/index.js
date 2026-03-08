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
const profileRoutes = require("./routes/profile");
const petRoutes = require("./routes/pet");
const cartRoutes = require("./routes/cart");
const serviceRoutes = require("./routes/service");
const categoryRoutes = require("./routes/category");
const bookingRoutes = require("./routes/booking");
const roomRoutes = require("./routes/room");
const transactionRoutes = require("./routes/transaction");
const notificationRoutes = require("./routes/notification");
const newsRoutes = require("./routes/news");
const policyRoutes = require("./routes/policy");
const feedbackRoutes = require("./routes/feedback");
const adminRoutes = require("./routes/admin");
const walletRoutes = require("./routes/wallet");
const aiRoutes = require("./routes/ai");
const medicalRecordRoutes = require("./routes/medicalRecord");
const userRoutes = require("./routes/user");
const voucherRoutes = require("./routes/voucher");

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
  origin: [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:5000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5000",
    process.env.FRONTEND_URL || "http://localhost:5173"
  ],
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Rate limiting - Disable in development for easier testing
if (process.env.NODE_ENV === "production") {
  app.use("/api", globalLimiter);
}

// Body parser
app.use(express.json({ limit: "10kb" })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL injection
// Note: express-mongo-sanitize is NOT compatible with Express 5 (req.query is read-only getter)
// Using custom sanitizeInput middleware instead which only sanitizes req.body

// Custom input sanitization (handles NoSQL injection prevention for Express 5)
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

// Profile routes
app.use("/api/profile", profileRoutes);

// Pet routes  
app.use("/api/pets", petRoutes);

// Cart routes
app.use("/api/cart", cartRoutes);

// Service & Category routes
app.use("/api/services", serviceRoutes);
app.use("/api/categories", categoryRoutes);

// Booking routes
app.use("/api/bookings", bookingRoutes);

// Room routes
app.use("/api/rooms", roomRoutes);

// Transaction routes
app.use("/api/transactions", transactionRoutes);

// Notification routes
app.use("/api/notifications", notificationRoutes);

// News routes
app.use("/api/news", newsRoutes);

// Policy routes
app.use("/api/policies", policyRoutes);

// Feedback routes
app.use("/api/feedback", feedbackRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);


// Wallet routes (PayOS payment integration)
app.use("/api/wallet", walletRoutes);

// AI routes
app.use("/api/ai", aiRoutes);

// Medical Record routes
app.use("/api/medical-records", medicalRecordRoutes);

// User management routes
app.use("/api/users", userRoutes);

// Voucher routes
app.use("/api/vouchers", voucherRoutes);


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
