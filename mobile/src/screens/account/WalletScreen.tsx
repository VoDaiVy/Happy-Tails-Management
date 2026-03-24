import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ExpoLinking from "expo-linking";
import {
  createDepositLink,
  getPayOSDepositStatus,
  getWalletInfo,
  getWalletTransactions,
} from "../../api/modules/walletApi";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import type { PayOSDepositStatus, WalletInfo, WalletTransaction } from "../../types/wallet";
import { canUseCustomerFeatures } from "../../utils/role";

type Props = NativeStackScreenProps<AccountStackParamList, "Wallet">;

type WalletFilterKey = "all" | "deposit" | "payment" | "refund";

const FILTERS: Array<{ key: WalletFilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Top Up" },
  { key: "payment", label: "Payments" },
  { key: "refund", label: "Refunds" },
];

function formatMoneyVnd(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatCompactMoneyVnd(value: number) {
  const abs = Math.abs(Number(value || 0));
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B đ`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M đ`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K đ`;
  }
  return formatMoneyVnd(value);
}

function normalizeType(type?: string) {
  const raw = String(type || "").toLowerCase();
  if (raw === "deposit") return "deposit";
  if (raw === "payment") return "payment";
  if (raw === "refund") return "refund";
  return "other";
}

function formatType(type?: string) {
  const normalized = normalizeType(type);
  if (normalized === "deposit") return "Top Up";
  if (normalized === "payment") return "Payment";
  if (normalized === "refund") return "Refund";
  return String(type || "Transaction");
}

function getStatusTone(status?: string) {
  const value = String(status || "").toLowerCase();
  if (value === "completed") return "completed";
  if (value === "cancelled" || value === "failed") return "cancelled";
  return "pending";
}

function getTypeIcon(type?: string) {
  const normalized = normalizeType(type);
  if (normalized === "payment") return "↘";
  if (normalized === "refund") return "⤴";
  return "↗";
}

function getTypeIconBackground(type?: string) {
  const normalized = normalizeType(type);
  if (normalized === "payment") return "#FFF0F1";
  if (normalized === "refund") return "#EEF2FF";
  return "#EAF8F0";
}

function getTypeIconColor(type?: string) {
  const normalized = normalizeType(type);
  if (normalized === "payment") return "#E5484D";
  if (normalized === "refund") return "#4F46E5";
  return "#0C9B62";
}

export function WalletScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [amount, setAmount] = useState("50000");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingOrderCode, setPendingOrderCode] = useState<number | null>(null);
  const [pendingDepositStatus, setPendingDepositStatus] = useState<PayOSDepositStatus | null>(null);
  const [pollingStatus, setPollingStatus] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<WalletFilterKey>("all");
  const pollingLockRef = useRef(false);
  const canAccess = canUseCustomerFeatures(user?.role);

  const loadWalletData = useCallback(async (withLoading = true) => {
    if (withLoading) setLoading(true);
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
      if (withLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    loadWalletData(true);
  }, [canAccess, loadWalletData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadWalletData(false);
    } finally {
      setRefreshing(false);
    }
  }, [loadWalletData]);

  const syncDepositStatus = useCallback(async (orderCode: number) => {
    if (pollingLockRef.current) return;
    pollingLockRef.current = true;
    setPollingStatus(true);
    try {
      const status = await getPayOSDepositStatus(orderCode);
      setPendingDepositStatus(status);

      const doneStates = ["completed", "failed", "cancelled", "expired"];
      if (doneStates.includes(String(status.status || "").toLowerCase())) {
        setPendingOrderCode(null);
        await loadWalletData(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong dong bo duoc trang thai nap tien");
    } finally {
      pollingLockRef.current = false;
      setPollingStatus(false);
    }
  }, [loadWalletData]);

  useEffect(() => {
    if (!pendingOrderCode) return;

    syncDepositStatus(pendingOrderCode);
    const timer = setInterval(() => {
      syncDepositStatus(pendingOrderCode);
    }, 5000);

    return () => clearInterval(timer);
  }, [pendingOrderCode, syncDepositStatus]);

  useEffect(() => {
    const orderCodeParam = route.params?.orderCode;
    if (!orderCodeParam) return;

    const parsed = Number(orderCodeParam);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    setPendingOrderCode(parsed);
    syncDepositStatus(parsed);
  }, [route.params?.orderCode, syncDepositStatus]);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", (event) => {
      const parsed = ExpoLinking.parse(event.url);
      const orderCodeParam = parsed.queryParams?.orderCode;
      if (!orderCodeParam) return;

      const value = Number(Array.isArray(orderCodeParam) ? orderCodeParam[0] : orderCodeParam);
      if (!Number.isFinite(value) || value <= 0) return;

      setPendingOrderCode(value);
      syncDepositStatus(value);
    });

    return () => subscription.remove();
  }, [syncDepositStatus]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && pendingOrderCode) {
        syncDepositStatus(pendingOrderCode);
      }
    });

    return () => appStateSubscription.remove();
  }, [pendingOrderCode, syncDepositStatus]);

  if (!canAccess) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Tinh nang nay chi danh cho tai khoan customer.</Text>
      </View>
    );
  }

  const onCreateDeposit = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 10000 || parsed > 100000000) {
      setError("So tien nap khong hop le");
      return;
    }

    setDepositing(true);
    setError("");
    setMessage("");

    try {
      const returnUrl = ExpoLinking.createURL("wallet");
      const cancelUrl = ExpoLinking.createURL("wallet");

      let deposit;
      try {
        deposit = await createDepositLink({
          amount: parsed,
          note: note.trim() || undefined,
          returnUrl,
          cancelUrl,
        });
      } catch {
        // Fallback for gateways/environments that do not accept custom URI schemes.
        deposit = await createDepositLink({
          amount: parsed,
          note: note.trim() || undefined,
        });
      }
      setMessage("Da tao link nap tien. Dang mo trang thanh toan...");
      setPendingOrderCode(deposit.orderCode);
      setShowTopUpForm(false);
      setPendingDepositStatus({
        transactionId: "",
        transactionCode: deposit.transactionCode,
        orderCode: deposit.orderCode,
        amount: deposit.amount,
        status: "pending",
        payosStatus: "PENDING",
        checkoutUrl: deposit.checkoutUrl,
        qrCode: deposit.qrCode,
        expiredAt: deposit.expiredAt,
      });
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

  const filteredTransactions = transactions.filter((item) => {
    if (activeFilter === "all") return true;
    return normalizeType(item.type) === activeFilter;
  });

  const totalTransactions = transactions.length;
  const totalTopUps = transactions.filter((item) => normalizeType(item.type) === "deposit").length;

  const totals = transactions.reduce(
    (acc, item) => {
      const amountValue = Number(item.amount || 0);
      const type = normalizeType(item.type);
      const completed = String(item.status || "").toLowerCase() === "completed";

      if (!completed) return acc;

      if (type === "deposit") acc.deposits += amountValue;
      if (type === "payment") acc.payments += amountValue;
      if (type === "refund") acc.refunds += amountValue;
      return acc;
    },
    { deposits: 0, payments: 0, refunds: 0 },
  );

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  const weekLabels = weekDates.map((date) => `${date.getDate()}/${date.getMonth() + 1}`);
  const weekDepositAmounts = weekDates.map((targetDate) => {
    return transactions.reduce((sum, item) => {
      const type = normalizeType(item.type);
      const completed = String(item.status || "").toLowerCase() === "completed";
      if (type !== "deposit" || !completed) return sum;

      const createdAt = new Date(item.createdAt);
      if (
        createdAt.getFullYear() === targetDate.getFullYear() &&
        createdAt.getMonth() === targetDate.getMonth() &&
        createdAt.getDate() === targetDate.getDate()
      ) {
        return sum + Number(item.amount || 0);
      }

      return sum;
    }, 0);
  });

  const thisWeekDeposits = weekDepositAmounts.reduce((sum, value) => sum + value, 0);
  const maxWeekDeposit = Math.max(...weekDepositAmounts, 1);

  return (
    <View style={styles.container}>
      <View style={styles.decorCircleOne} pointerEvents="none" />
      <View style={styles.decorCircleTwo} pointerEvents="none" />
      <View style={styles.decorCircleThree} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>My Wallet</Text>
            <Text style={styles.pageSubtitle}>Manage your HappyTails balance</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>⟳</Text>
            </Pressable>
            <Pressable
              style={[styles.topUpButton, (depositing || pendingOrderCode !== null) && styles.disabled]}
              onPress={() => setShowTopUpForm((current) => !current)}
              disabled={depositing || pendingOrderCode !== null}
            >
              <Text style={styles.topUpButtonText}>＋ Top Up</Text>
            </Pressable>
          </View>
        </View>

        {showTopUpForm ? (
          <View style={styles.topUpFormCard}>
            <Text style={styles.formTitle}>Top Up Wallet</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount (10,000 - 100,000,000)"
              placeholderTextColor="#98A2B3"
            />
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Note (optional)"
              placeholderTextColor="#98A2B3"
            />
            <Pressable style={[styles.submitTopUpButton, depositing && styles.disabled]} onPress={onCreateDeposit} disabled={depositing}>
              {depositing ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitTopUpButtonText}>Create Payment Link</Text>}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.walletHeroCard}>
          <View style={styles.walletTopRow}>
            <View>
              <Text style={styles.walletName}>HappyTails Wallet</Text>
              <Text style={styles.walletEmail}>{user?.email || "No email"}</Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>ACTIVE</Text>
            </View>
          </View>

          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.heroBalance} numberOfLines={1} adjustsFontSizeToFit>
            {wallet?.formattedBalance || formatMoneyVnd(0)}
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaLabel}>In</Text>
              <Text style={styles.heroMetaValue}>{formatCompactMoneyVnd(totals.deposits)}</Text>
            </View>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaLabel}>Out</Text>
              <Text style={styles.heroMetaValue}>{formatCompactMoneyVnd(totals.payments)}</Text>
            </View>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaLabel}>Refund</Text>
              <Text style={styles.heroMetaValue}>{formatCompactMoneyVnd(totals.refunds)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeaderRow}>
            <Text style={styles.statTitle}>TOTAL IN</Text>
          </View>
          <Text style={styles.statValueGreen}>{formatMoneyVnd(wallet?.totalDeposited || 0)}</Text>
          <Text style={styles.statMeta}>Lifetime deposits</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeaderRow}>
            <Text style={styles.statTitle}>TRANSACTIONS</Text>
          </View>
          <Text style={styles.statValuePurple}>{totalTransactions}</Text>
          <Text style={styles.statMeta}>{totalTopUps} top-up transactions</Text>
        </View>

        <View style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Activity Overview</Text>
            <Text style={styles.activityAmount}>{formatMoneyVnd(thisWeekDeposits)}</Text>
          </View>
          <Text style={styles.activitySubText}>Last 7 days · completed top-ups</Text>

          <View style={styles.chartWrap}>
            {[4, 3, 2, 1, 0].map((level) => (
              <View key={`grid-${level}`} style={styles.chartGridRow}>
                <Text style={styles.chartAxisLabel}>{level}</Text>
                <View style={styles.chartGridLine} />
              </View>
            ))}

            <View style={styles.chartLineRow}>
              {weekDepositAmounts.map((value, index) => {
                const barHeight = Math.max(8, Math.round((value / maxWeekDeposit) * 64));
                return (
                  <View key={`dot-${index}`} style={styles.chartPointCol}>
                    <View style={[styles.chartBar, { height: barHeight }]} />
                    <View style={[styles.chartPoint, value > 0 && styles.chartPointActive]} />
                  </View>
                );
              })}
            </View>

            <View style={styles.chartLabelRow}>
              {weekLabels.map((label, index) => (
                <Text key={`label-${index}`} style={styles.chartBottomLabel}>{label}</Text>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>Transactions</Text>
            <View style={styles.transactionsCountBubble}>
              <Text style={styles.transactionsCountText}>{filteredTransactions.length}</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((item) => {
              const active = activeFilter === item.key;
              return (
                <Pressable
                  key={item.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setActiveFilter(item.key)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {filteredTransactions.length === 0 ? (
            <Text style={styles.emptyText}>Khong co giao dich phu hop</Text>
          ) : (
            filteredTransactions.slice(0, 8).map((item) => {
              const tone = getStatusTone(item.status);
              const amountColor = normalizeType(item.type) === "payment" ? "#E5484D" : "#0C9B62";
              return (
                <Pressable
                  key={item._id}
                  style={styles.transactionRow}
                  onPress={() => navigation.navigate("WalletTransactionDetail", { transactionId: item._id })}
                >
                  <View style={styles.transactionLeft}>
                    <View style={[styles.txIconWrap, { backgroundColor: getTypeIconBackground(item.type) }]}>
                      <Text style={[styles.txIconText, { color: getTypeIconColor(item.type) }]}>{getTypeIcon(item.type)}</Text>
                    </View>
                    <View>
                      <View style={styles.txTitleRow}>
                        <Text style={styles.txTitle}>{formatType(item.type)}</Text>
                        <View
                          style={[
                            styles.statusPill,
                            tone === "completed" && styles.statusCompleted,
                            tone === "pending" && styles.statusPending,
                            tone === "cancelled" && styles.statusCancelled,
                          ]}
                        >
                          <Text style={styles.statusPillText}>{item.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, { color: amountColor }]}>
                    {normalizeType(item.type) === "payment" ? "-" : "+"}
                    {formatMoneyVnd(item.amount)}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>

        {pendingDepositStatus ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusTitle}>Top-up Status</Text>
            <Text style={styles.statusMeta}>OrderCode: {pendingDepositStatus.orderCode}</Text>
            <Text style={styles.statusMeta}>Status: {pendingDepositStatus.status}</Text>
            {pendingDepositStatus.newBalance !== undefined && pendingDepositStatus.newBalance !== null ? (
              <Text style={styles.statusMeta}>New balance: {formatMoneyVnd(pendingDepositStatus.newBalance)}</Text>
            ) : null}
            <Pressable
              style={[styles.statusButton, (pollingStatus || !pendingOrderCode) && styles.disabled]}
              disabled={pollingStatus || !pendingOrderCode}
              onPress={() => {
                if (pendingOrderCode) {
                  syncDepositStatus(pendingOrderCode);
                }
              }}
            >
              {pollingStatus ? <ActivityIndicator color="#fff" /> : <Text style={styles.statusButtonText}>Check status now</Text>}
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.successText}>{message}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3EFE9" },
  content: { paddingHorizontal: 16, paddingTop: 70, paddingBottom: 32, gap: 12 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  decorCircleOne: {
    position: "absolute",
    top: 180,
    right: -36,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(227, 220, 209, 0.42)",
  },
  decorCircleTwo: {
    position: "absolute",
    bottom: 180,
    left: -24,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(230, 222, 211, 0.36)",
  },
  decorCircleThree: {
    position: "absolute",
    top: 410,
    left: 240,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(229, 216, 203, 0.4)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  pageTitle: { color: "#1F2E39", fontSize: 40, lineHeight: 42, fontWeight: "900" },
  pageSubtitle: { color: "#9CA3AF", fontSize: 13, marginTop: 2, fontWeight: "600" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D9D6D0",
    backgroundColor: "#F8F8F7",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButtonText: { color: "#98A2B3", fontSize: 17, fontWeight: "700" },
  topUpButton: {
    borderRadius: 14,
    backgroundColor: "#D87D4A",
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  topUpButtonText: { color: "#fff", fontWeight: "900", fontSize: 22 },
  topUpFormCard: {
    borderWidth: 1,
    borderColor: "#E5DED3",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 8,
  },
  formTitle: { color: "#1F2E39", fontWeight: "800", fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 12,
    backgroundColor: "#F4F1EC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0F172A",
  },
  submitTopUpButton: {
    marginTop: 2,
    backgroundColor: "#D87D4A",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 11,
  },
  submitTopUpButtonText: { color: "#fff", fontWeight: "800" },
  walletHeroCard: {
    borderWidth: 1,
    borderColor: "#273540",
    borderRadius: 26,
    backgroundColor: "#192933",
    padding: 16,
    overflow: "hidden",
  },
  heroMetaRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  heroMetaPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroMetaLabel: {
    color: "#A7B2BE",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroMetaValue: {
    marginTop: 3,
    color: "#F7F8FA",
    fontSize: 13,
    fontWeight: "800",
  },
  walletTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  walletName: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  walletEmail: { color: "#A9B2BC", fontSize: 12, marginTop: 2 },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(216, 125, 74, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(216, 125, 74, 0.52)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3ECF8E",
  },
  activeText: { color: "#E7E7E8", fontSize: 11, fontWeight: "700" },
  balanceLabel: {
    marginTop: 18,
    color: "#7D8A96",
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "800",
  },
  heroBalance: {
    marginTop: 6,
    color: "#F7F8FA",
    fontSize: 56,
    lineHeight: 60,
    fontWeight: "900",
  },
  statCard: {
    borderWidth: 1,
    borderColor: "#E5DED3",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 12,
    minHeight: 96,
  },
  statHeaderRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 2 },
  statTitle: { color: "#B0B6BE", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  statValueGreen: { color: "#0C9B62", fontSize: 37, lineHeight: 40, fontWeight: "900" },
  statValuePurple: { color: "#6C3EF5", fontSize: 37, lineHeight: 40, fontWeight: "900" },
  statMeta: { color: "#9AA1A9", fontSize: 12, marginTop: 4, fontWeight: "600" },
  activityCard: {
    borderWidth: 1,
    borderColor: "#E5DED3",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  activityHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activityTitle: { color: "#1F2E39", fontSize: 31, fontWeight: "900" },
  activityAmount: { color: "#D87D4A", fontSize: 26, fontWeight: "900" },
  activitySubText: { color: "#99A0A8", fontSize: 12, marginTop: 2 },
  chartWrap: { marginTop: 12 },
  chartGridRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  chartAxisLabel: { width: 16, color: "#98A2B3", fontSize: 11 },
  chartGridLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#EDEFF2",
    borderStyle: "dashed",
  },
  chartLineRow: {
    marginTop: -68,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  chartPointCol: { alignItems: "center", justifyContent: "flex-end", gap: 4 },
  chartBar: {
    width: 8,
    borderRadius: 99,
    backgroundColor: "rgba(216, 125, 74, 0.22)",
  },
  chartPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D0D5DD",
  },
  chartPointActive: { backgroundColor: "#D87D4A", width: 10, height: 10, borderRadius: 5 },
  chartLabelRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -2 },
  chartBottomLabel: { color: "#98A2B3", fontSize: 11, width: 42, textAlign: "center" },
  transactionsCard: {
    borderWidth: 1,
    borderColor: "#E5DED3",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  transactionsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  transactionsTitle: { color: "#1F2E39", fontSize: 30, fontWeight: "900" },
  transactionsCountBubble: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
  },
  transactionsCountText: { color: "#98A2B3", fontWeight: "800", fontSize: 12 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, marginBottom: 8 },
  filterChip: {
    borderRadius: 999,
    backgroundColor: "#F6F7F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: "#D87D4A" },
  filterChipText: { color: "#98A2B3", fontSize: 13, fontWeight: "700" },
  filterChipTextActive: { color: "#fff" },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F2F4F7",
    paddingTop: 10,
    paddingBottom: 9,
  },
  transactionLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 8 },
  txIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  txIconText: { fontWeight: "800", fontSize: 16 },
  txTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  txTitle: { color: "#1F2E39", fontWeight: "800", fontSize: 14 },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusCompleted: { backgroundColor: "#EAF8F0" },
  statusPending: { backgroundColor: "#FFF4E8" },
  statusCancelled: { backgroundColor: "#FEECEE" },
  statusPillText: { color: "#98A2B3", fontSize: 10, fontWeight: "700" },
  txDate: { marginTop: 2, color: "#98A2B3", fontSize: 11 },
  txAmount: { fontWeight: "900", fontSize: 15 },
  statusBox: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#D7E6DD",
    backgroundColor: "#F2FAF5",
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  statusTitle: { color: "#0C9B62", fontWeight: "800" },
  statusMeta: { color: "#1F2E39", fontSize: 12 },
  statusButton: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: "#0C9B62",
    alignItems: "center",
    paddingVertical: 9,
  },
  statusButtonText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.65 },
  emptyText: { textAlign: "center", color: "#98A2B3", marginTop: 10 },
  errorText: { color: "#DC2626", marginTop: 8, fontWeight: "600" },
  successText: { color: "#059669", marginTop: 8, fontWeight: "600" },
});
