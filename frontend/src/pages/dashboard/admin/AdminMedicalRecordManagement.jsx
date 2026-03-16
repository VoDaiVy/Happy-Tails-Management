import { useState, useEffect, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import useScrollLock from "../../../hooks/useScrollLock";
import {
  FileText,
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
import {
  getAllMedicalRecords,
  getMedicalRecordById,
} from "../../../api/medicalRecordApi";
import AdminFilterBar from "../../../components/dashboard/AdminFilterBar";

const RECORD_TYPE_LABELS = {
  checkup: "Checkup",
  vaccination: "Vaccination",
  treatment: "Treatment",
  surgery: "Surgery",
  emergency: "Emergency",
  grooming: "Grooming",
  other: "Other",
};

const RECORD_TYPE_COLORS = {
  checkup: "bg-blue-100 text-blue-800",
  vaccination: "bg-green-100 text-green-800",
  treatment: "bg-yellow-100 text-yellow-800",
  surgery: "bg-red-100 text-red-800",
  emergency: "bg-purple-100 text-purple-800",
  grooming: "bg-pink-100 text-pink-800",
  other: "bg-gray-100 text-gray-800",
};

export default function MedicalRecordManagement() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  useScrollLock(showDetailModal);

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
      setError(
        err.response?.data?.message || "Không thể tải danh sách bệnh án",
      );
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, activeTab]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [activeTab]);

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

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedRecord(null);
  };

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

  const renderRecordValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-[#64748B] italic">Not available</span>;
    }

    return (
      <span className="text-[#0F172A] font-semibold text-right break-words">
        {value}
      </span>
    );
  };

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto max-w-[1400px] space-y-6 pb-10"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-[#D97853]">
            Medical Records
          </h1>
          <p className="text-sm text-[#2D3436]/60">
            View and search pet medical records
          </p>
        </div>
      </div>

      <AdminFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by pet name, owner, condition or diagnosis..."
        filters={[
          {
            label: "RECORD TYPE",
            icon: Activity,
            options: [
              "All Types",
              "Checkup",
              "Vaccination",
              "Treatment",
              "Surgery",
              "Emergency",
              "Grooming",
            ],
            value:
              activeTab === "all"
                ? "All Types"
                : activeTab === "checkup"
                  ? "Checkup"
                  : activeTab === "vaccination"
                    ? "Vaccination"
                    : activeTab === "treatment"
                      ? "Treatment"
                      : activeTab === "surgery"
                        ? "Surgery"
                        : activeTab === "emergency"
                          ? "Emergency"
                          : "Grooming",
            onChange: (opt) =>
              setActiveTab(
                opt === "All Types"
                  ? "all"
                  : opt === "Checkup"
                    ? "checkup"
                    : opt === "Vaccination"
                      ? "vaccination"
                      : opt === "Treatment"
                        ? "treatment"
                        : opt === "Surgery"
                          ? "surgery"
                          : opt === "Emergency"
                            ? "emergency"
                            : "grooming",
              ),
          },
        ]}
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-amber-500"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-20 text-center text-[#2D3436]/40">
            <FileText className="mx-auto mb-4 h-16 w-16 text-[#2D3436]/20" />
            <p className="text-lg font-bold text-[#2D3436]">No records found</p>
            <p className="mt-1 text-sm font-medium text-[#2D3436]">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#2D3436]/5 bg-[#FDFBF7] text-xs font-bold text-[#2D3436]">
                    <th className="whitespace-nowrap px-6 py-4">Pet</th>
                    <th className="whitespace-nowrap px-6 py-4">Owner</th>
                    <th className="whitespace-nowrap px-6 py-4">Type</th>
                    <th className="whitespace-nowrap px-6 py-4">Condition</th>
                    <th className="whitespace-nowrap px-6 py-4">Created</th>
                    <th className="whitespace-nowrap px-6 py-4 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map((record) => (
                    <Motion.tr
                      key={record._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                            <PawPrint className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {record.userPet?.petName || "-"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {record.userPet?.petType || "-"} -{" "}
                              {record.userPet?.breed || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-800">
                            {record.user?.name || "-"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {record.user?.email || "-"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                            RECORD_TYPE_COLORS[record.recordType] ||
                            RECORD_TYPE_COLORS.other
                          }`}
                        >
                          {RECORD_TYPE_LABELS[record.recordType] ||
                            record.recordType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="max-w-xs line-clamp-2 text-gray-800">
                          {record.condition || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(record.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleViewDetail(record)}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-amber-700 transition-colors hover:bg-amber-100"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </Motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <p className="text-sm text-gray-600">
                Showing {filteredRecords.length} of {pagination.total} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="px-4 py-2 text-gray-700">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  disabled={pagination.page >= pagination.pages}
                  className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showDetailModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/55 p-4 backdrop-blur-[2px]"
            onClick={closeDetailModal}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-[#E2E8F0] bg-[#FEFFFD] shadow-[0_28px_80px_-36px_rgba(15,23,42,0.45)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-gradient-to-r from-white via-[#FFF7F0] to-white px-6 py-5 md:px-8">
                <div className="relative flex items-start gap-3 pr-12">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#FBDDCB] bg-[#FFF1E6] shadow-sm">
                    <Stethoscope className="h-5 w-5 text-[#D97853]" />
                  </div>
                  <div>
                    <h2 className="text-[22px] font-bold leading-tight text-[#102A43]">
                      Medical Record Details
                    </h2>
                  </div>
                </div>
                <button
                  onClick={closeDetailModal}
                  className="absolute right-6 top-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
                  aria-label="Close medical record details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-8 p-6 md:p-8">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-amber-500"></div>
                  </div>
                ) : selectedRecord ? (
                  <div className="space-y-8">
                    <section className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                          Overview
                        </h3>
                        <span className="rounded-full border border-[#D7E5FF] bg-[#EEF5FF] px-3 py-1 text-xs font-semibold text-[#1D4E89]">
                          Record #{selectedRecord._id?.slice(-6) || "N/A"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-[#F2E8E1] bg-[#FFFDFB] p-5 shadow-[0_12px_30px_-25px_rgba(15,23,42,0.35)]">
                          <h4 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-[#B45333]">
                            <PawPrint className="h-4 w-4" />
                            Pet Info
                          </h4>
                          <div className="space-y-3 text-sm">
                            <p className="flex items-start justify-between gap-3">
                              <span className="font-medium text-[#7B8794]">
                                Name
                              </span>
                              {renderRecordValue(
                                selectedRecord.userPet?.petName,
                              )}
                            </p>
                            <p className="flex items-start justify-between gap-3">
                              <span className="font-medium text-[#7B8794]">
                                Species
                              </span>
                              {renderRecordValue(
                                selectedRecord.userPet?.petType,
                              )}
                            </p>
                            <p className="flex items-start justify-between gap-3">
                              <span className="font-medium text-[#7B8794]">
                                Breed
                              </span>
                              {renderRecordValue(selectedRecord.userPet?.breed)}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#FBFDFF] p-5 shadow-[0_12px_30px_-25px_rgba(15,23,42,0.35)]">
                          <h4 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-[#1E4E8C]">
                            <User className="h-4 w-4" />
                            Owner Info
                          </h4>
                          <div className="space-y-3 text-sm">
                            <p className="flex items-start justify-between gap-3">
                              <span className="font-medium text-[#7B8794]">
                                Full Name
                              </span>
                              {renderRecordValue(selectedRecord.user?.name)}
                            </p>
                            <p className="flex items-start justify-between gap-3">
                              <span className="font-medium text-[#7B8794]">
                                Email
                              </span>
                              {renderRecordValue(selectedRecord.user?.email)}
                            </p>
                            <p className="flex items-start justify-between gap-3">
                              <span className="font-medium text-[#7B8794]">
                                Phone
                              </span>
                              {renderRecordValue(selectedRecord.user?.phone)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#D7E5FF] bg-[#F2F8FF] px-4 py-3.5 md:px-5 md:py-4">
                        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-[#BFD5FF] bg-[#E6F0FF] px-3 py-1 text-xs font-semibold text-[#1D4E89]">
                              {RECORD_TYPE_LABELS[selectedRecord.recordType] ||
                                selectedRecord.recordType ||
                                "Record"}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#627D98]">
                              Visit Type
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm font-medium text-[#334E68]">
                            <Calendar className="h-4 w-4 text-[#486581]" />
                            <span>{formatDate(selectedRecord.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                        Medical Summary
                      </h3>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#FCFDFE] p-5">
                          <h4 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#102A43]">
                            <FileText className="h-4 w-4 text-[#627D98]" />
                            Condition
                          </h4>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#334E68]">
                            {selectedRecord.condition || "Not available"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#FCFDFE] p-5">
                          <h4 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#102A43]">
                            <Stethoscope className="h-4 w-4 text-[#627D98]" />
                            Diagnosis
                          </h4>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#334E68]">
                            {selectedRecord.diagnosis || "Not available"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#E2E8F0] bg-[#FCFDFE] p-5">
                        <h4 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#102A43]">
                          <Pill className="h-4 w-4 text-[#627D98]" />
                          Treatment
                        </h4>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#334E68]">
                          {selectedRecord.treatment || "Not available"}
                        </p>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                        Medications & Vitals
                      </h3>

                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                        <div className="rounded-2xl border border-[#D7F0E3] bg-[#F3FCF7] p-5 xl:col-span-3">
                          <h4 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-[#166534]">
                            <Pill className="h-4 w-4" />
                            Medications
                          </h4>

                          {selectedRecord.medications?.length > 0 ? (
                            <div className="space-y-3">
                              {selectedRecord.medications.map((med, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-xl border border-[#D7F0E3] bg-white p-3.5"
                                >
                                  <p className="text-sm font-semibold text-[#0F172A]">
                                    {med.name || "Unnamed medication"}
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-[#475569]">
                                    <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1">
                                      Dosage: {med.dosage || "Not available"}
                                    </span>
                                    <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1">
                                      Frequency:{" "}
                                      {med.frequency || "Not available"}
                                    </span>
                                    <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1">
                                      Duration:{" "}
                                      {med.duration || "Not available"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-xl border border-dashed border-[#B7E4CD] bg-white/70 p-4 text-sm font-medium text-[#52796F]">
                              No medications prescribed
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-[#E4DBFF] bg-[#F7F4FF] p-5 xl:col-span-2">
                          <h4 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-[#5B3FA5]">
                            <Activity className="h-4 w-4" />
                            Vitals
                          </h4>

                          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-2">
                            <div className="rounded-xl border border-[#E8E1FF] bg-white px-3 py-3.5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7C6DB0]">
                                Weight
                              </p>
                              <p className="mt-1.5 text-lg font-bold leading-none text-[#1E293B]">
                                {selectedRecord.vitals?.weight
                                  ? `${selectedRecord.vitals.weight} kg`
                                  : "Not recorded"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-[#E8E1FF] bg-white px-3 py-3.5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7C6DB0]">
                                Temperature
                              </p>
                              <p className="mt-1.5 text-lg font-bold leading-none text-[#1E293B]">
                                {selectedRecord.vitals?.temperature
                                  ? `${selectedRecord.vitals.temperature}°C`
                                  : "Not recorded"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-[#E8E1FF] bg-white px-3 py-3.5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7C6DB0]">
                                Heart Rate
                              </p>
                              <p className="mt-1.5 text-lg font-bold leading-none text-[#1E293B]">
                                {selectedRecord.vitals?.heartRate
                                  ? `${selectedRecord.vitals.heartRate} bpm`
                                  : "Not recorded"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-[#E8E1FF] bg-white px-3 py-3.5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7C6DB0]">
                                Resp. Rate
                              </p>
                              <p className="mt-1.5 text-lg font-bold leading-none text-[#1E293B]">
                                {selectedRecord.vitals?.respiratoryRate
                                  ? `${selectedRecord.vitals.respiratoryRate} /min`
                                  : "Not recorded"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                        Follow-up & Notes
                      </h3>

                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                        <div className="rounded-2xl border border-[#F3DFC2] bg-[#FFF8EF] p-5 xl:col-span-2">
                          <h4 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#B45309]">
                            <Calendar className="h-4 w-4" />
                            Follow-up Date
                          </h4>
                          <p className="text-sm font-semibold leading-relaxed text-[#7C2D12]">
                            {selectedRecord.followUpDate
                              ? formatDate(selectedRecord.followUpDate)
                              : "No follow-up scheduled"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#FCFDFE] p-5 xl:col-span-3">
                          <h4 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#102A43]">
                            <FileText className="h-4 w-4 text-[#627D98]" />
                            Notes
                          </h4>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#334E68]">
                            {selectedRecord.notes || "No additional notes"}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="border-t border-[#E2E8F0] pt-5">
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                        Metadata
                      </h3>
                      <div className="grid grid-cols-1 gap-2 text-sm text-[#627D98] md:grid-cols-2">
                        <p>
                          Created by:{" "}
                          <span className="font-semibold text-[#334E68]">
                            {selectedRecord.createdBy?.name || "Not available"}
                          </span>
                        </p>
                        <p>
                          Created at:{" "}
                          <span className="font-semibold text-[#334E68]">
                            {formatDate(selectedRecord.createdAt)}
                          </span>
                        </p>
                        <p>
                          Updated by:{" "}
                          <span className="font-semibold text-[#334E68]">
                            {selectedRecord.updatedBy?.name || "Not available"}
                          </span>
                        </p>
                        <p>
                          Updated at:{" "}
                          <span className="font-semibold text-[#334E68]">
                            {selectedRecord.updatedAt
                              ? formatDate(selectedRecord.updatedAt)
                              : "Not available"}
                          </span>
                        </p>
                      </div>
                    </section>
                  </div>
                ) : (
                  <p className="py-8 text-center text-gray-500">
                    Medical record not found
                  </p>
                )}
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}
