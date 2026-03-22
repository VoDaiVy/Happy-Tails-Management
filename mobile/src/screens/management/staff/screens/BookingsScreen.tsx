import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getAllBookings } from "../../../../api/modules/bookingApi";
import type { Booking } from "../../../../types/booking";
import { staffTheme } from "../../../../theme/staffTheme";
import { BookingCard, EmptyState, FilterChipGroup, PrimaryButton, SearchBar, SectionHeader } from "../components";
import type { BookingCardModel } from "../types";

const BOOKING_FILTERS = ["All", "Pending", "Accepted", "In Progress", "Completed", "Cancelled"];

const STATUS_MAP: Record<string, BookingCardModel["status"]> = {
  pending: "Pending",
  confirmed: "Accepted",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function pickText(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function extractCustomerName(booking: Booking) {
  const b = booking as Booking & {
    customer?: { name?: string; fullName?: string; email?: string };
    customerName?: string;
    guestInfo?: { name?: string; email?: string };
    user?: { name?: string; email?: string };
  };

  return pickText(
    b.customer?.name,
    b.customer?.fullName,
    b.customerName,
    b.guestInfo?.name,
    b.user?.name,
  ) || "Guest Customer";
}

function extractCustomerEmail(booking: Booking) {
  const b = booking as Booking & {
    customer?: { email?: string };
    guestInfo?: { email?: string };
    user?: { email?: string };
  };

  return pickText(b.customer?.email, b.guestInfo?.email, b.user?.email) || "--";
}

function extractServiceName(booking: Booking) {
  const names = new Set<string>();

  (booking.items || []).forEach((item) => {
    if (typeof item.service === "string") {
      names.add(item.service);
      return;
    }

    const svc = item.service as { name?: string; serviceName?: string };
    if (svc?.name) names.add(svc.name);
    if (svc?.serviceName) names.add(svc.serviceName);
  });

  const list = [...names].filter(Boolean);
  if (list.length === 0) return "Service Booked";
  if (list.length === 1) return list[0];
  return `${list[0]} +${list.length - 1}`;
}

function toBookingCardModel(booking: Booking): BookingCardModel {
  const bookingNumber = (booking as Booking & { bookingNumber?: string }).bookingNumber;
  const dateLabel = booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString("en-GB") : "--";
  const timeLabel = booking.bookingTime || "--";

  return {
    id: bookingNumber || booking._id,
    status: STATUS_MAP[booking.status] || "Pending",
    customerName: extractCustomerName(booking),
    email: extractCustomerEmail(booking),
    dateTime: `${dateLabel}, ${timeLabel}`,
    service: extractServiceName(booking),
    paymentMethod: booking.paymentMethod || "--",
    paymentStatus: "Paid",
    amount: `${new Intl.NumberFormat("en-GB").format(Number(booking.totalAmount || 0))} VND`,
  };
}

export function BookingsScreen() {
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [keyword, setKeyword] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadBookings = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getAllBookings({ limit: 500 });
        if (mounted) setBookings(result);
      } catch (fetchError) {
        const err = fetchError as { message?: string };
        if (mounted) setError(err.message || "Failed to load bookings.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadBookings();
    return () => {
      mounted = false;
    };
  }, []);

  const bookingCards = useMemo(() => bookings.map(toBookingCardModel), [bookings]);

  const filteredBookings = useMemo(() => {
    const byStatus = selectedFilter === "All"
      ? bookingCards
      : bookingCards.filter((item) => item.status === selectedFilter);

    if (!keyword.trim()) return byStatus;
    const normalized = keyword.trim().toLowerCase();

    return byStatus.filter((item) => {
      const line = `${item.id} ${item.customerName} ${item.service}`.toLowerCase();
      return line.includes(normalized);
    });
  }, [bookingCards, keyword, selectedFilter]);

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="Process Bookings"
        subtitle="Handle booking lifecycle on mobile"
        action={<PrimaryButton title="Create Offline Order" />}
      />

      <View style={styles.filtersWrap}>
        <SearchBar placeholder="Search by booking code or customer" value={keyword} onChangeText={setKeyword} />
        <FilterChipGroup options={BOOKING_FILTERS} selected={selectedFilter} onSelect={setSelectedFilter} />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.loadingWrap}><Text style={styles.loadingText}>Loading bookings...</Text></View>
      ) : filteredBookings.length === 0 ? (
        <EmptyState title="No booking found" subtitle="Try another status or update search keyword." />
      ) : (
        filteredBookings.map((item) => <BookingCard key={item.id} item={item} />)
      )}

      <View style={styles.captionBox}>
        <Text style={styles.caption}>Card-first redesign keeps full booking context readable on small screens.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: staffTheme.spacing.lg,
  },
  filtersWrap: {
    gap: 10,
    padding: staffTheme.spacing.sm,
    borderRadius: staffTheme.radius.xl,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    backgroundColor: staffTheme.colors.surfaceAlt,
  },
  loadingWrap: {
    borderRadius: staffTheme.radius.lg,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: staffTheme.colors.surface,
  },
  loadingText: {
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
  },
  errorText: {
    color: staffTheme.colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  captionBox: {
    borderRadius: staffTheme.radius.lg,
    backgroundColor: staffTheme.colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  caption: {
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
