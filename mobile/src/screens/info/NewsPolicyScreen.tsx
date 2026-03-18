import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { getNews } from "../../api/modules/newsApi";
import { getPolicies } from "../../api/modules/policyApi";
import type { NewsItem } from "../../types/news";
import type { PolicyItem } from "../../types/policy";

export function NewsPolicyScreen() {
  const [activeTab, setActiveTab] = useState<"news" | "policy">("news");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [policyList, setPolicyList] = useState<PolicyItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [news, policies] = await Promise.all([getNews(), getPolicies()]);
        setNewsList(news);
        setPolicyList(policies);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Khong tai duoc du lieu News/Policy");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isNewsTab = activeTab === "news";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>News & Policy</Text>

      <View style={styles.switchRow}>
        <Pressable style={[styles.switchButton, isNewsTab && styles.switchButtonActive]} onPress={() => setActiveTab("news")}>
          <Text style={[styles.switchText, isNewsTab && styles.switchTextActive]}>News</Text>
        </Pressable>
        <Pressable style={[styles.switchButton, !isNewsTab && styles.switchButtonActive]} onPress={() => setActiveTab("policy")}>
          <Text style={[styles.switchText, !isNewsTab && styles.switchTextActive]}>Policy</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isNewsTab ? (
        <FlatList
          data={newsList}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co news nao</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>Category: {item.category || "general"}</Text>
              <Text style={styles.cardBody}>{item.excerpt || item.content?.slice(0, 220) || ""}</Text>
              <Text style={styles.cardDate}>{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "Draft"}</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={policyList}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co policy nao</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>Type: {item.type} · Version: {item.version || "1.0"}</Text>
              <Text style={styles.cardBody}>{item.content?.slice(0, 260) || ""}</Text>
              <Text style={styles.cardDate}>{item.effectiveDate ? new Date(item.effectiveDate).toLocaleDateString() : ""}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  switchRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  switchButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 10,
  },
  switchButtonActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  switchText: { color: "#334155", fontWeight: "700" },
  switchTextActive: { color: "#fff" },
  listContent: { paddingTop: 12, paddingBottom: 20, gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
    gap: 4,
  },
  cardTitle: { color: "#0F172A", fontWeight: "800", fontSize: 16 },
  cardMeta: { color: "#475569", fontSize: 12 },
  cardBody: { color: "#334155", marginTop: 2 },
  cardDate: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 12 },
  errorText: { color: "#DC2626", marginTop: 8 },
});
