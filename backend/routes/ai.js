const express = require('express');
const {
  chatWithAI,
  diagnoseImage,
  recommendServices,
  suggestVoucher,
  debugAI
} = require('../controllers/aiController');

const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Debug route (No auth required for testing)
router.get('/debug', debugAI);  // GET /api/ai/debug - Debug AI config

// All AI routes require authentication
router.use(protect);

// Customer routes
router.post('/chat', chatWithAI);  // POST /api/ai/chat - Chat with AI
router.post('/diagnose', diagnoseImage);  // POST /api/ai/diagnose - AI image diagnosis
router.post('/recommend', recommendServices);  // POST /api/ai/recommend - AI recommend services

// Admin only routes
router.post('/suggest-voucher', restrictTo('admin'), suggestVoucher);  // POST /api/ai/suggest-voucher - AI suggest voucher

module.exports = router;