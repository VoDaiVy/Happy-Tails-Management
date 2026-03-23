import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getAdminBookings, updateBookingStatus } from "../../api/modules/adminBookingApi";
import { useAuth } from "../../context/AuthContext";
import type { AdminBooking, BookingStatus } from "../../types/admin";

const FILTERS = ["all", "pending", "confirmed", "in-progress", "completed", "cancelled"] as const;
const STAFF_UPDATE_TARGETS: BookingStatus[] = ["confirmed", "in-progress", "completed", "cancelled"];

export function AdminBookingBoardScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof FILTERS)[number]>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canUpdateStatus = user?.role === "staff";

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextBookings = await getAdminBookings({
        status: statusFilter === "all" ? undefined : statusFilter,
        date: dateFilter.trim() || undefined,
      });
      setBookings(nextBookings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Khong tai duoc booking");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleStatusUpdate = useCallback(
    async (bookingId: string, nextStatus: BookingStatus) => {
      setSavingId(bookingId);
      setError("");
      setMessage("");
      try {
        const response = await updateBookingStatus(bookingId, nextStatus);
        setMessage(response.message || "Cap nhat trang thai thanh cong");
        await loadBookings();
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Khong cap nhat duoc trang thai");
      } finally {
        setSavingId(null);
      }
    },
    [loadBookings],
  );

  const headerLabel = useMemo(() => {
    if (statusFilter === "all") return "Tat ca booking";
    return `Loc: ${statusFilter}`;
  }, [statusFilter]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Booking Board</Text>
      <Text style={styles.subtitle}>{headerLabel}</Text>

      <FlatList
        horizontal
        data={[...FILTERS]}
        keyExtractor={(item: (typeof FILTERS)[number]) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }: { item: (typeof FILTERS)[number] }) => {
          const selected = item === statusFilter;
          return (
            <Pressable
              style={[styles.filterChip, selected && styles.filterChipActive]}
              onPress={() => setStatusFilter(item)}
            >
              <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{item}</Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.filterBox}>
        <TextInput
          value={dateFilter}
          onChangeText={setDateFilter}
          placeholder="Loc theo ngay YYYY-MM-DD"
          style={styles.dateInput}
        />
        <Pressable style={styles.reloadButton} onPress={loadBookings}>
          <Text style={styles.reloadButtonText}>Tai lai</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item: AdminBooking) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co booking nao phu hop bo loc.</Text>}
          renderItem={({ item }: { item: AdminBooking }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.bookingCode}>{item.bookingNumber || item._id}</Text>
                <Text style={styles.statusBadge}>{item.status}</Text>
              </View>
              <Text style={styles.metaText}>Khach: {item.customer?.name || item.customer?.email || "N/A"}</Text>
              <Text style={styles.metaText}>Ngay: {new Date(item.bookingDate).toLocaleString()}</Text>
              <Text style={styles.metaText}>Tong tien: {item.totalAmount.toLocaleString()} VND</Text>
              <Text style={styles.metaText}>Dich vu: {item.items.length}</Text>

              {canUpdateStatus ? (
                <View style={styles.statusActionWrap}>
                  {STAFF_UPDATE_TARGETS.map((targetStatus) => {
                    const disabled = savingId === item._id || targetStatus === item.status;
                    return (
                      <Pressable
                        key={`${item._id}-${targetStatus}`}
                        style={[styles.actionChip, disabled && styles.actionChipDisabled]}
                        disabled={disabled}
                        onPress={() => handleStatusUpdate(item._id, targetStatus)}
                      >
                        <Text style={styles.actionChipText}>{targetStatus}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.readOnlyText}>Admin chi co quyen xem booking board.</Text>
              )}
            </View>
          )}
        />
      )}

      {savingId ? <Text style={styles.infoText}>Dang cap nhat booking...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.successText}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingTop: 12 },
  title: { paddingHorizontal: 16, fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { paddingHorizontal: 16, marginTop: 2, color: "#64748B", fontSize: 13 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  filterChipActive: { backgroundColor: "#0F766E" },
  filterChipText: { color: "#334155", fontWeight: "600" },
  filterChipTextActive: { color: "#FFFFFF" },
  filterBox: { paddingHorizontal: 16, flexDirection: "row", gap: 8, alignItems: "center" },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },
  reloadButton: {
    backgroundColor: "#1D4ED8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  reloadButtonText: { color: "#FFFFFF", fontWeight: "700" },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, gap: 10, paddingBottom: 20 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 4,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bookingCode: { color: "#0F172A", fontWeight: "700", maxWidth: "72%" },
  statusBadge: {
    backgroundColor: "#ECFEFF",
    color: "#0F766E",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
  },
  metaText: { color: "#475569", fontSize: 13 },
  statusActionWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 8 },
  actionChip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionChipDisabled: { opacity: 0.45 },
  actionChipText: { color: "#0F172A", fontWeight: "700", fontSize: 12 },
  readOnlyText: { marginTop: 8, color: "#64748B", fontSize: 12 },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 20 },
  infoText: { color: "#334155", paddingHorizontal: 16, paddingBottom: 4 },
  errorText: { color: "#DC2626", paddingHorizontal: 16, paddingBottom: 6 },
  successText: { color: "#059669", paddingHorizontal: 16, paddingBottom: 6 },
});
