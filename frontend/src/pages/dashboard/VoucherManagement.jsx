import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  CheckCircle2,
  Activity,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import AdminFilterBar from "../../components/dashboard/AdminFilterBar";
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
  percentage: "Percentage",
  fixed: "Fixed Amount",
};

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
  const [isDiscountTypeOpen, setIsDiscountTypeOpen] = useState(false);

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
      setVouchers(response.data || []);
      setPagination((prev) => ({
        ...prev,
        ...(response.pagination || {}),
      }));
    } catch (err) {
      setError(
        err.response?.data?.message || "Không thể tải danh sách voucher",
      );
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
      setSelectedVoucher(response.data);
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
      validFrom: voucher.validFrom
        ? new Date(voucher.validFrom).toISOString().split("T")[0]
        : "",
      validUntil: voucher.validUntil
        ? new Date(voucher.validUntil).toISOString().split("T")[0]
        : "",
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
      setAiResult(response.data);
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
    return new Date(dateString).toLocaleDateString("en-US", {
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
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-[1400px] mx-auto space-y-6 pb-10"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#D97853] mb-1">
            Voucher Management
          </h1>
          <p className="text-sm text-[#2D3436]/60">
            Manage discount codes and generate vouchers with AI
          </p>
        </div>
        <motion.button
          onClick={handleOpenCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 shrink-0"
        >
          <Plus size={18} /> Create Voucher
        </motion.button>
      </div>

      {/* Filters */}
      <AdminFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by voucher code or description..."
          filters={[
            {
              label: "STATUS",
              icon: Activity,
              options: ["All Types", "Active", "Inactive", "AI Generated"],
              value:
                activeTab === "all"
                  ? "All Types"
                  : activeTab === "active"
                    ? "Active"
                    : activeTab === "inactive"
                      ? "Inactive"
                      : "AI Generated",
              onChange: (opt) =>
                setActiveTab(
                  opt === "All Types"
                    ? "all"
                    : opt === "Active"
                      ? "active"
                      : opt === "Inactive"
                        ? "inactive"
                        : "ai",
                ),
            },
          ]}
          extraActions={
            <button
              onClick={handleAISuggest}
              disabled={aiLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all shadow-[0_5px_15px_rgba(139,92,246,0.3)] disabled:opacity-50 font-bold text-sm shrink-0"
            >
              {aiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              AI Suggest
            </button>
          }
        />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#2D3436]/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D97853]"></div>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-20 text-[#2D3436]/40">
            <Ticket className="w-16 h-16 mx-auto mb-4 text-[#2D3436]/20" />
            <p className="text-lg font-bold text-[#2D3436]">No vouchers found</p>
            <p className="text-sm font-medium text-[#2D3436] mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FDFBF7] border-b border-[#2D3436]/5 text-xs font-bold text-[#2D3436]">
                    <th className="px-6 py-4 whitespace-nowrap">
                      Code
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap">
                      Description
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Discount
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Usage
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Validity
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Status
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {vouchers.map((voucher, index) => (
                    <motion.tr
                      key={voucher._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-[#2D3436]/5 hover:bg-[#FDFBF7] transition-colors"
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
                              <span className="font-bold text-green-600">
                                {voucher.discountValue}%
                              </span>
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
                          {voucher.usageLimit
                            ? ` / ${voucher.usageLimit}`
                            : " / ∞"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm">
                          <p className="text-gray-600">
                            {formatDate(voucher.validFrom)} -{" "}
                            {formatDate(voucher.validUntil)}
                          </p>
                          {isExpired(voucher.validUntil) && (
                            <span className="text-red-500 text-xs">
                              Expired
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(voucher)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors shadow-sm border ${
                            voucher.isActive
                              ? "bg-[#7FB069]/10 text-[#7FB069] border-[#7FB069]/20 hover:bg-[#7FB069]/20"
                              : "bg-[#2D3436]/5 text-[#2D3436]/60 border-[#2D3436]/10 hover:bg-[#2D3436]/10"
                          }`}
                        >
                          {voucher.isActive ? (
                            <>
                              <ToggleRight className="w-4 h-4" />
                              Active
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewDetail(voucher)}
                            className="p-2 text-[#2D3436]/40 hover:text-[#D97853] hover:bg-[#D97853]/10 rounded-xl transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(voucher)}
                            className="p-2 text-[#2D3436]/40 hover:text-[#7FB069] hover:bg-[#7FB069]/10 rounded-xl transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(voucher)}
                            className="p-2 text-[#2D3436]/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="Delete"
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
                Showing {vouchers.length} of {pagination.total} vouchers
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-4 py-2 text-gray-700">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
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
                  Voucher Details
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
                      <p className="text-sm text-amber-700 mb-1">
                        Voucher Code
                      </p>
                      <p className="font-mono font-bold text-2xl text-amber-800">
                        {selectedVoucher.code}
                      </p>
                      {selectedVoucher.isAIGenerated && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full mt-2">
                          <Bot className="w-3 h-3" />
                          Generated by AI
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Description</p>
                      <p className="text-gray-800">
                        {selectedVoucher.description}
                      </p>
                    </div>

                    {/* Discount */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-sm text-green-700 mb-1">Discount</p>
                        <p className="font-bold text-xl text-green-800">
                          {selectedVoucher.discountType === "percentage"
                            ? `${selectedVoucher.discountValue}%`
                            : formatCurrency(selectedVoucher.discountValue)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Type</p>
                        <p className="font-medium text-gray-800">
                          {DISCOUNT_TYPE_LABELS[selectedVoucher.discountType]}
                        </p>
                      </div>
                    </div>

                    {/* Conditions */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Min. Spend</p>
                        <p className="font-medium text-gray-800">
                          {formatCurrency(selectedVoucher.minSpend)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">
                          Max Discount
                        </p>
                        <p className="font-medium text-gray-800">
                          {selectedVoucher.maxDiscount
                            ? formatCurrency(selectedVoucher.maxDiscount)
                            : "Unlimited"}
                        </p>
                      </div>
                    </div>

                    {/* Usage */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Usage Count</p>
                      <p className="font-medium text-gray-800">
                        {selectedVoucher.usedCount} /{" "}
                        {selectedVoucher.usageLimit || "Unlimited"}
                      </p>
                    </div>

                    {/* Validity */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm text-blue-700 mb-1">
                        Validity Period
                      </p>
                      <p className="font-medium text-blue-800">
                        {formatDate(selectedVoucher.validFrom)} -{" "}
                        {formatDate(selectedVoucher.validUntil)}
                      </p>
                      {isExpired(selectedVoucher.validUntil) && (
                        <span className="text-red-500 text-xs mt-1">
                          Expired
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-gray-600">Status</span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedVoucher.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {selectedVoucher.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Created By */}
                    {selectedVoucher.createdBy && (
                      <div className="text-sm text-gray-500 pt-2 border-t">
                        Created by: {selectedVoucher.createdBy.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Voucher not found
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFormModal(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50 transition-opacity"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[700px] h-[90vh] md:h-auto max-h-[90vh] bg-[#FDFBF7] rounded-[24px] shadow-2xl z-50 flex flex-col overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-[#2D3436]/10 bg-white sticky top-0 z-30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D97853]/10 flex items-center justify-center">
                    <Ticket size={20} className="text-[#D97853]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#2D3436] leading-tight">
                      {formMode === "create" ? "Create New Voucher" : "Edit Voucher"}
                    </h2>
                    <p className="text-xs text-[#2D3436]/50 font-medium">
                      {formMode === "create" ? "Add a new discount code for customers" : "Modify voucher details"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="w-8 h-8 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#2D3436]/10 transition-colors text-[#2D3436]/50 hover:text-[#2D3436]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmitForm} className="p-6 md:p-8 flex-1 space-y-6">
                {/* Form Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Voucher Code */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Voucher Code <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleFormChange}
                      required
                      disabled={formMode === "edit"}
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm uppercase disabled:bg-[#2D3436]/5 disabled:cursor-not-allowed"
                      placeholder="e.g. HAPPYPET20"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Description <span className="text-[#D97853]">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      required
                      rows={3}
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm resize-none"
                      placeholder="Describe the voucher promotion..."
                    />
                  </div>

                  {/* Discount Type */}
                  <div className={`relative ${isDiscountTypeOpen ? "z-[60]" : "z-10"}`}>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Discount Type
                    </label>
                    <div
                      className={`flex items-center justify-between px-4 py-3 bg-[#FDFBF7] border ${isDiscountTypeOpen ? "border-[#D97853] ring-1 ring-[#D97853]/20" : "border-[#D97853]"} rounded-2xl cursor-pointer hover:border-[#D97853] transition-all`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDiscountTypeOpen(!isDiscountTypeOpen);
                      }}
                    >
                      <span className="text-sm font-medium text-[#2D3436]">
                        {formData.discountType === "percentage" ? "Percentage (%)" : "Fixed Amount (VND)"}
                      </span>
                      <MoreVertical size={14} className="text-[#D97853]" />
                    </div>
                    <AnimatePresence>
                      {isDiscountTypeOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDiscountTypeOpen(false);
                            }}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#FDFBF7] rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#2D3436]/5 overflow-hidden z-50 py-1.5"
                          >
                            {[
                              { value: "percentage", label: "Percentage (%)" },
                              { value: "fixed", label: "Fixed Amount (VND)" },
                            ].map((opt) => {
                              const isSelected = formData.discountType === opt.value;
                              return (
                                <div
                                  key={opt.value}
                                  className={`px-4 py-2.5 text-[14px] cursor-pointer transition-colors ${!isSelected ? "text-[#2D3436]/70 hover:bg-[#2D3436]/5 font-medium" : "border-l-[3px] border-[#D97853] bg-[#D97853]/10 text-[#D97853] font-bold"}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFormChange({ target: { name: "discountType", value: opt.value } });
                                    setIsDiscountTypeOpen(false);
                                  }}
                                >
                                  {opt.label}
                                </div>
                              );
                            })}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Discount Value */}
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Discount Value <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="number"
                      name="discountValue"
                      value={formData.discountValue}
                      onChange={handleFormChange}
                      required
                      min="0"
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                      placeholder={formData.discountType === "percentage" ? "10" : "50000"}
                    />
                  </div>

                  {/* Min Spend */}
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Min. Spend (VND)
                    </label>
                    <input
                      type="number"
                      name="minSpend"
                      value={formData.minSpend}
                      onChange={handleFormChange}
                      min="0"
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                      placeholder="0"
                    />
                  </div>

                  {/* Max Discount */}
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Max Discount (VND)
                    </label>
                    <input
                      type="number"
                      name="maxDiscount"
                      value={formData.maxDiscount}
                      onChange={handleFormChange}
                      min="0"
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                      placeholder="Unlimited"
                    />
                  </div>

                  {/* Usage Limit */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Usage Limit
                    </label>
                    <input
                      type="number"
                      name="usageLimit"
                      value={formData.usageLimit}
                      onChange={handleFormChange}
                      min="0"
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                      placeholder="Leave empty for unlimited usage"
                    />
                  </div>

                  {/* Valid From */}
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Valid From
                    </label>
                    <div className="relative">
                      <DatePicker
                        selected={formData.validFrom ? new Date(formData.validFrom) : null}
                        onChange={(date) =>
                          setFormData((prev) => ({
                            ...prev,
                            validFrom: date ? date.toISOString().split("T")[0] : "",
                          }))
                        }
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select start date"
                        className="w-full px-4 py-3 pl-11 bg-white border border-[#2D3436]/10 focus:border-[#D97853] hover:border-[#D97853] rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-1 focus:ring-[#D97853] transition-all shadow-sm cursor-pointer"
                        wrapperClassName="w-full"
                      />
                      <Calendar
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D3436]/40 pointer-events-none"
                        size={18}
                      />
                    </div>
                  </div>

                  {/* Valid Until */}
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Valid Until <span className="text-[#D97853]">*</span>
                    </label>
                    <div className="relative">
                      <DatePicker
                        selected={formData.validUntil ? new Date(formData.validUntil) : null}
                        onChange={(date) =>
                          setFormData((prev) => ({
                            ...prev,
                            validUntil: date ? date.toISOString().split("T")[0] : "",
                          }))
                        }
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select end date"
                        required
                        className="w-full px-4 py-3 pl-11 bg-white border border-[#2D3436]/10 focus:border-[#D97853] hover:border-[#D97853] rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-1 focus:ring-[#D97853] transition-all shadow-sm cursor-pointer"
                        wrapperClassName="w-full"
                      />
                      <Calendar
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D3436]/40 pointer-events-none"
                        size={18}
                      />
                    </div>
                  </div>
                </div>
              </form>

              {/* Modal Footer */}
              <div className="px-6 py-4 md:px-8 border-t border-[#2D3436]/10 bg-white flex items-center justify-end gap-3 sticky bottom-0 z-30">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#2D3436]/70 hover:bg-[#2D3436]/5 hover:text-[#2D3436] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmitForm}
                  disabled={formLoading}
                  className="bg-[#D97853] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  {formLoading
                    ? "Saving..."
                    : formMode === "create"
                      ? "Create Voucher"
                      : "Update Voucher"}
                </button>
              </div>
            </motion.div>
          </>
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
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Delete Voucher?
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete voucher{" "}
                  <strong>{selectedVoucher.code}</strong>? This action cannot be
                  undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                  >
                    Delete
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
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      AI is creating voucher...
                    </h3>
                    <p className="text-gray-600">
                      Analyzing customer data to suggest a suitable voucher
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
                      AI created Voucher successfully!
                    </h3>

                    <div className="bg-amber-50 rounded-xl p-4 mb-4">
                      <p className="font-mono font-bold text-2xl text-amber-800">
                        {aiResult.code}
                      </p>
                      <p className="text-sm text-amber-700 mt-2">
                        {aiResult.description}
                      </p>
                    </div>

                    <div className="text-left bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      <p>
                        <span className="text-gray-500">Discount:</span>{" "}
                        <span className="font-medium">
                          {aiResult.discountType === "percentage"
                            ? `${aiResult.discountValue}%`
                            : formatCurrency(aiResult.discountValue)}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-500">Min. Spend:</span>{" "}
                        <span className="font-medium">
                          {formatCurrency(aiResult.minSpend)}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-500">Valid Until:</span>{" "}
                        <span className="font-medium">
                          {formatDate(aiResult.validUntil)}
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAIModal(false)}
                      className="w-full mt-6 py-3 px-4 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No results</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
