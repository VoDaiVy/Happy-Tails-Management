import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  XCircle,
  LayoutGrid,
  List,
  Download,
  Eye,
  ClipboardList,
  Plus,
  X,
  ImagePlus,
} from "lucide-react";
import BookingCard from "../../components/booking/BookingCard";
import BookingDetailModal from "../../components/booking/BookingDetailModal";
import GuestBookingModal from "../../components/booking/GuestBookingModal";
import AdminFilterBar from "../../components/dashboard/AdminFilterBar";
import {
  getAllBookings,
  updateBookingStatus,
  assignStaffToBooking,
} from "../../api/bookingApi";
import { uploadMultipleImages } from "../../api/uploadApi";

// Status tabs configuration
const STATUS_TABS_STAFF = [
  {
    key: "pending",
    label: "Pending",
    icon: AlertCircle,
    color: "text-amber-500",
  },
  {
    key: "confirmed",
    label: "Accepted",
    icon: CheckCircle,
    color: "text-blue-500",
  },
  {
    key: "in-progress",
    label: "In Progress",
    icon: PlayCircle,
    color: "text-purple-500",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-500",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    color: "text-red-500",
  },
];

const STATUS_TABS_ADMIN = [
  { key: "all", label: "All", icon: LayoutGrid, color: "text-gray-600" },
  {
    key: "confirmed",
    label: "Confirmed",
    icon: CheckCircle,
    color: "text-blue-500",
  },
  {
    key: "in-progress",
    label: "In Progress",
    icon: PlayCircle,
    color: "text-purple-500",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-500",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    color: "text-red-500",
  },
];

const BookingBoard = () => {
  const location = useLocation();

  // Determine role from path
  const isAdmin = location.pathname.startsWith("/admin");
  const role = isAdmin ? "admin" : "staff";

  // State
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(
    role === "staff" ? "pending" : "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMedicalWorkflowModal, setShowMedicalWorkflowModal] = useState(false);
  const [workflowBooking, setWorkflowBooking] = useState(null);
  const [workflowTargetStatus, setWorkflowTargetStatus] = useState("");
  const [workflowNotes, setWorkflowNotes] = useState("");
  const [workflowFiles, setWorkflowFiles] = useState([]);
  const [workflowError, setWorkflowError] = useState(null);
  const [workflowSubmitting, setWorkflowSubmitting] = useState(false);

  // Get current user ID from localStorage
  const getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user._id || user.id || null;
    } catch {
      return null;
    }
  };

  const currentUserId = getCurrentUserId();

  // Status tabs based on role
  const STATUS_TABS = role === "admin" ? STATUS_TABS_ADMIN : STATUS_TABS_STAFF;

  // Calculate counts for each status
  const getStatusCounts = useCallback(() => {
    const counts = {
      all: bookings.length,
      pending: 0,
      confirmed: 0,
      "in-progress": 0,
      completed: 0,
      cancelled: 0,
    };

    bookings.forEach((booking) => {
      if (counts[booking.status] !== undefined) {
        counts[booking.status]++;
      }
    });

    return counts;
  }, [bookings]);

  const statusCounts = getStatusCounts();

  // Fetch bookings
  const fetchBookings = useCallback(
    async (showRefreshSpinner = false) => {
      try {
        if (showRefreshSpinner) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const params = {};
        if (selectedDate) params.date = selectedDate;

        const response = await getAllBookings(params);
        const fetchedRaw = response?.data;
        let fetchedBookings = [];
        if (Array.isArray(fetchedRaw)) {
          fetchedBookings = fetchedRaw;
        } else if (Array.isArray(fetchedRaw?.bookings)) {
          fetchedBookings = fetchedRaw.bookings;
        } else if (Array.isArray(response?.bookings)) {
          fetchedBookings = response.bookings;
        }

        // Staff sees: unassigned pending/confirmed bookings OR their own bookings
        if (role === "staff" && currentUserId) {
          fetchedBookings = fetchedBookings.filter((booking) => {
            // Unassigned pending/confirmed booking
            if (
              (booking.status === "pending" || booking.status === "confirmed") &&
              !booking.assignedStaff
            ) {
              return true;
            }
            // Own booking (any status)
            if (
              booking.assignedStaff?._id === currentUserId ||
              booking.assignedStaff === currentUserId
            ) {
              return true;
            }
            return false;
          });
        }

        setBookings(fetchedBookings);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError(err.response?.data?.error?.message || err.response?.data?.message || "Cannot load bookings");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedDate, role, currentUserId],
  );

  // Initial fetch
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    // Filter by status
    if (activeTab !== "all" && booking.status !== activeTab) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const customerName =
        booking.customer?.name?.toLowerCase() ||
        booking.guestInfo?.name?.toLowerCase() ||
        "";
      const bookingNumber = booking.bookingNumber?.toLowerCase() || "";
      const customerEmail =
        booking.customer?.email?.toLowerCase() ||
        booking.guestInfo?.email?.toLowerCase() ||
        "";
      const customerPhone =
        booking.customer?.phone?.toLowerCase() ||
        booking.guestInfo?.phone?.toLowerCase() ||
        "";

      if (
        !customerName.includes(query) &&
        !bookingNumber.includes(query) &&
        !customerEmail.includes(query) &&
        !customerPhone.includes(query)
      ) {
        return false;
      }
    }

    return true;
  });

  // Handle view detail
  const handleViewDetail = (booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  // Handle claim booking (Staff accepts order)
  const handleClaimBooking = async (bookingId) => {
    if (!currentUserId) {
      alert("Cannot identify user. Please login again.");
      return;
    }
    try {
      // Gán staff và chuyển sang confirmed
      await assignStaffToBooking(bookingId, currentUserId);
      await updateBookingStatus(bookingId, "confirmed");
      fetchBookings(true);
    } catch (err) {
      console.error("Error claiming booking:", err);
      alert(err.response?.data?.message || "Cannot accept booking");
    }
  };

  const openMedicalWorkflowModal = (booking, targetStatus) => {
    setWorkflowBooking(booking);
    setWorkflowTargetStatus(targetStatus);
    setWorkflowNotes("");
    setWorkflowFiles([]);
    setWorkflowError(null);
    setShowMedicalWorkflowModal(true);
  };

  const closeMedicalWorkflowModal = () => {
    if (workflowSubmitting) return;
    setShowMedicalWorkflowModal(false);
    setWorkflowBooking(null);
    setWorkflowTargetStatus("");
    setWorkflowNotes("");
    setWorkflowFiles([]);
    setWorkflowError(null);
  };

  const handleMedicalWorkflowSubmit = async () => {
    if (!workflowBooking?._id || !workflowTargetStatus) return;

    const notes = workflowNotes.trim();
    if (!notes) {
      setWorkflowError("Vui lòng nhập note cho bước này.");
      return;
    }

    if (!workflowFiles.length) {
      setWorkflowError("Vui lòng upload ít nhất 1 ảnh.");
      return;
    }

    setWorkflowSubmitting(true);
    setWorkflowError(null);

    try {
      const uploadedFiles = await uploadMultipleImages(workflowFiles);
      const photoUrls = (uploadedFiles || [])
        .map((item) => (typeof item === "string" ? item : item?.url))
        .filter(Boolean);

      if (!photoUrls.length) {
        setWorkflowError("Upload ảnh không thành công. Vui lòng thử lại.");
        return;
      }

      await updateBookingStatus(workflowBooking._id, workflowTargetStatus, {
        notes,
        photos: photoUrls,
      });

      closeMedicalWorkflowModal();
      await fetchBookings(true);
    } catch (err) {
      console.error("Error submitting medical workflow:", err);
      setWorkflowError(err.response?.data?.message || "Không thể cập nhật check-in/check-out");
    } finally {
      setWorkflowSubmitting(false);
    }
  };

  // Handle update status
  const handleUpdateStatus = async (bookingInput, newStatus) => {
    try {
      const bookingId = typeof bookingInput === "string" ? bookingInput : bookingInput?._id;
      const booking =
        typeof bookingInput === "string"
          ? bookings.find((item) => item._id === bookingInput) || selectedBooking
          : bookingInput;

      if (!bookingId) {
        alert("Cannot identify booking.");
        return;
      }

      if (booking?.status === newStatus) {
        return;
      }

      // Staff must complete medical workflow for check-in/check-out when booking has linked pets.
      const hasLinkedPet = Boolean(booking?.items?.some((item) => item?.pet));
      if (
        role === "staff" &&
        hasLinkedPet &&
        (newStatus === "in-progress" || newStatus === "completed")
      ) {
        openMedicalWorkflowModal(booking, newStatus);
        if (isModalOpen) {
          setIsModalOpen(false);
          setSelectedBooking(null);
        }
        return;
      }

      await updateBookingStatus(bookingId, newStatus);
      fetchBookings(true);
      if (isModalOpen) {
        setIsModalOpen(false);
        setSelectedBooking(null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert(err.response?.data?.message || "Cannot update status");
    }
  };

  // Handle assign staff (Admin only)
  const handleAssignStaff = async (bookingId, staffId) => {
    try {
      await assignStaffToBooking(bookingId, staffId);
      fetchBookings(true);
    } catch (err) {
      console.error("Error assigning staff:", err);
      alert(err.response?.data?.message || "Cannot assign staff");
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchBookings(true);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDate("");
    setActiveTab(role === "staff" ? "pending" : "all");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#D97853] mb-1">
            {role === "staff" ? "Process Bookings" : "Booking Management"}
          </h1>
          <p className="text-sm text-[#2D3436]/60">
            {role === "staff"
              ? "Receive and process service booking orders"
              : "View and monitor all bookings"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tạo đơn Offline button for Staff */}
          {role === "staff" && (
            <button
              onClick={() => setIsGuestModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#D97853] text-white rounded-xl hover:bg-[#C26843] transition-colors font-medium"
            >
              <Plus size={20} />
              Create Offline Order
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw
              size={20}
              className={`text-gray-600 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          {role === "admin" && (
            <button className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              <Download size={20} className="text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <AdminFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by code, name, email, phone..."
          dateValue={selectedDate ? new Date(selectedDate + "T00:00:00") : null}
          onDateChange={(date) =>
            setSelectedDate(
              date
                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                : "",
            )
          }
          dateLabel="DATE"
          extraActions={
            <div className="flex items-center gap-2 shrink-0">
              {/* View mode toggle */}
              <div className="flex items-center border border-[#2D3436]/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-[#D97853] text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "list"
                      ? "bg-[#D97853] text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          }
        />

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = statusCounts[tab.key] || 0;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                isActive
                  ? "bg-[#5B8C51] text-white shadow-lg shadow-[#5B8C51]/25"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-[#5B8C51] hover:text-[#5B8C51]"
              }`}
            >
              <Icon size={18} className={isActive ? "text-white" : tab.color} />
              {tab.label}
              {count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    isActive ? "bg-white/20" : "bg-gray-100"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#5B8C51] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">Loading bookings...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <div>
              <p className="font-medium text-[#2D3436]">{error}</p>
              <button
                onClick={() => fetchBookings()}
                className="mt-2 text-sm text-[#5B8C51] hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Calendar size={32} className="text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-[#2D3436]">
                {role === "staff" && activeTab === "pending"
                  ? "No orders to process"
                  : "No bookings yet"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery || selectedDate
                  ? "Try changing the filters"
                  : role === "staff"
                    ? "New orders will appear here"
                    : "Bookings will appear here"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              : "space-y-3"
          }
        >
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking._id}
              booking={booking}
              role={role}
              currentUserId={currentUserId}
              onViewDetail={handleViewDetail}
              onUpdateStatus={handleUpdateStatus}
              onClaimBooking={handleClaimBooking}
            />
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {!loading && !error && bookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className={`grid gap-4 ${role === "admin" ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-5"}`}>
            {role === "staff" && (
              <div className="text-center p-3 bg-amber-50 rounded-xl">
                <p className="text-2xl font-bold text-amber-600">
                  {statusCounts.pending}
                </p>
                <p className="text-xs text-amber-600/80">Pending</p>
              </div>
            )}
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">
                {statusCounts.confirmed}
              </p>
              <p className="text-xs text-blue-600/80">
                {role === "staff" ? "Accepted" : "Confirmed"}
              </p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <p className="text-2xl font-bold text-purple-600">
                {statusCounts["in-progress"]}
              </p>
              <p className="text-xs text-purple-600/80">In Progress</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">
                {statusCounts.completed}
              </p>
              <p className="text-xs text-green-600/80">Completed</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-xl">
              <p className="text-2xl font-bold text-red-600">
                {statusCounts.cancelled}
              </p>
              <p className="text-xs text-red-600/80">Cancelled</p>
            </div>
          </div>
        </div>
      )}

      {/* Medical Workflow Modal (Staff Check-in / Check-out) */}
      <AnimatePresence>
        {showMedicalWorkflowModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={closeMedicalWorkflowModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#2D3436]">
                    {workflowTargetStatus === "in-progress" ? "Check-in Pet" : "Checkout Pet"}
                  </h3>
                  <p className="text-sm text-[#2D3436]/60">
                    Booking: #{workflowBooking?.bookingNumber || "-"}
                  </p>
                </div>
                <button
                  onClick={closeMedicalWorkflowModal}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  disabled={workflowSubmitting}
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {workflowError && (
                  <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                    {workflowError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-[#2D3436] mb-2">
                    Note <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={workflowNotes}
                    onChange={(e) => setWorkflowNotes(e.target.value)}
                    placeholder={
                      workflowTargetStatus === "in-progress"
                        ? "Nhập tình trạng pet lúc check-in..."
                        : "Nhập tình trạng pet lúc checkout..."
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2D3436] mb-2">
                    Photos <span className="text-red-500">*</span>
                  </label>
                  <label className="w-full border border-dashed border-gray-300 rounded-xl px-4 py-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#5B8C51] hover:bg-[#5B8C51]/5 transition-colors">
                    <ImagePlus size={22} className="text-[#5B8C51]" />
                    <span className="text-sm text-[#2D3436]/70">Click to choose images (multiple)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => setWorkflowFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                  {workflowFiles.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Selected {workflowFiles.length} file(s): {workflowFiles.map((f) => f.name).join(", ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  onClick={closeMedicalWorkflowModal}
                  disabled={workflowSubmitting}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMedicalWorkflowSubmit}
                  disabled={workflowSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#5B8C51] text-white hover:bg-[#4a7a42] disabled:opacity-50"
                >
                  {workflowSubmitting ? "Saving..." : "Submit Step"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        role={role}
        currentUserId={currentUserId}
        onUpdateStatus={handleUpdateStatus}
        onAssignStaff={handleAssignStaff}
        onClaimBooking={handleClaimBooking}
        staffList={[]}
      />

      {/* Guest Booking Modal for Staff */}
      {role === "staff" && (
        <GuestBookingModal
          isOpen={isGuestModalOpen}
          onClose={() => setIsGuestModalOpen(false)}
          onSuccess={() => {
            setIsGuestModalOpen(false);
            fetchBookings(true);
          }}
        />
      )}
    </motion.div>
  );
};

export default BookingBoard;
