import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { getAllBookings, updateBookingStatus, uploadBookingProgressImage } from "../../api/modules/bookingApi";
import { useAuth } from "../../context/AuthContext";
import type { StaffManagementStackParamList } from "../../navigation/types";
import type { Booking, BookingItem } from "../../types/booking";
import { resolveImageList } from "../../utils/image";
import { isStaffOrAdminRole } from "../../utils/role";

type StatusTabKey = "all" | "pending" | "accepted" | "in-progress" | "completed" | "cancelled";

function normalizeStatus(status?: string): StatusTabKey {
  const raw = String(status || "pending").toLowerCase();
  if (raw === "pending") return "pending";
  if (raw === "confirmed" || raw === "accepted") return "accepted";
  if (raw === "in-progress") return "in-progress";
  if (raw === "completed") return "completed";
  if (raw === "cancelled") return "cancelled";
  return "pending";
}

function formatDate(input?: string) {
  if (!input) return "--/--/----";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "--/--/----";
  return d.toLocaleDateString();
}

function formatDateTime(input?: string) {
  if (!input) return "--";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleString();
}

function formatTime(input?: string) {
  if (!input) return "--:--";
  if (/^\d{1,2}:\d{2}/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString()} đ`;
}

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

function extractCustomer(booking: Booking) {
  const source = booking as Booking & {
    customer?: { name?: string; email?: string; phone?: string };
    user?: { name?: string; email?: string; phone?: string };
    guestInfo?: { name?: string; email?: string; phone?: string };
    assignedStaff?: { name?: string; email?: string };
    staff?: { name?: string; email?: string };
  };

  return {
    name: source.customer?.name || source.user?.name || source.guestInfo?.name || "Guest Customer",
    email: source.customer?.email || source.user?.email || source.guestInfo?.email || "no-email@example.com",
    phone: source.customer?.phone || source.user?.phone || source.guestInfo?.phone || "",
    assignedStaffName: source.assignedStaff?.name || source.staff?.name || "",
    assignedStaffEmail: source.assignedStaff?.email || source.staff?.email || "",
  };
}

function extractPetName(item?: BookingItem) {
  if (!item?.pet) return "Pet";
  if (typeof item.pet === "string") return "Pet";
  return item.pet.petName || "Pet";
}

function extractServiceName(item: BookingItem) {
  if (typeof item.service === "string") return "Service";
  return item.service?.name || "Service";
}

function extractServiceTags(items: BookingItem[]) {
  const names = items.map(extractServiceName).filter(Boolean);
  return Array.from(new Set(names));
}

function getServiceTypeTag(item: BookingItem) {
  const group = String(item.group || "").toLowerCase();
  if (group.includes("wet")) return "Wet";
  if (group.includes("dry")) return "Dry";
  if (group.includes("spa")) return "Spa";
  return "Service";
}

function getPaymentMeta(booking: Booking) {
  const source = booking as Booking & {
    paymentStatus?: string;
    payment?: { status?: string };
  };

  const rawStatus = String(source.paymentStatus || source.payment?.status || "").toLowerCase();
  const isPaid = rawStatus.includes("paid") || rawStatus === "completed" || booking.status === "completed";

  return {
    method: String(booking.paymentMethod || "wallet").replace(/_/g, " "),
    paidLabel: isPaid ? "Paid" : "Unpaid",
    paidBg: isPaid ? "#E9F7EE" : "#FDF0F1",
    paidText: isPaid ? "#2A7F4A" : "#B14756",
  };
}

type StaffAction = {
  nextStatus: "confirmed" | "in-progress" | "completed" | null;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  requiresPhoto: boolean;
};

function getNextStaffAction(status?: string): StaffAction {
  const normalized = normalizeStatus(status);
  if (normalized === "pending") {
    return { nextStatus: "confirmed", label: "Accept Order", icon: "user-plus", requiresPhoto: false };
  }
  if (normalized === "accepted") {
    return { nextStatus: "in-progress", label: "Check-in & Start", icon: "camera", requiresPhoto: true };
  }
  if (normalized === "in-progress") {
    return { nextStatus: "completed", label: "Check-out & Complete", icon: "camera", requiresPhoto: true };
  }
  return { nextStatus: null, label: "Order Already Processed", icon: "check", requiresPhoto: false };
}

function getProgressImages(booking?: Booking | null) {
  const checkIn = resolveImageList(booking?.serviceProgress?.checkInPhotos || []);
  const checkOut = resolveImageList(booking?.serviceProgress?.checkOutPhotos || []);
  return { checkIn, checkOut };
}

function getStatusBadge(status?: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "accepted") {
    return { label: "Accepted", bg: "#EAF2FF", text: "#2E67C3" };
  }
  if (normalized === "in-progress") {
    return { label: "In Progress", bg: "#F4EDFF", text: "#7A42CB" };
  }
  if (normalized === "completed") {
    return { label: "Completed", bg: "#E5F7EC", text: "#25834D" };
  }
  if (normalized === "cancelled") {
    return { label: "Cancelled", bg: "#FDECEF", text: "#B24251" };
  }
  return { label: "Pending", bg: "#FFF2E5", text: "#B46730" };
}

const STATUS_TABS: Array<{
  key: StatusTabKey;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  tintBg: string;
  tintText: string;
}> = [
  { key: "all", label: "All", icon: "grid", tintBg: "#E7F5E8", tintText: "#2F7C41" },
  { key: "pending", label: "Pending", icon: "clock", tintBg: "#FFF2E5", tintText: "#B46730" },
  { key: "accepted", label: "Accepted", icon: "check-circle", tintBg: "#EAF2FF", tintText: "#2F68C4" },
  { key: "in-progress", label: "In Progress", icon: "play-circle", tintBg: "#F4EDFF", tintText: "#7A42CB" },
  { key: "completed", label: "Completed", icon: "check", tintBg: "#E5F7EC", tintText: "#23844D" },
  { key: "cancelled", label: "Cancelled", icon: "x-circle", tintBg: "#FDECEF", tintText: "#B43B4A" },
];

function StatusPill({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}> 
      <Text style={[styles.statusPillText, { color: text }]}>{label}</Text>
    </View>
  );
}

interface StaffBookingsScreenProps {
  mode?: "staff" | "admin-readonly";
  headingTitle?: string;
  headingSubtitle?: string;
}

export function StaffBookingsScreen({
  mode = "staff",
  headingTitle,
  headingSubtitle,
}: StaffBookingsScreenProps = {}) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dateFilterAnchorRef = useRef<View>(null);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const { user } = useAuth();
  const isReadOnly = mode === "admin-readonly";
  const canAccess = isStaffOrAdminRole(user?.role);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTabKey>("pending");
  const [searchText, setSearchText] = useState("");
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [filterPickerVisible, setFilterPickerVisible] = useState(false);
  const [filterCalendarMonth, setFilterCalendarMonth] = useState(new Date());
  const [filterAnchorFrame, setFilterAnchorFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const loadData = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    setError("");

    try {
      const data = await getAllBookings();
      const sorted = data.slice().sort((left, right) => {
        const leftTime = new Date(left.bookingDate || "").getTime();
        const rightTime = new Date(right.bookingDate || "").getTime();
        return rightTime - leftTime;
      });
      setBookings(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canAccess]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      if (!canAccess) return;

      loadData();

      const params = (route.params || {}) as StaffManagementStackParamList["StaffBookings"];
      if (params?.toastMessage) {
        setSuccessMessage(params.toastMessage);
      }

      if (params?.toastMessage || params?.refreshAt) {
        navigation.setParams({ toastMessage: undefined, refreshAt: undefined });
      }
    }, [canAccess, loadData, navigation, route.params]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const selectedFilterDateKey = useMemo(() => (filterDate ? toDateKey(filterDate) : ""), [filterDate]);
  const calendarCells = useMemo(() => getCalendarCells(filterCalendarMonth), [filterCalendarMonth]);
  const useBottomSheetPicker = viewportHeight < 680 || !filterAnchorFrame;

  const openFilterPicker = useCallback(() => {
    setFilterCalendarMonth(filterDate || new Date());
    dateFilterAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setFilterAnchorFrame({ x, y, width, height });
      setFilterPickerVisible(true);
    });
  }, [filterDate]);

  const closeFilterPicker = useCallback(() => {
    setFilterPickerVisible(false);
  }, []);

  const jumpCalendarMonth = useCallback((offset: number) => {
    setFilterCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const selectFilterDate = useCallback((date: Date) => {
    setFilterDate(date);
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

    const width = Math.max(264, Math.min(304, Math.floor(filterAnchorFrame.width + 38)));
    const left = Math.max(12, Math.min(filterAnchorFrame.x, viewportWidth - width - 12));
    const belowTop = filterAnchorFrame.y + filterAnchorFrame.height + 6;
    const estimatedHeight = 322;
    const top = belowTop + estimatedHeight < viewportHeight - 16
      ? belowTop
      : Math.max(82, filterAnchorFrame.y - estimatedHeight - 8);

    return { width, left, top };
  }, [filterAnchorFrame, viewportHeight, viewportWidth]);

  const searchedData = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return bookings.filter((booking) => {
      if (selectedFilterDateKey && String(booking.bookingDate || "").slice(0, 10) !== selectedFilterDateKey) {
        return false;
      }

      if (!normalizedSearch) return true;

      const customer = extractCustomer(booking);
      const candidate = [booking.bookingNumber || "", booking._id, customer.name, customer.email, customer.phone].join(" ").toLowerCase();
      return candidate.includes(normalizedSearch);
    });
  }, [bookings, searchText, selectedFilterDateKey]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusTabKey, number> = {
      all: searchedData.length,
      pending: 0,
      accepted: 0,
      "in-progress": 0,
      completed: 0,
      cancelled: 0,
    };

    searchedData.forEach((item) => {
      const normalized = normalizeStatus(item.status);
      if (normalized === "pending" || normalized === "accepted" || normalized === "in-progress" || normalized === "completed" || normalized === "cancelled") {
        counts[normalized] += 1;
      }
    });

    return counts;
  }, [searchedData]);

  const visibleData = useMemo(() => {
    if (activeTab === "all") return searchedData;
    return searchedData.filter((item) => normalizeStatus(item.status) === activeTab);
  }, [activeTab, searchedData]);

  const onUpdateStatus = useCallback(
    async (bookingId: string, targetStatus: "confirmed" | "in-progress" | "completed") => {
      setProcessingId(bookingId);
      setSuccessMessage("");
      setError("");

      try {
        if (targetStatus === "confirmed") {
          await updateBookingStatus(bookingId, { status: "confirmed" });
          setSuccessMessage("Order accepted successfully.");
        } else {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            throw new Error("Camera permission is required for check-in/check-out photo.");
          }

          let photoResult: ImagePicker.ImagePickerResult;
          try {
            photoResult = await ImagePicker.launchCameraAsync({
              quality: 0.8,
              allowsEditing: false,
              exif: false,
            });
          } catch (cameraErr) {
            const rawMessage = cameraErr instanceof Error ? cameraErr.message : "";
            if (rawMessage.toLowerCase().includes("failed to resolve activity")) {
              throw new Error(
                "Cannot open camera on this emulator/device. Please test on a real phone or install/enable a Camera app.",
              );
            }
            throw cameraErr;
          }

          if (photoResult.canceled || !photoResult.assets?.length) {
            throw new Error("You must capture a photo to continue.");
          }

          const asset = photoResult.assets[0];
          const uploadedUrl = await uploadBookingProgressImage({
            uri: asset.uri,
            type: asset.mimeType || "image/jpeg",
            fileName: asset.fileName || `booking-${targetStatus}-${Date.now()}.jpg`,
          });

          if (!uploadedUrl) {
            throw new Error("Unable to upload progress image.");
          }

          const stageLabel = targetStatus === "in-progress" ? "check-in" : "check-out";
          await updateBookingStatus(bookingId, {
            status: targetStatus,
            medicalRecord: {
              notes: `Staff ${stageLabel} captured via mobile camera`,
              photos: [uploadedUrl],
            },
          });

          setSuccessMessage(targetStatus === "in-progress" ? "Service started with check-in photo." : "Service completed with check-out photo.");
        }

        await loadData();

        setSelectedBooking((prev) => {
          if (!prev || prev._id !== bookingId) return prev;
          return { ...prev, status: targetStatus };
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unable to update booking status";
        setError(message);
        Alert.alert("Update failed", message);
      } finally {
        setProcessingId(null);
      }
    },
    [loadData],
  );

  const openDetailModal = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setDetailVisible(true);
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailVisible(false);
  }, []);

  const navigateToOfflineOrder = useCallback(() => {
    navigation.navigate("StaffOfflineOrder");
  }, [navigation]);

  const selectedStatus = selectedBooking ? getStatusBadge(selectedBooking.status) : null;
  const selectedPayment = selectedBooking ? getPaymentMeta(selectedBooking) : null;
  const selectedCustomer = selectedBooking ? extractCustomer(selectedBooking) : null;
  const selectedServices = selectedBooking?.items || [];
  const selectedAction = selectedBooking
    ? getNextStaffAction(selectedBooking.status)
    : ({ nextStatus: null, label: "Order Already Processed", icon: "check", requiresPhoto: false } as StaffAction);
  const canRunSelectedAction = selectedBooking
    ? !isReadOnly && user?.role === "staff" && Boolean(selectedAction.nextStatus)
    : false;
  const selectedProgressImages = getProgressImages(selectedBooking);

  if (!canAccess) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>This page is only available for staff/admin.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleData}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D9854D" />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View>
              <Text style={styles.title}>{headingTitle || (isReadOnly ? "Booking Management" : "Process Bookings")}</Text>
              <Text style={styles.subtitle}>
                {headingSubtitle || (isReadOnly ? "View and monitor all bookings" : "Receive and process service booking orders")}
              </Text>
            </View>

            <View style={styles.searchPanel}>
              <View style={styles.searchInputWrap}>
                <Feather name="search" size={18} color="#D07B45" />
                <TextInput
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search by code, name, email, phone..."
                  placeholderTextColor="#A8AFBB"
                />
              </View>

              <View style={styles.filterActionRow}>
                <View style={styles.dateFilterRow}>
                  <View ref={dateFilterAnchorRef} collapsable={false} style={styles.dateAnchorWrap}>
                    <Pressable
                      style={[styles.dateDropdownBtn, filterDate && styles.dateDropdownBtnActive]}
                      onPress={() => (filterPickerVisible ? closeFilterPicker() : openFilterPicker())}
                    >
                      <Feather name="calendar" size={14} color={filterDate ? "#C16A36" : "#98A4B4"} />
                      <Text style={[styles.dateDropdownText, filterDate && styles.dateDropdownTextActive]}>
                        {filterDate ? formatDate(filterDate.toISOString()) : "dd/mm/yyyy"}
                      </Text>
                      <Feather name="chevron-down" size={14} color="#9BA7B7" />
                    </Pressable>
                  </View>

                  {filterDate ? (
                    <Pressable style={styles.clearDateBtn} onPress={() => setFilterDate(null)}>
                      <Feather name="x" size={13} color="#A46C46" />
                    </Pressable>
                  ) : null}
                </View>

                {!isReadOnly ? (
                  <Pressable style={styles.createOrderBtn} onPress={navigateToOfflineOrder}>
                    <Feather name="plus" size={16} color="#FFFFFF" />
                    <Text style={styles.createOrderText}>Create Offline Order</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsWrap}>
              {STATUS_TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    style={[
                      styles.tabChip,
                      { borderColor: tab.tintBg, backgroundColor: active ? tab.tintBg : "#FFFFFF" },
                    ]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Feather name={tab.icon} size={15} color={tab.tintText} />
                    <Text style={[styles.tabChipText, { color: tab.tintText }]}>{tab.label}</Text>
                    <View style={styles.tabCountBadge}>
                      <Text style={styles.tabCountText}>{statusCounts[tab.key]}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>{successMessage}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#D9854D" />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No booking records found.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const customer = extractCustomer(item);
          const statusBadge = getStatusBadge(item.status);
          const serviceTags = extractServiceTags(item.items);
          const paymentMeta = getPaymentMeta(item);
          const action = getNextStaffAction(item.status);
          const canAct = !isReadOnly && user?.role === "staff" && Boolean(action.nextStatus);

          return (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardTopLeft}>
                  <Text style={styles.bookingCode}>{item.bookingNumber || `#${item._id.slice(-8)}`}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}> 
                    <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>{statusBadge.label}</Text>
                  </View>
                </View>

                <Pressable style={styles.eyeButton} onPress={() => openDetailModal(item)}>
                  <Feather name="eye" size={18} color="#6A7F98" />
                </Pressable>
              </View>

              <View style={styles.customerRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{customer.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName} numberOfLines={1}>{customer.name}</Text>
                  <Text style={styles.customerEmail} numberOfLines={1}>{customer.email}</Text>
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateCell}>
                  <Feather name="calendar" size={15} color="#B26835" />
                  <Text style={styles.dateText}>{formatDate(item.bookingDate)}</Text>
                </View>
                <View style={styles.dateCell}>
                  <Feather name="clock" size={15} color="#B26835" />
                  <Text style={styles.dateText}>{formatTime(item.bookingTime || item.bookingDate)}</Text>
                </View>
              </View>

              <View style={styles.servicesSection}>
                <Text style={styles.servicesLabel}>SERVICES ({serviceTags.length})</Text>
                <View style={styles.tagsWrap}>
                  {serviceTags.slice(0, 3).map((tag) => (
                    <View key={tag} style={styles.serviceTag}>
                      <Text style={styles.serviceTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.paymentRow}>
                <View style={styles.paymentLeft}>
                  <Feather name="credit-card" size={14} color="#7B8797" />
                  <Text style={styles.paymentMethod}>{paymentMeta.method}</Text>
                  <View style={[styles.paidBadge, { backgroundColor: paymentMeta.paidBg }]}> 
                    <Text style={[styles.paidBadgeText, { color: paymentMeta.paidText }]}>{paymentMeta.paidLabel}</Text>
                  </View>
                </View>
                <Text style={styles.totalPrice}>{formatMoney(item.totalAmount)}</Text>
              </View>

              {canAct && action.nextStatus ? (
                <Pressable
                  style={[styles.acceptButton, processingId === item._id && styles.disabled]}
                  onPress={() => {
                    if (!action.nextStatus) return;
                    onUpdateStatus(item._id, action.nextStatus);
                  }}
                  disabled={processingId === item._id}
                >
                  {processingId === item._id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name={action.icon} size={16} color="#FFFFFF" />
                      <Text style={styles.acceptButtonText}>{action.label}</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />

      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={closeDetailModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeDetailModal} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTexts}>
                <Text style={styles.modalTitle}>Order Information</Text>
                <Text style={styles.modalCode}>{selectedBooking?.bookingNumber || (selectedBooking ? `#${selectedBooking._id.slice(-8)}` : "")}</Text>
              </View>
              <Pressable style={styles.modalCloseBtn} onPress={closeDetailModal}>
                <Feather name="x" size={17} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} showsVerticalScrollIndicator={false}>
              <View style={styles.badgesRow}>
                {selectedStatus ? <StatusPill label={selectedStatus.label} bg={selectedStatus.bg} text={selectedStatus.text} /> : null}
                {selectedPayment ? (
                  <StatusPill label={selectedPayment.paidLabel} bg={selectedPayment.paidBg} text={selectedPayment.paidText} />
                ) : null}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Customer Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoRowCompact}>
                    <Feather name="user" size={13} color="#A66A45" />
                    <Text style={styles.infoValue} numberOfLines={1}>{selectedCustomer?.name || "-"}</Text>
                  </View>
                  <View style={styles.infoRowCompact}>
                    <Feather name="mail" size={13} color="#A66A45" />
                    <Text style={styles.infoValueMuted} numberOfLines={1}>{selectedCustomer?.email || "-"}</Text>
                  </View>
                  {selectedCustomer?.phone ? (
                    <View style={styles.infoRowCompact}>
                      <Feather name="phone" size={13} color="#A66A45" />
                      <Text style={styles.infoValueMuted} numberOfLines={1}>{selectedCustomer.phone}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Booking Information</Text>
                <View style={styles.bookingInfoInline}>
                  <View style={styles.infoRowCompactInline}>
                    <Feather name="calendar" size={13} color="#A66A45" />
                    <Text style={styles.infoValue}>{formatDate(selectedBooking?.bookingDate)}</Text>
                  </View>
                  <View style={styles.infoRowCompactInline}>
                    <Feather name="clock" size={13} color="#A66A45" />
                    <Text style={styles.infoValue}>{formatTime(selectedBooking?.bookingTime || selectedBooking?.bookingDate)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Booked Services</Text>
                {selectedServices.length === 0 ? (
                  <View style={styles.emptyStateRow}>
                    <Feather name="inbox" size={13} color="#AEB8C6" />
                    <Text style={styles.emptyStateText}>No services added.</Text>
                  </View>
                ) : (
                  <View style={styles.servicesList}>
                    {selectedServices.map((service, index) => (
                      <View key={`${service._id || "svc"}-${index}`} style={styles.modalServiceRow}>
                        <View style={styles.modalServiceMain}>
                          <View style={styles.modalServiceTop}>
                            <Feather name="scissors" size={12} color="#B36835" />
                            <Text style={styles.modalServiceName} numberOfLines={1}>{extractServiceName(service)}</Text>
                            <View style={styles.modalServiceTypeTag}>
                              <Text style={styles.modalServiceTypeText}>{getServiceTypeTag(service)}</Text>
                            </View>
                          </View>
                          <Text style={styles.modalServiceMeta}>
                            {extractPetName(service)} · Qty {service.quantity || 1}
                          </Text>
                        </View>
                        <Text style={styles.modalServicePrice}>{formatMoney(service.price)}</Text>
                      </View>
                    ))}

                    <View style={styles.modalTotalRow}>
                      <Text style={styles.modalTotalLabel}>Total</Text>
                      <Text style={styles.modalTotalValue}>{formatMoney(selectedBooking?.totalAmount)}</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Service Progress Images</Text>

                <Text style={styles.progressGroupTitle}>Check-in</Text>
                {selectedProgressImages.checkIn.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressImagesRow}>
                    {selectedProgressImages.checkIn.map((uri, index) => (
                      <Image key={`${uri}-${index}`} source={{ uri }} style={styles.progressImageThumb} />
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyStateRow}>
                    <Feather name="image" size={13} color="#AEB8C6" />
                    <Text style={styles.emptyStateText}>No check-in images yet.</Text>
                  </View>
                )}

                <Text style={[styles.progressGroupTitle, { marginTop: 8 }]}>Check-out</Text>
                {selectedProgressImages.checkOut.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressImagesRow}>
                    {selectedProgressImages.checkOut.map((uri, index) => (
                      <Image key={`${uri}-${index}`} source={{ uri }} style={styles.progressImageThumb} />
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyStateRow}>
                    <Feather name="image" size={13} color="#AEB8C6" />
                    <Text style={styles.emptyStateText}>No check-out images yet.</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Assigned Staff</Text>
                {selectedCustomer?.assignedStaffName ? (
                  <View style={styles.infoRowCompact}>
                    <Feather name="user-check" size={13} color="#B36835" />
                    <View style={styles.staffBoxTexts}>
                      <Text style={styles.staffName}>{selectedCustomer.assignedStaffName}</Text>
                      <Text style={styles.staffEmail}>{selectedCustomer.assignedStaffEmail || "No email"}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyStateRow}>
                    <Feather name="users" size={13} color="#AEB8C6" />
                    <Text style={styles.emptyStateText}>No staff assigned.</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalSectionCompact}>
                <Text style={styles.createdText}>Created {formatDateTime(selectedBooking?.bookingDate)}</Text>
              </View>
            </ScrollView>

            {!isReadOnly ? (
              <View style={styles.modalFooter}>
                <Pressable
                  style={[styles.modalActionBtn, (!canRunSelectedAction || !selectedBooking || processingId === selectedBooking._id) && styles.modalActionBtnDisabled]}
                  disabled={!canRunSelectedAction || !selectedBooking || processingId === selectedBooking._id}
                  onPress={() => {
                    if (!selectedBooking || !selectedAction.nextStatus) return;
                    onUpdateStatus(selectedBooking._id, selectedAction.nextStatus);
                  }}
                >
                  {selectedBooking && processingId === selectedBooking._id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name={selectedAction.icon} size={16} color="#FFFFFF" />
                      <Text style={styles.modalActionText}>{canRunSelectedAction ? selectedAction.label : "Order Already Processed"}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={filterPickerVisible} transparent animationType="fade" onRequestClose={() => setFilterPickerVisible(false)}>
        {useBottomSheetPicker ? (
          <View style={styles.filterPickerOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeFilterPicker} />

            <View style={styles.filterBottomSheet}>
              <View style={styles.filterBottomHandle} />
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeaderRow}>
                  <Text style={styles.calendarMonthTitle}>
                    {filterCalendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
                  </Text>

                  <View style={styles.calendarNavWrap}>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpCalendarMonth(-1)}>
                      <Feather name="chevron-left" size={15} color="#7C889A" />
                    </Pressable>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpCalendarMonth(1)}>
                      <Feather name="chevron-right" size={15} color="#7C889A" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.calendarWeekRow}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <Text key={`${day}-${index}`} style={styles.calendarWeekText}>{day}</Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarCells.map((cell) => {
                    const active = filterDate ? isSameDay(cell.date, filterDate) : false;
                    const isToday = isSameDay(cell.date, new Date());

                    return (
                      <Pressable
                        key={cell.date.toISOString()}
                        style={[
                          styles.calendarDayCell,
                          active && styles.calendarDayCellActive,
                          isToday && !active && styles.calendarDayCellToday,
                        ]}
                        onPress={() => selectFilterDate(cell.date)}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            !cell.inMonth && styles.calendarDayTextMuted,
                            active && styles.calendarDayTextActive,
                            isToday && !active && styles.calendarDayTextToday,
                          ]}
                        >
                          {cell.date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.calendarFooterRow}>
                  {filterDate ? (
                    <Pressable
                      style={styles.calendarTextBtn}
                      onPress={() => {
                        setFilterDate(null);
                        setFilterPickerVisible(false);
                      }}
                    >
                      <Text style={styles.calendarTextBtnLabel}>Clear</Text>
                    </Pressable>
                  ) : <View />}

                  <Pressable style={styles.calendarTextBtn} onPress={closeFilterPicker}>
                    <Text style={styles.calendarTextBtnLabel}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.filterPickerPopoverContainer}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeFilterPicker} />

            <View
              style={[
                styles.filterPickerPopoverCard,
                {
                  top: calendarPopoverMetrics.top,
                  left: calendarPopoverMetrics.left,
                  width: calendarPopoverMetrics.width,
                },
              ]}
            >
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeaderRow}>
                  <Text style={styles.calendarMonthTitle}>
                    {filterCalendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
                  </Text>

                  <View style={styles.calendarNavWrap}>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpCalendarMonth(-1)}>
                      <Feather name="chevron-left" size={15} color="#7C889A" />
                    </Pressable>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpCalendarMonth(1)}>
                      <Feather name="chevron-right" size={15} color="#7C889A" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.calendarWeekRow}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <Text key={`${day}-${index}`} style={styles.calendarWeekText}>{day}</Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarCells.map((cell) => {
                    const active = filterDate ? isSameDay(cell.date, filterDate) : false;
                    const isToday = isSameDay(cell.date, new Date());

                    return (
                      <Pressable
                        key={cell.date.toISOString()}
                        style={[
                          styles.calendarDayCell,
                          active && styles.calendarDayCellActive,
                          isToday && !active && styles.calendarDayCellToday,
                        ]}
                        onPress={() => selectFilterDate(cell.date)}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            !cell.inMonth && styles.calendarDayTextMuted,
                            active && styles.calendarDayTextActive,
                            isToday && !active && styles.calendarDayTextToday,
                          ]}
                        >
                          {cell.date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.calendarFooterRow}>
                  {filterDate ? (
                    <Pressable
                      style={styles.calendarTextBtn}
                      onPress={() => {
                        setFilterDate(null);
                        setFilterPickerVisible(false);
                      }}
                    >
                      <Text style={styles.calendarTextBtnLabel}>Clear</Text>
                    </Pressable>
                  ) : <View />}

                  <Pressable style={styles.calendarTextBtn} onPress={closeFilterPicker}>
                    <Text style={styles.calendarTextBtnLabel}>Close</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF8F2",
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#B43B4A",
    fontSize: 14,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 26,
    gap: 10,
  },
  headerBlock: {
    gap: 10,
    paddingBottom: 4,
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
  searchPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEE2D4",
    backgroundColor: "#FFFDF9",
    padding: 10,
    gap: 9,
    shadowColor: "#584632",
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchInputWrap: {
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
    fontSize: 16,
    paddingVertical: 0,
  },
  filterActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dateFilterRow: {
    flexDirection: "row",
    gap: 7,
    flex: 1,
    alignItems: "center",
  },
  dateAnchorWrap: {
    flex: 1,
  },
  dateDropdownBtn: {
    minHeight: 40,
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7D8C9",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
  },
  dateDropdownBtnActive: {
    borderColor: "#E5C5AA",
    backgroundColor: "#FFF5EA",
  },
  dateDropdownText: {
    flex: 1,
    color: "#7A899A",
    fontSize: 13,
    fontWeight: "700",
  },
  dateDropdownTextActive: {
    color: "#C16A36",
  },
  clearDateBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E7D8C9",
    backgroundColor: "#FFF7EE",
    alignItems: "center",
    justifyContent: "center",
  },
  createOrderBtn: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: "#D77D46",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  createOrderText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  calendarCard: {
    width: "100%",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#ECDFD2",
    backgroundColor: "#FFFEFB",
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 7,
    shadowColor: "#5E4A39",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  calendarMonthTitle: {
    color: "#3D536E",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  calendarNavWrap: {
    flexDirection: "row",
    alignItems: "center",
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
  calendarWeekRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  calendarWeekText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#9AA6B5",
    fontSize: 10,
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  calendarDayCellToday: {
    borderWidth: 1,
    borderColor: "#E7D3C2",
    backgroundColor: "#FFF6EC",
  },
  calendarDayCellActive: {
    borderWidth: 1,
    borderColor: "#E2BFA3",
    backgroundColor: "#F4D9C3",
  },
  calendarDayText: {
    color: "#415773",
    fontSize: 12,
    fontWeight: "700",
  },
  calendarDayTextMuted: {
    color: "#C7CED8",
    opacity: 0.42,
  },
  calendarDayTextToday: {
    color: "#C16936",
  },
  calendarDayTextActive: {
    color: "#8E4E2A",
  },
  calendarFooterRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  filterPickerPopoverContainer: {
    flex: 1,
    backgroundColor: "rgba(20, 31, 49, 0.08)",
  },
  filterPickerPopoverCard: {
    position: "absolute",
    borderRadius: 13,
    overflow: "hidden",
  },
  tabsWrap: {
    paddingTop: 2,
    paddingBottom: 3,
    gap: 8,
  },
  tabChip: {
    minHeight: 40,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
  },
  tabChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  tabCountBadge: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  tabCountText: {
    color: "#49617B",
    fontSize: 12,
    fontWeight: "800",
  },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F4C8CF",
    backgroundColor: "#FDF0F3",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorBannerText: {
    color: "#B43B4A",
    fontSize: 13,
    fontWeight: "700",
  },
  successBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFE8D7",
    backgroundColor: "#EEF8F1",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  successBannerText: {
    color: "#2C7F4A",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 34,
  },
  emptyTitle: {
    color: "#6D7D90",
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8DFD3",
    backgroundColor: "#FFFEFC",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 9,
    shadowColor: "#5A4735",
    shadowOpacity: 0.06,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    flex: 1,
  },
  bookingCode: {
    color: "#293A52",
    fontSize: 16,
    fontWeight: "800",
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
  eyeButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F0EB",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F6E6D7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#B36835",
    fontSize: 16,
    fontWeight: "800",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    color: "#1D3148",
    fontSize: 16,
    fontWeight: "800",
  },
  customerEmail: {
    color: "#72839A",
    fontSize: 13,
    marginTop: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  dateCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    color: "#5D7188",
    fontSize: 13,
    fontWeight: "600",
  },
  servicesSection: {
    borderTopWidth: 1,
    borderTopColor: "#F1E9DE",
    paddingTop: 8,
    gap: 6,
  },
  servicesLabel: {
    color: "#7C8C9F",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  serviceTag: {
    borderRadius: 999,
    backgroundColor: "#F5EDE3",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  serviceTagText: {
    color: "#7B624F",
    fontSize: 12,
    fontWeight: "700",
  },
  paymentRow: {
    marginTop: 1,
    borderTopWidth: 1,
    borderTopColor: "#F1E9DE",
    paddingTop: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  paymentMethod: {
    color: "#6D7D93",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  paidBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  totalPrice: {
    color: "#C26B35",
    fontSize: 24,
    fontWeight: "800",
  },
  acceptButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#D77D46",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.7,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 31, 49, 0.36)",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  modalCard: {
    maxHeight: "86%",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EFDCCA",
    backgroundColor: "#FFFCF8",
    overflow: "hidden",
  },
  modalHeader: {
    backgroundColor: "#D77E48",
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderTexts: {
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  modalCode: {
    marginTop: 1,
    color: "#FCE9DA",
    fontSize: 11,
    fontWeight: "700",
  },
  modalCloseBtn: {
    width: 29,
    height: 29,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  modalBody: {
    maxHeight: "79%",
  },
  modalBodyContent: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 7,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  modalSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1E4D7",
    paddingVertical: 6,
    gap: 5,
  },
  modalSectionCompact: {
    paddingTop: 1,
    paddingBottom: 2,
  },
  modalSectionTitle: {
    color: "#2A3B52",
    fontSize: 13,
    fontWeight: "800",
  },
  infoGrid: {
    gap: 4,
  },
  infoRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bookingInfoInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  infoRowCompactInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoValue: {
    color: "#2B3D55",
    fontSize: 12,
    fontWeight: "700",
  },
  infoValueMuted: {
    flex: 1,
    color: "#63768D",
    fontSize: 12,
    fontWeight: "600",
  },
  servicesList: {
    gap: 4,
  },
  modalServiceRow: {
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3E9DF",
  },
  modalServiceMain: {
    flex: 1,
  },
  modalServiceTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  modalServiceName: {
    color: "#23374F",
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  modalServiceTypeTag: {
    borderRadius: 999,
    backgroundColor: "#FDEEDC",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modalServiceTypeText: {
    color: "#B96A34",
    fontSize: 9,
    fontWeight: "800",
  },
  modalServiceMeta: {
    marginTop: 2,
    color: "#7A8A9E",
    fontSize: 11,
    fontWeight: "600",
  },
  modalServicePrice: {
    color: "#C16A36",
    fontSize: 13,
    fontWeight: "800",
  },
  modalTotalRow: {
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTotalLabel: {
    color: "#79889D",
    fontSize: 11,
    fontWeight: "700",
  },
  modalTotalValue: {
    color: "#C16A36",
    fontSize: 17,
    fontWeight: "900",
  },
  emptyStateRow: {
    minHeight: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#F3E7DA",
    backgroundColor: "#FFF9F1",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  emptyStateText: {
    color: "#8693A4",
    fontSize: 11,
  },
  progressGroupTitle: {
    color: "#7A8A9D",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  progressImagesRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  progressImageThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8DBCD",
    backgroundColor: "#F4EEE8",
  },
  staffBoxTexts: {
    flex: 1,
  },
  staffName: {
    color: "#2B3D55",
    fontSize: 12,
    fontWeight: "800",
  },
  staffEmail: {
    color: "#7C8B9E",
    fontSize: 11,
  },
  createdText: {
    color: "#8A98AA",
    fontSize: 11,
    fontWeight: "500",
  },
  modalFooter: {
    paddingHorizontal: 11,
    paddingBottom: 10,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#F0E5D8",
    backgroundColor: "#FFFDF9",
  },
  modalActionBtn: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: "#D77D46",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#B85F2B",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modalActionBtnDisabled: {
    backgroundColor: "#C9B9A8",
  },
  modalActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  filterPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 31, 49, 0.14)",
    justifyContent: "flex-end",
  },
  filterBottomSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#E8DACA",
    backgroundColor: "#FFFDF9",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 14,
  },
  filterBottomHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E8DCCD",
    alignSelf: "center",
    marginBottom: 8,
  },
});
