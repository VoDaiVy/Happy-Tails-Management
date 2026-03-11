/**
 * Notification Constants
 * Centralises notification types, socket event names, and message templates
 */

// ── NOTIFICATION TYPES ────────────────────────────────────────────────────────
const NOTIFICATION_TYPES = {
  SYSTEM:    'system',
  ORDER:     'order',
  PAYMENT:   'payment',
  PROMOTION: 'promotion',
  ACCOUNT:   'account'
}

// ── SOCKET.IO EVENT NAMES ─────────────────────────────────────────────────────
// Keep event names consistent between server and client at all times.
const SOCKET_EVENTS = {
  // Server → Client
  NEW_NOTIFICATION:  'notification:new',           // new notification arrives
  UNREAD_COUNT:      'notification:unread:count',  // badge count update
  NOTIFICATION_READ: 'notification:read:ack',      // read confirmation

  // Client → Server
  MARK_READ:         'notification:read',          // mark one as read
  GET_UNREAD_COUNT:  'notification:unread:get'     // request count refresh
}

// ── MESSAGE TEMPLATES ─────────────────────────────────────────────────────────
const NOTIFICATION_TEMPLATES = {

  // ── ORDER ──────────────────────────────────────────────────────────────────
  ORDER_CREATED: (orderCode, totalPrice) => ({
    type: 'order',
    title: 'Service Booked Successfully!',
    body: `Order #${orderCode} has been placed. Total: ${totalPrice.toLocaleString('vi-VN')}d`,
    actionUrl: `/orders/${orderCode}`,
    metadata: { orderCode, totalPrice }
  }),

  ORDER_CONFIRMED: (orderCode) => ({
    type: 'order',
    title: 'Order Confirmed',
    body: `Order #${orderCode} has been confirmed. We will contact you soon!`,
    actionUrl: `/orders/${orderCode}`,
    metadata: { orderCode }
  }),

  ORDER_COMPLETED: (orderCode) => ({
    type: 'order',
    title: 'Service Completed!',
    body: `Order #${orderCode} has been completed. Thank you for using our service!`,
    actionUrl: `/orders/${orderCode}`,
    metadata: { orderCode }
  }),

  ORDER_CANCELLED: (orderCode, reason) => ({
    type: 'order',
    title: 'Order Cancelled',
    body: `Order #${orderCode} has been cancelled. Reason: ${reason || 'No reason provided'}`,
    actionUrl: `/orders/${orderCode}`,
    metadata: { orderCode, reason }
  }),

  // ── PAYMENT ────────────────────────────────────────────────────────────────
  DEPOSIT_SUCCESS: (amount, newBalance, transactionCode) => ({
    type: 'payment',
    title: 'Deposit Successful!',
    body: `Your wallet has been credited ${amount.toLocaleString('vi-VN')}d. New balance: ${newBalance.toLocaleString('vi-VN')}d`,
    actionUrl: '/wallet',
    metadata: { amount, newBalance, transactionCode }
  }),

  DEPOSIT_FAILED: (amount, transactionCode) => ({
    type: 'payment',
    title: 'Deposit Failed',
    body: `Deposit of ${amount.toLocaleString('vi-VN')}d was unsuccessful. Please try again.`,
    actionUrl: '/wallet',
    metadata: { amount, transactionCode }
  }),

  PAYMENT_SUCCESS: (amount, orderCode, newBalance) => ({
    type: 'payment',
    title: 'Payment Successful',
    body: `Paid ${amount.toLocaleString('vi-VN')}d for order #${orderCode}. Remaining balance: ${newBalance.toLocaleString('vi-VN')}d`,
    actionUrl: '/wallet',
    metadata: { amount, orderCode, newBalance }
  }),

  // ── ACCOUNT ────────────────────────────────────────────────────────────────
  ACCOUNT_BLOCKED: (reason) => ({
    type: 'account',
    title: 'Account Suspended',
    body: `Your account has been suspended. Reason: ${reason || 'Terms of service violation'}. Contact support if you have questions.`,
    actionUrl: '/support',
    metadata: { reason }
  }),

  ACCOUNT_UNBLOCKED: () => ({
    type: 'account',
    title: 'Account Restored',
    body: 'Your account has been restored. Welcome back!',
    actionUrl: '/home',
    metadata: {}
  }),

  WELCOME: (fullName) => ({
    type: 'system',
    title: `Welcome, ${fullName}!`,
    body: 'Thank you for registering. Explore our wonderful services today!',
    actionUrl: '/services',
    metadata: {}
  })
}

module.exports = { NOTIFICATION_TYPES, SOCKET_EVENTS, NOTIFICATION_TEMPLATES }
