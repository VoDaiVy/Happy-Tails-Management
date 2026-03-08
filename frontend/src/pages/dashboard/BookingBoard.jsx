import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import BookingCard from "../../components/booking/BookingCard";
import BookingDetailModal from "../../components/booking/BookingDetailModal";
import {
  getAllBookings,
  updateBookingStatus,
  assignStaffToBooking,
} from "../../api/bookingApi";

// Status tabs configuration
const STATUS_TABS_STAFF = [
  { key: "pending", label: "Pending", icon: AlertCircle, color: "text-amber-500" },
  { key: "confirmed", label: "Accepted", icon: CheckCircle, color: "text-blue-500" },
  { key: "in-progress", label: "In Progress", icon: PlayCircle, color: "text-purple-500" },
  { key: "completed", label: "Completed", icon: CheckCircle, color: "text-green-500" },
];

const STATUS_TABS_ADMIN = [
  { key: "all", label: "All", icon: LayoutGrid, color: "text-gray-600" },
  { key: "pending", label: "Pending", icon: AlertCircle, color: "text-amber-500" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle, color: "text-blue-500" },
  { key: "in-progress", label: "In Progress", icon: PlayCircle, color: "text-purple-500" },
  { key: "completed", label: "Completed", icon: CheckCircle, color: "text-green-500" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, color: "text-red-500" },
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
  const [activeTab, setActiveTab] = useState(role === "staff" ? "pending" : "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  const fetchBookings = useCallback(async (showRefreshSpinner = false) => {
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
      let fetchedBookings = response.data?.bookings || [];

      // Staff only sees: unassigned pending bookings OR their own accepted bookings
      if (role === "staff" && currentUserId) {
        fetchedBookings = fetchedBookings.filter((booking) => {
          // Unassigned pending booking
          if (booking.status === "pending" && !booking.assignedStaff) {
            return true;
          }
          // Own accepted booking (any status)
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
      setError(err.response?.data?.message || "Cannot load bookings");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDate, role, currentUserId]);

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

  // Handle update status
  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
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
          <h1 className="text-2xl font-bold text-[#2D3436] flex items-center gap-2">
            {role === "staff" ? (
              <>
                <ClipboardList className="text-[#5B8C51]" />
                Process Bookings
              </>
            ) : (
              <>
                <Eye className="text-[#5B8C51]" />
                Track Bookings
              </>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {role === "staff"
              ? "Nhận và xử lý các đơn đặt lịch dịch vụ"
              : "View and monitor all bookings"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            title="Làm mới"
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
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, name, email, phone..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
            />
          </div>

          {/* Date filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
              />
            </div>

            {/* View mode toggle */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-[#5B8C51] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 transition-colors ${
                  viewMode === "list"
                    ? "bg-[#5B8C51] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>

          {/* Clear filters */}
          {(searchQuery || selectedDate || (role === "staff" && activeTab !== "pending") || (role === "admin" && activeTab !== "all")) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 text-sm text-gray-600 hover:text-[#5B8C51] transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

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
                Thử lại
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
                  ? "Thử thay đổi bộ lọc"
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
          <div className={`grid gap-4 ${role === "admin" ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-2xl font-bold text-amber-600">
                {statusCounts.pending}
              </p>
              <p className="text-xs text-amber-600/80">
                {role === "staff" ? "Pending" : "Pending Confirmation"}
              </p>
            </div>
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
            {role === "admin" && (
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <p className="text-2xl font-bold text-red-600">
                  {statusCounts.cancelled}
                </p>
                <p className="text-xs text-red-600/80">Cancelled</p>
              </div>
            )}
          </div>
        </div>
      )}

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
    </motion.div>
  );
};

export default BookingBoard;
