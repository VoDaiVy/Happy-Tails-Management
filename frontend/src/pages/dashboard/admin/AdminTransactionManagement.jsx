import { useState, useEffect, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import useScrollLock from "../../../hooks/useScrollLock";
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
  Activity,
} from "lucide-react";
import {
  getAllTransactions,
  getTransactionById,
} from "../../../api/transactionApi";
import AdminFilterBar from "../../../components/dashboard/AdminFilterBar";

// Transaction type labels
const TYPE_LABELS = {
  deposit: "Deposit",
  payment: "Payment",
  refund: "Refund",
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
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

// Status colors
const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const DETAIL_STATUS_PILL_STYLES = {
  pending: "border border-[#FDE68A] bg-[#FEF9C3] text-[#92400E]",
  completed: "border border-[#BBF7D0] bg-[#DCFCE7] text-[#166534]",
  failed: "border border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C]",
  cancelled: "border border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]",
};

const DETAIL_TYPE_PILL_STYLES = {
  deposit: "border border-[#C7E2FE] bg-[#EAF4FF] text-[#1E5EA8]",
  payment: "border border-[#C7D7FE] bg-[#EAF0FF] text-[#1E40AF]",
  refund: "border border-[#FED7AA] bg-[#FFF1E7] text-[#9A3412]",
};

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

  useScrollLock(showDetailModal);

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
      setError(
        err.response?.data?.message || "Không thể tải danh sách giao dịch",
      );
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
    return (
      userName.includes(search) ||
      userEmail.includes(search) ||
      code.includes(search)
    );
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

  const formatPaymentMethod = (method) => {
    if (!method) return "Not available";

    const normalized = String(method).trim().toLowerCase();
    if (normalized === "system" || normalized === "internal") {
      return "System";
    }

    return String(method)
      .trim()
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

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
            Transaction Management
          </h1>
          <p className="text-sm text-[#2D3436]/60">
            Track and manage system transactions
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2D3436]/40 uppercase tracking-wide">
                Total Transactions
              </p>
              <p className="text-2xl font-bold text-[#2D3436]">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2D3436]/40 uppercase tracking-wide">
                Pending
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2D3436]/40 uppercase tracking-wide">
                Completed
              </p>
              <p className="text-2xl font-bold text-[#7FB069]">
                {stats.completed}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2D3436]/40 uppercase tracking-wide">
                Total Amount
              </p>
              <p className="text-xl font-bold text-[#D97853]">
                {formatCurrency(stats.totalAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <AdminFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by transaction code, name or email..."
        filters={[
          {
            label: "STATUS",
            icon: Activity,
            options: ["All Status", "Pending", "Completed", "Failed"],
            value:
              statusFilter === "all"
                ? "All Status"
                : statusFilter === "pending"
                  ? "Pending"
                  : statusFilter === "completed"
                    ? "Completed"
                    : "Failed",
            onChange: (opt) =>
              setStatusFilter(
                opt === "All Status"
                  ? "all"
                  : opt === "Pending"
                    ? "pending"
                    : opt === "Completed"
                      ? "completed"
                      : "failed",
              ),
          },
          {
            label: "TYPE",
            icon: CreditCard,
            options: ["All Types", "Deposit", "Payment", "Refund"],
            value:
              typeFilter === "all"
                ? "All Types"
                : typeFilter === "deposit"
                  ? "Deposit"
                  : typeFilter === "payment"
                    ? "Payment"
                    : "Refund",
            onChange: (opt) =>
              setTypeFilter(
                opt === "All Types"
                  ? "all"
                  : opt === "Deposit"
                    ? "deposit"
                    : opt === "Payment"
                      ? "payment"
                      : "refund",
              ),
          },
        ]}
        dateValue={
          dateRange.start ? new Date(dateRange.start + "T00:00:00") : null
        }
        onDateChange={(date) =>
          setDateRange({
            start: date
              ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
              : "",
            end: "",
          })
        }
        dateLabel="FROM DATE"
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
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-20 text-[#2D3436]/40">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-[#2D3436]/20" />
            <p className="text-lg font-bold text-[#2D3436]">
              No transactions found
            </p>
            <p className="text-sm font-medium text-[#2D3436] mt-1">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FDFBF7] border-b border-[#2D3436]/5 text-xs font-bold text-[#2D3436]">
                  <th className="px-6 py-4 whitespace-nowrap">Tx Code</th>
                  <th className="px-6 py-4 whitespace-nowrap">User</th>
                  <th className="px-6 py-4 whitespace-nowrap">Type</th>
                  <th className="px-6 py-4 whitespace-nowrap text-right">
                    Amount
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap text-center">
                    Status
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">Created</th>
                  <th className="px-6 py-4 whitespace-nowrap text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((transaction) => {
                  const TypeIcon = TYPE_ICONS[transaction.type] || CreditCard;
                  return (
                    <Motion.tr
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
                            TYPE_COLORS[transaction.type] ||
                            "bg-gray-100 text-gray-800"
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
                            STATUS_COLORS[transaction.status] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {STATUS_LABELS[transaction.status] ||
                            transaction.status}
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
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </Motion.tr>
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
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/55 p-4 backdrop-blur-[2px]"
            onClick={() => setShowDetailModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-h-[92vh] w-full max-w-[660px] overflow-y-auto rounded-[24px] border border-[#E2E8F0] bg-[#FEFFFD] shadow-[0_22px_60px_-32px_rgba(15,23,42,0.45)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-gradient-to-r from-white via-[#FFF7F0] to-white px-4 py-3.5 md:px-5">
                <div className="relative flex items-start gap-3 pr-12">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#FBDDCB] bg-[#FFF1E6] shadow-sm">
                    <DollarSign className="h-4 w-4 text-[#D97853]" />
                  </div>
                  <div>
                    <h2 className="text-[22px] font-extrabold leading-[1.08] tracking-[-0.01em] text-[#1F2933]">
                      Transaction Details
                    </h2>
                    <p className="mt-0.5 text-[11px] font-medium text-[#486581]">
                      Transaction summary and payment metadata
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="absolute right-4 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
                  aria-label="Close transaction details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-5 p-4 md:p-5">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                  </div>
                ) : selectedTransaction ? (
                  <div className="space-y-5">
                    {/* Transaction Overview */}
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                        Transaction Overview
                      </h3>
                      <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7B8794]">
                          Transaction Code
                        </p>
                        <p className="mt-1.5 break-all font-mono text-[17px] md:text-lg font-extrabold tracking-[0.01em] leading-tight text-[#27364A]">
                          {selectedTransaction.transactionCode ||
                            "Not available"}
                        </p>
                      </div>
                    </section>

                    {/* Payment Summary */}
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                        Payment Summary
                      </h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-[#F6DEC2] bg-[#FFF8EF] p-3.5">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A16207]">
                            Amount
                          </p>
                          <p className="mt-1 text-2xl font-extrabold tracking-[-0.015em] text-[#9A3412]">
                            {formatCurrency(selectedTransaction.amount)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7B8794]">
                            Status
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                              DETAIL_STATUS_PILL_STYLES[
                                selectedTransaction.status
                              ] ||
                              "border border-[#D9E2EC] bg-[#F1F5F9] text-[#334E68]"
                            }`}
                          >
                            {STATUS_LABELS[selectedTransaction.status] ||
                              selectedTransaction.status ||
                              "Unknown"}
                          </span>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7B8794]">
                            Type
                          </p>
                          <span
                            className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                              DETAIL_TYPE_PILL_STYLES[
                                selectedTransaction.type
                              ] ||
                              "border border-[#D9E2EC] bg-[#F1F5F9] text-[#334E68]"
                            }`}
                          >
                            {selectedTransaction.type === "deposit" ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : selectedTransaction.type === "refund" ? (
                              <RefreshCw className="h-4 w-4" />
                            ) : (
                              <CreditCard className="h-4 w-4" />
                            )}
                            {TYPE_LABELS[selectedTransaction.type] ||
                              selectedTransaction.type ||
                              "Unknown"}
                          </span>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7B8794]">
                            Payment Method
                          </p>
                          <p className="mt-1.5 inline-flex items-center gap-1.5 text-base md:text-lg font-bold tracking-[-0.01em] text-[#243B53]">
                            <CreditCard className="h-4 w-4 text-[#5F6C7B]" />
                            {formatPaymentMethod(selectedTransaction.method)}
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* User Information */}
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                        User Information
                      </h3>
                      <div className="rounded-2xl border border-[#D6E4FF] bg-[#EDF3FF] p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C4D7FF] bg-white text-sm font-bold text-[#2F6CC5]">
                            {(selectedTransaction.user?.name || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#486581]">
                              User
                            </p>
                            <p className="mt-0.5 text-lg md:text-xl font-extrabold leading-none tracking-[-0.015em] text-[#1F2933] truncate">
                              {selectedTransaction.user?.name ||
                                "Not available"}
                            </p>
                            <p className="mt-1 text-sm md:text-base font-medium text-[#52606D] truncate">
                              {selectedTransaction.user?.email ||
                                "Not available"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Timeline / Metadata */}
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                        Timeline / Metadata
                      </h3>
                      <div className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFC] p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7B8794]">
                            <Calendar className="h-4 w-4 text-[#7B8794]" />
                            Created
                          </span>
                          <span className="text-sm font-semibold text-[#334E68]">
                            {formatDate(selectedTransaction.createdAt)}
                          </span>
                        </div>

                        {selectedTransaction.processedAt && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7B8794]">
                              <Clock className="h-4 w-4 text-[#7B8794]" />
                              Processed At
                            </span>
                            <span className="text-sm font-semibold text-[#334E68]">
                              {formatDate(selectedTransaction.processedAt)}
                            </span>
                          </div>
                        )}

                        {selectedTransaction.processedBy?.name && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7B8794]">
                              <User className="h-4 w-4 text-[#7B8794]" />
                              Processed By
                            </span>
                            <span className="text-sm font-semibold text-[#334E68]">
                              {selectedTransaction.processedBy.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {selectedTransaction.notes && (
                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#FCFDFE] p-3.5">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7B8794]">
                            Notes
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-[#334E68] whitespace-pre-wrap">
                            {selectedTransaction.notes}
                          </p>
                        </div>
                      )}
                    </section>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Not found</p>
                )}
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}
