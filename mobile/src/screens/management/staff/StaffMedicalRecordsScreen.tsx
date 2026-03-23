import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getStaffList } from "../../../api/modules/adminApi";
import {
  getAllMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecordStage,
  type MedicalRecordItem,
} from "../../../api/modules/medicalRecordApi";

type StageKey = "received" | "processing" | "completed";

type StaffOption = {
  id: string;
  name: string;
};

type RecordTypeFilter = "all" | string;
type StageFilter = "all" | StageKey;

type MedicalRecordView = MedicalRecordItem & {
  ownerName: string;
  ownerEmail: string;
  petName: string;
  petType: string;
  visitDate: string;
  assignedStaffName: string;
};

function asObj(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatDate(input?: string) {
  if (!input) return "--";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function normalizeStage(stage?: string): StageKey {
  if (stage === "processing") return "processing";
  if (stage === "completed") return "completed";
  return "received";
}

function stageLabel(stage?: string) {
  const s = normalizeStage(stage);
  if (s === "received") return "Stage 1";
  if (s === "processing") return "Stage 2";
  return "Stage 3 Completed";
}

function statusLabel(stage?: string) {
  const s = normalizeStage(stage);
  if (s === "completed") return "Completed";
  return "Active";
}

function stageTone(stage?: string) {
  const s = normalizeStage(stage);
  if (s === "received") return { bg: "#E7F0FB", text: "#2F62AE", border: "#CADCF6" };
  if (s === "processing") return { bg: "#FFF7E6", text: "#B26A2D", border: "#F2D8AE" };
  return { bg: "#E9F7EE", text: "#237E47", border: "#BDE0CB" };
}

function toViewModel(item: MedicalRecordItem): MedicalRecordView {
  const user = asObj(item.user);
  const userPet = asObj(item.userPet);
  const booking = asObj(item.booking);
  const createdBy = asObj((item as MedicalRecordItem & { createdBy?: unknown }).createdBy);

  return {
    ...item,
    ownerName: asString(user?.name) || "Unknown Owner",
    ownerEmail: asString(user?.email),
    petName: asString(userPet?.petName) || "Pet",
    petType: asString(userPet?.petType) || "pet",
    visitDate: asString(booking?.bookingDate) || asString(item.createdAt),
    assignedStaffName: asString(createdBy?.name) || "Unassigned",
  };
}

function nextStage(stage?: string): StageKey | null {
  const s = normalizeStage(stage);
  if (s === "received") return "processing";
  if (s === "processing") return "completed";
  return null;
}

export function StaffMedicalRecordsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");

  const [records, setRecords] = useState<MedicalRecordView[]>([]);
  const [staffs, setStaffs] = useState<StaffOption[]>([]);

  const [searchText, setSearchText] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState<RecordTypeFilter>("all");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [todayOnly, setTodayOnly] = useState(false);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<MedicalRecordView | null>(null);

  const loadData = useCallback(async () => {
    setError("");

    try {
      const [recordResult, staffList] = await Promise.all([
        getAllMedicalRecords({ page: 1, limit: 200 }),
        getStaffList(),
      ]);

      setRecords((recordResult.records || []).map(toViewModel));
      setStaffs(
        (staffList || [])
          .map((item) => ({ id: String(item.id || ""), name: String(item.name || "Staff") }))
          .filter((item) => item.id),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load medical records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const onOpenDetail = useCallback(async (id: string) => {
    setDetailVisible(true);
    setDetailLoading(true);
    setDetailRecord(null);
    setError("");

    try {
      const detail = await getMedicalRecordById(id);
      setDetailRecord(toViewModel(detail));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load record detail");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const onAdvanceStage = useCallback(
    async (item: MedicalRecordView) => {
      const next = nextStage(item.workflowStage);
      if (!next) return;

      setActionLoadingId(item._id);
      setMessage("");
      setError("");

      try {
        await updateMedicalRecordStage(item._id, {
          stage: next,
          notes: "Updated from staff mobile medical records",
        });
        setMessage("Medical record stage updated.");
        await loadData();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to update record stage");
      } finally {
        setActionLoadingId("");
      }
    },
    [loadData],
  );

  const recordTypeOptions = useMemo(() => {
    const values = Array.from(
      new Set(records.map((item) => asString(item.recordType).trim()).filter(Boolean)),
    );
    return ["all", ...values];
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const today = new Date();

    return records.filter((item) => {
      if (recordTypeFilter !== "all" && asString(item.recordType) !== recordTypeFilter) return false;
      if (stageFilter !== "all" && normalizeStage(item.workflowStage) !== stageFilter) return false;

      if (staffFilter !== "all") {
        const createdBy = asObj((item as MedicalRecordItem & { createdBy?: unknown }).createdBy);
        if (asString(createdBy?._id) !== staffFilter) return false;
      }

      if (todayOnly) {
        const d = new Date(item.visitDate || item.createdAt || "");
        if (Number.isNaN(d.getTime())) return false;
        if (
          d.getFullYear() !== today.getFullYear() ||
          d.getMonth() !== today.getMonth() ||
          d.getDate() !== today.getDate()
        ) {
          return false;
        }
      }

      if (!q) return true;

      const blob = [
        item.petName,
        item.ownerName,
        item.ownerEmail,
        item._id,
        item.recordType,
        item.diagnosis,
        item.condition,
        item.assignedStaffName,
      ]
        .join(" ")
        .toLowerCase();

      return blob.includes(q);
    });
  }, [recordTypeFilter, records, searchText, stageFilter, staffFilter, todayOnly]);

  const summary = useMemo(() => {
    const now = new Date();

    const isTodayDate = (value?: string) => {
      const d = new Date(value || "");
      if (Number.isNaN(d.getTime())) return false;
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    };

    const followUpNeeded = records.filter((item) => {
      if (!item.followUpDate) return false;
      const d = new Date(item.followUpDate);
      if (Number.isNaN(d.getTime())) return false;
      return d.getTime() <= now.getTime() && normalizeStage(item.workflowStage) !== "completed";
    }).length;

    const critical = records.filter((item) => {
      const text = `${item.condition || ""} ${item.diagnosis || ""}`.toLowerCase();
      return text.includes("critical") || text.includes("emergency") || text.includes("severe");
    }).length;

    return {
      total: records.length,
      todayVisits: records.filter((item) => isTodayDate(item.visitDate || item.createdAt)).length,
      inProgress: records.filter((item) => normalizeStage(item.workflowStage) === "processing").length,
      followUpNeeded,
      critical,
    };
  }, [records]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D77D46" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D77D46" />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Medical Record Management</Text>
                <Text style={styles.subtitle}>Track pet health records, diagnosis and service progress.</Text>
              </View>

              <Pressable style={styles.refreshBtn} onPress={onRefresh}>
                <Feather name="refresh-cw" size={15} color="#6D8198" />
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </Pressable>
            </View>

            <View style={styles.searchWrap}>
              <Feather name="search" size={16} color="#D07B45" />
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search by pet, owner, record ID..."
                placeholderTextColor="#A1AEBE"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {recordTypeOptions.map((type) => {
                const active = recordTypeFilter === type;
                const label = type === "all" ? "All Types" : type;
                return (
                  <Pressable
                    key={`type-${type}`}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setRecordTypeFilter(type)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}

              {(["all", "received", "processing", "completed"] as StageFilter[]).map((status) => {
                const active = stageFilter === status;
                const label = status === "all" ? "All Status" : status;
                return (
                  <Pressable
                    key={`stage-${status}`}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setStageFilter(status)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}

              <Pressable
                style={[styles.chip, todayOnly && styles.chipActive]}
                onPress={() => setTodayOnly((prev) => !prev)}
              >
                <Text style={[styles.chipText, todayOnly && styles.chipTextActive]}>{todayOnly ? "Today Only" : "Visit Date"}</Text>
              </Pressable>
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <Pressable
                style={[styles.chip, staffFilter === "all" && styles.chipActive]}
                onPress={() => setStaffFilter("all")}
              >
                <Text style={[styles.chipText, staffFilter === "all" && styles.chipTextActive]}>All Staff</Text>
              </Pressable>
              {staffs.map((staff) => {
                const active = staffFilter === staff.id;
                return (
                  <Pressable
                    key={staff.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setStaffFilter(staff.id)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{staff.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.kpiGrid}>
              {[
                { label: "Total Records", value: summary.total, icon: "file-text" as const, tint: "#E8895A" },
                { label: "Today Visits", value: summary.todayVisits, icon: "calendar" as const, tint: "#C08939" },
                { label: "In Progress", value: summary.inProgress, icon: "activity" as const, tint: "#D27845" },
                { label: "Follow-up Needed", value: summary.followUpNeeded, icon: "clock" as const, tint: "#AF8330" },
                { label: "Critical Cases", value: summary.critical, icon: "alert-triangle" as const, tint: "#C14D58" },
              ].map((item) => (
                <View key={item.label} style={styles.kpiCard}>
                  <View>
                    <Text style={styles.kpiLabel}>{item.label}</Text>
                    <Text style={styles.kpiValue}>{item.value}</Text>
                  </View>
                  <Feather name={item.icon} size={18} color={item.tint} />
                </View>
              ))}
            </View>

            {message ? <Text style={styles.successText}>{message}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No medical records found.</Text>}
        renderItem={({ item }) => {
          const progressTone = stageTone(item.workflowStage);
          const status = statusLabel(item.workflowStage);

          return (
            <View style={styles.recordCard}>
              <View style={styles.recordTopRow}>
                <Text style={styles.petName}>{item.petName}</Text>
                <Text style={styles.recordId}>#{item._id.slice(-8).toUpperCase()}</Text>
              </View>

              <Text style={styles.ownerName}>{item.ownerName}</Text>
              <Text style={styles.ownerEmail}>{item.ownerEmail || "No email"}</Text>

              <Text style={styles.recordType}>{item.recordType || "checkup"}</Text>
              <Text style={styles.summaryText} numberOfLines={2}>{item.diagnosis || item.condition || "No diagnosis summary"}</Text>

              <View style={styles.bottomRow}>
                <Text style={styles.metaText}>{formatDate(item.visitDate)}</Text>
                <Text style={styles.metaText}>{item.assignedStaffName}</Text>
              </View>

              <View style={styles.badgeRow}>
                <View style={[styles.progressBadge, { backgroundColor: progressTone.bg, borderColor: progressTone.border }]}> 
                  <Text style={[styles.progressBadgeText, { color: progressTone.text }]}>{stageLabel(item.workflowStage)}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{status}</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Pressable style={styles.iconBtn} onPress={() => onOpenDetail(item._id)}>
                  <Feather name="eye" size={15} color="#6F8198" />
                </Pressable>
                <Pressable
                  style={[styles.nextStageBtn, (!nextStage(item.workflowStage) || actionLoadingId === item._id) && styles.disabled]}
                  onPress={() => onAdvanceStage(item)}
                  disabled={!nextStage(item.workflowStage) || actionLoadingId === item._id}
                >
                  {actionLoadingId === item._id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.nextStageBtnText}>{nextStage(item.workflowStage) ? "Next Stage" : "Done"}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setDetailVisible(false)} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Medical Record Detail</Text>
                <Text style={styles.modalSub}>Full API detail for selected record</Text>
              </View>
              <Pressable style={styles.modalCloseBtn} onPress={() => setDetailVisible(false)}>
                <Feather name="x" size={15} color="#6D8198" />
              </Pressable>
            </View>

            {detailLoading ? (
              <View style={styles.modalLoadingBox}>
                <ActivityIndicator size="small" color="#D77D46" />
              </View>
            ) : detailRecord ? (
              <ScrollView contentContainerStyle={styles.modalBody}>
                <Text style={styles.modalLine}><Text style={styles.modalKey}>ID:</Text> {detailRecord._id}</Text>
                <Text style={styles.modalLine}><Text style={styles.modalKey}>Pet:</Text> {detailRecord.petName}</Text>
                <Text style={styles.modalLine}><Text style={styles.modalKey}>Owner:</Text> {detailRecord.ownerName}</Text>
                <Text style={styles.modalLine}><Text style={styles.modalKey}>Type:</Text> {detailRecord.recordType || "checkup"}</Text>
                <Text style={styles.modalLine}><Text style={styles.modalKey}>Condition:</Text> {detailRecord.condition || "-"}</Text>
                <Text style={styles.modalLine}><Text style={styles.modalKey}>Diagnosis:</Text> {detailRecord.diagnosis || "-"}</Text>
                <Text style={styles.modalLine}><Text style={styles.modalKey}>Treatment:</Text> {detailRecord.treatment || "-"}</Text>
                <Text style={styles.modalLine}><Text style={styles.modalKey}>Notes:</Text> {detailRecord.notes || "-"}</Text>
                <Text style={styles.modalLine}><Text style={styles.modalKey}>Visit Date:</Text> {formatDate(detailRecord.visitDate)}</Text>
                <Text style={styles.modalLine}><Text style={styles.modalKey}>Follow Up:</Text> {formatDate(detailRecord.followUpDate)}</Text>
                <Text style={styles.modalLine}><Text style={styles.modalKey}>Workflow:</Text> {normalizeStage(detailRecord.workflowStage)}</Text>
              </ScrollView>
            ) : (
              <View style={styles.modalLoadingBox}>
                <Text style={styles.emptyText}>No detail data</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF8F2",
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FCF8F2",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 20,
    gap: 9,
  },
  headerBlock: {
    gap: 9,
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#D27743",
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 2,
    color: "#7B889A",
    fontSize: 13,
    lineHeight: 18,
  },
  refreshBtn: {
    minHeight: 36,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E7DCCF",
    backgroundColor: "#FFFCF7",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  refreshBtnText: {
    color: "#6D8198",
    fontSize: 12,
    fontWeight: "700",
  },
  searchWrap: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7DBCD",
    backgroundColor: "#FFFAF4",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: "#2D4157",
    fontSize: 14,
    paddingVertical: 0,
  },
  filterRow: {
    gap: 7,
    paddingRight: 14,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8DCCD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: "#E5C6AA",
    backgroundColor: "#FFF1E3",
  },
  chipText: {
    color: "#6E7F95",
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#C06A37",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kpiCard: {
    width: "48.7%",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E8DED2",
    backgroundColor: "#FFFEFB",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    color: "#6F8094",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  kpiValue: {
    marginTop: 2,
    color: "#2A3F57",
    fontSize: 20,
    fontWeight: "900",
  },
  successText: {
    color: "#1F7A46",
    fontSize: 12,
    fontWeight: "700",
  },
  errorText: {
    color: "#B14856",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    color: "#6F8297",
    textAlign: "center",
    marginTop: 16,
  },
  recordCard: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E8DFD3",
    backgroundColor: "#FFFEFC",
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 4,
  },
  recordTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  petName: {
    color: "#24374F",
    fontSize: 16,
    fontWeight: "800",
  },
  recordId: {
    color: "#92A0B1",
    fontSize: 11,
    fontWeight: "700",
  },
  ownerName: {
    color: "#2D425A",
    fontSize: 14,
    fontWeight: "700",
  },
  ownerEmail: {
    color: "#7D8E9F",
    fontSize: 12,
  },
  recordType: {
    marginTop: 2,
    color: "#B6693A",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  summaryText: {
    color: "#52657B",
    fontSize: 13,
    lineHeight: 18,
  },
  bottomRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  metaText: {
    color: "#8D9CAF",
    fontSize: 11,
    flex: 1,
  },
  badgeRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  progressBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  progressBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CFE1D5",
    backgroundColor: "#ECF8EF",
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusBadgeText: {
    color: "#2A7E48",
    fontSize: 11,
    fontWeight: "800",
  },
  actionsRow: {
    marginTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E7DCCE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  nextStageBtn: {
    minHeight: 32,
    borderRadius: 10,
    backgroundColor: "#D77D46",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  nextStageBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.65,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 31, 49, 0.3)",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DACA",
    backgroundColor: "#FFFDFA",
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE3D6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: "#2C435D",
    fontSize: 16,
    fontWeight: "900",
  },
  modalSub: {
    marginTop: 2,
    color: "#74859C",
    fontSize: 12,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#F6EFE5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalLoadingBox: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  modalLine: {
    color: "#51657C",
    fontSize: 13,
    lineHeight: 19,
  },
  modalKey: {
    color: "#2D425A",
    fontWeight: "800",
  },
});
