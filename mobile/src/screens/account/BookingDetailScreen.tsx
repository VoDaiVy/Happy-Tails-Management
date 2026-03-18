import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { getBookingById } from "../../api/modules/bookingApi";
import type { AccountStackParamList } from "../../navigation/types";
import type { Booking, BookingItem } from "../../types/booking";

type Props = NativeStackScreenProps<AccountStackParamList, "BookingDetail">;

function getServiceName(item: BookingItem) {
  if (typeof item.service === "string") return item.service;
  return item.service?.name || "Service";
}

function getPetName(item: BookingItem) {
  if (!item.pet) return "N/A";
  if (typeof item.pet === "string") return item.pet;
  return item.pet.petName || "Pet";
}

export function BookingDetailScreen({ route }: Props) {
  const { bookingId, toastMessage } = route.params;
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
      setError(e instanceof Error ? e.message : "Khong tai duoc booking detail");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDetail();
    } finally {
      setRefreshing(false);
    }
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
        <Text style={styles.errorText}>{error || "Khong co du lieu booking"}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {inlineToast ? <View style={styles.toastBox}><Text style={styles.toastText}>{inlineToast}</Text></View> : null}
      <View style={styles.summaryCard}>
        <Text style={styles.title}>{booking.bookingNumber || booking._id}</Text>
        <Text style={styles.meta}>Status: {booking.status}</Text>
        <Text style={styles.meta}>Date: {new Date(booking.bookingDate).toLocaleString()}</Text>
        <Text style={styles.meta}>Total: {booking.totalAmount.toLocaleString()} VND</Text>
        {booking.paymentMethod ? <Text style={styles.meta}>Payment: {booking.paymentMethod}</Text> : null}
        {booking.notes ? <Text style={styles.meta}>Notes: {booking.notes}</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Items</Text>
      <View style={styles.itemsWrap}>
        {booking.items.map((item, idx) => (
          <View key={`${item._id || "item"}-${idx}`} style={styles.itemCard}>
            <Text style={styles.itemName}>{getServiceName(item)}</Text>
            <Text style={styles.itemMeta}>Pet: {getPetName(item)}</Text>
            <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
            <Text style={styles.itemMeta}>Price: {item.price.toLocaleString()} VND</Text>
            {item.startTime ? <Text style={styles.itemMeta}>Start: {new Date(item.startTime).toLocaleString()}</Text> : null}
            {item.endTime ? <Text style={styles.itemMeta}>End: {new Date(item.endTime).toLocaleString()}</Text> : null}
            {item.assignedRoom ? <Text style={styles.itemMeta}>Room: {item.assignedRoom}</Text> : null}
          </View>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1EC" },
  content: { padding: 16, gap: 12 },
  toastBox: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toastText: { color: "#166534", fontWeight: "700" },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  summaryCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  meta: { color: "#475569", fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  itemsWrap: { gap: 10 },
  itemCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
  },
  itemName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  itemMeta: { marginTop: 2, color: "#64748B", fontSize: 13 },
  errorText: { color: "#DC2626" },
});
