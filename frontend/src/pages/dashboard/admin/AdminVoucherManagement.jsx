import { useState, useEffect, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import useScrollLock from "../../../hooks/useScrollLock";
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
import AdminFilterBar from "../../../components/dashboard/AdminFilterBar";
import {
  getAllVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  toggleVoucherStatus,
  deleteVoucher,
  aiSuggestVoucher,
} from "../../../api/voucherApi";

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
  useScrollLock(
    showDetailModal || showFormModal || showDeleteModal || showAIModal,
  );

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
      setVouchers(response.data.data.vouchers || []);
      setPagination((prev) => ({
        ...prev,
        ...response.data.data.pagination,
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
    setIsDiscountTypeOpen(false);
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
    setIsDiscountTypeOpen(false);
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

  const handleCloseFormModal = () => {
    setIsDiscountTypeOpen(false);
    setShowFormModal(false);
  };

  const handleDiscountTypeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      discountType: value,
      maxDiscount: value === "percentage" ? prev.maxDiscount : "",
    }));
    setIsDiscountTypeOpen(false);
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

      handleCloseFormModal();
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

  const isPercentageDiscount = formData.discountType === "percentage";
  const discountValueSuffix = isPercentageDiscount ? "%" : "VND";
  const isFormInvalid =
    !formData.code.trim() ||
    !formData.description.trim() ||
    !formData.discountValue ||
    !formData.validUntil;

  return (
    <Motion.div
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
        <Motion.button
          onClick={handleOpenCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 shrink-0"
        >
          <Plus size={18} /> Create Voucher
        </Motion.button>
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
          <div className="text-center py-20 text-[#2D3436]/40">
            <Ticket className="w-16 h-16 mx-auto mb-4 text-[#2D3436]/20" />
            <p className="text-lg font-bold text-[#2D3436]">
              No vouchers found
            </p>
            <p className="text-sm font-medium text-[#2D3436] mt-1">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FDFBF7] border-b border-[#2D3436]/5 text-xs font-bold text-[#2D3436]">
                    <th className="px-6 py-4 whitespace-nowrap">Code</th>
                    <th className="px-6 py-4 whitespace-nowrap">Description</th>
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
                <tbody className="divide-y divide-gray-100">
                  {vouchers.map((voucher) => (
                    <Motion.tr
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
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            voucher.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                        <div className="flex items-center justify-center gap-2">
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
                    </Motion.tr>
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
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <Motion.div
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
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseFormModal}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative flex w-full max-w-[920px] max-h-[92vh] flex-col overflow-hidden rounded-[26px] border border-[#2D3436]/10 bg-[#FFFEFC] shadow-[0_28px_80px_rgba(28,32,36,0.2)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="shrink-0 border-b border-[#2D3436]/10 bg-[#FFFCF8] px-5 py-4 md:px-7 md:py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 md:gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D97853]/15 bg-[#D97853]/12 shadow-[0_8px_20px_rgba(217,120,83,0.16)]">
                      <Ticket size={20} className="text-[#D97853]" />
                    </div>
                    <div>
                      <h2 className="text-[24px] leading-tight font-extrabold tracking-[-0.01em] text-[#2D3436]">
                        {formMode === "create"
                          ? "Create New Voucher"
                          : "Edit Voucher"}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-[#9B7B6F]">
                        {formMode === "create"
                          ? "Add a new discount code for customers"
                          : "Refine discount settings and validity rules"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseFormModal}
                    className="mt-0.5 rounded-xl border border-[#2D3436]/10 bg-white p-2 text-[#2D3436]/60 transition-all hover:border-[#D97853]/25 hover:bg-[#D97853]/8 hover:text-[#D97853]"
                  >
                    <X className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleSubmitForm}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-7 md:py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {/* Voucher Basic Info */}
                  <section className="rounded-2xl border border-[#D97853]/15 bg-gradient-to-br from-[#FFF9F5] via-[#FFFFFF] to-[#FFFCF9] p-4 md:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#2D3436]/8 pb-3">
                      <div>
                        <h3 className="text-[15px] font-bold text-[#2D3436]">
                          Voucher Basic Info
                        </h3>
                        <p className="mt-1 text-xs text-[#2D3436]/55">
                          Define the identity customers will recognize at
                          checkout.
                        </p>
                      </div>
                      <span className="rounded-full border border-[#D97853]/20 bg-[#D97853]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#D97853]">
                        Priority
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-bold text-[#2D3436]">
                          Voucher Code <span className="text-[#D97853]">*</span>
                        </label>
                        <p className="mb-2 text-xs font-medium text-[#2D3436]/55">
                          Unique code customers enter at checkout.
                        </p>
                        <div className="relative">
                          <Ticket
                            size={16}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#D97853]/70"
                          />
                          <input
                            type="text"
                            name="code"
                            value={formData.code}
                            onChange={handleFormChange}
                            required
                            disabled={formMode === "edit"}
                            className="h-[48px] w-full rounded-2xl border border-[#D97853]/20 bg-white pl-11 pr-4 text-[15px] font-semibold uppercase tracking-[0.02em] text-[#2D3436] shadow-[0_4px_14px_rgba(45,52,54,0.06)] placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-[#2D3436]/35 focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/15 disabled:cursor-not-allowed disabled:bg-[#2D3436]/5"
                            placeholder="E.g. HAPPYPET20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-bold text-[#2D3436]">
                          Description <span className="text-[#D97853]">*</span>
                        </label>
                        <p className="mb-2 text-xs font-medium text-[#2D3436]/55">
                          Short description shown internally or in promotions.
                        </p>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleFormChange}
                          required
                          rows={3}
                          className="w-full rounded-2xl border border-[#2D3436]/12 bg-white px-4 py-3 text-sm font-medium text-[#2D3436] shadow-[0_4px_14px_rgba(45,52,54,0.05)] placeholder:font-normal placeholder:text-[#2D3436]/38 focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/15 resize-none"
                          placeholder="Describe the voucher promotion..."
                        />
                      </div>
                    </div>
                  </section>

                  {/* Discount Rules */}
                  <section className="rounded-2xl border border-[#2D3436]/10 bg-white p-4 md:p-5">
                    <div className="mb-4 border-b border-[#2D3436]/8 pb-3">
                      <h3 className="text-[15px] font-bold text-[#2D3436]">
                        Discount Rules
                      </h3>
                      <p className="mt-1 text-xs text-[#2D3436]/55">
                        Configure value logic and purchasing conditions for this
                        voucher.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div
                        className={`relative ${isDiscountTypeOpen ? "z-[70]" : "z-10"}`}
                      >
                        <label className="mb-1.5 block text-sm font-bold text-[#2D3436]">
                          Discount Type
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setIsDiscountTypeOpen((prevOpen) => !prevOpen)
                          }
                          className="flex h-[48px] w-full items-center justify-between rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-left transition-all hover:border-[#D97853]/40 focus:outline-none focus:ring-2 focus:ring-[#D97853]/15"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D97853]/10 text-[#D97853]">
                              {isPercentageDiscount ? (
                                <Percent size={15} />
                              ) : (
                                <DollarSign size={15} />
                              )}
                            </span>
                            <span className="text-sm font-semibold text-[#2D3436]">
                              {isPercentageDiscount
                                ? "Percentage (%)"
                                : "Fixed Amount (VND)"}
                            </span>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`text-[#2D3436]/45 transition-transform ${isDiscountTypeOpen ? "rotate-180" : ""}`}
                          />
                        </button>

                        <AnimatePresence>
                          {isDiscountTypeOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsDiscountTypeOpen(false)}
                              />
                              <Motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 top-[calc(100%+10px)] z-50 w-full overflow-hidden rounded-2xl border border-[#2D3436]/8 bg-[#FFFCF8] py-1.5 shadow-[0_16px_34px_rgba(45,52,54,0.12)]"
                              >
                                {[
                                  {
                                    value: "percentage",
                                    label: "Percentage (%)",
                                  },
                                  {
                                    value: "fixed",
                                    label: "Fixed Amount (VND)",
                                  },
                                ].map((opt) => {
                                  const isSelected =
                                    formData.discountType === opt.value;

                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() =>
                                        handleDiscountTypeChange(opt.value)
                                      }
                                      className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors ${
                                        isSelected
                                          ? "bg-[#D97853]/12 font-semibold text-[#D97853]"
                                          : "font-medium text-[#2D3436]/75 hover:bg-[#2D3436]/5"
                                      }`}
                                    >
                                      <span>{opt.label}</span>
                                      {isSelected && (
                                        <CheckCircle2
                                          size={15}
                                          className="text-[#D97853]"
                                        />
                                      )}
                                    </button>
                                  );
                                })}
                              </Motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-bold text-[#2D3436]">
                          Discount Value{" "}
                          <span className="text-[#D97853]">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="discountValue"
                            value={formData.discountValue}
                            onChange={handleFormChange}
                            required
                            min="0"
                            className="h-[48px] w-full rounded-2xl border border-[#D97853]/25 bg-white px-4 pr-[72px] text-[15px] font-semibold text-[#2D3436] shadow-[0_5px_16px_rgba(217,120,83,0.12)] placeholder:font-medium placeholder:text-[#2D3436]/35 focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/15"
                            placeholder={isPercentageDiscount ? "10" : "50000"}
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-[#2D3436]/6 px-2 py-1 text-xs font-bold text-[#2D3436]/70">
                            {discountValueSuffix}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-bold text-[#2D3436]">
                          Min. Spend (VND)
                        </label>
                        <input
                          type="number"
                          name="minSpend"
                          value={formData.minSpend}
                          onChange={handleFormChange}
                          min="0"
                          className="h-[48px] w-full rounded-2xl border border-[#2D3436]/12 bg-white px-4 text-sm font-medium text-[#2D3436] placeholder:text-[#2D3436]/45 focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/15"
                          placeholder="0"
                        />
                        <p className="mt-1.5 text-xs text-[#2D3436]/50">
                          Optional
                        </p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-bold text-[#2D3436]">
                          Max Discount (VND)
                        </label>
                        <input
                          type="number"
                          name="maxDiscount"
                          value={formData.maxDiscount}
                          onChange={handleFormChange}
                          min="0"
                          disabled={!isPercentageDiscount}
                          className="h-[48px] w-full rounded-2xl border border-[#2D3436]/12 bg-white px-4 text-sm font-medium text-[#2D3436] placeholder:text-[#2D3436]/45 focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/15 disabled:cursor-not-allowed disabled:bg-[#2D3436]/6 disabled:text-[#2D3436]/45"
                          placeholder={
                            isPercentageDiscount
                              ? "Unlimited"
                              : "Not required for fixed amount"
                          }
                        />
                        <p className="mt-1.5 text-xs text-[#2D3436]/50">
                          {isPercentageDiscount
                            ? "Leave empty for no limit"
                            : "Only applies to percentage discount"}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Usage & Limits */}
                  <section className="rounded-2xl border border-[#2D3436]/10 bg-white p-4 md:p-5">
                    <div className="mb-4 border-b border-[#2D3436]/8 pb-3">
                      <h3 className="text-[15px] font-bold text-[#2D3436]">
                        Usage & Limits
                      </h3>
                      <p className="mt-1 text-xs text-[#2D3436]/55">
                        Control how many times this voucher can be redeemed.
                      </p>
                    </div>

                    <div className="space-y-3.5">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, usageLimit: "" }))
                          }
                          className={`h-[42px] rounded-xl border px-3 text-sm font-semibold transition-colors ${
                            formData.usageLimit === ""
                              ? "border-[#D97853]/35 bg-[#D97853]/12 text-[#D97853]"
                              : "border-[#2D3436]/12 bg-white text-[#2D3436]/70 hover:bg-[#2D3436]/5"
                          }`}
                        >
                          Unlimited usage
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              usageLimit: prev.usageLimit || "1",
                            }))
                          }
                          className={`h-[42px] rounded-xl border px-3 text-sm font-semibold transition-colors ${
                            formData.usageLimit !== ""
                              ? "border-[#D97853]/35 bg-[#D97853]/12 text-[#D97853]"
                              : "border-[#2D3436]/12 bg-white text-[#2D3436]/70 hover:bg-[#2D3436]/5"
                          }`}
                        >
                          Limit total redemptions
                        </button>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-bold text-[#2D3436]">
                          Usage Limit
                        </label>
                        <input
                          type="number"
                          name="usageLimit"
                          value={formData.usageLimit}
                          onChange={handleFormChange}
                          min="0"
                          disabled={formData.usageLimit === ""}
                          className="h-[48px] w-full rounded-2xl border border-[#2D3436]/12 bg-white px-4 text-sm font-medium text-[#2D3436] placeholder:text-[#2D3436]/45 focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/15 disabled:cursor-not-allowed disabled:bg-[#2D3436]/6"
                          placeholder={
                            formData.usageLimit === ""
                              ? "Unlimited usage enabled"
                              : "Enter total redemption limit"
                          }
                        />
                        <p className="mt-1.5 text-xs text-[#2D3436]/50">
                          Leave empty for unlimited usage.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Validity Period */}
                  <section className="rounded-2xl border border-[#2D3436]/10 bg-white p-4 md:p-5">
                    <div className="mb-4 border-b border-[#2D3436]/8 pb-3">
                      <h3 className="text-[15px] font-bold text-[#2D3436]">
                        Validity Period
                      </h3>
                      <p className="mt-1 text-xs text-[#2D3436]/55">
                        Set the active period for this voucher.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-bold text-[#2D3436]">
                          Valid From
                        </label>
                        <div className="relative">
                          <DatePicker
                            selected={
                              formData.validFrom
                                ? new Date(formData.validFrom)
                                : null
                            }
                            onChange={(date) =>
                              setFormData((prev) => {
                                const nextValidFrom = date
                                  ? date.toISOString().split("T")[0]
                                  : "";

                                let nextValidUntil = prev.validUntil;
                                if (
                                  nextValidUntil &&
                                  nextValidFrom &&
                                  new Date(nextValidUntil) <
                                    new Date(nextValidFrom)
                                ) {
                                  nextValidUntil = "";
                                }

                                return {
                                  ...prev,
                                  validFrom: nextValidFrom,
                                  validUntil: nextValidUntil,
                                };
                              })
                            }
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Select start date"
                            className="h-[48px] w-full rounded-2xl border border-[#2D3436]/12 bg-white py-3 pl-11 pr-4 text-sm font-medium text-[#2D3436] placeholder:text-[#2D3436]/45 focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/15"
                            wrapperClassName="w-full"
                          />
                          <Calendar
                            size={16}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2D3436]/45"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-bold text-[#2D3436]">
                          Valid Until <span className="text-[#D97853]">*</span>
                        </label>
                        <div className="relative">
                          <DatePicker
                            selected={
                              formData.validUntil
                                ? new Date(formData.validUntil)
                                : null
                            }
                            onChange={(date) =>
                              setFormData((prev) => ({
                                ...prev,
                                validUntil: date
                                  ? date.toISOString().split("T")[0]
                                  : "",
                              }))
                            }
                            minDate={
                              formData.validFrom
                                ? new Date(formData.validFrom)
                                : undefined
                            }
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Select end date"
                            required
                            className="h-[48px] w-full rounded-2xl border border-[#2D3436]/12 bg-white py-3 pl-11 pr-4 text-sm font-medium text-[#2D3436] placeholder:text-[#2D3436]/45 focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/15"
                            wrapperClassName="w-full"
                          />
                          <Calendar
                            size={16}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2D3436]/45"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="shrink-0 border-t border-[#2D3436]/10 bg-[#FFFCF8] px-5 py-4 md:px-7 md:py-5">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseFormModal}
                      className="h-[44px] min-w-[120px] rounded-xl border border-[#2D3436]/12 bg-white px-5 text-sm font-semibold text-[#2D3436]/75 transition-colors hover:bg-[#2D3436]/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading || isFormInvalid}
                      className="inline-flex h-[44px] min-w-[165px] items-center justify-center gap-2 rounded-xl bg-[#D97853] px-5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(217,120,83,0.3)] transition-all hover:bg-[#c66846] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {formLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          {formMode === "create"
                            ? "Create Voucher"
                            : "Save Changes"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedVoucher && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <Motion.div
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
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* AI Result Modal */}
      <AnimatePresence>
        {showAIModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !aiLoading && setShowAIModal(false)}
          >
            <Motion.div
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
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}

