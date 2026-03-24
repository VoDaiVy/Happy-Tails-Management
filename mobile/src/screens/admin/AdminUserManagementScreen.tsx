import { useCallback, useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
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
    return { bg: "#FCE7DB", text: "#9E4A1D" };
  }
  if (role === "staff") {
    return { bg: "#F7EFE6", text: "#8A5730" };
  }
  return { bg: "#F4F0EA", text: "#6F5E4E" };
}

function getRoleLabel(role: RoleFilter) {
  if (role === "all") return "All";
  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";
  return "Customer";
}

function getUserInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export function AdminUserManagementScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [openFilterMenu, setOpenFilterMenu] = useState<"role" | "status" | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadUsers = useCallback(
    async (options?: { isRefresh?: boolean; nextPage?: number }) => {
      const isRefresh = Boolean(options?.isRefresh);
      const nextPage = options?.nextPage || 1;

      if (isRefresh) {
        setRefreshing(true);
      } else if (!loading) {
        setPaging(true);
      } else {
        setLoading(true);
      }

      setOpenFilterMenu(null);
      setError("");
      setMessage("");

      try {
        const response = await getAdminUsers({
          search: search || undefined,
          role: roleFilter === "all" ? undefined : roleFilter,
          isBlocked: statusFilter === "all" ? undefined : statusFilter === "inactive",
          limit: 7,
          page: nextPage,
        });

        setUsers(response.data || []);

        const pagination = response.pagination;
        setPage(pagination?.page || nextPage);
        setTotalPages(Math.max(1, Number(pagination?.totalPages || 1)));
        setHasNextPage(Boolean(pagination?.hasNextPage));
        setTotalUsers(typeof pagination?.total === "number" ? pagination.total : null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load users");
      } finally {
        setLoading(false);
        setPaging(false);
        setRefreshing(false);
      }
    },
    [loading, roleFilter, search, statusFilter],
  );

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

        await loadUsers({ nextPage: page });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to update block status");
      } finally {
        setBusyUserId(null);
        setConfirmUser(null);
      }
    },
    [loadUsers, page],
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
        await loadUsers({ nextPage: page });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to update user role");
      } finally {
        setRoleUpdating(false);
      }
    },
    [closeRoleModal, loadUsers, page, roleUpdating, selectedUser],
  );

  useEffect(() => {
    loadUsers({ nextPage: 1 });
  }, [loadUsers]);

  const summaryText = useMemo(() => {
    if (totalUsers === null) return `${users.length} users`;
    return `${totalUsers} users`;
  }, [totalUsers, users.length]);

  const statusLabel = statusFilter === "all" ? "All statuses" : statusFilter === "active" ? "Active" : "Inactive";

  const onRetry = useCallback(() => {
    loadUsers({ nextPage: 1 });
  }, [loadUsers]);

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
      loadUsers({ nextPage });
    },
    [loadUsers, page, paging, totalPages],
  );

  const openConfirmToggle = useCallback((userItem: AdminUser) => {
    if (userItem.role === "admin") {
      setError("Cannot block admin account.");
      return;
    }
    setConfirmUser(userItem);
  }, []);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D6824B" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={users}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadUsers({ isRefresh: true, nextPage: 1 })} tintColor="#D6824B" />}
        onScrollBeginDrag={() => setOpenFilterMenu(null)}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View>
              <Text style={styles.title}>User Management</Text>
              <Text style={styles.counterText}>{summaryText}</Text>
            </View>

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

            <View style={styles.searchShell}>
              <Feather name="search" size={17} color="#9F8A75" />
              <TextInput
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Search users by name, email or role..."
                placeholderTextColor="#B39E88"
                style={styles.searchInput}
              />
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterDropdownWrap}>
                <Pressable
                  style={styles.filterTrigger}
                  onPress={() => setOpenFilterMenu((prev) => (prev === "role" ? null : "role"))}
                >
                  <Text style={styles.filterLabel}>Role</Text>
                  <View style={styles.filterValueRow}>
                    <Text style={styles.filterValueText}>{getRoleLabel(roleFilter)}</Text>
                    <Feather name={openFilterMenu === "role" ? "chevron-up" : "chevron-down"} size={14} color="#9D5F3A" />
                  </View>
                </Pressable>

                {openFilterMenu === "role" ? (
                  <View style={styles.filterMenu}>
                    {ROLE_FILTERS.map((role) => {
                      const active = roleFilter === role;
                      return (
                        <Pressable
                          key={role}
                          style={[styles.filterMenuItem, active && styles.filterMenuItemActive]}
                          onPress={() => {
                            setRoleFilter(role);
                            setOpenFilterMenu(null);
                          }}
                        >
                          <Text style={[styles.filterMenuText, active && styles.filterMenuTextActive]}>{getRoleLabel(role)}</Text>
                          {active ? <Feather name="check" size={14} color="#C36B3A" /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <View style={styles.filterDropdownWrap}>
                <Pressable
                  style={styles.filterTrigger}
                  onPress={() => setOpenFilterMenu((prev) => (prev === "status" ? null : "status"))}
                >
                  <Text style={styles.filterLabel}>Status</Text>
                  <View style={styles.filterValueRow}>
                    <Text style={styles.filterValueText}>{statusLabel}</Text>
                    <Feather name={openFilterMenu === "status" ? "chevron-up" : "chevron-down"} size={14} color="#9D5F3A" />
                  </View>
                </Pressable>

                {openFilterMenu === "status" ? (
                  <View style={styles.filterMenu}>
                    {STATUS_FILTERS.map((status) => {
                      const active = statusFilter === status;
                      const label = status === "all" ? "All statuses" : status === "active" ? "Active" : "Inactive";
                      return (
                        <Pressable
                          key={status}
                          style={[styles.filterMenuItem, active && styles.filterMenuItemActive]}
                          onPress={() => {
                            setStatusFilter(status);
                            setOpenFilterMenu(null);
                          }}
                        >
                          <Text style={[styles.filterMenuText, active && styles.filterMenuTextActive]}>{label}</Text>
                          {active ? <Feather name="check" size={14} color="#C36B3A" /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const roleStyle = getRoleChipStyle(item.role);
          const isBlocked = Boolean(item.isBlocked);
          const isBusy = busyUserId === item._id;
          const canToggle = item.role !== "admin";

          return (
            <View style={[styles.userRowItem, index % 2 === 1 ? styles.userRowItemAlt : null]}>
              <View style={styles.userRowTop}>
                <View style={styles.userLeftCol}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{getUserInitials(item.name || "")}</Text>
                  </View>

                  <View style={styles.userInfoCol}>
                    <Text style={styles.name} numberOfLines={1}>{item.name || "Unknown"}</Text>
                    <Text style={styles.email} numberOfLines={1}>{item.email || "No email"}</Text>

                    <View style={styles.userMetaRow}>
                      <Pressable
                        style={[styles.roleBadgePressable, { backgroundColor: roleStyle.bg }]}
                        onPress={() => openRoleModal(item)}
                      >
                        <Text style={[styles.roleBadge, { color: roleStyle.text }]}>{item.role.toUpperCase()}</Text>
                        <Feather name="chevron-down" size={10} color={roleStyle.text} />
                      </Pressable>

                      <View style={styles.statusInlineWrap}>
                        <View style={[styles.statusDot, isBlocked ? styles.statusDotInactive : styles.statusDotActive]} />
                        <Text style={[styles.statusInlineText, isBlocked ? styles.statusInactiveText : styles.statusActiveText]}>
                          {isBlocked ? "Inactive" : "Active"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Pressable
                  style={[
                    styles.blockButton,
                    isBlocked ? styles.unblockButton : styles.blockActionButton,
                    (!canToggle || isBusy) && styles.disabledButton,
                  ]}
                  disabled={!canToggle || isBusy}
                  onPress={() => openConfirmToggle(item)}
                >
                  <Text
                    style={[
                      styles.blockButtonText,
                      isBlocked ? styles.unblockButtonText : styles.blockActionButtonText,
                      !canToggle && styles.protectedButtonText,
                    ]}
                  >
                    {!canToggle ? "Protected" : isBusy ? "Working..." : isBlocked ? "Unblock" : "Block"}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.userDivider} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Feather name="users" size={18} color="#B68D6E" />
            </View>
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptyText}>Try changing search keywords or filter settings.</Text>
            <Pressable style={styles.emptyRetryButton} onPress={onRetry}>
              <Text style={styles.emptyRetryText}>Reload</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          users.length > 0 ? (
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
                      {role === "customer" ? "Can book services and manage pets" : role === "staff" ? "Can process bookings and staff tasks" : "Full system access"}
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

      <Modal visible={Boolean(confirmUser)} transparent animationType="fade" onRequestClose={() => setConfirmUser(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => (busyUserId ? null : setConfirmUser(null))} />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{confirmUser?.isBlocked ? "Unblock user?" : "Block user?"}</Text>
            <Text style={styles.confirmMessage}>
              {confirmUser?.isBlocked
                ? "Are you sure you want to unblock this user?"
                : "Are you sure you want to block this user?"}
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                style={[styles.confirmCancelBtn, Boolean(busyUserId) && styles.disabledButton]}
                disabled={Boolean(busyUserId)}
                onPress={() => setConfirmUser(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmActionBtn,
                  confirmUser?.isBlocked ? styles.confirmUnblockBtn : styles.confirmBlockBtn,
                  Boolean(busyUserId) && styles.disabledButton,
                ]}
                disabled={Boolean(busyUserId) || !confirmUser}
                onPress={() => {
                  if (!confirmUser) return;
                  onToggleBlock(confirmUser);
                }}
              >
                {busyUserId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmActionText}>{confirmUser?.isBlocked ? "Unblock" : "Block"}</Text>
                )}
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
  content: { padding: 14, paddingBottom: 26 },
  headerWrap: { gap: 10, marginBottom: 6, zIndex: 50 },
  title: { color: "#1F2E40", fontSize: 28, lineHeight: 34, fontWeight: "900" },
  subtitle: { color: "#7A6A5A", fontSize: 13, lineHeight: 18, marginTop: 2 },
  counterText: { color: "#A17D62", fontSize: 12, fontWeight: "700", marginTop: 5 },
  loadingText: { color: "#8E7865", marginTop: 10, fontSize: 13, fontWeight: "600" },
  errorBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0C9CE",
    backgroundColor: "#FFF2F4",
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    paddingVertical: 5,
  },
  retryButtonText: { color: "#A93F50", fontSize: 11, fontWeight: "800" },
  successBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7EAD8",
    backgroundColor: "#EFFAF1",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  successText: { color: "#2E7A45", fontSize: 12, fontWeight: "700" },
  searchShell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7D8C9",
    backgroundColor: "#FFFDFC",
    paddingHorizontal: 11,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  searchInput: {
    flex: 1,
    color: "#2B3440",
    fontSize: 13,
    paddingVertical: 0,
  },
  filterRow: {
    zIndex: 80,
    flexDirection: "row",
    gap: 8,
  },
  filterDropdownWrap: {
    flex: 1,
    position: "relative",
    zIndex: 100,
  },
  filterTrigger: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E8D3BF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    height: 38,
    justifyContent: "center",
  },
  filterLabel: {
    color: "#B38465",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 11,
  },
  filterValueRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  filterValueText: {
    color: "#5F4B3A",
    fontSize: 12,
    fontWeight: "700",
  },
  filterMenu: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9D8C8",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 300,
    elevation: 12,
    shadowColor: "#462F18",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
  },
  filterMenuItem: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  filterMenuItemActive: {
    backgroundColor: "#FFF1E8",
  },
  filterMenuText: {
    color: "#5D4D40",
    fontSize: 12,
    fontWeight: "700",
  },
  filterMenuTextActive: {
    color: "#C8693A",
  },
  userRowItem: {
    borderRadius: 6,
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  userRowItemAlt: {
    backgroundColor: "#FFFCF8",
  },
  userDivider: {
    height: 1,
    backgroundColor: "#EFE3D8",
    marginHorizontal: 6,
  },
  userRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  userLeftCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F3E4D5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#9C5E35",
    fontSize: 11,
    fontWeight: "900",
  },
  userInfoCol: {
    flex: 1,
    gap: 1,
  },
  name: { color: "#22364B", fontSize: 13, fontWeight: "800" },
  email: { color: "#7B6D5F", fontSize: 10 },
  userMetaRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  roleBadgePressable: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  roleBadge: {
    fontSize: 8,
    fontWeight: "800",
  },
  statusInlineWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusDotActive: {
    backgroundColor: "#2E8A47",
  },
  statusDotInactive: {
    backgroundColor: "#BE5C69",
  },
  statusInlineText: { fontSize: 10, fontWeight: "700" },
  statusActiveText: {
    color: "#2E8A47",
  },
  statusInactiveText: {
    color: "#BE5C69",
  },
  blockButton: {
    minWidth: 64,
    borderRadius: 9,
    height: 26,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  blockActionButton: {
    backgroundColor: "#FFECEE",
    borderWidth: 1,
    borderColor: "#F3C1C8",
  },
  unblockButton: {
    backgroundColor: "#ECF8EE",
    borderWidth: 1,
    borderColor: "#C9E6D1",
  },
  blockButtonText: {
    fontSize: 9,
    fontWeight: "800",
  },
  blockActionButtonText: {
    color: "#B84A5E",
  },
  unblockButtonText: {
    color: "#2D7F46",
  },
  protectedButtonText: {
    color: "#7A8696",
  },
  disabledButton: {
    backgroundColor: "#E5E8EE",
    borderColor: "#D7DDE7",
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
    marginTop: 12,
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 18,
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
    color: "#8D5B37",
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
  confirmCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7D7C8",
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 8,
  },
  confirmTitle: {
    color: "#203044",
    fontSize: 18,
    fontWeight: "900",
  },
  confirmMessage: {
    color: "#6F6257",
    fontSize: 13,
    lineHeight: 19,
  },
  confirmActions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  confirmCancelBtn: {
    minWidth: 88,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDE3ED",
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  confirmCancelText: {
    color: "#5E7084",
    fontSize: 13,
    fontWeight: "700",
  },
  confirmActionBtn: {
    minWidth: 96,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBlockBtn: {
    backgroundColor: "#C45667",
  },
  confirmUnblockBtn: {
    backgroundColor: "#2E8A47",
  },
  confirmActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FCF8F2" },
});
