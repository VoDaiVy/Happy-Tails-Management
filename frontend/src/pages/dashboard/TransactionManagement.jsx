import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useScrollLock from '../../hooks/useScrollLock';
import {
  Search,
  DollarSign,
  Eye,
  X,
  Calendar,
  User,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getAllTransactions, getTransactionById, processTransaction } from "../../api/transactionApi";

// Transaction type labels
const TYPE_LABELS = {
  deposit: "Nạp tiền",
  payment: "Thanh toán",
  refund: "Hoàn tiền",
};

// Transaction type icons
const TYPE_ICONS = {
  deposit: TrendingUp,
  payment: CreditCard,
  refund: RefreshCw,
};

// Transaction type colors
const TYPE_COLORS = {
  deposit: "bg-green-100 text-green-800",
  payment: "bg-blue-100 text-blue-800",
  refund: "bg-orange-100 text-orange-800",
};

// Status labels
const STATUS_LABELS = {
  pending: "Chờ xử lý",
  completed: "Hoàn thành",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};

// Status colors
const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

// Filter tabs
const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ xử lý" },
  { key: "completed", label: "Hoàn thành" },
  { key: "failed", label: "Thất bại" },
];

// Type filter options
const TYPE_OPTIONS = [
  { key: "all", label: "Tất cả loại" },
  { key: "deposit", label: "Nạp tiền" },
  { key: "payment", label: "Thanh toán" },
  { key: "refund", label: "Hoàn tiền" },
];

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Detail modal
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Process modal
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processData, setProcessData] = useState({ status: "", notes: "" });
  const [processing, setProcessing] = useState(false);
  useScrollLock(showDetailModal || showProcessModal);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    totalAmount: 0,
  });

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const response = await getAllTransactions(params);
      const data = response.data.data.transactions || [];
      setTransactions(data);

      // Calculate stats
      const pending = data.filter((t) => t.status === "pending").length;
      const completed = data.filter((t) => t.status === "completed").length;
      const totalAmount = data
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      setStats({
        total: data.length,
        pending,
        completed,
        totalAmount,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách giao dịch");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, dateRange]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Filter by search (client-side)
  const filteredTransactions = transactions.filter((t) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const userName = t.user?.name?.toLowerCase() || "";
    const userEmail = t.user?.email?.toLowerCase() || "";
    const code = t.transactionCode?.toLowerCase() || "";
    return userName.includes(search) || userEmail.includes(search) || code.includes(search);
  });

  // View detail
  const handleViewDetail = async (transaction) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const response = await getTransactionById(transaction._id);
      setSelectedTransaction(response.data.data.transaction);
    } catch (err) {
      console.error("Error fetching transaction detail:", err);
      setError("Không thể tải chi tiết giao dịch");
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open process modal
  const handleOpenProcess = (transaction) => {
    setSelectedTransaction(transaction);
    setProcessData({ status: "", notes: "" });
    setShowProcessModal(true);
  };

  // Process transaction
  const handleProcess = async () => {
    if (!processData.status) return;

    try {
      setProcessing(true);
      await processTransaction(selectedTransaction._id, processData);
      setShowProcessModal(false);
      fetchTransactions();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xử lý giao dịch");
    } finally {
      setProcessing(false);
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-7 h-7 text-amber-600" />
          Quản lý Dòng tiền
        </h1>
        <p className="text-gray-600 mt-1">Theo dõi và xử lý các giao dịch hệ thống</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng giao dịch</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Chờ xử lý</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hoàn thành</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng tiền (Hoàn thành)</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(stats.totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === tab.key
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type filter & Date range */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* Type filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Loại giao dịch</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Từ ngày</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Đến ngày</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã giao dịch, tên hoặc email người dùng..."
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
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Không có giao dịch nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Mã GD
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Người dùng
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Loại
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                    Số tiền
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((transaction) => {
                  const TypeIcon = TYPE_ICONS[transaction.type] || CreditCard;
                  return (
                    <motion.tr
                      key={transaction._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-800">
                          {transaction.transactionCode || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {transaction.user?.name || "-"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {transaction.user?.email || "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            TYPE_COLORS[transaction.type] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <TypeIcon className="w-4 h-4" />
                          {TYPE_LABELS[transaction.type] || transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-semibold ${
                            transaction.type === "refund"
                              ? "text-orange-600"
                              : transaction.type === "deposit"
                              ? "text-green-600"
                              : "text-gray-800"
                          }`}
                        >
                          {transaction.type === "deposit" ? "+" : ""}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            STATUS_COLORS[transaction.status] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {STATUS_LABELS[transaction.status] || transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetail(transaction)}
                            className="p-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {transaction.status === "pending" && (
                            <button
                              onClick={() => handleOpenProcess(transaction)}
                              className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Xử lý"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                  Chi tiết Giao dịch
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                  </div>
                ) : selectedTransaction ? (
                  <div className="space-y-4">
                    {/* Transaction Code */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Mã giao dịch</p>
                      <p className="font-mono font-bold text-lg text-gray-800">
                        {selectedTransaction.transactionCode || "-"}
                      </p>
                    </div>

                    {/* Amount & Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-amber-50 rounded-xl p-4">
                        <p className="text-sm text-amber-700 mb-1">Số tiền</p>
                        <p className="font-bold text-xl text-amber-800">
                          {formatCurrency(selectedTransaction.amount)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            STATUS_COLORS[selectedTransaction.status]
                          }`}
                        >
                          {STATUS_LABELS[selectedTransaction.status]}
                        </span>
                      </div>
                    </div>

                    {/* Type & Method */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Loại</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            TYPE_COLORS[selectedTransaction.type]
                          }`}
                        >
                          {TYPE_LABELS[selectedTransaction.type]}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Phương thức</p>
                        <p className="font-medium text-gray-800">
                          {selectedTransaction.method || "-"}
                        </p>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm text-blue-700 mb-2">Người dùng</p>
                      <p className="font-medium text-gray-800">
                        {selectedTransaction.user?.name || "-"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedTransaction.user?.email || "-"}
                      </p>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Ngày tạo</p>
                        <p className="font-medium text-gray-800">
                          {formatDate(selectedTransaction.createdAt)}
                        </p>
                      </div>
                      {selectedTransaction.processedAt && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-500 mb-1">Ngày xử lý</p>
                          <p className="font-medium text-gray-800">
                            {formatDate(selectedTransaction.processedAt)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {selectedTransaction.notes && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Ghi chú</p>
                        <p className="text-gray-800">{selectedTransaction.notes}</p>
                      </div>
                    )}

                    {/* Processed By */}
                    {selectedTransaction.processedBy && (
                      <div className="text-sm text-gray-500 pt-2 border-t">
                        Xử lý bởi: <span className="font-medium">{selectedTransaction.processedBy.name}</span>
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

      {/* Process Modal */}
      <AnimatePresence>
        {showProcessModal && selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowProcessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Xử lý Giao dịch</h2>
                <button
                  onClick={() => setShowProcessModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Mã giao dịch</p>
                  <p className="font-mono font-bold">{selectedTransaction.transactionCode}</p>
                  <p className="text-amber-600 font-semibold mt-2">
                    {formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn trạng thái
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setProcessData((prev) => ({ ...prev, status: "completed" }))}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                        processData.status === "completed"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <CheckCircle className="w-5 h-5" />
                      Hoàn thành
                    </button>
                    <button
                      onClick={() => setProcessData((prev) => ({ ...prev, status: "failed" }))}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                        processData.status === "failed"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <XCircle className="w-5 h-5" />
                      Thất bại
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
                  <textarea
                    value={processData.notes}
                    onChange={(e) => setProcessData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Nhập ghi chú (không bắt buộc)..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowProcessModal(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleProcess}
                    disabled={!processData.status || processing}
                    className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? "Đang xử lý..." : "Xác nhận"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
