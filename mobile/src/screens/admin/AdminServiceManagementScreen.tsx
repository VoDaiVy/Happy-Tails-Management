import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createAdminService, getAdminServices, uploadAdminServiceImage } from "../../api/modules/adminServiceApi";
import { getCategories } from "../../api/modules/categoryApi";
import type { Category } from "../../types/category";
import type { ServiceItem } from "../../types/service";

type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTERS: StatusFilter[] = ["all", "active", "inactive"];
const PET_TYPE_OPTIONS = ["dog", "cat", "bird", "fish", "rabbit", "hamster", "other"] as const;

function titleize(input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function splitFeatures(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getStatusBadge(isActive?: boolean) {
  if (isActive === false) {
    return { label: "Inactive", bg: "#FDECEF", text: "#B24251" };
  }
  return { label: "Active", bg: "#E7F5E8", text: "#2F7C41" };
}

export function AdminServiceManagementScreen() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [openFilterMenu, setOpenFilterMenu] = useState<"status" | "category" | null>(null);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [createDuration, setCreateDuration] = useState("");
  const [createCategoryId, setCreateCategoryId] = useState("");
  const [createGroup, setCreateGroup] = useState<"wet" | "dry">("dry");
  const [createFeaturesRaw, setCreateFeaturesRaw] = useState("");
  const [createPetTypes, setCreatePetTypes] = useState<string[]>(["dog", "cat"]);
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createImageUrls, setCreateImageUrls] = useState<string[]>([]);
  const [createImagePreviews, setCreateImagePreviews] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data || []);
      setCreateCategoryId((prev) => prev || data?.[0]?._id || "");
    } catch {
      setCategories([]);
    }
  }, []);

  const loadServices = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    try {
      const response = await getAdminServices({
        search: query || undefined,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        isActive: statusFilter === "all" ? "all" : statusFilter === "active" ? "true" : "false",
        limit: 100,
        page: 1,
      });
      setServices(response.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load services");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryFilter, query, statusFilter]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const categoryNameMap = useMemo(() => {
    return new Map(categories.map((item) => [item._id, item.name]));
  }, [categories]);

  const openCreateModal = useCallback(() => {
    setError("");
    setMessage("");
    if (!createCategoryId && categories.length > 0) {
      setCreateCategoryId(categories[0]._id);
    }
    setCreateModalVisible(true);
  }, [categories, createCategoryId]);

  const closeCreateModal = useCallback(() => {
    if (creating) return;
    setCreateModalVisible(false);
  }, [creating]);

  const togglePetType = useCallback((petType: string) => {
    setCreatePetTypes((prev) => {
      if (prev.includes(petType)) {
        const next = prev.filter((item) => item !== petType);
        return next.length > 0 ? next : prev;
      }
      return [...prev, petType];
    });
  }, []);

  const onCreateService = useCallback(async () => {
    const trimmedName = createName.trim();
    const price = Number(createPrice);
    const duration = Number(createDuration);

    if (!trimmedName) {
      setError("Service name is required.");
      return;
    }
    if (!createCategoryId) {
      setError("Category is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError("Price must be a valid number.");
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setError("Duration must be greater than 0.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      await createAdminService({
        name: trimmedName,
        description: createDescription.trim() || undefined,
        price,
        duration,
        category: createCategoryId,
        group: createGroup,
        features: splitFeatures(createFeaturesRaw),
        petTypes: createPetTypes,
        isActive: createIsActive,
        images: createImageUrls,
      });

      setMessage("Service created successfully.");
      setCreateModalVisible(false);
      setCreateName("");
      setCreateDescription("");
      setCreatePrice("");
      setCreateDuration("");
      setCreateFeaturesRaw("");
      setCreateGroup("dry");
      setCreatePetTypes(["dog", "cat"]);
      setCreateIsActive(true);
      setCreateImageUrls([]);
      setCreateImagePreviews([]);
      await loadServices();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create service");
    } finally {
      setCreating(false);
    }
  }, [
    createCategoryId,
    createDescription,
    createDuration,
    createFeaturesRaw,
    createGroup,
    createImageUrls,
    createIsActive,
    createName,
    createPetTypes,
    createPrice,
    loadServices,
  ]);

  const onPickImagesFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Please allow photo library access to upload images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (result.canceled || !result.assets?.length) return;

    setImageUploading(true);
    setError("");

    try {
      const uploaded = await Promise.all(
        result.assets.map(async (asset, index) => {
          const urlRes = await uploadAdminServiceImage({
            uri: asset.uri,
            type: asset.mimeType || "image/jpeg",
            fileName: asset.fileName || `service-${Date.now()}-${index}.jpg`,
          });

          return {
            preview: asset.uri,
            url: urlRes.data.url,
          };
        }),
      );

      setCreateImagePreviews((prev) => [...prev, ...uploaded.map((item) => item.preview)].slice(0, 8));
      setCreateImageUrls((prev) => [...prev, ...uploaded.map((item) => item.url)].filter(Boolean).slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload selected images");
    } finally {
      setImageUploading(false);
    }
  }, []);

  const onRemovePickedImage = useCallback((index: number) => {
    setCreateImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setCreateImageUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D6824B" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={services}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadServices(true)} tintColor="#D6824B" />}
      onScrollBeginDrag={() => setOpenFilterMenu(null)}
      ListHeaderComponent={
        <View style={[styles.headerWrap, openFilterMenu ? styles.headerWrapExpanded : null]}>
          <Text style={styles.title}>Service Management</Text>
          <Text style={styles.subtitle}>Live data from /services</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}

          <View style={styles.searchRow}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search by service name"
              placeholderTextColor="#9AA8B6"
              style={styles.searchInput}
            />
            <Pressable style={styles.createButton} onPress={openCreateModal}>
              <Text style={styles.createButtonText}>+ Add</Text>
            </Pressable>
          </View>

          <View style={styles.filterRow}>
            <View style={styles.dropdownWrap}>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setOpenFilterMenu((prev) => (prev === "status" ? null : "status"))}
              >
                <Text style={styles.dropdownLabel}>Status</Text>
                <Text style={styles.dropdownValue}>{statusFilter === "all" ? "All" : statusFilter === "active" ? "Active" : "Inactive"}</Text>
              </Pressable>

              {openFilterMenu === "status" ? (
                <View style={styles.dropdownMenu}>
                  {STATUS_FILTERS.map((status) => {
                    const active = statusFilter === status;
                    return (
                      <Pressable
                        key={status}
                        style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                        onPress={() => {
                          setStatusFilter(status);
                          setOpenFilterMenu(null);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                          {status === "all" ? "All" : status === "active" ? "Active" : "Inactive"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.dropdownWrap}>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setOpenFilterMenu((prev) => (prev === "category" ? null : "category"))}
              >
                <Text style={styles.dropdownLabel}>Category</Text>
                <Text style={styles.dropdownValue} numberOfLines={1}>
                  {categoryFilter === "all" ? "All Categories" : categoryNameMap.get(categoryFilter) || "Category"}
                </Text>
              </Pressable>

              {openFilterMenu === "category" ? (
                <View style={styles.dropdownMenu}>
                  <Pressable
                    style={[styles.dropdownItem, categoryFilter === "all" && styles.dropdownItemActive]}
                    onPress={() => {
                      setCategoryFilter("all");
                      setOpenFilterMenu(null);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, categoryFilter === "all" && styles.dropdownItemTextActive]}>All Categories</Text>
                  </Pressable>
                  {categories.map((category) => {
                    const active = categoryFilter === category._id;
                    return (
                      <Pressable
                        key={category._id}
                        style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                        onPress={() => {
                          setCategoryFilter(category._id);
                          setOpenFilterMenu(null);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>{category.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>{Number(item.price || 0).toLocaleString()} đ</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>Duration: {item.duration || 0} mins</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(item.isActive).bg }]}> 
              <Text style={[styles.statusBadgeText, { color: getStatusBadge(item.isActive).text }]}>{getStatusBadge(item.isActive).label}</Text>
            </View>
          </View>
          <Text style={styles.meta}>Category: {item.category?.name || "General"}</Text>
          {item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No services found.</Text>}
      ListFooterComponent={
        <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={closeCreateModal}>
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeCreateModal} />

            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Service</Text>
                <Pressable onPress={closeCreateModal} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>x</Text>
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Service Name *</Text>
                  <TextInput
                    value={createName}
                    onChangeText={setCreateName}
                    placeholder="E.g. Spa bath for dogs"
                    placeholderTextColor="#A5B0BD"
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category *</Text>
                  <View style={styles.optionWrap}>
                    {categories.map((category) => {
                      const active = createCategoryId === category._id;
                      return (
                        <Pressable
                          key={category._id}
                          style={[styles.optionChip, active && styles.optionChipActive]}
                          onPress={() => setCreateCategoryId(category._id)}
                        >
                          <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{category.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    value={createDescription}
                    onChangeText={setCreateDescription}
                    placeholder="Describe the service in detail..."
                    placeholderTextColor="#A5B0BD"
                    style={[styles.input, styles.textArea]}
                    multiline
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.inputGroupCol}>
                    <Text style={styles.inputLabel}>Price (VND) *</Text>
                    <TextInput
                      value={createPrice}
                      onChangeText={setCreatePrice}
                      placeholder="100000"
                      placeholderTextColor="#A5B0BD"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputGroupCol}>
                    <Text style={styles.inputLabel}>Duration (min) *</Text>
                    <TextInput
                      value={createDuration}
                      onChangeText={setCreateDuration}
                      placeholder="60"
                      placeholderTextColor="#A5B0BD"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Service Group *</Text>
                  <View style={styles.groupRow}>
                    <Pressable
                      style={[styles.groupButton, createGroup === "dry" && styles.groupButtonActive]}
                      onPress={() => setCreateGroup("dry")}
                    >
                      <Text style={[styles.groupButtonText, createGroup === "dry" && styles.groupButtonTextActive]}>Dry</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.groupButton, createGroup === "wet" && styles.groupButtonActive]}
                      onPress={() => setCreateGroup("wet")}
                    >
                      <Text style={[styles.groupButtonText, createGroup === "wet" && styles.groupButtonTextActive]}>Wet</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Applicable Pet Types</Text>
                  <View style={styles.optionWrap}>
                    {PET_TYPE_OPTIONS.map((petType) => {
                      const active = createPetTypes.includes(petType);
                      return (
                        <Pressable
                          key={petType}
                          style={[styles.optionChip, active && styles.optionChipActive]}
                          onPress={() => togglePetType(petType)}
                        >
                          <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{titleize(petType)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Features (comma separated)</Text>
                  <TextInput
                    value={createFeaturesRaw}
                    onChangeText={setCreateFeaturesRaw}
                    placeholder="Cut nails, Ear cleaning, Massage"
                    placeholderTextColor="#A5B0BD"
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Images</Text>
                  <Pressable
                    style={[styles.imagePickerBtn, imageUploading && styles.disabledBtn]}
                    onPress={onPickImagesFromLibrary}
                    disabled={imageUploading}
                  >
                    <Text style={styles.imagePickerBtnText}>{imageUploading ? "Uploading..." : "Choose from library"}</Text>
                  </Pressable>

                  {createImagePreviews.length > 0 ? (
                    <View style={styles.imagePreviewWrap}>
                      {createImagePreviews.map((uri, index) => (
                        <View key={`${uri}-${index}`} style={styles.imagePreviewItem}>
                          <Image source={{ uri }} style={styles.imagePreview} />
                          <Pressable style={styles.removeImageBtn} onPress={() => onRemovePickedImage(index)}>
                            <Text style={styles.removeImageBtnText}>x</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.hintText}>No images selected yet.</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={styles.groupRow}>
                    <Pressable
                      style={[styles.groupButton, createIsActive && styles.groupButtonActive]}
                      onPress={() => setCreateIsActive(true)}
                    >
                      <Text style={[styles.groupButtonText, createIsActive && styles.groupButtonTextActive]}>Active</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.groupButton, !createIsActive && styles.groupButtonActive]}
                      onPress={() => setCreateIsActive(false)}
                    >
                      <Text style={[styles.groupButtonText, !createIsActive && styles.groupButtonTextActive]}>Inactive</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={closeCreateModal}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.submitBtn, creating && styles.disabledBtn]} onPress={onCreateService} disabled={creating}>
                    <Text style={styles.submitBtnText}>{creating ? "Creating..." : "Add"}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FCF8F2" },
  content: { padding: 16, paddingBottom: 24, gap: 10 },
  headerWrap: { marginBottom: 10, gap: 8 },
  headerWrapExpanded: { paddingBottom: 110 },
  title: { fontSize: 30, lineHeight: 34, fontWeight: "900", color: "#23364B" },
  subtitle: { color: "#697C90", fontSize: 13 },
  errorText: { color: "#BE3A4A", fontSize: 13 },
  successText: { color: "#2F7C41", fontSize: 13, fontWeight: "700" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6DCCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#22364B",
  },
  createButton: {
    borderRadius: 12,
    backgroundColor: "#E08144",
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  filterRow: { flexDirection: "row", gap: 8 },
  dropdownWrap: { flex: 1, position: "relative", zIndex: 40 },
  dropdownTrigger: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7DBCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  dropdownLabel: {
    color: "#D27743",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dropdownValue: {
    color: "#2B4056",
    fontSize: 12,
    fontWeight: "700",
  },
  dropdownMenu: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6D8C7",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 60,
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  dropdownItem: { paddingHorizontal: 10, paddingVertical: 9 },
  dropdownItemActive: { backgroundColor: "#FFF2E8" },
  dropdownItemText: { color: "#4D6074", fontSize: 12, fontWeight: "600" },
  dropdownItemTextActive: { color: "#C8693A", fontWeight: "700" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9DDCF",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 4,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  name: { color: "#22364B", fontSize: 15, fontWeight: "700", flex: 1 },
  price: { color: "#A95A2F", fontWeight: "800", fontSize: 13 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  meta: { color: "#64788C", fontSize: 12 },
  description: { color: "#5D7084", fontSize: 12, lineHeight: 17 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#EADFD2",
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE5D9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { color: "#22364B", fontSize: 24, fontWeight: "900" },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7FA",
  },
  modalCloseText: { color: "#6A7D92", fontSize: 14, fontWeight: "800" },
  modalContent: { padding: 16, gap: 12, paddingBottom: 24 },
  inputGroup: { gap: 8 },
  inputGroupCol: { flex: 1, gap: 8 },
  inputLabel: { color: "#23364B", fontSize: 13, fontWeight: "800" },
  hintText: { color: "#7E8D9E", fontSize: 12 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6DCCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#22364B",
  },
  textArea: { minHeight: 86, textAlignVertical: "top" },
  rowInputs: { flexDirection: "row", gap: 10 },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4D8CB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  optionChipActive: {
    borderColor: "#E08144",
    backgroundColor: "#FFF2E8",
  },
  optionChipText: { color: "#4C6175", fontSize: 12, fontWeight: "600" },
  optionChipTextActive: { color: "#C8693A", fontWeight: "700" },
  imagePickerBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4D8CA",
    backgroundColor: "#FFF6EE",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerBtnText: {
    color: "#C8693A",
    fontSize: 13,
    fontWeight: "700",
  },
  imagePreviewWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  imagePreviewItem: {
    width: 74,
    height: 74,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2D8CC",
    backgroundColor: "#F8F4EE",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,28,36,0.72)",
  },
  removeImageBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  groupRow: { flexDirection: "row", gap: 10 },
  groupButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6DCCD",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingVertical: 10,
  },
  groupButtonActive: {
    borderColor: "#E08144",
    backgroundColor: "#FFF2E8",
  },
  groupButtonText: { color: "#5D7084", fontSize: 14, fontWeight: "700" },
  groupButtonTextActive: { color: "#C8693A" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 6 },
  cancelBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DFE4EC",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: { color: "#5D7084", fontSize: 13, fontWeight: "700" },
  submitBtn: {
    borderRadius: 10,
    backgroundColor: "#E08144",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  disabledBtn: { opacity: 0.7 },
  emptyText: { color: "#6D7D8E", textAlign: "center", paddingVertical: 18 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FCF8F2" },
});
