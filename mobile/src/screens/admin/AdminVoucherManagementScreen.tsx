import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { getAdminVouchers } from "../../api/modules/adminVoucherApi";
import type { AdminVoucher } from "../../api/modules/adminVoucherApi";

export function AdminVoucherManagementScreen() {
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadVouchers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    try {
      const response = await getAdminVouchers({ search: search || undefined, limit: 100, page: 1 });
      setVouchers(response.vouchers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load vouchers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

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
      data={vouchers}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadVouchers(true)} tintColor="#D6824B" />}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Voucher Management</Text>
          <Text style={styles.subtitle}>Live data from /vouchers</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search voucher code"
            placeholderTextColor="#9AA8B6"
            style={styles.searchInput}
          />
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.code}>{item.code}</Text>
            <Text style={styles.discount}>{item.discountType === "percentage" ? `${item.discountValue}%` : `${Number(item.discountValue || 0).toLocaleString()} đ`}</Text>
          </View>
          <Text style={styles.meta}>Min spend: {Number(item.minSpend || 0).toLocaleString()} đ</Text>
          <Text style={styles.meta}>Used: {item.usedCount || 0} / {item.usageLimit || "-"}</Text>
          <Text style={styles.meta}>Active: {item.isActive === false ? "No" : "Yes"}</Text>
          <Text style={styles.meta}>Valid until: {item.validUntil ? new Date(item.validUntil).toLocaleDateString() : "-"}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No vouchers found.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FCF8F2" },
  content: { padding: 16, paddingBottom: 24 },
  headerWrap: { marginBottom: 10, gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#23364B" },
  subtitle: { color: "#697C90", fontSize: 13 },
  errorText: { color: "#BE3A4A", fontSize: 13 },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6DCCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#22364B",
  },
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
  code: { color: "#22364B", fontSize: 15, fontWeight: "700", flex: 1 },
  discount: { color: "#A95A2F", fontWeight: "800", fontSize: 13 },
  meta: { color: "#64788C", fontSize: 12 },
  emptyText: { color: "#6D7D8E", textAlign: "center", paddingVertical: 18 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FCF8F2" },
});
