/**
 * CronJob Service — Booking Status Automation
 *
 * Runs every 60 seconds and auto-transitions booking statuses:
 *
 *   confirmed  → in-progress  when the earliest item.startTime has passed
 *   in-progress → completed   when the latest  item.endTime  has passed
 *                              AND completedAt is set to now
 *
 * Staff can still override manually via PUT /api/bookings/:id/status.
 *
 * NOTE: Uses native setInterval (no extra npm dependency).
 *       For production use a distributed lock (e.g. MongoDB TTL or Redis)
 *       if you run multiple server instances.
 */

const Booking = require('../models/Booking');
const logger  = require('../utils/logger');

const INTERVAL_MS = 60 * 1000; // every 60 seconds

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

    // ── in-progress → completed ───────────────────────────────────────────
    // A booking is complete when ALL items have ended
    // i.e. no item has endTime > now.
    const toCompleted = await Booking.updateMany(
      {
        status: 'in-progress',
        // $not $elemMatch: no item has endTime still in the future
        items: { $not: { $elemMatch: { endTime: { $gt: now } } } },
      },
      { $set: { status: 'completed', completedAt: now } }
    );

    if (toInProgress.modifiedCount > 0 || toCompleted.modifiedCount > 0) {
      logger.info(
        `[CronJob] Booking auto-transitions: ` +
        `${toInProgress.modifiedCount} → in-progress, ` +
        `${toCompleted.modifiedCount} → completed`
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

  // Then repeat every minute
  setInterval(runStatusTransitions, INTERVAL_MS);

  logger.info(`[CronJob] Booking status automation started (${INTERVAL_MS / 1000}s interval)`);
};

module.exports = { startCronJobs };
