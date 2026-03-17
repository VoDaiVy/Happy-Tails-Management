import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { addToCart } from "../../api/modules/cartApi";
import { getCategories } from "../../api/modules/categoryApi";
import { getServices } from "../../api/modules/serviceApi";
import type { Category } from "../../types/category";
import type { ServiceItem } from "../../types/service";

const PAGE_LIMIT = 10;

function renderStars(rating = 0) {
  const rounded = Math.round(rating);
  return "★".repeat(rounded) + "☆".repeat(Math.max(0, 5 - rounded));
}

export function ServiceListScreen() {
  const { width } = useWindowDimensions();
  const listColumns = width >= 760 ? 2 : 1;

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const canLoadMoreRef = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchValue(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchServices = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      setErrorMessage("");

      try {
        const response = await getServices({
          page: nextPage,
          limit: PAGE_LIMIT,
          search: searchValue || undefined,
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          isActive: "true",
        });

        setServices((prev) => (append ? [...prev, ...response.data] : response.data));
        setHasNextPage(Boolean(response.pagination?.hasNextPage));
        setPage(nextPage);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Khong tai duoc danh sach services");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [searchValue, selectedCategory],
  );

  useEffect(() => {
    fetchServices(1, false);
  }, [fetchServices]);

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch {
        // Service list still works even if category load fails.
      }
    };

    fetchCategoryData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServices(1, false);
  }, [fetchServices]);

  const loadMore = useCallback(() => {
    if (!hasNextPage || loadingMore || loading || !canLoadMoreRef.current) return;
    canLoadMoreRef.current = false;
    fetchServices(page + 1, true);
  }, [fetchServices, hasNextPage, loading, loadingMore, page]);

  const onMomentumScrollBegin = useCallback(() => {
    canLoadMoreRef.current = true;
  }, []);

  const categoryOptions = useMemo(() => [{ _id: "all", name: "Tat ca" }, ...categories], [categories]);

  const handleAddToCart = useCallback(async (serviceId: string) => {
    setAddingId(serviceId);
    setActionMessage("");
    try {
      await addToCart({ serviceId, quantity: 1 });
      setActionMessage("Da them service vao gio hang");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Khong the them vao gio hang");
    } finally {
      setAddingId(null);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Services</Text>

      <TextInput
        style={styles.searchInput}
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder="Tim theo ten hoac mo ta service"
        accessibilityLabel="Tim kiem service"
      />

      {actionMessage ? <Text style={styles.actionMessage}>{actionMessage}</Text> : null}

      <FlatList
        horizontal
        data={categoryOptions}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => {
          const isSelected = selectedCategory === item._id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Loc category ${item.name}`}
              onPress={() => {
                setSelectedCategory(item._id);
                setPage(1);
              }}
              style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>{item.name}</Text>
            </Pressable>
          );
        }}
      />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchServices(1, false)}>
            <Text style={styles.retryText}>Thu lai</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          key={`service-grid-${listColumns}`}
          data={services}
          numColumns={listColumns}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.serviceList}
          columnWrapperStyle={listColumns > 1 ? styles.columnWrap : undefined}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          onMomentumScrollBegin={onMomentumScrollBegin}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co service phu hop</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
          renderItem={({ item }) => (
            <View style={[styles.card, listColumns > 1 && styles.cardGrid]}>
              {item.images?.[0] ? (
                <Image source={{ uri: item.images[0] }} style={styles.cardImage} resizeMode="cover" accessibilityLabel={`Anh ${item.name}`} />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Text style={styles.cardImagePlaceholderText}>No Image</Text>
                </View>
              )}

              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubTitle}>Gia: {item.price.toLocaleString()} VND</Text>
              <Text style={styles.cardSubTitle}>Thoi luong: {item.duration} phut</Text>
              <Text style={styles.cardSubTitle}>Pet: {(item.petTypes || []).join(", ") || "N/A"}</Text>
              <Text style={styles.ratingText}>{renderStars(item.rating || 0)} ({item.rating?.toFixed(1) || "0.0"})</Text>

              <Pressable
                style={[styles.addButton, addingId === item._id && styles.addButtonDisabled]}
                onPress={() => handleAddToCart(item._id)}
                disabled={addingId === item._id}
              >
                {addingId === item._id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addButtonText}>Add to Cart</Text>}
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "700", color: "#111827", paddingHorizontal: 16 },
  searchInput: {
    marginTop: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryList: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  categoryChipActive: { backgroundColor: "#2563EB" },
  categoryChipText: { color: "#111827", fontWeight: "600" },
  categoryChipTextActive: { color: "#fff" },
  serviceList: { paddingHorizontal: 16, paddingBottom: 16 },
  columnWrap: { gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    flex: 1,
  },
  cardGrid: { maxWidth: "49%" },
  cardImage: { width: "100%", height: 140, borderRadius: 10, backgroundColor: "#F3F4F6", marginBottom: 8 },
  cardImagePlaceholder: { justifyContent: "center", alignItems: "center" },
  cardImagePlaceholderText: { color: "#9CA3AF" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  cardSubTitle: { fontSize: 13, color: "#4B5563", marginTop: 2 },
  ratingText: { marginTop: 6, color: "#B45309", fontWeight: "600" },
  addButton: {
    marginTop: 10,
    backgroundColor: "#0D9488",
    borderRadius: 9,
    alignItems: "center",
    paddingVertical: 9,
  },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  addButtonDisabled: { opacity: 0.65 },
  actionMessage: {
    marginTop: 6,
    marginHorizontal: 16,
    color: "#065F46",
    fontSize: 13,
  },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { color: "#B91C1C", textAlign: "center", marginBottom: 10 },
  retryButton: { backgroundColor: "#2563EB", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "700" },
  emptyText: { textAlign: "center", color: "#6B7280", marginTop: 14 },
});
