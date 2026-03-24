import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { blockAdminUser, getAdminUsers, unblockAdminUser, updateAdminUserRole } from "../../api/modules/adminUserApi";
import type { AdminUser } from "../../types/admin";

type RoleFilter = "all" | "admin" | "staff" | "customer";
type StatusFilter = "all" | "active" | "inactive";

const ROLE_FILTERS: RoleFilter[] = ["all", "admin", "staff", "customer"];
const STATUS_FILTERS: StatusFilter[] = ["all", "active", "inactive"];
const ROLE_OPTIONS: AdminUser["role"][] = ["customer", "staff", "admin"];

function getRoleChipStyle(role: AdminUser["role"]) {
  if (role === "admin") {
    return { bg: "#F2E9FF", text: "#7D44C7" };
  }
  if (role === "staff") {
    return { bg: "#EAF2FF", text: "#2E67C3" };
  }
  return { bg: "#E7F5E8", text: "#2F7C41" };
}

export function AdminUserManagementScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [openFilterMenu, setOpenFilterMenu] = useState<"status" | "role" | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [roleUpdating, setRoleUpdating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setMessage("");

    try {
      const response = await getAdminUsers({
        search: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        isBlocked: statusFilter === "all" ? undefined : statusFilter === "inactive",
        limit: 100,
        page: 1,
      });
      setUsers(response.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roleFilter, search, statusFilter]);

  const onToggleBlock = useCallback(
    async (userItem: AdminUser) => {
      if (userItem.role === "admin") {
        setError("Cannot block admin account.");
        return;
      }

      setBusyUserId(userItem._id);
      setError("");
      setMessage("");

      try {
        if (userItem.isBlocked) {
          await unblockAdminUser(userItem._id);
          setMessage(`Unblocked ${userItem.name}`);
        } else {
          await blockAdminUser(userItem._id, "Blocked from admin mobile");
          setMessage(`Blocked ${userItem.name}`);
        }

        await loadUsers();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to update block status");
      } finally {
        setBusyUserId(null);
      }
    },
    [loadUsers],
  );

  const openRoleModal = useCallback((userItem: AdminUser) => {
    setSelectedUser(userItem);
    setRoleModalVisible(true);
  }, []);

  const closeRoleModal = useCallback(() => {
    if (roleUpdating) return;
    setRoleModalVisible(false);
    setSelectedUser(null);
  }, [roleUpdating]);

  const onSelectRole = useCallback(
    async (nextRole: AdminUser["role"]) => {
      if (!selectedUser || roleUpdating) return;
      if (nextRole === selectedUser.role) {
        closeRoleModal();
        return;
      }

      setRoleUpdating(true);
      setError("");
      setMessage("");

      try {
        await updateAdminUserRole(selectedUser._id, nextRole);
        setMessage(`Updated ${selectedUser.name} to ${nextRole}`);
        closeRoleModal();
        await loadUsers();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to update user role");
      } finally {
        setRoleUpdating(false);
      }
    },
    [closeRoleModal, loadUsers, roleUpdating, selectedUser],
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => {
    let staff = 0;
    let customer = 0;
    let admin = 0;

    users.forEach((user) => {
      if (user.role === "admin") admin += 1;
      if (user.role === "staff") staff += 1;
      if (user.role === "customer") customer += 1;
    });

    return { total: users.length, admin, staff, customer };
  }, [users]);

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
      data={users}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadUsers(true)} tintColor="#D6824B" />}
      onScrollBeginDrag={() => setOpenFilterMenu(null)}
      ListHeaderComponent={
        <View style={[styles.headerWrap, openFilterMenu ? styles.headerWrapExpanded : null]}>
          <Text style={styles.title}>User Management</Text>
          <Text style={styles.subtitle}>Live data from /admin/users/list</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}

          <View style={styles.statsRow}>
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Admin" value={stats.admin} />
            <StatCard label="Staff" value={stats.staff} />
            <StatCard label="Customer" value={stats.customer} />
          </View>

          <View style={styles.searchFilterRow}>
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search by name or email"
              placeholderTextColor="#9AA8B6"
              style={styles.searchInput}
            />

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
                onPress={() => setOpenFilterMenu((prev) => (prev === "role" ? null : "role"))}
              >
                <Text style={styles.dropdownLabel}>Role</Text>
                <Text style={styles.dropdownValue}>{roleFilter === "all" ? "All Roles" : roleFilter[0].toUpperCase() + roleFilter.slice(1)}</Text>
              </Pressable>

              {openFilterMenu === "role" ? (
                <View style={styles.dropdownMenu}>
                  {ROLE_FILTERS.map((role) => {
                    const active = roleFilter === role;
                    return (
                      <Pressable
                        key={role}
                        style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                        onPress={() => {
                          setRoleFilter(role);
                          setOpenFilterMenu(null);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                          {role === "all" ? "All Roles" : role[0].toUpperCase() + role.slice(1)}
                        </Text>
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
            <Text style={styles.name}>{item.name || "Unknown"}</Text>
            <Pressable
              style={[styles.roleBadgePressable, { backgroundColor: getRoleChipStyle(item.role).bg }]}
              onPress={() => openRoleModal(item)}
            >
              <Text style={[styles.roleBadge, { color: getRoleChipStyle(item.role).text }]}>{item.role}</Text>
              <Text style={[styles.roleChevron, { color: getRoleChipStyle(item.role).text }]}>v</Text>
            </Pressable>
          </View>
          <Text style={styles.meta}>{item.email}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.meta}>Status:</Text>
            <View style={[styles.statusBadge, item.isBlocked ? styles.statusInactive : styles.statusActive]}>
              <Text style={[styles.statusBadgeText, item.isBlocked ? styles.statusInactiveText : styles.statusActiveText]}>
                {item.isBlocked ? "Inactive" : "Active"}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.blockButton,
                item.isBlocked ? styles.unblockButton : styles.blockActionButton,
                (busyUserId === item._id || item.role === "admin") && styles.disabledButton,
              ]}
              disabled={busyUserId === item._id || item.role === "admin"}
              onPress={() => onToggleBlock(item)}
            >
              <Text style={[styles.blockButtonText, item.isBlocked ? styles.unblockButtonText : styles.blockActionButtonText]}>
                {busyUserId === item._id ? "Processing..." : item.isBlocked ? "Unblock" : "Block"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
      ListFooterComponent={
        <Modal visible={roleModalVisible} transparent animationType="fade" onRequestClose={closeRoleModal}>
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeRoleModal} />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change User Role</Text>
                <Pressable onPress={closeRoleModal} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>x</Text>
                </Pressable>
              </View>

              <View style={styles.modalUserBox}>
                <Text style={styles.modalUserName}>{selectedUser?.name || "Unknown"}</Text>
                <Text style={styles.modalUserEmail}>{selectedUser?.email || ""}</Text>
                <Text style={styles.modalCurrentRole}>Current: {selectedUser?.role || "-"}</Text>
              </View>

              <Text style={styles.modalSectionLabel}>Select new role:</Text>
              <View style={styles.modalRoleList}>
                {ROLE_OPTIONS.map((role) => {
                  const active = selectedUser?.role === role;
                  const roleStyle = getRoleChipStyle(role);
                  return (
                    <Pressable
                      key={role}
                      style={[styles.modalRoleItem, active && styles.modalRoleItemActive]}
                      disabled={roleUpdating}
                      onPress={() => onSelectRole(role)}
                    >
                      <Text style={[styles.modalRolePill, { backgroundColor: roleStyle.bg, color: roleStyle.text }]}>{role}</Text>
                      <Text style={styles.modalRoleDesc}>
                        {role === "customer" ? "Can book service and manage pets" : role === "staff" ? "Can process booking and staff operations" : "Full system access"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {roleUpdating ? <ActivityIndicator color="#D6824B" style={{ marginTop: 8 }} /> : null}

              <Pressable style={styles.modalCancelBtn} onPress={closeRoleModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      }
    />
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FCF8F2" },
  content: { padding: 16, paddingBottom: 24, gap: 10 },
  headerWrap: { gap: 10, marginBottom: 8 },
  headerWrapExpanded: { paddingBottom: 120 },
  title: { color: "#D27743", fontSize: 30, lineHeight: 35, fontWeight: "900" },
  subtitle: { color: "#7B889A", fontSize: 14, lineHeight: 18 },
  errorText: { color: "#BE3A4A", fontSize: 13 },
  successText: { color: "#2F7C41", fontSize: 13, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statCard: {
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EADFD2",
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 72,
  },
  statValue: { color: "#A95A2F", fontWeight: "800", fontSize: 15 },
  statLabel: { color: "#6B7D90", fontSize: 11, fontWeight: "600" },
  searchInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7DBCD",
    backgroundColor: "#FFFAF4",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#22364B",
  },
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    zIndex: 20,
  },
  dropdownWrap: {
    width: 112,
    position: "relative",
    zIndex: 30,
  },
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
    zIndex: 40,
    elevation: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  dropdownItemActive: {
    backgroundColor: "#FFF2E8",
  },
  dropdownItemText: {
    color: "#4D6074",
    fontSize: 12,
    fontWeight: "600",
  },
  dropdownItemTextActive: {
    color: "#C8693A",
    fontWeight: "700",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EADFD2",
    backgroundColor: "#FFFFFF",
    padding: 13,
    gap: 6,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: "#22364B", fontSize: 15, fontWeight: "700", flex: 1 },
  roleBadgePressable: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: "700",
  },
  roleChevron: {
    fontSize: 10,
    fontWeight: "800",
  },
  meta: { color: "#64788C", fontSize: 12 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusActive: {
    backgroundColor: "#E7F5E8",
  },
  statusInactive: {
    backgroundColor: "#FDECEF",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusActiveText: {
    color: "#2F7C41",
  },
  statusInactiveText: {
    color: "#B24251",
  },
  actionRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  blockButton: {
    minWidth: 90,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  blockActionButton: {
    backgroundColor: "#FDECEF",
    borderWidth: 1,
    borderColor: "#F4C9D1",
  },
  unblockButton: {
    backgroundColor: "#EAF7EE",
    borderWidth: 1,
    borderColor: "#C8E8D2",
  },
  blockButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  blockActionButtonText: {
    color: "#B24A5B",
  },
  unblockButtonText: {
    color: "#2F7C41",
  },
  disabledButton: {
    backgroundColor: "#E5E8EE",
    borderColor: "#D7DDE7",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    backgroundColor: "#D27743",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  modalCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  modalUserBox: {
    margin: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8EF",
    backgroundColor: "#F8F8FC",
    padding: 10,
    gap: 2,
  },
  modalUserName: {
    color: "#22364B",
    fontSize: 14,
    fontWeight: "700",
  },
  modalUserEmail: {
    color: "#6A7B8E",
    fontSize: 12,
  },
  modalCurrentRole: {
    color: "#2F7C41",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  modalSectionLabel: {
    color: "#44586F",
    fontSize: 13,
    fontWeight: "700",
    marginHorizontal: 14,
    marginBottom: 6,
  },
  modalRoleList: {
    gap: 8,
    paddingHorizontal: 14,
  },
  modalRoleItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECD9CB",
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 6,
  },
  modalRoleItemActive: {
    borderColor: "#D27743",
    backgroundColor: "#FFF4EC",
  },
  modalRolePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  modalRoleDesc: {
    color: "#64788C",
    fontSize: 12,
    lineHeight: 17,
  },
  modalCancelBtn: {
    margin: 14,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E5EC",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  modalCancelText: {
    color: "#5D7084",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: { color: "#6D7D8E", textAlign: "center", paddingVertical: 18 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FCF8F2" },
});
