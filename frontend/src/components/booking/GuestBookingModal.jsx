import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useScrollLock from '../../hooks/useScrollLock';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Plus,
  Minus,
  PawPrint,
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { getAllServices } from "../../api/serviceApi";
import { createGuestBooking } from "../../api/bookingApi";

// Payment methods
const PAYMENT_METHODS = [
  { value: "cash", label: "Tiền mặt" },
  { value: "card", label: "Thẻ" },
  { value: "online", label: "Chuyển khoản" },
];

// Pet types
const PET_TYPES = [
  { value: "dog", label: "Chó" },
  { value: "cat", label: "Mèo" },
  { value: "bird", label: "Chim" },
  { value: "rabbit", label: "Thỏ" },
  { value: "hamster", label: "Hamster" },
  { value: "fish", label: "Cá" },
  { value: "other", label: "Khác" },
];

const GuestBookingModal = ({ isOpen, onClose, onSuccess }) => {
  // Guest info state
  const [guestInfo, setGuestInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Booking info state
  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [bookingTime, setBookingTime] = useState("09:00");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  // Pet info for services
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("dog");

  // Services state
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  useScrollLock(isOpen);

  // Fetch services on mount
  useEffect(() => {
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setGuestInfo({ name: "", email: "", phone: "" });
      setBookingDate(new Date().toISOString().split("T")[0]);
      setBookingTime("09:00");
      setPaymentMethod("cash");
      setNotes("");
      setPetName("");
      setPetType("dog");
      setSelectedServices([]);
      setSearchQuery("");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const response = await getAllServices({ isActive: true });
      setServices(response.data?.services || []);
    } catch (err) {
      console.error("Error fetching services:", err);
    } finally {
      setServicesLoading(false);
    }
  };

  // Filter services by search
  const filteredServices = services.filter((service) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      service.name?.toLowerCase().includes(query) ||
      service.description?.toLowerCase().includes(query)
    );
  });

  // Add service to selection
  const handleAddService = (service) => {
    const existing = selectedServices.find((s) => s.service._id === service._id);
    if (existing) {
      // Increase quantity
      setSelectedServices(
        selectedServices.map((s) =>
          s.service._id === service._id
            ? { ...s, quantity: s.quantity + 1 }
            : s
        )
      );
    } else {
      // Add new
      setSelectedServices([
        ...selectedServices,
        { service, quantity: 1, price: service.price },
      ]);
    }
  };

  // Remove service from selection
  const handleRemoveService = (serviceId) => {
    setSelectedServices(selectedServices.filter((s) => s.service._id !== serviceId));
  };

  // Update quantity
  const handleUpdateQuantity = (serviceId, delta) => {
    setSelectedServices(
      selectedServices
        .map((s) => {
          if (s.service._id === serviceId) {
            const newQty = s.quantity + delta;
            return newQty > 0 ? { ...s, quantity: newQty } : null;
          }
          return s;
        })
        .filter(Boolean)
    );
  };

  // Calculate total
  const totalAmount = selectedServices.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!guestInfo.name || !guestInfo.email || !guestInfo.phone) {
      setError("Vui lòng nhập đầy đủ thông tin khách hàng");
      return;
    }

    if (selectedServices.length === 0) {
      setError("Vui lòng chọn ít nhất một dịch vụ");
      return;
    }

    if (!petName) {
      setError("Vui lòng nhập tên thú cưng");
      return;
    }

    try {
      setIsSubmitting(true);

      const bookingData = {
        guestInfo,
        items: selectedServices.map((s) => ({
          service: s.service._id,
          quantity: s.quantity,
          price: s.price,
          // Thêm thông tin pet tạm (guest booking không có pet trong DB)
          petInfo: {
            petName,
            petType,
          },
        })),
        bookingDate,
        bookingTime,
        paymentMethod,
        notes,
      };

      await createGuestBooking(bookingData);
      setSuccess(true);

      // Auto close after success
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error creating guest booking:", err);
      setError(err.response?.data?.message || "Không thể tạo đơn đặt lịch");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#5B8C51]/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#5B8C51] rounded-xl">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#2D3436]">
                  Tạo đơn Offline
                </h2>
                <p className="text-sm text-gray-500">
                  Tạo đơn đặt lịch cho khách vãng lai
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Success message */}
          {success && (
            <div className="p-4 bg-green-50 border-b border-green-200 flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <span className="text-green-700 font-medium">
                Tạo đơn thành công!
              </span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 flex items-center gap-3">
              <AlertCircle className="text-red-600" size={20} />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column - Guest info & Booking details */}
              <div className="space-y-6">
                {/* Guest Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
                    <User size={18} className="text-[#5B8C51]" />
                    Thông tin khách hàng
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Họ tên *
                      </label>
                      <input
                        type="text"
                        required
                        value={guestInfo.name}
                        onChange={(e) =>
                          setGuestInfo({ ...guestInfo, name: e.target.value })
                        }
                        placeholder="Nguyễn Văn A"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <div className="relative">
                        <Mail
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="email"
                          required
                          value={guestInfo.email}
                          onChange={(e) =>
                            setGuestInfo({ ...guestInfo, email: e.target.value })
                          }
                          placeholder="email@example.com"
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Số điện thoại *
                      </label>
                      <div className="relative">
                        <Phone
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="tel"
                          required
                          value={guestInfo.phone}
                          onChange={(e) =>
                            setGuestInfo({ ...guestInfo, phone: e.target.value })
                          }
                          placeholder="0912345678"
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pet Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
                    <PawPrint size={18} className="text-[#5B8C51]" />
                    Thông tin thú cưng
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên thú cưng *
                      </label>
                      <input
                        type="text"
                        required
                        value={petName}
                        onChange={(e) => setPetName(e.target.value)}
                        placeholder="Lucky"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loại thú cưng
                      </label>
                      <select
                        value={petType}
                        onChange={(e) => setPetType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                      >
                        {PET_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-[#5B8C51]" />
                    Thông tin đặt lịch
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ngày
                      </label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giờ
                      </label>
                      <div className="relative">
                        <Clock
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="time"
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phương thức thanh toán
                    </label>
                    <div className="flex gap-2">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setPaymentMethod(method.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            paymentMethod === method.value
                              ? "bg-[#5B8C51] text-white"
                              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <CreditCard size={16} />
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ghi chú
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ghi chú thêm cho đơn hàng..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                    />
                  </div>
                </div>
              </div>

              {/* Right column - Services selection */}
              <div className="space-y-4">
                {/* Services Search */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
                    <ShoppingBag size={18} className="text-[#5B8C51]" />
                    Chọn dịch vụ
                  </h3>
                  <div className="relative mb-3">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm dịch vụ..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                    />
                  </div>

                  {/* Services list */}
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {servicesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <RefreshCw className="animate-spin text-gray-400" size={20} />
                      </div>
                    ) : filteredServices.length === 0 ? (
                      <p className="text-center text-gray-500 text-sm py-4">
                        Không tìm thấy dịch vụ
                      </p>
                    ) : (
                      filteredServices.map((service) => (
                        <div
                          key={service._id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-[#5B8C51]/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#2D3436] text-sm truncate">
                              {service.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(service.price)} • {service.duration} phút
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddService(service)}
                            className="p-1.5 bg-[#5B8C51] text-white rounded-lg hover:bg-[#4a7a42] transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Selected Services */}
                <div className="bg-[#5B8C51]/5 rounded-xl p-4 border border-[#5B8C51]/20">
                  <h3 className="font-semibold text-[#2D3436] mb-3">
                    Dịch vụ đã chọn ({selectedServices.length})
                  </h3>
                  {selectedServices.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">
                      Chưa chọn dịch vụ nào
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {selectedServices.map((item) => (
                        <div
                          key={item.service._id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#2D3436] text-sm truncate">
                              {item.service.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(item.price)} x {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQuantity(item.service._id, -1)
                              }
                              className="p-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQuantity(item.service._id, 1)
                              }
                              className="p-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveService(item.service._id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors ml-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total */}
                  <div className="mt-4 pt-4 border-t border-[#5B8C51]/20 flex items-center justify-between">
                    <span className="font-semibold text-[#2D3436]">
                      Tổng tiền:
                    </span>
                    <span className="text-xl font-bold text-[#5B8C51]">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedServices.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-[#5B8C51] text-white rounded-lg hover:bg-[#4a7a42] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Tạo đơn
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuestBookingModal;
