import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { getPolicyBySlug } from "../../api/modules/policyApi";
import type { InfoStackParamList } from "../../navigation/types";
import type { PolicyItem } from "../../types/policy";

type Props = NativeStackScreenProps<InfoStackParamList, "PolicyDetail">;

export function PolicyDetailScreen({ route }: Props) {
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
      setError(e instanceof Error ? e.message : "Khong tai duoc chi tiet policy");
    } finally {
      setLoading(false);
    }
  }, [slug]);

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

  if (!policy) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{error || "Khong tim thay policy"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{policy.title}</Text>
      <Text style={styles.meta}>Type: {policy.type}</Text>
      <Text style={styles.meta}>Version: {policy.version || "1.0"}</Text>
      <Text style={styles.meta}>Slug: {policy.slug}</Text>
      <Text style={styles.meta}>Effective: {policy.effectiveDate ? new Date(policy.effectiveDate).toLocaleDateString() : "N/A"}</Text>
      <View style={styles.divider} />
      <Text style={styles.body}>{policy.content || ""}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1EC" },
  content: { padding: 16, gap: 10, paddingBottom: 24 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  title: { fontSize: 24, fontWeight: "900", color: "#2F3742" },
  meta: { color: "#8395B2", fontSize: 12 },
  divider: { height: 1, backgroundColor: "#E7DED1", marginVertical: 4 },
  body: { color: "#4D5E78", lineHeight: 22 },
  errorText: { color: "#DC2626" },
});
