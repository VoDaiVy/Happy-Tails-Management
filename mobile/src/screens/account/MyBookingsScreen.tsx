import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { cancelBooking, getMyBookings } from "../../api/modules/bookingApi";
import type { AccountStackParamList } from "../../navigation/types";
import type { Booking } from "../../types/booking";

const STATUS_FILTERS = ["all", "pending", "confirmed", "in-progress", "completed", "cancelled"] as const;

type Props = NativeStackScreenProps<AccountStackParamList, "MyBookings">;

export function MyBookingsScreen({ navigation }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeStatus, setActiveStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadBookings = useCallback(async (status: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyBookings(status === "all" ? undefined : status);
      setBookings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc danh sach booking");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings(activeStatus);
  }, [activeStatus, loadBookings]);

  const onCancel = async (bookingId: string) => {
    setProcessingId(bookingId);
    setMessage("");
    setError("");
    try {
      const response = await cancelBooking(bookingId, "Cancelled by customer");
      setMessage(response?.message || "Da huy booking");
      await loadBookings(activeStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong the huy booking");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[...STATUS_FILTERS]}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const selected = item === activeStatus;
          return (
            <Pressable
              style={[styles.filterChip, selected && styles.filterChipActive]}
              onPress={() => setActiveStatus(item)}
            >
              <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{item}</Text>
            </Pressable>
          );
        }}
      />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co booking nao</Text>}
          renderItem={({ item }) => {
            const canCancel = item.status !== "cancelled" && item.status !== "completed";
            return (
              <Pressable style={styles.card} onPress={() => navigation.navigate("BookingDetail", { bookingId: item._id })}>
                <Text style={styles.bookingCode}>{item.bookingNumber || item._id}</Text>
                <Text style={styles.metaText}>Status: {item.status}</Text>
                <Text style={styles.metaText}>Date: {new Date(item.bookingDate).toLocaleString()}</Text>
                <Text style={styles.metaText}>Total: {item.totalAmount.toLocaleString()} VND</Text>
                <Text style={styles.metaText}>Items: {item.items.length}</Text>

                {canCancel ? (
                  <Pressable
                    style={[styles.cancelButton, processingId === item._id && styles.disabled]}
                    onPress={() => onCancel(item._id)}
                    disabled={processingId === item._id}
                  >
                    {processingId === item._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.cancelButtonText}>Cancel Booking</Text>}
                  </Pressable>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.successText}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  filterList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  filterChipActive: { backgroundColor: "#2563EB" },
  filterChipText: { color: "#334155", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, gap: 10 },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 12 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  bookingCode: { color: "#0F172A", fontWeight: "700", marginBottom: 4 },
  metaText: { color: "#475569", fontSize: 13 },
  cancelButton: {
    marginTop: 10,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelButtonText: { color: "#fff", fontWeight: "700" },
  errorText: { paddingHorizontal: 16, color: "#DC2626", paddingBottom: 8 },
  successText: { paddingHorizontal: 16, color: "#059669", paddingBottom: 8 },
  disabled: { opacity: 0.65 },
});
