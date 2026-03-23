import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";
import { getBookingById } from "../../api/modules/bookingApi";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import type { Booking, BookingItem } from "../../types/booking";

type Props = NativeStackScreenProps<AccountStackParamList, "BookingDetail">;

function formatDate(input?: string) {
  if (!input) return "N/A";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}

function formatDateTime(input?: string) {
  if (!input) return "N/A";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString();
}

function formatCurrency(value?: number) {
  return `${Number(value || 0).toLocaleString()} VND`;
}

function getServiceName(item: BookingItem) {
  if (typeof item.service === "string") return "Service";
  return item.service?.name || "Service";
}

function getPetName(item: BookingItem) {
  if (!item.pet) return "N/A";
  if (typeof item.pet === "string") return "Pet";
  return item.pet.petName || "Pet";
}

function getStatusOrder(status?: string) {
  const normalized = String(status || "pending").toLowerCase();
  const steps = ["pending", "confirmed", "in-progress", "completed"];
  const idx = steps.indexOf(normalized);
  if (normalized === "cancelled") return 0;
  return idx >= 0 ? idx : 0;
}

export function BookingDetailScreen({ route, navigation }: Props) {
  const { bookingId, toastMessage } = route.params;
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [inlineToast, setInlineToast] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getBookingById(bookingId);
      setBooking(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load booking detail.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDetail();
    setRefreshing(false);
  }, [loadDetail]);

  useEffect(() => {
    if (!toastMessage) return;

    if (Platform.OS === "android") {
      ToastAndroid.show(toastMessage, ToastAndroid.SHORT);
      return;
    }

    setInlineToast(toastMessage);
    const timer = setTimeout(() => setInlineToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const services = useMemo(() => booking?.items || [], [booking]);
  const serviceNames = useMemo(() => Array.from(new Set(services.map(getServiceName))), [services]);
  const statusStep = getStatusOrder(booking?.status);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{error || "No booking data found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerWrap}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Booking Detail</Text>
          <Text style={styles.subtitle}>Track service progress and care updates</Text>
        </View>
      </View>

      {inlineToast ? (
        <View style={styles.toastBox}>
          <Text style={styles.toastText}>{inlineToast}</Text>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Booking Summary</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Booking ID</Text>
          <Text style={styles.value}>{booking.bookingNumber || booking._id}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{String(booking.status || "pending")}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatCurrency(booking.totalAmount)}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Pet Information</Text>
        {services.map((item, index) => (
          <View key={`${item._id || "pet"}-${index}`} style={styles.softRow}>
            <Text style={styles.softRowTitle}>{getPetName(item)}</Text>
            <Text style={styles.softRowSub}>{getServiceName(item)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Service Information</Text>
        {serviceNames.map((name, index) => (
          <View key={`${name}-${index}`} style={styles.pillTag}>
            <Text style={styles.pillTagText}>{name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Booking Date</Text>
          <Text style={styles.value}>{formatDate(booking.bookingDate)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Booking Time</Text>
          <Text style={styles.value}>{booking.bookingTime || "--:--"}</Text>
        </View>

        <View style={styles.timelineWrap}>
          {["Pending", "Confirmed", "In Progress", "Completed"].map((step, index) => {
            const active = index <= statusStep && booking.status !== "cancelled";
            return (
              <View key={step} style={styles.timelineItem}>
                <View style={[styles.timelineDot, active && styles.timelineDotActive]} />
                <Text style={[styles.timelineText, active && styles.timelineTextActive]}>{step}</Text>
              </View>
            );
          })}
          {booking.status === "cancelled" ? <Text style={styles.cancelledText}>This booking was cancelled.</Text> : null}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Payment Method</Text>
          <Text style={styles.value}>{booking.paymentMethod || "N/A"}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(booking.totalAmount)}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Medical / Care Updates</Text>
        {services.some((item) => Boolean(item.notes)) ? (
          services.map((item, index) =>
            item.notes ? (
              <View key={`medical-${item._id || index}`} style={styles.noteBox}>
                <Text style={styles.noteTitle}>{getServiceName(item)}</Text>
                <Text style={styles.noteText}>{item.notes}</Text>
              </View>
            ) : null,
          )
        ) : (
          <Text style={styles.placeholderText}>No medical updates yet.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Staff Notes</Text>
        <Text style={styles.placeholderText}>{booking.notes || "No staff notes provided."}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Feedback</Text>
        {booking.status === "completed" ? (
          <Pressable style={styles.feedbackButton} onPress={() => navigation.navigate("Feedback", { bookingId: booking._id })}>
            <Text style={styles.feedbackButtonText}>Leave Feedback</Text>
          </Pressable>
        ) : (
          <Text style={styles.placeholderText}>Feedback is available after service completion.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Service Outcome</Text>
        {services.map((item, index) => (
          <View key={`service-outcome-${item._id || index}`} style={styles.softRow}>
            <Text style={styles.softRowTitle}>{getServiceName(item)}</Text>
            <Text style={styles.softRowSub}>
              Start: {formatDateTime(item.startTime)}
              {"\n"}
              End: {formatDateTime(item.endTime)}
              {"\n"}
              Room: {item.assignedRoom || "N/A"}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name || "N/A"}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || "N/A"}</Text>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F1E9" },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },

  headerWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8DCCC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { color: "#23374E", fontSize: 24, lineHeight: 24, fontWeight: "700" },
  headerTextWrap: { flex: 1 },
  title: { color: "#1B2D43", fontSize: 26, lineHeight: 30, fontWeight: "900" },
  subtitle: { marginTop: 2, color: "#6C7B8E", fontSize: 13, lineHeight: 18 },

  toastBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  toastText: { color: "#166534", fontWeight: "700" },

  sectionCard: {
    backgroundColor: "#FFFCF8",
    borderWidth: 1,
    borderColor: "#ECDDCC",
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { color: "#1D2F45", fontSize: 16, fontWeight: "800" },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  label: { color: "#7A899D", fontSize: 13, fontWeight: "600", flex: 1 },
  value: { color: "#33475E", fontSize: 13, fontWeight: "700", flex: 1, textAlign: "right" },
  totalValue: { color: "#D36F3A", fontSize: 18, fontWeight: "900" },

  softRow: {
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE3D5",
    padding: 10,
  },
  softRowTitle: { color: "#24384F", fontSize: 14, fontWeight: "800" },
  softRowSub: { marginTop: 2, color: "#6E7D90", fontSize: 12, lineHeight: 18 },

  pillTag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#F3ECE3",
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  pillTagText: { color: "#5B6D83", fontSize: 12, fontWeight: "700" },

  timelineWrap: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE2D4",
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 8,
  },
  timelineItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#D5DDE8" },
  timelineDotActive: { backgroundColor: "#E07E45" },
  timelineText: { color: "#8A97A9", fontWeight: "700", fontSize: 12 },
  timelineTextActive: { color: "#31465E" },
  cancelledText: { color: "#B42318", fontWeight: "700", marginTop: 4, fontSize: 12 },

  noteBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EADFCF",
    backgroundColor: "#FFF8EF",
    padding: 10,
  },
  noteTitle: { color: "#2F445C", fontWeight: "800", fontSize: 13 },
  noteText: { marginTop: 4, color: "#66778C", fontSize: 13, lineHeight: 19 },
  placeholderText: { color: "#738398", fontSize: 13, lineHeight: 18 },

  feedbackButton: {
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 11,
    backgroundColor: "#DD7A43",
  },
  feedbackButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },

  errorText: { color: "#B42318", fontWeight: "600" },
});
