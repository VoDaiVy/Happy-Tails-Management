import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getWalletTransactionById } from "../../api/modules/walletApi";
import type { AccountStackParamList } from "../../navigation/types";
import type { WalletTransaction } from "../../types/wallet";

type Props = NativeStackScreenProps<AccountStackParamList, "WalletTransactionDetail">;

function renderAmount(value?: number) {
  return `${Number(value || 0).toLocaleString()} VND`;
}

export function WalletTransactionDetailScreen({ route, navigation }: Props) {
  const { transactionId } = route.params;
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<WalletTransaction | null>(null);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const detail = await getWalletTransactionById(transactionId);
      setTransaction(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc chi tiet giao dich");
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

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

  if (!transaction) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{error || "Khong co du lieu giao dich"}</Text>
        <Pressable style={styles.retryButton} onPress={loadDetail}>
          <Text style={styles.retryText}>Thu lai</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Pressable style={[styles.backButton, styles.backButtonFloating]} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Quay lai</Text>
      </Pressable>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
        <Text style={styles.title}>Transaction Detail</Text>
        <Text style={styles.row}>Code: {transaction.transactionCode}</Text>
        <Text style={styles.row}>Type: {transaction.type}</Text>
        <Text style={styles.row}>Status: {transaction.status}</Text>
        <Text style={styles.row}>Amount: {renderAmount(transaction.amount)}</Text>
        {transaction.method ? <Text style={styles.row}>Method: {transaction.method}</Text> : null}
        {transaction.referenceId ? <Text style={styles.row}>Reference: {transaction.referenceId}</Text> : null}
        {transaction.payosOrderCode ? <Text style={styles.row}>PayOS Order: {transaction.payosOrderCode}</Text> : null}
        {transaction.balanceBefore !== undefined ? <Text style={styles.row}>Balance Before: {renderAmount(transaction.balanceBefore)}</Text> : null}
        {transaction.balanceAfter !== undefined ? <Text style={styles.row}>Balance After: {renderAmount(transaction.balanceAfter)}</Text> : null}
        <Text style={styles.row}>Created: {new Date(transaction.createdAt).toLocaleString()}</Text>
        {transaction.processedAt ? <Text style={styles.row}>Processed: {new Date(transaction.processedAt).toLocaleString()}</Text> : null}
        {transaction.note ? <Text style={styles.row}>Note: {transaction.note}</Text> : null}
        {transaction.description ? <Text style={styles.row}>Description: {transaction.description}</Text> : null}
        {transaction.failureReason ? <Text style={styles.errorText}>Failure: {transaction.failureReason}</Text> : null}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F1EC" },
  container: { flex: 1, backgroundColor: "#F4F1EC" },
  content: { padding: 16, paddingTop: 72, gap: 12 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
    gap: 6,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  row: { color: "#334155", fontSize: 14 },
  errorText: { color: "#DC2626" },
  retryButton: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: "#D87D4A",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  backButton: {
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  backButtonFloating: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 20,
  },
  backButtonText: { color: "#334155", fontWeight: "700" },
});
