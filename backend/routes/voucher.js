/**
 * Voucher Routes
 * Admin voucher management
 */

const express = require('express');
const {
  getAllVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  toggleVoucherStatus,
  deleteVoucher
} = require('../controllers/voucherController');

const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All voucher routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Voucher CRUD
router.get('/', getAllVouchers);              // GET /api/vouchers - Get all vouchers
router.get('/:id', getVoucherById);           // GET /api/vouchers/:id - Get voucher by ID
router.post('/', createVoucher);              // POST /api/vouchers - Create voucher
router.put('/:id', updateVoucher);            // PUT /api/vouchers/:id - Update voucher
router.put('/:id/toggle', toggleVoucherStatus); // PUT /api/vouchers/:id/toggle - Toggle status
router.delete('/:id', deleteVoucher);         // DELETE /api/vouchers/:id - Delete voucher

module.exports = router;
