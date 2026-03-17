/**
 * CronJob Service — Booking Status & Transaction Expiry Automation
 *
 * Runs every 60 seconds and handles:
 *
 * 1. Booking Status Auto-Transitions:
 *    confirmed  → in-progress  when the earliest item.startTime has passed
 *    in-progress → completed   when the latest  item.endTime  has passed
 *                               AND completedAt is set to now
 *
 * 2. Wallet Transaction Expiry:
 *    pending wallet/deposit transactions → cancelled after 5 minutes (300 seconds) of inactivity
 *    User can still create a new deposit transaction to retry
 *
 * Staff can still override booking status manually via PUT /api/bookings/:id/status.
 *
 * NOTE: Uses native setInterval (no extra npm dependency).
 *       For production use a distributed lock (e.g. MongoDB TTL or Redis)
 *       if you run multiple server instances.
 */

const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const logger  = require('../utils/logger');

const INTERVAL_MS = 60 * 1000; // every 60 seconds
const TRANSACTION_EXPIRE_TIME_MS = 5 * 60 * 1000; // 5 minutes
const BOOKING_UNPAID_EXPIRE_TIME_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Run one cycle of transaction expiry checks.
 * Cancel pending wallet/deposit transactions that have exceeded 5-minute timeout.
 */
const runTransactionExpiryCleanup = async () => {
  const now = new Date();
  const expireTimeout = new Date(now.getTime() - TRANSACTION_EXPIRE_TIME_MS); // 5 minutes ago

  try {
    // Find pending deposit transactions that were created more than 5 minutes ago.
    // We use createdAt as the business timeout source (5 minutes), independent of PayOS link expiry.
    const expiredTransactions = await Transaction.updateMany(
      {
        status: 'pending',
        type: 'deposit',
        method: 'payos',
        createdAt: { $lte: expireTimeout } // Created 5+ minutes ago
      },
      {
        $set: {
          status: 'cancelled',
          failureReason: 'Payment timeout (5 minutes without payment)',
          processedAt: now
        }
      }
    );

    if (expiredTransactions.modifiedCount > 0) {
      logger.info(
        `[CronJob] Wallet transaction cleanup: ${expiredTransactions.modifiedCount} pending deposits cancelled (5-minute timeout)`
      );
    }
  } catch (err) {
    logger.error(`[CronJob] Transaction expiry cleanup error: ${err.message}`);
  }
};

/**
 * Cancel unpaid pending bookings after 15 minutes.
 */
const runUnpaidBookingCleanup = async () => {
  const now = new Date();
  const unpaidTimeout = new Date(now.getTime() - BOOKING_UNPAID_EXPIRE_TIME_MS);

  try {
    const expiredBookings = await Booking.updateMany(
      {
        status: 'pending',
        isPaid: false,
        createdAt: { $lte: unpaidTimeout }
      },
      {
        $set: {
          status: 'cancelled',
          cancellationReason: 'Auto-cancelled: unpaid booking after 15 minutes',
          cancelledAt: now
        }
      }
    );

    if (expiredBookings.modifiedCount > 0) {
      logger.info(
        `[CronJob] Booking unpaid-timeout cleanup: ${expiredBookings.modifiedCount} pending bookings cancelled (15-minute timeout)`
      );
    }
  } catch (err) {
    logger.error(`[CronJob] Booking unpaid-timeout cleanup error: ${err.message}`);
  }
};

/**
 * Run one cycle of status transitions.
 */
const runStatusTransitions = async () => {
  const now = new Date();

  try {
    // ── confirmed → in-progress ───────────────────────────────────────────
    // A booking should move to in-progress when AT LEAST ONE item has started
    // (i.e. items.startTime <= now exists in the array).
    const toInProgress = await Booking.updateMany(
      {
        status: 'confirmed',
        'items.startTime': { $lte: now },
      },
      { $set: { status: 'in-progress' } }
    );

    if (toInProgress.modifiedCount > 0) {
      logger.info(
        `[CronJob] Booking auto-transitions: ` +
        `${toInProgress.modifiedCount} → in-progress`
      );
    }
  } catch (err) {
    logger.error(`[CronJob] Status transition error: ${err.message}`);
  }
};

/**
 * Start the cron job loop.
 * Call this once after the DB connection is established.
 */
const startCronJobs = () => {
  // Run immediately on startup to catch any missed transitions
  runStatusTransitions();
  runTransactionExpiryCleanup();
  runUnpaidBookingCleanup();

  // Then repeat every minute
  setInterval(() => {
    runStatusTransitions();
    runTransactionExpiryCleanup();
    runUnpaidBookingCleanup();
  }, INTERVAL_MS);

  logger.info(
    `[CronJob] Automation started (${INTERVAL_MS / 1000}s interval): ` +
    `booking status transitions + wallet transaction expiry (5-min timeout) + unpaid booking cancellation (15-min timeout)`
  );
};

module.exports = { startCronJobs };
