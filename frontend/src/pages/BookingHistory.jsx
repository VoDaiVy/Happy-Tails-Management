import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Stethoscope, Clock, CheckCircle2, XCircle, Loader2,
  ChevronLeft, X, PawPrint, User, FileText, Pill, MessageSquare,
  AlertCircle, Activity, Thermometer, Heart, Wind
} from 'lucide-react';
import { getMyBookings, getMyPetsMedicalRecords, getMedicalRecordById } from '../api/bookingApi';


/* ───────── helpers ───────── */
const STATUS_MAP = {
  completed: { label: 'Đã xong', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  'in-progress': { label: 'Đang thực hiện', color: 'bg-amber-100 text-amber-700', icon: Loader2 },
  pending: { label: 'Đang chờ', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const RECORD_TYPE_MAP = {
  checkup: 'Khám tổng quát',
  vaccination: 'Tiêm phòng',
  treatment: 'Điều trị',
  surgery: 'Phẫu thuật',
  emergency: 'Cấp cứu',
  grooming: 'Làm đẹp',
  other: 'Khác',
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/* ───────── Status Badge ───────── */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon size={14} className={status === 'in-progress' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
};

/* ───────── Booking Card ───────── */
const BookingCard = ({ booking }) => {
  const pets = booking.items?.map(i => i.pet?.petName || i.pet?.name).filter(Boolean);
  const services = booking.items?.map(i => i.service?.name).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3"
    >
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <PawPrint size={20} className="text-[#FF8C42]" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">
              {pets?.length ? pets.join(', ') : 'Không rõ'}
            </p>
            <p className="text-xs text-slate-500">{booking.bookingNumber}</p>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* body */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <CalendarDays size={15} className="text-slate-400" />
          <span>{formatDate(booking.bookingDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Clock size={15} className="text-slate-400" />
          <span>{booking.bookingTime || '—'}</span>
        </div>
      </div>

      {/* services */}
      {services?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {services.map((s, i) => (
            <span key={i} className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-lg font-medium">{s}</span>
          ))}
        </div>
      )}

      {/* total */}
      <div className="flex justify-between items-center pt-2 border-t border-slate-50">
        <span className="text-xs text-slate-400">Tổng</span>
        <span className="font-bold text-[#FF8C42]">
          {booking.totalAmount?.toLocaleString('vi-VN')}đ
        </span>
      </div>
    </motion.div>
  );
};

/* ───────── Medical Record Card ───────── */
const MedicalRecordCard = ({ record, onViewDetail }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3"
  >
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Stethoscope size={20} className="text-blue-500" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm leading-tight">
            {record.userPet?.petName || record.userPet?.name || 'Thú cưng'}
          </p>
          <p className="text-xs text-slate-500">
            {RECORD_TYPE_MAP[record.recordType] || record.recordType}
          </p>
        </div>
      </div>
      <span className="text-xs text-slate-400">{formatDate(record.createdAt)}</span>
    </div>

    {/* Doctor */}
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <User size={15} className="text-slate-400" />
      <span>BS. {record.createdBy?.name || 'Không rõ'}</span>
    </div>

    {/* Diagnosis summary */}
    <p className="text-sm text-slate-600 line-clamp-2">{record.diagnosis}</p>

    <button
      onClick={() => onViewDetail(record._id)}
      className="mt-auto self-start flex items-center gap-1.5 text-sm font-semibold text-[#FF8C42] hover:text-orange-600 transition-colors cursor-pointer"
    >
      <FileText size={15} /> Xem chi tiết
    </button>
  </motion.div>
);

/* ───────── Section helper ───────── */
const SectionBlock = ({ icon: SectionIcon, title, children }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
      <SectionIcon size={16} className="text-[#FF8C42]" />
      {title}
    </div>
    <div className="pl-6 text-sm text-slate-600">{children}</div>
  </div>
);

/* ───────── Medical Record Detail Modal ───────── */
const MedicalDetailModal = ({ record, onClose }) => {
  if (!record) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Chi tiết Bệnh án</h3>
              <p className="text-xs text-slate-500">
                {record.userPet?.petName || record.userPet?.name} — {formatDate(record.createdAt)}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          {/* Modal body */}
          <div className="px-6 py-5 space-y-5">
            {/* Record type badge */}
            <span className="inline-block bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full">
              {RECORD_TYPE_MAP[record.recordType] || record.recordType}
            </span>

            {/* Vitals */}
            {record.vitals && (record.vitals.weight || record.vitals.temperature || record.vitals.heartRate || record.vitals.respiratoryRate) && (
              <div className="grid grid-cols-2 gap-3">
                {record.vitals.weight && (
                  <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                    <Activity size={16} className="text-emerald-500" />
                    <div>
                      <p className="text-[11px] text-slate-400">Cân nặng</p>
                      <p className="text-sm font-semibold text-slate-700">{record.vitals.weight} kg</p>
                    </div>
                  </div>
                )}
                {record.vitals.temperature && (
                  <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                    <Thermometer size={16} className="text-red-400" />
                    <div>
                      <p className="text-[11px] text-slate-400">Nhiệt độ</p>
                      <p className="text-sm font-semibold text-slate-700">{record.vitals.temperature}°C</p>
                    </div>
                  </div>
                )}
                {record.vitals.heartRate && (
                  <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                    <Heart size={16} className="text-pink-500" />
                    <div>
                      <p className="text-[11px] text-slate-400">Nhịp tim</p>
                      <p className="text-sm font-semibold text-slate-700">{record.vitals.heartRate} bpm</p>
                    </div>
                  </div>
                )}
                {record.vitals.respiratoryRate && (
                  <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                    <Wind size={16} className="text-sky-500" />
                    <div>
                      <p className="text-[11px] text-slate-400">Nhịp thở</p>
                      <p className="text-sm font-semibold text-slate-700">{record.vitals.respiratoryRate} lần/ph</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Condition / Symptoms */}
            <SectionBlock icon={AlertCircle} title="Triệu chứng / Tình trạng">
              <p className="whitespace-pre-line">{record.condition || '—'}</p>
            </SectionBlock>

            {/* Diagnosis */}
            <SectionBlock icon={Stethoscope} title="Chẩn đoán">
              <p className="whitespace-pre-line">{record.diagnosis || '—'}</p>
            </SectionBlock>

            {/* Treatment */}
            <SectionBlock icon={FileText} title="Phương pháp điều trị">
              <p className="whitespace-pre-line">{record.treatment || '—'}</p>
            </SectionBlock>

            {/* Medications */}
            {record.medications?.length > 0 && (
              <SectionBlock icon={Pill} title="Đơn thuốc">
                <div className="space-y-2">
                  {record.medications.map((med, i) => (
                    <div key={i} className="bg-orange-50 rounded-xl p-3">
                      <p className="font-semibold text-slate-700 text-sm">{med.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                        {med.dosage && <span>Liều: {med.dosage}</span>}
                        {med.frequency && <span>Tần suất: {med.frequency}</span>}
                        {med.duration && <span>Thời gian: {med.duration}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionBlock>
            )}

            {/* Doctor notes */}
            {record.notes && (
              <SectionBlock icon={MessageSquare} title="Lời dặn bác sĩ">
                <p className="whitespace-pre-line">{record.notes}</p>
              </SectionBlock>
            )}

            {/* Follow-up */}
            {record.followUpDate && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700">
                <CalendarDays size={16} />
                <span>Tái khám: <strong>{formatDate(record.followUpDate)}</strong></span>
              </div>
            )}

            {/* Doctor info */}
            <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
              Bác sĩ phụ trách: {record.createdBy?.name || '—'}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ───────── Filter Tabs for status ───────── */
const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Đang chờ' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'in-progress', label: 'Đang thực hiện' },
  { value: 'completed', label: 'Đã xong' },
  { value: 'cancelled', label: 'Đã hủy' },
];

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
const BookingHistory = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bookings'); // bookings | records
  const [statusFilter, setStatusFilter] = useState('all');

  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Medical Records state
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Modal state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* ── fetch bookings ── */
  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const data = await getMyBookings(statusFilter);
      setBookings(data.data?.bookings || data.data || []);
    } catch {
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab, fetchBookings]);

  /* ── fetch medical records ── */
  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const data = await getMyPetsMedicalRecords();
      setRecords(data.data?.records || data.data || []);
    } catch {
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'records') fetchRecords();
  }, [activeTab, fetchRecords]);

  /* ── view detail ── */
  const handleViewDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const data = await getMedicalRecordById(id);
      setSelectedRecord(data.data?.record || data.data);
    } catch {
      setSelectedRecord(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  /* ── tab config ── */
  const tabs = [
    { key: 'bookings', label: 'Lịch sử Đặt lịch', icon: CalendarDays },
    { key: 'records', label: 'Hồ sơ Bệnh án', icon: Stethoscope },
  ];

  const isLoading = activeTab === 'bookings' ? loadingBookings : loadingRecords;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back navigation + title */}
      <div className="bg-white border-b border-slate-100">
        <div className="container mx-auto px-6 py-5 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ChevronLeft size={22} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Lịch sử & Bệnh án</h1>
            <p className="text-sm text-slate-500">Quản lý lịch đặt và hồ sơ sức khỏe thú cưng</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 max-w-5xl">
        {/* ── Main Tabs ── */}
        <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer
                  ${isActive
                    ? 'bg-[#FF8C42] text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Status filter (only for bookings) ── */}
        {activeTab === 'bookings' && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer
                  ${statusFilter === f.value
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin mb-3" />
            <p className="text-sm">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'bookings' && (
              <motion.div
                key="bookings"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {bookings.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="Chưa có lịch đặt nào"
                    desc="Bạn chưa đặt lịch dịch vụ nào. Hãy khám phá các dịch vụ của chúng tôi!"
                  />
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {bookings.map((b) => (
                      <BookingCard key={b._id} booking={b} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'records' && (
              <motion.div
                key="records"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {records.length === 0 ? (
                  <EmptyState
                    icon={Stethoscope}
                    title="Chưa có hồ sơ bệnh án"
                    desc="Thú cưng của bạn chưa có hồ sơ bệnh án nào."
                  />
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {records.map((r) => (
                      <MedicalRecordCard key={r._id} record={r} onViewDetail={handleViewDetail} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── Loading overlay for detail ── */}
      {loadingDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
            <Loader2 size={28} className="animate-spin text-[#FF8C42]" />
            <p className="text-sm text-slate-600">Đang tải bệnh án...</p>
          </div>
        </div>
      )}

      {/* ── Medical Detail Modal ── */}
      {selectedRecord && (
        <MedicalDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
};

/* ───────── Empty State ───────── */
const EmptyState = ({ icon: EmptyIcon, title, desc }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <EmptyIcon size={28} className="text-slate-400" />
    </div>
    <h3 className="text-lg font-bold text-slate-700 mb-1">{title}</h3>
    <p className="text-sm text-slate-400 max-w-xs">{desc}</p>
  </div>
);

export default BookingHistory;
