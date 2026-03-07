const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Cart = require("../models/Cart");
const Service = require("../models/Service");
const UserPet = require("../models/UserPet");
const User = require("../models/User");
const Room = require("../models/Room");
const Transaction = require("../models/Transaction");
const Voucher = require("../models/Voucher");
const { catchAsync } = require("../utils/catchAsync");
const { AppError } = require("../utils/AppError");

/**
 * Create booking from cart
 * @route POST /api/bookings
 * @access Private (Customer)
 */
exports.createBooking = catchAsync(async (req, res, next) => {
  const { bookingDate, bookingTime, notes, paymentMethod = "cash" } = req.body;

  // Get user's cart
  const cart = await Cart.findOne({ userID: req.user.id }).populate(
    "items.service items.pet",
  );

  if (!cart || cart.items.length === 0) {
    return next(new AppError("Cart is empty", 400, "CART_EMPTY"));
  }

  // Create booking
  const booking = await Booking.create({
    customer: req.user.id,
    items: cart.items,
    bookingDate,
    bookingTime,
    totalAmount: cart.totalAmount,
    paymentMethod,
    notes,
  });

  // Clear cart after booking
  cart.items = [];
  await cart.save();

  await booking.populate("customer items.service items.pet");

  res.status(201).json({
    status: "success",
    message: "Booking created successfully",
    data: { booking },
  });
});

/**
 * Create guest booking (no account required)
 * @route POST /api/bookings/guest
 * @access Private (Staff)
 */
exports.createGuestBooking = catchAsync(async (req, res, next) => {
  const {
    guestInfo,
    items,
    bookingDate,
    bookingTime,
    notes,
    paymentMethod = "cash",
  } = req.body;

  if (!guestInfo || !guestInfo.name || !guestInfo.email || !guestInfo.phone) {
    return next(
      new AppError("Guest info is required", 400, "GUEST_INFO_REQUIRED"),
    );
  }

  // Calculate total
  const totalAmount = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const booking = await Booking.create({
    guestInfo,
    items,
    bookingDate,
    bookingTime,
    totalAmount,
    paymentMethod,
    notes,
    assignedStaff: req.user.id,
  });

  res.status(201).json({
    status: "success",
    message: "Guest booking created successfully",
    data: { booking },
  });
});

/**
 * Get my bookings
 * @route GET /api/bookings/my
 * @access Private (Customer)
 */
exports.getMyBookings = catchAsync(async (req, res, next) => {
  const { status } = req.query;
  const filter = { customer: req.user.id };
  if (status) {
    filter.status = status;
  }

  const bookings = await Booking.find(filter)

    .populate("items.service items.pet assignedStaff", "name email")
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});

/**
 * Get all bookings
 * @route GET /api/bookings
 * @access Private (Staff, Admin)
 */
exports.getAllBookings = catchAsync(async (req, res, next) => {
  const { status, date, customer } = req.query;

  const filter = {};
  if (status) filter.status = status;

  if (date)
    filter.bookingDate = {
      $gte: new Date(date),
      $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
    };

  if (customer) filter.customer = customer;

  const bookings = await Booking.find(filter)

    .populate(
      "customer items.service items.pet assignedStaff room",
      "name email roomNumber",
    )
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: { bookings },
  });
});

/**
 * Get booking by ID
 * @route GET /api/bookings/:id
 * @access Private (Customer - own, Staff, Admin)
 */

exports.getBookingById = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)

    .populate(
      "customer items.service items.pet assignedStaff room cancelledBy",
    );

  if (!booking) {
    return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
  }

  // Check permission: customer can only see their own bookings
  if (
    req.user.role === "customer" &&
    booking.customer.toString() !== req.user.id
  ) {
    return next(
      new AppError(
        "You do not have permission to view this booking",
        403,
        "FORBIDDEN",
      ),
    );
  }

  res.status(200).json({
    status: "success",
    data: { booking },
  });
});

/**
 * Update booking status
 * @route PUT /api/bookings/:id/status
 * @access Private (Staff, Admin)
 */
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
  }

  booking.status = status;
  if (status === "completed") {
    booking.completedAt = Date.now();
  }

  await booking.save();
  await booking.populate("customer items.service items.pet assignedStaff");

  res.status(200).json({
    status: "success",
    message: "Booking status updated",
    data: { booking },
  });
});

exports.cancelBooking = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const booking = await Booking.findById(req.params.id).session(session);
    
    if (!booking) {
      await session.abortTransaction();
      return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
    }

    // Check permission
    if (
      req.user.role === "customer" &&
      booking.customer.toString() !== req.user.id
    ) {
      await session.abortTransaction();

      return next(
        new AppError(
          "You do not have permission to cancel this booking",
          403,
          "FORBIDDEN",
        ),
      );
    }

    // Check if already cancelled
    if (booking.status === "cancelled") {
      await session.abortTransaction();

      return next(
        new AppError("Booking is already cancelled", 400, "ALREADY_CANCELLED"),
      );
    }

    // Check if completed
    if (booking.status === "completed") {
      await session.abortTransaction();

      return next(
        new AppError(
          "Cannot cancel completed booking",
          400,
          "CANNOT_CANCEL_COMPLETED",
        ),
      );
    }

    // Check cancellation policy (example: can't cancel within 24h of booking time)
    const bookingDateTime = new Date(booking.bookingDate);
    const hoursUntilBooking = (bookingDateTime - new Date()) / (1000 * 60 * 60);

    let refundPercentage = 100;
    if (hoursUntilBooking < 24 && hoursUntilBooking >= 0) {
      refundPercentage = 50; // 50% refund if cancelled within 24h
    } else if (hoursUntilBooking < 0) {
      await session.abortTransaction();

      return next(
        new AppError("Cannot cancel past bookings", 400, "PAST_BOOKING"),
      );
    }

    // Update booking status
    booking.status = "cancelled";
    booking.cancellationReason = reason;
    booking.cancelledAt = Date.now();
    booking.cancelledBy = req.user.id;
    await booking.save({ session });

    // Process refund if booking was paid
    let refundTransaction = null;
    if (booking.isPaid && booking.totalAmount > 0) {
      const refundAmount = (booking.totalAmount * refundPercentage) / 100;

      // Update user wallet balance
      const user = await User.findById(booking.customer).session(session);
      if (!user) {
        await session.abortTransaction();
        return next(new AppError("User not found", 404, "USER_NOT_FOUND"));
      }

      user.walletBalance = (user.walletBalance || 0) + refundAmount;
      await user.save({ session });

      // Create refund transaction
      refundTransaction = await Transaction.create(
        [
          {
            user: booking.customer,
            type: "refund",
            amount: refundAmount,
            status: "completed",
            paymentMethod: booking.paymentMethod,
            booking: booking._id,
            description: `Refund for cancelled booking ${booking.bookingNumber} (${refundPercentage}%)`,
            processedBy: req.user.id,
            processedAt: Date.now(),
          },
        ],
        { session },
      );
    }

    // Restore room availability if room was assigned
    if (booking.room) {
      await Room.findByIdAndUpdate(
        booking.room,
        { isAvailable: true },
        { session },
      );
    }

    // Restore service capacity (if your system tracks this)
    // for (const item of booking.items) {
    //   await Service.findByIdAndUpdate(
    //     item.service,
    //     { $inc: { currentCapacity: -item.quantity } },
    //     { session }
    //   );
    // }

    await session.commitTransaction();

    // Populate for response

    await booking.populate(
      "customer items.service items.pet assignedStaff room cancelledBy",
    );

    res.status(200).json({
      status: "success",

      message: "Booking cancelled successfully",

      data: {
        booking,

        refund: refundTransaction
          ? {
              amount: refundTransaction[0].amount,

              percentage: refundPercentage,

              transactionId: refundTransaction[0]._id,
            }
          : null,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    session.endSession();
  }
});

/**

 * Assign staff to booking

 * @route PUT /api/bookings/:id/assign-staff

 * @access Private (Staff, Admin)

 */

exports.assignStaffToBooking = catchAsync(async (req, res, next) => {
  const { staffId } = req.body;

  const booking = await Booking.findByIdAndUpdate(
    req.params.id,

    { assignedStaff: staffId },

    { new: true, runValidators: true },
  ).populate("assignedStaff", "name email role");

  if (!booking) {
    return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
  }

  res.status(200).json({
    status: "success",

    message: "Staff assigned to booking",

    data: { booking },
  });
});

/**

 * Checkout Booking with Availability Check & Voucher Validation

 * @route POST /api/bookings/checkout

 * @access Private (Customer)

 */

exports.checkoutBooking = catchAsync(async (req, res, next) => {
  const {
    serviceId,
    petId,
    appointmentDate,
    voucherCode,
    paymentMethod = "cash",
    notes,
  } = req.body;

  // === STEP 1: Validate Input ===

  if (!serviceId || !petId || !appointmentDate) {
    return next(
      new AppError(
        "Service, Pet, and Appointment Date are required",
        400,
        "MISSING_REQUIRED_FIELDS",
      ),
    );
  }

  // === STEP 2: Check Service & Pet Exist ===

  const service = await Service.findById(serviceId);

  if (!service || !service.isActive) {
    return next(
      new AppError("Service not found or inactive", 404, "SERVICE_NOT_FOUND"),
    );
  }

  const pet = await UserPet.findOne({ _id: petId, userID: req.user.id });

  if (!pet) {
    return next(
      new AppError("Pet not found or not owned by you", 404, "PET_NOT_FOUND"),
    );
  }

  // === STEP 3: Calculate Time Range ===

  const startTime = new Date(appointmentDate);

  const endTime = new Date(startTime.getTime() + service.duration * 60000); // duration in minutes

  // === STEP 4: Check Availability (Overlap Detection) ===

  const overlappingBookings = await Booking.find({
    "items.service": serviceId,

    status: { $in: ["confirmed", "pending"] },

    $expr: {
      $and: [
        // start1 < end2

        { $lt: [{ $dateFromString: { dateString: "$bookingDate" } }, endTime] },

        // end1 > start2

        {
          $gt: [{ $dateFromString: { dateString: "$bookingDate" } }, startTime],
        },
      ],
    },
  });

  // Limit: Maximum 5 concurrent bookings for the same service

  const MAX_CONCURRENT_SLOTS = 5;

  if (overlappingBookings.length >= MAX_CONCURRENT_SLOTS) {
    return next(
      new AppError(
        `Service slot is fully booked. Found ${overlappingBookings.length} existing bookings.`,

        400,

        "SLOT_UNAVAILABLE",
      ),
    );
  }

  // === STEP 5: Calculate Price ===

  let totalAmount = service.price;

  let discount = 0;

  let voucherApplied = null;

  // === STEP 6: Voucher Validation ===

  if (voucherCode) {
    const voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() });

    if (!voucher) {
      return next(new AppError("Voucher not found", 404, "VOUCHER_NOT_FOUND"));
    }

    // Check validity

    if (!voucher.isValid()) {
      return next(
        new AppError(
          "Voucher is expired or reached usage limit",
          400,
          "VOUCHER_INVALID",
        ),
      );
    }

    // Check minSpend requirement

    if (totalAmount < voucher.minSpend) {
      return next(
        new AppError(
          `Minimum spend of ${voucher.minSpend.toLocaleString()}đ required to use this voucher`,

          400,

          "MIN_SPEND_NOT_MET",
        ),
      );
    }

    // Check if voucher applies to this service

    if (
      voucher.applicableServices?.length > 0 &&
      !voucher.applicableServices.includes(serviceId)
    ) {
      return next(
        new AppError(
          "Voucher is not applicable to this service",
          400,
          "VOUCHER_NOT_APPLICABLE",
        ),
      );
    }

    // Calculate discount

    if (voucher.discountType === "percentage") {
      discount = (totalAmount * voucher.discountValue) / 100;

      if (voucher.maxDiscount && discount > voucher.maxDiscount) {
        discount = voucher.maxDiscount;
      }
    } else {
      discount = voucher.discountValue;
    }

    totalAmount -= discount;

    voucherApplied = voucher;
  }

  // === STEP 7: Atomic Transaction ===

  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    // Create Booking

    const [booking] = await Booking.create(
      [
        {
          customer: req.user.id,

          items: [
            {
              service: serviceId,

              pet: petId,

              quantity: 1,

              price: service.price,

              notes,
            },
          ],

          bookingDate: appointmentDate,

          bookingTime: startTime.toTimeString().slice(0, 5), // HH:MM format

          totalAmount,

          paymentMethod,

          status: "pending",

          notes,
        },
      ],
      { session },
    );

    // Create Transaction record

    const [transaction] = await Transaction.create(
      [
        {
          user: req.user.id,

          type: "payment",

          amount: totalAmount,

          status: "pending",

          paymentMethod,

          booking: booking._id,

          description: `Payment for ${service.name} - Booking ${booking.bookingNumber}`,

          notes: voucherApplied
            ? `Voucher ${voucherApplied.code} applied (${discount.toLocaleString()}đ discount)`
            : undefined,
        },
      ],
      { session },
    );

    // Update Voucher usage count

    if (voucherApplied) {
      await Voucher.findByIdAndUpdate(
        voucherApplied._id,

        { $inc: { usedCount: 1 } },

        { session },
      );
    }

    // Commit transaction

    await session.commitTransaction();

    // Populate response data

    await booking.populate([
      { path: "customer", select: "name email phone" },

      { path: "items.service", select: "name price duration category" },

      { path: "items.pet", select: "name species breed age" },
    ]);

    res.status(201).json({
      status: "success",

      message: "Booking created successfully",

      data: {
        booking,

        transaction,

        discount:
          discount > 0
            ? {
                amount: discount,

                voucherCode: voucherApplied.code,

                description: voucherApplied.description,
              }
            : null,

        summary: {
          originalPrice: service.price,

          discount,

          finalPrice: totalAmount,

          appointmentTime: {
            start: startTime.toISOString(),

            end: endTime.toISOString(),
          },
        },
      },
    });
  } catch (error) {
    // Rollback on error

    await session.abortTransaction();

    throw error;
  } finally {
    session.endSession();
  }
});
