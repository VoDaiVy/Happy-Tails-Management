import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { createNews, getNews, getNewsBySlug, updateNews, uploadNewsImage } from "../../../api/modules/newsApi";
import type { NewsItem } from "../../../types/news";

type StatusFilter = "all" | "published" | "draft";

type NewsFormState = {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tagsText: string;
  isPublished: boolean;
  coverImage: string;
};

const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "announcement", label: "Announcement" },
  { value: "tips", label: "Tips" },
  { value: "promotion", label: "Promotion" },
  { value: "event", label: "Event" },
  { value: "general", label: "General" },
] as const;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];

const EMPTY_FORM: NewsFormState = {
  title: "",
  excerpt: "",
  content: "",
  category: "general",
  tagsText: "",
  isPublished: false,
  coverImage: "",
};

function formatDate(dateText?: string) {
  if (!dateText) return "--";
  const parsed = new Date(dateText);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString("en-GB");
}

function formatAudience(tags?: string[]) {
  if (!tags || tags.length === 0) return "All customers";
  return tags.join(", ");
}

function toStatusLabel(isPublished?: boolean) {
  return isPublished ? "Published" : "Draft";
}

function toNewsFeedBadge(isPublished?: boolean) {
  return isPublished ? "In feed" : "Not in feed";
}

export function StaffNewsManagementScreen() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [queryInput, setQueryInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsFormState>(EMPTY_FORM);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const [selectedDetail, setSelectedDetail] = useState<NewsItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(queryInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [queryInput]);

  const loadNews = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorText("");

      try {
        const response = await getNews({
          search: searchQuery || undefined,
          category: categoryFilter === "all" ? undefined : categoryFilter,
          isPublished: statusFilter === "all" ? undefined : statusFilter === "published",
        });

        setItems(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Cannot load news";
        setErrorText(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, categoryFilter, statusFilter],
  );

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const counts = useMemo(() => {
    let published = 0;
    let draft = 0;

    items.forEach((entry) => {
      if (entry.isPublished) {
        published += 1;
      } else {
        draft += 1;
      }
    });

    return {
      total: items.length,
      published,
      draft,
    };
  }, [items]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (news: NewsItem) => {
    setEditingId(news._id);
    setForm({
      title: news.title || "",
      excerpt: news.excerpt || "",
      content: news.content || "",
      category: news.category || "general",
      tagsText: (news.tags || []).join(", "),
      isPublished: Boolean(news.isPublished),
      coverImage: news.coverImage || "",
    });
    setFormOpen(true);
  };

  const openView = async (news: NewsItem) => {
    setViewOpen(true);
    setDetailLoading(true);
    setSelectedDetail(null);

    try {
      const detail = await getNewsBySlug(news.slug);
      setSelectedDetail(detail);
    } catch (error) {
      setSelectedDetail(news);
      Alert.alert("Warning", error instanceof Error ? error.message : "Cannot load detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const onSelectAndUploadImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to upload image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
      aspect: [16, 9],
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];

    setImageUploading(true);
    try {
      const imageUrl = await uploadNewsImage({
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        fileName: asset.fileName || `news-${Date.now()}.jpg`,
      });

      setForm((prev) => ({ ...prev, coverImage: imageUrl }));
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Cannot upload image");
    } finally {
      setImageUploading(false);
    }
  };

  const onSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert("Validation", "Title and content are required.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || undefined,
      content: form.content.trim(),
      category: form.category || "general",
      isPublished: form.isPublished,
      coverImage: form.coverImage || undefined,
      tags: form.tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    setFormSubmitting(true);
    try {
      if (editingId) {
        await updateNews(editingId, payload);
      } else {
        await createNews(payload);
      }

      setFormOpen(false);
      resetForm();
      await loadNews();
    } catch (error) {
      Alert.alert("Save failed", error instanceof Error ? error.message : "Cannot save news");
    } finally {
      setFormSubmitting(false);
    }
  };

  const renderChip = (
    value: string,
    label: string,
    selected: boolean,
    onPress: (nextValue: string) => void,
  ) => {
    return (
      <Pressable key={value} style={[styles.filterChip, selected && styles.filterChipActive]} onPress={() => onPress(value)}>
        <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{label}</Text>
      </Pressable>
    );
  };

  const renderRow = ({ item }: { item: NewsItem }) => {
    return (
      <View style={styles.card}>
        {item.coverImage ? <Image source={{ uri: item.coverImage }} style={styles.cardImage} /> : null}

        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <View style={[styles.statusBadge, item.isPublished ? styles.statusPublished : styles.statusDraft]}>
              <Text style={styles.statusText}>{toStatusLabel(item.isPublished)}</Text>
            </View>
            <View style={styles.feedBadge}>
              <Text style={styles.feedBadgeText}>{toNewsFeedBadge(item.isPublished)}</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardExcerpt} numberOfLines={3}>
            {item.excerpt || item.content}
          </Text>

          <View style={styles.cardInfoRow}>
            <Text style={styles.infoLabel}>Category: </Text>
            <Text style={styles.infoValue}>{item.category || "general"}</Text>
          </View>
          <View style={styles.cardInfoRow}>
            <Text style={styles.infoLabel}>Audience: </Text>
            <Text style={styles.infoValue}>{formatAudience(item.tags)}</Text>
          </View>
          <View style={styles.cardInfoRow}>
            <Text style={styles.infoLabel}>Published: </Text>
            <Text style={styles.infoValue}>{formatDate(item.publishedAt)}</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.viewsText}>{item.views || 0} views</Text>
            <View style={styles.actionWrap}>
              <Pressable style={styles.secondaryBtn} onPress={() => openView(item)}>
                <Feather name="eye" size={14} color="#B05E2D" />
                <Text style={styles.secondaryBtnText}>View</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={() => openEdit(item)}>
                <Feather name="edit-2" size={14} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Edit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={renderRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNews(true)} tintColor="#C96E39" />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.screenTitle}>News Management</Text>
            <Text style={styles.screenSubtitle}>Create, publish, and update customer news on mobile.</Text>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statValue}>{counts.total}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Published</Text>
                <Text style={styles.statValue}>{counts.published}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Draft</Text>
                <Text style={styles.statValue}>{counts.draft}</Text>
              </View>
            </View>

            <Pressable style={styles.createBtn} onPress={openCreate}>
              <Feather name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.createBtnText}>Create News</Text>
            </Pressable>

            <TextInput
              style={styles.searchInput}
              placeholder="Search title, excerpt, content"
              placeholderTextColor="#9D8C7D"
              value={queryInput}
              onChangeText={setQueryInput}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {CATEGORY_OPTIONS.map((option) =>
                renderChip(option.value, option.label, categoryFilter === option.value, (next) => setCategoryFilter(next)),
              )}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {STATUS_OPTIONS.map((option) =>
                renderChip(option.value, option.label, statusFilter === option.value, (next) => setStatusFilter(next as StatusFilter)),
              )}
            </ScrollView>

            {loading ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator size="large" color="#C96E39" />
              </View>
            ) : null}

            {!loading && errorText ? (
              <View style={styles.stateWrap}>
                <Text style={styles.errorText}>{errorText}</Text>
                <Pressable style={styles.retryBtn} onPress={() => loadNews()}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {!loading && !errorText && items.length === 0 ? (
              <View style={styles.stateWrap}>
                <Text style={styles.emptyText}>No news matched your filter.</Text>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={<View style={{ height: 110 }} />}
        contentContainerStyle={styles.listContent}
      />

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setFormOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? "Update News" : "Create News"}</Text>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput style={styles.modalInput} value={form.title} onChangeText={(text) => setForm((prev) => ({ ...prev, title: text }))} />

              <Text style={styles.inputLabel}>Excerpt</Text>
              <TextInput
                style={[styles.modalInput, styles.multilineInput]}
                value={form.excerpt}
                onChangeText={(text) => setForm((prev) => ({ ...prev, excerpt: text }))}
                multiline
              />

              <Text style={styles.inputLabel}>Content *</Text>
              <TextInput
                style={[styles.modalInput, styles.largeInput]}
                value={form.content}
                onChangeText={(text) => setForm((prev) => ({ ...prev, content: text }))}
                multiline
              />

              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {CATEGORY_OPTIONS.filter((option) => option.value !== "all").map((option) =>
                  renderChip(
                    option.value,
                    option.label,
                    form.category === option.value,
                    (next) => setForm((prev) => ({ ...prev, category: next })),
                  ),
                )}
              </ScrollView>

              <Text style={styles.inputLabel}>Target Tags (comma separated)</Text>
              <TextInput
                style={styles.modalInput}
                value={form.tagsText}
                onChangeText={(text) => setForm((prev) => ({ ...prev, tagsText: text }))}
                placeholder="vip, loyalty, cat-owners"
                placeholderTextColor="#AE9D90"
              />

              <View style={styles.publishRow}>
                <Text style={styles.inputLabel}>Publish now</Text>
                <Switch
                  value={form.isPublished}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, isPublished: value }))}
                  trackColor={{ false: "#D8CCC0", true: "#E6A06E" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <Text style={styles.inputLabel}>Cover image</Text>
              <Pressable style={styles.imageUploadBtn} onPress={onSelectAndUploadImage} disabled={imageUploading}>
                {imageUploading ? <ActivityIndicator color="#B05E2D" /> : <Text style={styles.imageUploadText}>Select and upload image</Text>}
              </Pressable>
              {form.coverImage ? <Image source={{ uri: form.coverImage }} style={styles.previewImage} /> : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setFormOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalSaveBtn, formSubmitting && styles.disabledBtn]} onPress={onSubmit} disabled={formSubmitting}>
                {formSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSaveText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={viewOpen} transparent animationType="slide" onRequestClose={() => setViewOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setViewOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>News Detail</Text>
            {detailLoading ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator size="large" color="#C96E39" />
              </View>
            ) : (
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody}>
                {selectedDetail?.coverImage ? <Image source={{ uri: selectedDetail.coverImage }} style={styles.detailImage} /> : null}
                <Text style={styles.detailTitle}>{selectedDetail?.title || "Untitled"}</Text>
                <Text style={styles.detailMeta}>
                  {(selectedDetail?.category || "general").toUpperCase()} | {toStatusLabel(selectedDetail?.isPublished)}
                </Text>
                <Text style={styles.detailMeta}>Published: {formatDate(selectedDetail?.publishedAt)}</Text>
                <Text style={styles.detailBody}>{selectedDetail?.content || "No content"}</Text>
              </ScrollView>
            )}
            <Pressable style={styles.modalCancelBtn} onPress={() => setViewOpen(false)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6EFE5" },
  listContent: { paddingHorizontal: 14 },
  headerWrap: { paddingTop: 14, paddingBottom: 10 },
  screenTitle: { fontSize: 26, fontWeight: "800", color: "#26384A" },
  screenSubtitle: { marginTop: 4, fontSize: 13, color: "#6A7786" },
  statsRow: { marginTop: 12, flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#FFF9F1",
    borderWidth: 1,
    borderColor: "#F0E1D2",
  },
  statLabel: { fontSize: 11, color: "#8A7564", fontWeight: "700" },
  statValue: { marginTop: 2, fontSize: 20, color: "#2A3A4D", fontWeight: "800" },
  createBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: "#D77E45",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  createBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  searchInput: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6D6C5",
    backgroundColor: "#FFFCF8",
    color: "#2E3F52",
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    fontWeight: "600",
  },
  filterRow: { gap: 8, paddingVertical: 10 },
  filterChip: {
    borderWidth: 1,
    borderColor: "#E6D6C5",
    backgroundColor: "#FFF9F2",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: "#EAA06B",
    borderColor: "#D68B56",
  },
  filterChipText: { fontSize: 12, color: "#7D6B5D", fontWeight: "700" },
  filterChipTextActive: { color: "#FFFFFF" },
  stateWrap: { paddingVertical: 22, alignItems: "center", justifyContent: "center", gap: 10 },
  errorText: { color: "#C73737", fontWeight: "700", textAlign: "center" },
  retryBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#D77E45",
  },
  retryBtnText: { color: "#FFFFFF", fontWeight: "700" },
  emptyText: { color: "#6A7786", fontWeight: "700" },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECDCCB",
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  cardImage: { width: "100%", height: 156, backgroundColor: "#EFE3D5" },
  cardBody: { padding: 12 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPublished: { backgroundColor: "#CFF2D7" },
  statusDraft: { backgroundColor: "#FBE5B5" },
  statusText: { color: "#294350", fontWeight: "800", fontSize: 11 },
  feedBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#E7F0F9",
  },
  feedBadgeText: { color: "#355778", fontWeight: "700", fontSize: 11 },
  cardTitle: { color: "#283A4F", fontSize: 16, fontWeight: "800" },
  cardExcerpt: { marginTop: 6, color: "#596A7C", fontSize: 13, lineHeight: 19 },
  cardInfoRow: { marginTop: 6, flexDirection: "row", alignItems: "flex-start" },
  infoLabel: { color: "#8A7564", fontWeight: "700", fontSize: 12 },
  infoValue: { color: "#374A5F", fontWeight: "700", fontSize: 12, flex: 1 },
  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F2E8DD",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewsText: { color: "#8A7564", fontSize: 12, fontWeight: "700" },
  actionWrap: { flexDirection: "row", gap: 6 },
  secondaryBtn: {
    borderRadius: 10,
    backgroundColor: "#FFF3E9",
    borderWidth: 1,
    borderColor: "#F4D4BA",
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  secondaryBtnText: { color: "#B05E2D", fontWeight: "800", fontSize: 12 },
  primaryBtn: {
    borderRadius: 10,
    backgroundColor: "#D77E45",
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(24, 34, 43, 0.34)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "92%",
    backgroundColor: "#FFF9F2",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  modalTitle: { color: "#2A3A4D", fontWeight: "800", fontSize: 20 },
  modalScroll: { marginTop: 10 },
  modalBody: { paddingBottom: 18 },
  inputLabel: { color: "#665242", fontWeight: "700", fontSize: 12, marginBottom: 6, marginTop: 10 },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6D6C5",
    backgroundColor: "#FFFFFF",
    color: "#2A3A4D",
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  multilineInput: { minHeight: 78, textAlignVertical: "top" },
  largeInput: { minHeight: 130, textAlignVertical: "top" },
  publishRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  imageUploadBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E6D6C5",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    alignItems: "center",
  },
  imageUploadText: { color: "#B05E2D", fontWeight: "700", fontSize: 13 },
  previewImage: { marginTop: 10, width: "100%", height: 146, borderRadius: 10, backgroundColor: "#EBDCCB" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8C7B6",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },
  modalCancelText: { color: "#735C49", fontWeight: "800" },
  modalSaveBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#D77E45",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },
  modalSaveText: { color: "#FFFFFF", fontWeight: "800" },
  disabledBtn: { opacity: 0.6 },
  detailImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#E5D7C8",
    marginBottom: 10,
  },
  detailTitle: { color: "#2A3A4D", fontSize: 18, fontWeight: "800" },
  detailMeta: { marginTop: 6, color: "#725D4C", fontSize: 12, fontWeight: "700" },
  detailBody: { marginTop: 12, color: "#3A4D60", fontSize: 14, lineHeight: 22 },
});
