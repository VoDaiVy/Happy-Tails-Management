/**
 * MongoDB Database Configuration
 * Handles connection pooling, retry logic, and graceful shutdown
 */

const mongoose = require('mongoose');

// Connection options
const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Use IPv4
};

// Connection state tracking
let isConnected = false;
let connectionRetries = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  if (isConnected) {
    console.log('📦 Using existing MongoDB connection');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, connectionOptions);

    isConnected = true;
    connectionRetries = 0;

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Connection event listeners
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
      handleReconnect();
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    isConnected = false;
    await handleReconnect();
  }
};

/**
 * Handle reconnection with retry logic
 */
const handleReconnect = async () => {
  if (connectionRetries >= MAX_RETRIES) {
    console.error(`❌ Max retries (${MAX_RETRIES}) reached. Exiting...`);
    process.exit(1);
  }

  connectionRetries++;
  console.log(`🔄 Attempting to reconnect... (${connectionRetries}/${MAX_RETRIES})`);

  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
  await connectDB();
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Closing MongoDB connection...`);
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle process termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

/**
 * Get connection status
 * @returns {boolean}
 */
const getConnectionStatus = () => isConnected;

/**
 * Get database stats
 * @returns {Promise<Object>}
 */
const getDatabaseStats = async () => {
  if (!isConnected) {
    throw new Error('Database not connected');
  }
  
  const admin = mongoose.connection.db.admin();
  return await admin.serverStatus();
};

module.exports = {
  connectDB,
  getConnectionStatus,
  getDatabaseStats,
  gracefulShutdown
};
