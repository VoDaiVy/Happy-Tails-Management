import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { getAllMedicalRecords } from "../../api/modules/medicalRecordApi";
import type { MedicalRecordItem } from "../../api/modules/medicalRecordApi";

type Stage = "received" | "processing" | "completed";

type PetRecordInfo = {
  petName: string;
  petType: string;
  breed: string;
  ownerName: string;
  imageUri?: string;
};

function asDict(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  return input as Record<string, unknown>;
}

function pickString(dict: Record<string, unknown> | null, keys: string[]) {
  if (!dict) return "";
  for (const key of keys) {
    const value = dict[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function pickImage(dict: Record<string, unknown> | null, keys: string[]) {
  if (!dict) return undefined;
  for (const key of keys) {
    const value = dict[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return String(value[0]);
    }
  }
  return undefined;
}

function toTitleCase(value: string) {
  if (!value) return "General";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRecordTypeBadge(recordType?: string) {
  const normalized = String(recordType || "general").toLowerCase();
  if (normalized.includes("check")) return { bg: "#FFF2DD", text: "#A76A20", label: "Checkup" };
  if (normalized.includes("vacc")) return { bg: "#E9F2FF", text: "#2C66BC", label: "Vaccination" };
  if (normalized.includes("treat")) return { bg: "#E8F6EC", text: "#2F7A47", label: "Treatment" };
  if (normalized.includes("surg")) return { bg: "#FCEAEF", text: "#B14D63", label: "Surgery" };
  if (normalized.includes("emerg")) return { bg: "#FEEDE7", text: "#B86130", label: "Emergency" };
  if (normalized.includes("groom")) return { bg: "#F2ECFF", text: "#6E4BAF", label: "Grooming" };
  return { bg: "#F0EDE8", text: "#6C6156", label: toTitleCase(normalized) };
}

function getStageBadge(stage?: Stage) {
  if (stage === "completed") return { bg: "#E7F5E8", text: "#2F7C41", label: "Completed" };
  if (stage === "processing") return { bg: "#FFF3D8", text: "#9F7008", label: "Active" };
  return { bg: "#EEF2F7", text: "#54667A", label: "Received" };
}

function getPetInfo(record: MedicalRecordItem): PetRecordInfo {
  const pet = asDict(record.userPet);
  const owner = asDict(record.user);

  const petName = pickString(pet, ["petName", "name"]) || "Unknown pet";
  const petType = pickString(pet, ["petType", "type"]);
  const breed = pickString(pet, ["breed"]);
  const ownerName = pickString(owner, ["fullName", "name", "email"]) || "Unknown owner";
  const imageUri = pickImage(pet, ["avatar", "image", "photo", "images"]);

  return {
    petName,
    petType: petType ? toTitleCase(petType) : "Unknown type",
    breed: breed ? toTitleCase(breed) : "-",
    ownerName,
    imageUri,
  };
}

function formatRecordDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function AdminMedicalRecordsScreen() {
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalRecords, setTotalRecords] = useState<number | null>(null);
  const [openFilterMenu, setOpenFilterMenu] = useState<"recordType" | null>(null);
  const [filterMenuFrame, setFilterMenuFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const recordTypeFilterAnchorRef = useRef<View>(null);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchText.trim().toLowerCase()), 280);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadRecords = useCallback(async (options?: { isRefresh?: boolean; nextPage?: number }) => {
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
      const response = await getAllMedicalRecords({
        page: nextPage,
        limit: 8,
        recordType: recordTypeFilter === "all" ? undefined : recordTypeFilter,
      });
      setRecords(response.records || []);

      const pagination = (response.pagination || {}) as Record<string, unknown>;
      setPage(Number(pagination.page || nextPage));
      setTotalPages(Math.max(1, Number(pagination.totalPages || 1)));
      setHasNextPage(Boolean(pagination.hasNextPage));
      setTotalRecords(typeof pagination.total === "number" ? pagination.total : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load medical records");
    } finally {
      setLoading(false);
      setPaging(false);
      setRefreshing(false);
    }
  }, [recordTypeFilter]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const recordTypeOptions = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((item) => {
      const raw = String(item.recordType || "").trim();
      if (!raw) return;
      const key = raw.toLowerCase();
      if (!map.has(key)) {
        map.set(key, toTitleCase(raw));
      }
    });

    return [{ key: "all", label: "All Types" }, ...Array.from(map.entries()).map(([key, label]) => ({ key, label }))];
  }, [records]);

  const visibleRecords = useMemo(() => {
    if (!query) return records;
    return records.filter((item) => {
      const info = getPetInfo(item);
      const haystack = `${info.petName} ${info.ownerName} ${item.condition || ""} ${item.diagnosis || ""} ${item.recordType || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [query, records]);

  const summaryText = useMemo(() => {
    if (totalRecords === null) return `${visibleRecords.length} records`;
    return `${totalRecords} records`;
  }, [totalRecords, visibleRecords.length]);

  const toggleFilterMenu = useCallback(() => {
    if (openFilterMenu === "recordType") {
      setOpenFilterMenu(null);
      return;
    }

    recordTypeFilterAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setFilterMenuFrame({ x, y, width, height });
      setOpenFilterMenu("recordType");
    });
  }, [openFilterMenu]);

  const dropdownPopoverMetrics = useMemo(() => {
    const estimatedHeight = Math.min(280, recordTypeOptions.length * 42 + 12);

    if (!filterMenuFrame) {
      return {
        width: 180,
        left: 14,
        top: 120,
        estimatedHeight,
      };
    }

    const width = Math.max(172, Math.min(230, Math.floor(filterMenuFrame.width)));
    const left = Math.max(10, Math.min(filterMenuFrame.x, viewportWidth - width - 10));
    const belowTop = filterMenuFrame.y + filterMenuFrame.height + 6;
    const top = belowTop + estimatedHeight < viewportHeight - 12
      ? belowTop
      : Math.max(72, filterMenuFrame.y - estimatedHeight - 8);

    return { width, left, top, estimatedHeight };
  }, [filterMenuFrame, recordTypeOptions.length, viewportHeight, viewportWidth]);

  const useBottomSheetDropdown = viewportHeight < 600 || !filterMenuFrame;

  const onRetry = useCallback(() => {
    loadRecords({ nextPage: 1 });
  }, [loadRecords]);

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
      loadRecords({ nextPage });
    },
    [loadRecords, page, paging, totalPages],
  );

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D6824B" />
        <Text style={styles.loadingText}>Loading medical records...</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={visibleRecords}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRecords({ isRefresh: true, nextPage: 1 })} tintColor="#D6824B" />}
        onScrollBeginDrag={() => setOpenFilterMenu(null)}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.title}>Medical Records</Text>
            <Text style={styles.subtitle}>Live data from /medical-records</Text>
            <Text style={styles.counterText}>{summaryText}</Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={onRetry}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.searchShell}>
              <Feather name="search" size={16} color="#A08A78" />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search by pet name, owner, condition or diagnosis..."
                placeholderTextColor="#B39E88"
                style={styles.searchInput}
              />
            </View>

            <View style={styles.filterRow}>
              <View ref={recordTypeFilterAnchorRef} collapsable={false} style={styles.filterWrap}>
                <Pressable style={styles.filterTrigger} onPress={toggleFilterMenu}>
                  <Text style={styles.filterLabel}>Record Type</Text>
                  <View style={styles.filterValueRow}>
                    <Text style={styles.filterValue} numberOfLines={1}>
                      {recordTypeFilter === "all"
                        ? "All Types"
                        : recordTypeOptions.find((option) => option.key === recordTypeFilter)?.label || "Type"}
                    </Text>
                    <Feather name={openFilterMenu ? "chevron-up" : "chevron-down"} size={14} color="#9C6544" />
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const info = getPetInfo(item);
          const typeBadge = getRecordTypeBadge(item.recordType);
          const stageBadge = getStageBadge(item.workflowStage);

          return (
            <Pressable style={styles.recordItem} onPress={() => setSelectedRecord(item)}>
              <View style={styles.avatarWrap}>
                {info.imageUri ? (
                  <Image source={{ uri: info.imageUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Feather name="heart" size={14} color="#BC6D3D" />
                  </View>
                )}
              </View>

              <View style={styles.itemContent}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.petName} numberOfLines={1}>{info.petName}</Text>
                  <Text style={styles.timeText}>{formatRecordDate(item.createdAt)}</Text>
                </View>

                <View style={styles.badgesRow}>
                  <View style={[styles.badge, { backgroundColor: typeBadge.bg }]}>
                    <Text style={[styles.badgeText, { color: typeBadge.text }]}>{typeBadge.label}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: stageBadge.bg }]}>
                    <Text style={[styles.badgeText, { color: stageBadge.text }]}>{stageBadge.label}</Text>
                  </View>
                </View>

                <Text style={styles.metaText} numberOfLines={1}>Pet: {info.petType} • {info.breed}</Text>
                <Text style={styles.metaText} numberOfLines={1}>Owner: {info.ownerName}</Text>
                <Text style={styles.bodyText} numberOfLines={1}>Condition: {item.condition || "-"}</Text>
                <Text style={styles.bodyText} numberOfLines={2}>Diagnosis: {item.diagnosis || "-"}</Text>
                <Text style={styles.metaText} numberOfLines={1}>Follow-up: {formatRecordDate(item.followUpDate)}</Text>

                <View style={styles.viewRow}>
                  <View style={styles.viewBtn}>
                    <Feather name="eye" size={12} color="#A65D35" />
                    <Text style={styles.viewBtnText}>View</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Feather name="clipboard" size={18} color="#B68D6E" />
            </View>
            <Text style={styles.emptyTitle}>No medical records found</Text>
                      <Pressable style={styles.emptyRetryButton} onPress={onRetry}>
              <Text style={styles.emptyRetryText}>Reload</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          visibleRecords.length > 0 ? (
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
              {recordTypeOptions.map((option) => (
                <Pressable
                  key={option.key}
                  style={({ pressed }) => [
                    styles.dropdownPortalItem,
                    recordTypeFilter === option.key && styles.dropdownPortalItemActive,
                    pressed && styles.dropdownPortalItemPressed,
                  ]}
                  onPress={() => {
                    setRecordTypeFilter(option.key);
                    setOpenFilterMenu(null);
                  }}
                >
                  <Text style={[styles.dropdownPortalItemText, recordTypeFilter === option.key && styles.dropdownPortalItemTextActive]}>{option.label}</Text>
                  {recordTypeFilter === option.key ? <Feather name="check" size={14} color="#C36B3A" /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedRecord)} transparent animationType="slide" onRequestClose={() => setSelectedRecord(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelectedRecord(null)} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Medical Record Detail</Text>
              <Pressable onPress={() => setSelectedRecord(null)} style={styles.modalCloseBtn}>
                <Feather name="x" size={16} color="#6A7D92" />
              </Pressable>
            </View>

            {selectedRecord ? (
              <ScrollView contentContainerStyle={styles.modalBody}>
                {(() => {
                  const info = getPetInfo(selectedRecord);
                  return (
                    <>
                      <Text style={styles.modalSectionTitle}>Pet</Text>
                      <Text style={styles.modalRowText}>Name: {info.petName}</Text>
                      <Text style={styles.modalRowText}>Type: {info.petType}</Text>
                      <Text style={styles.modalRowText}>Breed: {info.breed}</Text>
                      <Text style={styles.modalRowText}>Owner: {info.ownerName}</Text>

                      <Text style={styles.modalSectionTitle}>Medical Data</Text>
                      <Text style={styles.modalRowText}>Record type: {toTitleCase(selectedRecord.recordType || "general")}</Text>
                      <Text style={styles.modalRowText}>Stage: {toTitleCase(selectedRecord.workflowStage || "received")}</Text>
                      <Text style={styles.modalRowText}>Condition: {selectedRecord.condition || "-"}</Text>
                      <Text style={styles.modalRowText}>Diagnosis: {selectedRecord.diagnosis || "-"}</Text>
                      <Text style={styles.modalRowText}>Treatment: {selectedRecord.treatment || "-"}</Text>
                      <Text style={styles.modalRowText}>Notes: {selectedRecord.notes || "-"}</Text>
                      <Text style={styles.modalRowText}>Follow-up: {formatRecordDate(selectedRecord.followUpDate)}</Text>
                    </>
                  );
                })()}
              </ScrollView>
            ) : null}
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
  filterRow: { flexDirection: "row", gap: 8 },
  filterWrap: { flex: 1 },
  filterTrigger: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E7DBCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    minHeight: 42,
    justifyContent: "center",
  },
  filterLabel: {
    color: "#B38465",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  filterValueRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  filterValue: {
    color: "#2B4056",
    fontSize: 12,
    fontWeight: "700",
  },
  recordItem: {
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
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8DCCF",
    backgroundColor: "#F8F1E8",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E7DA",
  },
  itemContent: { flex: 1, gap: 5 },
  itemTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  petName: { color: "#22364B", fontSize: 14.5, fontWeight: "800", flex: 1 },
  timeText: { color: "#917F70", fontSize: 10.5, fontWeight: "700" },
  badgesRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  metaText: { color: "#64788C", fontSize: 11 },
  bodyText: { color: "#4B6075", fontSize: 11.5, lineHeight: 16 },
  viewRow: { marginTop: 2, alignItems: "flex-end" },
  viewBtn: {
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
  viewBtnText: { color: "#A65D35", fontSize: 11, fontWeight: "700" },
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
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "88%",
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
  modalTitle: { color: "#22364B", fontSize: 20, fontWeight: "900" },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7EFE7",
  },
  modalBody: { padding: 16, gap: 8, paddingBottom: 24 },
  modalSectionTitle: {
    marginTop: 6,
    color: "#8B5A37",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modalRowText: { color: "#4A6075", fontSize: 13, lineHeight: 18 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FCF8F2" },
});
