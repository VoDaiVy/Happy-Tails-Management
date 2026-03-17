import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  PawPrint,
  Eye,
  X,
  Stethoscope,
  MessageSquare,
  Star
} from 'lucide-react';
import { getMyBookings, getBookingById, getMyPetsMedicalRecords } from '../api/bookingApi';
import { getMyFeedback, createFeedback } from '../api/feedbackApi';
import MedicalRecordShowcase from '../components/medical/MedicalRecordShowcase';

const STATUS_MAP = {
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  'in-progress': { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: Loader2 },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const FEEDBACK_WINDOW_MS = 24 * 60 * 60 * 1000;

const toTimestamp = (value) => {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
};

const getFeedbackWindow = (booking, now = Date.now()) => {
  const completedAtTs =
    toTimestamp(booking?.completedAt) ||
    toTimestamp(booking?.updatedAt) ||
    null;

  if (!completedAtTs) {
    return { isOpen: false, deadlineAt: null };
  }

  const deadlineAt = completedAtTs + FEEDBACK_WINDOW_MS;
  return {
    isOpen: now <= deadlineAt,
    deadlineAt,
  };
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VND`;

const StatusBadge = ({ status }) => {
  const cfg = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon size={14} className={status === 'in-progress' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
};

const BookingCard = ({ booking, onViewDetail, onLeaveFeedback, hasFeedback }) => {
  const pets = booking.items?.map((item) => item.pet?.petName || item.pet?.name).filter(Boolean);
  const services = booking.items?.map((item) => item.service?.name).filter(Boolean);
  const showFeedbackButton = booking.status === 'completed';
  const { isOpen: isFeedbackWindowOpen, deadlineAt } = getFeedbackWindow(booking);
  const canLeaveFeedback = showFeedbackButton && isFeedbackWindowOpen && !hasFeedback;
  const isFeedbackExpired = showFeedbackButton && !hasFeedback && !isFeedbackWindowOpen;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <PawPrint size={20} className="text-[#FF8C42]" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">
              {pets?.length ? pets.join(', ') : 'Unknown'}
            </p>
            <p className="text-xs text-slate-500">{booking.bookingNumber}</p>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <CalendarDays size={15} className="text-slate-400" />
          <span>{formatDate(booking.bookingDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Clock size={15} className="text-slate-400" />
          <span>{booking.bookingTime || '-'}</span>
        </div>
      </div>

      {services?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {services.map((serviceName, index) => (
            <span key={`${serviceName}-${index}`} className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-lg font-medium">
              {serviceName}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-slate-50">
        <span className="text-xs text-slate-400">Total</span>
        <span className="font-bold text-[#FF8C42]">{formatMoney(booking.totalAmount)}</span>
      </div>

      <div className={`mt-1 grid gap-2 ${showFeedbackButton ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <button
          type="button"
          onClick={() => onViewDetail(booking)}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Eye size={16} /> View Detail
        </button>

        {showFeedbackButton && (
          <button
            type="button"
            disabled={!canLeaveFeedback}
            onClick={() => onLeaveFeedback(booking)}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
              hasFeedback
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default'
                : isFeedbackExpired
                  ? 'border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                  : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <MessageSquare size={16} />
            {hasFeedback ? 'Feedback Sent' : isFeedbackExpired ? 'Feedback Closed' : 'Leave Feedback'}
          </button>
        )}
      </div>

      {showFeedbackButton && !hasFeedback && (
        <p className={`text-[11px] ${isFeedbackWindowOpen ? 'text-slate-400' : 'text-red-500'}`}>
          {isFeedbackWindowOpen
            ? `Feedback available until ${formatDateTime(deadlineAt)}`
            : 'Feedback window closed (after 24 hours).'}
        </p>
      )}
    </motion.div>
  );
};

const FeedbackModal = ({ booking, rating, comment, error, submitting, onClose, onRatingChange, onCommentChange, onSubmit }) => {
  if (!booking) return null;

  const { deadlineAt } = getFeedbackWindow(booking);
  const assignedStaffName =
    typeof booking?.assignedStaff === 'object'
      ? booking?.assignedStaff?.name
      : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          className="w-full max-w-xl bg-white rounded-2xl shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Leave Feedback</h3>
              <p className="text-xs text-slate-500">Booking #{booking.bookingNumber}</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors" disabled={submitting}>
              <X size={18} className="text-slate-600" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <p>
                {assignedStaffName ? `Your feedback will be sent to staff: ${assignedStaffName}` : 'Your feedback will be attached to this completed booking.'}
              </p>
              {deadlineAt && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Feedback closes at: {formatDateTime(deadlineAt)}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Rating</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onRatingChange(value)}
                    className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                    disabled={submitting}
                  >
                    <Star
                      size={24}
                      className={value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Comment</p>
              <textarea
                value={comment}
                onChange={(event) => onCommentChange(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Share your experience with this booking..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />} Submit Feedback
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const BookingDetailModal = ({ booking, records, loading, error, onClose }) => {
  if (!booking) return null;

  const pets = booking.items?.map((item) => item.pet?.petName || item.pet?.name).filter(Boolean);
  const services = booking.items?.map((item) => item.service?.name).filter(Boolean);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Booking Detail</h3>
              <p className="text-xs text-slate-500">#{booking.bookingNumber}</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <X size={18} className="text-slate-600" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-400 font-semibold">Status</p>
                <div className="mt-1"><StatusBadge status={booking.status} /></div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-400 font-semibold">Date</p>
                <p className="mt-1 font-semibold text-slate-700">{formatDate(booking.bookingDate)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-400 font-semibold">Time</p>
                <p className="mt-1 font-semibold text-slate-700">{booking.bookingTime || '-'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-400 font-semibold">Total</p>
                <p className="mt-1 font-semibold text-[#FF8C42]">{formatMoney(booking.totalAmount)}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-2">Pets</p>
                {pets?.length > 0 ? pets.join(', ') : 'No pet data'}
              </div>
              <div className="p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-2">Services</p>
                {services?.length > 0 ? services.join(', ') : 'No service data'}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Stethoscope size={16} className="text-emerald-600" /> Medical Records For This Booking
              </h4>

              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={15} className="animate-spin" /> Loading medical records...
                </div>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : records.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No medical records linked to this booking yet.</p>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <MedicalRecordShowcase key={record._id} record={record} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const EmptyState = ({ title, desc }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <CalendarDays size={28} className="text-slate-400" />
    </div>
    <h3 className="text-lg font-bold text-slate-700 mb-1">{title}</h3>
    <p className="text-sm text-slate-400 max-w-xs">{desc}</p>
  </div>
);

const BookingHistory = () => {
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingRecords, setBookingRecords] = useState([]);
  const [loadingBookingRecords, setLoadingBookingRecords] = useState(false);
  const [bookingRecordsError, setBookingRecordsError] = useState('');
  const [feedbackByBooking, setFeedbackByBooking] = useState({});
  const [feedbackBooking, setFeedbackBooking] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const data = await getMyBookings(params);
      setBookings(data.data?.bookings || data.data || []);
    } catch {
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const fetchMyFeedback = useCallback(async () => {
    try {
      const result = await getMyFeedback();
      const feedback = result?.data?.feedback || result?.data?.data?.feedback || [];
      const map = {};

      feedback.forEach((entry) => {
        const bookingId =
          typeof entry?.booking === 'object'
            ? entry?.booking?._id
            : entry?.booking;

        if (bookingId && !map[bookingId]) {
          map[bookingId] = entry;
        }
      });

      setFeedbackByBooking(map);
    } catch {
      setFeedbackByBooking({});
    }
  }, []);

  useEffect(() => {
    fetchMyFeedback();
  }, [fetchMyFeedback]);

  const handleViewDetail = async (booking) => {
    setSelectedBooking(booking);
    setBookingRecords([]);
    setBookingRecordsError('');
    setLoadingBookingRecords(true);

    try {
      const [bookingRes, recordsRes] = await Promise.all([
        getBookingById(booking._id).catch(() => null),
        getMyPetsMedicalRecords({ bookingId: booking._id }).catch(() => null)
      ]);

      setSelectedBooking(bookingRes?.data?.booking || booking);

      if (!recordsRes) {
        setBookingRecordsError('Unable to load medical records for this booking.');
        return;
      }

      const records = recordsRes?.data?.records || recordsRes?.data?.data?.records || [];
      setBookingRecords(Array.isArray(records) ? records : []);
    } finally {
      setLoadingBookingRecords(false);
    }
  };

  const closeDetailModal = () => {
    setSelectedBooking(null);
    setBookingRecords([]);
    setBookingRecordsError('');
    setLoadingBookingRecords(false);
  };

  const openFeedbackModal = (booking) => {
    const { isOpen } = getFeedbackWindow(booking);
    if (!isOpen) {
      return;
    }

    setFeedbackBooking(booking);
    setFeedbackRating(5);
    setFeedbackComment('');
    setFeedbackError('');
  };

  const closeFeedbackModal = () => {
    if (feedbackSubmitting) return;
    setFeedbackBooking(null);
    setFeedbackError('');
    setFeedbackComment('');
    setFeedbackRating(5);
  };

  const submitFeedback = async () => {
    if (!feedbackBooking?._id) return;

    if (!feedbackRating || feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackError('Please select a valid rating.');
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackError('');

    try {
      const payload = {
        booking: feedbackBooking._id,
        rating: feedbackRating,
        comment: feedbackComment.trim()
      };

      const result = await createFeedback(payload);
      const created = result?.data?.feedback || result?.data?.data?.feedback;

      setFeedbackByBooking((prev) => ({
        ...prev,
        [feedbackBooking._id]: created || { booking: feedbackBooking._id }
      }));

      closeFeedbackModal();
    } catch (err) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Unable to submit feedback right now.';
      setFeedbackError(message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="bg-white border-b border-slate-100">
        <div className="container mx-auto px-6 py-5 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
            <ChevronLeft size={22} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Booking History</h1>
            <p className="text-sm text-slate-500">View booking details and medical updates</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 max-w-5xl">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === filter.value ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loadingBookings ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin mb-3" />
            <p className="text-sm">Loading bookings...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="bookings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {bookings.length === 0 ? (
                <EmptyState
                  title="No bookings yet"
                  desc="You haven't made any bookings yet. Explore our services!"
                />
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {bookings.map((booking) => (
                    <BookingCard
                      key={booking._id}
                      booking={booking}
                      onViewDetail={handleViewDetail}
                      onLeaveFeedback={openFeedbackModal}
                      hasFeedback={Boolean(feedbackByBooking[booking._id])}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <BookingDetailModal
        booking={selectedBooking}
        records={bookingRecords}
        loading={loadingBookingRecords}
        error={bookingRecordsError}
        onClose={closeDetailModal}
      />

      <FeedbackModal
        booking={feedbackBooking}
        rating={feedbackRating}
        comment={feedbackComment}
        error={feedbackError}
        submitting={feedbackSubmitting}
        onClose={closeFeedbackModal}
        onRatingChange={setFeedbackRating}
        onCommentChange={setFeedbackComment}
        onSubmit={submitFeedback}
      />
    </div>
  );
};

export default BookingHistory;
