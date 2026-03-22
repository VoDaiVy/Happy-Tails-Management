import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import { BarChart } from "@mui/x-charts/BarChart";
import {
  CalendarCheck2,
  CalendarClock,
  ChevronDown,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ExternalLink,
  PawPrint,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { getAllBookings } from "../../../api/bookingApi";

const CHART_FILTER_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
];

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  "in-progress": "In Progress",
};

const STATUS_BADGE_STYLE = {
  pending: "border border-[#F8D27A] bg-[#FFF8E1] text-[#9C6B00]",
  confirmed: "border border-[#87CEEB] bg-[#E0F4FF] text-[#0369A1]",
  completed: "border border-[#B6E6C4] bg-[#ECFDF3] text-[#166534]",
  cancelled: "border border-[#F7B4B4] bg-[#FFF1F1] text-[#B42318]",
  "in-progress": "border border-[#D97853] bg-[#FFF5EC] text-[#D97853]",
};

const SERVICE_GROUP_LABELS = {
  wet: "Wet",
  dry: "Dry",
};

const numberFormatter = new Intl.NumberFormat("en-GB");

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Failed to load overview data.";

const startOfDay = (input) => {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (input) => {
  const date = new Date(input);
  date.setHours(23, 59, 59, 999);
  return date;
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (input) => {
  if (!input) return "--";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatChartLabel = (input) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(input);

const getChartRangeBounds = (filterValue) => {
  const now = new Date();
  const end = endOfDay(now);
  const start = startOfDay(now);

  if (filterValue === "last7") {
    start.setDate(start.getDate() - 6);
    return { start, end };
  }

  if (filterValue === "last30") {
    start.setDate(start.getDate() - 29);
    return { start, end };
  }

  if (filterValue === "thisMonth") {
    start.setDate(1);
    return { start, end };
  }

  return { start, end };
};

const parseTimeToMinutes = (timeValue) => {
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

const getBookingDate = (booking) => {
  const rawValue = booking?.bookingDate || booking?.date || booking?.createdAt;
  if (!rawValue) return null;
  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getBookingTime = (booking) => booking?.bookingTime || "--";

const getCustomerName = (booking) =>
  pickFirstText(
    booking?.customer?.name,
    booking?.customer?.fullName,
    booking?.customer?.displayName,
    booking?.customerName,
    booking?.guestInfo?.name,
    booking?.guestName,
    booking?.user?.name,
    booking?.userName,
  ) || "Guest Customer";

const getPetName = (booking) => {
  const directPetName = pickFirstText(
    booking?.pet?.petName,
    booking?.pet?.name,
    booking?.petName,
    booking?.guestPet?.petName,
    booking?.petInfo?.petName,
  );
  if (directPetName) return directPetName;

  if (Array.isArray(booking?.items)) {
    for (const item of booking.items) {
      const itemPetName = pickFirstText(
        item?.pet?.petName,
        item?.pet?.name,
        item?.guestPet?.petName,
        item?.petInfo?.petName,
        item?.petName,
      );
      if (itemPetName) return itemPetName;
    }
  }

  return "Guest Pet";
};

const getServiceSummary = (booking) => {
  const serviceNames = new Set();
  const serviceTypes = new Set();

  const addServiceName = (rawName) => {
    if (!isMeaningfulText(rawName)) return;
    const normalizedName = rawName.trim();
    if (isLikelyObjectId(normalizedName)) return;
    serviceNames.add(normalizedName);
  };

  const addServiceType = (rawType) => {
    if (!isMeaningfulText(rawType)) return;
    serviceTypes.add(rawType.trim());
  };

  const addGroupAsType = (group) => {
    if (SERVICE_GROUP_LABELS[group]) {
      serviceTypes.add(SERVICE_GROUP_LABELS[group]);
    }
  };

  addServiceName(booking?.service?.name);
  addServiceName(booking?.service?.serviceName);
  addServiceName(booking?.serviceName);
  addServiceType(booking?.service?.category?.name);
  addGroupAsType(booking?.service?.group);

  if (Array.isArray(booking?.services)) {
    booking.services.forEach((serviceItem) => {
      if (typeof serviceItem === "string") {
        addServiceName(serviceItem);
        return;
      }

      addServiceName(serviceItem?.name);
      addServiceName(serviceItem?.serviceName);
      addServiceType(serviceItem?.category?.name);
      addServiceType(serviceItem?.categoryName);
      addGroupAsType(serviceItem?.group);
    });
  }

  if (Array.isArray(booking?.items)) {
    booking.items.forEach((item) => {
      const serviceObject =
        item?.service && typeof item.service === "object" ? item.service : null;

      addServiceName(serviceObject?.name);
      addServiceName(serviceObject?.serviceName);
      addServiceName(serviceObject?.title);
      addServiceName(item?.serviceName);
      addServiceName(item?.name);

      if (typeof item?.service === "string") {
        addServiceName(item.service);
      }

      addServiceType(serviceObject?.category?.name);
      addServiceType(serviceObject?.categoryName);
      addServiceType(item?.category?.name);
      addServiceType(item?.categoryName);
      addGroupAsType(serviceObject?.group || item?.group);
    });
  }

  const uniqueServiceNames = [...serviceNames];
  const name =
    uniqueServiceNames.length === 0
      ? "Service Booked"
      : uniqueServiceNames.length === 1
        ? uniqueServiceNames[0]
        : `${uniqueServiceNames[0]} +${uniqueServiceNames.length - 1}`;

  const type = serviceTypes.size > 0 ? [...serviceTypes].join(", ") : "General";

  return { name, type };
};

const normalizeBookings = (responseData) => {
  if (Array.isArray(responseData?.data?.bookings)) {
    return responseData.data.bookings;
  }
  if (Array.isArray(responseData?.bookings)) return responseData.bookings;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData)) return responseData;
  return [];
};

const getStatusBadge = (status) =>
  STATUS_BADGE_STYLE[status] ||
  "border border-[#2D3436]/15 bg-[#F4F4F4] text-[#2D3436]/70";

const KpiCard = ({ title, value, helper, icon: Icon, accent }) => (
  <div className="flex h-full min-h-[158px] min-w-0 flex-col rounded-[22px] border border-[#2D3436]/8 bg-white px-5 py-4 shadow-[0_10px_24px_rgba(45,52,54,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(45,52,54,0.09)]">
    <div className="mb-2.5 flex items-center justify-between">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${accent}`}
      >
        <Icon size={18} className="text-white" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#2D3436]/35">
        KPI
      </span>
    </div>
    <p
      className="truncate text-[15px] font-semibold leading-tight text-[#2D3436]/78"
      title={title}
    >
      {title}
    </p>
    <p className="mt-1 truncate text-[2.5rem] font-black leading-[1.06] tracking-[-0.02em] text-[#1F2D3D] tabular-nums">
      {numberFormatter.format(value)}
    </p>
    <p
      className="mt-auto truncate text-[13px] font-medium leading-normal text-[#2D3436]/50"
      title={helper}
    >
      {helper}
    </p>
  </div>
);

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [chartFilter, setChartFilter] = useState("last7");
  const [isChartFilterMenuOpen, setIsChartFilterMenuOpen] = useState(false);
  const chartFilterMenuRef = useRef(null);

  const loadOverview = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const response = await getAllBookings({ limit: 500 });
      setBookings(normalizeBookings(response));
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      if (chartFilterMenuRef.current?.contains(event.target)) {
        return;
      }

      setIsChartFilterMenuOpen(false);
    };

    const handleEscapePress = (event) => {
      if (event.key === "Escape") {
        setIsChartFilterMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleEscapePress);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleEscapePress);
    };
  }, []);

  const rangeBounds = useMemo(() => {
    return getChartRangeBounds(chartFilter);
  }, [chartFilter]);

  const activeChartFilterLabel = useMemo(() => {
    return (
      CHART_FILTER_OPTIONS.find((option) => option.value === chartFilter)
        ?.label || "Selected Range"
    );
  }, [chartFilter]);

  const handleChartFilterSelect = useCallback((nextFilter) => {
    setChartFilter(nextFilter);
    setIsChartFilterMenuOpen(false);
  }, []);

  const chartBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const bookingDate = getBookingDate(booking);
      if (!bookingDate) return false;
      return bookingDate >= rangeBounds.start && bookingDate <= rangeBounds.end;
    });
  }, [bookings, rangeBounds.end, rangeBounds.start]);

  const kpis = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const todaysBookings = bookings.filter((booking) => {
      const bookingDate = getBookingDate(booking);
      return (
        bookingDate && bookingDate >= todayStart && bookingDate <= todayEnd
      );
    }).length;

    return {
      total: bookings.length,
      today: todaysBookings,
      pending: bookings.filter((booking) => booking?.status === "pending")
        .length,
      completed: bookings.filter((booking) => booking?.status === "completed")
        .length,
    };
  }, [bookings]);

  const chartData = useMemo(() => {
    const countByDate = new Map();

    chartBookings.forEach((booking) => {
      const date = getBookingDate(booking);
      if (!date) return;
      const key = toDateKey(date);
      countByDate.set(key, (countByDate.get(key) || 0) + 1);
    });

    const labels = [];
    const values = [];
    const cursor = new Date(rangeBounds.start);

    while (cursor <= rangeBounds.end) {
      const key = toDateKey(cursor);
      labels.push(formatChartLabel(cursor));
      values.push(countByDate.get(key) || 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    return { labels, values };
  }, [chartBookings, rangeBounds.end, rangeBounds.start]);

  const todaySchedule = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const entries = bookings
      .filter((booking) => {
        const date = getBookingDate(booking);
        return date && date >= todayStart && date <= todayEnd;
      })
      .map((booking) => ({
        booking,
        minutes: parseTimeToMinutes(getBookingTime(booking)),
      }))
      .sort((a, b) => {
        if (!Number.isFinite(a.minutes) && !Number.isFinite(b.minutes)) {
          return 0;
        }
        if (!Number.isFinite(a.minutes)) return 1;
        if (!Number.isFinite(b.minutes)) return -1;
        return a.minutes - b.minutes;
      });

    const upcomingEntries = entries.filter((entry) => {
      if (!Number.isFinite(entry.minutes)) return true;
      return entry.minutes >= nowMinutes;
    });

    const source = upcomingEntries.length > 0 ? upcomingEntries : entries;
    return source.slice(0, 6).map((entry) => entry.booking);
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => {
        const firstDate = getBookingDate(a)?.getTime() || 0;
        const secondDate = getBookingDate(b)?.getTime() || 0;
        if (secondDate !== firstDate) return secondDate - firstDate;

        const firstTime = parseTimeToMinutes(getBookingTime(a));
        const secondTime = parseTimeToMinutes(getBookingTime(b));

        if (!Number.isFinite(firstTime) && !Number.isFinite(secondTime)) {
          return 0;
        }
        if (!Number.isFinite(firstTime)) return 1;
        if (!Number.isFinite(secondTime)) return -1;
        return secondTime - firstTime;
      })
      .slice(0, 8);
  }, [bookings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#D97853]">Overview</h1>
          <p className="mt-1 text-sm text-[#2D3436]/60">
            Monitor booking flow and daily operations at a glance to keep staff
            execution on schedule.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadOverview(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2D3436]/12 bg-white px-3 py-2 text-sm font-semibold text-[#2D3436] transition-colors hover:border-[#D97853] hover:text-[#D97853] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`kpi-skeleton-${index}`}
              className="h-[158px] animate-pulse rounded-[22px] border border-[#2D3436]/8 bg-white"
            />
          ))
        ) : (
          <>
            <KpiCard
              title="Total Bookings"
              value={kpis.total}
              helper="All bookings in system"
              icon={CalendarCheck2}
              accent="bg-[#D97853]"
            />
            <KpiCard
              title="Today's Bookings"
              value={kpis.today}
              helper="Scheduled for current day"
              icon={CalendarClock}
              accent="bg-[#7FB069]"
            />
            <KpiCard
              title="Pending Bookings"
              value={kpis.pending}
              helper="Waiting for confirmation"
              icon={CircleDashed}
              accent="bg-[#F0B351]"
            />
            <KpiCard
              title="Completed Bookings"
              value={kpis.completed}
              helper="Successfully completed orders"
              icon={CheckCircle2}
              accent="bg-[#5B8C51]"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="space-y-3 px-1 py-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#2D3436]">
                Bookings by Day
              </h2>
              <p className="mt-1 text-sm text-[#2D3436]/55">
                Daily booking trend for {activeChartFilterLabel.toLowerCase()}.
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#FFF4E8] px-2.5 py-1">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-t from-[#f5c3a7] to-[#D97853]" />
                <span className="text-[11px] font-semibold text-[#8A6A57]">
                  Bookings
                </span>
              </div>
            </div>

            <div className="relative w-fit shrink-0" ref={chartFilterMenuRef}>
              <button
                type="button"
                onClick={() =>
                  setIsChartFilterMenuOpen((previousState) => !previousState)
                }
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 pr-3 text-[14px] font-semibold text-[#5D4C3F] shadow-[0_10px_20px_rgba(217,120,83,0.12)] transition-all ${
                  isChartFilterMenuOpen
                    ? "border-[#D97853] bg-[#FFF6EE]"
                    : "border-[#D97853]/45 bg-[#FFFCF8] hover:border-[#D97853]/70 hover:bg-[#FFF8F2]"
                }`}
                aria-haspopup="listbox"
                aria-expanded={isChartFilterMenuOpen}
              >
                <span>{activeChartFilterLabel}</span>
                <ChevronDown
                  size={14}
                  className={`text-[#D97853]/85 transition-transform ${
                    isChartFilterMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isChartFilterMenuOpen ? (
                <div
                  role="listbox"
                  aria-label="Booking trend range"
                  className="absolute right-0 z-30 mt-2 min-w-[190px] overflow-hidden rounded-2xl border border-[#E7C5AE] bg-[#FFFDFB] p-1.5 shadow-[0_18px_36px_rgba(130,78,52,0.20)]"
                >
                  {CHART_FILTER_OPTIONS.map((option) => {
                    const isActive = option.value === chartFilter;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleChartFilterSelect(option.value)}
                        role="option"
                        aria-selected={isActive}
                        className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold transition-colors ${
                          isActive
                            ? "bg-[#D97853] text-white"
                            : "text-[#5D4C3F] hover:bg-[#FFF3E8]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="mt-3 h-[320px] animate-pulse rounded-xl bg-[#F7EFE5]" />
          ) : chartBookings.length === 0 ? (
            <div className="mt-3 flex h-[320px] items-center justify-center rounded-xl border border-dashed border-[#D9C8B5] bg-[#FDF7F0] px-6 text-center text-sm font-medium text-[#8A7A6E]">
              No booking data available for{" "}
              {activeChartFilterLabel.toLowerCase()}.
            </div>
          ) : (
            <div className="mt-3">
              <Box sx={{ width: "100%", height: 316 }}>
                <BarChart
                  series={[
                    {
                      data: chartData.values,
                      id: "bookingsByDay",
                      color: "#D97853",
                    },
                  ]}
                  xAxis={[
                    {
                      data: chartData.labels,
                      height: 36,
                      categoryGapRatio: 0.52,
                    },
                  ]}
                  yAxis={[
                    {
                      width: 46,
                    },
                  ]}
                  margin={{ top: 18, right: 18, left: 10, bottom: 20 }}
                  grid={{ horizontal: true }}
                  slotProps={{
                    tooltip: {
                      sx: {
                        "& .MuiChartsTooltip-paper": {
                          borderRadius: "12px",
                          border: "1px solid #E7C5AE",
                          background:
                            "linear-gradient(180deg, #FFFEFC 0%, #FFF3E7 100%)",
                          boxShadow: "0 14px 30px rgba(125, 73, 46, 0.20)",
                          color: "#5D4C3F",
                          overflow: "hidden",
                        },
                        "& .MuiChartsTooltip-table": {
                          borderCollapse: "separate",
                          borderSpacing: 0,
                        },
                        "& .MuiChartsTooltip-cell": {
                          borderBottom: "1px solid rgba(217, 120, 83, 0.14)",
                          padding: "9px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#5D4C3F",
                        },
                        "& .MuiChartsTooltip-row:last-of-type .MuiChartsTooltip-cell":
                          {
                            borderBottom: "none",
                          },
                        "& .MuiChartsTooltip-labelCell": {
                          color: "#6C5A4A",
                          letterSpacing: "0.01em",
                        },
                        "& .MuiChartsTooltip-valueCell": {
                          color: "#2D3436",
                          fontWeight: 700,
                        },
                        "& .MuiChartsTooltip-mark": {
                          borderRadius: "4px",
                          boxShadow: "0 0 0 1px rgba(217,120,83,0.28)",
                        },
                      },
                    },
                  }}
                  sx={{
                    "& .MuiBarElement-root": {
                      fill: "url(#bookingsBarGradient)",
                      stroke: "none",
                      rx: 2,
                    },
                    "& .MuiBarElement-root:hover": {
                      filter: "brightness(1.06)",
                    },
                    "& .MuiChartsAxis-line": {
                      stroke: "#E9DDCF",
                    },
                    "& .MuiChartsAxis-tick": {
                      stroke: "#E9DDCF",
                    },
                    "& .MuiChartsAxis-tickLabel": {
                      fill: "#9D8D7F",
                      fontSize: 11,
                      fontWeight: 600,
                    },
                    "& .MuiChartsGrid-line": {
                      stroke: "rgba(171, 140, 107, 0.24)",
                      strokeDasharray: "4 6",
                    },
                  }}
                >
                  <defs>
                    <linearGradient
                      id="bookingsBarGradient"
                      x1="0"
                      y1="1"
                      x2="0"
                      y2="0"
                    >
                      <stop
                        offset="0%"
                        stopColor="#F8D6BE"
                        stopOpacity="0.45"
                      />
                      <stop
                        offset="52%"
                        stopColor="#E9A27D"
                        stopOpacity="0.82"
                      />
                      <stop offset="100%" stopColor="#D97853" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </Box>
            </div>
          )}
        </section>

        <section className="space-y-3 px-1 py-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#2D3436]">
                Today's Schedule
              </h2>
              <p className="mt-1 text-sm text-[#2D3436]/55">
                Upcoming bookings sorted by nearest time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/staff/schedule")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D97853]/30 bg-[#FFF7F2] px-3 py-2 text-xs font-bold text-[#D97853] transition-colors hover:border-[#D97853] hover:bg-[#FFF1E8]"
            >
              View all schedule
              <ExternalLink size={13} />
            </button>
          </div>

          {loading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`schedule-skeleton-${index}`}
                  className="h-12 animate-pulse rounded-xl bg-[#F5F1EA]"
                />
              ))}
            </div>
          ) : todaySchedule.length === 0 ? (
            <div className="mt-3 flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[#2D3436]/15 bg-[#FDFBF7] px-6 text-center text-sm font-medium text-[#2D3436]/55">
              No upcoming bookings for today.
            </div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-2xl bg-[#FFFCF8]">
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[74px_1.1fr_1fr_1fr_auto] gap-2 border-b border-[#D8C6B3] bg-[#F3EADF] px-3 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#2D3436]/80">
                    <span>Time</span>
                    <span>Customer</span>
                    <span>Pet</span>
                    <span>Service</span>
                    <span>Status</span>
                  </div>

                  <div className="max-h-[284px] overflow-y-auto">
                    {todaySchedule.map((booking) => {
                      const status = booking?.status || "pending";
                      const service = getServiceSummary(booking);

                      return (
                        <div
                          key={booking?._id || booking?.bookingNumber}
                          className="grid grid-cols-[74px_1.1fr_1fr_1fr_auto] items-center gap-2 border-b border-[#2D3436]/6 px-3 py-2.5 text-sm last:border-b-0"
                        >
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#2D3436]">
                            <Clock3 size={13} className="text-[#D97853]" />
                            {getBookingTime(booking)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#2D3436]">
                            <UserRound
                              size={13}
                              className="text-[#2D3436]/45"
                            />
                            <span className="truncate">
                              {getCustomerName(booking)}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[#2D3436]/85">
                            <PawPrint size={13} className="text-[#2D3436]/45" />
                            <span className="truncate">
                              {getPetName(booking)}
                            </span>
                          </span>
                          <span className="truncate text-[#2D3436]/75">
                            {service.name}
                            <span className="mt-0.5 block text-[11px] font-medium text-[#2D3436]/50">
                              {service.type}
                            </span>
                          </span>
                          <span
                            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusBadge(status)}`}
                          >
                            {STATUS_LABELS[status] || status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="space-y-3 px-1 py-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#2D3436]">
              Recent Bookings
            </h2>
            <p className="mt-1 text-sm text-[#2D3436]/55">
              Latest booking activity.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`table-skeleton-${index}`}
                className="h-12 animate-pulse rounded-xl bg-[#F5F1EA]"
              />
            ))}
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="mt-3 flex min-h-[190px] items-center justify-center rounded-2xl border border-dashed border-[#2D3436]/15 bg-[#FDFBF7] px-6 text-center text-sm font-medium text-[#2D3436]/55">
            No recent bookings found.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-[#2D3436]/8">
            <table className="min-w-full text-left">
              <thead className="bg-[#F8F4EE]">
                <tr className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2D3436]/50">
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Pet</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#2D3436]/7 bg-white text-sm">
                {recentBookings.map((booking) => {
                  const status = booking?.status || "pending";
                  const service = getServiceSummary(booking);

                  return (
                    <tr key={booking?._id || booking?.bookingNumber}>
                      <td className="px-4 py-3 font-semibold text-[#2D3436]">
                        {booking?.bookingNumber ||
                          booking?._id?.slice(-8)?.toUpperCase() ||
                          "--"}
                      </td>
                      <td className="px-4 py-3 text-[#2D3436]/85">
                        {getCustomerName(booking)}
                      </td>
                      <td className="px-4 py-3 text-[#2D3436]/85">
                        {getPetName(booking)}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-[#2D3436]/75">
                        <span className="block truncate">{service.name}</span>
                        <span className="mt-0.5 block text-[11px] font-medium text-[#2D3436]/50">
                          {service.type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#2D3436]/75">
                        {formatDisplayDate(getBookingDate(booking))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#2D3436]/75">
                        {getBookingTime(booking)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusBadge(status)}`}
                        >
                          {STATUS_LABELS[status] || status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate("/staff/bookings")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2D3436]/12 bg-white px-3 py-1.5 text-xs font-bold text-[#2D3436] transition-colors hover:border-[#D97853] hover:text-[#D97853]"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </motion.div>
  );
};

export default StaffDashboard;
