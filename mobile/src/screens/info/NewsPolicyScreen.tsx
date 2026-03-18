import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getNews } from "../../api/modules/newsApi";
import { getPolicies } from "../../api/modules/policyApi";
import type { InfoStackParamList } from "../../navigation/types";
import type { NewsItem } from "../../types/news";
import type { PolicyItem } from "../../types/policy";

type Props = NativeStackScreenProps<InfoStackParamList, "NewsPolicyHome">;

export function NewsPolicyScreen({ navigation }: Props) {
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
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("NewsDetail", { slug: item.slug, title: item.title })}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>Category: {item.category || "general"}</Text>
              <Text style={styles.cardBody}>{item.excerpt || item.content?.slice(0, 220) || ""}</Text>
              <Text style={styles.cardDate}>{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "Draft"}</Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={policyList}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co policy nao</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("PolicyDetail", { slug: item.slug, title: item.title })}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>Type: {item.type} · Version: {item.version || "1.0"}</Text>
              <Text style={styles.cardBody}>{item.content?.slice(0, 260) || ""}</Text>
              <Text style={styles.cardDate}>{item.effectiveDate ? new Date(item.effectiveDate).toLocaleDateString() : ""}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1EC", padding: 16 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "900", color: "#2F3742" },
  switchRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  switchButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E3E5E9",
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 11,
  },
  switchButtonActive: { backgroundColor: "#D87D4A", borderColor: "#D87D4A" },
  switchText: { color: "#4D5E78", fontWeight: "700" },
  switchTextActive: { color: "#fff" },
  listContent: { paddingTop: 12, paddingBottom: 20, gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#E7DED1",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 14,
    gap: 6,
  },
  cardTitle: { color: "#2F3742", fontWeight: "800", fontSize: 16 },
  cardMeta: { color: "#6C7A90", fontSize: 12 },
  cardBody: { color: "#4D5E78", marginTop: 2 },
  cardDate: { color: "#98A2B3", fontSize: 12, marginTop: 2 },
  emptyText: { color: "#8395B2", textAlign: "center", marginTop: 12 },
  errorText: { color: "#DC2626", marginTop: 8 },
});
