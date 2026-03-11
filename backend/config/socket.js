/**
 * Socket.IO Server Configuration
 * Handles real-time WebSocket connections with JWT authentication
 */

const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

let io = null // singleton instance

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - the HTTP server from index.js
 * @returns {Server} Socket.IO server instance
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:5000',
            'http://127.0.0.1:5173'
          ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,   // 60s timeout
    pingInterval: 25000   // heartbeat every 25s
  })

  // ── AUTHENTICATION MIDDLEWARE ──────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '')

      if (!token) {
        return next(new Error('Authentication required'))
      }

      let decoded
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          return next(new Error('Token expired'))
        }
        return next(new Error('Invalid token'))
      }

      // Use decoded.id (matches project's JWT payload shape)
      const userId = decoded.id || decoded._id
      if (!userId) {
        return next(new Error('Invalid token'))
      }

      // Verify user still exists and is not blocked
      const user = await User.findById(userId)
        .select('_id name fullName role isBlocked isDeleted isActive')
        .lean()

      if (!user || user.isDeleted || user.isActive === false) {
        return next(new Error('User not found'))
      }

      if (user.isBlocked) {
        return next(new Error('Account is blocked'))
      }

      // Attach user to socket
      socket.user = user
      socket.userId = user._id.toString()

      next()
    } catch (err) {
      return next(new Error('Authentication failed'))
    }
  })

  // ── CONNECTION HANDLER ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.userId

    // Join private room (userId as room name)
    socket.join(userId)

    // Admin also joins 'admin' room for broadcast monitoring
    if (socket.user.role === 'admin') {
      socket.join('admin')
    }

    console.log(`[Socket] User connected: ${userId} | socket: ${socket.id}`)

    // ── CLIENT → SERVER EVENTS ─────────────────────────────────────────────

    // Client marks a single notification as read via socket
    socket.on('notification:read', async (notificationId) => {
      try {
        const NotificationService = require('../services/notification.service')
        await NotificationService.markAsRead(userId, notificationId)
        socket.emit('notification:read:ack', { notificationId, success: true })
      } catch (err) {
        socket.emit('notification:read:ack', { notificationId, success: false })
      }
    })

    // Client requests a fresh unread count
    socket.on('notification:unread:get', async () => {
      try {
        const Notification = require('../models/Notification')
        const count = await Notification.countDocuments({ userId, isRead: false })
        socket.emit('notification:unread:count', { count })
      } catch (err) {
        socket.emit('notification:unread:count', { count: 0 })
      }
    })

    // ── DISCONNECT ─────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${userId} | reason: ${reason}`)
    })
  })

  console.log('✅ Socket.IO initialized')
  return io
}

/**
 * Get the Socket.IO instance (must call initSocket first)
 * @returns {Server} io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket(httpServer) first.')
  }
  return io
}

/**
 * Emit an event to a specific user's private room
 * @param {string|ObjectId} userId - recipient user ID
 * @param {string} event - socket event name
 * @param {Object} data - payload
 */
const emitToUser = (userId, event, data) => {
  if (!io) return // silently skip if socket not ready
  io.to(userId.toString()).emit(event, data)
}

/**
 * Emit an event to all connected admin sockets
 * @param {string} event
 * @param {Object} data
 */
const emitToAdmins = (event, data) => {
  if (!io) return
  io.to('admin').emit(event, data)
}

/**
 * Broadcast an event to ALL connected sockets
 * @param {string} event
 * @param {Object} data
 */
const emitToAll = (event, data) => {
  if (!io) return
  io.emit(event, data)
}

/**
 * Check if a user has at least one active socket connection
 * @param {string|ObjectId} userId
 * @returns {Promise<boolean>}
 */
const isUserOnline = async (userId) => {
  if (!io) return false
  const sockets = await io.in(userId.toString()).fetchSockets()
  return sockets.length > 0
}

module.exports = { initSocket, getIO, emitToUser, emitToAdmins, emitToAll, isUserOnline }
