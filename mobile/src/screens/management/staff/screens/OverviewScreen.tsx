import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getAllBookings } from "../../../../api/modules/bookingApi";
import type { Booking } from "../../../../types/booking";
import { useAuth } from "../../../../context/AuthContext";
import { StatusBadge } from "../components";
import { staffTheme } from "../../../../theme/staffTheme";

interface OverviewScreenProps {
  onOpenSchedule?: () => void;
}

type ChartFilter = "today" | "last7" | "last30" | "thisMonth";

const CHART_FILTERS: Array<{ value: ChartFilter; label: string }> = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  "in-progress": "In Progress",
};

const KPI_META = [
  { label: "Total Bookings", helper: "All bookings in system", icon: "◫", iconBg: "#E8A27E", chipBg: "#FFF0E7" },
  { label: "Today's Bookings", helper: "Scheduled for current day", icon: "◷", iconBg: "#7FB069", chipBg: "#EBF6E6" },
  { label: "Pending Bookings", helper: "Waiting for confirmation", icon: "◌", iconBg: "#F0B351", chipBg: "#FFF7E8" },
  { label: "Completed Bookings", helper: "Successfully completed orders", icon: "✓", iconBg: "#5B8C51", chipBg: "#EAF6E8" },
] as const;

const SCHEDULE_STATUS_UI: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  "in-progress": "In Progress",
};

function startOfDay(input: Date) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(input: Date) {
  const date = new Date(input);
  date.setHours(23, 59, 59, 999);
  return date;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatChartLabel(input: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(input);
}

function getChartRangeBounds(filterValue: ChartFilter) {
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
}

function parseTimeToMinutes(timeValue?: string) {
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
}

function pickFirstText(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function getBookingDate(booking: Booking) {
  const fallback = booking as Booking & { date?: string; createdAt?: string };
  const raw = booking.bookingDate || fallback.date || fallback.createdAt;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getBookingTime(booking: Booking) {
  return booking.bookingTime || "--";
}

function getCustomerName(booking: Booking) {
  const bookingExt = booking as Booking & {
    customer?: { name?: string; fullName?: string; displayName?: string };
    customerName?: string;
    user?: { name?: string };
    userName?: string;
    guestInfo?: { name?: string };
    guestName?: string;
  };

  return (
    pickFirstText(
      bookingExt.customer?.name,
      bookingExt.customer?.fullName,
      bookingExt.customer?.displayName,
      bookingExt.customerName,
      bookingExt.guestInfo?.name,
      bookingExt.guestName,
      bookingExt.user?.name,
      bookingExt.userName,
    ) || "Guest Customer"
  );
}

function getPetName(booking: Booking) {
  const bookingExt = booking as Booking & {
    pet?: { petName?: string; name?: string };
    petName?: string;
    guestPet?: { petName?: string };
    petInfo?: { petName?: string };
  };

  const direct = pickFirstText(
    bookingExt.pet?.petName,
    bookingExt.pet?.name,
    bookingExt.petName,
    bookingExt.guestPet?.petName,
    bookingExt.petInfo?.petName,
  );

  if (direct) return direct;

  for (const item of booking.items || []) {
    const itemExt = item as typeof item & {
      pet?: { petName?: string; name?: string };
      petName?: string;
      guestPet?: { petName?: string };
      petInfo?: { petName?: string };
    };

    const itemName = pickFirstText(
      itemExt.pet?.petName,
      itemExt.pet?.name,
      itemExt.petName,
      itemExt.guestPet?.petName,
      itemExt.petInfo?.petName,
    );
    if (itemName) return itemName;
  }

  return "Guest Pet";
}

function getServiceName(booking: Booking) {
  const names = new Set<string>();

  const addName = (value?: string) => {
    if (!value || !value.trim()) return;
    names.add(value.trim());
  };

  const bookingExt = booking as Booking & {
    service?: { name?: string; serviceName?: string };
    serviceName?: string;
  };

  addName(bookingExt.service?.name);
  addName(bookingExt.service?.serviceName);
  addName(bookingExt.serviceName);

  for (const item of booking.items || []) {
    const serviceObject = typeof item.service === "object" ? item.service : undefined;
    addName((serviceObject as { name?: string } | undefined)?.name);
    addName((serviceObject as { serviceName?: string } | undefined)?.serviceName);
    addName(typeof item.service === "string" ? item.service : undefined);
  }

  const list = [...names];
  if (list.length === 0) return "Service Booked";
  if (list.length === 1) return list[0];
  return `${list[0]} +${list.length - 1}`;
}

function getErrorMessage(error: unknown) {
  const candidate = error as {
    response?: { data?: { error?: { message?: string }; message?: string } };
    message?: string;
  };

  return (
    candidate.response?.data?.error?.message ||
    candidate.response?.data?.message ||
    candidate.message ||
    "Failed to load overview data."
  );
}

export function OverviewScreen({ onOpenSchedule }: OverviewScreenProps) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [chartFilter, setChartFilter] = useState<ChartFilter>("last7");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const loadOverview = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      const data = await getAllBookings({ limit: 500 });
      setBookings(data);
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

  const rangeBounds = useMemo(() => getChartRangeBounds(chartFilter), [chartFilter]);

  const chartBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const date = getBookingDate(booking);
      if (!date) return false;
      return date >= rangeBounds.start && date <= rangeBounds.end;
    });
  }, [bookings, rangeBounds.end, rangeBounds.start]);

  const activeFilterLabel = useMemo(() => {
    return CHART_FILTERS.find((item) => item.value === chartFilter)?.label || "Last 7 Days";
  }, [chartFilter]);

  const chartData = useMemo(() => {
    const countByDate = new Map<string, number>();

    chartBookings.forEach((booking) => {
      const date = getBookingDate(booking);
      if (!date) return;
      const key = toDateKey(date);
      countByDate.set(key, (countByDate.get(key) || 0) + 1);
    });

    const labels: string[] = [];
    const values: number[] = [];
    const cursor = new Date(rangeBounds.start);

    while (cursor <= rangeBounds.end) {
      const key = toDateKey(cursor);
      labels.push(formatChartLabel(cursor));
      values.push(countByDate.get(key) || 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    return { labels, values };
  }, [chartBookings, rangeBounds.end, rangeBounds.start]);

  const kpis = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const today = bookings.filter((booking) => {
      const date = getBookingDate(booking);
      return date && date >= todayStart && date <= todayEnd;
    }).length;

    return {
      total: bookings.length,
      today,
      pending: bookings.filter((booking) => booking.status === "pending").length,
      completed: bookings.filter((booking) => booking.status === "completed").length,
    };
  }, [bookings]);

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
      .map((booking) => ({ booking, minutes: parseTimeToMinutes(getBookingTime(booking)) }))
      .sort((first, second) => first.minutes - second.minutes);

    const upcoming = entries.filter((entry) => Number.isFinite(entry.minutes) && entry.minutes >= nowMinutes);
    const source = upcoming.length > 0 ? upcoming : entries;

    return source.slice(0, 5).map((entry) => entry.booking);
  }, [bookings]);

  const chartMax = Math.max(...chartData.values, 1);
  const profileName = String(user?.name || "Staff");
  const profileRole = String(user?.role || "Staff");
  const profileInitial = profileName.slice(0, 1).toUpperCase();

  return (
    <View style={styles.wrap}>
      <View style={styles.summaryBlock}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryEyebrow}>STAFF DASHBOARD</Text>
          <Text style={styles.summaryTitle}>Welcome back</Text>
        </View>

        <View style={styles.summaryProfile}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{profileInitial}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profileRole}>{profileRole}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHead}>
        <View style={styles.sectionHeadTextCol}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.sectionSubtitle}>Monitor booking flow and daily operations at a glance.</Text>
        </View>

        <Pressable style={styles.refreshButton} onPress={() => loadOverview(true)} disabled={refreshing}>
          {refreshing ? <ActivityIndicator size="small" color={staffTheme.colors.primaryStrong} /> : <Text style={styles.refreshButtonText}>Refresh</Text>}
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Cannot load dashboard data</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.errorRetryButton} onPress={() => loadOverview(true)}>
            <Text style={styles.errorRetryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.kpiGrid}>
        {(loading ? [0, 1, 2, 3] : [kpis.total, kpis.today, kpis.pending, kpis.completed]).map((value, index) => {
          const meta = KPI_META[index];
          const isLoading = loading;

          return (
            <View key={meta.label} style={styles.kpiCard}>
              <View style={styles.kpiHeadRow}>
                <View style={[styles.kpiIconCircle, { backgroundColor: meta.chipBg }]}>
                  <Text style={[styles.kpiIcon, { color: meta.iconBg }]}>{meta.icon}</Text>
                </View>
                <Text style={styles.kpiTag}>KPI</Text>
              </View>

              <Text style={styles.kpiLabel}>{meta.label}</Text>
              {isLoading ? <View style={styles.kpiValueSkeleton} /> : <Text style={styles.kpiValue}>{new Intl.NumberFormat("en-GB").format(value as number)}</Text>}
              <Text style={styles.kpiSubtext}>{meta.helper}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoHeaderRow}>
          <View style={styles.infoHeaderTextCol}>
            <Text style={styles.infoTitle}>Bookings by Day</Text>
            <Text style={styles.infoDescription}>Daily booking trend for {activeFilterLabel.toLowerCase()}.</Text>
          </View>
          <View style={styles.filterWrap}>
            <Pressable style={styles.filterPill} onPress={() => setIsFilterOpen((prev) => !prev)}>
              <Text style={styles.filterText}>{activeFilterLabel}</Text>
              <Text style={styles.filterChevron}>{isFilterOpen ? "▴" : "▾"}</Text>
            </Pressable>

            {isFilterOpen ? (
              <View style={styles.filterMenu}>
                {CHART_FILTERS.map((item) => {
                  const isActive = item.value === chartFilter;
                  return (
                    <Pressable
                      key={item.value}
                      style={[styles.filterItem, isActive && styles.filterItemActive]}
                      onPress={() => {
                        setChartFilter(item.value);
                        setIsFilterOpen(false);
                      }}
                    >
                      <Text style={[styles.filterItemText, isActive && styles.filterItemTextActive]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.chartLoading}>
            <ActivityIndicator color={staffTheme.colors.primaryStrong} />
          </View>
        ) : chartData.values.every((item) => item === 0) ? (
          <View style={styles.chartEmpty}>
            <Text style={styles.chartEmptyText}>No booking data available for this range.</Text>
          </View>
        ) : (
          <View style={styles.chartArea}>
            {[0.2, 0.4, 0.6, 0.8, 1].map((mark) => (
              <View key={mark} style={[styles.chartGuide, { bottom: `${mark * 100}%` }]} />
            ))}

            <View style={styles.barRow}>
              {chartData.values.map((value, index) => {
                const barHeight = Math.max((value / chartMax) * 170, value === 0 ? 2 : 12);

                return (
                  <View key={`${chartData.labels[index]}-${index}`} style={styles.barGroup}>
                    <View style={[styles.bar, { height: barHeight }]} />
                    <Text style={styles.barLabel}>{chartData.labels[index]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoHeaderRow}>
          <View style={styles.infoHeaderTextCol}>
            <Text style={styles.infoTitle}>Today&apos;s Schedule</Text>
            <Text style={styles.infoDescription}>Upcoming bookings sorted by nearest time.</Text>
          </View>
          <Pressable style={styles.viewAllButton} onPress={onOpenSchedule}>
            <Text style={styles.viewAllText}>View all schedule</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.scheduleLoading}>
            <ActivityIndicator color={staffTheme.colors.primaryStrong} />
          </View>
        ) : todaySchedule.length === 0 ? (
          <View style={styles.scheduleEmpty}>
            <Text style={styles.scheduleEmptyText}>No upcoming bookings for today.</Text>
          </View>
        ) : (
          <View style={styles.scheduleList}>
            {todaySchedule.map((booking) => {
              const normalizedStatus = booking.status || "pending";

              return (
                <View key={booking._id} style={styles.scheduleItem}>
                  <View style={styles.scheduleLeft}>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeText}>{getBookingTime(booking)}</Text>
                    </View>
                  </View>

                  <View style={styles.scheduleMiddle}>
                    <Text style={styles.scheduleName} numberOfLines={1}>{getCustomerName(booking)}</Text>
                    <Text style={styles.scheduleMeta} numberOfLines={1}>{getPetName(booking)}</Text>
                    <Text style={styles.scheduleService} numberOfLines={2}>{getServiceName(booking)}</Text>
                  </View>

                  <View style={styles.scheduleRight}>
                    <StatusBadge value={SCHEDULE_STATUS_UI[normalizedStatus] || STATUS_LABELS[normalizedStatus] || normalizedStatus} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: staffTheme.spacing.lg,
    paddingBottom: staffTheme.spacing.sm,
  },
  summaryBlock: {
    paddingHorizontal: 2,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryEyebrow: {
    color: "#8A796B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  summaryTitle: {
    marginTop: 1,
    color: "#2D3436",
    fontSize: 18,
    fontWeight: "800",
  },
  summaryProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#FCF6EE",
    borderWidth: 1,
    borderColor: "#EFE3D6",
  },
  profileAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: staffTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  profileName: {
    color: staffTheme.colors.text,
    fontSize: 11,
    fontWeight: "700",
    maxWidth: 100,
  },
  profileRole: {
    color: staffTheme.colors.textSecondary,
    fontSize: 9,
    marginTop: 1,
    maxWidth: 100,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sectionHeadTextCol: {
    flex: 1,
  },
  sectionTitle: {
    color: staffTheme.colors.primary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
  },
  sectionSubtitle: {
    marginTop: 2,
    color: "rgba(45,52,54,0.6)",
    fontSize: 13,
    lineHeight: 18,
  },
  refreshButton: {
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(45,52,54,0.14)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    minWidth: 78,
  },
  refreshButtonText: {
    color: "#2D3436",
    fontSize: 12,
    fontWeight: "700",
  },
  errorBox: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#F2C3C3",
    backgroundColor: "#FFF3F3",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorTitle: {
    color: "#8A231A",
    fontSize: 12,
    fontWeight: "800",
  },
  errorText: {
    marginTop: 2,
    color: "#B42318",
    fontSize: 12,
    fontWeight: "600",
  },
  errorRetryButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    minHeight: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E7B1B1",
    backgroundColor: "#FFF8F8",
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  errorRetryText: {
    color: "#9F2A20",
    fontSize: 11,
    fontWeight: "700",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiCard: {
    width: "48.2%",
    borderWidth: 1,
    borderColor: "rgba(45,52,54,0.08)",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 12,
    minHeight: 146,
    shadowColor: "#2D3436",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  kpiHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiIcon: {
    fontSize: 14,
    fontWeight: "900",
  },
  kpiTag: {
    color: "rgba(45,52,54,0.35)",
    fontSize: 10,
    letterSpacing: 0.7,
    fontWeight: "800",
  },
  kpiLabel: {
    marginTop: 10,
    color: "rgba(45,52,54,0.78)",
    fontSize: 13,
    fontWeight: "700",
  },
  kpiValue: {
    marginTop: 4,
    color: staffTheme.colors.text,
    fontSize: 42,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  kpiValueSkeleton: {
    marginTop: 6,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3ECE3",
  },
  kpiSubtext: {
    marginTop: 6,
    color: "rgba(45,52,54,0.5)",
    fontSize: 11,
    fontWeight: "600",
  },
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EBDCCB",
    backgroundColor: "#FFFCF8",
    paddingHorizontal: 14,
    paddingVertical: 15,
    gap: 12,
    ...staffTheme.shadow.card,
  },
  infoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  infoHeaderTextCol: {
    flex: 1,
  },
  infoTitle: {
    color: "#2D3436",
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
  },
  infoDescription: {
    marginTop: 2,
    color: "rgba(45,52,54,0.55)",
    fontSize: 12,
  },
  filterPill: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(217,120,83,0.45)",
    backgroundColor: "#FFFCF8",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexDirection: "row",
    gap: 6,
  },
  filterText: {
    color: "#5D4C3F",
    fontSize: 11,
    fontWeight: "700",
  },
  filterChevron: {
    color: "#D97853",
    fontSize: 9,
    fontWeight: "900",
  },
  filterWrap: {
    position: "relative",
    zIndex: 10,
  },
  filterMenu: {
    position: "absolute",
    right: 0,
    top: 38,
    minWidth: 132,
    borderWidth: 1,
    borderColor: "#E7C5AE",
    borderRadius: 12,
    backgroundColor: "#FFFDFB",
    padding: 4,
    shadowColor: "#6E4328",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  filterItem: {
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  filterItemActive: {
    backgroundColor: "#D97853",
  },
  filterItemText: {
    color: "#5D4C3F",
    fontSize: 12,
    fontWeight: "700",
  },
  filterItemTextActive: {
    color: "#FFFFFF",
  },
  chartLoading: {
    minHeight: 238,
    borderRadius: 16,
    backgroundColor: "#F8F1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  chartEmpty: {
    minHeight: 238,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D9C8B5",
    backgroundColor: "#FDF7F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  chartEmptyText: {
    color: "#8A7A6E",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  chartArea: {
    position: "relative",
    minHeight: 246,
    borderRadius: 16,
    backgroundColor: "#FFF8F2",
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 9,
    overflow: "hidden",
  },
  chartGuide: {
    position: "absolute",
    left: 10,
    right: 10,
    borderTopWidth: 1,
    borderColor: "rgba(171, 140, 107, 0.24)",
    borderStyle: "dashed",
  },
  barRow: {
    minHeight: 196,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    zIndex: 2,
  },
  barGroup: {
    width: "13.3%",
    alignItems: "center",
    gap: 8,
  },
  bar: {
    width: 24,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: "#D97853",
  },
  barLabel: {
    color: "#9D8D7F",
    fontSize: 9,
    fontWeight: "600",
  },
  viewAllButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(217,120,83,0.3)",
    backgroundColor: "#FFF7F2",
    paddingHorizontal: 10,
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  viewAllText: {
    color: "#D97853",
    fontSize: 10,
    fontWeight: "800",
  },
  scheduleLoading: {
    minHeight: 180,
    borderRadius: 16,
    backgroundColor: "#F8F1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleEmpty: {
    minHeight: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#DFD0C0",
    backgroundColor: "#FDFBF7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  scheduleEmptyText: {
    color: "rgba(45,52,54,0.55)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  scheduleList: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EFE2D5",
    backgroundColor: "#FFFCF8",
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(45,52,54,0.06)",
  },
  scheduleLeft: {
    width: 62,
  },
  timeBadge: {
    minHeight: 27,
    borderRadius: 10,
    backgroundColor: "#FFF1E8",
    borderWidth: 1,
    borderColor: "#F3DCC8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  timeText: {
    color: "#A25D31",
    fontSize: 11,
    fontWeight: "800",
  },
  scheduleMiddle: {
    flex: 1,
    gap: 1,
  },
  scheduleName: {
    color: "#2D3436",
    fontSize: 13,
    fontWeight: "700",
  },
  scheduleMeta: {
    color: "rgba(45,52,54,0.64)",
    fontSize: 11,
    fontWeight: "600",
  },
  scheduleService: {
    color: "rgba(45,52,54,0.74)",
    fontSize: 11,
    marginTop: 1,
  },
  scheduleRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
});