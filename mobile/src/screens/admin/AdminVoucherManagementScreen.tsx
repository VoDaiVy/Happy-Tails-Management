import { useCallback, useEffect, useState } from "react";
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
import {
  createAdminVoucher,
  deleteAdminVoucher,
  getAdminVouchers,
  toggleAdminVoucher,
  updateAdminVoucher,
} from "../../api/modules/adminVoucherApi";
import type { CreateVoucherPayload, Voucher } from "../../types/voucher";

const DEFAULT_FORM: CreateVoucherPayload = {
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: 0,
  minSpend: 0,
  maxDiscount: null,
  usageLimit: null,
  validUntil: "",
};

export function AdminVoucherManagementScreen() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [form, setForm] = useState<CreateVoucherPayload>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminVouchers({ search: searchValue.trim() || undefined, limit: 50, page: 1 });
      setVouchers(data.vouchers || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Khong tai duoc voucher");
    } finally {
      setLoading(false);
    }
  }, [searchValue]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const openCreateModal = () => {
    setEditingVoucher(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  };

  const openEditModal = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setForm({
      code: voucher.code,
      description: voucher.description,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      minSpend: voucher.minSpend || 0,
      maxDiscount: voucher.maxDiscount ?? null,
      usageLimit: voucher.usageLimit ?? null,
      validUntil: voucher.validUntil ? voucher.validUntil.slice(0, 10) : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = useCallback(async () => {
    if (!form.code.trim() || !form.description.trim() || !form.validUntil.trim()) {
      setError("Code, description va validUntil la bat buoc");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload: CreateVoucherPayload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
      };

      if (editingVoucher) {
        const response = await updateAdminVoucher(editingVoucher._id, payload);
        setMessage(response.message || "Cap nhat voucher thanh cong");
      } else {
        const response = await createAdminVoucher(payload);
        setMessage(response.message || "Tao voucher thanh cong");
      }

      setModalOpen(false);
      await loadVouchers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Luu voucher that bai");
    } finally {
      setSaving(false);
    }
  }, [editingVoucher, form, loadVouchers]);

  const withBusy = useCallback(
    async (voucherId: string, action: () => Promise<void>) => {
      setBusyId(voucherId);
      setError("");
      setMessage("");
      try {
        await action();
        await loadVouchers();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Thao tac that bai");
      } finally {
        setBusyId(null);
      }
    },
    [loadVouchers],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voucher Management</Text>

      <View style={styles.searchRow}>
        <TextInput
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Tim voucher theo code/mo ta"
          style={styles.searchInput}
        />
        <Pressable style={styles.searchButton} onPress={loadVouchers}>
          <Text style={styles.searchButtonText}>Loc</Text>
        </Pressable>
      </View>

      <Pressable style={styles.createButton} onPress={openCreateModal}>
        <Text style={styles.createButtonText}>+ Tao voucher moi</Text>
      </Pressable>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={vouchers}
          keyExtractor={(item: Voucher) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co voucher nao.</Text>}
          renderItem={({ item }: { item: Voucher }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.codeText}>{item.code}</Text>
                <Text style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  {item.isActive ? "ACTIVE" : "INACTIVE"}
                </Text>
              </View>
              <Text style={styles.metaText}>{item.description}</Text>
              <Text style={styles.metaText}>Giam: {item.discountValue} ({item.discountType})</Text>
              <Text style={styles.metaText}>HSD: {new Date(item.validUntil).toLocaleDateString()}</Text>

              <View style={styles.actionRow}>
                <Pressable style={styles.actionButton} onPress={() => openEditModal(item)}>
                  <Text style={styles.actionText}>Sua</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, busyId === item._id && styles.disabled]}
                  disabled={busyId === item._id}
                  onPress={() =>
                    withBusy(item._id, async () => {
                      const response = await toggleAdminVoucher(item._id);
                      setMessage(response.message || "Da doi trang thai voucher");
                    })
                  }
                >
                  <Text style={styles.actionText}>{item.isActive ? "Tat" : "Bat"}</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteButton, busyId === item._id && styles.disabled]}
                  disabled={busyId === item._id}
                  onPress={() =>
                    withBusy(item._id, async () => {
                      const response = await deleteAdminVoucher(item._id);
                      setMessage(response.message || "Da xoa voucher");
                    })
                  }
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
            <Text style={styles.modalTitle}>{editingVoucher ? "Cap nhat voucher" : "Tao voucher"}</Text>
            <TextInput
              value={form.code}
              onChangeText={(value: string) => setForm((prev: CreateVoucherPayload) => ({ ...prev, code: value }))}
              placeholder="Code"
              editable={!editingVoucher}
              style={styles.modalInput}
            />
            <TextInput
              value={form.description}
              onChangeText={(value: string) => setForm((prev: CreateVoucherPayload) => ({ ...prev, description: value }))}
              placeholder="Description"
              style={styles.modalInput}
            />
            <TextInput
              value={String(form.discountValue)}
              onChangeText={(value: string) => setForm((prev: CreateVoucherPayload) => ({ ...prev, discountValue: Number(value) || 0 }))}
              placeholder="Discount value"
              keyboardType="numeric"
              style={styles.modalInput}
            />
            <TextInput
              value={form.discountType}
              onChangeText={(value: string) => setForm((prev: CreateVoucherPayload) => ({ ...prev, discountType: value === "fixed" ? "fixed" : "percentage" }))}
              placeholder="discountType: percentage/fixed"
              style={styles.modalInput}
            />
            <TextInput
              value={form.validUntil}
              onChangeText={(value: string) => setForm((prev: CreateVoucherPayload) => ({ ...prev, validUntil: value }))}
              placeholder="Valid until (YYYY-MM-DD)"
              style={styles.modalInput}
            />

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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 5,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codeText: { color: "#0F172A", fontWeight: "800" },
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
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  modalCancelButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: "#E2E8F0" },
  modalCancelText: { color: "#334155", fontWeight: "700" },
  modalSaveButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: "#2563EB" },
  modalSaveText: { color: "#FFFFFF", fontWeight: "700" },
});
