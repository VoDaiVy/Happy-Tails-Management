import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useScrollLock from '../../hooks/useScrollLock';
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
};

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
  useScrollLock(isOpen);

  if (!booking) return null;

  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  // Check if current staff owns this booking
  const isMyBooking =
    booking.assignedStaff?._id === currentUserId ||
    booking.assignedStaff === currentUserId;

  // Check if booking is unclaimed
  const isUnclaimed = booking.status === "pending" && !booking.assignedStaff;

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
      await onUpdateStatus(booking._id, newStatus);
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
          <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border-t border-amber-200">
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
        if (booking.status === "confirmed") {
          return (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => handleStatusUpdate("in-progress")}
                disabled={isUpdating}
                className="w-full py-3 px-4 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle size={20} />
                Bắt đầu thực hiện
              </button>
            </div>
          );
        }

        if (booking.status === "in-progress") {
          return (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => handleStatusUpdate("completed")}
                disabled={isUpdating}
                className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                Complete
              </button>
            </div>
          );
        }
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
                  ? "bg-gradient-to-r from-blue-600 to-blue-700"
                  : "bg-gradient-to-r from-[#5B8C51] to-[#4a7a42]"
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
