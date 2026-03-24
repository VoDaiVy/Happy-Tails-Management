import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getAllBookings } from "../../../api/modules/bookingApi";
import { getStaffList } from "../../../api/modules/adminApi";
import { getServices } from "../../../api/modules/serviceApi";
import type { Booking, BookingItem } from "../../../types/booking";
import type { ServiceItem } from "../../../types/service";
import type { StaffManagementStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<StaffManagementStackParamList, "StaffSchedule">;

type ScheduleStatus = "all" | "pending" | "confirmed" | "in-progress" | "completed" | "cancelled";

type DraftFilters = {
  status: ScheduleStatus;
  date: Date | null;
  fromDate: Date | null;
  toDate: Date | null;
  staffId: string;
  serviceId: string;
};

type AppliedFilters = DraftFilters;

type CalendarTarget = "date" | "fromDate" | "toDate";

type StaffOption = {
  id: string;
  name: string;
  email?: string;
};

type BookingRecord = Booking & {
  createdAt?: string;
  updatedAt?: string;
  bookingNumber?: string;
  bookingTime?: string;
  customer?: { _id?: string; name?: string; email?: string };
  user?: { _id?: string; name?: string; email?: string };
  guestInfo?: { name?: string; email?: string; phone?: string };
  assignedStaff?: { _id?: string; name?: string; email?: string } | string;
  boardingPet?: { petName?: string };
  items: Array<
    BookingItem & {
      pet?: { petName?: string } | string;
      service?: { _id?: string; name?: string } | string;
      guestPet?: { petName?: string };
    }
  >;
};

type ScheduleSection = {
  key: string;
  title: string;
  data: BookingRecord[];
};

const DEFAULT_FILTERS: AppliedFilters = {
  status: "all",
  date: null,
  fromDate: null,
  toDate: null,
  staffId: "",
  serviceId: "",
};

const STATUS_OPTIONS: Array<{ key: ScheduleStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function safeDate(value?: string) {
  const d = new Date(value || "");
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeStatus(status?: string): Exclude<ScheduleStatus, "all"> {
  const raw = String(status || "pending").toLowerCase();
  if (raw === "confirmed" || raw === "accepted") return "confirmed";
  if (raw === "in-progress") return "in-progress";
  if (raw === "completed") return "completed";
  if (raw === "cancelled") return "cancelled";
  return "pending";
}

function getStatusMeta(status?: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "confirmed") return { label: "Confirmed", bg: "#EAF2FF", text: "#2E67C3" };
  if (normalized === "in-progress") return { label: "In Progress", bg: "#F4EDFF", text: "#7A42CB" };
  if (normalized === "completed") return { label: "Completed", bg: "#E5F7EC", text: "#25834D" };
  if (normalized === "cancelled") return { label: "Cancelled", bg: "#FDECEF", text: "#B24251" };
  return { label: "Pending", bg: "#FFF2E5", text: "#B46730" };
}

function formatDateLabel(date?: Date | null) {
  if (!date) return "Any";
  return date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(record: BookingRecord) {
  if (record.bookingTime && /^\d{1,2}:\d{2}/.test(record.bookingTime)) {
    const [h, m] = record.bookingTime.split(":");
    return `${String(Number(h)).padStart(2, "0")}:${m.slice(0, 2)}`;
  }
  const parsed = safeDate(record.bookingDate);
  if (!parsed) return "--:--";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getCustomer(record: BookingRecord) {
  return record.customer?.name || record.user?.name || record.guestInfo?.name || "Guest Customer";
}

function getAssignedStaff(record: BookingRecord) {
  if (!record.assignedStaff) return "Unassigned";
  if (typeof record.assignedStaff === "string") return "Assigned";
  return record.assignedStaff.name || "Assigned";
}

function extractPetName(item?: BookingRecord["items"][number]) {
  if (!item) return "Pet";
  if (item.guestPet?.petName) return item.guestPet.petName;
  if (!item.pet) return "Pet";
  if (typeof item.pet === "string") return "Pet";
  return item.pet.petName || "Pet";
}

function extractServiceName(item?: BookingRecord["items"][number]) {
  if (!item?.service) return "Service";
  if (typeof item.service === "string") return "Service";
  return item.service.name || "Service";
}

function getPrimaryPet(record: BookingRecord) {
  if (record.boardingPet?.petName) return record.boardingPet.petName;
  return extractPetName(record.items[0]);
}

function getServiceSummary(record: BookingRecord) {
  const names = record.items.map((item) => extractServiceName(item)).filter(Boolean);
  const unique = Array.from(new Set(names));
  if (unique.length === 0) return "No service";
  if (unique.length === 1) return unique[0];
  return `${unique[0]} +${unique.length - 1}`;
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

export function StaffScheduleScreen() {
  const navigation = useNavigation<Props["navigation"]>();
  const route = useRoute<Props["route"]>();

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceItem[]>([]);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [filters, setFilters] = useState<AppliedFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(DEFAULT_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>("date");
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim().toLowerCase()), 280);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadBaseOptions = useCallback(async () => {
    try {
      const [staff, services] = await Promise.all([
        getStaffList(),
        getServices({ isActive: "true", sortBy: "name", sortOrder: "asc" }),
      ]);

      const normalizedStaff = (staff || []).map((item: any) => ({
        id: String(item._id || item.id || ""),
        name: String(item.name || "Staff"),
        email: item.email ? String(item.email) : "",
      })).filter((item: StaffOption) => item.id);

      setStaffOptions(normalizedStaff);
      setServiceOptions(services.data || []);
    } catch (_) {
      // Keep UI usable even when optional filter metadata cannot be loaded.
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    setError("");

    try {
      const data = await getAllBookings({
        status: filters.status === "all" ? undefined : filters.status,
        date: filters.date ? toDateKey(filters.date) : undefined,
      });

      const sorted = (data as BookingRecord[]).slice().sort((left, right) => {
        const leftTime = safeDate(left.bookingDate)?.getTime() || 0;
        const rightTime = safeDate(right.bookingDate)?.getTime() || 0;
        return leftTime - rightTime;
      });

      setBookings(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load schedules");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters.date, filters.status]);

  useEffect(() => {
    setLoading(true);
    loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    loadBaseOptions();
  }, [loadBaseOptions]);

  useFocusEffect(
    useCallback(() => {
      loadSchedules();

      if (route.params?.toastMessage) {
        setInfoMessage(route.params.toastMessage);
        navigation.setParams({ toastMessage: undefined, refreshAt: undefined });
      }
    }, [loadSchedules, navigation, route.params]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSchedules();
  }, [loadSchedules]);

  const visibleSchedules = useMemo(() => {
    return bookings.filter((record) => {
      const bookingDate = safeDate(record.bookingDate);

      if (filters.fromDate && bookingDate && bookingDate < new Date(toDateKey(filters.fromDate))) {
        return false;
      }

      if (filters.toDate && bookingDate) {
        const maxDate = new Date(toDateKey(filters.toDate));
        maxDate.setDate(maxDate.getDate() + 1);
        if (bookingDate >= maxDate) return false;
      }

      if (filters.staffId) {
        const assigned = typeof record.assignedStaff === "string"
          ? record.assignedStaff
          : record.assignedStaff?._id || "";
        if (String(assigned) !== filters.staffId) return false;
      }

      if (filters.serviceId) {
        const hasService = record.items.some((item) => {
          if (!item.service) return false;
          if (typeof item.service === "string") return item.service === filters.serviceId;
          return String(item.service._id || "") === filters.serviceId;
        });
        if (!hasService) return false;
      }

      if (!debouncedSearch) return true;

      const searchBlob = [
        record.bookingNumber || record._id,
        getPrimaryPet(record),
        getCustomer(record),
        getServiceSummary(record),
        getAssignedStaff(record),
      ].join(" ").toLowerCase();

      return searchBlob.includes(debouncedSearch);
    });
  }, [bookings, debouncedSearch, filters.fromDate, filters.serviceId, filters.staffId, filters.toDate]);

  const sections = useMemo<ScheduleSection[]>(() => {
    const grouped = new Map<string, BookingRecord[]>();

    visibleSchedules.forEach((item) => {
      const date = safeDate(item.bookingDate);
      const key = date ? toDateKey(date) : "unknown";
      const list = grouped.get(key) || [];
      list.push(item);
      grouped.set(key, list);
    });

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return Array.from(grouped.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([key, data]) => {
        const parsed = key === "unknown" ? null : new Date(`${key}T00:00:00`);
        let title = "Unknown Date";
        if (parsed) {
          if (isSameDay(parsed, today)) title = "Today";
          else if (isSameDay(parsed, tomorrow)) title = "Tomorrow";
          else title = parsed.toLocaleDateString([], { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
        }

        return { key, title, data };
      });
  }, [visibleSchedules]);

  const openFilterSheet = useCallback(() => {
    setDraftFilters(filters);
    setFilterVisible(true);
  }, [filters]);

  const applyFilters = useCallback(() => {
    setFilters(draftFilters);
    setFilterVisible(false);
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setFilterVisible(false);
  }, []);

  const openCalendarFor = useCallback((target: CalendarTarget) => {
    setCalendarTarget(target);
    const current = draftFilters[target] || new Date();
    setCalendarMonth(current);
    setCalendarVisible(true);
  }, [draftFilters]);

  const calendarCells = useMemo(() => getCalendarCells(calendarMonth), [calendarMonth]);

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D9854D" />}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerTitles}>
                <Text style={styles.title}>Schedule Management</Text>
                <Text style={styles.subtitle}>View and manage all bookings & appointments</Text>
              </View>

              <Pressable style={styles.refreshBtn} onPress={onRefresh}>
                <Feather name="refresh-cw" size={16} color="#6E7F94" />
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchInputWrap}>
                <Feather name="search" size={17} color="#D07B45" />
                <TextInput
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search by pet, customer, service..."
                  placeholderTextColor="#A8AFBB"
                />
              </View>

              <Pressable style={styles.filterBtn} onPress={openFilterSheet}>
                <Feather name="sliders" size={15} color="#FFFFFF" />
                <Text style={styles.filterBtnText}>Filter</Text>
              </Pressable>
            </View>

            <Text style={styles.resultCount}>{visibleSchedules.length} schedules found</Text>

            {infoMessage ? (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>{infoMessage}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
                <Pressable style={styles.retryBtn} onPress={onRefresh}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#D9854D" />
              <Text style={styles.loadingText}>Loading schedules...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Feather name="calendar" size={20} color="#93A2B5" />
              <Text style={styles.emptyTitle}>No schedules found</Text>
              <Text style={styles.emptyDesc}>Try adjusting your filters or search keyword.</Text>
            </View>
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderWrap}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const status = getStatusMeta(item.status);

          return (
            <Pressable
              style={styles.scheduleCard}
              onPress={() => navigation.navigate("StaffScheduleDetail", { bookingId: item._id })}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTime}>{formatTime(item)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}> 
                  <Text style={[styles.statusBadgeText, { color: status.text }]}>{status.label}</Text>
                </View>
              </View>

              <Text style={styles.rowMainText}>{getPrimaryPet(item)} · {getCustomer(item)}</Text>
              <Text style={styles.rowSubText}>{getServiceSummary(item)} · {getAssignedStaff(item)}</Text>
            </Pressable>
          );
        }}
      />

      <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setFilterVisible(false)} />

          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <Pressable style={styles.sheetCloseBtn} onPress={() => setFilterVisible(false)}>
                <Feather name="x" size={16} color="#7B899D" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              <View style={styles.groupBlock}>
                <Text style={styles.groupTitle}>Status</Text>
                <View style={styles.chipWrap}>
                  {STATUS_OPTIONS.map((item) => {
                    const active = draftFilters.status === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.filterChip, active && styles.filterChipActive]}
                        onPress={() => setDraftFilters((prev) => ({ ...prev, status: item.key }))}
                      >
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.groupBlock}>
                <Text style={styles.groupTitle}>Date</Text>
                <View style={styles.dateFieldRow}>
                  <Pressable style={styles.dateFieldBtn} onPress={() => openCalendarFor("date")}>
                    <Text style={styles.dateFieldLabel}>Date</Text>
                    <Text style={styles.dateFieldValue}>{formatDateLabel(draftFilters.date)}</Text>
                  </Pressable>
                  <Pressable style={styles.dateFieldBtn} onPress={() => openCalendarFor("fromDate")}>
                    <Text style={styles.dateFieldLabel}>From</Text>
                    <Text style={styles.dateFieldValue}>{formatDateLabel(draftFilters.fromDate)}</Text>
                  </Pressable>
                  <Pressable style={styles.dateFieldBtn} onPress={() => openCalendarFor("toDate")}>
                    <Text style={styles.dateFieldLabel}>To</Text>
                    <Text style={styles.dateFieldValue}>{formatDateLabel(draftFilters.toDate)}</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.groupBlock}>
                <Text style={styles.groupTitle}>Staff</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineScrollRow}>
                  <Pressable
                    style={[styles.filterChip, !draftFilters.staffId && styles.filterChipActive]}
                    onPress={() => setDraftFilters((prev) => ({ ...prev, staffId: "" }))}
                  >
                    <Text style={[styles.filterChipText, !draftFilters.staffId && styles.filterChipTextActive]}>Any</Text>
                  </Pressable>
                  {staffOptions.map((item) => {
                    const active = draftFilters.staffId === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.filterChip, active && styles.filterChipActive]}
                        onPress={() => setDraftFilters((prev) => ({ ...prev, staffId: item.id }))}
                      >
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.groupBlock}>
                <Text style={styles.groupTitle}>Service</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineScrollRow}>
                  <Pressable
                    style={[styles.filterChip, !draftFilters.serviceId && styles.filterChipActive]}
                    onPress={() => setDraftFilters((prev) => ({ ...prev, serviceId: "" }))}
                  >
                    <Text style={[styles.filterChipText, !draftFilters.serviceId && styles.filterChipTextActive]}>Any</Text>
                  </Pressable>
                  {serviceOptions.slice(0, 18).map((item) => {
                    const active = draftFilters.serviceId === item._id;
                    return (
                      <Pressable
                        key={item._id}
                        style={[styles.filterChip, active && styles.filterChipActive]}
                        onPress={() => setDraftFilters((prev) => ({ ...prev, serviceId: item._id }))}
                      >
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <Pressable style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </Pressable>
              <Pressable style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={calendarVisible} transparent animationType="fade" onRequestClose={() => setCalendarVisible(false)}>
        <View style={styles.calendarOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setCalendarVisible(false)} />

          <View style={styles.calendarCard}>
            <View style={styles.calendarHeaderRow}>
              <Text style={styles.calendarMonthText}>{calendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}</Text>
              <View style={styles.calendarNavRow}>
                <Pressable style={styles.calendarNavBtn} onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                  <Feather name="chevron-left" size={15} color="#7C889A" />
                </Pressable>
                <Pressable style={styles.calendarNavBtn} onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                  <Feather name="chevron-right" size={15} color="#7C889A" />
                </Pressable>
              </View>
            </View>

            <View style={styles.weekRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((label, idx) => (
                <Text key={`${label}-${idx}`} style={styles.weekText}>{label}</Text>
              ))}
            </View>

            <View style={styles.dayGrid}>
              {calendarCells.map((cell) => {
                const selectedValue = draftFilters[calendarTarget];
                const active = selectedValue ? isSameDay(cell.date, selectedValue) : false;
                const today = isSameDay(cell.date, new Date());

                return (
                  <Pressable
                    key={cell.date.toISOString()}
                    style={[styles.dayCell, active && styles.dayCellActive, today && !active && styles.dayCellToday]}
                    onPress={() => {
                      setDraftFilters((prev) => ({ ...prev, [calendarTarget]: cell.date }));
                      setCalendarVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !cell.inMonth && styles.dayTextMuted,
                        active && styles.dayTextActive,
                        today && !active && styles.dayTextToday,
                      ]}
                    >
                      {cell.date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.calendarFooter}>
              <Pressable
                style={styles.calendarTextBtn}
                onPress={() => {
                  setDraftFilters((prev) => ({ ...prev, [calendarTarget]: null }));
                  setCalendarVisible(false);
                }}
              >
                <Text style={styles.calendarTextBtnLabel}>Clear</Text>
              </Pressable>
              <Pressable style={styles.calendarTextBtn} onPress={() => setCalendarVisible(false)}>
                <Text style={styles.calendarTextBtnLabel}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF8F2",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  headerBlock: {
    gap: 10,
    paddingBottom: 4,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  headerTitles: {
    flex: 1,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5D9CC",
    backgroundColor: "#FFFBF5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#D27743",
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 2,
    color: "#7B889A",
    fontSize: 14,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7DBCD",
    backgroundColor: "#FFFAF4",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: "#2D4157",
    fontSize: 15,
    paddingVertical: 0,
  },
  filterBtn: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: "#D77D46",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  resultCount: {
    color: "#6F7F95",
    fontSize: 13,
    fontWeight: "700",
  },
  infoBanner: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#CFE6D7",
    backgroundColor: "#EEF8F1",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  infoBannerText: {
    color: "#2C7F4A",
    fontSize: 12,
    fontWeight: "700",
  },
  errorBanner: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#F2CDD2",
    backgroundColor: "#FFF1F3",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  errorBannerText: {
    color: "#B14655",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  retryBtn: {
    minHeight: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ECD7C7",
    backgroundColor: "#FFF7EC",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtnText: {
    color: "#B96835",
    fontSize: 12,
    fontWeight: "700",
  },
  loadingWrap: {
    alignItems: "center",
    paddingTop: 40,
    gap: 10,
  },
  loadingText: {
    color: "#72839A",
    fontSize: 13,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 34,
    gap: 6,
  },
  emptyTitle: {
    color: "#33495F",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyDesc: {
    color: "#7A8DA4",
    fontSize: 12,
  },
  sectionHeaderWrap: {
    marginTop: 4,
    marginBottom: 4,
  },
  sectionHeaderText: {
    color: "#6E7F95",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  scheduleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD3",
    backgroundColor: "#FFFEFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    shadowColor: "#5A4735",
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardTime: {
    color: "#283E56",
    fontSize: 18,
    fontWeight: "900",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  rowMainText: {
    color: "#20364E",
    fontSize: 14,
    fontWeight: "800",
  },
  rowSubText: {
    color: "#6D7E93",
    fontSize: 12,
    fontWeight: "600",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 31, 49, 0.2)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#E8DACA",
    backgroundColor: "#FFFDF9",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    maxHeight: "84%",
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E7DBCD",
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: "#2D445D",
    fontSize: 16,
    fontWeight: "900",
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6EFE5",
  },
  sheetBody: {
    paddingTop: 10,
    paddingBottom: 8,
    gap: 12,
  },
  groupBlock: {
    gap: 6,
  },
  groupTitle: {
    color: "#5D6F86",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  inlineScrollRow: {
    gap: 7,
    paddingRight: 14,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EADDD1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: "#E5C6AA",
    backgroundColor: "#FFF1E3",
  },
  filterChipText: {
    color: "#6E7F95",
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#C06A37",
  },
  dateFieldRow: {
    gap: 7,
  },
  dateFieldBtn: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EADDD1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  dateFieldLabel: {
    color: "#8A97A8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dateFieldValue: {
    marginTop: 2,
    color: "#384E67",
    fontSize: 13,
    fontWeight: "700",
  },
  sheetFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#EEE2D6",
    flexDirection: "row",
    gap: 8,
  },
  resetBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6D8CB",
    backgroundColor: "#FFF9F2",
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtnText: {
    color: "#6F8094",
    fontSize: 13,
    fontWeight: "800",
  },
  applyBtn: {
    flex: 1.4,
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: "#D77D46",
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 31, 49, 0.2)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  calendarCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECDFD2",
    backgroundColor: "#FFFEFB",
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 8,
    shadowColor: "#5E4A39",
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  calendarMonthText: {
    color: "#3D536E",
    fontSize: 13,
    fontWeight: "800",
  },
  calendarNavRow: {
    flexDirection: "row",
    gap: 6,
  },
  calendarNavBtn: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#ECE0D4",
    backgroundColor: "#FFF9F2",
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  weekText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#9AA6B5",
    fontSize: 10,
    fontWeight: "700",
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: "#E7D3C2",
    backgroundColor: "#FFF6EC",
  },
  dayCellActive: {
    borderWidth: 1,
    borderColor: "#E2BFA3",
    backgroundColor: "#F4D9C3",
  },
  dayText: {
    color: "#415773",
    fontSize: 12,
    fontWeight: "700",
  },
  dayTextMuted: {
    color: "#C7CED8",
    opacity: 0.42,
  },
  dayTextToday: {
    color: "#C16936",
  },
  dayTextActive: {
    color: "#8E4E2A",
  },
  calendarFooter: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  calendarTextBtn: {
    minHeight: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEE2D6",
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFAF4",
  },
  calendarTextBtnLabel: {
    color: "#6F8094",
    fontSize: 10,
    fontWeight: "700",
  },
});
