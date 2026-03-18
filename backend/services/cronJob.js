/**
 * CronJob Service — Booking Status Automation
 *
 * Runs every 60 seconds and auto-transitions booking statuses:
 *
 * Non-stay bookings (service only):
 *   confirmed  -> in-progress  when at least one item.startTime <= now
 *   in-progress -> completed   when all item.endTime <= now
 *
 * Stay bookings (boarding / service+stay):
 *   pending|confirmed -> in-progress when stayInfo.checkInDate <= now
 *   pending|confirmed|in-progress -> completed when stayInfo.checkOutDate <= now
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
    // Service-only: confirmed -> in-progress
    const serviceToInProgress = await Booking.updateMany(
      {
        status: 'confirmed',
        'stayInfo.enabled': { $ne: true },
        'items.startTime': { $lte: now },
      },
      { $set: { status: 'in-progress' } }
    );

    // Stay-enabled: pending|confirmed -> in-progress at check-in
    const stayToInProgress = await Booking.updateMany(
      {
        status: { $in: ['pending', 'confirmed'] },
        'stayInfo.enabled': true,
        'stayInfo.checkInDate': { $lte: now },
      },
      { $set: { status: 'in-progress' } }
    );

    // Service-only: in-progress -> completed when all items have ended
    const serviceToCompleted = await Booking.updateMany(
      {
        status: 'in-progress',
        'stayInfo.enabled': { $ne: true },
        'items.0': { $exists: true },
        items: { $not: { $elemMatch: { endTime: { $gt: now } } } },
      },
      { $set: { status: 'completed', completedAt: now } }
    );

    // Stay-enabled: complete at check-out regardless of previous active status
    const stayToCompleted = await Booking.updateMany(
      {
        status: { $in: ['pending', 'confirmed', 'in-progress'] },
        'stayInfo.enabled': true,
        'stayInfo.checkOutDate': { $lte: now },
      },
      { $set: { status: 'completed', completedAt: now } }
    );

    const changedCount =
      serviceToInProgress.modifiedCount +
      stayToInProgress.modifiedCount +
      serviceToCompleted.modifiedCount +
      stayToCompleted.modifiedCount;

    if (changedCount > 0) {
      logger.info(
        `[CronJob] Booking auto-transitions: ` +
        `service ${serviceToInProgress.modifiedCount} -> in-progress, ` +
        `stay ${stayToInProgress.modifiedCount} -> in-progress, ` +
        `service ${serviceToCompleted.modifiedCount} -> completed, ` +
        `stay ${stayToCompleted.modifiedCount} -> completed`
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
