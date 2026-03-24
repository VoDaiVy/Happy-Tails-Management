import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { getAllMedicalRecords } from "../../api/modules/medicalRecordApi";
import type { MedicalRecordItem } from "../../api/modules/medicalRecordApi";

export function AdminMedicalRecordsScreen() {
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadRecords = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    try {
      const response = await getAllMedicalRecords({ page: 1, limit: 60 });
      setRecords(response.records || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load medical records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

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
      data={records}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRecords(true)} tintColor="#D6824B" />}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Medical Records</Text>
          <Text style={styles.subtitle}>Live data from /medical-records</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.name}>{item.recordType || "General"}</Text>
            <Text style={styles.stageBadge}>{item.workflowStage || "received"}</Text>
          </View>
          <Text style={styles.meta}>Condition: {item.condition || "-"}</Text>
          <Text style={styles.meta}>Diagnosis: {item.diagnosis || "-"}</Text>
          <Text style={styles.meta}>Follow-up: {item.followUpDate ? new Date(item.followUpDate).toLocaleDateString() : "-"}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No medical records found.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FCF8F2" },
  content: { padding: 16, paddingBottom: 24 },
  headerWrap: { marginBottom: 10, gap: 6 },
  title: { fontSize: 22, fontWeight: "800", color: "#23364B" },
  subtitle: { color: "#697C90", fontSize: 13 },
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
  stageBadge: {
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
