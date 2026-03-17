import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Clock3,
  ClipboardList,
  Image as ImageIcon,
  PawPrint,
  Pill,
  Sparkles,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react';

const RECORD_TYPE_LABELS = {
  checkup: 'Checkup',
  vaccination: 'Vaccination',
  treatment: 'Treatment',
  surgery: 'Surgery',
  emergency: 'Emergency',
  grooming: 'Grooming',
  other: 'Other'
};

const STAGE_META = {
  received: {
    label: 'Check-in',
    chip: 'bg-sky-100 text-sky-700',
    panel: 'from-sky-50 via-white to-cyan-50',
    border: 'border-sky-200',
    dot: 'bg-sky-500'
  },
  processing: {
    label: 'Processing',
    chip: 'bg-amber-100 text-amber-700',
    panel: 'from-amber-50 via-white to-orange-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500'
  },
  completed: {
    label: 'Check-out',
    chip: 'bg-emerald-100 text-emerald-700',
    panel: 'from-emerald-50 via-white to-teal-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500'
  }
};

const formatDate = (value, withTime = false) => {
  if (!value) return 'No date';

  const date = new Date(value);
  return date.toLocaleString('en-US', withTime
    ? {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    : {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
};

const getDoctorName = (record) =>
  record?.veterinarian || record?.updatedBy?.name || record?.createdBy?.name || 'Care Team';

const getMedicationSummary = (record) => {
  if (!Array.isArray(record?.medications) || record.medications.length === 0) {
    return 'No medications recorded';
  }

  if (typeof record.medications[0] === 'string') {
    return record.medications.join(', ');
  }

  const names = record.medications
    .map((item) => item?.name)
    .filter(Boolean);

  return names.length > 0 ? names.join(', ') : 'No medications recorded';
};

const buildStageSections = (record) => {
  const sections = [
    {
      key: 'received',
      title: 'Check-in',
      subtitle: 'Pet condition when arriving',
      photos: Array.isArray(record?.receivedPhotos) ? record.receivedPhotos.filter(Boolean) : []
    },
    {
      key: 'completed',
      title: 'Check-out',
      subtitle: 'Pet condition after finishing',
      photos: Array.isArray(record?.completedPhotos) ? record.completedPhotos.filter(Boolean) : []
    }
  ];

  const hasStagePhotos = sections.some((section) => section.photos.length > 0);
  if (hasStagePhotos) {
    return sections;
  }

  const fallbackPhotos = Array.isArray(record?.images) ? record.images.filter(Boolean) : [];
  return [
    {
      key: 'gallery',
      title: 'Gallery',
      subtitle: 'Record photos',
      photos: fallbackPhotos
    }
  ];
};

const StagePhotoPanel = ({ section, onPreview }) => {
  const meta = STAGE_META[section.key] || {
    panel: 'from-slate-50 via-white to-slate-50',
    border: 'border-slate-200',
    chip: 'bg-slate-100 text-slate-700'
  };
  const heroPhoto = section.photos[0] || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl border ${meta.border} bg-linear-to-br ${meta.panel} p-4`}
    >
      <div className="absolute -top-10 right-0 h-24 w-24 rounded-full bg-white/70 blur-2xl" />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-800">{section.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{section.subtitle}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${meta.chip}`}>
            {section.photos.length} image(s)
          </span>
        </div>

        {heroPhoto ? (
          <button
            type="button"
            onClick={() => onPreview(heroPhoto)}
            className="block w-full overflow-hidden rounded-[20px] border border-white/70 shadow-sm"
          >
            <img src={heroPhoto} alt={`${section.title} preview`} className="h-56 w-full object-cover transition-transform duration-500 hover:scale-[1.03]" loading="lazy" />
          </button>
        ) : (
          <div className="flex h-56 items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-white/70 text-center">
            <div>
              <ImageIcon size={24} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">No images yet</p>
              <p className="text-xs text-slate-400 mt-1">This stage has no uploaded photos.</p>
            </div>
          </div>
        )}

        {section.photos.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {section.photos.slice(1, 5).map((photo, index) => (
              <button
                key={`${section.key}-${index}`}
                type="button"
                onClick={() => onPreview(photo)}
                className="overflow-hidden rounded-xl border border-white/80 bg-white shadow-sm"
              >
                <img src={photo} alt={`${section.title} ${index + 2}`} className="h-16 w-full object-cover transition-transform duration-300 hover:scale-105" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ImageLightbox = ({ imageUrl, onClose }) => (
  <AnimatePresence>
    {imageUrl && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-90 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X size={18} />
        </button>
        <motion.img
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          src={imageUrl}
          alt="Medical record preview"
          className="max-h-[85vh] max-w-full rounded-[28px] shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        />
      </motion.div>
    )}
  </AnimatePresence>
);

const MedicalRecordShowcase = ({ record }) => {
  const [activeImage, setActiveImage] = useState(null);

  const stageSections = useMemo(() => buildStageSections(record), [record]);
  const timeline = useMemo(() => {
    const history = Array.isArray(record?.stageHistory) ? [...record.stageHistory] : [];
    return history.sort((left, right) => new Date(left.updatedAt) - new Date(right.updatedAt));
  }, [record]);

  const totalPhotos = useMemo(
    () => stageSections.reduce((sum, section) => sum + section.photos.length, 0),
    [stageSections],
  );

  const workflowMeta = STAGE_META[record?.workflowStage] || {
    label: record?.workflowStage || 'Active',
    chip: 'bg-slate-100 text-slate-700'
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-[30px] border border-[#F0DCD0] bg-linear-to-br from-[#FFF5EE] via-white to-[#EEF8F3] p-5 shadow-[0_24px_80px_rgba(38,52,68,0.08)]">
        <div className="absolute -top-12 right-0 h-36 w-36 rounded-full bg-[#D97853]/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#5BA88C]/15 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#D97853] shadow-sm">
                <Sparkles size={12} /> Visual Medical Story
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 leading-tight">{record?.diagnosis || 'Medical Record'}</h3>
                <p className="mt-1 text-sm text-slate-500 max-w-2xl">
                  {record?.condition || record?.treatment || 'Track the pet condition from arrival to completion with visual evidence.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
                {RECORD_TYPE_LABELS[record?.recordType] || record?.recordType || 'Record'}
              </span>
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${workflowMeta.chip}`}>
                {workflowMeta.label}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm border border-white/70">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                <PawPrint size={14} /> Pet
              </div>
              <p className="mt-2 text-sm font-bold text-slate-800">{record?.userPet?.petName || 'Pet'}</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm border border-white/70">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                <UserRound size={14} /> Care By
              </div>
              <p className="mt-2 text-sm font-bold text-slate-800">Dr. {getDoctorName(record)}</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm border border-white/70">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                <CalendarDays size={14} /> Record Date
              </div>
              <p className="mt-2 text-sm font-bold text-slate-800">{formatDate(record?.createdAt || record?.date)}</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm border border-white/70">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                <ImageIcon size={14} /> Visual Proof
              </div>
              <p className="mt-2 text-sm font-bold text-slate-800">{totalPhotos} image(s)</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/70 p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-black text-slate-800">Before / After Comparison</p>
                <p className="text-xs text-slate-500 mt-1">A visual snapshot between check-in and check-out.</p>
              </div>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                {stageSections.some((section) => section.key === 'received') && stageSections.some((section) => section.key === 'completed')
                  ? 'Transformation Ready'
                  : 'In Progress'}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {stageSections.map((section) => (
                <StagePhotoPanel key={section.key} section={section} onPreview={setActiveImage} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-[26px] border border-[#EADFD8] bg-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-800 font-black text-sm mb-3">
                <ClipboardList size={16} className="text-[#D97853]" /> Clinical Notes
              </div>
              <p className="text-sm leading-7 text-slate-600 whitespace-pre-wrap">
                {record?.notes || record?.treatment || 'No detailed notes provided for this record.'}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <Pill size={14} /> Medications
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{getMedicationSummary(record)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <Stethoscope size={14} /> Workflow Stage
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{workflowMeta.label}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-[#DDE9E3] bg-linear-to-br from-[#F6FBF8] via-white to-[#F7FAFF] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-800 font-black text-sm mb-3">
                <Clock3 size={16} className="text-[#5BA88C]" /> Stage Timeline
              </div>

              {timeline.length > 0 ? (
                <div className="space-y-4">
                  {timeline.map((entry, index) => {
                    const meta = STAGE_META[entry.stage] || STAGE_META.received;
                    return (
                      <div key={`${entry.stage}-${index}`} className="relative pl-6">
                        {index < timeline.length - 1 && (
                          <span className="absolute left-2.25 top-5 h-[calc(100%+8px)] w-px bg-slate-200" />
                        )}
                        <span className={`absolute left-0 top-1.5 h-4.5 w-4.5 rounded-full border-4 border-white shadow-sm ${meta.dot}`} />
                        <div className="rounded-2xl bg-white p-3 border border-slate-100 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-slate-800">{meta.label}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.chip}`}>
                              {formatDate(entry.updatedAt, true)}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="mt-2 text-xs leading-6 text-slate-500 whitespace-pre-wrap">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-500">No timeline events yet</p>
                  <p className="text-xs text-slate-400 mt-1">Stage updates will appear here as staff check-in and check-out the pet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ImageLightbox imageUrl={activeImage} onClose={() => setActiveImage(null)} />
    </>
  );
};

export default MedicalRecordShowcase;