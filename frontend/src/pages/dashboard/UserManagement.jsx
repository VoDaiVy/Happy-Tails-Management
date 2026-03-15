import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useScrollLock from '../../hooks/useScrollLock';
import {
  Users,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Calendar,
  MoreVertical,
  Ban,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Activity,
  Filter,
  X,
  Trash2,
} from "lucide-react";
import AdminFilterBar from "../../components/dashboard/AdminFilterBar";
import { getUsersList, blockUser, unblockUser, updateUserRole, permanentDeleteUser } from "../../api/userApi";

// Role configuration
const ROLE_CONFIG = {
  admin: {
    label: "Admin",
    color: "bg-purple-100 text-purple-700",
    icon: Shield,
  },
  staff: {
    label: "Staff",
    color: "bg-blue-100 text-blue-700",
    icon: UserCheck,
  },
  customer: {
    label: "Customer",
    color: "bg-green-100 text-green-700",
    icon: Users,
  },
};

// Filter tabs
const FILTER_TABS = [
  { key: "all", label: "All", icon: Users },
  { key: "active", label: "Active", icon: UserCheck },
  { key: "blocked", label: "Blocked", icon: Ban },
];

const UserManagement = () => {
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Get current logged-in user ID to prevent self-role-change
  const currentUserId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u._id || u.id || null;
    } catch {
      return null;
    }
  })();

  // Modal states
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [blockReason, setBlockReason] = useState("");

  // Role modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useScrollLock(showBlockModal || showRoleModal || showDeleteModal);

  // Fetch users
  const fetchUsers = useCallback(async (showRefreshSpinner = false) => {
    try {
      if (showRefreshSpinner) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // Search filter
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      // Block status filter
      if (activeFilter === "active") {
        params.isBlocked = false;
      } else if (activeFilter === "blocked") {
        params.isBlocked = true;
      }

      // Role filter
      if (roleFilter) {
        params.role = roleFilter;
      }

      const response = await getUsersList(params);
      setUsers(response.data?.users || response.data || []);
      
      if (response.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
        }));
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.response?.data?.message || "Cannot load user list");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, activeFilter, roleFilter, pagination.page, pagination.limit]);

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchQuery, activeFilter, roleFilter]);

  // Handle block user
  const handleBlockUser = async () => {
    if (!selectedUser) return;

    setActionLoading(selectedUser._id);
    try {
      await blockUser(selectedUser._id, blockReason);
      fetchUsers(true);
      setShowBlockModal(false);
      setSelectedUser(null);
      setBlockReason("");
    } catch (err) {
      console.error("Error blocking user:", err);
      alert(err.response?.data?.message || "Cannot block account");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle unblock user
  const handleUnblockUser = async (user) => {
    setActionLoading(user._id);
    try {
      await unblockUser(user._id);
      fetchUsers(true);
    } catch (err) {
      console.error("Error unblocking user:", err);
      alert(err.response?.data?.message || "Cannot unblock account");
    } finally {
      setActionLoading(null);
    }
  };

  // Open block modal
  const openBlockModal = (user) => {
    setSelectedUser(user);
    setBlockReason("");
    setShowBlockModal(true);
  };

  // Open role modal
  const openRoleModal = (user) => {
    setSelectedUserForRole(user);
    setShowRoleModal(true);
  };

  // Open delete modal
  const openDeleteModal = (user) => {
    setSelectedUserForDelete(user);
    setDeleteConfirmText("");
    setShowDeleteModal(true);
  };

  // Handle permanent delete
  const handlePermanentDelete = async () => {
    if (!selectedUserForDelete) return;
    setActionLoading(selectedUserForDelete._id);
    try {
      await permanentDeleteUser(selectedUserForDelete._id);
      fetchUsers(true);
      setShowDeleteModal(false);
      setSelectedUserForDelete(null);
    } catch (err) {
      console.error("Error deleting user:", err);
      alert(err.response?.data?.message || "Cannot delete account");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle role change
  const handleRoleChange = async (newRole) => {
    if (!selectedUserForRole) return;
    if (newRole === selectedUserForRole.role) {
      setShowRoleModal(false);
      return;
    }
    setActionLoading(selectedUserForRole._id);
    try {
      await updateUserRole(selectedUserForRole._id, newRole);
      fetchUsers(true);
      setShowRoleModal(false);
      setSelectedUserForRole(null);
    } catch (err) {
      console.error("Error updating role:", err);
      alert(err.response?.data?.message || "Cannot update role");
    } finally {
      setActionLoading(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setActiveFilter("all");
    setRoleFilter("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#D97853] mb-1">
            User Management
          </h1>
          <p className="text-sm text-[#2D3436]/60">
            View and manage user accounts in the system
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw
              size={20}
              className={`text-gray-600 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Filters */}
      <AdminFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, email..."
        filters={[
          {
            label: "STATUS",
            icon: Activity,
            options: ["All", "Active", "Blocked"],
            value:
              activeFilter === "all"
                ? "All"
                : activeFilter === "active"
                  ? "Active"
                  : "Blocked",
            onChange: (opt) =>
              setActiveFilter(
                opt === "All"
                  ? "all"
                  : opt === "Active"
                    ? "active"
                    : "blocked",
              ),
          },
          {
            label: "ROLE",
            icon: Shield,
            options: ["All Roles", "Customer", "Staff", "Admin"],
            value:
              roleFilter === ""
                ? "All Roles"
                : roleFilter === "customer"
                  ? "Customer"
                  : roleFilter === "staff"
                    ? "Staff"
                    : "Admin",
            onChange: (opt) =>
              setRoleFilter(
                opt === "All Roles"
                  ? ""
                  : opt === "Customer"
                    ? "customer"
                    : opt === "Staff"
                      ? "staff"
                      : "admin",
              ),
          },
        ]}
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#5B8C51] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">Loading users...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <div>
              <p className="font-medium text-[#2D3436]">{error}</p>
              <button
                onClick={() => fetchUsers()}
                className="mt-2 text-sm text-[#5B8C51] hover:underline"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-[#2D3436]/40">
            <Users className="w-16 h-16 mx-auto mb-4 text-[#2D3436]/20" />
            <p className="text-lg font-bold text-[#2D3436]">No users found</p>
            <p className="text-sm font-medium text-[#2D3436] mt-1">Try adjusting your filters or search query.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.map((user, index) => {
                    const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.customer;
                    const RoleIcon = roleConfig.icon;
                    const isBlocked = user.isBlocked;

                    return (
                      <tr
                        key={user._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* User Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#E8F3D6] flex items-center justify-center shrink-0">
                              <span className="text-[#5B8C51] font-semibold text-sm">
                                {user.name?.charAt(0)?.toUpperCase() || "U"}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[#2D3436] truncate">
                                {user.name}
                              </p>
                              <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                                <Mail size={12} />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role — click to change */}
                        <td className="px-6 py-4">
                          {user._id !== currentUserId ? (
                            <button
                              onClick={() => openRoleModal(user)}
                              disabled={actionLoading === user._id}
                              title="Click to change role"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80 hover:shadow-sm disabled:opacity-50 cursor-pointer ${roleConfig.color}`}
                            >
                              <RoleIcon size={12} />
                              {roleConfig.label}
                              <ChevronDown size={11} className="opacity-60" />
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleConfig.color}`}
                            >
                              <RoleIcon size={12} />
                              {roleConfig.label}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <Ban size={12} />
                              Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle size={12} />
                              Active
                            </span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(user.createdAt)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Block/Unblock — only for non-admin users */}
                            {user.role !== "admin" && (
                              <>
                                {isBlocked ? (
                                  <button
                                    onClick={() => handleUnblockUser(user)}
                                    disabled={actionLoading === user._id}
                                    className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                                  >
                                    {actionLoading === user._id ? (
                                      <RefreshCw size={14} className="animate-spin" />
                                    ) : (
                                      "Unblock"
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openBlockModal(user)}
                                    disabled={actionLoading === user._id}
                                    className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                                  >
                                    Block
                                  </button>
                                )}
                              </>
                            )}
                            {/* Permanent delete — all users except self */}
                            {user._id !== currentUserId && user.role !== "admin" && (
                              <button
                                onClick={() => openDeleteModal(user)}
                                disabled={actionLoading === user._id}
                                title="Permanently delete account"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {users.length} / {pagination.total} users
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="px-4 py-2 text-sm font-medium">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Change Role Modal */}
      <AnimatePresence>
        {showRoleModal && selectedUserForRole && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRoleModal(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-purple-600 text-white flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Shield size={20} />
                  Change User Role
                </h3>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* User info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-[#E8F3D6] flex items-center justify-center shrink-0">
                    <span className="text-[#5B8C51] font-semibold">
                      {selectedUserForRole.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#2D3436] truncate">{selectedUserForRole.name}</p>
                    <p className="text-sm text-gray-500 truncate">{selectedUserForRole.email}</p>
                  </div>
                  <span
                    className={`ml-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      ROLE_CONFIG[selectedUserForRole.role]?.color || ROLE_CONFIG.customer.color
                    }`}
                  >
                    Current: {ROLE_CONFIG[selectedUserForRole.role]?.label || "Customer"}
                  </span>
                </div>

                {/* Role options */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Select new role:</p>
                  <div className="space-y-2">
                    {[
                      { key: "customer", label: "Customer", desc: "Standard user — can book services and manage pets", color: "border-green-200 hover:bg-green-50", badge: "bg-green-100 text-green-700" },
                      { key: "staff",    label: "Staff",    desc: "Staff member — can manage bookings and medical records", color: "border-blue-200 hover:bg-blue-50", badge: "bg-blue-100 text-blue-700" },
                      { key: "admin",    label: "Admin",    desc: "Administrator — full access to all system features", color: "border-purple-200 hover:bg-purple-50", badge: "bg-purple-100 text-purple-700" },
                    ].map(({ key, label, desc, color, badge }) => (
                      <button
                        key={key}
                        onClick={() => handleRoleChange(key)}
                        disabled={actionLoading === selectedUserForRole._id || key === selectedUserForRole.role}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          key === selectedUserForRole.role
                            ? "border-gray-200 bg-gray-50 cursor-default"
                            : color
                        }`}
                      >
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}>
                          {label}
                        </span>
                        <span className="text-sm text-gray-600">{desc}</span>
                        {key === selectedUserForRole.role && (
                          <CheckCircle size={16} className="ml-auto shrink-0 text-gray-400" />
                        )}
                        {actionLoading === selectedUserForRole._id && key !== selectedUserForRole.role && (
                          <RefreshCw size={14} className="ml-auto shrink-0 animate-spin text-gray-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowRoleModal(false)}
                  className="w-full py-2.5 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Permanent Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedUserForDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="fixed inset-0 bg-black/60 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Trash2 size={20} />
                  Permanently Delete Account
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Warning */}
                <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <p className="font-semibold mb-1">This action cannot be undone!</p>
                    <p>The account and all associated data will be permanently removed from the system.</p>
                  </div>
                </div>

                {/* User info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <span className="text-red-600 font-semibold">
                      {selectedUserForDelete.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#2D3436] truncate">{selectedUserForDelete.name}</p>
                    <p className="text-sm text-gray-500 truncate">{selectedUserForDelete.email}</p>
                  </div>
                  <span className={`ml-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_CONFIG[selectedUserForDelete.role]?.color || ROLE_CONFIG.customer.color}`}>
                    {ROLE_CONFIG[selectedUserForDelete.role]?.label || "Customer"}
                  </span>
                </div>

                {/* Confirmation input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="font-bold text-red-600">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePermanentDelete}
                    disabled={deleteConfirmText !== "DELETE" || actionLoading === selectedUserForDelete._id}
                    className="flex-1 py-2 px-3 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    {actionLoading === selectedUserForDelete._id ? (
                      <><RefreshCw size={13} className="animate-spin" /> Deleting...</>
                    ) : (
                      <><Trash2 size={13} /> Delete Permanently</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Block User Modal */}
      <AnimatePresence>
        {showBlockModal && selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBlockModal(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="px-6 py-4 bg-red-500 text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Ban size={20} />
                  Block Account
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-[#E8F3D6] flex items-center justify-center">
                    <span className="text-[#5B8C51] font-semibold">
                      {selectedUser.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-[#2D3436]">{selectedUser.name}</p>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Block reason (optional)
                  </label>
                  <textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Enter reason for blocking account..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowBlockModal(false)}
                    className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBlockUser}
                    disabled={actionLoading === selectedUser._id}
                    className="flex-1 py-2.5 px-4 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === selectedUser._id ? "Processing..." : "Block Account"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UserManagement;
