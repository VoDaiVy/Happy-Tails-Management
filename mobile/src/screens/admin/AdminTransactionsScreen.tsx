import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { getAdminTransactionSummary, getAdminTransactions } from "../../api/modules/adminApi";

type TransactionRow = {
  _id?: string;
  transactionCode?: string;
  amount?: number;
  type?: string;
  status?: string;
  createdAt?: string;
  method?: string;
  userName?: string;
  userEmail?: string;
};

type StatusFilter = "all" | "pending" | "completed" | "failed" | "cancelled";
type TypeFilter = "all" | "payment" | "deposit" | "refund";

const STATUS_FILTERS: StatusFilter[] = ["all", "pending", "completed", "failed", "cancelled"];
const TYPE_FILTERS: TypeFilter[] = ["all", "payment", "deposit", "refund"];

type SummaryStats = {
  total: number;
  pending: number;
  completed: number;
  totalAmount: number;
};

function formatDateYmd(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(value: Date) {
  return value.toLocaleDateString("en-GB");
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getCalendarCells(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startWeekDay = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startWeekDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function labelize(value: string) {
  return value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1);
}

function getStatusStyle(status: string) {
  if (status === "completed") return { bg: "#DDF3E2", text: "#2F7C41" };
  if (status === "pending") return { bg: "#FFF3CF", text: "#9A7600" };
  if (status === "failed") return { bg: "#FDECEF", text: "#B24251" };
  if (status === "cancelled") return { bg: "#E9EDF3", text: "#5D6E82" };
  return { bg: "#E9EDF3", text: "#5D6E82" };
}

function getTypeStyle(type: string) {
  if (type === "payment") return { bg: "#EAF2FF", text: "#2E67C3" };
  if (type === "deposit") return { bg: "#E7F5E8", text: "#2F7C41" };
  if (type === "refund") return { bg: "#FFF0E8", text: "#BF6532" };
  return { bg: "#E9EDF3", text: "#5D6E82" };
}

function toTransactionRow(input: Record<string, unknown>, index: number): TransactionRow {
  const userRaw = typeof input.userId === "object" && input.userId ? (input.userId as Record<string, unknown>) : undefined;
  const txCode = input.transactionCode || input.code || input.referenceId;
  return {
    _id: String(input._id || input.id || index),
    transactionCode: txCode ? String(txCode) : undefined,
    amount: Number(input.amount || 0),
    type: String(input.type || "unknown"),
    status: String(input.status || "pending"),
    createdAt: typeof input.createdAt === "string" ? input.createdAt : undefined,
    method: typeof input.method === "string" ? input.method : undefined,
    userName: userRaw ? String(userRaw.fullName || userRaw.name || "Unknown") : "Unknown",
    userEmail: userRaw ? String(userRaw.email || "") : "",
  };
}

export function AdminTransactionsScreen() {
  const dateFilterAnchorRef = useRef<View>(null);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [stats, setStats] = useState<SummaryStats>({ total: 0, pending: 0, completed: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [openFilterMenu, setOpenFilterMenu] = useState<"status" | "type" | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterPickerVisible, setFilterPickerVisible] = useState(false);
  const [filterCalendarMonth, setFilterCalendarMonth] = useState(new Date());
  const [filterAnchorFrame, setFilterAnchorFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadTransactions = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    try {
      const dateValue = selectedDate ? formatDateYmd(selectedDate) : undefined;
      const response = await getAdminTransactions({
        page: 1,
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "desc",
        status: statusFilter === "all" ? undefined : statusFilter,
        type: typeFilter === "all" ? undefined : typeFilter,
        from: dateValue,
        to: dateValue,
      });

      const summary = await getAdminTransactionSummary({ from: dateValue, to: dateValue });

      const mapped = (response.transactions || []).map((item, index) => toTransactionRow(item, index));
      setRows(mapped);

      const overall = (summary.overall || {}) as Record<string, unknown>;
      const byStatus = (summary.byStatus || {}) as Record<string, unknown>;
      const pendingRaw = byStatus.pending as Record<string, unknown> | undefined;
      const completedRaw = byStatus.completed as Record<string, unknown> | undefined;

      setStats({
        total: Number(overall.totalTransactions || 0),
        pending: Number(pendingRaw?.count || 0),
        completed: Number(completedRaw?.count || 0),
        totalAmount: Number(completedRaw?.amount || 0),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load transactions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, statusFilter, typeFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    return rows.filter((row) => {
      const haystack = `${row.transactionCode || ""} ${row.userName || ""} ${row.userEmail || ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [rows, search]);

  const calendarCells = useMemo(() => getCalendarCells(filterCalendarMonth), [filterCalendarMonth]);
  const useBottomSheetPicker = viewportHeight < 680 || !filterAnchorFrame;

  const openFilterPicker = useCallback(() => {
    setOpenFilterMenu(null);
    setFilterCalendarMonth(selectedDate || new Date());
    dateFilterAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setFilterAnchorFrame({ x, y, width, height });
      setFilterPickerVisible(true);
    });
  }, [selectedDate]);

  const closeFilterPicker = useCallback(() => {
    setFilterPickerVisible(false);
  }, []);

  const jumpCalendarMonth = useCallback((offset: number) => {
    setFilterCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const selectFilterDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setFilterPickerVisible(false);
  }, []);

  const calendarPopoverMetrics = useMemo(() => {
    const baseWidth = 286;

    if (!filterAnchorFrame) {
      return {
        width: baseWidth,
        left: 16,
        top: 88,
      };
    }

    const width = Math.max(264, Math.min(304, Math.floor(filterAnchorFrame.width + 32)));
    const left = Math.max(12, Math.min(filterAnchorFrame.x, viewportWidth - width - 12));
    const belowTop = filterAnchorFrame.y + filterAnchorFrame.height + 6;
    const estimatedHeight = 322;
    const top = belowTop + estimatedHeight < viewportHeight - 16
      ? belowTop
      : Math.max(82, filterAnchorFrame.y - estimatedHeight - 8);

    return { width, left, top };
  }, [filterAnchorFrame, viewportHeight, viewportWidth]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D6824B" />
      </View>
    );
  }

  return (
    <>
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filteredRows}
      keyExtractor={(item, index) => item._id || String(index)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTransactions(true)} tintColor="#D6824B" />}
      onScrollBeginDrag={() => {
        setOpenFilterMenu(null);
        setFilterPickerVisible(false);
      }}
      ListHeaderComponent={
        <View style={[styles.headerWrap, openFilterMenu ? styles.headerWrapExpanded : null]}>
          <Text style={styles.title}>Transaction Management</Text>
          <Text style={styles.subtitle}>Live data from /admin/transactions</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.statsRow}>
            <StatCard label="Total Transactions" value={stats.total.toLocaleString()} accent="#3366CC" />
            <StatCard label="Pending" value={stats.pending.toLocaleString()} accent="#C08A00" />
            <StatCard label="Completed" value={stats.completed.toLocaleString()} accent="#2F7C41" />
            <StatCard label="Total Amount" value={`${Math.round(stats.totalAmount).toLocaleString()} đ`} accent="#C8693A" />
          </View>

          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by tx code, name or email"
            placeholderTextColor="#9AA8B6"
            style={styles.searchInput}
          />

          <View style={styles.filterRow}>
            <View style={styles.filterControlWrap}>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setOpenFilterMenu((prev) => (prev === "status" ? null : "status"))}
              >
                <Text style={styles.dropdownLabel}>Status</Text>
                <Text style={styles.dropdownValue}>{labelize(statusFilter)}</Text>
              </Pressable>

              {openFilterMenu === "status" ? (
                <View style={styles.dropdownMenu}>
                  {STATUS_FILTERS.map((status) => {
                    const active = statusFilter === status;
                    return (
                      <Pressable
                        key={status}
                        style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                        onPress={() => {
                          setStatusFilter(status);
                          setOpenFilterMenu(null);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>{labelize(status)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.filterControlWrap}>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setOpenFilterMenu((prev) => (prev === "type" ? null : "type"))}
              >
                <Text style={styles.dropdownLabel}>Type</Text>
                <Text style={styles.dropdownValue}>{typeFilter === "all" ? "All Types" : labelize(typeFilter)}</Text>
              </Pressable>

              {openFilterMenu === "type" ? (
                <View style={styles.dropdownMenu}>
                  {TYPE_FILTERS.map((type) => {
                    const active = typeFilter === type;
                    return (
                      <Pressable
                        key={type}
                        style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                        onPress={() => {
                          setTypeFilter(type);
                          setOpenFilterMenu(null);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                          {type === "all" ? "All Types" : labelize(type)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View ref={dateFilterAnchorRef} collapsable={false} style={styles.dateAnchorWrap}>
              <Pressable style={[styles.dateButton, selectedDate && styles.dateButtonActive]} onPress={() => (filterPickerVisible ? closeFilterPicker() : openFilterPicker())}>
                <Feather name="calendar" size={14} color={selectedDate ? "#C16A36" : "#98A4B4"} />
                <Text style={[styles.dateButtonText, selectedDate && styles.dateButtonTextActive]}>
                  {selectedDate ? formatDisplayDate(selectedDate) : "dd/mm/yyyy"}
                </Text>
                <Feather name="chevron-down" size={14} color="#9BA7B7" />
              </Pressable>
            </View>
          </View>

          {selectedDate ? (
            <Pressable style={styles.clearDateBtn} onPress={() => setSelectedDate(null)}>
              <Feather name="x" size={13} color="#A46C46" />
              <Text style={styles.clearDateText}>Clear date filter</Text>
            </Pressable>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.code}>{item.transactionCode || item._id || "-"}</Text>
            <Text style={styles.amount}>{Number(item.amount || 0).toLocaleString()} đ</Text>
          </View>

          <Text style={styles.userName}>{item.userName || "Unknown"}</Text>
          <Text style={styles.meta}>{item.userEmail || ""}</Text>

          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: getTypeStyle(item.type || "").bg }]}>
              <Text style={[styles.badgeText, { color: getTypeStyle(item.type || "").text }]}>{labelize(item.type || "unknown")}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusStyle(item.status || "").bg }]}>
              <Text style={[styles.badgeText, { color: getStatusStyle(item.status || "").text }]}>{labelize(item.status || "pending")}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.meta}>Method: {item.method || "system"}</Text>
            <Text style={styles.meta}>Time: {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No transactions found.</Text>}
    />

    <Modal visible={filterPickerVisible} transparent animationType="fade" onRequestClose={closeFilterPicker}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={closeFilterPicker} />

        <View
          style={[
            styles.calendarPopover,
            useBottomSheetPicker
              ? styles.calendarSheet
              : {
                  width: calendarPopoverMetrics.width,
                  left: calendarPopoverMetrics.left,
                  top: calendarPopoverMetrics.top,
                },
          ]}
        >
          <View style={styles.calendarHeader}>
            <Pressable style={styles.calendarArrowBtn} onPress={() => jumpCalendarMonth(-1)}>
              <Feather name="chevron-left" size={16} color="#49617C" />
            </Pressable>
            <Text style={styles.calendarMonthLabel}>
              {filterCalendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </Text>
            <Pressable style={styles.calendarArrowBtn} onPress={() => jumpCalendarMonth(1)}>
              <Feather name="chevron-right" size={16} color="#49617C" />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => (
              <Text key={label} style={styles.weekLabel}>{label}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) => {
              const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false;
              const isToday = isSameDay(cell.date, new Date());

              return (
                <Pressable
                  key={cell.date.toISOString()}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    !cell.inMonth && styles.dayCellOutside,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => selectFilterDate(cell.date)}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      !cell.inMonth && styles.dayCellTextOutside,
                      isSelected && styles.dayCellTextSelected,
                    ]}
                  >
                    {cell.date.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.calendarFooter}>
            <Pressable style={styles.calendarFooterBtn} onPress={() => selectFilterDate(new Date())}>
              <Text style={styles.calendarFooterBtnText}>Today</Text>
            </Pressable>
            <Pressable style={styles.calendarFooterBtn} onPress={closeFilterPicker}>
              <Text style={styles.calendarFooterBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FCF8F2" },
  content: { padding: 16, paddingBottom: 24, gap: 10 },
  headerWrap: { marginBottom: 10, gap: 8 },
  headerWrapExpanded: { paddingBottom: 120 },
  title: { fontSize: 34, lineHeight: 38, fontWeight: "900", color: "#23364B" },
  subtitle: { color: "#697C90", fontSize: 13 },
  errorText: { color: "#BE3A4A", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EADFD2",
    backgroundColor: "#FFFFFF",
    minWidth: 140,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  statLabel: { color: "#7B8B9C", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  statValue: { fontSize: 27, lineHeight: 30, fontWeight: "900" },
  searchInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7DBCD",
    backgroundColor: "#FFFAF4",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#22364B",
  },
  filterRow: { flexDirection: "row", gap: 8 },
  filterControlWrap: { flex: 1, position: "relative", zIndex: 30 },
  dropdownTrigger: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7DBCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  dropdownLabel: {
    color: "#D27743",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dropdownValue: {
    color: "#2B4056",
    fontSize: 12,
    fontWeight: "700",
  },
  dropdownMenu: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6D8C7",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 40,
    elevation: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  dropdownItem: { paddingHorizontal: 10, paddingVertical: 9 },
  dropdownItemActive: { backgroundColor: "#FFF2E8" },
  dropdownItemText: { color: "#4D6074", fontSize: 12, fontWeight: "600" },
  dropdownItemTextActive: { color: "#C8693A", fontWeight: "700" },
  dateAnchorWrap: { flex: 1 },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7DBCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateButtonActive: {
    borderColor: "#E5C9B1",
    backgroundColor: "#FFF6EE",
  },
  dateButtonText: {
    flex: 1,
    color: "#7F8D9D",
    fontSize: 12,
    fontWeight: "600",
  },
  dateButtonTextActive: {
    color: "#C16A36",
    fontWeight: "700",
  },
  clearDateBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  clearDateText: { color: "#C8693A", fontSize: 12, fontWeight: "700" },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25, 37, 52, 0.22)",
  },
  calendarPopover: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6D6C8",
    padding: 12,
    gap: 10,
    position: "absolute",
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
  },
  calendarSheet: {
    left: 14,
    right: 14,
    bottom: 20,
    position: "absolute",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F7FB",
  },
  calendarMonthLabel: {
    color: "#2A3E56",
    fontSize: 14,
    fontWeight: "800",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  weekLabel: {
    width: 34,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#8A98A9",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  dayCell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDF9F4",
  },
  dayCellSelected: {
    backgroundColor: "#E08A4E",
  },
  dayCellOutside: {
    backgroundColor: "#F5F2EE",
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: "#E2B28E",
  },
  dayCellText: {
    color: "#3E4F62",
    fontSize: 12,
    fontWeight: "700",
  },
  dayCellTextOutside: {
    color: "#AAB3BF",
  },
  dayCellTextSelected: {
    color: "#FFFFFF",
  },
  calendarFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  calendarFooterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F6F1EB",
  },
  calendarFooterBtnText: {
    color: "#A1643A",
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9DDCF",
    backgroundColor: "#FFFFFF",
    padding: 13,
    gap: 6,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  code: { color: "#22364B", fontSize: 13, fontWeight: "800", flex: 1 },
  amount: { color: "#A95A2F", fontWeight: "900", fontSize: 13 },
  userName: { color: "#1F3347", fontSize: 15, fontWeight: "700" },
  badgesRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  meta: { color: "#64788C", fontSize: 12 },
  emptyText: { color: "#6D7D8E", textAlign: "center", paddingVertical: 18 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FCF8F2" },
});
