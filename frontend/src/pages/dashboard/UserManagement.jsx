import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Filter,
  X,
} from "lucide-react";
import { getUsersList, blockUser, unblockUser } from "../../api/userApi";

// Role configuration
const ROLE_CONFIG = {
  admin: {
    label: "Admin",
    color: "bg-purple-100 text-purple-700",
    icon: Shield,
  },
  staff: {
    label: "Nhân viên",
    color: "bg-blue-100 text-blue-700",
    icon: UserCheck,
  },
  customer: {
    label: "Khách hàng",
    color: "bg-green-100 text-green-700",
    icon: Users,
  },
};

// Filter tabs
const FILTER_TABS = [
  { key: "all", label: "Tất cả", icon: Users },
  { key: "active", label: "Hoạt động", icon: UserCheck },
  { key: "blocked", label: "Đã khóa", icon: Ban },
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

  // Modal states
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [blockReason, setBlockReason] = useState("");

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
      setError(err.response?.data?.message || "Không thể tải danh sách người dùng");
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
      alert(err.response?.data?.message || "Không thể khóa tài khoản");
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
      alert(err.response?.data?.message || "Không thể mở khóa tài khoản");
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
          <h1 className="text-2xl font-bold text-[#2D3436] flex items-center gap-2">
            <Users className="text-[#5B8C51]" />
            Quản lý Người dùng
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Xem và quản lý tài khoản người dùng trong hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            title="Làm mới"
          >
            <RefreshCw
              size={20}
              className={`text-gray-600 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, email..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
            />
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8C51]/20 focus:border-[#5B8C51]"
            >
              <option value="">Tất cả vai trò</option>
              <option value="customer">Khách hàng</option>
              <option value="staff">Nhân viên</option>
              <option value="admin">Admin</option>
            </select>

            {/* Clear filters */}
            {(searchQuery || activeFilter !== "all" || roleFilter) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-[#5B8C51] transition-colors flex items-center gap-1"
              >
                <X size={16} />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#5B8C51] text-white shadow-lg shadow-[#5B8C51]/25"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#5B8C51] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">Đang tải danh sách người dùng...</p>
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
                Thử lại
              </button>
            </div>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Users size={32} className="text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-[#2D3436]">
                Không tìm thấy người dùng nào
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
              </p>
            </div>
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
                      Người dùng
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => {
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
                            <div className="w-10 h-10 rounded-full bg-[#E8F3D6] flex items-center justify-center flex-shrink-0">
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

                        {/* Role */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleConfig.color}`}
                          >
                            <RoleIcon size={12} />
                            {roleConfig.label}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <Ban size={12} />
                              Đã khóa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle size={12} />
                              Hoạt động
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
                        <td className="px-6 py-4 text-right">
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
                                    "Mở khóa"
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => openBlockModal(user)}
                                  disabled={actionLoading === user._id}
                                  className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                                >
                                  Khóa
                                </button>
                              )}
                            </>
                          )}
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
                  Hiển thị {users.length} / {pagination.total} người dùng
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
                  Khóa tài khoản
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
                    Lý do khóa (tùy chọn)
                  </label>
                  <textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Nhập lý do khóa tài khoản..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowBlockModal(false)}
                    className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleBlockUser}
                    disabled={actionLoading === selectedUser._id}
                    className="flex-1 py-2.5 px-4 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === selectedUser._id ? "Đang xử lý..." : "Khóa tài khoản"}
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
