import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useScrollLock from '../../hooks/useScrollLock';
import {
  Search,
  FileText,
  Filter,
  Eye,
  X,
  Calendar,
  User,
  PawPrint,
  Stethoscope,
  Pill,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getAllMedicalRecords, getMedicalRecordById } from "../../api/medicalRecordApi";

// Record type labels in Vietnamese
const RECORD_TYPE_LABELS = {
  checkup: "Khám tổng quát",
  vaccination: "Tiêm phòng",
  treatment: "Điều trị",
  surgery: "Phẫu thuật",
  emergency: "Cấp cứu",
  grooming: "Chăm sóc",
  other: "Khác",
};

// Record type colors
const RECORD_TYPE_COLORS = {
  checkup: "bg-blue-100 text-blue-800",
  vaccination: "bg-green-100 text-green-800",
  treatment: "bg-yellow-100 text-yellow-800",
  surgery: "bg-red-100 text-red-800",
  emergency: "bg-purple-100 text-purple-800",
  grooming: "bg-pink-100 text-pink-800",
  other: "bg-gray-100 text-gray-800",
};

// Filter tabs
const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "checkup", label: "Khám tổng quát" },
  { key: "vaccination", label: "Tiêm phòng" },
  { key: "treatment", label: "Điều trị" },
  { key: "surgery", label: "Phẫu thuật" },
  { key: "emergency", label: "Cấp cứu" },
  { key: "grooming", label: "Chăm sóc" },
];

export default function MedicalRecordManagement() {
  const [records, setRecords] = useState([]);
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

  // Detail modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  useScrollLock(showDetailModal);

  // Fetch records
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (activeTab !== "all") {
        params.recordType = activeTab;
      }

      const response = await getAllMedicalRecords(params);
      setRecords(response.data.data.records || []);
      setPagination((prev) => ({
        ...prev,
        ...response.data.data.pagination,
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách bệnh án");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, activeTab]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Reset page when filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [activeTab]);

  // Filter records by search term (client-side)
  const filteredRecords = records.filter((record) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const petName = record.userPet?.petName?.toLowerCase() || "";
    const ownerName = record.user?.name?.toLowerCase() || "";
    const condition = record.condition?.toLowerCase() || "";
    const diagnosis = record.diagnosis?.toLowerCase() || "";
    return (
      petName.includes(search) ||
      ownerName.includes(search) ||
      condition.includes(search) ||
      diagnosis.includes(search)
    );
  });

  // View detail
  const handleViewDetail = async (record) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const response = await getMedicalRecordById(record._id);
      setSelectedRecord(response.data.data.record);
    } catch (err) {
      console.error("Error fetching record detail:", err);
      setError("Không thể tải chi tiết bệnh án");
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Close detail modal
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedRecord(null);
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
          <FileText className="w-7 h-7 text-amber-600" />
          Quản lý Bệnh án
        </h1>
        <p className="text-gray-600 mt-1">Xem và tìm kiếm hồ sơ bệnh án thú cưng</p>
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
            placeholder="Tìm kiếm theo tên thú cưng, chủ, tình trạng hoặc chẩn đoán..."
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
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Không có bệnh án nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      Thú cưng
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      Chủ nhân
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      Loại
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      Tình trạng
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
                  {filteredRecords.map((record) => (
                    <motion.tr
                      key={record._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <PawPrint className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {record.userPet?.petName || "-"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {record.userPet?.petType} - {record.userPet?.breed || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-800">
                            {record.user?.name || "-"}
                          </p>
                          <p className="text-sm text-gray-500">{record.user?.email || "-"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            RECORD_TYPE_COLORS[record.recordType] || RECORD_TYPE_COLORS.other
                          }`}
                        >
                          {RECORD_TYPE_LABELS[record.recordType] || record.recordType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-800 line-clamp-2 max-w-xs">
                          {record.condition || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(record.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleViewDetail(record)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Xem
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Hiển thị {filteredRecords.length} / {pagination.total} bệnh án
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
            onClick={closeDetailModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Stethoscope className="w-6 h-6 text-amber-600" />
                  Chi tiết Bệnh án
                </h2>
                <button
                  onClick={closeDetailModal}
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
                ) : selectedRecord ? (
                  <div className="space-y-6">
                    {/* Pet & Owner Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pet Info */}
                      <div className="bg-amber-50 rounded-xl p-4">
                        <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
                          <PawPrint className="w-5 h-5" />
                          Thông tin thú cưng
                        </h3>
                        <div className="space-y-2 text-sm">
                          <p>
                            <span className="text-gray-600">Tên:</span>{" "}
                            <span className="font-medium">
                              {selectedRecord.userPet?.petName || "-"}
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-600">Loài:</span>{" "}
                            <span className="font-medium">
                              {selectedRecord.userPet?.petType || "-"}
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-600">Giống:</span>{" "}
                            <span className="font-medium">
                              {selectedRecord.userPet?.breed || "N/A"}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Owner Info */}
                      <div className="bg-blue-50 rounded-xl p-4">
                        <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
                          <User className="w-5 h-5" />
                          Thông tin chủ nhân
                        </h3>
                        <div className="space-y-2 text-sm">
                          <p>
                            <span className="text-gray-600">Họ tên:</span>{" "}
                            <span className="font-medium">
                              {selectedRecord.user?.name || "-"}
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-600">Email:</span>{" "}
                            <span className="font-medium">
                              {selectedRecord.user?.email || "-"}
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-600">SĐT:</span>{" "}
                            <span className="font-medium">
                              {selectedRecord.user?.phone || "-"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Record Type & Date */}
                    <div className="flex flex-wrap gap-4 items-center">
                      <span
                        className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                          RECORD_TYPE_COLORS[selectedRecord.recordType] ||
                          RECORD_TYPE_COLORS.other
                        }`}
                      >
                        {RECORD_TYPE_LABELS[selectedRecord.recordType] ||
                          selectedRecord.recordType}
                      </span>
                      <span className="text-gray-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(selectedRecord.createdAt)}
                      </span>
                    </div>

                    {/* Medical Info */}
                    <div className="space-y-4">
                      {/* Condition */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Tình trạng</h4>
                        <p className="text-gray-800">{selectedRecord.condition || "-"}</p>
                      </div>

                      {/* Diagnosis */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Chẩn đoán</h4>
                        <p className="text-gray-800">{selectedRecord.diagnosis || "-"}</p>
                      </div>

                      {/* Treatment */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Điều trị</h4>
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {selectedRecord.treatment || "-"}
                        </p>
                      </div>

                      {/* Medications */}
                      {selectedRecord.medications?.length > 0 && (
                        <div className="bg-green-50 rounded-xl p-4">
                          <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
                            <Pill className="w-5 h-5" />
                            Thuốc
                          </h4>
                          <div className="space-y-2">
                            {selectedRecord.medications.map((med, idx) => (
                              <div
                                key={idx}
                                className="bg-white rounded-lg p-3 border border-green-100"
                              >
                                <p className="font-medium text-gray-800">{med.name}</p>
                                <p className="text-sm text-gray-600">
                                  Liều lượng: {med.dosage || "-"} | Tần suất:{" "}
                                  {med.frequency || "-"} | Thời gian: {med.duration || "-"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vitals */}
                      {selectedRecord.vitals &&
                        Object.keys(selectedRecord.vitals).length > 0 && (
                          <div className="bg-purple-50 rounded-xl p-4">
                            <h4 className="font-semibold text-purple-800 flex items-center gap-2 mb-3">
                              <Activity className="w-5 h-5" />
                              Chỉ số sinh tồn
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {selectedRecord.vitals.weight && (
                                <div className="bg-white rounded-lg p-3 text-center">
                                  <p className="text-sm text-gray-600">Cân nặng</p>
                                  <p className="text-lg font-bold text-gray-800">
                                    {selectedRecord.vitals.weight} kg
                                  </p>
                                </div>
                              )}
                              {selectedRecord.vitals.temperature && (
                                <div className="bg-white rounded-lg p-3 text-center">
                                  <p className="text-sm text-gray-600">Nhiệt độ</p>
                                  <p className="text-lg font-bold text-gray-800">
                                    {selectedRecord.vitals.temperature}°C
                                  </p>
                                </div>
                              )}
                              {selectedRecord.vitals.heartRate && (
                                <div className="bg-white rounded-lg p-3 text-center">
                                  <p className="text-sm text-gray-600">Nhịp tim</p>
                                  <p className="text-lg font-bold text-gray-800">
                                    {selectedRecord.vitals.heartRate} bpm
                                  </p>
                                </div>
                              )}
                              {selectedRecord.vitals.respiratoryRate && (
                                <div className="bg-white rounded-lg p-3 text-center">
                                  <p className="text-sm text-gray-600">Nhịp thở</p>
                                  <p className="text-lg font-bold text-gray-800">
                                    {selectedRecord.vitals.respiratoryRate} /phút
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Notes */}
                      {selectedRecord.notes && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h4 className="font-semibold text-gray-700 mb-2">Ghi chú</h4>
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {selectedRecord.notes}
                          </p>
                        </div>
                      )}

                      {/* Follow-up Date */}
                      {selectedRecord.followUpDate && (
                        <div className="bg-orange-50 rounded-xl p-4">
                          <h4 className="font-semibold text-orange-800 flex items-center gap-2 mb-2">
                            <Calendar className="w-5 h-5" />
                            Ngày tái khám
                          </h4>
                          <p className="text-orange-700 font-medium">
                            {formatDate(selectedRecord.followUpDate)}
                          </p>
                        </div>
                      )}

                      {/* Created By */}
                      <div className="text-sm text-gray-500 pt-4 border-t border-gray-100">
                        <p>
                          Tạo bởi:{" "}
                          <span className="font-medium">
                            {selectedRecord.createdBy?.name || "-"}
                          </span>
                        </p>
                        {selectedRecord.updatedBy && (
                          <p>
                            Cập nhật bởi:{" "}
                            <span className="font-medium">
                              {selectedRecord.updatedBy?.name || "-"}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Không tìm thấy thông tin bệnh án
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
