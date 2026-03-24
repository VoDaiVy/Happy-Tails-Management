import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { getAdminTransactionSummary, getAdminTransactions } from "../../api/modules/adminApi";
import type { AdminStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AdminStackParamList, "AdminTransactions">;

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
  if (value === "all") return "All";
  if (value === "payment") return "Payment";
  if (value === "deposit") return "Deposit";
  if (value === "refund") return "Refund";
  if (value === "pending") return "Pending";
  if (value === "completed") return "Completed";
  if (value === "failed") return "Failed";
  if (value === "cancelled") return "Cancelled";
  return value.charAt(0).toUpperCase() + value.slice(1);
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

export function AdminTransactionsScreen({ navigation }: Props) {
  const dateFilterAnchorRef = useRef<View>(null);
  const statusFilterAnchorRef = useRef<View>(null);
  const typeFilterAnchorRef = useRef<View>(null);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [stats, setStats] = useState<SummaryStats>({ total: 0, pending: 0, completed: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [openFilterMenu, setOpenFilterMenu] = useState<"status" | "type" | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterPickerVisible, setFilterPickerVisible] = useState(false);
  const [filterCalendarMonth, setFilterCalendarMonth] = useState(new Date());
  const [filterMenuFrame, setFilterMenuFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [filterAnchorFrame, setFilterAnchorFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalTransactions, setTotalTransactions] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadTransactions = useCallback(async (options?: { isRefresh?: boolean; nextPage?: number }) => {
    const isRefresh = Boolean(options?.isRefresh);
    const nextPage = options?.nextPage || 1;

    if (isRefresh) {
      setRefreshing(true);
    } else if (nextPage !== 1) {
      setPaging(true);
    } else {
      setLoading(true);
    }

    setError("");
    setMessage("");
    setOpenFilterMenu(null);
    try {
      const dateValue = selectedDate ? formatDateYmd(selectedDate) : undefined;
      const response = await getAdminTransactions({
        page: nextPage,
        limit: 6,
        sortBy: "createdAt",
        sortOrder: "desc",
        status: statusFilter === "all" ? undefined : statusFilter,
        type: typeFilter === "all" ? undefined : typeFilter,
        search: search || undefined,
        from: dateValue,
        to: dateValue,
      });

      const summary = await getAdminTransactionSummary({ from: dateValue, to: dateValue });

      const mapped = (response.transactions || []).map((item, index) => toTransactionRow(item, index));
      setRows(mapped);

      const pagination = response.pagination;
      setPage(Number(pagination?.page || nextPage));
      setTotalPages(Math.max(1, Number(pagination?.totalPages || 1)));
      setHasNextPage(Boolean(pagination?.hasNextPage));
      setTotalTransactions(typeof pagination?.total === "number" ? pagination.total : null);

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

      if (!mapped.length && nextPage > 1) {
        setMessage("No data on this page.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load transactions");
    } finally {
      setLoading(false);
      setPaging(false);
      setRefreshing(false);
    }
  }, [search, selectedDate, statusFilter, typeFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const visibleRows = useMemo(() => {
    if (!search) return rows;
    // Fallback local search for compatibility when backend doesn't support search query.
    return rows.filter((row) => {
      const haystack = `${row.transactionCode || ""} ${row.userName || ""} ${row.userEmail || ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [rows, search]);

  const calendarCells = useMemo(() => getCalendarCells(filterCalendarMonth), [filterCalendarMonth]);
  const useBottomSheetPicker = viewportHeight < 500 || !filterAnchorFrame;

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

  const toggleFilterMenu = useCallback(
    (menu: "status" | "type") => {
      if (openFilterMenu === menu) {
        setOpenFilterMenu(null);
        return;
      }

      setFilterPickerVisible(false);
      const anchorRef = menu === "status" ? statusFilterAnchorRef : typeFilterAnchorRef;

      anchorRef.current?.measureInWindow((x, y, width, height) => {
        setFilterMenuFrame({ x, y, width, height });
        setOpenFilterMenu(menu);
      });
    },
    [openFilterMenu],
  );

  const jumpCalendarMonth = useCallback((offset: number) => {
    setFilterCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const selectFilterDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setFilterPickerVisible(false);
  }, []);

  const calendarPopoverMetrics = useMemo(() => {
    const baseWidth = 258;

    if (!filterAnchorFrame) {
      return {
        width: baseWidth,
        left: 16,
        top: 88,
      };
    }

    const width = Math.max(252, Math.min(272, Math.floor(filterAnchorFrame.width + 20)));
    const left = Math.max(12, Math.min(filterAnchorFrame.x, viewportWidth - width - 12));
    const belowTop = filterAnchorFrame.y + filterAnchorFrame.height + 6;
    const estimatedHeight = 314;
    const top = belowTop + estimatedHeight < viewportHeight - 16
      ? belowTop
      : Math.max(72, filterAnchorFrame.y - estimatedHeight - 8);

    return { width, left, top };
  }, [filterAnchorFrame, viewportHeight, viewportWidth]);

  const dropdownPopoverMetrics = useMemo(() => {
    const baseWidth = 156;
    const itemCount = openFilterMenu === "status" ? STATUS_FILTERS.length : TYPE_FILTERS.length;

    if (!filterMenuFrame) {
      return {
        width: baseWidth,
        left: 16,
        top: 120,
        estimatedHeight: itemCount * 44 + 12,
      };
    }

    const width = Math.max(146, Math.min(220, Math.floor(filterMenuFrame.width)));
    const estimatedHeight = itemCount * 44 + 12;
    const left = Math.max(10, Math.min(filterMenuFrame.x, viewportWidth - width - 10));
    const belowTop = filterMenuFrame.y + filterMenuFrame.height + 6;
    const top = belowTop + estimatedHeight < viewportHeight - 12
      ? belowTop
      : Math.max(70, filterMenuFrame.y - estimatedHeight - 8);

    return { width, left, top, estimatedHeight };
  }, [filterMenuFrame, openFilterMenu, viewportHeight, viewportWidth]);

  const useBottomSheetDropdown = viewportHeight < 600 || !filterMenuFrame;

  const summaryText = useMemo(() => {
    if (totalTransactions === null) return `${rows.length} transactions`;
    return `${totalTransactions} transactions`;
  }, [rows.length, totalTransactions]);

  const getVisiblePages = useCallback(() => {
    const visible = new Set<number>();
    visible.add(1);
    visible.add(totalPages);
    if (page > 1) visible.add(page - 1);
    visible.add(page);
    if (page < totalPages) visible.add(page + 1);
    return Array.from(visible).sort((a, b) => a - b);
  }, [page, totalPages]);

  const onChangePage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage > totalPages || nextPage === page || paging) return;
      loadTransactions({ nextPage });
    },
    [loadTransactions, page, paging, totalPages],
  );

  const onRetry = useCallback(() => {
    loadTransactions({ nextPage: 1 });
  }, [loadTransactions]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D6824B" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <>
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={visibleRows}
      keyExtractor={(item, index) => item._id || String(index)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTransactions({ isRefresh: true, nextPage: 1 })} tintColor="#D6824B" />}
      onScrollBeginDrag={() => {
        setOpenFilterMenu(null);
        setFilterPickerVisible(false);
      }}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Transaction Management</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={onRetry}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {message ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{message}</Text>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <StatCard label="Total Transactions" value={stats.total.toLocaleString()} accent="#3366CC" />
            <StatCard label="Pending" value={stats.pending.toLocaleString()} accent="#C08A00" />
            <StatCard label="Completed" value={stats.completed.toLocaleString()} accent="#2F7C41" />
            <StatCard label="Total Amount" value={`${Math.round(stats.totalAmount).toLocaleString()} đ`} accent="#C8693A" />
          </View>

          <View style={styles.searchShell}>
            <Feather name="search" size={17} color="#9F8A75" />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search by tx code, name or email"
              placeholderTextColor="#B39E88"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.filterRow}>
            <View ref={statusFilterAnchorRef} collapsable={false} style={styles.filterControlWrap}>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => toggleFilterMenu("status")}
              >
                <Text style={styles.dropdownLabel}>Status</Text>
                <View style={styles.dropdownValueRow}>
                  <Text style={styles.dropdownValue}>{labelize(statusFilter)}</Text>
                  <Feather name={openFilterMenu === "status" ? "chevron-up" : "chevron-down"} size={14} color="#9D5F3A" />
                </View>
              </Pressable>
            </View>

            <View ref={typeFilterAnchorRef} collapsable={false} style={styles.filterControlWrap}>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => toggleFilterMenu("type")}
              >
                <Text style={styles.dropdownLabel}>Type</Text>
                <View style={styles.dropdownValueRow}>
                  <Text style={styles.dropdownValue}>{typeFilter === "all" ? "All Types" : labelize(typeFilter)}</Text>
                  <Feather name={openFilterMenu === "type" ? "chevron-up" : "chevron-down"} size={14} color="#9D5F3A" />
                </View>
              </Pressable>
            </View>

            <View ref={dateFilterAnchorRef} collapsable={false} style={styles.dateAnchorWrap}>
              <Pressable style={[styles.dateButton, selectedDate && styles.dateButtonActive]} onPress={() => (filterPickerVisible ? closeFilterPicker() : openFilterPicker())}>
                <Feather name="calendar" size={14} color={selectedDate ? "#C16A36" : "#98A4B4"} />
                <Text style={[styles.dateButtonText, selectedDate && styles.dateButtonTextActive]}>
                  {selectedDate ? formatDisplayDate(selectedDate) : "Date"}
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
      renderItem={({ item, index }) => (
        <Pressable
          style={({ pressed }) => [
            styles.txRow,
            index === 0 && styles.txRowFirst,
            pressed && styles.txRowPressed,
          ]}
          disabled={!item._id}
          onPress={() => {
            if (!item._id) return;
            navigation.navigate("AdminTransactionDetail", { transactionId: item._id });
          }}
        >
          <View style={styles.txTop}>
            <Text style={styles.code} numberOfLines={1}>{item.transactionCode || item._id || "-"}</Text>
            <Text style={styles.amount}>{Number(item.amount || 0).toLocaleString()} đ</Text>
          </View>

          <Text style={styles.userName}>{item.userName || "Unknown"}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{item.userEmail || "No email"}</Text>

          <View style={styles.txBottomRow}>
            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: getTypeStyle(item.type || "").bg }]}>
                <Text style={[styles.badgeText, { color: getTypeStyle(item.type || "").text }]}>{labelize(item.type || "unknown")}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusStyle(item.status || "").bg }]}>
                <Text style={[styles.badgeText, { color: getStatusStyle(item.status || "").text }]}>{labelize(item.status || "pending")}</Text>
              </View>
            </View>

            <View style={styles.metaRightCol}>
              <Text style={styles.metaText}>Method: {item.method || "system"}</Text>
              <Text style={styles.metaText}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</Text>
            </View>
          </View>

          <View style={styles.viewDetailRow}>
            <Text style={styles.viewDetailText}>{item._id ? "View details" : "Missing transaction ID"}</Text>
            {item._id ? <Feather name="arrow-right" size={12} color="#B56B3D" /> : null}
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Feather name="credit-card" size={18} color="#B68D6E" />
          </View>
          <Text style={styles.emptyTitle}>No transactions found</Text>
          <Text style={styles.emptyText}>Try changing search keywords or filter settings.</Text>
          <Pressable style={styles.emptyRetryButton} onPress={onRetry}>
            <Text style={styles.emptyRetryText}>Reload</Text>
          </Pressable>
        </View>
      }
      ListFooterComponent={
        visibleRows.length > 0 ? (
          <View style={styles.paginationWrap}>
            <View style={styles.paginationInner}>
              <Pressable
                style={[styles.pageNavButton, (page <= 1 || paging) && styles.pageNavButtonDisabled]}
                disabled={page <= 1 || paging}
                onPress={() => onChangePage(page - 1)}
              >
                <Feather name="chevron-left" size={14} color={page <= 1 || paging ? "#CBB6A3" : "#A45E37"} />
              </Pressable>

              {getVisiblePages().map((pageNumber, index, arr) => {
                const prev = arr[index - 1];
                const showGap = typeof prev === "number" && pageNumber - prev > 1;
                return (
                  <View key={pageNumber} style={styles.pageNumberGroup}>
                    {showGap ? <Text style={styles.pageEllipsis}>...</Text> : null}
                    <Pressable
                      style={[styles.pageNumberButton, pageNumber === page && styles.pageNumberButtonActive]}
                      disabled={paging}
                      onPress={() => onChangePage(pageNumber)}
                    >
                      <Text style={[styles.pageNumberText, pageNumber === page && styles.pageNumberTextActive]}>{pageNumber}</Text>
                    </Pressable>
                  </View>
                );
              })}

              <Pressable
                style={[styles.pageNavButton, (!hasNextPage || paging) && styles.pageNavButtonDisabled]}
                disabled={!hasNextPage || paging}
                onPress={() => onChangePage(page + 1)}
              >
                <Feather name="chevron-right" size={14} color={!hasNextPage || paging ? "#CBB6A3" : "#A45E37"} />
              </Pressable>
            </View>

            {paging ? <ActivityIndicator size="small" color="#D6824B" /> : null}
          </View>
        ) : null
      }
    />

    <Modal visible={Boolean(openFilterMenu)} transparent animationType="fade" onRequestClose={() => setOpenFilterMenu(null)}>
      <View style={styles.dropdownOverlayLayer}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpenFilterMenu(null)} />

        <View
          style={[
            styles.dropdownPortalMenu,
            useBottomSheetDropdown
              ? styles.dropdownPortalSheet
              : {
                  width: dropdownPopoverMetrics.width,
                  left: dropdownPopoverMetrics.left,
                  top: dropdownPopoverMetrics.top,
                },
          ]}
        >
          {(openFilterMenu === "status" ? STATUS_FILTERS : TYPE_FILTERS).map((option) => {
            const active = openFilterMenu === "status" ? statusFilter === option : typeFilter === option;
            const optionLabel = openFilterMenu === "status"
              ? labelize(option)
              : option === "all"
                ? "All Types"
                : labelize(option);

            return (
              <Pressable
                key={option}
                style={({ pressed }) => [
                  styles.dropdownPortalItem,
                  active && styles.dropdownPortalItemActive,
                  pressed && styles.dropdownPortalItemPressed,
                ]}
                onPress={() => {
                  if (openFilterMenu === "status") {
                    setStatusFilter(option as StatusFilter);
                  } else {
                    setTypeFilter(option as TypeFilter);
                  }
                  setOpenFilterMenu(null);
                }}
              >
                <Text style={[styles.dropdownPortalItemText, active && styles.dropdownPortalItemTextActive]}>{optionLabel}</Text>
                {active ? <Feather name="check" size={14} color="#C36B3A" /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>

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
              {filterCalendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
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
  container: { flex: 1, backgroundColor: "#FBF7F1" },
  content: { padding: 14, paddingBottom: 26 },
  headerWrap: { gap: 10, marginBottom: 6, zIndex: 50 },
  title: { color: "#1F2E40", fontSize: 28, lineHeight: 34, fontWeight: "900" },
  subtitle: { color: "#7A6A5A", fontSize: 13, lineHeight: 18, marginTop: 2 },
  counterText: { color: "#A17D62", fontSize: 12, fontWeight: "700", marginTop: 2 },
  loadingText: { color: "#8E7865", marginTop: 10, fontSize: 13, fontWeight: "600" },
  errorBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0C9CE",
    backgroundColor: "#FFF2F4",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  errorText: { color: "#B44556", fontSize: 12, flex: 1 },
  retryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8AAB4",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  retryButtonText: { color: "#A93F50", fontSize: 11, fontWeight: "800" },
  successBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7EAD8",
    backgroundColor: "#EFFAF1",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  successText: { color: "#2E7A45", fontSize: 12, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  statCard: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E8D8C8",
    backgroundColor: "#FFFDF9",
    width: "48.6%",
    minHeight: 64,
    paddingHorizontal: 9,
    paddingVertical: 7,
    justifyContent: "center",
    gap: 2,
  },
  statLabel: { color: "#8D7965", fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  statValue: { fontSize: 22, lineHeight: 25, fontWeight: "900" },
  searchShell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7D8C9",
    backgroundColor: "#FFFDFC",
    paddingHorizontal: 11,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  searchInput: {
    flex: 1,
    color: "#2B3440",
    fontSize: 13,
    paddingVertical: 0,
  },
  filterRow: { zIndex: 80, flexDirection: "row", gap: 6 },
  filterControlWrap: { flex: 1, position: "relative", zIndex: 100 },
  dropdownTrigger: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E8D3BF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    height: 38,
    justifyContent: "center",
  },
  dropdownLabel: {
    color: "#B38465",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 11,
  },
  dropdownValueRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dropdownValue: {
    color: "#5F4B3A",
    fontSize: 12,
    fontWeight: "700",
  },
  dropdownOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25, 37, 52, 0.06)",
  },
  dropdownPortalMenu: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9D8C8",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    position: "absolute",
    zIndex: 800,
    elevation: 20,
    shadowColor: "#2F1E0E",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    paddingVertical: 3,
  },
  dropdownPortalSheet: {
    left: 18,
    right: 18,
    bottom: 14,
    position: "absolute",
  },
  dropdownPortalItem: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dropdownPortalItemActive: { backgroundColor: "#FFF2E8" },
  dropdownPortalItemPressed: { backgroundColor: "#FCEEE2" },
  dropdownPortalItemText: { color: "#5D4D40", fontSize: 12, fontWeight: "700" },
  dropdownPortalItemTextActive: { color: "#C8693A" },
  dateAnchorWrap: { flex: 0.98 },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E8D3BF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    height: 38,
  },
  dateButtonActive: {
    borderColor: "#E5C9B1",
    backgroundColor: "#FFF6EE",
  },
  dateButtonText: {
    flex: 1,
    color: "#7C6958",
    fontSize: 10,
    fontWeight: "700",
  },
  dateButtonTextActive: {
    color: "#C16A36",
    fontWeight: "700",
  },
  clearDateBtn: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  clearDateText: { color: "#C8693A", fontSize: 11, fontWeight: "700" },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25, 37, 52, 0.22)",
  },
  calendarPopover: {
    borderRadius: 14,
    backgroundColor: "#FFFCF8",
    borderWidth: 1,
    borderColor: "#EADBCD",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 7,
    position: "absolute",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 10,
  },
  calendarSheet: {
    left: 20,
    right: 20,
    bottom: 14,
    position: "absolute",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  calendarArrowBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7EFE6",
  },
  calendarMonthLabel: {
    color: "#2F3F51",
    fontSize: 16,
    fontWeight: "800",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 1,
  },
  weekLabel: {
    width: 32,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    color: "#8F9AA7",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 4,
    columnGap: 0,
    paddingHorizontal: 1,
  },
  dayCell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F1E9",
  },
  dayCellSelected: {
    backgroundColor: "#DF8648",
  },
  dayCellOutside: {
    backgroundColor: "#F4EFE9",
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: "#E4B894",
  },
  dayCellText: {
    color: "#3E4F62",
    fontSize: 11,
    fontWeight: "800",
  },
  dayCellTextOutside: {
    color: "#B8BFC8",
  },
  dayCellTextSelected: {
    color: "#FFFFFF",
  },
  calendarFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 2,
  },
  calendarFooterBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "#F3EAE1",
  },
  calendarFooterBtnText: {
    color: "#A1643A",
    fontSize: 11,
    fontWeight: "700",
  },
  txRow: {
    paddingHorizontal: 2,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EFE2D6",
    borderRadius: 12,
  },
  txRowPressed: {
    backgroundColor: "#FFF5EC",
  },
  txRowFirst: {
    marginTop: 2,
  },
  txTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  code: { color: "#22364B", fontSize: 13, fontWeight: "800", flex: 1 },
  amount: { color: "#A95A2F", fontWeight: "900", fontSize: 14 },
  userName: { color: "#1F3347", fontSize: 14, fontWeight: "800", marginTop: 4 },
  userEmail: { color: "#7B6D5F", fontSize: 11, marginTop: 1 },
  txBottomRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  badgesRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: "800" },
  metaRightCol: {
    alignItems: "flex-end",
    gap: 1,
  },
  metaText: { color: "#6D7D8E", fontSize: 10.5 },
  viewDetailRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  viewDetailText: {
    color: "#B56B3D",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyWrap: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EADFD3",
    backgroundColor: "#FFFEFC",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6EBDD",
  },
  emptyTitle: {
    marginTop: 10,
    color: "#40392F",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    color: "#7E7063",
    textAlign: "center",
    marginTop: 6,
    fontSize: 13,
  },
  emptyRetryButton: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DFC7B2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  emptyRetryText: {
    color: "#A15F3A",
    fontSize: 12,
    fontWeight: "800",
  },
  paginationWrap: {
    marginTop: 12,
    alignItems: "center",
    gap: 6,
    paddingBottom: 8,
  },
  paginationInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageNumberGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageEllipsis: {
    color: "#AF9885",
    fontSize: 11,
    fontWeight: "700",
  },
  pageNavButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E5D1BE",
    backgroundColor: "#FFF8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  pageNavButtonDisabled: {
    backgroundColor: "#F6EFE8",
    borderColor: "#EBDDD1",
  },
  pageNumberButton: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5D1BE",
    backgroundColor: "#FFFDF8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  pageNumberButtonActive: {
    backgroundColor: "#DA7C46",
    borderColor: "#DA7C46",
  },
  pageNumberText: {
    color: "#91684C",
    fontSize: 11,
    fontWeight: "800",
  },
  pageNumberTextActive: {
    color: "#FFFFFF",
  },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FCF8F2" },
});
