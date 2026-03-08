import React from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CreditCard,
  Eye,
  CheckCircle,
  XCircle,
  PlayCircle,
  AlertCircle,
  PawPrint,
  UserPlus,
  UserCheck,
  DoorOpen,
} from "lucide-react";

// Status configuration
const STATUS_CONFIG = {
  pending: {
    label: "Chờ xác nhận",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: AlertCircle,
    iconColor: "text-amber-500",
  },
  confirmed: {
    label: "Đã xác nhận",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: CheckCircle,
    iconColor: "text-blue-500",
  },
  "in-progress": {
    label: "Đang thực hiện",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: PlayCircle,
    iconColor: "text-purple-500",
  },
  completed: {
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle,
    iconColor: "text-green-500",
  },
  cancelled: {
    label: "Đã hủy",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    iconColor: "text-red-500",
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
  card: "Thẻ",
  online: "Online",
  wallet: "Ví điện tử",
};

const BookingCard = ({
  booking,
  role = "staff",
  currentUserId,
  onViewDetail,
  onUpdateStatus,
  onClaimBooking,
}) => {
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
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Get customer name
  const getCustomerName = () => {
    if (booking.guestInfo?.name) return booking.guestInfo.name;
    if (booking.customer?.name) return booking.customer.name;
    return "Khách hàng";
  };

  // Get customer contact
  const getCustomerContact = () => {
    if (booking.guestInfo) {
      return {
        email: booking.guestInfo.email,
        phone: booking.guestInfo.phone,
      };
    }
    if (booking.customer) {
      return {
        email: booking.customer.email,
        phone: booking.customer.phone,
      };
    }
    return { email: "", phone: "" };
  };

  const contact = getCustomerContact();

  // Get status label based on role
  const getStatusLabel = () => {
    if (role === "staff") {
      return STAFF_STATUS_LABELS[booking.status] || status.label;
    }
    return status.label;
  };

  // Render actions based on role
  const renderActions = () => {
    // Admin: No actions (view only)
    if (role === "admin") {
      return null;
    }

    // Staff actions
    if (role === "staff") {
      // Đơn chưa ai nhận -> hiện nút "Nhận đơn"
      if (isUnclaimed) {
        return (
          <div className="px-4 py-2 bg-gradient-to-r from-[#5B8C51]/10 to-[#5B8C51]/5 border-t border-gray-100">
            <button
              onClick={() => onClaimBooking(booking._id)}
              className="w-full py-2 px-3 bg-[#5B8C51] text-white text-sm font-medium rounded-lg hover:bg-[#4a7a42] transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              Nhận đơn này
            </button>
          </div>
        );
      }

      // Đơn của mình
      if (isMyBooking) {
        // confirmed -> in-progress
        if (booking.status === "confirmed") {
          return (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => onUpdateStatus(booking._id, "in-progress")}
                className="w-full py-1.5 px-3 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle size={16} />
                Bắt đầu thực hiện
              </button>
            </div>
          );
        }

        // in-progress -> completed
        if (booking.status === "in-progress") {
          return (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => onUpdateStatus(booking._id, "completed")}
                className="w-full py-1.5 px-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                Hoàn thành
              </button>
            </div>
          );
        }
      }
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
        isUnclaimed && role === "staff"
          ? "border-amber-300 ring-1 ring-amber-200"
          : isMyBooking && role === "staff"
          ? "border-[#5B8C51] ring-1 ring-[#5B8C51]/20"
          : "border-gray-200"
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b border-gray-100 ${
          isUnclaimed && role === "staff"
            ? "bg-gradient-to-r from-amber-50 to-transparent"
            : isMyBooking && role === "staff"
            ? "bg-gradient-to-r from-[#5B8C51]/10 to-transparent"
            : "bg-gradient-to-r from-gray-50 to-transparent"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#2D3436]">
              #{booking.bookingNumber}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}
            >
              <StatusIcon size={12} />
              {getStatusLabel()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Show assigned staff indicator for staff role */}
            {role === "staff" && isMyBooking && (
              <span className="p-1.5 rounded-lg bg-[#5B8C51]/10 text-[#5B8C51]" title="Đơn của bạn">
                <UserCheck size={16} />
              </span>
            )}
            <button
              onClick={() => onViewDetail(booking)}
              className="p-1.5 rounded-lg hover:bg-[#5B8C51]/10 text-[#5B8C51] transition-colors"
              title="Xem chi tiết"
            >
              <Eye size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Customer Info */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E8F3D6] flex items-center justify-center flex-shrink-0">
            <User size={20} className="text-[#5B8C51]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#2D3436] truncate">
              {getCustomerName()}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              {contact.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={12} />
                  {contact.phone}
                </span>
              )}
              {contact.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail size={12} />
                  {contact.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Calendar size={16} className="text-[#5B8C51]" />
            <span>{formatDate(booking.bookingDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Clock size={16} className="text-[#5B8C51]" />
            <span>{booking.bookingTime}</span>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Dịch vụ ({booking.items?.length || 0})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {booking.items?.slice(0, 3).map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-700"
              >
                <PawPrint size={12} />
                {item.service?.name || "Dịch vụ"}
              </span>
            ))}
            {booking.items?.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-500">
                +{booking.items.length - 3} khác
              </span>
            )}
          </div>
        </div>

        {/* Assigned Staff (Admin view) */}
        {role === "admin" && booking.assignedStaff && (
          <div className="flex items-center gap-2 text-sm">
            <UserCheck size={16} className="text-blue-500" />
            <span className="text-gray-600">
              NV: <span className="font-medium">{booking.assignedStaff.name || "Đã gán"}</span>
            </span>
          </div>
        )}

        {/* Room Info */}
        {booking.room && (
          <div className="flex items-center gap-2 text-sm">
            <DoorOpen size={16} className="text-purple-500" />
            <span className="text-gray-600">
              Phòng: <span className="font-medium text-purple-700">{booking.room.roomNumber || booking.room.name || "Phòng"}</span>
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-gray-400" />
            <span className="text-xs text-gray-500">
              {PAYMENT_LABELS[booking.paymentMethod] || booking.paymentMethod}
            </span>
            {booking.isPaid && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                Đã thanh toán
              </span>
            )}
          </div>
          <p className="font-semibold text-[#5B8C51]">
            {formatCurrency(booking.totalAmount)}
          </p>
        </div>
      </div>

      {/* Actions */}
      {renderActions()}
    </motion.div>
  );
};

export default BookingCard;
