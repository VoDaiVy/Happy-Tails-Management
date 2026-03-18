import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { getNewsBySlug } from "../../api/modules/newsApi";
import type { InfoStackParamList } from "../../navigation/types";
import type { NewsItem } from "../../types/news";

type Props = NativeStackScreenProps<InfoStackParamList, "NewsDetail">;

export function NewsDetailScreen({ route }: Props) {
  const { slug } = route.params;
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsItem | null>(null);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const detail = await getNewsBySlug(slug);
      setNews(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc chi tiet news");
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

  if (!news) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{error || "Khong tim thay bai viet"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{news.title}</Text>
      <Text style={styles.meta}>Category: {news.category || "general"}</Text>
      <Text style={styles.meta}>Slug: {news.slug}</Text>
      <Text style={styles.meta}>Published: {news.publishedAt ? new Date(news.publishedAt).toLocaleString() : "Draft"}</Text>
      <View style={styles.divider} />
      <Text style={styles.body}>{news.content || ""}</Text>
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
