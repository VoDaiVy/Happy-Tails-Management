import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Calendar,
  ChevronLeft,
  ClipboardList,
  Image as ImageIcon,
  Heart,
  Loader2,
  Palette,
  PawPrint,
  Sparkles,
  Stethoscope,
  Syringe,
  Weight
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { getPetById } from '../api/profileApi';
import { getMyPetsMedicalRecords } from '../api/medicalRecordApi';

const RECORD_TYPE_LABELS = {
  checkup: 'Checkup',
  vaccination: 'Vaccination',
  treatment: 'Treatment',
  surgery: 'Surgery',
  emergency: 'Emergency',
  grooming: 'Grooming',
  other: 'Other'
};

const STAGE_LABELS = {
  received: 'Check-in',
  processing: 'Processing',
  completed: 'Check-out'
};

const formatDate = (value) => {
  if (!value) return 'No date';

  return new Date(value).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getAge = (dob) => {
  if (!dob) return null;

  const birth = new Date(dob);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();

  if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
  return 'Newborn';
};

const getMedicalRecordType = (record) => record?.recordType || record?.type || 'other';

const getMedicalRecordDate = (record) => record?.createdAt || record?.date || null;

const getMedicalDoctorName = (record) => {
  if (record?.veterinarian) return record.veterinarian;
  if (record?.createdBy?.name) return record.createdBy.name;
  if (record?.updatedBy?.name) return record.updatedBy.name;
  return '';
};

const getRecordPhotoCount = (record) => {
  const sources = [record?.receivedPhotos, record?.processingPhotos, record?.completedPhotos, record?.images];
  return sources.reduce(
    (total, photos) => total + (Array.isArray(photos) ? photos.filter(Boolean).length : 0),
    0,
  );
};

const getStagePhotos = (record, key) =>
  Array.isArray(record?.[key]) ? record[key].filter(Boolean) : [];

const SummaryTile = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
      <Icon size={14} /> {label}
    </div>
    <p className="mt-2 text-sm font-black text-slate-800">{value || 'No information'}</p>
  </div>
);

const SectionCard = ({ title, subtitle, count, children }) => (
  <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(38,52,68,0.06)] backdrop-blur-sm">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-black text-slate-800">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {typeof count === 'number' && (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {count}
        </span>
      )}
    </div>
    {children}
  </div>
);

const EmptyPanel = ({ title, description }) => (
  <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 p-10 text-center shadow-sm">
    <ClipboardList size={28} className="mx-auto mb-3 text-slate-300" />
    <h3 className="text-lg font-black text-slate-700">{title}</h3>
    <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">{description}</p>
  </div>
);

const StagePhotosBlock = ({ title, photos, tone }) => {
  const tones = {
    checkin: {
      border: 'border-sky-200',
      bg: 'bg-sky-50/70',
      badge: 'bg-sky-100 text-sky-700'
    },
    checkout: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/70',
      badge: 'bg-emerald-100 text-emerald-700'
    }
  };

  const style = tones[tone] || tones.checkin;

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-black text-slate-800">{title}</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${style.badge}`}>
          {photos.length} image(s)
        </span>
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((url, index) => (
            <a
              key={`${title}-${index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-xl border border-white/80 bg-white shadow-sm"
            >
              <img src={url} alt={`${title} ${index + 1}`} className="h-28 w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 py-8 text-center">
          <ImageIcon size={20} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No images yet</p>
        </div>
      )}
    </div>
  );
};

const MedicalRecordDetailPanel = ({ record }) => {
  const checkInPhotos = getStagePhotos(record, 'receivedPhotos');
  const checkOutPhotos = getStagePhotos(record, 'completedPhotos');
  const fallbackPhotos = getStagePhotos(record, 'images');
  const useFallback = checkInPhotos.length === 0 && checkOutPhotos.length === 0 && fallbackPhotos.length > 0;
  const recordType = getMedicalRecordType(record);
  const recordDate = getMedicalRecordDate(record);
  const doctorName = getMedicalDoctorName(record);
  const stageLabel = STAGE_LABELS[record?.workflowStage] || record?.workflowStage || 'Record';

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(38,52,68,0.06)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-slate-800">{record?.diagnosis || 'Medical Record Detail'}</h3>
          <p className="mt-1 text-sm text-slate-500">{record?.condition || 'No condition notes provided.'}</p>
        </div>
        <span className="rounded-full bg-[#FFF4EC] px-3 py-1 text-xs font-bold text-[#D97853]">
          {stageLabel}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {RECORD_TYPE_LABELS[recordType] || recordType}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {formatDate(recordDate)}
        </span>
        {doctorName && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            Dr. {doctorName}
          </span>
        )}
      </div>

      {(record?.treatment || record?.notes) && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {record?.notes || record?.treatment || 'No notes provided.'}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <StagePhotosBlock title="Check-in Photos" photos={checkInPhotos} tone="checkin" />
        <StagePhotosBlock title="Check-out Photos" photos={checkOutPhotos} tone="checkout" />
      </div>

      {useFallback && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="mb-3 text-sm font-black text-slate-800">Additional Photos</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {fallbackPhotos.map((url, index) => (
              <a
                key={`fallback-${index}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-xl border border-white/80 bg-white shadow-sm"
              >
                <img src={url} alt={`Additional ${index + 1}`} className="h-24 w-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PetDetailPage = () => {
  const navigate = useNavigate();
  const { petId } = useParams();
  const { user } = useAuth();

  const [petPayload, setPetPayload] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  useEffect(() => {
    const fetchPetDetail = async () => {
      if (!petId) return;

      setLoading(true);
      setError('');

      try {
        const [petRes, medicalRes] = await Promise.all([
          getPetById(petId),
          getMyPetsMedicalRecords({ petId }).catch(() => null)
        ]);

        const nextPetPayload = petRes?.data || petRes || null;
        const nextRecords =
          medicalRes?.data?.data?.records ||
          medicalRes?.data?.records ||
          nextPetPayload?.pet?.medicalRecords ||
          [];

        setPetPayload(nextPetPayload);
        setRecords(Array.isArray(nextRecords) ? nextRecords : []);
      } catch (err) {
        setPetPayload(null);
        setRecords([]);
        setError(err?.response?.data?.message || 'Unable to load pet details.');
      } finally {
        setLoading(false);
      }
    };

    fetchPetDetail();
  }, [petId]);

  useEffect(() => {
    if (!records.length) {
      setSelectedRecordId(null);
      return;
    }

    const stillExists = records.some((record) => record._id === selectedRecordId);
    if (!stillExists) {
      setSelectedRecordId(records[0]._id);
    }
  }, [records, selectedRecordId]);

  const pet = petPayload?.pet || null;
  const healthSummary = petPayload?.healthSummary || null;
  const vaccinations = Array.isArray(pet?.vaccinations) ? pet.vaccinations : [];
  const selectedRecord = useMemo(
    () => records.find((record) => record._id === selectedRecordId) || records[0] || null,
    [records, selectedRecordId],
  );
  const petAge = getAge(pet?.dateOfBirth) || pet?.age || null;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#D97853]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3436]">
      <Navbar user={user} />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-32">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/pets')}
              className="rounded-2xl bg-white/70 p-2.5 shadow-sm border border-white/80 hover:bg-white transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#D97853]">
                <Sparkles size={14} /> Pet Profile
              </div>
              <h1 className="text-4xl font-black tracking-tight bg-linear-to-r from-[#D97853] to-[#c46a47] bg-clip-text text-transparent">
                {pet?.petName || 'Pet Detail'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review pet information and browse each medical record directly on one page.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="animate-spin text-[#D97853]" size={36} />
          </div>
        ) : !pet ? (
          <EmptyPanel
            title="Pet not found"
            description={error || 'This pet could not be loaded or may no longer be available in your account.'}
          />
        ) : (
          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-4xl border border-[#F0DCD0] bg-linear-to-br from-[#FFF4EC] via-white to-[#EEF8F3] p-5 sm:p-6 shadow-[0_24px_80px_rgba(38,52,68,0.08)]"
            >
              <div className="absolute -top-12 right-0 h-40 w-40 rounded-full bg-[#D97853]/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-[#5BA88C]/10 blur-3xl" />

              <div className="relative grid gap-6 xl:grid-cols-12 xl:items-start">
                <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/70 shadow-sm xl:col-span-3">
                  {pet.avatar ? (
                    <img
                      src={pet.avatar}
                      alt={pet.petName}
                      className="h-56 w-full object-cover sm:h-64 lg:h-72 xl:h-64 2xl:h-72"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center bg-linear-to-br from-orange-50 via-amber-50 to-yellow-50 sm:h-64 lg:h-72 xl:h-64 2xl:h-72">
                      <div className="text-center">
                        <PawPrint size={36} className="mx-auto mb-3 text-[#D97853]" />
                        <p className="text-lg font-black capitalize text-[#D97853]">{pet.petType || 'Pet'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-5 xl:col-span-9">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-3xl font-black text-slate-800">{pet.petName}</h2>
                        <span className="rounded-full bg-[#D97853] px-3 py-1 text-xs font-bold text-white capitalize">
                          {pet.petType || 'Pet'}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          pet.gender === 'male'
                            ? 'bg-blue-100 text-blue-700'
                            : pet.gender === 'female'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          {pet.gender || 'unknown'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {[pet.breed, petAge, pet.color].filter(Boolean).join(' • ') || 'No additional profile information'}
                      </p>
                    </div>

                    {pet.petID && (
                      <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pet ID</p>
                        <p className="mt-1 text-sm font-black text-slate-700">{pet.petID}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryTile icon={Weight} label="Weight" value={pet.weight ? `${pet.weight} kg` : 'Unknown'} />
                    <SummaryTile icon={Calendar} label="Age" value={petAge || 'Unknown'} />
                    <SummaryTile icon={Palette} label="Color" value={pet.color || 'Unknown'} />
                    <SummaryTile icon={Heart} label="Special Needs" value={pet.specialNeeds || 'None'} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-center">
                      <div className="text-2xl font-black text-emerald-700">{records.length}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">Medical Records</div>
                    </div>
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/90 p-4 text-center">
                      <div className="text-2xl font-black text-blue-700">{healthSummary?.totalVaccinations ?? vaccinations.length}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-600">Vaccinations</div>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-center">
                      <div className="text-2xl font-black text-amber-700">{healthSummary?.upcomingVaccinations ?? 0}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Upcoming Shots</div>
                    </div>
                  </div>

                  {(pet.notes || pet.specialNeeds) && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-white/80 p-4 border border-white/70 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                          <Activity size={14} /> Care Notes
                        </div>
                        <p className="text-sm leading-7 text-slate-600 whitespace-pre-wrap">{pet.notes || 'No notes recorded.'}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-4 border border-white/70 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                          <Heart size={14} /> Special Needs
                        </div>
                        <p className="text-sm leading-7 text-slate-600 whitespace-pre-wrap">{pet.specialNeeds || 'No special needs recorded.'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>

            <div className="grid gap-6 xl:grid-cols-12">
              <div className="xl:col-span-4 2xl:col-span-3">
                <SectionCard
                  title="Medical Records"
                  subtitle="Pick a record to review check-in and check-out clearly."
                  count={records.length}
                >
                  {records.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-400">
                      This pet does not have any medical records yet.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-155 overflow-y-auto pr-1">
                      {records.map((record, index) => {
                        const type = getMedicalRecordType(record);
                        const recordDate = getMedicalRecordDate(record);
                        const doctorName = getMedicalDoctorName(record);
                        const photoCount = getRecordPhotoCount(record);
                        const isActive = selectedRecord?._id === record._id;
                        const stage = record?.workflowStage;

                        const activeCardClass =
                          stage === 'received'
                            ? 'border-sky-300 bg-sky-50/40 shadow-md shadow-sky-100/60'
                            : stage === 'completed'
                              ? 'border-emerald-300 bg-emerald-50/40 shadow-md shadow-emerald-100/60'
                              : 'border-[#D97853] bg-[#FFF4EC] shadow-md shadow-orange-100/60';

                        const stageBadgeClass =
                          stage === 'received'
                            ? 'bg-sky-100 text-sky-700'
                            : stage === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600';

                        return (
                          <button
                            key={record._id || index}
                            type="button"
                            onClick={() => setSelectedRecordId(record._id)}
                            className={`w-full rounded-2xl border p-4 text-left transition-all ${
                              isActive
                                ? activeCardClass
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-slate-800">
                                  {record.diagnosis || `Medical Record ${index + 1}`}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {RECORD_TYPE_LABELS[type] || type} • {formatDate(recordDate)}
                                </p>
                              </div>
                              <span className={`rounded-full whitespace-nowrap px-2.5 py-1 text-[11px] font-bold ${stageBadgeClass}`}>
                                {STAGE_LABELS[record.workflowStage] || record.workflowStage || 'Record'}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                              {doctorName && (
                                <span className="rounded-full bg-white px-2.5 py-1 border border-slate-200">
                                  Dr. {doctorName}
                                </span>
                              )}
                              <span className="rounded-full bg-white px-2.5 py-1 border border-slate-200">
                                {photoCount} image(s)
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              </div>

              <div className="space-y-6 xl:col-span-8 2xl:col-span-9">
                {selectedRecord ? (
                  <>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <Stethoscope size={16} className="text-[#D97853]" />
                      Selected medical record detail
                    </div>
                    <MedicalRecordDetailPanel record={selectedRecord} />
                  </>
                ) : (
                  <EmptyPanel
                    title="No medical record selected"
                    description="Choose a medical record from the list on the left. If there is no record yet, it will appear here once staff create one for this pet."
                  />
                )}
              </div>
            </div>

            <SectionCard
              title="Vaccination History"
              subtitle="Quick view of vaccination events for this pet."
              count={vaccinations.length}
            >
              {vaccinations.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-400">
                  No vaccination records yet.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {vaccinations.map((vaccination, index) => (
                    <div key={`${vaccination.name || 'vaccination'}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <Syringe size={14} className="text-emerald-600" />
                            {vaccination.name || 'Vaccination'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(vaccination.date)}</p>
                        </div>
                        {vaccination.nextDueDate && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            Next {formatDate(vaccination.nextDueDate)}
                          </span>
                        )}
                      </div>
                      {vaccination.veterinarian && (
                        <p className="mt-3 text-xs font-semibold text-slate-500">Dr. {vaccination.veterinarian}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetDetailPage;