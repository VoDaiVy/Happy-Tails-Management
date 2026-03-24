import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { getAdminRooms } from "../../api/modules/adminRoomApi";
import type { Room } from "../../types/room";

export function AdminRoomManagementScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadRooms = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    try {
      const data = await getAdminRooms({ isActive: "all" });
      setRooms(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load rooms");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const stats = useMemo(() => {
    const active = rooms.filter((room) => room.isActive).length;
    const available = rooms.filter((room) => room.isAvailable).length;
    return { total: rooms.length, active, available };
  }, [rooms]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D6824B" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={rooms}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRooms(true)} tintColor="#D6824B" />}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Room Management</Text>
          <Text style={styles.subtitle}>Live data from /rooms</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.summary}>Total: {stats.total} | Active: {stats.active} | Available: {stats.available}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.name}>{item.name || item.roomNumber}</Text>
            <Text style={styles.typeBadge}>{item.type}</Text>
          </View>
          <Text style={styles.meta}>Room: {item.roomNumber}</Text>
          <Text style={styles.meta}>Service type: {item.serviceType}</Text>
          <Text style={styles.meta}>Capacity: {item.capacity}</Text>
          <Text style={styles.meta}>Status: {item.isAvailable ? "Available" : "Occupied"}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No rooms found.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FCF8F2" },
  content: { padding: 16, paddingBottom: 24 },
  headerWrap: { marginBottom: 10, gap: 6 },
  title: { fontSize: 22, fontWeight: "800", color: "#23364B" },
  subtitle: { color: "#697C90", fontSize: 13 },
  summary: { color: "#A35A2F", fontSize: 12, fontWeight: "700" },
  errorText: { color: "#BE3A4A", fontSize: 13 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9DDCF",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 4,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  name: { color: "#22364B", fontSize: 15, fontWeight: "700", flex: 1 },
  typeBadge: {
    backgroundColor: "#EFF4FA",
    color: "#355371",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "700",
  },
  meta: { color: "#64788C", fontSize: 12 },
  emptyText: { color: "#6D7D8E", textAlign: "center", paddingVertical: 18 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FCF8F2" },
});
