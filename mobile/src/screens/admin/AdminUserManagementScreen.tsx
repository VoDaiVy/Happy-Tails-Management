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
import {
  blockAdminUser,
  deleteAdminUser,
  getAdminUsers,
  quickRegisterUser,
  unblockAdminUser,
  updateAdminUserRole,
} from "../../api/modules/adminUserApi";
import type { AdminUser } from "../../types/admin";

const ROLE_FILTERS = ["all", "customer", "staff", "admin"] as const;

export function AdminUserManagementScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminUsers({
        search: searchValue.trim() || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        limit: 50,
        page: 1,
      });
      setUsers(response.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Khong tai duoc danh sach user");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchValue]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const withBusy = useCallback(
    async (userId: string, action: () => Promise<void>) => {
      setBusyUserId(userId);
      setError("");
      setMessage("");
      try {
        await action();
        await loadUsers();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Thao tac that bai");
      } finally {
        setBusyUserId(null);
      }
    },
    [loadUsers],
  );

  const handleCreate = useCallback(async () => {
    if (!newFullName.trim() || !newPhone.trim()) {
      setError("Vui long nhap full name va phone");
      return;
    }

    setCreating(true);
    setError("");
    setMessage("");
    try {
      const response = await quickRegisterUser({
        fullName: newFullName.trim(),
        phone: newPhone.trim(),
      });
      setMessage(response.message || "Tao user thanh cong");
      setCreateModalOpen(false);
      setNewFullName("");
      setNewPhone("");
      await loadUsers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Khong tao duoc user");
    } finally {
      setCreating(false);
    }
  }, [loadUsers, newFullName, newPhone]);

  const listHeader = useMemo(() => `Tong so ${users.length} user`, [users.length]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Management</Text>
      <Text style={styles.subtitle}>{listHeader}</Text>

      <View style={styles.searchRow}>
        <TextInput
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Tim user theo ten/email"
          style={styles.searchInput}
        />
        <Pressable style={styles.searchButton} onPress={loadUsers}>
          <Text style={styles.searchButtonText}>Loc</Text>
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={[...ROLE_FILTERS]}
        keyExtractor={(item: (typeof ROLE_FILTERS)[number]) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }: { item: (typeof ROLE_FILTERS)[number] }) => {
          const active = item === roleFilter;
          return (
            <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setRoleFilter(item)}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item}</Text>
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.createButton} onPress={() => setCreateModalOpen(true)}>
        <Text style={styles.createButtonText}>+ Tao khach walk-in</Text>
      </Pressable>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item: AdminUser) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co user nao.</Text>}
          renderItem={({ item }: { item: AdminUser }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.roleBadge}>{item.role}</Text>
              </View>
              <Text style={styles.metaText}>{item.email}</Text>
              <Text style={styles.metaText}>Blocked: {item.isBlocked ? "Yes" : "No"}</Text>

              <View style={styles.actionWrap}>
                {(() => {
                  const isAdminAccount = item.role === "admin";
                  return (
                    <>
                <Pressable
                  style={[styles.actionButton, (busyUserId === item._id || isAdminAccount) && styles.disabled]}
                  disabled={busyUserId === item._id || isAdminAccount}
                  onPress={() =>
                    withBusy(item._id, async () => {
                      const nextRole = item.role === "customer" ? "staff" : "customer";
                      const response = await updateAdminUserRole(item._id, nextRole);
                      setMessage(response.message || "Da cap nhat role");
                    })
                  }
                >
                  <Text style={styles.actionButtonText}>Doi role</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionButton, (busyUserId === item._id || isAdminAccount) && styles.disabled]}
                  disabled={busyUserId === item._id || isAdminAccount}
                  onPress={() =>
                    withBusy(item._id, async () => {
                      if (item.isBlocked) {
                        const response = await unblockAdminUser(item._id);
                        setMessage(response.message || "Da mo khoa user");
                      } else {
                        const response = await blockAdminUser(item._id);
                        setMessage(response.message || "Da khoa user");
                      }
                    })
                  }
                >
                  <Text style={styles.actionButtonText}>{item.isBlocked ? "Mo khoa" : "Khoa"}</Text>
                </Pressable>

                <Pressable
                  style={[styles.deleteButton, (busyUserId === item._id || isAdminAccount) && styles.disabled]}
                  disabled={busyUserId === item._id || isAdminAccount}
                  onPress={() =>
                    withBusy(item._id, async () => {
                      const response = await deleteAdminUser(item._id);
                      setMessage(response.message || "Da xoa user");
                    })
                  }
                >
                  <Text style={styles.deleteButtonText}>Xoa</Text>
                </Pressable>
                    </>
                  );
                })()}
              </View>
            </View>
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.successText}>{message}</Text> : null}

      <Modal visible={createModalOpen} transparent animationType="fade" onRequestClose={() => setCreateModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tao khach walk-in</Text>
            <TextInput
              value={newFullName}
              onChangeText={setNewFullName}
              placeholder="Full name"
              style={styles.modalInput}
            />
            <TextInput
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="Phone"
              style={styles.modalInput}
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelButton} onPress={() => setCreateModalOpen(false)}>
                <Text style={styles.modalCancelText}>Huy</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSaveButton, creating && styles.disabled]}
                onPress={handleCreate}
                disabled={creating}
              >
                <Text style={styles.modalSaveText}>{creating ? "Dang tao..." : "Tao"}</Text>
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
  subtitle: { paddingHorizontal: 16, marginTop: 2, color: "#64748B", fontSize: 13 },
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
  searchButton: {
    borderRadius: 10,
    backgroundColor: "#1D4ED8",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  searchButtonText: { color: "#FFFFFF", fontWeight: "700" },
  chipRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { backgroundColor: "#E2E8F0", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: "#0F766E" },
  filterChipText: { color: "#334155", fontWeight: "600" },
  filterChipTextActive: { color: "#FFFFFF" },
  createButton: {
    marginHorizontal: 16,
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
  userName: { color: "#0F172A", fontWeight: "700", maxWidth: "70%" },
  roleBadge: {
    backgroundColor: "#FFF7ED",
    color: "#C2410C",
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaText: { color: "#475569", fontSize: 13 },
  actionWrap: { marginTop: 8, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: { color: "#0F172A", fontWeight: "700", fontSize: 12 },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: { color: "#B91C1C", fontWeight: "700", fontSize: 12 },
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
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
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
