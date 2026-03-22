import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getAllBookings } from "../../../../api/modules/bookingApi";
import type { Booking } from "../../../../types/booking";
import { staffTheme } from "../../../../theme/staffTheme";
import { EmptyState, FilterChipGroup, ScheduleCard, SearchBar, SectionHeader } from "../components";
import type { ScheduleCardModel } from "../types";

const STATUS_OPTIONS = ["All", "Pending", "In Progress", "Completed"];

const STATUS_MAP: Record<string, ScheduleCardModel["status"] | "Cancelled"> = {
  pending: "Pending",
  confirmed: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function pickText(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getCustomerName(booking: Booking) {
  const b = booking as Booking & {
    customer?: { name?: string; fullName?: string };
    customerName?: string;
    guestInfo?: { name?: string };
  };
  return pickText(b.customer?.name, b.customer?.fullName, b.customerName, b.guestInfo?.name) || "Guest Customer";
}

function getPetName(booking: Booking) {
  for (const item of booking.items || []) {
    const itemPet = item.pet as { petName?: string; name?: string } | undefined;
    const petName = pickText(itemPet?.petName, itemPet?.name);
    if (petName) return petName;
  }
  return "Guest Pet";
}

function getServiceName(booking: Booking) {
  for (const item of booking.items || []) {
    if (typeof item.service === "string" && item.service.trim()) return item.service;
    const svc = item.service as { name?: string; serviceName?: string } | undefined;
    const name = pickText(svc?.name, svc?.serviceName);
    if (name) return name;
  }
  return "Service Booked";
}

function toScheduleModel(booking: Booking): ScheduleCardModel {
  const bookingNumber = (booking as Booking & { bookingNumber?: string }).bookingNumber || booking._id;
  const mappedStatus = STATUS_MAP[booking.status] || "Pending";

  return {
    time: booking.bookingTime || "--",
    bookingCode: bookingNumber,
    pet: getPetName(booking),
    customer: getCustomerName(booking),
    service: getServiceName(booking),
    staff: "Assigned Staff",
    status: mappedStatus === "Cancelled" ? "Pending" : mappedStatus,
  };
}

function formatDayLabel(dateString?: string) {
  if (!dateString) return "Unknown Date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown Date";
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" }).format(date);
}

export function ScheduleScreen() {
  const [status, setStatus] = useState("All");
  const [keyword, setKeyword] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadSchedule = async () => {
      try {
        setLoading(true);
        setError("");
        const rows = await getAllBookings({ limit: 500 });
        if (mounted) setBookings(rows);
      } catch (fetchError) {
        const err = fetchError as { message?: string };
        if (mounted) setError(err.message || "Failed to load schedule.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSchedule();
    return () => {
      mounted = false;
    };
  }, []);

  const groupedSchedule = useMemo(() => {
    const filtered = bookings.filter((booking) => {
      const mappedStatus = STATUS_MAP[booking.status] || "Pending";
      const passStatus = status === "All" || mappedStatus === status;
      if (!passStatus) return false;

      if (!keyword.trim()) return true;

      const normalized = keyword.trim().toLowerCase();
      const line = `${getCustomerName(booking)} ${getPetName(booking)} ${getServiceName(booking)} ${booking.bookingTime || ""}`.toLowerCase();
      return line.includes(normalized);
    });

    const byDay = new Map<string, ScheduleCardModel[]>();

    filtered
      .sort((a, b) => {
        const first = new Date(`${a.bookingDate || ""}T${a.bookingTime || "00:00"}`).getTime();
        const second = new Date(`${b.bookingDate || ""}T${b.bookingTime || "00:00"}`).getTime();
        return first - second;
      })
      .forEach((booking) => {
        const day = formatDayLabel(booking.bookingDate);
        const list = byDay.get(day) || [];
        list.push(toScheduleModel(booking));
        byDay.set(day, list);
      });

    return [...byDay.entries()];
  }, [bookings, keyword, status]);

  const totalRows = groupedSchedule.reduce((sum, entry) => sum + entry[1].length, 0);

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Schedule Management" subtitle="Organize service timeline by day" />

      <View style={styles.filterBlock}>
        <SearchBar placeholder="Search booking / pet / customer" value={keyword} onChangeText={setKeyword} />
        <FilterChipGroup options={STATUS_OPTIONS} selected={status} onSelect={setStatus} />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.resultPill}><Text style={styles.resultText}>{totalRows} schedules found</Text></View>

      {loading ? (
        <View style={styles.loadingWrap}><Text style={styles.loadingText}>Loading schedule...</Text></View>
      ) : groupedSchedule.length === 0 ? (
        <EmptyState title="No schedule found" subtitle="No matching bookings for selected filters." />
      ) : (
        groupedSchedule.map(([day, list]) => (
          <View key={day} style={styles.dayBlock}>
            <View style={styles.dayTitleRow}><Text style={styles.dayTitle}>{day}</Text></View>
            {list.map((item) => <ScheduleCard key={`${item.bookingCode}-${item.time}`} item={item} />)}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: staffTheme.spacing.lg,
  },
  filterBlock: {
    gap: 8,
    padding: staffTheme.spacing.sm,
    borderRadius: staffTheme.radius.xl,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    backgroundColor: staffTheme.colors.surfaceAlt,
  },
  loadingWrap: {
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    borderRadius: staffTheme.radius.lg,
    backgroundColor: staffTheme.colors.surface,
    alignItems: "center",
    paddingVertical: 16,
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
  resultPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: staffTheme.colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resultText: {
    color: staffTheme.colors.textMuted,
    fontWeight: "700",
    fontSize: 11,
  },
  dayBlock: {
    gap: 10,
    padding: staffTheme.spacing.sm,
    borderRadius: staffTheme.radius.xl,
    backgroundColor: staffTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
  },
  dayTitleRow: {
    paddingBottom: 2,
  },
  dayTitle: {
    color: staffTheme.colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
});
