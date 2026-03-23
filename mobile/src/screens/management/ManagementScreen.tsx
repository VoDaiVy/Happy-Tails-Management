import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getAllBookings } from "../../api/modules/bookingApi";
import { useAuth } from "../../context/AuthContext";
import type { Booking } from "../../types/booking";
import { isStaffOrAdminRole } from "../../utils/role";

type RangeKey = "7d" | "14d";

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getStatusIcon(status: string): { name: React.ComponentProps<typeof Feather>["name"]; color: string } {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "completed") {
    return { name: "check-circle", color: "#1F8A4D" };
  }

  if (normalized === "in-progress") {
    return { name: "loader", color: "#D77E41" };
  }

  if (normalized === "confirmed") {
    return { name: "check-square", color: "#2E6CA7" };
  }

  return { name: "clock", color: "#B47A2F" };
}

function extractCustomerName(booking: Booking) {
  const source = booking as Booking & {
    customer?: { name?: string };
    user?: { name?: string };
    guestInfo?: { name?: string };
  };

  return source.customer?.name || source.user?.name || source.guestInfo?.name || "Guest";
}

function extractPetName(booking: Booking) {
  const firstItem = booking.items?.[0];
  const pet = firstItem?.pet;
  if (typeof pet === "string") return "Pet";
  if (pet && typeof pet === "object") return pet.petName || "Pet";
  return "Pet";
}

function extractServiceName(booking: Booking) {
  const firstItem = booking.items?.[0];
  const service = firstItem?.service;
  if (typeof service === "string") return "Service";
  if (service && typeof service === "object") return service.name || "Service";
  return "Service";
}

function formatTimeLabel(raw?: string) {
  if (!raw) return "--:--";
  if (/^\d{1,2}:\d{2}/.test(raw)) return raw;

  const asDate = new Date(raw);
  if (Number.isNaN(asDate.getTime())) return "--:--";

  return asDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildDays(range: RangeKey) {
  const total = range === "14d" ? 14 : 7;
  const result: Array<{ key: string; label: string }> = [];

  for (let i = total - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      key: toDateKey(d),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
    });
  }

  return result;
}

export function ManagementScreen() {
  const { user } = useAuth();
  const canAccess = isStaffOrAdminRole(user?.role);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [range, setRange] = useState<RangeKey>("7d");
  const [showRangeMenu, setShowRangeMenu] = useState(false);

  const pendingBookings = useMemo(() => bookings.filter((item) => item.status === "pending").length, [bookings]);
  const completedBookings = useMemo(() => bookings.filter((item) => item.status === "completed").length, [bookings]);

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const todayBookings = useMemo(
    () => bookings.filter((item) => String(item.bookingDate || "").slice(0, 10) === todayKey),
    [bookings, todayKey],
  );

  const daySeries = useMemo(() => buildDays(range), [range]);

  const bookingsByDay = useMemo(() => {
    return daySeries.map((day) => {
      const count = bookings.filter((item) => String(item.bookingDate || "").slice(0, 10) === day.key).length;
      return { ...day, count };
    });
  }, [bookings, daySeries]);

  const maxDailyCount = useMemo(() => Math.max(1, ...bookingsByDay.map((item) => item.count)), [bookingsByDay]);

  const avgDailyCount = useMemo(() => {
    if (!bookingsByDay.length) return 0;
    return Math.round((bookingsByDay.reduce((sum, item) => sum + item.count, 0) / bookingsByDay.length) * 10) / 10;
  }, [bookingsByDay]);

  const todaysSchedule = useMemo(() => {
    return todayBookings
      .slice()
      .sort((a, b) => String(a.bookingTime || "").localeCompare(String(b.bookingTime || "")))
      .slice(0, 8);
  }, [todayBookings]);

  const loadData = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    setError("");

    try {
      const bookingData = await getAllBookings();
      setBookings(bookingData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canAccess]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (!canAccess) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>This page is only available for staff/admin.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D6824B" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={[]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D6824B" />}
      renderItem={null}
      ListHeaderComponent={
        <View style={styles.rootBlock}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Overview</Text>
            <Text style={styles.subtitle}>
              Monitor booking flow and daily operations at a glance to keep staff execution on schedule.
            </Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.kpiLargeCard}>
            <View>
              <Text style={styles.kpiLabel}>Total Bookings</Text>
              <Text style={styles.kpiLargeValue}>{bookings.length}</Text>
            </View>
            <View style={styles.kpiIconWrap}>
              <Feather name="clipboard" size={18} color="#C56733" />
            </View>
          </View>

          <View style={styles.kpiSmallGrid}>
            <View style={styles.kpiSmallCard}>
              <Text style={styles.kpiLabel}>Today's Bookings</Text>
              <Text style={styles.kpiSmallValue}>{todayBookings.length}</Text>
              <Feather name="sun" size={14} color="#D68A51" />
            </View>

            <View style={styles.kpiSmallCard}>
              <Text style={styles.kpiLabel}>Pending Bookings</Text>
              <Text style={styles.kpiSmallValue}>{pendingBookings}</Text>
              <Feather name="clock" size={14} color="#BB7F35" />
            </View>

            <View style={styles.kpiSmallCard}>
              <Text style={styles.kpiLabel}>Completed Bookings</Text>
              <Text style={styles.kpiSmallValue}>{completedBookings}</Text>
              <Feather name="check-circle" size={14} color="#2B8B54" />
            </View>
          </View>

          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.sectionTitle}>Bookings by Day</Text>
                <Text style={styles.sectionSubtitle}>Daily booking trend and workload distribution.</Text>
              </View>

              <View style={styles.filterWrap}>
                <Pressable style={styles.filterBtn} onPress={() => setShowRangeMenu((prev) => !prev)}>
                  <Text style={styles.filterBtnText}>{range === "7d" ? "Last 7 Days" : "Last 14 Days"}</Text>
                  <Feather name="chevron-down" size={14} color="#8A745F" />
                </Pressable>

                {showRangeMenu ? (
                  <View style={styles.filterMenu}>
                    <Pressable
                      style={[styles.filterOption, range === "7d" && styles.filterOptionActive]}
                      onPress={() => {
                        setRange("7d");
                        setShowRangeMenu(false);
                      }}
                    >
                      <Text style={[styles.filterOptionText, range === "7d" && styles.filterOptionTextActive]}>Last 7 Days</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.filterOption, range === "14d" && styles.filterOptionActive]}
                      onPress={() => {
                        setRange("14d");
                        setShowRangeMenu(false);
                      }}
                    >
                      <Text style={[styles.filterOptionText, range === "14d" && styles.filterOptionTextActive]}>Last 14 Days</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Bookings</Text>
            </View>

            <View style={styles.chartArea}>
              {bookingsByDay.map((point) => {
                const height = Math.max(16, Math.round((point.count / maxDailyCount) * 142));

                return (
                  <View key={point.key} style={styles.barCol}>
                    <View style={[styles.barBase, { height }]}>
                      <View style={styles.barTopTint} />
                    </View>
                    <Text style={styles.barLabel}>{point.label}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.insightText}>Average {avgDailyCount} bookings per day in selected range.</Text>
          </View>

          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>

            <View style={styles.tableHead}>
              <Text style={[styles.headCell, styles.timeCol]}>Time</Text>
              <Text style={[styles.headCell, styles.customerCol]}>Customer</Text>
              <Text style={[styles.headCell, styles.petCol]}>Pet</Text>
              <Text style={[styles.headCell, styles.serviceCol]}>Service</Text>
              <Text style={[styles.headCell, styles.statusCol]}>Status</Text>
            </View>

            {todaysSchedule.length === 0 ? (
              <Text style={styles.emptyText}>No bookings scheduled for today.</Text>
            ) : (
              todaysSchedule.map((item) => {
                const icon = getStatusIcon(item.status);

                return (
                  <View key={item._id} style={styles.tableRow}>
                    <Text style={[styles.rowCell, styles.timeCol]}>{formatTimeLabel(item.bookingTime)}</Text>
                    <Text style={[styles.rowCell, styles.customerCol]} numberOfLines={1}>
                      {extractCustomerName(item)}
                    </Text>
                    <Text style={[styles.rowCell, styles.petCol]} numberOfLines={1}>
                      {extractPetName(item)}
                    </Text>
                    <Text style={[styles.rowCell, styles.serviceCol]} numberOfLines={1}>
                      {extractServiceName(item)}
                    </Text>
                    <View style={[styles.statusCol, styles.statusCellWrap]}>
                      <Feather name={icon.name} size={16} color={icon.color} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      }
      ListEmptyComponent={null}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF8F2",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FCF8F2",
  },
  rootBlock: {
    gap: 14,
  },
  titleWrap: {
    gap: 6,
  },
  title: {
    color: "#23364B",
    fontSize: 23,
    fontWeight: "800",
  },
  subtitle: {
    color: "#6E7D8E",
    fontSize: 13,
    lineHeight: 19,
  },
  errorText: {
    color: "#B42318",
    fontWeight: "600",
    marginTop: 2,
  },
  kpiLargeCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F0DECC",
    backgroundColor: "#FFF7EC",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    shadowColor: "#5A4330",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCE8D5",
  },
  kpiLabel: {
    color: "#8B705C",
    fontSize: 12,
    fontWeight: "700",
  },
  kpiLargeValue: {
    marginTop: 4,
    color: "#1E334A",
    fontSize: 35,
    lineHeight: 40,
    fontWeight: "900",
  },
  kpiSmallGrid: {
    flexDirection: "row",
    gap: 10,
  },
  kpiSmallCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEDFD0",
    backgroundColor: "#FFFCF7",
    paddingHorizontal: 11,
    paddingVertical: 11,
    gap: 4,
  },
  kpiSmallValue: {
    color: "#1F344B",
    fontSize: 23,
    lineHeight: 27,
    fontWeight: "800",
  },
  chartSection: {
    marginTop: 4,
    paddingTop: 2,
    gap: 10,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  sectionTitle: {
    color: "#23364B",
    fontSize: 17,
    fontWeight: "800",
  },
  sectionSubtitle: {
    marginTop: 2,
    color: "#78879A",
    fontSize: 12,
  },
  filterWrap: {
    position: "relative",
    zIndex: 20,
  },
  filterBtn: {
    minWidth: 118,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#EED9C4",
    backgroundColor: "#FFF8F0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  filterBtnText: {
    color: "#8A745F",
    fontSize: 12,
    fontWeight: "700",
  },
  filterMenu: {
    position: "absolute",
    top: 42,
    right: 0,
    width: 132,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EFDCCB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#4B3B2D",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  filterOption: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  filterOptionActive: {
    backgroundColor: "#FFF4E8",
  },
  filterOptionText: {
    color: "#617288",
    fontSize: 12,
    fontWeight: "600",
  },
  filterOptionTextActive: {
    color: "#B46533",
    fontWeight: "800",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DE8750",
  },
  legendText: {
    color: "#6E7D8F",
    fontSize: 12,
    fontWeight: "700",
  },
  chartArea: {
    minHeight: 172,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EFE5D8",
    paddingBottom: 8,
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barBase: {
    width: "85%",
    borderRadius: 10,
    backgroundColor: "#DE8750",
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  barTopTint: {
    height: 18,
    backgroundColor: "#EFB58A",
    opacity: 0.65,
  },
  barLabel: {
    marginTop: 6,
    color: "#7F8EA1",
    fontSize: 10,
  },
  insightText: {
    color: "#708194",
    fontSize: 12,
  },
  scheduleSection: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFE1D2",
    backgroundColor: "#FFFEFB",
    padding: 10,
    gap: 8,
  },
  tableHead: {
    borderRadius: 10,
    backgroundColor: "#FAF1E7",
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  headCell: {
    color: "#887260",
    fontSize: 11,
    fontWeight: "800",
  },
  tableRow: {
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: "#F3EADF",
    paddingHorizontal: 8,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  rowCell: {
    color: "#24384F",
    fontSize: 12,
    fontWeight: "600",
  },
  timeCol: {
    width: "16%",
  },
  customerCol: {
    width: "27%",
  },
  petCol: {
    width: "19%",
  },
  serviceCol: {
    width: "27%",
  },
  statusCol: {
    width: "11%",
    textAlign: "center",
  },
  statusCellWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#7A8A9E",
    fontSize: 13,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
});
