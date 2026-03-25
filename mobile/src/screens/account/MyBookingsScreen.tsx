import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { cancelBooking, getMyBookings } from "../../api/modules/bookingApi";
import { getEligibleBookingsForFeedback } from "../../api/modules/feedbackApi";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import type { Booking, BookingItem } from "../../types/booking";
import { formatVnd } from "../../utils/currency";
import { canUseCustomerFeatures } from "../../utils/role";

const STATUS_FILTERS = ["all", "pending", "in-progress", "confirmed", "completed", "cancelled"] as const;
const BOOKINGS_PER_PAGE = 6;
type BookingStatusFilter = (typeof STATUS_FILTERS)[number];

type Props = NativeStackScreenProps<AccountStackParamList, "MyBookings">;

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: "Pending", bg: "#FDF1D7", text: "#A8651E", dot: "#D79B45" },
  confirmed: { label: "Confirmed", bg: "#E6EEF4", text: "#506A84", dot: "#6E889F" },
  "in-progress": { label: "In Progress", bg: "#FFE7D9", text: "#BC5B25", dot: "#E17A3B" },
  completed: { label: "Completed", bg: "#EAF4E5", text: "#5F7F56", dot: "#80A06F" },
  cancelled: { label: "Cancelled", bg: "#FCE8E8", text: "#B05050", dot: "#D36A6A" },
};

function getStatusMeta(status?: string) {
  const key = String(status || "pending").toLowerCase();
  return STATUS_META[key] || STATUS_META.pending;
}

function formatDate(input?: string) {
  if (!input) return "N/A";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB");
}

function formatTime(input?: string) {
  if (!input) return "--:--";

  const maybeDate = new Date(input);
  if (!Number.isNaN(maybeDate.getTime())) {
    return maybeDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  const direct = input.match(/\b\d{2}:\d{2}\b/);
  return direct?.[0] || "--:--";
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

function getSearchBlob(booking: Booking) {
  const bookingCode = String(booking.bookingNumber || booking._id || "");
  const petName = getPetName(booking.items?.[0]);
  const services = getServiceSummary(booking.items || []);
  const status = String(booking.status || "");
  return `${bookingCode} ${petName} ${services} ${status}`.toLowerCase();
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
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  const displayedBookings = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return bookings;
    return bookings.filter((booking) => getSearchBlob(booking).includes(keyword));
  }, [bookings, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(displayedBookings.length / BOOKINGS_PER_PAGE));
  }, [displayedBookings.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * BOOKINGS_PER_PAGE;
    return displayedBookings.slice(startIndex, startIndex + BOOKINGS_PER_PAGE);
  }, [currentPage, displayedBookings]);

  const emptyText = useMemo(() => {
    if (searchQuery.trim()) return "No booking matches your search.";
    if (activeStatus === "completed") return "You have no completed bookings yet.";
    if (activeStatus === "pending") return "You currently have no pending bookings.";
    if (activeStatus === "all") return "No bookings found.";
    return `No ${activeStatus} bookings found.`;
  }, [activeStatus, searchQuery]);

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
          

          <Text style={styles.title}>Booking History</Text>

          <Pressable
            style={styles.iconButton}
            onPress={() => {
              setSearchVisible((current) => !current);
              if (searchVisible) {
                setSearchQuery("");
              }
            }}
          >
            <Feather name="search" size={17} color="#A14F22" />
          </Pressable>
        </View>

        {searchVisible ? (
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color="#B98A67" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by pet, code, service..."
              placeholderTextColor="#B59880"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} style={styles.clearSearchButton}>
                <Feather name="x" size={16} color="#A97C59" />
              </Pressable>
            ) : null}
          </View>
        ) : null}
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
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonAvatar} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={styles.skeletonLineLg} />
                  <View style={styles.skeletonLineSm} />
                </View>
                <View style={styles.skeletonBadge} />
              </View>
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
          data={paginatedBookings}
          keyExtractor={(item, index) => `${item._id}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D9763F" />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Feather name="inbox" size={30} color="#C0A790" />
              <Text style={styles.emptyTitle}>{emptyText}</Text>
              {!searchQuery.trim() ? (
                <Pressable style={styles.bookNowButton} onPress={() => navigation.goBack()}>
                  <Text style={styles.bookNowButtonText}>Book a service now</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListFooterComponent={
            displayedBookings.length > BOOKINGS_PER_PAGE ? (
              <View style={styles.paginationWrap}>
                <Pressable
                  style={[styles.pageButton, currentPage <= 1 && styles.pageButtonDisabled]}
                  onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  <Text style={[styles.pageButtonText, currentPage <= 1 && styles.pageButtonTextDisabled]}>Previous</Text>
                </Pressable>

                <Text style={styles.pageInfoText}>{`Page ${currentPage}/${totalPages}`}</Text>

                <Pressable
                  style={[styles.pageButton, currentPage >= totalPages && styles.pageButtonDisabled]}
                  onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <Text style={[styles.pageButtonText, currentPage >= totalPages && styles.pageButtonTextDisabled]}>Next</Text>
                </Pressable>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const statusMeta = getStatusMeta(item.status);
            const isFeedbackEligible = item.status === "completed" && eligibleFeedbackBookingIds.has(item._id);
            const canCancel = canCancelBooking(item.status);
            const canTrack = canTrackBooking(item.status);
            const deadline = isFeedbackEligible ? getFeedbackDeadline(item.bookingDate) : null;
            const firstItem = item.items?.[0];
            const petName = getPetName(firstItem);
            const bookingCode = item.bookingNumber || item._id.slice(-12);

            return (
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardTitleWrap}>
                    <View style={styles.petAvatar}>
                      <Text style={styles.petAvatarText}>{petName.slice(0, 1).toUpperCase()}</Text>
                    </View>

                    <View style={styles.cardTitleTextWrap}>
                      <View style={styles.titleInlineRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{petName}</Text>
                        <Text style={styles.pawText}>🐾</Text>
                      </View>
                      <Text style={styles.bookingCode}>{bookingCode}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}> 
                    <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
                    <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoGroup}>
                    <Feather name="calendar" size={12} color="#9B6A44" />
                    <Text style={styles.infoText}>{formatDate(item.bookingDate)}</Text>
                  </View>
                  <View style={styles.infoGroup}>
                    <Feather name="clock" size={12} color="#9B6A44" />
                    <Text style={styles.infoText}>{formatTime(item.bookingTime || item.bookingDate)}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.servicePriceRow}>
                  <View style={styles.serviceTag}>
                    <Text style={styles.serviceTagText}>{getServiceSummary(item.items || [])}</Text>
                  </View>

                  <View style={styles.priceWrap}>
                    <Text style={styles.totalLabel}>Total Price</Text>
                    <Text style={styles.totalValue}>{formatVnd(item.totalAmount)}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.actionButton, styles.secondaryBtn]}
                    onPress={() => navigation.navigate("BookingDetail", { bookingId: item._id })}
                  >
                    <Feather name="eye" size={14} color="#8E552F" />
                    <Text style={styles.secondaryBtnText}>View Detail</Text>
                  </Pressable>

                  {isFeedbackEligible ? (
                    <Pressable
                      style={[styles.actionButton, styles.primaryBtn]}
                      onPress={() => navigation.navigate("Feedback", { bookingId: item._id })}
                    >
                      <Feather name="star" size={14} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Rate Service</Text>
                    </Pressable>
                  ) : canTrack ? (
                    <Pressable
                      style={[styles.actionButton, styles.primaryBtn]}
                      onPress={() => navigation.navigate("BookingCamera", { bookingId: item._id })}
                    >
                      <Feather name="navigation" size={14} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Track Status</Text>
                    </Pressable>
                  ) : canCancel ? (
                    <Pressable
                      style={[styles.actionButton, styles.cancelBtn, processingId === item._id && styles.disabled]}
                      onPress={() => onCancel(item._id)}
                      disabled={processingId === item._id}
                    >
                      {processingId === item._id ? (
                        <ActivityIndicator color="#A6473E" size="small" />
                      ) : (
                        <>
                          <Feather name="x-circle" size={14} color="#A6473E" />
                          <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                        </>
                      )}
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
  container: { flex: 1, backgroundColor: "#FBF5EF" },
  centeredContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },

  headerWrap: {
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: 10,
    backgroundColor: "#FBF5EF",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9ECDD",
    borderWidth: 1,
    borderColor: "#F0DDC9",
  },
  title: {
    color: "#8B3E0B",
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
  },
  searchBox: {
    marginTop: 10,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0DDCC",
    backgroundColor: "#FFF9F3",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#5D422D",
    fontSize: 13,
    paddingVertical: 0,
  },
  clearSearchButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  filterRowWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 2 },
  filterList: { paddingRight: 12, gap: 8 },
  filterChip: {
    minHeight: 32,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F5E8DA",
    borderWidth: 1,
    borderColor: "#EDDCC8",
  },
  filterChipActive: {
    backgroundColor: "#D8743E",
    borderColor: "#D8743E",
    shadowColor: "#D26F38",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  filterChipText: { color: "#7A553B", fontWeight: "600", fontSize: 12 },
  filterChipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F5CACA",
    backgroundColor: "#FFF1F1",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  errorBannerText: { color: "#B24A45", flex: 1, fontWeight: "600", fontSize: 12 },
  retryButton: {
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAB4B2",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryButtonText: { color: "#B0504A", fontWeight: "700", fontSize: 12 },

  successBanner: {
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D3E7C9",
    backgroundColor: "#EEF8E8",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  successBannerText: { color: "#4E7B3B", fontWeight: "700", fontSize: 12 },

  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30 },
  card: {
    marginBottom: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#F0E3D6",
    backgroundColor: "#FFFCF8",
    padding: 12,
    shadowColor: "#8B6446",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  cardTitleWrap: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  petAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FAE8D7",
    borderWidth: 1,
    borderColor: "#F0D7C2",
    alignItems: "center",
    justifyContent: "center",
  },
  petAvatarText: { color: "#975A33", fontWeight: "800", fontSize: 16 },
  cardTitleTextWrap: { flex: 1 },
  titleInlineRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardTitle: { color: "#2A1C16", fontSize: 17, lineHeight: 21, fontWeight: "700", flexShrink: 1 },
  pawText: { fontSize: 12 },
  bookingCode: { marginTop: 2, color: "#A18672", fontSize: 13, lineHeight: 17, fontWeight: "500" },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 2,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 11, lineHeight: 14, fontWeight: "700" },

  infoRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  infoGroup: { flexDirection: "row", alignItems: "center", gap: 7 },
  infoText: { color: "#795D46", fontSize: 12, lineHeight: 16, fontWeight: "500" },

  divider: { height: 1, backgroundColor: "#F1E5D9", marginTop: 10 },

  servicePriceRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  serviceTag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#F9ECDD",
    borderWidth: 1,
    borderColor: "#F0DDCB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "62%",
  },
  serviceTagText: { color: "#7A5A41", fontSize: 11, fontWeight: "600" },

  priceWrap: { alignItems: "flex-end" },
  totalLabel: { color: "#A5866E", fontSize: 11, fontWeight: "500" },
  totalValue: { color: "#9C4F1D", fontSize: 24, lineHeight: 28, fontWeight: "800" },

  actionRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  actionButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#EBD4BF",
    backgroundColor: "#F7E4D0",
  },
  secondaryBtnText: { color: "#8E552F", fontSize: 12, lineHeight: 16, fontWeight: "700" },
  primaryBtn: {
    backgroundColor: "#D8743E",
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 12, lineHeight: 16, fontWeight: "700" },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#E8C5C2",
    backgroundColor: "#FBEAEA",
  },
  cancelBtnText: { color: "#A6473E", fontSize: 12, lineHeight: 16, fontWeight: "700" },

  feedbackHint: { marginTop: 8, color: "#9A7F6B", fontSize: 11, lineHeight: 15 },

  emptyWrap: {
    marginTop: 50,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: { marginTop: 10, color: "#8D6F58", fontSize: 13, textAlign: "center" },
  bookNowButton: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#D7743E",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bookNowButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },

  skeletonList: { paddingHorizontal: 16, paddingTop: 10, gap: 12 },
  skeletonCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EFE2D5",
    backgroundColor: "#FFFCF9",
    padding: 14,
    gap: 10,
  },
  skeletonRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  skeletonAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#F0E6DB" },
  skeletonBadge: { width: 84, height: 26, borderRadius: 13, backgroundColor: "#F0E6DB" },
  skeletonLineLg: { height: 16, width: "64%", borderRadius: 8, backgroundColor: "#EFE7DD" },
  skeletonLineSm: { height: 12, width: "38%", borderRadius: 8, backgroundColor: "#F3ECE3" },
  skeletonLineMd: { height: 12, width: "72%", borderRadius: 8, backgroundColor: "#F3ECE3" },
  skeletonActionsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  skeletonBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: "#EFE7DD" },

  paginationWrap: {
    marginTop: 4,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pageButton: {
    minWidth: 84,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7D2BF",
    backgroundColor: "#FFF8F0",
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    color: "#8A5633",
    fontSize: 12,
    fontWeight: "700",
  },
  pageButtonTextDisabled: {
    color: "#B79A84",
  },
  pageInfoText: {
    minWidth: 88,
    textAlign: "center",
    color: "#8A6E56",
    fontSize: 12,
    fontWeight: "600",
  },

  disabled: { opacity: 0.65 },
});
