import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  AlertCircle,
  Briefcase,
  Hash,
  MessageSquareText,
  RefreshCw,
  Search,
  Star,
  User,
  X,
} from "lucide-react";
import { getAllBookings } from "../../../api/bookingApi";
import { getAllFeedback, getStaffReceivedFeedback } from "../../../api/feedbackApi";

const getApiErrorMessage = (error, fallback = "Cannot load feedback list") => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const extractFeedbackRows = (payload) => {
  if (Array.isArray(payload?.data?.feedback)) return payload.data.feedback;
  if (Array.isArray(payload?.feedback)) return payload.feedback;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const getIdValue = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") return value._id || value.id || null;
  return null;
};

const extractBookingRows = (payload) => {
  if (Array.isArray(payload?.data?.bookings)) return payload.data.bookings;
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const buildBookingMap = (bookings = []) => {
  const map = new Map();
  bookings.forEach((booking) => {
    const id = getIdValue(booking?._id || booking?.id || booking);
    if (id) map.set(String(id), booking);
  });
  return map;
};

const collectServiceNames = (booking) => {
  const names = Array.isArray(booking?.items)
    ? booking.items
        .map((item) => (typeof item?.service === "object" ? item?.service?.name : ""))
        .filter(Boolean)
    : [];
  return [...new Set(names)];
};

const formatCompactList = (values = [], fallback = "-") => {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  if (values.length <= 2) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2} more`;
};

const enrichFeedbackRows = (rows = [], bookingMap = new Map()) => {
  return rows.map((row) => {
    const rowBookingId = getIdValue(row?.booking);
    const bookingFromRow = row?.booking && typeof row.booking === "object" ? row.booking : null;
    const booking = bookingMap.get(String(rowBookingId || "")) || bookingFromRow;

    const serviceNames = [];
    if (row?.service?.name) {
      serviceNames.push(row.service.name);
    }
    collectServiceNames(booking).forEach((name) => {
      if (!serviceNames.includes(name)) serviceNames.push(name);
    });

    return {
      ...row,
      _bookingId: rowBookingId || getIdValue(booking?._id || booking?.id || booking),
      _bookingNumber: booking?.bookingNumber || bookingFromRow?.bookingNumber || "-",
      _serviceNames: serviceNames,
      _serviceLabel: formatCompactList(serviceNames, "Overall booking"),
    };
  });
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StaffFeedbackPage = () => {
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState(0);

  const resolveLegacyFeedback = useCallback(async (currentStaffId, allBookingsInput = null) => {
    if (!currentStaffId) return [];

    const feedbackPayload = await getAllFeedback({ isPublished: "all" });
    const allBookings = Array.isArray(allBookingsInput)
      ? allBookingsInput
      : extractBookingRows(await getAllBookings());

    const allFeedbackRows = extractFeedbackRows(feedbackPayload);

    const ownedBookingIds = new Set(
      allBookings
        .filter((booking) => String(getIdValue(booking?.assignedStaff) || "") === String(currentStaffId))
        .map((booking) => String(booking?._id || ""))
        .filter(Boolean),
    );

    return allFeedbackRows.filter((row) => {
      const rowStaffId = String(getIdValue(row?.staff) || "");
      const rowBookingId = String(getIdValue(row?.booking) || "");

      return rowStaffId === String(currentStaffId) || ownedBookingIds.has(rowBookingId);
    });
  }, []);

  const fetchFeedback = useCallback(async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const currentStaffId = user?._id || user?.id || null;

    let bookingRows = [];
    try {
      bookingRows = extractBookingRows(await getAllBookings());
    } catch (bookingError) {
      console.warn("Unable to preload bookings for feedback enrichment", bookingError);
      bookingRows = [];
    }

    const bookingMap = buildBookingMap(bookingRows);

    try {
      setLoading(true);
      setError(null);

      const response = await getStaffReceivedFeedback();
      const primaryRows = extractFeedbackRows(response);

      if (primaryRows.length > 0) {
        setFeedbackItems(enrichFeedbackRows(primaryRows, bookingMap));
      } else {
        const recoveredRows = await resolveLegacyFeedback(currentStaffId, bookingRows);
        setFeedbackItems(enrichFeedbackRows(recoveredRows, bookingMap));
      }
    } catch (primaryError) {
      console.error("Error fetching staff feedback page:", primaryError);

      // Fallback path: backend might not expose /staff/received yet or may fail on old deployments.
      try {
        const rows = await resolveLegacyFeedback(currentStaffId, bookingRows);
        setFeedbackItems(enrichFeedbackRows(rows, bookingMap));
        setError(null);
      } catch (fallbackError) {
        setError(getApiErrorMessage(primaryError) || getApiErrorMessage(fallbackError));
        setFeedbackItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [resolveLegacyFeedback]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const filteredFeedback = useMemo(() => {
    return feedbackItems.filter((item) => {
      const query = searchTerm.trim().toLowerCase();
      const customerName = String(item?.user?.name || "").toLowerCase();

      const ratingPass =
        Number(ratingFilter) === 0 || Number(item?.rating || 0) === Number(ratingFilter);
      const queryPass =
        !query || customerName.includes(query);

      return ratingPass && queryPass;
    });
  }, [feedbackItems, searchTerm, ratingFilter]);

  const selectedStarLabel = useMemo(() => {
    if (Number(ratingFilter) === 0) return "All ratings";
    return `${ratingFilter} star${Number(ratingFilter) > 1 ? "s" : ""}`;
  }, [ratingFilter]);

  const avgRating = useMemo(() => {
    if (!feedbackItems.length) return 0;
    const total = feedbackItems.reduce((sum, row) => sum + Number(row?.rating || 0), 0);
    return total / feedbackItems.length;
  }, [feedbackItems]);

  const renderStars = (rating) => {
    const safe = Math.max(0, Math.min(5, Number(rating) || 0));
    return Array.from({ length: 5 }, (_, index) => {
      const active = index < safe;
      return (
        <Star
          key={`feedback-star-${index}`}
          size={14}
          className={active ? "text-amber-400 fill-amber-400" : "text-gray-300"}
        />
      );
    });
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#D97853]">Feedback</h1>
          <p className="text-sm text-[#2D3436]/60">
            View customer reviews sent to your completed bookings
          </p>
        </div>
        <button
          onClick={fetchFeedback}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-[#2D3436]">{feedbackItems.length}</p>
          <p className="text-xs text-[#2D3436]/60 uppercase tracking-wide">Total Reviews</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{avgRating.toFixed(1)}</p>
          <p className="text-xs text-[#2D3436]/60 uppercase tracking-wide">Average Rating</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-[#5B8C51]">{filteredFeedback.length}</p>
          <p className="text-xs text-[#2D3436]/60 uppercase tracking-wide">Filtered Result</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
          <label className="relative flex-1 flex items-center gap-2 border border-[#D97853]/20 bg-[#FFF9F5] rounded-2xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#D97853]/20 focus-within:border-[#D97853]/50 transition-all">
            <Search size={17} className="text-[#D97853]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer name..."
              className="w-full bg-transparent text-sm text-[#2D3436] placeholder:text-[#2D3436]/45 outline-none"
            />
            {!!searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="p-1 rounded-full hover:bg-[#D97853]/10 text-[#2D3436]/55"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <div className="w-full xl:w-96 rounded-2xl border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2D3436]/70">
                Star Filter
              </p>
              <button
                type="button"
                onClick={() => setRatingFilter(0)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                  Number(ratingFilter) === 0
                    ? "bg-[#2D3436] text-white border-[#2D3436]"
                    : "bg-white text-[#2D3436]/70 border-white/80 hover:border-[#2D3436]/30"
                }`}
              >
                All
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-700">1</span>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={Number(ratingFilter) === 0 ? 5 : Number(ratingFilter)}
                onChange={(e) => setRatingFilter(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
                aria-label="Select exact rating"
              />
              <span className="text-xs font-semibold text-amber-700">5</span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#2D3436]">{selectedStarLabel}</p>
              <div className="flex items-center gap-1">
                {renderStars(Number(ratingFilter) === 0 ? 5 : Number(ratingFilter))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-[#D97853] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </span>
            <button
              onClick={fetchFeedback}
              className="px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <MessageSquareText size={28} className="mx-auto mb-2 text-gray-300" />
            No feedback found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredFeedback.map((item) => (
              <div key={item._id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#2D3436] inline-flex items-center gap-2">
                      <User size={14} className="text-gray-500" />
                      {item?.user?.name || "Anonymous Customer"}
                    </p>
                    <div className="mt-1 space-y-1 text-xs text-gray-500">
                      <p className="inline-flex items-center gap-1.5">
                        <Hash size={12} />
                        Booking ID: #{item?._bookingNumber || "-"}
                      </p>
                      <p className="inline-flex items-center gap-1.5">
                        <Briefcase size={12} />
                        Service: {item?._serviceLabel || "Overall booking"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(item?.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {renderStars(item?.rating)}
                  <span className="text-sm font-semibold text-amber-600 ml-1">
                    {Number(item?.rating || 0).toFixed(1)}
                  </span>
                </div>

                <p className="text-sm text-gray-700">
                  {String(item?.comment || "").trim() || "Customer did not leave a written comment."}
                </p>

                {item?.response?.message && (
                  <div className="text-xs text-[#2D3436]/70 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                    Staff response: {item.response.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Motion.div>
  );
};

export default StaffFeedbackPage;
