import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { cancelBooking, getMyBookings } from "../../api/modules/bookingApi";
import { getEligibleBookingsForFeedback } from "../../api/modules/feedbackApi";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import type { Booking, BookingItem } from "../../types/booking";
import { canUseCustomerFeatures } from "../../utils/role";

const STATUS_FILTERS = ["all", "pending", "confirmed", "in-progress", "completed", "cancelled"] as const;

type BookingStatusFilter = (typeof STATUS_FILTERS)[number];

type Props = NativeStackScreenProps<AccountStackParamList, "MyBookings">;

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: "Pending", bg: "#FEF3C7", text: "#B45309", dot: "#F59E0B" },
  confirmed: { label: "Confirmed", bg: "#DCEBFF", text: "#1D4ED8", dot: "#3B82F6" },
  "in-progress": { label: "In Progress", bg: "#FFE8D6", text: "#C2410C", dot: "#EA580C" },
  completed: { label: "Completed", bg: "#DCFCE7", text: "#15803D", dot: "#22C55E" },
  cancelled: { label: "Cancelled", bg: "#FEE2E2", text: "#B91C1C", dot: "#EF4444" },
};

function getStatusMeta(status?: string) {
  const key = String(status || "pending").toLowerCase();
  return STATUS_META[key] || { label: "Pending", bg: "#FEF3C7", text: "#B45309", dot: "#F59E0B" };
}

function formatDate(input?: string) {
  if (!input) return "N/A";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString();
}

function formatTime(input?: string) {
  if (!input) return "--:--";
  const maybeDate = new Date(input);
  if (!Number.isNaN(maybeDate.getTime())) {
    return maybeDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (input.includes("T")) return "--:--";
  return input;
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString()} VND`;
}

function getServiceName(item: BookingItem) {
  if (typeof item.service === "string") return "Service";
  return item.service?.name || "Service";
}

function getPetName(item?: BookingItem) {
  if (!item?.pet) return "Pet Booking";
  if (typeof item.pet === "string") return "Pet Booking";
  return item.pet.petName || "Pet Booking";
}

function getServiceSummary(items: BookingItem[]) {
  if (!items.length) return "No services";
  const names = items.map(getServiceName).filter(Boolean);
  const unique = Array.from(new Set(names));
  if (unique.length <= 2) return unique.join(" • ");
  return `${unique.slice(0, 2).join(" • ")} +${unique.length - 2}`;
}

function getFeedbackDeadline(bookingDate?: string) {
  if (!bookingDate) return null;
  const base = new Date(bookingDate);
  if (Number.isNaN(base.getTime())) return null;
  const deadline = new Date(base);
  deadline.setDate(deadline.getDate() + 7);
  return deadline;
}

export function MyBookingsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const canAccess = canUseCustomerFeatures(user?.role);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [eligibleFeedbackBookingIds, setEligibleFeedbackBookingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeStatus, setActiveStatus] = useState<BookingStatusFilter>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const canCancelBooking = (status?: string) => status === "pending" || status === "confirmed";
  const canTrackBooking = (status?: string) => status === "confirmed" || status === "in-progress";

  const loadData = useCallback(async (status: BookingStatusFilter) => {
    setError("");
    try {
      const [bookingData, eligibleFeedbackBookings] = await Promise.all([
        getMyBookings(status === "all" ? undefined : status),
        getEligibleBookingsForFeedback(),
      ]);

      const sorted = [...bookingData].sort((left, right) => {
        const leftTime = new Date(left.bookingDate || "").getTime();
        const rightTime = new Date(right.bookingDate || "").getTime();
        return rightTime - leftTime;
      });

      const eligibleSet = new Set(
        eligibleFeedbackBookings
          .filter((booking) => !booking.allReviewed)
          .map((booking) => booking._id),
      );

      setBookings(sorted);
      setEligibleFeedbackBookingIds(eligibleSet);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load bookings. Please try again.");
    }
  }, []);

  const fetchWithLoading = useCallback(async () => {
    setLoading(true);
    await loadData(activeStatus);
    setLoading(false);
  }, [activeStatus, loadData]);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    fetchWithLoading();
  }, [canAccess, fetchWithLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(activeStatus);
    setRefreshing(false);
  }, [activeStatus, loadData]);

  const onCancel = useCallback(
    async (bookingId: string) => {
      setProcessingId(bookingId);
      setMessage("");
      setError("");
      try {
        await cancelBooking(bookingId, "Cancelled by customer");
        setMessage("Booking cancelled successfully.");
        await loadData(activeStatus);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to cancel booking.");
      } finally {
        setProcessingId(null);
      }
    },
    [activeStatus, loadData],
  );

  const emptyText = useMemo(() => {
    if (activeStatus === "completed") return "You have no completed bookings yet.";
    if (activeStatus === "pending") return "You currently have no pending bookings.";
    if (activeStatus === "all") return "No bookings found.";
    return `No ${activeStatus} bookings found.`;
  }, [activeStatus]);

  if (!canAccess) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorBannerText}>This section is available for customer accounts only.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Booking History</Text>
        </View>
        <Text style={styles.subtitle}>View booking details and medical updates</Text>
      </View>

      <View style={styles.filterRowWrap}>
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const selected = item === activeStatus;
            const label = item === "all" ? "All" : getStatusMeta(item).label;

            return (
              <Pressable
                key={item}
                style={[styles.filterChip, selected && styles.filterChipActive]}
                onPress={() => setActiveStatus(item)}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{label}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchWithLoading}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {message ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{message}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3].map((item) => (
            <View key={`skeleton-${item}`} style={styles.skeletonCard}>
              <View style={styles.skeletonLineLg} />
              <View style={styles.skeletonLineSm} />
              <View style={styles.skeletonLineMd} />
              <View style={styles.skeletonActionsRow}>
                <View style={styles.skeletonBtn} />
                <View style={styles.skeletonBtn} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item, index) => `${item._id}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>⌕</Text>
              <Text style={styles.emptyTitle}>{emptyText}</Text>
              <Pressable style={styles.bookNowButton} onPress={() => navigation.goBack()}>
                <Text style={styles.bookNowButtonText}>Book a service now</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const statusMeta = getStatusMeta(item.status);
            const isFeedbackEligible = item.status === "completed" && eligibleFeedbackBookingIds.has(item._id);
            const canCancel = canCancelBooking(item.status);
            const canTrack = canTrackBooking(item.status);
            const deadline = isFeedbackEligible ? getFeedbackDeadline(item.bookingDate) : null;
            const firstItem = item.items[0];
            const title = getPetName(firstItem);

            return (
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardTitleWrap}>
                    <View style={styles.petIconBadge}>
                      <Text style={styles.petIconText}>🐾</Text>
                    </View>
                    <View style={styles.cardTitleTextWrap}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
                      <Text style={styles.bookingCode}>{item.bookingNumber || item._id.slice(-8)}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}> 
                    <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
                    <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>📅 {formatDate(item.bookingDate)}</Text>
                  <Text style={styles.infoText}>🕒 {formatTime(item.bookingTime || item.bookingDate)}</Text>
                </View>

                <View style={styles.serviceTag}>
                  <Text style={styles.serviceTagText}>{getServiceSummary(item.items)}</Text>
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatMoney(item.totalAmount)}</Text>
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() => navigation.navigate("BookingDetail", { bookingId: item._id })}
                  >
                    <Text style={styles.secondaryBtnText}>👁 View Detail</Text>
                  </Pressable>

                  {isFeedbackEligible ? (
                    <Pressable
                      style={[styles.primaryBtn, styles.feedbackBtn]}
                      onPress={() => navigation.navigate("Feedback", { bookingId: item._id })}
                    >
                      <Text style={[styles.primaryBtnText, styles.feedbackBtnText]}>📄 Leave Feedback</Text>
                    </Pressable>
                  ) : canTrack ? (
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() => navigation.navigate("BookingCamera", { bookingId: item._id })}
                    >
                      <Text style={styles.primaryBtnText}>↗ Track Status</Text>
                    </Pressable>
                  ) : canCancel ? (
                    <Pressable
                      style={[styles.primaryBtn, processingId === item._id && styles.disabled]}
                      onPress={() => onCancel(item._id)}
                      disabled={processingId === item._id}
                    >
                      {processingId === item._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Cancel Booking</Text>}
                    </Pressable>
                  ) : null}
                </View>

                {deadline ? (
                  <Text style={styles.feedbackHint}>
                    Feedback available until {deadline.toLocaleDateString()}, {deadline.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FA" },
  centeredContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },

  headerWrap: {
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 10,
    backgroundColor: "#EEF2F6",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { color: "#4A5568", fontSize: 28, lineHeight: 28, fontWeight: "400" },
  title: { color: "#223248", fontSize: 29, lineHeight: 34, fontWeight: "900" },
  subtitle: { marginTop: 2, marginLeft: 34, color: "#6E7D90", fontSize: 13, lineHeight: 18 },

  filterRowWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 },
  filterList: { paddingRight: 10 },
  filterChip: {
    marginRight: 8,
    minHeight: 30,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#DCE3EA",
  },
  filterChipActive: { backgroundColor: "#1F2E43", borderColor: "#1F2E43" },
  filterChipText: { color: "#64748B", fontWeight: "600", fontSize: 12 },
  filterChipTextActive: { color: "#FFFFFF" },

  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  errorBannerText: { color: "#B42318", flex: 1, fontWeight: "600" },
  retryButton: {
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryButtonText: { color: "#B42318", fontWeight: "700" },

  successBanner: {
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#86EFAC",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  successBannerText: { color: "#166534", fontWeight: "700" },

  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 },
  card: {
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DEE5EE",
    backgroundColor: "#FFFFFF",
    padding: 13,
    shadowColor: "#223248",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  cardTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  petIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFF2E8",
    alignItems: "center",
    justifyContent: "center",
  },
  petIconText: { fontSize: 16 },
  cardTitleTextWrap: { flex: 1 },
  cardTitle: { color: "#1B2A40", fontSize: 15, fontWeight: "800" },
  bookingCode: { marginTop: 2, color: "#8B98AB", fontSize: 11, fontWeight: "600" },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },

  infoRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  infoText: { color: "#5F7088", fontSize: 12, fontWeight: "500" },

  serviceTag: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#EFF3F7",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  serviceTagText: { color: "#5C6C84", fontSize: 12, fontWeight: "500" },

  totalRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: { color: "#90A0B3", fontSize: 12, fontWeight: "600" },
  totalValue: { color: "#F57C20", fontSize: 19, fontWeight: "800" },

  actionRow: { marginTop: 12, flexDirection: "row", gap: 8 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D7DFE8",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
  },
  secondaryBtnText: { color: "#41556E", fontSize: 13, fontWeight: "600" },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#2A7FFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  feedbackBtn: {
    borderWidth: 1,
    borderColor: "#BFD5F8",
    backgroundColor: "#EFF5FF",
  },
  feedbackBtnText: { color: "#2B66D9" },

  feedbackHint: { marginTop: 10, color: "#8FA0B2", fontSize: 11, lineHeight: 16 },

  emptyWrap: {
    marginTop: 44,
    alignItems: "center",
    paddingHorizontal: 22,
  },
  emptyIcon: { fontSize: 34, color: "#A8B5C5" },
  emptyTitle: { marginTop: 8, color: "#6C7C91", fontSize: 14, textAlign: "center" },
  bookNowButton: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#1F2E43",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bookNowButtonText: { color: "#FFFFFF", fontWeight: "700" },

  skeletonList: { paddingHorizontal: 16, paddingTop: 10, gap: 12 },
  skeletonCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    backgroundColor: "#FFFCF8",
    padding: 14,
    gap: 8,
  },
  skeletonLineLg: { height: 16, width: "56%", borderRadius: 8, backgroundColor: "#ECE6DE" },
  skeletonLineSm: { height: 12, width: "38%", borderRadius: 8, backgroundColor: "#F0EBE4" },
  skeletonLineMd: { height: 12, width: "72%", borderRadius: 8, backgroundColor: "#F0EBE4" },
  skeletonActionsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  skeletonBtn: { flex: 1, height: 38, borderRadius: 12, backgroundColor: "#EFE9E2" },

  disabled: { opacity: 0.65 },
});
