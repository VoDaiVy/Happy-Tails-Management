import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { createAdminService, deleteAdminService, getAdminServices, updateAdminService, uploadAdminServiceImage } from "../../api/modules/adminServiceApi";
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

function joinFeatures(raw?: string[]) {
  if (!Array.isArray(raw) || raw.length === 0) return "";
  return raw.join(", ");
}

function getStatusBadge(isActive?: boolean) {
  if (isActive === false) {
    return { label: "Inactive", bg: "#FDECEF", text: "#B24251" };
  }
  return { label: "Active", bg: "#E7F5E8", text: "#2F7C41" };
}

function ServiceThumbnail({ uri, name }: { uri?: string; name: string }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const firstLetter = name.trim().charAt(0).toUpperCase() || "S";

  if (!uri || imageError) {
    return (
      <View style={styles.thumbnailFallback}>
        <Text style={styles.thumbnailFallbackText}>{firstLetter}</Text>
      </View>
    );
  }

  return (
    <View style={styles.thumbnailWrap}>
      <Image
        source={{ uri }}
        style={styles.thumbnailImage}
        onError={() => setImageError(true)}
        onLoad={() => setImageLoaded(true)}
      />
      {!imageLoaded ? (
        <View style={styles.thumbnailLoadingOverlay}>
          <ActivityIndicator size="small" color="#CD7B46" />
        </View>
      ) : null}
    </View>
  );
}

export function AdminServiceManagementScreen() {
  const statusFilterAnchorRef = useRef<View>(null);
  const categoryFilterAnchorRef = useRef<View>(null);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
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
  const [filterMenuFrame, setFilterMenuFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [paging, setPaging] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalServices, setTotalServices] = useState<number | null>(null);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [pendingDeleteService, setPendingDeleteService] = useState<ServiceItem | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const loadServices = useCallback(async (options?: { isRefresh?: boolean; nextPage?: number }) => {
    const isRefresh = Boolean(options?.isRefresh);
    const nextPage = options?.nextPage || 1;

    if (isRefresh) {
      setRefreshing(true);
    } else if (nextPage !== 1) {
      setPaging(true);
    } else {
      setLoading(true);
    }

    setError("");
    try {
      const response = await getAdminServices({
        search: query || undefined,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        isActive: statusFilter === "all" ? "all" : statusFilter === "active" ? "true" : "false",
        limit: 8,
        page: nextPage,
      });
      setServices(response.data || []);

      const pagination = response.pagination;
      setPage(Number(pagination?.page || nextPage));
      setTotalPages(Math.max(1, Number(pagination?.totalPages || 1)));
      setHasNextPage(Boolean(pagination?.hasNextPage));
      setTotalServices(typeof pagination?.total === "number" ? pagination.total : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load services");
    } finally {
      setLoading(false);
      setPaging(false);
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

  const statusLabel = useMemo(
    () => (statusFilter === "all" ? "All" : statusFilter === "active" ? "Active" : "Inactive"),
    [statusFilter],
  );

  const categoryLabel = useMemo(
    () => (categoryFilter === "all" ? "All Categories" : categoryNameMap.get(categoryFilter) || "Category"),
    [categoryFilter, categoryNameMap],
  );

  const toggleFilterMenu = useCallback(
    (menu: "status" | "category") => {
      if (openFilterMenu === menu) {
        setOpenFilterMenu(null);
        return;
      }

      const anchorRef = menu === "status" ? statusFilterAnchorRef : categoryFilterAnchorRef;
      anchorRef.current?.measureInWindow((x, y, width, height) => {
        setFilterMenuFrame({ x, y, width, height });
        setOpenFilterMenu(menu);
      });
    },
    [openFilterMenu],
  );

  const dropdownPopoverMetrics = useMemo(() => {
    const itemCount = openFilterMenu === "status" ? STATUS_FILTERS.length : categories.length + 1;
    const estimatedHeight = Math.min(280, itemCount * 42 + 12);

    if (!filterMenuFrame) {
      return {
        width: 164,
        left: 14,
        top: 120,
        estimatedHeight,
      };
    }

    const width = Math.max(158, Math.min(230, Math.floor(filterMenuFrame.width)));
    const left = Math.max(10, Math.min(filterMenuFrame.x, viewportWidth - width - 10));
    const belowTop = filterMenuFrame.y + filterMenuFrame.height + 6;
    const top = belowTop + estimatedHeight < viewportHeight - 12
      ? belowTop
      : Math.max(72, filterMenuFrame.y - estimatedHeight - 8);

    return { width, left, top, estimatedHeight };
  }, [categories.length, filterMenuFrame, openFilterMenu, viewportHeight, viewportWidth]);

  const useBottomSheetDropdown = viewportHeight < 600 || !filterMenuFrame;

  const openCreateModal = useCallback(() => {
    setError("");
    setMessage("");
    setEditingServiceId(null);
    if (!createCategoryId && categories.length > 0) {
      setCreateCategoryId(categories[0]._id);
    }
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
    setCreateModalVisible(true);
  }, [categories, createCategoryId]);

  const openEditModal = useCallback((service: ServiceItem) => {
    setError("");
    setMessage("");
    setEditingServiceId(service._id);
    setCreateName(service.name || "");
    setCreateDescription(service.description || "");
    setCreatePrice(String(service.price || 0));
    setCreateDuration(String(service.duration || 0));
    setCreateCategoryId(service.category?._id || categories[0]?._id || "");
    setCreateGroup(service.group === "wet" ? "wet" : "dry");
    setCreateFeaturesRaw(joinFeatures(service.features));
    setCreatePetTypes(Array.isArray(service.petTypes) && service.petTypes.length > 0 ? service.petTypes : ["dog", "cat"]);
    setCreateIsActive(service.isActive !== false);
    setCreateImageUrls(service.images || []);
    setCreateImagePreviews(service.images || []);
    setCreateModalVisible(true);
  }, [categories]);

  const closeCreateModal = useCallback(() => {
    if (creating) return;
    setCreateModalVisible(false);
    setEditingServiceId(null);
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

  const onSaveService = useCallback(async () => {
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
      const payload = {
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
      };

      if (editingServiceId) {
        await updateAdminService(editingServiceId, payload);
        setMessage("Service updated successfully.");
      } else {
        await createAdminService(payload);
        setMessage("Service created successfully.");
      }

      setCreateModalVisible(false);
      setEditingServiceId(null);
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
      await loadServices({ nextPage: page });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save service");
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
    editingServiceId,
    loadServices,
    page,
  ]);

  const onConfirmDeleteService = useCallback(async () => {
    if (!pendingDeleteService?._id || deleting) return;
    setDeleting(true);
    setError("");

    try {
      await deleteAdminService(pendingDeleteService._id);
      setMessage("Service deleted successfully.");
      setPendingDeleteService(null);
      await loadServices({ nextPage: page });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete service");
    } finally {
      setDeleting(false);
    }
  }, [deleting, loadServices, page, pendingDeleteService]);

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

  const onRetry = useCallback(() => {
    loadServices();
  }, [loadServices]);

  const summaryText = useMemo(() => {
    if (totalServices === null) return `${services.length} services`;
    return `${totalServices} services`;
  }, [services.length, totalServices]);

  const getVisiblePages = useCallback(() => {
    const visible = new Set<number>();
    visible.add(1);
    visible.add(totalPages);
    if (page > 1) visible.add(page - 1);
    visible.add(page);
    if (page < totalPages) visible.add(page + 1);
    return Array.from(visible).sort((a, b) => a - b);
  }, [page, totalPages]);

  const onChangePage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage > totalPages || nextPage === page || paging) return;
      loadServices({ nextPage });
    },
    [loadServices, page, paging, totalPages],
  );

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D6824B" />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={services}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadServices({ isRefresh: true, nextPage: 1 })} tintColor="#D6824B" />}
        onScrollBeginDrag={() => setOpenFilterMenu(null)}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.title}>Service Management</Text>
            
            <Text style={styles.counterText}>{summaryText}</Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={onRetry}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {message ? (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}

            <View style={styles.searchRow}>
              <View style={styles.searchShell}>
                <Feather name="search" size={16} color="#A08A78" />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search by service name"
                  placeholderTextColor="#B39E88"
                  style={styles.searchInput}
                />
              </View>

              <Pressable style={styles.createButton} onPress={openCreateModal}>
                <Text style={styles.createButtonText}>+ Add</Text>
              </Pressable>
            </View>

            <View style={styles.filterRow}>
              <View ref={statusFilterAnchorRef} collapsable={false} style={styles.dropdownWrap}>
                <Pressable style={styles.dropdownTrigger} onPress={() => toggleFilterMenu("status")}>
                  <Text style={styles.dropdownLabel}>Status</Text>
                  <View style={styles.dropdownValueRow}>
                    <Text style={styles.dropdownValue}>{statusLabel}</Text>
                    <Feather name={openFilterMenu === "status" ? "chevron-up" : "chevron-down"} size={14} color="#9C6544" />
                  </View>
                </Pressable>
              </View>

              <View ref={categoryFilterAnchorRef} collapsable={false} style={styles.dropdownWrap}>
                <Pressable style={styles.dropdownTrigger} onPress={() => toggleFilterMenu("category")}>
                  <Text style={styles.dropdownLabel}>Category</Text>
                  <View style={styles.dropdownValueRow}>
                    <Text style={styles.dropdownValue} numberOfLines={1}>{categoryLabel}</Text>
                    <Feather name={openFilterMenu === "category" ? "chevron-up" : "chevron-down"} size={14} color="#9C6544" />
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const statusStyle = getStatusBadge(item.isActive);
          const thumbnail = item.images?.[0];
          return (
            <View style={[styles.serviceItem, index === 0 && styles.serviceItemFirst]}>
              <ServiceThumbnail uri={thumbnail} name={item.name} />

              <View style={styles.serviceMainCol}>
                <View style={styles.serviceTopRow}>
                  <Text style={styles.serviceName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.serviceRightCol}>
                    <Text style={styles.price}>{Number(item.price || 0).toLocaleString()} đ</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}> 
                      <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.serviceMetaRow}>
                  <Text style={styles.meta}>Duration: {item.duration || 0} mins</Text>
                  <Text style={styles.meta}>Category: {item.category?.name || "General"}</Text>
                </View>

                {item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}

                <View style={styles.itemActionsRow}>
                  <Pressable style={styles.editActionBtn} onPress={() => openEditModal(item)}>
                    <Feather name="edit-2" size={12} color="#8B5A37" />
                    <Text style={styles.editActionText}>Edit</Text>
                  </Pressable>

                  <Pressable style={styles.deleteActionBtn} onPress={() => setPendingDeleteService(item)}>
                    <Feather name="trash-2" size={12} color="#B44B5C" />
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Feather name="briefcase" size={17} color="#B68662" />
            </View>
            <Text style={styles.emptyTitle}>No services found</Text>
            <Text style={styles.emptyText}>Try changing keywords or filter options.</Text>
            <Pressable style={styles.emptyRetryButton} onPress={onRetry}>
              <Text style={styles.emptyRetryText}>Reload</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          services.length > 0 ? (
            <View style={styles.paginationWrap}>
              <View style={styles.paginationInner}>
                <Pressable
                  style={[styles.pageNavButton, (page <= 1 || paging) && styles.pageNavButtonDisabled]}
                  disabled={page <= 1 || paging}
                  onPress={() => onChangePage(page - 1)}
                >
                  <Feather name="chevron-left" size={14} color={page <= 1 || paging ? "#CBB6A3" : "#A45E37"} />
                </Pressable>

                {getVisiblePages().map((pageNumber, index, arr) => {
                  const prev = arr[index - 1];
                  const showGap = typeof prev === "number" && pageNumber - prev > 1;
                  return (
                    <View key={pageNumber} style={styles.pageNumberGroup}>
                      {showGap ? <Text style={styles.pageEllipsis}>...</Text> : null}
                      <Pressable
                        style={[styles.pageNumberButton, pageNumber === page && styles.pageNumberButtonActive]}
                        disabled={paging}
                        onPress={() => onChangePage(pageNumber)}
                      >
                        <Text style={[styles.pageNumberText, pageNumber === page && styles.pageNumberTextActive]}>{pageNumber}</Text>
                      </Pressable>
                    </View>
                  );
                })}

                <Pressable
                  style={[styles.pageNavButton, (!hasNextPage || paging) && styles.pageNavButtonDisabled]}
                  disabled={!hasNextPage || paging}
                  onPress={() => onChangePage(page + 1)}
                >
                  <Feather name="chevron-right" size={14} color={!hasNextPage || paging ? "#CBB6A3" : "#A45E37"} />
                </Pressable>
              </View>

              {paging ? <ActivityIndicator size="small" color="#D6824B" /> : null}
            </View>
          ) : null
        }
      />

      <Modal visible={Boolean(openFilterMenu)} transparent animationType="fade" onRequestClose={() => setOpenFilterMenu(null)}>
        <View style={styles.dropdownOverlayLayer}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpenFilterMenu(null)} />

          <View
            style={[
              styles.dropdownPortalMenu,
              useBottomSheetDropdown
                ? styles.dropdownPortalSheet
                : {
                    width: dropdownPopoverMetrics.width,
                    left: dropdownPopoverMetrics.left,
                    top: dropdownPopoverMetrics.top,
                    maxHeight: dropdownPopoverMetrics.estimatedHeight,
                  },
            ]}
          >
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {(openFilterMenu === "status"
                ? STATUS_FILTERS.map((status) => ({
                    key: status,
                    label: status === "all" ? "All" : status === "active" ? "Active" : "Inactive",
                    active: statusFilter === status,
                    onPress: () => setStatusFilter(status),
                  }))
                : [
                    {
                      key: "all",
                      label: "All Categories",
                      active: categoryFilter === "all",
                      onPress: () => setCategoryFilter("all"),
                    },
                    ...categories.map((category) => ({
                      key: category._id,
                      label: category.name,
                      active: categoryFilter === category._id,
                      onPress: () => setCategoryFilter(category._id),
                    })),
                  ]).map((option) => (
                <Pressable
                  key={option.key}
                  style={({ pressed }) => [
                    styles.dropdownPortalItem,
                    option.active && styles.dropdownPortalItemActive,
                    pressed && styles.dropdownPortalItemPressed,
                  ]}
                  onPress={() => {
                    option.onPress();
                    setOpenFilterMenu(null);
                  }}
                >
                  <Text style={[styles.dropdownPortalItemText, option.active && styles.dropdownPortalItemTextActive]}>{option.label}</Text>
                  {option.active ? <Feather name="check" size={14} color="#C36B3A" /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={closeCreateModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeCreateModal} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingServiceId ? "Edit Service" : "Add New Service"}</Text>
              <Pressable onPress={closeCreateModal} style={styles.modalCloseBtn}>
                <Feather name="x" size={16} color="#6A7D92" />
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
                  <Pressable style={[styles.submitBtn, creating && styles.disabledBtn]} onPress={onSaveService} disabled={creating}>
                    <Text style={styles.submitBtnText}>{creating ? (editingServiceId ? "Saving..." : "Creating...") : (editingServiceId ? "Save Changes" : "Add Service")}</Text>
                  </Pressable>
                </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(pendingDeleteService)} transparent animationType="fade" onRequestClose={() => setPendingDeleteService(null)}>
        <View style={styles.modalOverlayCenter}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => (deleting ? null : setPendingDeleteService(null))} />

          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete Service</Text>
            <Text style={styles.confirmText}>Are you sure you want to delete this service?</Text>
            <Text style={styles.confirmServiceName} numberOfLines={1}>{pendingDeleteService?.name || ""}</Text>

            <View style={styles.confirmActions}>
              <Pressable
                style={[styles.confirmCancelBtn, deleting && styles.disabledBtn]}
                disabled={deleting}
                onPress={() => setPendingDeleteService(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.confirmDeleteBtn, deleting && styles.disabledBtn]}
                disabled={deleting}
                onPress={onConfirmDeleteService}
              >
                <Text style={styles.confirmDeleteText}>{deleting ? "Deleting..." : "Delete"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F1" },
  content: { paddingHorizontal: 14, paddingBottom: 24, paddingTop: 4, gap: 8 },
  headerWrap: { marginBottom: 8, gap: 8 },
  title: { color: "#1F2E40", fontSize: 28, lineHeight: 34, fontWeight: "900" },
  subtitle: { color: "#7A6A5A", fontSize: 12.5 },
  counterText: { color: "#A17D62", fontSize: 12, fontWeight: "700", marginTop: 1 },
  loadingText: { color: "#8E7865", marginTop: 10, fontSize: 13, fontWeight: "600" },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0C9CE",
    backgroundColor: "#FFF2F4",
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  errorText: { color: "#B44556", fontSize: 12, flex: 1 },
  retryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8AAB4",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryButtonText: { color: "#A93F50", fontSize: 11, fontWeight: "800" },
  successBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7EAD8",
    backgroundColor: "#EFFAF1",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  successText: { color: "#2E7A45", fontSize: 12, fontWeight: "700" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchShell: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7D9CB",
    backgroundColor: "#FFFEFC",
    paddingHorizontal: 11,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: "#22364B",
    fontSize: 13,
  },
  createButton: {
    borderRadius: 13,
    backgroundColor: "#C86B34",
    minHeight: 42,
    paddingHorizontal: 15,
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A95628",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  filterRow: { flexDirection: "row", gap: 8 },
  dropdownWrap: { flex: 1 },
  dropdownTrigger: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E7DBCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    minHeight: 42,
    justifyContent: "center",
  },
  dropdownLabel: {
    color: "#B38465",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dropdownValueRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dropdownValue: {
    color: "#2B4056",
    fontSize: 12,
    fontWeight: "700",
  },
  dropdownOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25, 37, 52, 0.08)",
  },
  dropdownPortalMenu: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6D8C7",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    position: "absolute",
    zIndex: 900,
    elevation: 22,
    shadowColor: "#2F1E0E",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    paddingVertical: 3,
  },
  dropdownPortalSheet: {
    left: 16,
    right: 16,
    bottom: 14,
    position: "absolute",
  },
  dropdownPortalItem: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dropdownPortalItemActive: { backgroundColor: "#FFF2E8" },
  dropdownPortalItemPressed: { backgroundColor: "#FCEEE2" },
  dropdownPortalItemText: { color: "#5D4D40", fontSize: 12, fontWeight: "700" },
  dropdownPortalItemTextActive: { color: "#C8693A" },
  serviceItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EADFD2",
    backgroundColor: "#FFFEFC",
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  serviceItemFirst: {
    marginTop: 4,
  },
  thumbnailWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8DCCF",
    backgroundColor: "#F8F1E8",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  thumbnailFallback: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8DCCF",
    backgroundColor: "#F3E7DA",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailFallbackText: {
    color: "#B46B3C",
    fontSize: 22,
    fontWeight: "900",
  },
  serviceMainCol: {
    flex: 1,
    gap: 5,
  },
  serviceTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6 },
  serviceName: { color: "#22364B", fontSize: 14.5, fontWeight: "800", flex: 1 },
  serviceRightCol: { alignItems: "flex-end", gap: 4 },
  price: { color: "#A95A2F", fontWeight: "800", fontSize: 13 },
  serviceMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  meta: { color: "#64788C", fontSize: 11.5 },
  description: { color: "#5D7084", fontSize: 11.5, lineHeight: 16 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  itemActionsRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  editActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D8C8",
    backgroundColor: "#FFF8F0",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  editActionText: {
    color: "#8B5A37",
    fontSize: 11,
    fontWeight: "700",
  },
  deleteActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F1D6DB",
    backgroundColor: "#FFF4F6",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  deleteActionText: {
    color: "#B44B5C",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyWrap: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EADFD3",
    backgroundColor: "#FFFEFC",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6EBDD",
  },
  emptyTitle: {
    marginTop: 10,
    color: "#40392F",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    color: "#7E7063",
    textAlign: "center",
    marginTop: 6,
    fontSize: 13,
  },
  emptyRetryButton: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DFC7B2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  emptyRetryText: {
    color: "#A15F3A",
    fontSize: 12,
    fontWeight: "800",
  },
  paginationWrap: {
    marginTop: 8,
    alignItems: "center",
    gap: 6,
    paddingBottom: 8,
  },
  paginationInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageNumberGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageEllipsis: {
    color: "#AF9885",
    fontSize: 11,
    fontWeight: "700",
  },
  pageNavButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E5D1BE",
    backgroundColor: "#FFF8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  pageNavButtonDisabled: {
    backgroundColor: "#F6EFE8",
    borderColor: "#EBDDD1",
  },
  pageNumberButton: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5D1BE",
    backgroundColor: "#FFFDF8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  pageNumberButtonActive: {
    backgroundColor: "#DA7C46",
    borderColor: "#DA7C46",
  },
  pageNumberText: {
    color: "#91684C",
    fontSize: 11,
    fontWeight: "800",
  },
  pageNumberTextActive: {
    color: "#FFFFFF",
  },
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
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE5D9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { color: "#22364B", fontSize: 22, fontWeight: "900" },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7EFE7",
  },
  modalCloseText: { color: "#6A7D92", fontSize: 14, fontWeight: "800" },
  modalContent: { padding: 16, gap: 12, paddingBottom: 24 },
  inputGroup: { gap: 8 },
  inputGroupCol: { flex: 1, gap: 8 },
  inputLabel: { color: "#23364B", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  hintText: { color: "#7E8D9E", fontSize: 12 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DCCF",
    backgroundColor: "#FFFCF8",
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#22364B",
  },
  textArea: { minHeight: 92, textAlignVertical: "top" },
  rowInputs: { flexDirection: "row", gap: 10 },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E4D8CB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  optionChipActive: {
    borderColor: "#E08144",
    backgroundColor: "#FFF2E8",
  },
  optionChipText: { color: "#4C6175", fontSize: 12, fontWeight: "600" },
  optionChipTextActive: { color: "#C8693A", fontWeight: "700" },
  imagePickerBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4D8CA",
    backgroundColor: "#FFF7F0",
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
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
    borderRadius: 12,
    backgroundColor: "#C86B34",
    paddingHorizontal: 18,
    paddingVertical: 11,
    shadowColor: "#A95628",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 7,
    elevation: 3,
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  disabledBtn: { opacity: 0.7 },
  modalOverlayCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(26, 17, 10, 0.32)",
    paddingHorizontal: 20,
  },
  confirmCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DCCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  confirmTitle: {
    color: "#2A3746",
    fontSize: 17,
    fontWeight: "900",
  },
  confirmText: {
    color: "#6F6257",
    fontSize: 13,
    lineHeight: 18,
  },
  confirmServiceName: {
    color: "#8B5A37",
    fontSize: 13,
    fontWeight: "700",
  },
  confirmActions: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  confirmCancelBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDE3ED",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  confirmCancelText: {
    color: "#5E7084",
    fontSize: 13,
    fontWeight: "700",
  },
  confirmDeleteBtn: {
    borderRadius: 10,
    backgroundColor: "#C45667",
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  confirmDeleteText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FCF8F2" },
});
