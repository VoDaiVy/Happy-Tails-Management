import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createNews, getNews } from "../../../../api/modules/newsApi";
import type { NewsItem } from "../../../../types/news";
import { staffTheme } from "../../../../theme/staffTheme";
import {
  FullScreenForm,
  InfoCard,
  NewsPostCard,
  PrimaryButton,
  SearchBar,
  SectionHeader,
  SecondaryButton,
} from "../components";

interface NewsScreenProps {
  openCreate: boolean;
  onOpenCreate: () => void;
  onCloseCreate: () => void;
}

export function NewsScreen({ openCreate, onOpenCreate, onCloseCreate }: NewsScreenProps) {
  const [keyword, setKeyword] = useState("");
  const [newsRows, setNewsRows] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const [draftPublished, setDraftPublished] = useState("published");

  useEffect(() => {
    let mounted = true;

    const loadNews = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getNews();
        if (mounted) setNewsRows(result || []);
      } catch (fetchError) {
        const err = fetchError as { message?: string };
        if (mounted) setError(err.message || "Failed to load news.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadNews();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return newsRows;
    const normalized = keyword.trim().toLowerCase();
    return newsRows.filter((item) => {
      const line = `${item.title} ${item.category || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
      return line.includes(normalized);
    });
  }, [keyword, newsRows]);

  const recentNewsActivity = useMemo(() => {
    return filtered
      .slice(0, 3)
      .map((item) => `${item.isPublished ? "Published" : "Draft"}: ${item.title}`);
  }, [filtered]);

  const mappedRows = filtered.map((item) => ({
    thumbnail: item.category || "News",
    title: item.title,
    date: item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "--",
    category: item.category || "General",
    targetAudience: "All Customers",
    status: item.isPublished ? "Published" as const : "Draft" as const,
    tag: item.slug || "",
  }));

  const handleCreateNews = async () => {
    if (!draftTitle.trim() || !draftContent.trim()) {
      Alert.alert("Validation", "Title and content are required.");
      return;
    }

    try {
      await createNews({
        title: draftTitle.trim(),
        content: draftContent.trim(),
        category: draftCategory.trim() || undefined,
        isPublished: draftPublished.trim().toLowerCase() !== "draft",
      });

      const refreshed = await getNews();
      setNewsRows(refreshed || []);
      setDraftTitle("");
      setDraftContent("");
      setDraftCategory("");
      setDraftPublished("published");
      onCloseCreate();
    } catch (submitError) {
      const err = submitError as { message?: string };
      Alert.alert("Create failed", err.message || "Unable to create news.");
    }
  };

  return (
    <View style={styles.wrap}>
      <SectionHeader title="News Management" subtitle="Manage posts and publishing status" action={<PrimaryButton title="Create News" onPress={onOpenCreate} />} />

      <View style={styles.filterBlock}>
        <SearchBar placeholder="Search title or category" value={keyword} onChangeText={setKeyword} />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? <Text style={styles.loadingText}>Loading news...</Text> : null}

      {mappedRows.map((item) => (
        <NewsPostCard key={`${item.title}-${item.date}`} item={item} />
      ))}

      <InfoCard title="Recent Activity" description="Latest publishing actions by staff">
        {recentNewsActivity.map((item) => (
          <Text key={item} style={styles.activityText}>• {item}</Text>
        ))}
      </InfoCard>

      <FullScreenForm visible={openCreate} title="Create New Post" onClose={onCloseCreate}>
        <ScrollView contentContainerStyle={styles.formWrap}>
          <InfoCard title="Cover thumbnail upload">
            <View style={styles.uploadBox}><Text style={styles.uploadText}>Tap to upload cover image</Text></View>
          </InfoCard>

          <InfoCard title="Post Information">
            <TextInput style={styles.input} value={draftTitle} onChangeText={setDraftTitle} placeholder="Post title" placeholderTextColor="#8A8F99" />
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={draftContent}
              onChangeText={setDraftContent}
              placeholder="Content body"
              placeholderTextColor="#8A8F99"
            />
            <TextInput style={styles.input} value={draftCategory} onChangeText={setDraftCategory} placeholder="Category" placeholderTextColor="#8A8F99" />
            <TextInput style={styles.input} placeholder="Target audience" placeholderTextColor="#8A8F99" />
          </InfoCard>

          <InfoCard title="Publishing">
            <TextInput
              style={styles.input}
              value={draftPublished}
              onChangeText={setDraftPublished}
              placeholder="Publish status (published/draft)"
              placeholderTextColor="#8A8F99"
            />
            <TextInput style={styles.input} placeholder="Publish date" placeholderTextColor="#8A8F99" />
          </InfoCard>

          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}><SecondaryButton title="Cancel" onPress={onCloseCreate} /></View>
            <View style={{ flex: 1 }}><PrimaryButton title="Publish" onPress={handleCreateNews} /></View>
          </View>
        </ScrollView>
      </FullScreenForm>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: staffTheme.spacing.lg,
  },
  filterBlock: {
    gap: 8,
    padding: staffTheme.spacing.sm,
    borderRadius: staffTheme.radius.xl,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    backgroundColor: staffTheme.colors.surfaceAlt,
  },
  activityText: {
    color: staffTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  loadingText: {
    color: staffTheme.colors.textSecondary,
    fontSize: 12,
  },
  errorText: {
    color: staffTheme.colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  formWrap: {
    gap: 12,
    paddingBottom: 18,
  },
  uploadBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D7C1AA",
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    backgroundColor: "#FFF7EE",
  },
  uploadText: {
    color: staffTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    borderRadius: 14,
    backgroundColor: staffTheme.colors.surface,
    color: staffTheme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  actionsRow: {
    marginTop: 4,
    flexDirection: "row",
    gap: 8,
  },
});
