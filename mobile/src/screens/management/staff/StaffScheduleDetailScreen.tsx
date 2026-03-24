import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { assignStaffToBooking, getBookingById, updateBookingStatus } from "../../../api/modules/bookingApi";
import { getStaffList } from "../../../api/modules/adminApi";
import type { Booking, BookingItem } from "../../../types/booking";
import type { StaffManagementStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<StaffManagementStackParamList, "StaffScheduleDetail">;

type StatusKey = "pending" | "confirmed" | "in-progress" | "completed" | "cancelled";

type BookingRecord = Booking & {
  createdAt?: string;
  updatedAt?: string;
  bookingNumber?: string;
  customer?: { _id?: string; name?: string; email?: string };
  user?: { _id?: string; name?: string; email?: string };
  guestInfo?: { name?: string; email?: string; phone?: string };
  assignedStaff?: { _id?: string; name?: string; email?: string } | string;
  items: Array<
    BookingItem & {
      pet?: { petName?: string } | string;
      service?: { _id?: string; name?: string } | string;
      guestPet?: { petName?: string };
    }
  >;
};

type StaffOption = {
  id: string;
  name: string;
  email?: string;
};

const STATUS_OPTIONS: Array<{ key: StatusKey; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function safeDate(input?: string) {
  const d = new Date(input || "");
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeStatus(status?: string): StatusKey {
  const raw = String(status || "pending").toLowerCase();
  if (raw === "accepted" || raw === "confirmed") return "confirmed";
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

function formatDateTime(input?: string) {
  const d = safeDate(input);
  if (!d) return "--";
  return d.toLocaleString([], { hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatDate(input?: string) {
  const d = safeDate(input);
  if (!d) return "--";
  return d.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
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

function getPet(record: BookingRecord) {
  const first = record.items[0];
  if (first?.guestPet?.petName) return first.guestPet.petName;
  if (!first?.pet) return "Pet";
  if (typeof first.pet === "string") return "Pet";
  return first.pet.petName || "Pet";
}

function getServices(record: BookingRecord) {
  const names = record.items
    .map((item) => {
      if (!item.service) return "Service";
      if (typeof item.service === "string") return "Service";
      return item.service.name || "Service";
    })
    .filter(Boolean);

  return Array.from(new Set(names));
}

function getAssignedStaff(record?: BookingRecord | null) {
  if (!record?.assignedStaff) return "";
  if (typeof record.assignedStaff === "string") return record.assignedStaff;
  return String(record.assignedStaff._id || "");
}

export function StaffScheduleDetailScreen({ navigation, route }: Props) {
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [assignUpdatingId, setAssignUpdatingId] = useState("");

  const loadDetail = useCallback(async () => {
    setError("");
    try {
      const data = await getBookingById(bookingId);
      setBooking(data as BookingRecord);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load schedule detail");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  const loadStaff = useCallback(async () => {
    try {
      const staff = await getStaffList();
      const normalized = (staff || [])
        .map((item: any) => ({ id: String(item._id || item.id || ""), name: String(item.name || "Staff"), email: item.email ? String(item.email) : "" }))
        .filter((item: StaffOption) => item.id);
      setStaffOptions(normalized);
    } catch (_) {
      setStaffOptions([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadDetail();
    loadStaff();
  }, [loadDetail, loadStaff]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDetail();
  }, [loadDetail]);

  const onUpdateStatus = useCallback(async (status: StatusKey) => {
    if (!booking || statusUpdating) return;

    const current = normalizeStatus(booking.status);
    if (status === current) return;

    setError("");
    setSuccessMessage("");
    setStatusUpdating(true);

    try {
      const updated = await updateBookingStatus(booking._id, { status });
      setBooking(updated as BookingRecord);
      setSuccessMessage("Status updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update status");
    } finally {
      setStatusUpdating(false);
    }
  }, [booking, statusUpdating]);

  const onAssignStaff = useCallback(async (staffId: string) => {
    if (!booking || assignUpdatingId) return;

    const assigned = getAssignedStaff(booking);
    if (assigned === staffId) return;

    setError("");
    setSuccessMessage("");
    setAssignUpdatingId(staffId);

    try {
      const updated = await assignStaffToBooking(booking._id, staffId);
      setBooking(updated as BookingRecord);
      setSuccessMessage("Assigned staff updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to assign staff");
    } finally {
      setAssignUpdatingId("");
    }
  }, [assignUpdatingId, booking]);

  const statusMeta = getStatusMeta(booking?.status);
  const serviceNames = useMemo(() => (booking ? getServices(booking) : []), [booking]);
  const selectedStaffId = getAssignedStaff(booking);

  if (loading) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color="#D9854D" />
        <Text style={styles.loadingText}>Loading schedule detail...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.errorText}>{error || "Schedule not found"}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D9854D" />}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={18} color="#314761" />
          </Pressable>
          <View style={styles.headerTexts}>
            <Text style={styles.title}>Schedule Details</Text>
            <Text style={styles.code}>{booking.bookingNumber || `#${booking._id.slice(-8)}`}</Text>
          </View>
        </View>

        {successMessage ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{successMessage}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Schedule Snapshot</Text>
          <Text style={styles.snapshotText}>Date: {formatDate(booking.bookingDate)}</Text>
          <Text style={styles.snapshotText}>Time: {formatTime(booking)}</Text>
          <Text style={styles.snapshotText}>Pet: {getPet(booking)}</Text>
          <Text style={styles.snapshotText}>Customer: {getCustomer(booking)}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.wrapRow}>
            {serviceNames.map((name) => (
              <View key={name} style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>{name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={[styles.statusBadge, { alignSelf: "flex-start", backgroundColor: statusMeta.bg }]}> 
            <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
          </View>

          <View style={styles.wrapRow}>
            {STATUS_OPTIONS.map((item) => {
              const active = normalizeStatus(booking.status) === item.key;
              return (
                <Pressable
                  key={item.key}
                  style={[styles.actionChip, active && styles.actionChipActive]}
                  onPress={() => onUpdateStatus(item.key)}
                  disabled={statusUpdating}
                >
                  <Text style={[styles.actionChipText, active && styles.actionChipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {statusUpdating ? <Text style={styles.inlineInfo}>Updating status...</Text> : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Assigned Staff</Text>

          <View style={styles.wrapRow}>
            {staffOptions.length === 0 ? (
              <Text style={styles.inlineInfo}>No staff options available</Text>
            ) : (
              staffOptions.map((item) => {
                const active = selectedStaffId === item.id;
                const loadingAssign = assignUpdatingId === item.id;

                return (
                  <Pressable
                    key={item.id}
                    style={[styles.actionChip, active && styles.actionChipActive]}
                    onPress={() => onAssignStaff(item.id)}
                    disabled={Boolean(assignUpdatingId)}
                  >
                    <Text style={[styles.actionChipText, active && styles.actionChipTextActive]}>
                      {loadingAssign ? "Assigning..." : item.name}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>

          {selectedStaffId ? (
            <Text style={styles.inlineInfo}>Current assigned: {booking.assignedStaff && typeof booking.assignedStaff !== "string" ? booking.assignedStaff.name : "Assigned"}</Text>
          ) : (
            <Text style={styles.inlineInfo}>No staff assigned yet</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Timestamps</Text>
          <Text style={styles.snapshotText}>Created: {formatDateTime(booking.createdAt || booking.bookingDate)}</Text>
          <Text style={styles.snapshotText}>Updated: {formatDateTime(booking.updatedAt || booking.bookingDate)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF8F2",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FCF8F2",
    paddingHorizontal: 20,
  },
  loadingText: {
    color: "#73859C",
    fontSize: 13,
  },
  errorText: {
    color: "#B14655",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  primaryBtn: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: "#D77D46",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E7DBCD",
    backgroundColor: "#FFFBF5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    color: "#D27743",
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
  },
  code: {
    marginTop: 1,
    color: "#6F7F95",
    fontSize: 12,
    fontWeight: "700",
  },
  successBanner: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#CFE6D7",
    backgroundColor: "#EEF8F1",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  successBannerText: {
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
  },
  errorBannerText: {
    color: "#B14655",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD3",
    backgroundColor: "#FFFEFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  sectionTitle: {
    color: "#2A3F57",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  snapshotText: {
    color: "#3A4F67",
    fontSize: 13,
    fontWeight: "600",
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  serviceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E9DCCE",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  serviceChipText: {
    color: "#A55E32",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  actionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8DCCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionChipActive: {
    borderColor: "#E5C6AA",
    backgroundColor: "#FFF1E3",
  },
  actionChipText: {
    color: "#6E7F95",
    fontSize: 12,
    fontWeight: "700",
  },
  actionChipTextActive: {
    color: "#C06A37",
  },
  inlineInfo: {
    color: "#7B8CA2",
    fontSize: 12,
  },
});
