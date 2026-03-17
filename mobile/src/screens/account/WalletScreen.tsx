import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createDepositLink, getWalletInfo, getWalletTransactions } from "../../api/modules/walletApi";
import type { WalletInfo, WalletTransaction } from "../../types/wallet";

export function WalletScreen() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [amount, setAmount] = useState("50000");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadWalletData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [walletData, transactionData] = await Promise.all([
        getWalletInfo(),
        getWalletTransactions({ page: 1, limit: 10 }),
      ]);
      setWallet(walletData);
      setTransactions(transactionData.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc vi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  const onCreateDeposit = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("So tien nap khong hop le");
      return;
    }

    setDepositing(true);
    setError("");
    setMessage("");

    try {
      const deposit = await createDepositLink({ amount: parsed, note: note.trim() || undefined });
      setMessage("Da tao link nap tien. Dang mo trang thanh toan...");
      if (deposit.checkoutUrl) {
        await Linking.openURL(deposit.checkoutUrl);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tao duoc link nap tien");
    } finally {
      setDepositing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>{wallet?.formattedBalance || "0 VND"}</Text>
        <Text style={styles.balanceMeta}>Deposited: {(wallet?.totalDeposited || 0).toLocaleString()} VND</Text>
        <Text style={styles.balanceMeta}>Spent: {(wallet?.totalSpent || 0).toLocaleString()} VND</Text>
      </View>

      <View style={styles.depositCard}>
        <Text style={styles.sectionTitle}>Deposit</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="Amount" />
        <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Note (optional)" />

        <Pressable style={[styles.depositButton, depositing && styles.disabled]} onPress={onCreateDeposit} disabled={depositing}>
          {depositing ? <ActivityIndicator color="#fff" /> : <Text style={styles.depositButtonText}>Create Deposit Link</Text>}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Latest Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.transactionList}
        ListEmptyComponent={<Text style={styles.emptyText}>Chua co giao dich</Text>}
        renderItem={({ item }) => (
          <View style={styles.transactionCard}>
            <Text style={styles.txnCode}>{item.transactionCode}</Text>
            <Text style={styles.txnMeta}>{item.type} · {item.status}</Text>
            <Text style={styles.txnAmount}>{item.amount.toLocaleString()} VND</Text>
            <Text style={styles.txnDate}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.successText}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  balanceCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 14,
  },
  balanceLabel: { color: "#475569", fontSize: 13 },
  balanceValue: { marginTop: 4, color: "#0F172A", fontSize: 24, fontWeight: "800" },
  balanceMeta: { marginTop: 2, color: "#64748B", fontSize: 13 },
  depositCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
    gap: 8,
  },
  sectionTitle: { marginTop: 12, marginBottom: 6, fontSize: 16, fontWeight: "700", color: "#0F172A" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  depositButton: {
    marginTop: 2,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 11,
  },
  depositButtonText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.65 },
  transactionList: { paddingBottom: 12, gap: 8 },
  transactionCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#fff",
    padding: 10,
  },
  txnCode: { fontWeight: "700", color: "#0F172A" },
  txnMeta: { marginTop: 2, color: "#475569", fontSize: 12 },
  txnAmount: { marginTop: 4, color: "#1D4ED8", fontWeight: "700" },
  txnDate: { marginTop: 2, color: "#64748B", fontSize: 12 },
  emptyText: { textAlign: "center", color: "#64748B", marginTop: 8 },
  errorText: { color: "#DC2626", marginTop: 8 },
  successText: { color: "#059669", marginTop: 8 },
});
