/**
 * User Controller
 * Staff quick-register for walk-in guests
 */

const User       = require('../models/User');
const { catchAsync } = require('../utils/catchAsync');
const { AppError }   = require('../utils/AppError');

/**
 * Quick Register walk-in guest (Staff | Admin only)
 * @route   POST /api/users/staff/quick-register
 * @access  Private (Staff, Admin)
 * Creates a minimal customer account on the spot — no UserDetail required
 */
exports.quickRegister = catchAsync(async (req, res, next) => {
  const { phone, fullName } = req.body;

  if (!phone || !fullName) {
    return next(new AppError('phone and fullName are required', 400, 'MISSING_FIELDS'));
  }

  // Use phone as a unique identifier to detect duplicates
  // Auto-generate a placeholder email (can be updated later by user)
  const placeholderEmail = `walkin_${phone}@happytails.local`;

  // If the guest has walked in before, return the existing record
  const existing = await User.findOne({ email: placeholderEmail, isDeleted: false });
  if (existing) {
    return res.status(200).json({
      status: 'success',
      message: 'Existing walk-in account found for this phone number',
      data: {
        userID: existing._id,
        name:   existing.name,
        email:  existing.email,
        isNew:  false
      }
    });
  }

  // Hash the default password
  // NOTE: User model's pre-save hook will hash this automatically — do NOT pre-hash here
  const DEFAULT_PASSWORD = 'HappyTails@123';

  const user = await User.create({
    name:            fullName,
    email:           placeholderEmail,
    password:        DEFAULT_PASSWORD,
    role:            'customer',
    isActive:        true,
    isEmailVerified: false
  });

  res.status(201).json({
    status: 'success',
    message: 'Walk-in guest registered successfully',
    data: {
      userID: user._id,
      name:   user.name,
      email:  user.email,
      isNew:  true
    }
  });
});
