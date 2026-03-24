import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getPolicyBySlug } from "../../api/modules/policyApi";
import type { InfoStackParamList } from "../../navigation/types";
import type { PolicyItem } from "../../types/policy";

type Props = NativeStackScreenProps<InfoStackParamList, "PolicyDetail">;

function formatDateLabel(value?: string) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString();
}

function formatPolicyType(type?: string) {
  const value = String(type || "general").toLowerCase();
  if (value === "terms") return "Terms of Service";
  if (value === "privacy") return "Privacy Policy";
  if (value === "refund") return "Refund Policy";
  if (value === "cancellation") return "Cancellation Policy";
  return "General Policy";
}

function splitSections(content: string) {
  const sections = content
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);

  return sections;
}

function isHeadingLine(line: string) {
  const normalized = line.replace(/^#+\s*/, "").trim();
  if (!normalized) return false;
  if (line.startsWith("#")) return true;
  return normalized.length < 58 && /^[A-Z0-9\s,:-]+$/.test(normalized);
}

function isBulletLine(line: string) {
  return /^[-*]\s+/.test(line.trim());
}

export function PolicyDetailScreen({ route, navigation }: Props) {
  const { slug } = route.params;
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<PolicyItem | null>(null);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const detail = await getPolicyBySlug(slug);
      setPolicy(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot load policy details.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const sections = useMemo(() => splitSections(policy?.content || ""), [policy?.content]);
  const highlightText = useMemo(() => {
    const first = sections[0] || "";
    if (!first) return "Please review this policy carefully before using our services.";
    return first.length > 160 ? `${first.slice(0, 157)}...` : first;
  }, [sections]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D06A28" />
      </View>
    );
  }

  if (!policy) {
    return (
      <View style={styles.centerBox}>
        <Feather name="alert-triangle" size={20} color="#C7372F" />
        <Text style={styles.errorText}>{error || "Policy not found."}</Text>
        <Pressable style={styles.retryButton} onPress={loadDetail}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={18} color="#3B2516" />
            </Pressable>

            <View style={styles.headerIconWrap}>
              <Feather name="shield" size={18} color="#9A5A2F" />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{formatPolicyType(policy.type).toUpperCase()}</Text>
            </View>
            <Text style={styles.versionText}>v{policy.version || "1.0"}</Text>
          </View>

          <Text style={styles.title}>{policy.title}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Updated</Text>
              <Text style={styles.infoValue}>{formatDateLabel(policy.effectiveDate || policy.createdAt)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>{formatPolicyType(policy.type)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.highlightBox}>
          <Feather name="alert-circle" size={16} color="#B35E29" />
          <Text style={styles.highlightText}>{highlightText}</Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.contentTitle}>Policy Details</Text>

          {sections.length === 0 ? (
            <Text style={styles.bodyText}>No policy content available.</Text>
          ) : (
            sections.map((line, index) => {
              if (isHeadingLine(line)) {
                return <Text key={`${index}-${line.slice(0, 12)}`} style={styles.sectionHeading}>{line.replace(/^#+\s*/, "")}</Text>;
              }

              if (isBulletLine(line)) {
                return (
                  <View key={`${index}-${line.slice(0, 12)}`} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{line.replace(/^[-*]\s+/, "")}</Text>
                  </View>
                );
              }

              return <Text key={`${index}-${line.slice(0, 12)}`} style={styles.bodyText}>{line}</Text>;
            })
          )}
        </View>

        <View style={styles.helpCard}>
          <Feather name="help-circle" size={17} color="#9F602E" />
          <Text style={styles.helpText}>Need clarification? Contact support for guidance before booking.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F1EA" },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: "#F7F1EA",
  },
  errorText: { color: "#B0332A", fontSize: 14, textAlign: "center", lineHeight: 20, fontWeight: "600" },
  retryButton: {
    marginTop: 2,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5B8AA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  retryButtonText: { color: "#A53A2F", fontWeight: "800" },

  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 12 },
  headerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EFDCC8",
    backgroundColor: "#FFFDF8",
    padding: 14,
    gap: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F8EBDD",
    borderWidth: 1,
    borderColor: "#EED6BF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F8E6D4",
    borderWidth: 1,
    borderColor: "#EACFB2",
    alignItems: "center",
    justifyContent: "center",
  },

  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  typeBadge: {
    borderRadius: 999,
    backgroundColor: "#FBE8D4",
    borderWidth: 1,
    borderColor: "#EEC7A2",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: { color: "#9A582A", fontSize: 10, fontWeight: "800", letterSpacing: 0.75 },
  versionText: { color: "#8F6A4F", fontSize: 12, fontWeight: "700" },
  title: { color: "#2B170A", fontSize: 30, lineHeight: 36, fontWeight: "900" },

  infoGrid: { flexDirection: "row", gap: 10 },
  infoItem: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EFDECC",
    backgroundColor: "#FFFAF4",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 3,
  },
  infoLabel: { color: "#A07656", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.7 },
  infoValue: { color: "#553624", fontSize: 13, fontWeight: "700" },

  highlightBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBC6A5",
    backgroundColor: "#FFF0DE",
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  highlightText: { flex: 1, color: "#77482A", fontSize: 14, lineHeight: 21, fontWeight: "600" },

  contentCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EFDDCA",
    backgroundColor: "#FFFDF9",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  contentTitle: { color: "#321C0D", fontSize: 24, lineHeight: 30, fontWeight: "900" },
  sectionHeading: {
    color: "#3A2211",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "900",
    marginTop: 3,
  },
  bodyText: { color: "#5A4230", fontSize: 16, lineHeight: 27, fontWeight: "500" },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingRight: 2 },
  bulletDot: { color: "#B35C24", fontSize: 16, lineHeight: 27, fontWeight: "900" },
  bulletText: { flex: 1, color: "#5A4230", fontSize: 16, lineHeight: 27, fontWeight: "500" },

  helpCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEDBC8",
    backgroundColor: "#FFF7EE",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  helpText: { flex: 1, color: "#7A573E", fontSize: 13, lineHeight: 19, fontWeight: "600" },
});
