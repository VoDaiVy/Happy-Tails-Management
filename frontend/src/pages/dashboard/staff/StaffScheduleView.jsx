import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import useScrollLock from "../../../hooks/useScrollLock";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Eye,
  Loader2,
  PawPrint,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import {
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  assignStaffToBooking,
} from "../../../api/bookingApi";
import { getStaffList } from "../../../api/userApi";
import { toast } from "react-toastify";

const BOOKING_STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "in-progress",
  "completed",
  "cancelled",
];

const BOOKING_STATUS_STYLE = {
  pending: "border border-[#F8D27A] bg-[#FFF8E1] text-[#9C6B00]",
  confirmed: "border border-[#87CEEB] bg-[#E0F4FF] text-[#0369A1]",
  "in-progress": "border border-[#D97853] bg-[#FFF5EC] text-[#D97853]",
  completed: "border border-[#B6E6C4] bg-[#ECFDF3] text-[#166534]",
  cancelled: "border border-[#F7B4B4] bg-[#FFF1F1] text-[#B42318]",
};

const BOOKING_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const isMeaningfulText = (value) =>
  typeof value === "string" && value.trim().length > 0;

const pickFirstText = (...values) => {
  for (const value of values) {
    if (isMeaningfulText(value)) {
      return value.trim();
    }
  }
  return "";
};

const isLikelyObjectId = (value) =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value.trim());

const toDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatOptionLabel = (option) => {
  if (!isMeaningfulText(option)) return option;
  return BOOKING_STATUS_LABELS[option] || option;
};

const CustomSelect = ({
  label,
  options,
  value,
  onChange,
  isOpen,
  setIsOpen,
  disabled = false,
}) => {
  const triggerRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const syncDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    syncDropdownPosition();

    const handleWindowChange = () => syncDropdownPosition();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [isOpen, syncDropdownPosition]);

  const selectedLabel = formatOptionLabel(value);

  const dropdownContent = isOpen && !disabled && (
    <AnimatePresence>
      <>
        <div
          className="fixed inset-0 z-[9998]"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        />
        <Motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "fixed",
            top: position.top + 8,
            left: position.left,
            width: position.width,
          }}
          className="bg-[#FFFCF8] rounded-[16px] shadow-[0_16px_36px_rgba(125,73,46,0.14)] border border-[#E8D8C8] overflow-hidden z-[9999] py-1.5 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden"
        >
          {options.map((opt, idx) => {
            const isSelected = value === opt;
            const optionLabel = formatOptionLabel(opt);

            return (
              <div
                key={idx}
                className={`px-4 py-2.5 text-[14px] cursor-pointer transition-colors ${
                  !isSelected
                    ? "text-[#2D3436]/80 hover:bg-[#FFF0E3] font-medium"
                    : "border-l-[3px] border-[#D97853] bg-[#FFECDD] text-[#D97853] font-bold"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                {optionLabel}
              </div>
            );
          })}
        </Motion.div>
      </>
    </AnimatePresence>
  );

  return (
    <div className={`relative flex-col flex ${isOpen ? "z-[60]" : "z-10"}`}>
      {label && (
        <label className="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#8F7E70]">
          {label}
        </label>
      )}
      <div
        ref={triggerRef}
        className={`flex h-12 items-center justify-between rounded-[18px] border px-4 bg-[#FFFCF8] ${
          isOpen
            ? "border-[#D97853] ring-2 ring-[#D97853]/18"
            : "border-[#E3D4C3] hover:border-[#D97853]/55"
        } transition-all ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        onClick={(e) => {
          if (!disabled) {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }
        }}
      >
        <span className="truncate pr-2 text-sm font-semibold text-[#2D3436]/90">
          {selectedLabel}
        </span>
        <ChevronDown
          size={15}
          className={`text-[#D97853]/85 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
};

const DateField = ({ label, value, onChange }) => (
  <div>
    <label className="mb-1.5 ml-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#8F7E70]">
      {label}
    </label>
    <div className="relative">
      <CalendarDays
        size={15}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D97853]/80"
      />
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[18px] border border-[#E3D4C3] bg-[#FFFCF8] pl-10 pr-3 text-sm font-semibold text-[#2D3436]/90 outline-none transition-all focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/18"
      />
    </div>
  </div>
);

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return "-";
  return timeStr;
};

const parseBookingTimeToMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== "string") {
    return Number.POSITIVE_INFINITY;
  }

  const normalized = timeValue.trim().toLowerCase();
  const amPmMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (amPmMatch) {
    let hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2]);
    const period = amPmMatch[3].toLowerCase();

    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);
    if (hours <= 23 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }

  return Number.POSITIVE_INFINITY;
};

const formatAgendaDayLabel = (bookingDate) => {
  const currentDateKey = toDateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateKey = toDateKey(tomorrow);
  const bookingDateKey = toDateKey(bookingDate);

  if (bookingDateKey && bookingDateKey === currentDateKey) {
    return "Today";
  }

  if (bookingDateKey && bookingDateKey === tomorrowDateKey) {
    return "Tomorrow";
  }

  return formatDate(bookingDate);
};

const formatAgendaDayMeta = (bookingDate) => {
  if (!bookingDate) return "";
  const date = new Date(bookingDate);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const collectServiceNames = (items = []) => {
  const serviceNames = new Set();

  items.forEach((item) => {
    const objectName =
      item?.service && typeof item.service === "object"
        ? pickFirstText(
            item.service.name,
            item.service.serviceName,
            item.service.title,
          )
        : "";

    const stringServiceName =
      typeof item?.service === "string" ? item.service : "";

    const resolvedName = pickFirstText(
      objectName,
      item?.serviceName,
      item?.name,
      stringServiceName,
    );

    if (!resolvedName || isLikelyObjectId(resolvedName)) return;
    serviceNames.add(resolvedName);
  });

  return [...serviceNames];
};

const getServiceNames = (items) => {
  const names = collectServiceNames(items);
  if (names.length === 0) return "Service Booked";
  return names.join(", ");
};

const getServicePrimaryLabel = (items) => {
  const names = collectServiceNames(items);
  if (names.length === 0) return "Service Booked";
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
};

const getPetInfo = (booking) => {
  const directName = pickFirstText(
    booking?.pet?.petName,
    booking?.pet?.name,
    booking?.petName,
    booking?.guestPet?.petName,
    booking?.petInfo?.petName,
  );

  const directType = pickFirstText(
    booking?.pet?.petType,
    booking?.petType,
    booking?.guestPet?.petType,
    booking?.petInfo?.petType,
  );

  if (directName) {
    return { name: directName, type: directType || "-" };
  }

  if (Array.isArray(booking?.items)) {
    for (const item of booking.items) {
      const name = pickFirstText(
        item?.pet?.petName,
        item?.pet?.name,
        item?.guestPet?.petName,
        item?.petInfo?.petName,
        item?.petName,
      );
      if (!name) continue;

      const type = pickFirstText(
        item?.pet?.petType,
        item?.guestPet?.petType,
        item?.petInfo?.petType,
      );

      return { name, type: type || "-" };
    }
  }

  return { name: "Guest Pet", type: "-" };
};

const getCustomerInfo = (booking) => {
  const name =
    pickFirstText(
      booking?.customer?.name,
      booking?.customer?.fullName,
      booking?.customerName,
      booking?.guestInfo?.name,
      booking?.guestName,
      booking?.user?.name,
    ) || "Guest Customer";

  const phone =
    pickFirstText(
      booking?.customer?.phone,
      booking?.customerPhone,
      booking?.guestInfo?.phone,
      booking?.guestPhone,
    ) || "-";

  return { name, phone };
};

const getStaffNames = (booking) => {
  const staff = booking?.assignedStaff;
  if (!staff) return "Not assigned";

  const list = Array.isArray(staff) ? staff : [staff];
  if (list.length === 0) return "Not assigned";

  const names = list
    .map((entry) => {
      if (typeof entry === "string") {
        return isLikelyObjectId(entry) ? "" : entry;
      }
      return pickFirstText(entry?.name, entry?.fullName);
    })
    .filter(Boolean);

  if (names.length > 0) {
    return names.join(", ");
  }

  return "Assigned";
};

export default function StaffScheduleView() {
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [dateFilter, setDateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [staffFilter, setStaffFilter] = useState("All Staff");
  const [serviceFilter, setServiceFilter] = useState("All Services");

  // Dropdown states
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailBooking, setDetailBooking] = useState(null);
  const [detailUpdating, setDetailUpdating] = useState(false);

  useScrollLock(detailOpen);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [bookingsRes, staffRes] = await Promise.all([
        getAllBookings({ limit: 200 }),
        getStaffList().catch(() => ({ data: { staff: [] } })),
      ]);

      const bookingsData =
        bookingsRes?.data?.bookings || bookingsRes?.bookings || [];
      const staffData = staffRes?.data?.staff || staffRes?.staff || [];

      setAllBookings(bookingsData);
      setBookings(bookingsData);
      setStaffList(staffData);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load schedule data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract unique services
  const serviceOptions = useMemo(() => {
    const services = new Set();
    allBookings.forEach((booking) => {
      collectServiceNames(booking?.items).forEach((serviceName) => {
        services.add(serviceName);
      });
    });

    return ["All Services", ...Array.from(services).sort()];
  }, [allBookings]);

  const staffOptions = useMemo(() => {
    const names = [
      ...new Set(staffList.map((staff) => staff?.name).filter(Boolean)),
    ];
    return ["All Staff", ...names];
  }, [staffList]);

  // Apply filters
  useEffect(() => {
    let filtered = [...allBookings];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((booking) => {
        const pet = getPetInfo(booking);
        const customer = getCustomerInfo(booking);
        const services = getServiceNames(booking.items).toLowerCase();

        return (
          pet.name.toLowerCase().includes(term) ||
          customer.name.toLowerCase().includes(term) ||
          customer.phone.toLowerCase().includes(term) ||
          services.includes(term) ||
          String(booking.bookingNumber || "")
            .toLowerCase()
            .includes(term)
        );
      });
    }

    // Status
    if (statusFilter !== "All Status") {
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    // Date single
    if (dateFilter) {
      filtered = filtered.filter((booking) => {
        const bookingDate = toDateKey(booking.bookingDate);
        return bookingDate === dateFilter;
      });
    }

    // Date range
    if (dateFrom) {
      filtered = filtered.filter((booking) => {
        const bookingDate = toDateKey(booking.bookingDate);
        return bookingDate >= dateFrom;
      });
    }
    if (dateTo) {
      filtered = filtered.filter((booking) => {
        const bookingDate = toDateKey(booking.bookingDate);
        return bookingDate <= dateTo;
      });
    }

    // Staff
    if (staffFilter !== "All Staff") {
      filtered = filtered.filter((booking) => {
        const staffNames = getStaffNames(booking).toLowerCase();
        return staffNames.includes(staffFilter.toLowerCase());
      });
    }

    // Service
    if (serviceFilter !== "All Services") {
      filtered = filtered.filter((booking) => {
        const serviceNames = collectServiceNames(booking.items);
        return serviceNames.some(
          (serviceName) =>
            serviceName.toLowerCase() === serviceFilter.toLowerCase(),
        );
      });
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));

    setBookings(filtered);
  }, [
    allBookings,
    searchTerm,
    statusFilter,
    dateFilter,
    dateFrom,
    dateTo,
    staffFilter,
    serviceFilter,
  ]);

  const openDetail = async (booking) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await getBookingById(booking._id);
      setDetailBooking(res.data?.booking || res.booking || res);
    } catch (err) {
      toast.error("Failed to load booking details");
      setDetailBooking(booking);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!detailBooking) return;
    setDetailUpdating(true);
    try {
      await updateBookingStatus(detailBooking._id, newStatus);
      setDetailBooking((prev) => ({ ...prev, status: newStatus }));
      await loadData(true);
      toast.success(`Status updated to ${BOOKING_STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setDetailUpdating(false);
    }
  };

  const handleAssignStaff = async (staffId) => {
    if (!detailBooking) return;

    const staff = staffList.find(
      (item) => String(item?._id || item?.id) === String(staffId),
    );
    if (!staff) return;

    setDetailUpdating(true);
    try {
      await assignStaffToBooking(detailBooking._id, staff._id || staff.id);
      setDetailBooking((prev) => ({
        ...prev,
        assignedStaff: staff,
      }));
      await loadData(true);
      toast.success("Staff assigned successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign staff");
    } finally {
      setDetailUpdating(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All Status");
    setDateFilter("");
    setDateFrom("");
    setDateTo("");
    setStaffFilter("All Staff");
    setServiceFilter("All Services");
  };

  const hasFilters =
    searchTerm ||
    statusFilter !== "All Status" ||
    dateFilter ||
    dateFrom ||
    dateTo ||
    staffFilter !== "All Staff" ||
    serviceFilter !== "All Services";

  const agendaGroups = useMemo(() => {
    const grouped = [];
    const groupMap = new Map();
    const todayDateKey = toDateKey(new Date());

    bookings.forEach((booking) => {
      const bookingDateKey = toDateKey(booking?.bookingDate) || "unscheduled";

      if (!groupMap.has(bookingDateKey)) {
        const group = {
          key: bookingDateKey,
          bookingDate: booking?.bookingDate,
          label: formatAgendaDayLabel(booking?.bookingDate),
          meta: formatAgendaDayMeta(booking?.bookingDate),
          items: [],
        };

        groupMap.set(bookingDateKey, group);
        grouped.push(group);
      }

      groupMap.get(bookingDateKey).items.push(booking);
    });

    grouped.sort((first, second) => {
      const firstDateKey = toDateKey(first.bookingDate);
      const secondDateKey = toDateKey(second.bookingDate);

      const firstSortBucket = !firstDateKey
        ? 3
        : firstDateKey === todayDateKey
          ? 0
          : firstDateKey < todayDateKey
            ? 1
            : 2;

      const secondSortBucket = !secondDateKey
        ? 3
        : secondDateKey === todayDateKey
          ? 0
          : secondDateKey < todayDateKey
            ? 1
            : 2;

      if (firstSortBucket !== secondSortBucket) {
        return firstSortBucket - secondSortBucket;
      }

      const firstTimestamp = new Date(first.bookingDate || 0).getTime();
      const secondTimestamp = new Date(second.bookingDate || 0).getTime();

      if (firstSortBucket === 1) {
        return secondTimestamp - firstTimestamp;
      }

      return firstTimestamp - secondTimestamp;
    });

    grouped.forEach((group) => {
      group.items.sort((first, second) => {
        const firstMinutes = parseBookingTimeToMinutes(first?.bookingTime);
        const secondMinutes = parseBookingTimeToMinutes(second?.bookingTime);

        if (Number.isFinite(firstMinutes) && Number.isFinite(secondMinutes)) {
          return firstMinutes - secondMinutes;
        }

        if (Number.isFinite(firstMinutes)) return -1;
        if (Number.isFinite(secondMinutes)) return 1;

        return (
          new Date(second?.createdAt || 0).getTime() -
          new Date(first?.createdAt || 0).getTime()
        );
      });
    });

    return grouped;
  }, [bookings]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#D97853] md:text-[2rem]">
          Schedule Management
        </h1>
        <p className="mt-1 text-sm text-[#2D3436]/60">
          View and manage all bookings & appointments
        </p>
      </div>

      {/* Filters */}
      <section className="rounded-[26px] border border-[#E8DED2] bg-white p-4 shadow-[0_10px_26px_rgba(45,52,54,0.045)] md:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D97853]" />
            <input
              type="text"
              placeholder="Search by pet, customer, service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-[18px] border border-[#E3D4C3] bg-[#FFFCF8] pl-11 pr-4 text-sm font-semibold text-[#2D3436]/90 outline-none transition-all placeholder:font-medium placeholder:text-[#2D3436]/40 focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/18"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex h-12 items-center gap-2 rounded-[18px] border border-[#E3D4C3] bg-[#FFFCF8] px-4 text-sm font-semibold text-[#2D3436] transition-colors hover:border-[#D97853] hover:text-[#D97853] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex h-12 items-center rounded-[18px] px-3 text-sm font-semibold text-[#D97853] transition-colors hover:bg-[#FFF2E8] hover:text-[#B5633F]"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <CustomSelect
            label="Status"
            options={["All Status", ...BOOKING_STATUS_OPTIONS]}
            value={statusFilter}
            onChange={setStatusFilter}
            isOpen={isStatusOpen}
            setIsOpen={setIsStatusOpen}
          />

          <DateField
            label="Date"
            value={dateFilter}
            onChange={(nextDate) => {
              setDateFilter(nextDate);
              setDateFrom("");
              setDateTo("");
            }}
          />

          <DateField
            label="From Date"
            value={dateFrom}
            onChange={(nextDate) => {
              setDateFrom(nextDate);
              setDateFilter("");
            }}
          />

          <DateField
            label="To Date"
            value={dateTo}
            onChange={(nextDate) => {
              setDateTo(nextDate);
              setDateFilter("");
            }}
          />

          <CustomSelect
            label="Staff"
            options={staffOptions}
            value={staffFilter}
            onChange={setStaffFilter}
            isOpen={isStaffOpen}
            setIsOpen={setIsStaffOpen}
          />

          <CustomSelect
            label="Service"
            options={serviceOptions}
            value={serviceFilter}
            onChange={setServiceFilter}
            isOpen={isServiceOpen}
            setIsOpen={setIsServiceOpen}
          />
        </div>
      </section>

      {/* Results count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-medium text-[#2D3436]/60">
          {bookings.length} schedule{bookings.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#D97853]" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-center">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && bookings.length === 0 && (
        <div className="bg-white rounded-3xl p-12 shadow-sm border border-[#2D3436]/5 text-center">
          <CalendarDays className="h-16 w-16 mx-auto text-[#2D3436]/20 mb-4" />
          <h3 className="text-lg font-bold text-[#2D3436] mb-2">
            No Schedule Found
          </h3>
          <p className="text-sm text-[#2D3436]/60 mb-4">
            {hasFilters
              ? "Try adjusting your filters to see more results"
              : "There are no bookings scheduled at the moment"}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 bg-[#D97853] text-white rounded-2xl font-medium hover:bg-[#B5633F] transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Schedule List */}
      {!loading && !error && bookings.length > 0 && (
        <div className="space-y-5">
          {agendaGroups.map((group) => (
            <section key={group.key} className="space-y-2.5">
              <div className="flex items-end justify-between px-1">
                <div>
                  <h3 className="text-[1.15rem] font-black text-[#2D3436]">
                    {group.label}
                  </h3>
                  <p className="text-xs font-medium text-[#2D3436]/50">
                    {group.meta}
                  </p>
                </div>
                <span className="rounded-full border border-[#E8D8C8] bg-[#FFF8F2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8F7E70]">
                  {group.items.length} booking
                  {group.items.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-2.5">
                {group.items.map((booking) => {
                  const pet = getPetInfo(booking);
                  const customer = getCustomerInfo(booking);
                  const services = getServiceNames(booking.items);
                  const primaryService = getServicePrimaryLabel(booking.items);
                  const staffNames = getStaffNames(booking);
                  const statusStyle =
                    BOOKING_STATUS_STYLE[booking.status] ||
                    BOOKING_STATUS_STYLE.pending;
                  const statusLabel =
                    BOOKING_STATUS_LABELS[booking.status] || booking.status;

                  return (
                    <article
                      key={booking._id}
                      className="group rounded-[20px] border border-[#E8DED2] bg-white px-4 py-3.5 shadow-[0_6px_18px_rgba(45,52,54,0.045)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_26px_rgba(45,52,54,0.075)]"
                    >
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[152px_1fr_auto] lg:items-center">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFEDE0]">
                            <Clock3 className="h-5 w-5 text-[#D97853]" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[1.7rem] font-black leading-none tracking-[-0.02em] text-[#2D3436]">
                              {formatTime(booking.bookingTime || "")}
                            </p>
                            <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.09em] text-[#2D3436]/45">
                              {booking?.bookingNumber ||
                                `#${String(booking?._id || "")
                                  .slice(-7)
                                  .toUpperCase()}`}
                            </p>
                          </div>
                        </div>

                        <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8F7E70]">
                              Pet
                            </p>
                            <p className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-[#2D3436]">
                              <PawPrint
                                size={13}
                                className="text-[#2D3436]/45"
                              />
                              <span className="truncate" title={pet.name}>
                                {pet.name}
                              </span>
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8F7E70]">
                              Customer
                            </p>
                            <p className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-[#2D3436]">
                              <UserRound
                                size={13}
                                className="text-[#2D3436]/45"
                              />
                              <span className="truncate" title={customer.name}>
                                {customer.name}
                              </span>
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8F7E70]">
                              Service
                            </p>
                            <p
                              className="mt-1 truncate text-sm font-semibold text-[#2D3436]"
                              title={services}
                            >
                              {primaryService}
                            </p>
                            <p className="truncate text-[12px] font-medium text-[#2D3436]/52">
                              {services}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8F7E70]">
                              Staff
                            </p>
                            <p
                              className="mt-1 truncate text-sm font-semibold text-[#2D3436]"
                              title={staffNames}
                            >
                              {staffNames}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center justify-end gap-2.5 lg:pl-2">
                          <span
                            className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-bold ${statusStyle}`}
                          >
                            {statusLabel}
                          </span>
                          <button
                            onClick={() => openDetail(booking)}
                            aria-label={`View booking ${
                              booking?.bookingNumber || booking?._id || ""
                            }`}
                            className="inline-flex h-9 w-9 items-center justify-center text-[#121212] transition-colors hover:text-[#D97853] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97853]/35"
                          >
                            <Eye size={19} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detailOpen && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/52 p-3 backdrop-blur-[2px]"
            onClick={() => setDetailOpen(false)}
          >
            <Motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="w-full max-h-[88vh] max-w-6xl overflow-hidden rounded-[30px] border border-[#E8DED2] bg-[#FFFEFD] shadow-[0_28px_90px_-38px_rgba(15,23,42,0.55)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[#EFE6DB] bg-gradient-to-r from-[#FFF5EC] via-[#FFFDFB] to-[#FFF6EE] px-6 py-4">
                <div>
                  <h3 className="text-xl font-black text-[#2D3436]">
                    Schedule Details
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#D97853]">
                    Booking #
                    {detailBooking?.bookingNumber ||
                      detailBooking?._id?.slice(-8)}
                  </p>
                </div>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E8DED2] bg-white text-[#2D3436]/65 transition-colors hover:bg-[#F8F4EF] hover:text-[#2D3436]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[calc(88vh-86px)] overflow-y-auto p-5 md:p-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#D97853]" />
                  </div>
                ) : detailBooking ? (
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.95fr]">
                    <div className="space-y-4">
                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-[0.13em] text-[#D97853]">
                          Schedule Snapshot
                        </h4>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-[#EFE4D8] bg-white px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#8F7E70]">
                              Date
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#2D3436]">
                              {formatDate(detailBooking.bookingDate)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#EFE4D8] bg-white px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#8F7E70]">
                              Time
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#2D3436]">
                              {detailBooking.bookingTime || "Not specified"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#EFE4D8] bg-white px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#8F7E70]">
                              Pet
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#2D3436]">
                              {getPetInfo(detailBooking).name}
                            </p>
                            <p className="text-[12px] text-[#2D3436]/58">
                              {getPetInfo(detailBooking).type}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#EFE4D8] bg-white px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#8F7E70]">
                              Customer
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#2D3436]">
                              {getCustomerInfo(detailBooking).name}
                            </p>
                            <p className="text-[12px] text-[#2D3436]/58">
                              {getCustomerInfo(detailBooking).phone}
                            </p>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-[0.13em] text-[#D97853]">
                          Services
                        </h4>
                        {detailBooking.items?.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {detailBooking.items.map((item, idx) => {
                              const serviceName = pickFirstText(
                                item?.service?.name,
                                item?.serviceName,
                                item?.name,
                                typeof item?.service === "string"
                                  ? item.service
                                  : "",
                              );

                              return (
                                <div
                                  key={`${item?._id || idx}`}
                                  className="flex items-center justify-between rounded-xl border border-[#EFE4D8] bg-white px-3 py-2"
                                >
                                  <p className="truncate text-sm font-semibold text-[#2D3436]">
                                    {isLikelyObjectId(serviceName) ||
                                    !serviceName
                                      ? "Service Booked"
                                      : serviceName}
                                  </p>
                                  <span className="text-xs font-medium text-[#2D3436]/58">
                                    {item?.quantity > 1
                                      ? `x${item.quantity}`
                                      : ""}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[#2D3436]/60">
                            No services listed
                          </p>
                        )}
                      </section>

                      {pickFirstText(
                        detailBooking.notes,
                        detailBooking.note,
                      ) ? (
                        <section className="rounded-2xl border border-[#ECE1D6] bg-[#FFFCF8] p-4">
                          <h4 className="text-xs font-bold uppercase tracking-[0.13em] text-[#D97853]">
                            Notes
                          </h4>
                          <p className="mt-2 text-sm leading-relaxed text-[#2D3436]/82">
                            {pickFirstText(
                              detailBooking.notes,
                              detailBooking.note,
                            )}
                          </p>
                        </section>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-[0.13em] text-[#D97853]">
                          Status
                        </h4>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {BOOKING_STATUS_OPTIONS.map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(status)}
                              disabled={
                                detailUpdating ||
                                detailBooking.status === status
                              }
                              className={`rounded-full border px-3 py-2 text-xs font-bold transition-all ${
                                detailBooking.status === status
                                  ? BOOKING_STATUS_STYLE[status]
                                  : "border-[#DECFC0] bg-white text-[#2D3436]/65 hover:border-[#D97853] hover:text-[#D97853]"
                              } ${detailUpdating ? "cursor-not-allowed opacity-55" : ""}`}
                            >
                              {BOOKING_STATUS_LABELS[status]}
                            </button>
                          ))}
                        </div>
                      </section>

                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-[0.13em] text-[#D97853]">
                          Assigned Staff
                        </h4>
                        <div className="mt-3 flex max-h-[230px] flex-wrap gap-2 overflow-y-auto pr-1">
                          {staffList.slice(0, 10).map((staff) => {
                            const assignedList = Array.isArray(
                              detailBooking.assignedStaff,
                            )
                              ? detailBooking.assignedStaff
                              : detailBooking.assignedStaff
                                ? [detailBooking.assignedStaff]
                                : [];

                            const isAssigned = assignedList.some(
                              (entry) =>
                                String(entry?.id || entry?._id || entry) ===
                                String(staff.id || staff._id),
                            );

                            return (
                              <button
                                key={staff.id || staff._id}
                                onClick={() =>
                                  handleAssignStaff(staff.id || staff._id)
                                }
                                disabled={detailUpdating || isAssigned}
                                className={`rounded-full border px-3.5 py-2 text-xs font-bold transition-all ${
                                  isAssigned
                                    ? "border-[#D97853] bg-[#D97853] text-white"
                                    : "border-[#DECFC0] bg-white text-[#2D3436]/70 hover:border-[#D97853] hover:text-[#D97853]"
                                } ${detailUpdating ? "cursor-not-allowed opacity-55" : ""}`}
                              >
                                {staff.name}
                              </button>
                            );
                          })}
                        </div>
                      </section>

                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-[0.13em] text-[#D97853]">
                          Timestamps
                        </h4>
                        <div className="mt-2 space-y-1.5 text-[12px] text-[#2D3436]/65">
                          <p>
                            Created: {formatDateTime(detailBooking.createdAt)}
                          </p>
                          <p>
                            Updated: {formatDateTime(detailBooking.updatedAt)}
                          </p>
                        </div>
                      </section>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-[#2D3436]/60 py-8">
                    No booking data
                  </p>
                )}
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
