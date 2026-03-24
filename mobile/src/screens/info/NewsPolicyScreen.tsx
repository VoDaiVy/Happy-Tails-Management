import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getNews } from "../../api/modules/newsApi";
import { getPolicies } from "../../api/modules/policyApi";
import type { InfoStackParamList } from "../../navigation/types";
import type { NewsItem } from "../../types/news";
import type { PolicyItem } from "../../types/policy";

type Props = NativeStackScreenProps<InfoStackParamList, "NewsPolicyHome">;
type ActiveTab = "news" | "policy";

function formatDateLabel(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}

function getPreview(text: string | undefined, fallback = "") {
  const source = String(text || fallback || "").replace(/\s+/g, " ").trim();
  if (!source) return "";
  return source.length > 150 ? `${source.slice(0, 147)}...` : source;
}

function formatPolicyType(type?: string) {
  const value = String(type || "general").toLowerCase();
  if (value === "terms") return "Terms";
  if (value === "privacy") return "Privacy";
  if (value === "refund") return "Refund";
  if (value === "cancellation") return "Cancellation";
  return "General";
}

function NewsLoadingSkeleton() {
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.skeletonFeatured}>
        <View style={styles.skeletonBanner} />
        <View style={styles.skeletonLineWide} />
        <View style={styles.skeletonLineMid} />
        <View style={styles.skeletonLineShort} />
      </View>
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonCard} />
    </View>
  );
}

function PolicyLoadingSkeleton() {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.skeletonPolicy} />
      <View style={styles.skeletonPolicy} />
      <View style={styles.skeletonPolicy} />
    </View>
  );
}

export function NewsPolicyScreen({ navigation, route }: Props) {
  const initialTab = route.params?.initialTab === "policy" ? "policy" : "news";
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [policyList, setPolicyList] = useState<PolicyItem[]>([]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    try {
      const [news, policies] = await Promise.all([getNews(), getPolicies()]);
      setNewsList(news);
      setPolicyList(policies);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot load News/Policy data right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const nextTab = route.params?.initialTab;
    if (nextTab === "news" || nextTab === "policy") {
      setActiveTab(nextTab);
    }
  }, [route.params?.initialTab]);

  const keyword = useMemo(() => searchText.trim().toLowerCase(), [searchText]);

  const filteredNews = useMemo(() => {
    if (!keyword) return newsList;
    return newsList.filter((item) => {
      const title = String(item.title || "").toLowerCase();
      const category = String(item.category || "").toLowerCase();
      const excerpt = String(item.excerpt || "").toLowerCase();
      const content = String(item.content || "").toLowerCase();
      return title.includes(keyword) || category.includes(keyword) || excerpt.includes(keyword) || content.includes(keyword);
    });
  }, [newsList, keyword]);

  const filteredPolicies = useMemo(() => {
    if (!keyword) return policyList;
    return policyList.filter((item) => {
      const title = String(item.title || "").toLowerCase();
      const type = String(item.type || "").toLowerCase();
      const content = String(item.content || "").toLowerCase();
      return title.includes(keyword) || type.includes(keyword) || content.includes(keyword);
    });
  }, [policyList, keyword]);

  const featuredNews = filteredNews[0] || null;
  const latestNews = featuredNews ? filteredNews.slice(1, 3) : filteredNews.slice(0, 2);
  const normalNews = featuredNews ? filteredNews.slice(3) : filteredNews.slice(2);

  const isNewsTab = activeTab === "news";
  const hasData = isNewsTab ? filteredNews.length > 0 : filteredPolicies.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#D36C2A" />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>News & Policy</Text>
          <Pressable style={styles.searchIconButton}>
            <Feather name="search" size={18} color="#7A4A27" />
          </Pressable>
        </View>

        <View style={styles.switchRow}>
          <Pressable style={[styles.switchButton, isNewsTab && styles.switchButtonActive]} onPress={() => setActiveTab("news")}>
            <Text style={[styles.switchText, isNewsTab && styles.switchTextActive]}>News</Text>
          </Pressable>
          <Pressable style={[styles.switchButton, !isNewsTab && styles.switchButtonActive]} onPress={() => setActiveTab("policy")}>
            <Text style={[styles.switchText, !isNewsTab && styles.switchTextActive]}>Policy</Text>
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#B28763" />
          <TextInput
            style={styles.searchInput}
            placeholder={isNewsTab ? "Search stories..." : "Search policies..."}
            placeholderTextColor="#C0A184"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {loading ? (
          isNewsTab ? <NewsLoadingSkeleton /> : <PolicyLoadingSkeleton />
        ) : null}

        {!loading && error && !hasData ? (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={18} color="#C7372F" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadData()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && isNewsTab && featuredNews ? (
          <Pressable
            style={styles.featuredCard}
            onPress={() => navigation.navigate("NewsDetail", { slug: featuredNews.slug, title: featuredNews.title })}
          >
            {featuredNews.coverImage ? (
              <Image source={{ uri: featuredNews.coverImage }} style={styles.featuredImage} resizeMode="cover" />
            ) : (
              <View style={styles.featuredImagePlaceholder}>
                <Feather name="image" size={26} color="#BD7D4D" />
              </View>
            )}

            <View style={styles.featuredBody}>
              <View style={styles.metaRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{String(featuredNews.category || "General").toUpperCase()}</Text>
                </View>
                <Text style={styles.timeText}>{formatDateLabel(featuredNews.publishedAt || featuredNews.createdAt)}</Text>
              </View>

              <Text style={styles.featuredTitle}>{featuredNews.title}</Text>
              <Text style={styles.featuredExcerpt}>{getPreview(featuredNews.excerpt, featuredNews.content)}</Text>
              <Text style={styles.ctaText}>Read Story  →</Text>
            </View>
          </Pressable>
        ) : null}

        {!loading && !error && isNewsTab && latestNews.length > 0 ? (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Latest Updates</Text>
            </View>

            {latestNews.map((item) => (
              <Pressable
                key={item._id}
                style={styles.newsCompactCard}
                onPress={() => navigation.navigate("NewsDetail", { slug: item.slug, title: item.title })}
              >
                {item.coverImage ? (
                  <Image source={{ uri: item.coverImage }} style={styles.newsCompactThumb} resizeMode="cover" />
                ) : (
                  <View style={styles.newsCompactThumbPlaceholder}>
                    <Feather name="file-text" size={18} color="#B77E54" />
                  </View>
                )}

                <View style={styles.newsCompactBody}>
                  <Text style={styles.newsCompactTag}>{String(item.category || "General").toUpperCase()}</Text>
                  <Text style={styles.newsCompactTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.newsCompactExcerpt} numberOfLines={2}>{getPreview(item.excerpt, item.content)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!loading && !error && isNewsTab && normalNews.length > 0 ? (
          <View style={styles.normalNewsWrap}>
            {normalNews.map((item) => (
              <Pressable
                key={item._id}
                style={styles.normalNewsCard}
                onPress={() => navigation.navigate("NewsDetail", { slug: item.slug, title: item.title })}
              >
                <View style={styles.metaRow}>
                  <View style={styles.badgeMuted}>
                    <Text style={styles.badgeMutedText}>{String(item.category || "General").toUpperCase()}</Text>
                  </View>
                  <Text style={styles.timeText}>{formatDateLabel(item.publishedAt || item.createdAt)}</Text>
                </View>
                <Text style={styles.normalNewsTitle}>{item.title}</Text>
                <Text style={styles.normalNewsExcerpt} numberOfLines={3}>{getPreview(item.excerpt, item.content)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!loading && !error && !isNewsTab && filteredPolicies.length > 0 ? (
          <View style={styles.policyWrap}>
            {filteredPolicies.map((item, index) => (
              <Pressable
                key={item._id}
                style={[styles.policyCard, index === 0 && styles.policyCardFeatured]}
                onPress={() => navigation.navigate("PolicyDetail", { slug: item.slug, title: item.title })}
              >
                <View style={styles.policyIconWrap}>
                  <Feather name="shield" size={18} color="#9D5F33" />
                </View>

                <View style={styles.policyBody}>
                  <View style={styles.metaRow}>
                    <View style={styles.badgeMuted}>
                      <Text style={styles.badgeMutedText}>{formatPolicyType(item.type).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.timeText}>{formatDateLabel(item.effectiveDate || item.createdAt)}</Text>
                  </View>

                  <Text style={styles.policyTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.policySummary} numberOfLines={3}>{getPreview(item.content)}</Text>
                  <Text style={styles.policyCta}>Read Policy  →</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!loading && !error && !hasData ? (
          <View style={styles.emptyCard}>
            <Feather name="book-open" size={24} color="#C47A45" />
            <Text style={styles.emptyTitle}>{isNewsTab ? "No news found" : "No policy found"}</Text>
            <Text style={styles.emptyText}>Try a different keyword or refresh to load the latest content.</Text>
          </View>
        ) : null}

        {!loading && error && hasData ? <Text style={styles.inlineWarn}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F1EA" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 12 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#8B3E0B", fontSize: 30, lineHeight: 34, fontWeight: "900" },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F8EBDD",
    borderWidth: 1,
    borderColor: "#EFD9C2",
    alignItems: "center",
    justifyContent: "center",
  },

  switchRow: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EED9C4",
    backgroundColor: "#F8ECDF",
    flexDirection: "row",
    padding: 4,
    marginTop: 2,
  },
  switchButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  switchButtonActive: {
    backgroundColor: "#DE6821",
    shadowColor: "#AB5119",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  switchText: { color: "#8A5A38", fontSize: 15, fontWeight: "800" },
  switchTextActive: { color: "#FFFFFF" },

  searchBar: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEDBC8",
    backgroundColor: "#FFFAF4",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, color: "#6E4A2E", fontSize: 14, fontWeight: "600" },

  featuredCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#EFDDCA",
    backgroundColor: "#FFFDF9",
    overflow: "hidden",
  },
  featuredImage: { width: "100%", height: 190 },
  featuredImagePlaceholder: {
    width: "100%",
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5E4D1",
  },
  featuredBody: { padding: 14, gap: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  badge: {
    borderRadius: 999,
    backgroundColor: "#FBE8D4",
    borderWidth: 1,
    borderColor: "#EFC8A6",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: "#9A582A", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  badgeMuted: {
    borderRadius: 999,
    backgroundColor: "#F6E8D9",
    borderWidth: 1,
    borderColor: "#EAD4C1",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeMutedText: { color: "#94613F", fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  timeText: { color: "#A17758", fontSize: 12, fontWeight: "600" },
  featuredTitle: { color: "#2C170A", fontSize: 25, lineHeight: 31, fontWeight: "900" },
  featuredExcerpt: { color: "#7E5A40", fontSize: 14, lineHeight: 21, fontWeight: "500" },
  ctaText: { color: "#B1501C", fontSize: 16, fontWeight: "800", marginTop: 2 },

  sectionWrap: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F0E0CF",
    backgroundColor: "#FFFDF9",
    padding: 12,
    gap: 10,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  sectionAccent: { width: 3, height: 24, borderRadius: 3, backgroundColor: "#B85A22" },
  sectionTitle: { color: "#2D1A0D", fontSize: 31, lineHeight: 34, fontWeight: "900" },
  newsCompactCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFDCC8",
    backgroundColor: "#FFF7EE",
    padding: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  newsCompactThumb: { width: 90, height: 90, borderRadius: 16, backgroundColor: "#EED7C1" },
  newsCompactThumbPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: "#F2E2D1",
    alignItems: "center",
    justifyContent: "center",
  },
  newsCompactBody: { flex: 1, gap: 3 },
  newsCompactTag: { color: "#AF5B27", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  newsCompactTitle: { color: "#2D180B", fontSize: 18, lineHeight: 24, fontWeight: "800" },
  newsCompactExcerpt: { color: "#7C573E", fontSize: 14, lineHeight: 20, fontWeight: "500" },

  normalNewsWrap: { gap: 10 },
  normalNewsCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EEDCC9",
    backgroundColor: "#F9EFE5",
    padding: 14,
    gap: 8,
  },
  normalNewsTitle: { color: "#2D180B", fontSize: 19, lineHeight: 26, fontWeight: "800" },
  normalNewsExcerpt: { color: "#7F5E46", fontSize: 14, lineHeight: 21, fontWeight: "500" },

  policyWrap: { gap: 12 },
  policyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EEDBC8",
    backgroundColor: "#FFF8EF",
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  policyCardFeatured: {
    backgroundColor: "#FFF1E2",
    borderColor: "#EBC8A7",
  },
  policyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8E2CC",
    borderWidth: 1,
    borderColor: "#EDCBAD",
  },
  policyBody: { flex: 1, gap: 7 },
  policyTitle: { color: "#2A170B", fontSize: 19, lineHeight: 25, fontWeight: "800" },
  policySummary: { color: "#7F5D45", fontSize: 14, lineHeight: 21, fontWeight: "500" },
  policyCta: { color: "#A44D1E", fontSize: 15, fontWeight: "800" },

  emptyCard: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFDAC4",
    backgroundColor: "#FFF9F0",
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { color: "#53331D", fontSize: 20, fontWeight: "800" },
  emptyText: { color: "#8A6448", fontSize: 14, lineHeight: 20, textAlign: "center" },

  errorCard: {
    marginTop: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3C8C5",
    backgroundColor: "#FFF0EF",
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  errorText: { color: "#B5332A", fontSize: 14, textAlign: "center", lineHeight: 20, fontWeight: "600" },
  retryButton: {
    marginTop: 2,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E9B9AE",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: { color: "#9F3125", fontWeight: "800", fontSize: 13 },
  inlineWarn: {
    marginTop: 4,
    color: "#B64035",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
  },

  skeletonFeatured: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EFDDCA",
    backgroundColor: "#FFFDF9",
    padding: 12,
    gap: 10,
  },
  skeletonBanner: { height: 180, borderRadius: 18, backgroundColor: "#EEE2D6" },
  skeletonLineWide: { height: 22, borderRadius: 10, backgroundColor: "#EEE2D6", width: "92%" },
  skeletonLineMid: { height: 14, borderRadius: 8, backgroundColor: "#EEE2D6", width: "78%" },
  skeletonLineShort: { height: 14, borderRadius: 8, backgroundColor: "#EEE2D6", width: "46%" },
  skeletonCard: { height: 102, borderRadius: 18, backgroundColor: "#EEE2D6" },
  skeletonPolicy: { height: 126, borderRadius: 20, backgroundColor: "#EEE2D6" },
});
