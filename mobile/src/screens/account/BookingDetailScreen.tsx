import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
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
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          <View key={item._id || `${idx}-${item.price}`} style={styles.itemCard}>
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 12 },
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
