import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useScrollLock from '../../hooks/useScrollLock';
import {
  Search,
  Ticket,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  Calendar,
  Percent,
  DollarSign,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Bot,
  CheckCircle,
} from "lucide-react";
import {
  getAllVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  toggleVoucherStatus,
  deleteVoucher,
  aiSuggestVoucher,
} from "../../api/voucherApi";

// Discount type labels
const DISCOUNT_TYPE_LABELS = {
  percentage: "Phần trăm",
  fixed: "Số tiền cố định",
};

// Filter tabs
const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang hoạt động" },
  { key: "inactive", label: "Ngưng hoạt động" },
  { key: "ai", label: "AI tạo" },
];

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  useScrollLock(showDetailModal || showFormModal || showDeleteModal || showAIModal);

  // Selected item
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state
  const [formMode, setFormMode] = useState("create"); // 'create' | 'edit'
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minSpend: "",
    maxDiscount: "",
    usageLimit: "",
    validFrom: "",
    validUntil: "",
  });
  const [formLoading, setFormLoading] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Fetch vouchers
  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (activeTab === "active") {
        params.isActive = "true";
      } else if (activeTab === "inactive") {
        params.isActive = "false";
      } else if (activeTab === "ai") {
        params.isAIGenerated = "true";
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await getAllVouchers(params);
      setVouchers(response.data.data.vouchers || []);
      setPagination((prev) => ({
        ...prev,
        ...response.data.data.pagination,
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách voucher");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, activeTab, searchTerm]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Reset page when filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [activeTab, searchTerm]);

  // View detail
  const handleViewDetail = async (voucher) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const response = await getVoucherById(voucher._id);
      setSelectedVoucher(response.data.data.voucher);
    } catch (err) {
      console.error("Error fetching voucher detail:", err);
      setError("Không thể tải chi tiết voucher");
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open create modal
  const handleOpenCreate = () => {
    setFormMode("create");
    setFormData({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minSpend: "",
      maxDiscount: "",
      usageLimit: "",
      validFrom: "",
      validUntil: "",
    });
    setShowFormModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (voucher) => {
    setFormMode("edit");
    setSelectedVoucher(voucher);
    setFormData({
      code: voucher.code,
      description: voucher.description,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      minSpend: voucher.minSpend || "",
      maxDiscount: voucher.maxDiscount || "",
      usageLimit: voucher.usageLimit || "",
      validFrom: voucher.validFrom ? new Date(voucher.validFrom).toISOString().split("T")[0] : "",
      validUntil: voucher.validUntil ? new Date(voucher.validUntil).toISOString().split("T")[0] : "",
    });
    setShowFormModal(true);
  };

  // Handle form input change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);

      const payload = {
        ...formData,
        discountValue: Number(formData.discountValue),
        minSpend: formData.minSpend ? Number(formData.minSpend) : 0,
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
      };

      if (formMode === "create") {
        await createVoucher(payload);
      } else {
        await updateVoucher(selectedVoucher._id, payload);
      }

      setShowFormModal(false);
      fetchVouchers();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể lưu voucher");
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle status
  const handleToggleStatus = async (voucher) => {
    try {
      await toggleVoucherStatus(voucher._id);
      fetchVouchers();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể thay đổi trạng thái");
    }
  };

  // Open delete modal
  const handleOpenDelete = (voucher) => {
    setSelectedVoucher(voucher);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    try {
      await deleteVoucher(selectedVoucher._id);
      setShowDeleteModal(false);
      fetchVouchers();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa voucher");
    }
  };

  // AI Suggest Voucher
  const handleAISuggest = async () => {
    try {
      setAiLoading(true);
      setAiResult(null);
      setShowAIModal(true);

      const response = await aiSuggestVoucher();
      setAiResult(response.data.data.voucher);
      fetchVouchers(); // Refresh list
    } catch (err) {
      setError(err.response?.data?.message || "AI không thể tạo voucher");
      setShowAIModal(false);
    } finally {
      setAiLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Check if voucher is expired
  const isExpired = (validUntil) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Ticket className="w-7 h-7 text-amber-600" />
            Quản lý Voucher
          </h1>
          <p className="text-gray-600 mt-1">Quản lý mã giảm giá và tạo voucher bằng AI</p>
        </div>

        <div className="flex gap-3">
          {/* AI Suggest Button */}
          <button
            onClick={handleAISuggest}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-200 disabled:opacity-50"
          >
            {aiLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            AI Đề xuất
          </button>

          {/* Create Button */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tạo Voucher
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã hoặc mô tả voucher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Không có voucher nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      Mã
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      Mô tả
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      Giảm giá
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      Sử dụng
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      Hiệu lực
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vouchers.map((voucher) => (
                    <motion.tr
                      key={voucher._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
                            {voucher.code}
                          </span>
                          {voucher.isAIGenerated && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                              <Bot className="w-3 h-3" />
                              AI
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-800 line-clamp-2 max-w-xs">
                          {voucher.description}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {voucher.discountType === "percentage" ? (
                            <>
                              <span className="font-bold text-green-600">{voucher.discountValue}%</span>
                              {voucher.maxDiscount && (
                                <span className="text-xs text-gray-500">
                                  (max {formatCurrency(voucher.maxDiscount)})
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="font-bold text-green-600">
                              {formatCurrency(voucher.discountValue)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-gray-700">
                          {voucher.usedCount}
                          {voucher.usageLimit ? ` / ${voucher.usageLimit}` : " / ∞"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm">
                          <p className="text-gray-600">
                            {formatDate(voucher.validFrom)} - {formatDate(voucher.validUntil)}
                          </p>
                          {isExpired(voucher.validUntil) && (
                            <span className="text-red-500 text-xs">Đã hết hạn</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(voucher)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            voucher.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {voucher.isActive ? (
                            <>
                              <ToggleRight className="w-4 h-4" />
                              Hoạt động
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4" />
                              Ngừng
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetail(voucher)}
                            className="p-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                            title="Xem"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(voucher)}
                            className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(voucher)}
                            className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Hiển thị {vouchers.length} / {pagination.total} voucher
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-4 py-2 text-gray-700">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.pages}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Ticket className="w-6 h-6 text-amber-600" />
                  Chi tiết Voucher
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                  </div>
                ) : selectedVoucher ? (
                  <div className="space-y-4">
                    {/* Code */}
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-amber-700 mb-1">Mã voucher</p>
                      <p className="font-mono font-bold text-2xl text-amber-800">
                        {selectedVoucher.code}
                      </p>
                      {selectedVoucher.isAIGenerated && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full mt-2">
                          <Bot className="w-3 h-3" />
                          Tạo bởi AI
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Mô tả</p>
                      <p className="text-gray-800">{selectedVoucher.description}</p>
                    </div>

                    {/* Discount */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-sm text-green-700 mb-1">Giảm giá</p>
                        <p className="font-bold text-xl text-green-800">
                          {selectedVoucher.discountType === "percentage"
                            ? `${selectedVoucher.discountValue}%`
                            : formatCurrency(selectedVoucher.discountValue)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Loại</p>
                        <p className="font-medium text-gray-800">
                          {DISCOUNT_TYPE_LABELS[selectedVoucher.discountType]}
                        </p>
                      </div>
                    </div>

                    {/* Conditions */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Đơn tối thiểu</p>
                        <p className="font-medium text-gray-800">
                          {formatCurrency(selectedVoucher.minSpend)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Giảm tối đa</p>
                        <p className="font-medium text-gray-800">
                          {selectedVoucher.maxDiscount
                            ? formatCurrency(selectedVoucher.maxDiscount)
                            : "Không giới hạn"}
                        </p>
                      </div>
                    </div>

                    {/* Usage */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Số lần sử dụng</p>
                      <p className="font-medium text-gray-800">
                        {selectedVoucher.usedCount} /{" "}
                        {selectedVoucher.usageLimit || "Không giới hạn"}
                      </p>
                    </div>

                    {/* Validity */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm text-blue-700 mb-1">Thời hạn</p>
                      <p className="font-medium text-blue-800">
                        {formatDate(selectedVoucher.validFrom)} -{" "}
                        {formatDate(selectedVoucher.validUntil)}
                      </p>
                      {isExpired(selectedVoucher.validUntil) && (
                        <span className="text-red-500 text-xs mt-1">Đã hết hạn</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-gray-600">Trạng thái</span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedVoucher.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {selectedVoucher.isActive ? "Hoạt động" : "Ngừng hoạt động"}
                      </span>
                    </div>

                    {/* Created By */}
                    {selectedVoucher.createdBy && (
                      <div className="text-sm text-gray-500 pt-2 border-t">
                        Tạo bởi: {selectedVoucher.createdBy.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Không tìm thấy thông tin</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowFormModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  {formMode === "create" ? "Tạo Voucher mới" : "Sửa Voucher"}
                </h2>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã voucher <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleFormChange}
                    required
                    disabled={formMode === "edit"}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent uppercase disabled:bg-gray-100"
                    placeholder="VD: HAPPYPET20"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    required
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Mô tả voucher..."
                  />
                </div>

                {/* Discount Type & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại giảm giá
                    </label>
                    <select
                      name="discountType"
                      value={formData.discountType}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="percentage">Phần trăm (%)</option>
                      <option value="fixed">Số tiền cố định (VND)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giá trị <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="discountValue"
                      value={formData.discountValue}
                      onChange={handleFormChange}
                      required
                      min="0"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                      placeholder={formData.discountType === "percentage" ? "10" : "50000"}
                    />
                  </div>
                </div>

                {/* Min Spend & Max Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đơn tối thiểu (VND)
                    </label>
                    <input
                      type="number"
                      name="minSpend"
                      value={formData.minSpend}
                      onChange={handleFormChange}
                      min="0"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giảm tối đa (VND)
                    </label>
                    <input
                      type="number"
                      name="maxDiscount"
                      value={formData.maxDiscount}
                      onChange={handleFormChange}
                      min="0"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                      placeholder="Không giới hạn"
                    />
                  </div>
                </div>

                {/* Usage Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giới hạn sử dụng
                  </label>
                  <input
                    type="number"
                    name="usageLimit"
                    value={formData.usageLimit}
                    onChange={handleFormChange}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    placeholder="Không giới hạn"
                  />
                </div>

                {/* Validity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Có hiệu lực từ
                    </label>
                    <input
                      type="date"
                      name="validFrom"
                      value={formData.validFrom}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đến ngày <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="validUntil"
                      value={formData.validUntil}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {formLoading ? "Đang lưu..." : formMode === "create" ? "Tạo" : "Cập nhật"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedVoucher && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Xóa Voucher?</h3>
                <p className="text-gray-600 mb-6">
                  Bạn có chắc muốn xóa voucher <strong>{selectedVoucher.code}</strong>? Hành động
                  này không thể hoàn tác.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Result Modal */}
      <AnimatePresence>
        {showAIModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !aiLoading && setShowAIModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {aiLoading ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">AI đang tạo voucher...</h3>
                    <p className="text-gray-600">
                      Đang phân tích dữ liệu khách hàng để tạo voucher phù hợp
                    </p>
                    <div className="mt-4">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
                    </div>
                  </div>
                ) : aiResult ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                      AI đã tạo Voucher thành công!
                    </h3>

                    <div className="bg-amber-50 rounded-xl p-4 mb-4">
                      <p className="font-mono font-bold text-2xl text-amber-800">{aiResult.code}</p>
                      <p className="text-sm text-amber-700 mt-2">{aiResult.description}</p>
                    </div>

                    <div className="text-left bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      <p>
                        <span className="text-gray-500">Giảm:</span>{" "}
                        <span className="font-medium">
                          {aiResult.discountType === "percentage"
                            ? `${aiResult.discountValue}%`
                            : formatCurrency(aiResult.discountValue)}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-500">Đơn tối thiểu:</span>{" "}
                        <span className="font-medium">{formatCurrency(aiResult.minSpend)}</span>
                      </p>
                      <p>
                        <span className="text-gray-500">Hiệu lực đến:</span>{" "}
                        <span className="font-medium">{formatDate(aiResult.validUntil)}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAIModal(false)}
                      className="w-full mt-6 py-3 px-4 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
                    >
                      Đóng
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Không có kết quả</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
