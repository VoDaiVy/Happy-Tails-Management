import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAdminTransactionById } from "../../api/modules/adminApi";
import type { AdminStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AdminStackParamList, "AdminTransactionDetail">;
type Dictionary = Record<string, unknown>;

type TimelineItem = {
  key: string;
  label: string;
  time?: string;
  completed: boolean;
  icon: keyof typeof Feather.glyphMap;
};

const COLORS = {
  page: "#FFF8F2",
  card: "#FFFFFF",
  hero: "#FFF1E4",
  border: "#F0DFCF",
  textPrimary: "#2D241C",
  textSecondary: "#7F6857",
  textMuted: "#A58F7D",
  accent: "#D47A43",
  accentDark: "#B85D2E",
  badgeBg: "#F9E4D4",
  divider: "#F2E6DB",
};

function asDict(input: unknown): Dictionary | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  return input as Dictionary;
}

function pickString(dict: Dictionary | null, keys: string[]): string | undefined {
  if (!dict) return undefined;
  for (const key of keys) {
    const value = dict[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(dict: Dictionary | null, keys: string[]): number | undefined {
  if (!dict) return undefined;
  for (const key of keys) {
    const raw = dict[key];
    const num = Number(raw);
    if (!Number.isNaN(num) && Number.isFinite(num)) return num;
  }
  return undefined;
}

function pickDate(dict: Dictionary | null, keys: string[]): string | undefined {
  const value = pickString(dict, keys);
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function toLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMoney(value?: number, currency?: string) {
  const amount = Number(value || 0);
  const code = (currency || "VND").toUpperCase();
  if (code === "VND") {
    return `${Math.round(amount).toLocaleString("vi-VN")} d`;
  }
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${code}`;
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColors(status?: string) {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "completed") return { bg: "#DCF2E1", text: "#247447" };
  if (normalized === "pending") return { bg: "#FDECCB", text: "#9A6E03" };
  if (normalized === "failed") return { bg: "#FCE4E8", text: "#B24055" };
  if (normalized === "cancelled") return { bg: "#E9ECF2", text: "#5A677A" };
  return { bg: "#EDE9E4", text: "#6E6258" };
}

function getPaymentIcon(method: string) {
  const value = method.toLowerCase();
  if (value.includes("wallet")) return "credit-card" as const;
  if (value.includes("bank")) return "briefcase" as const;
  if (value.includes("card")) return "credit-card" as const;
  if (value.includes("cash")) return "dollar-sign" as const;
  if (value.includes("payos")) return "shield" as const;
  return "circle" as const;
}

function createTimeline(detail: Dictionary | null): TimelineItem[] {
  const status = String(pickString(detail, ["status", "paymentStatus"]) || "pending").toLowerCase();
  const createdAt = pickDate(detail, ["createdAt"]);
  const processedAt = pickDate(detail, ["processedAt", "paidAt", "paymentProcessedAt"]);
  const releasedAt = pickDate(detail, ["releasedAt", "settledAt", "completedAt"]);
  const updatedAt = pickDate(detail, ["updatedAt"]);

  const statusHistory = detail?.statusHistory;
  const fromHistory = Array.isArray(statusHistory)
    ? statusHistory
        .map((item, index) => {
          const row = asDict(item);
          if (!row) return null;
          const title = pickString(row, ["title", "status", "state", "label"]) || `Step ${index + 1}`;
          const at = pickDate(row, ["at", "createdAt", "updatedAt", "time"]);
          const current = Boolean(row.isCurrent || row.completed || row.isDone);
          return {
            key: `history-${index}`,
            label: toLabel(title),
            time: at,
            completed: current || Boolean(at),
            icon: "check-circle" as const,
          };
        })
        .filter(Boolean) as TimelineItem[]
    : [];

  if (fromHistory.length > 0) {
    return fromHistory;
  }

  return [
    {
      key: "created",
      label: "Transaction Created",
      time: createdAt,
      completed: Boolean(createdAt),
      icon: "file-text",
    },
    {
      key: "processed",
      label: "Payment Processed",
      time: processedAt || updatedAt,
      completed: status === "completed" || Boolean(processedAt),
      icon: "credit-card",
    },
    {
      key: "released",
      label: "Funds Released",
      time: releasedAt || (status === "completed" ? updatedAt : undefined),
      completed: status === "completed" || Boolean(releasedAt),
      icon: "check-circle",
    },
    {
      key: "final",
      label: `Status: ${toLabel(status)}`,
      time: updatedAt,
      completed: true,
      icon: status === "failed" ? "x-circle" : status === "cancelled" ? "slash" : "clock",
    },
  ];
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value?: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Feather name={icon} size={14} color="#BD6A39" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "Not available"}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function AdminTransactionDetailScreen({ route, navigation }: Props) {
  const { transactionId } = route.params;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Dictionary | null>(null);

  const loadDetail = useCallback(
    async (options?: { isRefresh?: boolean }) => {
      const isRefresh = Boolean(options?.isRefresh);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      try {
        const response = await getAdminTransactionById(transactionId);
        setDetail(asDict(response));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load transaction details");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [transactionId],
  );

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const parsed = useMemo(() => {
    const user = asDict(detail?.userId);
    const service = asDict(detail?.service || detail?.serviceId || detail?.metadata);

    const code = pickString(detail, ["transactionCode", "code", "referenceId", "_id"]);
    const amount = pickNumber(detail, ["amount", "totalAmount"]);
    const currency = pickString(detail, ["currency"]) || "VND";
    const status = pickString(detail, ["status", "paymentStatus"]) || "pending";
    const type = pickString(detail, ["type", "paymentType", "category"]);
    const method = pickString(detail, ["method", "paymentMethod", "gateway"]) || "system";
    const createdAt = pickDate(detail, ["createdAt"]);
    const updatedAt = pickDate(detail, ["updatedAt"]);

    const name = pickString(user, ["fullName", "name"]);
    const email = pickString(user, ["email"]);
    const phone = pickString(user, ["phone", "phoneNumber"]);

    const serviceName = pickString(detail, ["serviceName", "title", "description"]) || pickString(service, ["name", "title"]);
    const subtitle = pickString(detail, ["note", "description", "failureReason"]) || pickString(service, ["description", "subtitle"]);

    const cardNumberRaw = pickString(detail, ["cardNumber", "maskedCardNumber"]);
    const maskedCard = cardNumberRaw
      ? cardNumberRaw
      : pickString(detail, ["referenceId", "payosOrderCode"])
        ? `**** ${String(pickString(detail, ["referenceId", "payosOrderCode"]))!.slice(-4)}`
        : undefined;

    const expiry = pickString(detail, ["cardExpiry", "expiry", "expDate"]);

    return {
      code,
      amount,
      currency,
      status,
      type,
      method,
      createdAt,
      updatedAt,
      name,
      email,
      phone,
      serviceName,
      subtitle,
      maskedCard,
      expiry,
      timeline: createTimeline(detail),
    };
  }, [detail]);

  const statusStyle = getStatusColors(parsed.status);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading transaction details...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.centerState}>
        <Feather name="alert-circle" size={20} color="#B95353" />
        <Text style={styles.errorTitle}>{error || "No transaction details found"}</Text>
        <Pressable style={styles.retryButton} onPress={() => loadDetail()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.backGhostButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backGhostText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}> 
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={18} color="#4A3B2E" />
        </Pressable>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={styles.headerAvatar}>
          <Feather name="user" size={14} color="#8A5A3A" />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDetail({ isRefresh: true })} tintColor={COLORS.accent} />}
      >
        {error ? (
          <View style={styles.inlineError}>
            <Feather name="alert-triangle" size={14} color="#AD4D4D" />
            <Text style={styles.inlineErrorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}> 
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{toLabel(parsed.status)}</Text>
          </View>
          <Text style={styles.heroAmount}>{formatMoney(parsed.amount, parsed.currency)}</Text>
          <Text style={styles.heroSubtitle}>Transaction ID: {parsed.code || "Not available"}</Text>
        </View>

        <Section title="Service / Transaction Details">
          <InfoRow icon="briefcase" label="Title" value={parsed.serviceName || parsed.type ? toLabel(parsed.serviceName || parsed.type || "") : undefined} />
          <InfoRow icon="align-left" label="Subtitle" value={parsed.subtitle} />
          <InfoRow icon="calendar" label="Date" value={formatDate(parsed.createdAt)} />
          <InfoRow icon="clock" label="Time" value={formatTime(parsed.createdAt)} />
        </Section>

        <Section title="Customer Information">
          <InfoRow icon="user" label="Full Name" value={parsed.name} />
          <InfoRow icon="mail" label="Email" value={parsed.email} />
          <InfoRow icon="phone" label="Phone" value={parsed.phone} />
        </Section>

        <Section title="Payment Method">
          <View style={styles.paymentCard}>
            <View style={styles.paymentIconWrap}>
              <Feather name={getPaymentIcon(parsed.method)} size={15} color="#B86130" />
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentType}>{toLabel(parsed.method)}</Text>
              <Text style={styles.paymentMeta}>{parsed.maskedCard || "No card reference"}</Text>
              {parsed.expiry ? <Text style={styles.paymentExpiry}>Expiry: {parsed.expiry}</Text> : null}
            </View>
          </View>
        </Section>

        <Section title="Transaction Timeline">
          <View style={styles.timelineWrap}>
            {parsed.timeline.map((item, index) => (
              <View key={item.key} style={styles.timelineRow}>
                <View style={styles.timelineLeftCol}>
                  <View style={[styles.timelineDot, item.completed && styles.timelineDotActive]}>
                    <Feather name={item.icon} size={12} color={item.completed ? "#FFFFFF" : "#BD8F72"} />
                  </View>
                  {index < parsed.timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{item.label}</Text>
                  <Text style={styles.timelineTime}>{formatDateTime(item.time)}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Additional Details">
          <InfoRow icon="hash" label="Transaction Code" value={parsed.code} />
          <InfoRow icon="dollar-sign" label="Amount" value={formatMoney(parsed.amount, parsed.currency)} />
          <InfoRow icon="globe" label="Currency" value={(parsed.currency || "VND").toUpperCase()} />
          <InfoRow icon="tag" label="Payment Type" value={parsed.type ? toLabel(parsed.type) : undefined} />
          <InfoRow icon="check-square" label="Payment Status" value={toLabel(parsed.status)} />
          <InfoRow icon="clock" label="Created At" value={formatDateTime(parsed.createdAt)} />
          <InfoRow icon="refresh-cw" label="Updated At" value={formatDateTime(parsed.updatedAt)} />
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.page },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingBottom: 22, gap: 10 },
  header: {
    backgroundColor: COLORS.page,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EBD8C8",
    backgroundColor: "#FFFDFB",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#32261C",
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F8E8DB",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F0DCCB",
    backgroundColor: COLORS.hero,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 7,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  heroAmount: {
    color: COLORS.accentDark,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    color: "#5E4635",
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  sectionBody: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 8,
    gap: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
  },
  infoIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCEFE4",
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  paymentCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0DECF",
    backgroundColor: "#FFFAF5",
    paddingHorizontal: 10,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  paymentIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FCECDD",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: {
    flex: 1,
    gap: 2,
  },
  paymentType: {
    color: "#3E2D1F",
    fontSize: 14,
    fontWeight: "800",
  },
  paymentMeta: {
    color: "#7C6554",
    fontSize: 12,
    fontWeight: "600",
  },
  paymentExpiry: {
    color: "#AA8D78",
    fontSize: 11,
    fontWeight: "600",
  },
  timelineWrap: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
  },
  timelineLeftCol: {
    width: 20,
    alignItems: "center",
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F8EBE0",
    borderWidth: 1,
    borderColor: "#EFDCCB",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    backgroundColor: "#F2DDCB",
    borderRadius: 99,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 1,
    paddingBottom: 12,
    justifyContent: "center",
  },
  timelineTitle: {
    color: "#3B2E24",
    fontSize: 13,
    fontWeight: "700",
  },
  timelineTime: {
    marginTop: 2,
    color: "#9A8575",
    fontSize: 11,
    fontWeight: "600",
  },
  centerState: {
    flex: 1,
    backgroundColor: COLORS.page,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    gap: 10,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  errorTitle: {
    color: "#8A3A3A",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "700",
  },
  retryButton: {
    marginTop: 2,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  backGhostButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E9D8CA",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backGhostText: {
    color: "#805D45",
    fontSize: 12,
    fontWeight: "700",
  },
  inlineError: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F2D1D1",
    backgroundColor: "#FFF3F3",
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineErrorText: {
    flex: 1,
    color: "#A34848",
    fontSize: 12,
    fontWeight: "600",
  },
});
