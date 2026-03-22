import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useScrollLock from '../../hooks/useScrollLock';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
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
import { createGuestBooking, getAvailableSlots } from "../../api/bookingApi";
import TimeSlotPicker from "./TimeSlotPicker";

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

const BOOKING_TYPES = [
  { value: "service", label: "Dich vu spa" },
  { value: "boarding", label: "Phong luu tru" },
];

const BOARDING_KEYWORDS = ["boarding", "luu tru", "luu tru", "hotel", "stay", "overnight"];

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isBoardingService = (service) => {
  const name = normalizeText(service?.name || "");
  const description = normalizeText(service?.description || "");
  const categoryName = normalizeText(
    service?.category?.name || service?.categoryName || "",
  );

  // Category/name are the most reliable signals for boarding-type services.
  const byCategory = BOARDING_KEYWORDS.some((keyword) =>
    categoryName.includes(keyword),
  );
  const byName = BOARDING_KEYWORDS.some((keyword) => name.includes(keyword));

  // Keep description as a fallback but avoid over-matching short generic terms.
  const byDescription = ["boarding", "luu tru", "overnight", "hotel"].some(
    (keyword) => description.includes(keyword),
  );

  return byCategory || byName || byDescription;
};

// Derive service type from selected services for time slot interval logic
const getServiceType = (selectedServices) => {
  if (!selectedServices.length) return "default";
  const names = selectedServices.map((s) =>
    (s.service.name || "").toLowerCase(),
  );
  if (names.some((n) => n.includes("boarding") || n.includes("lưu trú")))
    return "boarding";
  return "default";
};

const GuestBookingModal = ({ isOpen, onClose, onSuccess }) => {
  // Guest info state
  const [guestInfo, setGuestInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Booking info state
  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [bookingTime, setBookingTime] = useState("09:00");
  const [bookingType, setBookingType] = useState("service");
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
  const [disabledSlots, setDisabledSlots] = useState([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
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
      setBookingType("service");
      setPaymentMethod("cash");
      setNotes("");
      setPetName("");
      setPetType("dog");
      setSelectedServices([]);
      setDisabledSlots([]);
      setSearchQuery("");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const response = await getAllServices({
        isActive: true,
        page: 1,
        limit: 100,
        sortBy: "name",
        sortOrder: "asc",
      });
      const list =
        response?.data?.services ||
        response?.services ||
        response?.data ||
        [];
      setServices(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error fetching services:", err);
    } finally {
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    const primaryService = selectedServices[0]?.service;
    if (!isOpen || !bookingDate || !primaryService?._id) {
      setDisabledSlots([]);
      return;
    }

    let alive = true;

    const loadAvailableSlots = async () => {
      try {
        setSlotsLoading(true);
        const response = await getAvailableSlots(bookingDate, primaryService._id);
        const slots = response?.data?.disabledSlots || [];
        if (!alive) return;
        setDisabledSlots(Array.isArray(slots) ? slots : []);
      } catch (err) {
        if (!alive) return;
        setDisabledSlots([]);
      } finally {
        if (alive) setSlotsLoading(false);
      }
    };

    loadAvailableSlots();

    return () => {
      alive = false;
    };
  }, [isOpen, bookingDate, selectedServices]);

  // Filter services by search
  const filteredServices = services.filter((service) => {
    if (bookingType === "boarding" && !isBoardingService(service)) return false;
    if (bookingType === "service" && isBoardingService(service)) return false;

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      service.name?.toLowerCase().includes(query) ||
      service.description?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    setSelectedServices([]);
    setSearchQuery("");
  }, [bookingType]);

  // Add service to selection
  const handleAddService = (service) => {
    const existing = selectedServices.find(
      (s) => s.service._id === service._id,
    );
    if (existing) {
      // Increase quantity
      setSelectedServices(
        selectedServices.map((s) =>
          s.service._id === service._id
            ? { ...s, quantity: s.quantity + 1 }
            : s,
        ),
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
    setSelectedServices(
      selectedServices.filter((s) => s.service._id !== serviceId),
    );
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
        .filter(Boolean),
    );
  };

  // Calculate total
  const totalAmount = selectedServices.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
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
        appointmentDate: `${bookingDate}T${bookingTime}:00`,
        petInfo: {
          petName,
          petType,
        },
        items: selectedServices.map((s) => ({
          service: s.service._id,
          quantity: s.quantity,
          note: s.note || "",
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
              {/* Left column - Customer & pet info */}
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
                            setGuestInfo({
                              ...guestInfo,
                              email: e.target.value,
                            })
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
                            setGuestInfo({
                              ...guestInfo,
                              phone: e.target.value,
                            })
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

              </div>

              {/* Right column - Booking flow */}
              <div className="space-y-4">
                {/* Booking details */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-[#5B8C51]" />
                    Thông tin đặt lịch
                  </h3>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại đặt lịch
                    </label>
                    <div className="flex gap-2">
                      {BOOKING_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setBookingType(type.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            bookingType === type.value
                              ? "bg-[#5B8C51] text-white"
                              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
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
                    <div className="col-span-2">
                      {slotsLoading ? (
                        <div className="flex items-center justify-center py-2 text-gray-500 text-xs gap-2">
                          <RefreshCw className="animate-spin" size={14} />
                          Đang tải giờ khả dụng...
                        </div>
                      ) : null}
                      <TimeSlotPicker
                        serviceType={
                          bookingType === "boarding"
                            ? "boarding"
                            : getServiceType(selectedServices)
                        }
                        selectedTime={bookingTime}
                        onChange={setBookingTime}
                        disabledSlots={disabledSlots}
                        compact
                        maxHeightClass="max-h-36"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phương thức thanh toán
                    </label>
                    <div className="flex flex-wrap gap-2">
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

                {/* Service/Room Search */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
                    <ShoppingBag size={18} className="text-[#5B8C51]" />
                    {bookingType === "boarding"
                      ? "Chọn phòng lưu trú"
                      : "Chọn dịch vụ"}
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
                      placeholder={
                        bookingType === "boarding"
                          ? "Tìm kiếm phòng lưu trú..."
                          : "Tìm kiếm dịch vụ..."
                      }
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                    />
                  </div>

                  {/* Services list */}
                  <div className="max-h-[180px] overflow-y-auto space-y-2">
                    {servicesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <RefreshCw
                          className="animate-spin text-gray-400"
                          size={20}
                        />
                      </div>
                    ) : filteredServices.length === 0 ? (
                      <p className="text-center text-gray-500 text-sm py-4">
                        {bookingType === "boarding"
                          ? "Không tìm thấy phòng lưu trú"
                          : "Không tìm thấy dịch vụ"}
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
                              {formatCurrency(service.price)} •{" "}
                              {service.duration} phút
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
                    {bookingType === "boarding" ? "Phòng đã chọn" : "Dịch vụ đã chọn"} ({selectedServices.length})
                  </h3>
                  {selectedServices.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">
                      {bookingType === "boarding" ? "Chưa chọn phòng nào" : "Chưa chọn dịch vụ nào"}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto">
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
                              onClick={() =>
                                handleRemoveService(item.service._id)
                              }
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
