const express = require('express');
const multer = require('multer');
const {
  chatWithAI,
  diagnoseImage,
  recommendServices,
  suggestVoucher,
  debugAI
} = require('../controllers/aiController');

const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Debug route (No auth required for testing)
router.get('/debug', debugAI);  // GET /api/ai/debug - Debug AI config

// All AI routes require authentication
router.use(protect);

// Customer routes
router.post('/chat', chatWithAI);  // POST /api/ai/chat - Chat with AI
router.post('/diagnose', upload.single('image'), diagnoseImage);  // POST /api/ai/diagnose - AI image diagnosis
router.post('/recommend', recommendServices);  // POST /api/ai/recommend - AI recommend services

// Admin only routes
router.post('/suggest-voucher', restrictTo('admin'), suggestVoucher);  // POST /api/ai/suggest-voucher - AI suggest voucher

module.exports = router;