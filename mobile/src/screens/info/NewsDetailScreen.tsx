import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getNewsBySlug } from "../../api/modules/newsApi";
import type { InfoStackParamList } from "../../navigation/types";
import type { NewsItem } from "../../types/news";

type Props = NativeStackScreenProps<InfoStackParamList, "NewsDetail">;

function formatDateLabel(value?: string) {
  if (!value) return "Draft";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Draft";
  return date.toLocaleString();
}

function splitContent(content: string) {
  return content
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isHeadingLine(line: string) {
  const normalized = line.replace(/^#+\s*/, "").trim();
  if (!normalized) return false;
  if (line.startsWith("#")) return true;
  return normalized.length < 52 && /^[A-Z0-9\s,:-]+$/.test(normalized);
}

function isBulletLine(line: string) {
  return /^[-*]\s+/.test(line.trim());
}

export function NewsDetailScreen({ route, navigation }: Props) {
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
      setError(e instanceof Error ? e.message : "Cannot load news details.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const paragraphs = useMemo(() => splitContent(news?.content || ""), [news?.content]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D06A28" />
      </View>
    );
  }

  if (!news) {
    return (
      <View style={styles.centerBox}>
        <Feather name="alert-circle" size={20} color="#C7372F" />
        <Text style={styles.errorText}>{error || "Article not found."}</Text>
        <Pressable style={styles.retryButton} onPress={loadDetail}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroWrap}>
          {news.coverImage ? (
            <Image source={{ uri: news.coverImage }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Feather name="image" size={30} color="#C38759" />
            </View>
          )}

          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color="#3D2617" />
          </Pressable>

          <Pressable style={styles.topActionButton}>
            <Feather name="bookmark" size={17} color="#3D2617" />
          </Pressable>
        </View>

        <View style={styles.articleWrap}>
          <View style={styles.metaTopRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{String(news.category || "General").toUpperCase()}</Text>
            </View>
            <Text style={styles.dateText}>{formatDateLabel(news.publishedAt || news.createdAt)}</Text>
          </View>

          <Text style={styles.title}>{news.title}</Text>
          {news.excerpt ? <Text style={styles.excerpt}>{news.excerpt}</Text> : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Feather name="eye" size={14} color="#9A6B48" />
              <Text style={styles.statText}>{news.views || 0} views</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="clock" size={14} color="#9A6B48" />
              <Text style={styles.statText}>Reading mode</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.bodyWrap}>
            {paragraphs.length === 0 ? (
              <Text style={styles.bodyText}>No content available.</Text>
            ) : (
              paragraphs.map((line, index) => {
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

          {news.tags && news.tags.length > 0 ? (
            <View style={styles.tagWrap}>
              {news.tags.slice(0, 5).map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
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

  content: { paddingBottom: 30 },
  heroWrap: { height: 250, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F4DEC7",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 250, 244, 0.95)",
    borderWidth: 1,
    borderColor: "#F0D8BE",
    alignItems: "center",
    justifyContent: "center",
  },
  topActionButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 250, 244, 0.95)",
    borderWidth: 1,
    borderColor: "#F0D8BE",
    alignItems: "center",
    justifyContent: "center",
  },

  articleWrap: {
    marginTop: -22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FFFDF9",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: "#EFDECB",
  },
  metaTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  categoryBadge: {
    borderRadius: 999,
    backgroundColor: "#FBE8D4",
    borderWidth: 1,
    borderColor: "#EEC7A2",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: { color: "#9A582A", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  dateText: { color: "#9D7658", fontSize: 12, fontWeight: "600" },

  title: {
    marginTop: 10,
    color: "#2B170A",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
  },
  excerpt: {
    marginTop: 8,
    color: "#7E5A40",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
  },
  statsRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 16 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { color: "#946744", fontSize: 12, fontWeight: "700" },

  divider: { marginTop: 14, height: 1, backgroundColor: "#F0E1D1" },
  bodyWrap: { marginTop: 14, gap: 12 },
  sectionHeading: {
    color: "#3A2211",
    fontSize: 21,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 4,
  },
  bodyText: { color: "#5A4230", fontSize: 17, lineHeight: 29, fontWeight: "500" },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingRight: 2 },
  bulletDot: { color: "#B35C24", fontSize: 16, lineHeight: 28, fontWeight: "900" },
  bulletText: { flex: 1, color: "#5A4230", fontSize: 17, lineHeight: 29, fontWeight: "500" },

  tagWrap: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8CCB2",
    backgroundColor: "#FFF0E0",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { color: "#9C562A", fontSize: 12, fontWeight: "700" },
});
