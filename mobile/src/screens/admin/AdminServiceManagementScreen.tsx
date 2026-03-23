import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getCategories } from "../../api/modules/categoryApi";
import {
  createAdminService,
  deleteAdminService,
  getAdminServices,
  updateAdminService,
  type ServiceUpsertPayload,
} from "../../api/modules/adminServiceApi";
import type { Category } from "../../types/category";
import type { ServiceItem } from "../../types/service";

const DEFAULT_FORM: ServiceUpsertPayload = {
  name: "",
  category: "",
  price: 0,
  duration: 30,
  description: "",
  petTypes: ["dog", "cat"],
  group: "dry",
  maxCapacity: 1,
  isActive: true,
};

export function AdminServiceManagementScreen() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState<ServiceUpsertPayload>(DEFAULT_FORM);
  const [petTypeInput, setPetTypeInput] = useState("dog,cat");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch {
        // Non-blocking for management UI
      }
    };

    loadCategories();
  }, []);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminServices({
        search: searchValue.trim() || undefined,
        isActive: activeFilter,
        page: 1,
        limit: 50,
      });
      setServices(response.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Khong tai duoc service");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchValue]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category: Category) => {
      map.set(category._id, category.name);
    });
    return map;
  }, [categories]);

  const openCreateModal = () => {
    setEditingService(null);
    const defaultCategory = categories[0]?._id || "";
    setForm({ ...DEFAULT_FORM, category: defaultCategory });
    setPetTypeInput("dog,cat");
    setModalOpen(true);
  };

  const openEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setForm({
      name: service.name,
      category: typeof service.category === "object" ? service.category?._id || "" : String(service.category || ""),
      price: service.price,
      duration: service.duration,
      description: service.description || "",
      petTypes: service.petTypes || ["dog", "cat"],
      group: service.group === "wet" ? "wet" : "dry",
      maxCapacity: service.maxCapacity || 1,
      isActive: service.isActive ?? true,
    });
    setPetTypeInput((service.petTypes || []).join(","));
    setModalOpen(true);
  };

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim() || !form.category || !form.price || !form.duration) {
      setError("Name, category, price, duration la bat buoc");
      return;
    }

    const parsedPetTypes = petTypeInput
      .split(",")
      .map((value: string) => value.trim())
      .filter(Boolean);

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload: ServiceUpsertPayload = {
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() || "",
        petTypes: parsedPetTypes.length ? parsedPetTypes : ["dog", "cat"],
      };

      if (editingService) {
        const response = await updateAdminService(editingService._id, payload);
        setMessage(response.message || "Cap nhat service thanh cong");
      } else {
        const response = await createAdminService(payload);
        setMessage(response.message || "Tao service thanh cong");
      }

      setModalOpen(false);
      await loadServices();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Luu service that bai");
    } finally {
      setSaving(false);
    }
  }, [editingService, form, loadServices, petTypeInput]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Service Management</Text>

      <View style={styles.searchRow}>
        <TextInput
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Tim service"
          style={styles.searchInput}
        />
        <Pressable style={styles.searchButton} onPress={loadServices}>
          <Text style={styles.searchButtonText}>Loc</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {(["all", "true", "false"] as const).map((filter) => {
          const active = filter === activeFilter;
          return (
            <Pressable key={filter} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setActiveFilter(filter)}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.createButton} onPress={openCreateModal}>
        <Text style={styles.createButtonText}>+ Tao service moi</Text>
      </Pressable>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item: ServiceItem) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co service nao.</Text>}
          renderItem={({ item }: { item: ServiceItem }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  {item.isActive ? "ACTIVE" : "INACTIVE"}
                </Text>
              </View>
              <Text style={styles.metaText}>Category: {typeof item.category === "object" ? item.category?.name : item.category || "N/A"}</Text>
              <Text style={styles.metaText}>Gia: {item.price.toLocaleString()} | Duration: {item.duration} phut</Text>

              <View style={styles.actionRow}>
                <Pressable style={styles.actionButton} onPress={() => openEditModal(item)}>
                  <Text style={styles.actionText}>Sua</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteButton, busyId === item._id && styles.disabled]}
                  disabled={busyId === item._id}
                  onPress={async () => {
                    setBusyId(item._id);
                    setError("");
                    setMessage("");
                    try {
                      const response = await deleteAdminService(item._id);
                      setMessage(response.message || "Da xoa service");
                      await loadServices();
                    } catch (deleteError) {
                      setError(deleteError instanceof Error ? deleteError.message : "Khong xoa duoc service");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  <Text style={styles.deleteText}>Xoa</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.successText}>{message}</Text> : null}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingService ? "Cap nhat service" : "Tao service"}</Text>
            <TextInput value={form.name} onChangeText={(value: string) => setForm((prev: ServiceUpsertPayload) => ({ ...prev, name: value }))} placeholder="Name" style={styles.modalInput} />
            <TextInput
              value={String(form.price)}
              onChangeText={(value: string) => setForm((prev: ServiceUpsertPayload) => ({ ...prev, price: Number(value) || 0 }))}
              placeholder="Price"
              keyboardType="numeric"
              style={styles.modalInput}
            />
            <TextInput
              value={String(form.duration)}
              onChangeText={(value: string) => setForm((prev: ServiceUpsertPayload) => ({ ...prev, duration: Number(value) || 0 }))}
              placeholder="Duration (minutes)"
              keyboardType="numeric"
              style={styles.modalInput}
            />
            <TextInput
              value={form.description || ""}
              onChangeText={(value: string) => setForm((prev: ServiceUpsertPayload) => ({ ...prev, description: value }))}
              placeholder="Description"
              style={styles.modalInput}
            />
            <TextInput
              value={petTypeInput}
              onChangeText={setPetTypeInput}
              placeholder="Pet types (dog,cat,...)"
              style={styles.modalInput}
            />
            <TextInput
              value={form.group || "dry"}
              onChangeText={(value: string) => setForm((prev: ServiceUpsertPayload) => ({ ...prev, group: value === "wet" ? "wet" : "dry" }))}
              placeholder="Group wet/dry"
              style={styles.modalInput}
            />

            <View style={styles.categoryWrap}>
              <Text style={styles.categoryLabel}>Chon category:</Text>
              <View style={styles.categoryList}>
                {categories.map((category: Category) => {
                  const active = form.category === category._id;
                  return (
                    <Pressable
                      key={category._id}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                      onPress={() => setForm((prev: ServiceUpsertPayload) => ({ ...prev, category: category._id }))}
                    >
                      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{category.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelButton} onPress={() => setModalOpen(false)}>
                <Text style={styles.modalCancelText}>Huy</Text>
              </Pressable>
              <Pressable style={[styles.modalSaveButton, saving && styles.disabled]} onPress={handleSubmit} disabled={saving}>
                <Text style={styles.modalSaveText}>{saving ? "Dang luu..." : "Luu"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingTop: 12 },
  title: { paddingHorizontal: 16, fontSize: 24, fontWeight: "800", color: "#0F172A" },
  searchRow: { paddingHorizontal: 16, marginTop: 12, flexDirection: "row", gap: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },
  searchButton: { borderRadius: 10, backgroundColor: "#1D4ED8", justifyContent: "center", paddingHorizontal: 14 },
  searchButtonText: { color: "#FFFFFF", fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 10 },
  filterChip: { backgroundColor: "#E2E8F0", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: "#0F766E" },
  filterChipText: { color: "#334155", fontWeight: "600" },
  filterChipTextActive: { color: "#FFFFFF" },
  createButton: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#16A34A",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  createButtonText: { color: "#FFFFFF", fontWeight: "700" },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, gap: 10, paddingBottom: 20 },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 20 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", padding: 12, gap: 5 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { color: "#0F172A", fontWeight: "800", maxWidth: "72%" },
  statusBadge: {
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadge: { backgroundColor: "#DCFCE7", color: "#166534" },
  inactiveBadge: { backgroundColor: "#FEE2E2", color: "#B91C1C" },
  metaText: { color: "#475569", fontSize: 13 },
  actionRow: { marginTop: 8, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionButton: { backgroundColor: "#F1F5F9", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { color: "#0F172A", fontWeight: "700", fontSize: 12 },
  deleteButton: { backgroundColor: "#FEE2E2", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteText: { color: "#B91C1C", fontWeight: "700", fontSize: 12 },
  disabled: { opacity: 0.6 },
  errorText: { color: "#DC2626", paddingHorizontal: 16, paddingBottom: 6 },
  successText: { color: "#059669", paddingHorizontal: 16, paddingBottom: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },
  categoryWrap: { gap: 6 },
  categoryLabel: { color: "#334155", fontSize: 13, fontWeight: "600" },
  categoryList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { backgroundColor: "#E2E8F0", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  categoryChipActive: { backgroundColor: "#1D4ED8" },
  categoryChipText: { color: "#334155", fontSize: 12, fontWeight: "600" },
  categoryChipTextActive: { color: "#FFFFFF" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  modalCancelButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: "#E2E8F0" },
  modalCancelText: { color: "#334155", fontWeight: "700" },
  modalSaveButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: "#2563EB" },
  modalSaveText: { color: "#FFFFFF", fontWeight: "700" },
});
