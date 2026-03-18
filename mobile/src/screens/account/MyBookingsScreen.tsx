import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
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
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import type { Booking } from "../../types/booking";
import { canUseCustomerFeatures } from "../../utils/role";

const STATUS_FILTERS = ["all", "pending", "confirmed", "in-progress", "completed", "cancelled"] as const;

type Props = NativeStackScreenProps<AccountStackParamList, "MyBookings">;

export function MyBookingsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeStatus, setActiveStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const canAccess = canUseCustomerFeatures(user?.role);

  const canCancelBooking = (status?: string) => status === "pending" || status === "confirmed";
  const canOpenCamera = (status?: string) => status === "confirmed" || status === "in-progress" || status === "completed";

  const loadBookings = useCallback(async (status: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyBookings(status === "all" ? undefined : status);
      const sorted = [...data].sort((left, right) => {
        const leftTime = new Date(left.bookingDate || "").getTime();
        const rightTime = new Date(right.bookingDate || "").getTime();
        return rightTime - leftTime;
      });
      setBookings(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc danh sach booking");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadBookings(activeStatus);
    } finally {
      setRefreshing(false);
    }
  }, [activeStatus, loadBookings]);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    loadBookings(activeStatus);
  }, [activeStatus, canAccess, loadBookings]);

  if (!canAccess) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Tinh nang nay chi danh cho tai khoan customer.</Text>
      </View>
    );
  }

  const onCancel = async (bookingId: string) => {
    setProcessingId(bookingId);
    setMessage("");
    setError("");
    try {
      await cancelBooking(bookingId, "Cancelled by customer");
      setMessage("Da huy booking");
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
          keyExtractor={(item, index) => `${item._id}-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co booking nao</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const canCancel = canCancelBooking(item.status);
            const cameraEnabled = canOpenCamera(item.status);
            return (
              <View style={styles.card}>
                <Text style={styles.bookingCode}>{item.bookingNumber || item._id}</Text>
                <Text style={styles.metaText}>Status: {item.status}</Text>
                <Text style={styles.metaText}>Date: {new Date(item.bookingDate).toLocaleString()}</Text>
                <Text style={styles.metaText}>Total: {item.totalAmount.toLocaleString()} VND</Text>
                <Text style={styles.metaText}>Items: {item.items.length}</Text>

                <Pressable
                  style={styles.detailButton}
                  onPress={() => navigation.navigate("BookingDetail", { bookingId: item._id })}
                >
                  <Text style={styles.detailButtonText}>View Detail</Text>
                </Pressable>

                {canCancel ? (
                  <Pressable
                    style={[styles.cancelButton, processingId === item._id && styles.disabled]}
                    onPress={() => onCancel(item._id)}
                    disabled={processingId === item._id}
                  >
                    {processingId === item._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.cancelButtonText}>Cancel Booking</Text>}
                  </Pressable>
                ) : null}

                <Pressable
                  style={[styles.cameraButton, !cameraEnabled && styles.disabled]}
                  onPress={() => {
                    if (!cameraEnabled) {
                      setError("Camera chi mo khi booking da confirmed/in-progress/completed");
                      return;
                    }
                    navigation.navigate("BookingCamera", { bookingId: item._id });
                  }}
                  disabled={!cameraEnabled}
                >
                  <Text style={styles.cameraButtonText}>Open Camera</Text>
                </Pressable>
              </View>
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
  container: { flex: 1, backgroundColor: "#F4F1EC" },
  filterList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F8F8F7",
    borderWidth: 1,
    borderColor: "#E7E8EA",
  },
  filterChipActive: { backgroundColor: "#D87D4A", borderColor: "#D87D4A" },
  filterChipText: { color: "#4D5E78", fontWeight: "700" },
  filterChipTextActive: { color: "#fff" },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, gap: 12, paddingBottom: 22 },
  emptyText: { color: "#8395B2", textAlign: "center", marginTop: 12 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E7DED1",
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  bookingCode: { color: "#2F3742", fontWeight: "800", marginBottom: 4 },
  metaText: { color: "#6C7A90", fontSize: 13 },
  detailButton: {
    marginTop: 10,
    backgroundColor: "#D87D4A",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 11,
  },
  detailButtonText: { color: "#fff", fontWeight: "800" },
  cancelButton: {
    marginTop: 10,
    backgroundColor: "#E5484D",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 11,
  },
  cancelButtonText: { color: "#fff", fontWeight: "800" },
  cameraButton: {
    marginTop: 8,
    backgroundColor: "#4D5E78",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 11,
  },
  cameraButtonText: { color: "#fff", fontWeight: "800" },
  errorText: { paddingHorizontal: 16, color: "#DC2626", paddingBottom: 8 },
  successText: { paddingHorizontal: 16, color: "#059669", paddingBottom: 8 },
  disabled: { opacity: 0.65 },
});
