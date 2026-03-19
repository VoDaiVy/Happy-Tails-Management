import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useScrollLock from '../../hooks/useScrollLock';
import { getAllMedicalRecords } from "../../api/medicalRecordApi";
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CreditCard,
  CheckCircle,
  XCircle,
  PlayCircle,
  AlertCircle,
  PawPrint,
  FileText,
  UserCheck,
  UserPlus,
  DollarSign,
  MapPin,
  History,
  DoorOpen,
  Camera,
} from "lucide-react";

// Status configuration
const STATUS_CONFIG = {
  pending: {
    label: "Chờ xác nhận",
    color: "bg-amber-100 text-amber-700",
    icon: AlertCircle,
  },
  confirmed: {
    label: "Đã xác nhận",
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
  },
  "in-progress": {
    label: "Đang thực hiện",
    color: "bg-purple-100 text-purple-700",
    icon: PlayCircle,
  },
  completed: {
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

// Staff status labels
const STAFF_STATUS_LABELS = {
  pending: "Chờ nhận",
  confirmed: "Đã nhận",
  "in-progress": "Đang thực hiện",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const STAFF_STATUS_OPTIONS = [
  { value: "pending", label: STAFF_STATUS_LABELS.pending },
  { value: "confirmed", label: STAFF_STATUS_LABELS.confirmed },
  { value: "in-progress", label: STAFF_STATUS_LABELS["in-progress"] },
  { value: "completed", label: STAFF_STATUS_LABELS.completed },
  { value: "cancelled", label: STAFF_STATUS_LABELS.cancelled },
];

// Payment method labels
const PAYMENT_LABELS = {
  cash: "Tiền mặt",
  card: "Thẻ ngân hàng",
  online: "Online Payment",
  wallet: "Ví điện tử",
};

const SERVICE_GROUP_LABELS = {
  wet: "Wet",
  dry: "Dry",
};

const getRecordBookingId = (record) => {
  const raw = record?.booking;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") return raw?._id || raw?.id || null;
  return null;
};

const getRecordPetId = (record) => {
  const raw = record?.userPet;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") return raw?._id || raw?.id || null;
  return null;
};

const BookingDetailModal = ({
  isOpen,
  onClose,
  booking,
  role = "staff",
  currentUserId,
  onUpdateStatus,
  onAssignStaff,
  onClaimBooking,
  staffList = [],
}) => {
  const [selectedStaff, setSelectedStaff] = useState(
    booking?.assignedStaff?._id || ""
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [nextStatus, setNextStatus] = useState(booking?.status || "");
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [medicalLoading, setMedicalLoading] = useState(false);
  const [medicalError, setMedicalError] = useState(null);
  useScrollLock(isOpen);

  useEffect(() => {
    setSelectedStaff(booking?.assignedStaff?._id || "");
    setNextStatus(booking?.status || "");
  }, [booking?._id, booking?.assignedStaff?._id, booking?.status]);

  useEffect(() => {
    if (!isOpen || !booking?._id) {
      setMedicalRecords([]);
      setMedicalError(null);
      return;
    }

    let isMounted = true;
    const currentBookingId = String(booking._id);

    const fetchBookingMedicalRecords = async () => {
      setMedicalLoading(true);
      setMedicalError(null);
      setMedicalRecords([]);

      try {
        const response = await getAllMedicalRecords({
          bookingId: booking._id,
          page: 1,
          limit: 50,
        });
        const records = Array.isArray(response?.data?.data?.records)
          ? response.data.data.records
          : [];

        // Always scope by current booking on client-side to avoid any accidental over-fetch.
        const scopedRecords = records.filter((record) => {
          const recordBookingId = getRecordBookingId(record);
          return recordBookingId && String(recordBookingId) === currentBookingId;
        });

        // Keep only the latest record per pet for this booking to prevent duplicate history cards.
        const latestByPet = new Map();
        for (const record of scopedRecords) {
          const petKey = String(getRecordPetId(record) || record._id);
          const previous = latestByPet.get(petKey);
          if (!previous) {
            latestByPet.set(petKey, record);
            continue;
          }

          const prevTime = new Date(previous.updatedAt || previous.createdAt || 0).getTime();
          const nextTime = new Date(record.updatedAt || record.createdAt || 0).getTime();
          if (nextTime >= prevTime) {
            latestByPet.set(petKey, record);
          }
        }

        const normalizedRecords = [...latestByPet.values()].sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime(),
        );

        if (isMounted) {
          setMedicalRecords(normalizedRecords);
        }
      } catch (err) {
        console.error("Error fetching booking medical records:", err);
        if (isMounted) {
          setMedicalError(err.response?.data?.message || "Không thể tải tiến trình ảnh");
          setMedicalRecords([]);
        }
      } finally {
        if (isMounted) {
          setMedicalLoading(false);
        }
      }
    };

    fetchBookingMedicalRecords();

    return () => {
      isMounted = false;
    };
  }, [isOpen, booking?._id]);

  if (!booking) return null;

  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  // Check if current staff owns this booking
  const isMyBooking =
    booking.assignedStaff?._id === currentUserId ||
    booking.assignedStaff === currentUserId;

  // Check if booking is unclaimed (pending/confirmed can be claimed by staff)
  const isUnclaimed =
    (booking.status === "pending" || booking.status === "confirmed") &&
    !booking.assignedStaff;

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format datetime
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStageNote = (record, stage) => {
    if (!Array.isArray(record?.stageHistory)) return "";

    const stageEntry = [...record.stageHistory]
      .filter((item) => item?.stage === stage)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

    return String(stageEntry?.notes || "").trim();
  };

  const getStagePhotos = (record, stage) => {
    if (stage === "received") return Array.isArray(record?.receivedPhotos) ? record.receivedPhotos : [];
    if (stage === "completed") return Array.isArray(record?.completedPhotos) ? record.completedPhotos : [];
    return [];
  };

  // Get customer info
  const getCustomerInfo = () => {
    if (booking.guestInfo) {
      return {
        name: booking.guestInfo.name,
        email: booking.guestInfo.email,
        phone: booking.guestInfo.phone,
        isGuest: true,
      };
    }
    if (booking.customer) {
      return {
        name: booking.customer.name,
        email: booking.customer.email,
        phone: booking.customer.phone,
        isGuest: false,
      };
    }
    return { name: "N/A", email: "", phone: "", isGuest: false };
  };

  const customer = getCustomerInfo();

  // Get status label based on role
  const getStatusLabel = () => {
    if (role === "staff") {
      return STAFF_STATUS_LABELS[booking.status] || status.label;
    }
    return status.label;
  };

  // Handle claim booking
  const handleClaimBooking = async () => {
    setIsUpdating(true);
    try {
      await onClaimBooking(booking._id);
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(booking, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle staff assignment (Admin only)
  const handleAssignStaff = async () => {
    if (!selectedStaff) return;
    setIsUpdating(true);
    try {
      await onAssignStaff(booking._id, selectedStaff);
    } finally {
      setIsUpdating(false);
    }
  };

  // Get actions based on role
  const renderActions = () => {
    // Admin: View only, no actions
    if (role === "admin") {
      return null;
    }

    // Staff actions
    if (role === "staff") {
      // Unclaimed booking -> Claim button
      if (isUnclaimed) {
        return (
          <div className="px-6 py-4 bg-linear-to-r from-amber-50 to-amber-100/50 border-t border-amber-200">
            <button
              onClick={handleClaimBooking}
              disabled={isUpdating}
              className="w-full py-3 px-4 bg-[#5B8C51] text-white font-medium rounded-xl hover:bg-[#4a7a42] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus size={20} />
              Accept This Order
            </button>
          </div>
        );
      }

      // My booking -> Show status actions
      if (isMyBooking) {
        const canSubmitManualStatus = nextStatus && nextStatus !== booking.status;

        return (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
            {booking.status === "confirmed" && (
              <button
                onClick={() => handleStatusUpdate("in-progress")}
                disabled={isUpdating}
                className="w-full py-3 px-4 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle size={20} />
                Bắt đầu thực hiện
              </button>
            )}

            {booking.status === "in-progress" && (
              <button
                onClick={() => handleStatusUpdate("completed")}
                disabled={isUpdating}
                className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                Complete
              </button>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Manual Status Update
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                  disabled={isUpdating}
                >
                  {STAFF_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleStatusUpdate(nextStatus)}
                  disabled={!canSubmitManualStatus || isUpdating}
                  className="px-4 py-2 rounded-lg bg-[#5B8C51] text-white text-sm font-medium hover:bg-[#4a7a42] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update
                </button>
              </div>
              {(nextStatus === "in-progress" || nextStatus === "completed") && (
                <p className="text-[11px] text-gray-500">
                  When moving to check-in or checkout, note and photo upload is required.
                </p>
              )}
            </div>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div
              className={`px-6 py-4 text-white flex items-center justify-between ${
                role === "admin"
                  ? "bg-linear-to-r from-blue-600 to-blue-700"
                  : "bg-linear-to-r from-[#5B8C51] to-[#4a7a42]"
              }`}
            >
              <div>
                <h2 className="text-xl font-bold">
                  {role === "admin" ? "Booking Details" : "Order Information"}
                </h2>
                <p className="text-white/80 text-sm">#{booking.bookingNumber}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Tags */}
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-medium ${status.color}`}
                >
                  <StatusIcon size={18} />
                  {getStatusLabel()}
                </span>
                {booking.isPaid && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <DollarSign size={16} />
                    Paid
                  </span>
                )}
                {customer.isGuest && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    <User size={16} />
                    Walk-in Customer
                  </span>
                )}
                {role === "staff" && isMyBooking && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E8F3D6] text-[#5B8C51] rounded-full text-sm font-medium">
                    <UserCheck size={16} />
                    Đơn của bạn
                  </span>
                )}
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-[#2D3436] mb-3 flex items-center gap-2">
                  <User size={18} className="text-[#5B8C51]" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-gray-700">{customer.name}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      <span className="text-gray-700">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-gray-700">{customer.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-[#2D3436] mb-3 flex items-center gap-2">
                  <Calendar size={18} className="text-[#5B8C51]" />
                  Booking Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-700">
                      {formatDate(booking.bookingDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-gray-700">{booking.bookingTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-gray-400" />
                    <span className="text-gray-700">
                      {PAYMENT_LABELS[booking.paymentMethod]}
                    </span>
                  </div>
                  {booking.room && (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-gray-700">
                        Phòng: {booking.room.roomNumber || booking.room.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Services */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-[#2D3436] mb-3 flex items-center gap-2">
                  <PawPrint size={18} className="text-[#5B8C51]" />
                  Booked Services ({booking.items?.length || 0})
                </h3>
                <div className="space-y-2">
                  {booking.items?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 bg-white rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#E8F3D6] rounded-lg flex items-center justify-center">
                          <PawPrint size={20} className="text-[#5B8C51]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[#2D3436]">
                              {item.service?.name || "Service"}
                            </p>
                            {(item.group || item.service?.group) && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  (item.group || item.service?.group) === "wet"
                                    ? "bg-blue-50 text-blue-700 border-blue-100"
                                    : "bg-amber-50 text-amber-700 border-amber-100"
                                }`}
                              >
                                {SERVICE_GROUP_LABELS[item.group || item.service?.group] || "Dry"}
                              </span>
                            )}
                          </div>
                          {(item.pet || item.guestPet) && (
                            <p className="text-xs text-gray-500">
                              Pet: {item.pet?.petName || item.pet?.name || item.guestPet?.petName}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Notes: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[#5B8C51]">
                          {formatCurrency(item.price)}
                        </p>
                        <p className="text-xs text-gray-500">x{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="font-semibold text-[#2D3436]">Tổng cộng</span>
                  <span className="text-xl font-bold text-[#5B8C51]">
                    {formatCurrency(booking.totalAmount)}
                  </span>
                </div>
                {booking.depositAmount > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Đã đặt cọc</span>
                    <span className="text-gray-700">
                      {formatCurrency(booking.depositAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Medical Progress */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-[#2D3436] mb-3 flex items-center gap-2">
                  <Camera size={18} className="text-[#5B8C51]" />
                  Tiến trình ảnh dịch vụ
                </h3>

                {medicalLoading ? (
                  <div className="py-6 flex items-center justify-center">
                    <div className="w-7 h-7 border-2 border-[#5B8C51] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : medicalError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {medicalError}
                  </div>
                ) : medicalRecords.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-white rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center">
                    Chưa có ảnh tiến trình cho booking này.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medicalRecords.map((record) => {
                      const checkInPhotos = getStagePhotos(record, "received");
                      const checkoutPhotos = getStagePhotos(record, "completed");
                      const checkInNote = getStageNote(record, "received");
                      const checkoutNote = getStageNote(record, "completed");

                      return (
                        <div key={record._id} className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-[#2D3436]">
                              {record.userPet?.petName || "Pet"}
                            </p>
                            <span className="text-xs text-gray-500">
                              Last update: {formatDateTime(record.updatedAt || record.createdAt)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                Check-in
                              </p>
                              {checkInPhotos.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2">
                                  {checkInPhotos.map((photo, index) => (
                                    <a
                                      key={`${record._id}-received-${index}`}
                                      href={photo}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block"
                                    >
                                      <img
                                        src={photo}
                                        alt={`Check-in ${index + 1}`}
                                        className="w-full h-20 object-cover rounded-md border border-blue-100"
                                      />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">No check-in photos</p>
                              )}
                              {checkInNote && (
                                <p className="text-xs text-gray-600">Note: {checkInNote}</p>
                              )}
                            </div>

                            <div className="rounded-lg border border-green-100 bg-green-50/40 p-3 space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                                Check-out
                              </p>
                              {checkoutPhotos.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2">
                                  {checkoutPhotos.map((photo, index) => (
                                    <a
                                      key={`${record._id}-completed-${index}`}
                                      href={photo}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block"
                                    >
                                      <img
                                        src={photo}
                                        alt={`Check-out ${index + 1}`}
                                        className="w-full h-20 object-cover rounded-md border border-green-100"
                                      />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">No check-out photos</p>
                              )}
                              {checkoutNote && (
                                <p className="text-xs text-gray-600">Note: {checkoutNote}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assigned Staff */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-[#2D3436] mb-3 flex items-center gap-2">
                  <UserCheck size={18} className="text-[#5B8C51]" />
                  Nhân viên phụ trách
                </h3>
                {booking.assignedStaff ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#E8F3D6] rounded-full flex items-center justify-center">
                      <User size={20} className="text-[#5B8C51]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#2D3436]">
                        {booking.assignedStaff.name}
                        {isMyBooking && role === "staff" && (
                          <span className="ml-2 text-xs text-[#5B8C51]">(Bạn)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.assignedStaff.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-500 text-sm">
                      {role === "staff"
                        ? "Đơn này chưa có ai nhận"
                        : "Chưa có nhân viên phụ trách"}
                    </p>
                    {/* Admin can assign staff */}
                    {role === "admin" && staffList.length > 0 && (
                      <div className="flex gap-2">
                        <select
                          value={selectedStaff}
                          onChange={(e) => setSelectedStaff(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                        >
                          <option value="">-- Select Staff --</option>
                          {staffList.map((staff) => (
                            <option key={staff._id} value={staff._id}>
                              {staff.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAssignStaff}
                          disabled={!selectedStaff || isUpdating}
                          className="px-4 py-2 bg-[#5B8C51] text-white text-sm font-medium rounded-lg hover:bg-[#4a7a42] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Gán
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Room Info */}
              {booking.room && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h3 className="font-semibold text-[#2D3436] mb-3 flex items-center gap-2">
                    <DoorOpen size={18} className="text-purple-600" />
                    Accommodation Room
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <DoorOpen size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[#2D3436]">
                        {booking.room.roomNumber || booking.room.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.room.type && (
                          <span className="capitalize">{booking.room.type}</span>
                        )}
                        {booking.room.capacity && (
                          <span> • Sức chứa: {booking.room.capacity}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {booking.notes && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-[#2D3436] mb-2 flex items-center gap-2">
                    <FileText size={18} className="text-[#5B8C51]" />
                    Ghi chú
                  </h3>
                  <p className="text-gray-600 text-sm">{booking.notes}</p>
                </div>
              )}

              {/* Cancellation Info */}
              {booking.status === "cancelled" && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <XCircle size={18} />
                    Cancellation Info
                  </h3>
                  {booking.cancellationReason && (
                    <p className="text-red-600 text-sm mb-2">
                      Lý do: {booking.cancellationReason}
                    </p>
                  )}
                  {booking.cancelledAt && (
                    <p className="text-red-500 text-xs">
                      Cancelled at: {formatDateTime(booking.cancelledAt)}
                    </p>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <History size={14} />
                Tạo lúc: {formatDateTime(booking.createdAt)}
                {booking.updatedAt !== booking.createdAt && (
                  <span>• Updated: {formatDateTime(booking.updatedAt)}</span>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            {renderActions()}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BookingDetailModal;
