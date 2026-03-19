import { useCallback, useEffect, useMemo, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import useScrollLock from "../../../hooks/useScrollLock";
import {
  Activity,
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  PawPrint,
  PenSquare,
  Plus,
  RotateCcw,
  Search,
  Stethoscope,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import {
  createMedicalRecord,
  getAllMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  updateMedicalRecordStage,
} from "../../../api/medicalRecordApi";
import { getAllBookings } from "../../../api/bookingApi";
import { uploadMultipleImages } from "../../../api/uploadApi";
import AdminFilterBar from "../../../components/dashboard/AdminFilterBar";
import { z } from "zod";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const recordSchema = z.object({
  petId: z.string().min(1, "Pet is required."),
  recordType: z.string().min(1, "Record type is required."),
  visitDate: z.string().min(1, "Visit date is required."),
  assignedStaffId: z.string().min(1, "Assigned staff is required."),
  status: z.string().min(1, "Status is required."),
  condition: z
    .string()
    .trim()
    .min(1, "Initial condition is required.")
    .max(500, "Max 500 characters."),
  diagnosis: z
    .string()
    .trim()
    .min(1, "Diagnosis is required.")
    .max(500, "Max 500 characters."),
  treatment: z
    .string()
    .trim()
    .min(1, "Treatment plan is required.")
    .max(500, "Max 500 characters."),
  notes: z.string().trim().max(1000, "Max 1000 characters.").optional(),
});

const META_START = "[HT_META]";
const META_END = "[/HT_META]";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const RECORD_TYPE_OPTIONS = [
  { value: "checkup", label: "Checkup" },
  { value: "vaccination", label: "Vaccination" },
  { value: "treatment", label: "Treatment" },
  { value: "grooming", label: "Grooming Care Note" },
  { value: "surgery", label: "Surgery" },
  { value: "emergency", label: "Emergency" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  "Active",
  "In Progress",
  "Completed",
  "Follow-up Needed",
  "Critical",
  "Archived",
];

const WORKFLOW_STAGE_ORDER = {
  received: 1,
  processing: 2,
  completed: 3,
};

const WORKFLOW_STAGE_LABEL = {
  received: "Stage 1 - Before Service",
  processing: "Stage 2 - During Service",
  completed: "Stage 3 - After Service",
};

const STATUS_STYLE = {
  Active: "border border-[#BED4F8] bg-[#ECF4FF] text-[#1D4E89]",
  "In Progress": "border border-[#F8D59B] bg-[#FFF5E8] text-[#B45309]",
  Completed: "border border-[#B9E4C9] bg-[#ECFDF3] text-[#166534]",
  "Follow-up Needed": "border border-[#F3DBA2] bg-[#FFF8E8] text-[#9A6700]",
  Critical: "border border-[#F6B9B9] bg-[#FFF1F1] text-[#B42318]",
  Archived: "border border-[#D6DEE7] bg-[#EEF2F7] text-[#475569]",
};

const PROGRESS_STYLE = {
  received: "bg-[#ECF4FF] text-[#1D4E89] border border-[#C7DCF8]",
  processing: "bg-[#FFF5E8] text-[#B45309] border border-[#F3D6A6]",
  completed: "bg-[#ECFDF3] text-[#166534] border border-[#B9E4C9]",
};

const STAGE_LIST = ["received", "processing", "completed"];

const CustomSelect = ({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  isOpen,
  setIsOpen,
  rightIcon: RightIcon = MoreVertical,
  up = false,
  disabled = false,
}) => (
  <div className={`relative flex-col flex ${isOpen ? "z-[60]" : "z-10"}`}>
    {label && (
      <label className="block text-xs font-bold uppercase tracking-widest text-[#2D3436]/60 mb-1.5">
        {label}
      </label>
    )}

    <div
      className={`flex items-center justify-between px-4 py-3 bg-[#FDFBF7] border ${isOpen ? "border-[#D97853]" : "border-[#2D3436]/10"} rounded-2xl cursor-pointer hover:border-[#D97853] transition-all ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      onClick={(e) => {
        if (!disabled) {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }
      }}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon
            size={16}
            className={isOpen ? "text-[#D97853]" : "text-[#2D3436]/40"}
          />
        )}
        <span className="text-sm font-medium text-[#2D3436]">{value}</span>
      </div>
      <RightIcon
        size={14}
        className={`text-[#D97853] transition-transform ${isOpen && RightIcon === MoreVertical ? "rotate-180" : ""}`}
      />
    </div>

    <AnimatePresence>
      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <Motion.div
            initial={{ opacity: 0, y: up ? 8 : -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: up ? 8 : -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${up ? "bottom-full mb-2" : "top-full mt-2"} left-0 w-full bg-[#FDFBF7] rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#2D3436]/5 overflow-hidden z-50 py-1.5 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
          >
            {options.map((opt, idx) => {
              const isSelected = value === opt.value || value === opt;
              return (
                <div
                  key={idx}
                  className={`px-4 py-2.5 text-[14px] cursor-pointer transition-colors ${!isSelected ? "text-[#2D3436]/70 hover:bg-[#2D3436]/5 font-medium" : "border-l-[3px] border-[#D97853] bg-[#D97853]/10 text-[#D97853] font-bold"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.value || opt);
                    setIsOpen(false);
                  }}
                >
                  {opt.label || opt}
                </div>
              );
            })}
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  </div>
);

const getApiErrorMessage = (error, fallback = "Request failed") => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const parseMedicalRows = (response) => {
  if (Array.isArray(response?.data?.data?.records))
    return response.data.data.records;
  if (Array.isArray(response?.data?.records)) return response.data.records;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const parseBookingRows = (response) => {
  if (Array.isArray(response?.data?.bookings)) return response.data.bookings;
  if (Array.isArray(response?.bookings)) return response.bookings;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const readMetaFromNotes = (rawNotes = "") => {
  const value = String(rawNotes || "");
  const startIdx = value.lastIndexOf(META_START);
  const endIdx = value.lastIndexOf(META_END);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return { cleanNotes: value.trim(), meta: {} };
  }

  const jsonText = value.slice(startIdx + META_START.length, endIdx).trim();

  let meta = {};
  try {
    meta = JSON.parse(jsonText);
  } catch {
    meta = {};
  }

  const cleanNotes =
    `${value.slice(0, startIdx)} ${value.slice(endIdx + META_END.length)}`
      .trim()
      .replace(/\s{2,}/g, " ");

  return { cleanNotes, meta };
};

const writeMetaToNotes = (cleanNotes, meta) => {
  const cleaned = String(cleanNotes || "").trim();
  const payload = JSON.stringify(meta || {});
  if (!cleaned) return `${META_START}${payload}${META_END}`;
  return `${cleaned}\n${META_START}${payload}${META_END}`;
};

const _formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateOnly = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const sameDate = (left, right) => {
  const a = new Date(left);
  const b = new Date(right);

  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const getRecordTypeLabel = (recordType) => {
  const found = RECORD_TYPE_OPTIONS.find((item) => item.value === recordType);
  return found?.label || "Other";
};

const getStageLatestNote = (record, stage) => {
  const history = Array.isArray(record?.stageHistory)
    ? record.stageHistory
    : [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const row = history[index];
    if (row?.stage === stage && String(row?.notes || "").trim()) {
      return String(row.notes).trim();
    }
  }
  return "";
};

const deriveStatus = (record, cleanNotes, meta) => {
  const isArchived =
    meta?.archived === true ||
    String(meta?.archived || "").toLowerCase() === "true" ||
    String(meta?.status || "").toLowerCase() === "archived";

  if (isArchived) return "Archived";

  const raw =
    `${record?.condition || ""} ${record?.diagnosis || ""} ${cleanNotes || ""}`.toLowerCase();
  const hasCriticalText = /critical|urgent|severe|danger/.test(raw);
  if (record?.recordType === "emergency" || hasCriticalText) {
    return "Critical";
  }

  if (record?.workflowStage === "completed") {
    if (record?.followUpDate || meta?.reminder) return "Follow-up Needed";
    return "Completed";
  }

  if (record?.workflowStage === "processing") {
    return "In Progress";
  }

  return "Active";
};

const normalizeRecord = (record) => {
  const { cleanNotes, meta } = readMetaFromNotes(record?.notes || "");

  const visitDate = meta?.visitDate || record?.createdAt || null;
  const assignedStaffId =
    meta?.assignedStaffId ||
    record?.updatedBy?._id ||
    record?.createdBy?._id ||
    "";
  const assignedStaffName =
    meta?.assignedStaffName ||
    record?.updatedBy?.name ||
    record?.createdBy?.name ||
    "Unassigned";

  const status = deriveStatus(record, cleanNotes, meta);

  return {
    ...record,
    _cleanNotes: cleanNotes,
    _meta: meta,
    _status: status,
    _visitDate: visitDate,
    _assignedStaffId: String(assignedStaffId || ""),
    _assignedStaffName: assignedStaffName,
    _progressLabel:
      record?.workflowStage === "completed"
        ? "Stage 3 Completed"
        : record?.workflowStage === "processing"
          ? "Stage 2"
          : "Stage 1",
    _stageNotes: {
      received: getStageLatestNote(record, "received"),
      processing: getStageLatestNote(record, "processing"),
      completed: getStageLatestNote(record, "completed"),
    },
  };
};

const getCurrentStaff = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      id: String(user?._id || user?.id || "current-staff"),
      name: user?.name || user?.email || "Current Staff",
    };
  } catch {
    return { id: "current-staff", name: "Current Staff" };
  }
};

const getDefaultForm = () => {
  const staff = getCurrentStaff();
  return {
    id: "",
    petId: "",
    ownerId: "",
    ownerName: "",
    ownerEmail: "",
    recordType: "checkup",
    visitDate: new Date().toISOString().slice(0, 10),
    assignedStaffId: staff.id,
    assignedStaffName: staff.name,
    condition: "",
    diagnosis: "",
    treatment: "",
    notes: "",
    followUpDate: "",
    reminder: false,
    status: "Active",
    stageDocs: {
      received: { note: "", files: [], existing: [] },
      processing: { note: "", files: [], existing: [] },
      completed: { note: "", files: [], existing: [] },
    },
  };
};

const statusToWorkflow = (statusValue) => {
  if (statusValue === "Completed" || statusValue === "Archived")
    return "completed";
  if (
    statusValue === "In Progress" ||
    statusValue === "Follow-up Needed" ||
    statusValue === "Critical"
  ) {
    return "processing";
  }
  return "received";
};

const buildPetOptions = (records, bookings) => {
  const map = new Map();

  records.forEach((record) => {
    const petId = String(record?.userPet?._id || "");
    if (!petId) return;

    if (!map.has(petId)) {
      map.set(petId, {
        petId,
        petName: record?.userPet?.petName || "Unnamed Pet",
        petType: record?.userPet?.petType || "-",
        breed: record?.userPet?.breed || "-",
        ownerId: String(record?.user?._id || ""),
        ownerName: record?.user?.name || "Unknown Owner",
        ownerEmail: record?.user?.email || "",
      });
    }
  });

  bookings.forEach((booking) => {
    const ownerId = String(booking?.customer?._id || booking?.customer || "");
    const ownerName = booking?.customer?.name || "Guest Customer";
    const ownerEmail = booking?.customer?.email || "";

    (booking?.items || []).forEach((item) => {
      const pet = item?.pet;
      const petId = String(pet?._id || "");
      if (!petId) return;

      if (!map.has(petId)) {
        map.set(petId, {
          petId,
          petName: pet?.petName || "Unnamed Pet",
          petType: pet?.petType || "-",
          breed: pet?.breed || "-",
          ownerId,
          ownerName,
          ownerEmail,
        });
      }
    });
  });

  return [...map.values()].sort((a, b) => a.petName.localeCompare(b.petName));
};

const buildStaffOptions = (records, bookings) => {
  const staffMap = new Map();

  const pushOption = (id, name) => {
    const safeId = String(id || "").trim();
    const safeName = String(name || "").trim();
    if (!safeId || !safeName) return;
    if (!staffMap.has(safeId)) {
      staffMap.set(safeId, { id: safeId, name: safeName });
    }
  };

  const current = getCurrentStaff();
  pushOption(current.id, current.name);

  records.forEach((record) => {
    const normalized = normalizeRecord(record);
    pushOption(normalized._assignedStaffId, normalized._assignedStaffName);
    pushOption(record?.createdBy?._id, record?.createdBy?.name);
    pushOption(record?.updatedBy?._id, record?.updatedBy?.name);
  });

  bookings.forEach((booking) => {
    pushOption(booking?.assignedStaff?._id, booking?.assignedStaff?.name);
  });

  return [...staffMap.values()].sort((a, b) => a.name.localeCompare(b.name));
};

const StaffMedicalRecordManagement = () => {
  const [records, setRecords] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [staffFilter, setStaffFilter] = useState("All Staff");
  const [visitDateFilter, setVisitDateFilter] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);

  const [formMode, setFormMode] = useState(null);
  const [formState, setFormState] = useState(getDefaultForm());
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stageBaseline, setStageBaseline] = useState("received");
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Modal dropdown states
  const [isPetOpen, setIsPetOpen] = useState(false);
  const [isRecordTypeOpen, setIsRecordTypeOpen] = useState(false);
  const [isAssignedStaffOpen, setIsAssignedStaffOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setIsFormDirty(true);
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const isFormOpen = Boolean(formMode);
  useScrollLock(isFormOpen || detailOpen);

  const loadMedicalData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [recordsResponse, bookingsResponse] = await Promise.all([
        getAllMedicalRecords({ page: 1, limit: 100 }),
        getAllBookings(),
      ]);

      setRecords(parseMedicalRows(recordsResponse));
      setBookings(parseBookingRows(bookingsResponse));
    } catch (requestError) {
      console.error("Failed to load staff medical records", requestError);
      setError(getApiErrorMessage(requestError, "Cannot load medical records"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMedicalData();
  }, [loadMedicalData]);

  const normalizedRecords = useMemo(() => {
    return records.map((record) => normalizeRecord(record));
  }, [records]);

  const petOptions = useMemo(
    () => buildPetOptions(normalizedRecords, bookings),
    [normalizedRecords, bookings],
  );

  const staffOptions = useMemo(
    () => buildStaffOptions(normalizedRecords, bookings),
    [normalizedRecords, bookings],
  );

  useEffect(() => {
    if (!isFormOpen) return;

    if (!formState.assignedStaffId && staffOptions.length) {
      setFormState((prev) => ({
        ...prev,
        assignedStaffId: staffOptions[0].id,
        assignedStaffName: staffOptions[0].name,
      }));
    }
  }, [isFormOpen, formState.assignedStaffId, staffOptions]);

  const filteredRecords = useMemo(() => {
    return normalizedRecords.filter((record) => {
      const query = searchTerm.trim().toLowerCase();
      const queryPass =
        !query ||
        record?.userPet?.petName?.toLowerCase().includes(query) ||
        record?.user?.name?.toLowerCase().includes(query) ||
        String(record?._id || "")
          ?.toLowerCase()
          .includes(query) ||
        String(record?.diagnosis || "")
          ?.toLowerCase()
          .includes(query) ||
        String(record?.treatment || "")
          ?.toLowerCase()
          .includes(query) ||
        String(record?.condition || "")
          ?.toLowerCase()
          .includes(query);

      const typePass =
        recordTypeFilter === "All Types" ||
        getRecordTypeLabel(record.recordType) === recordTypeFilter;

      const statusPass =
        statusFilter === "All Status" || record._status === statusFilter;

      const staffPass =
        staffFilter === "All Staff" || record._assignedStaffId === staffFilter;

      const datePass =
        !visitDateFilter ||
        sameDate(record._visitDate, `${visitDateFilter}T00:00:00`);

      return queryPass && typePass && statusPass && staffPass && datePass;
    });
  }, [
    normalizedRecords,
    searchTerm,
    recordTypeFilter,
    statusFilter,
    staffFilter,
    visitDateFilter,
  ]);

  const summary = useMemo(() => {
    const todayRef = new Date();
    return {
      total: normalizedRecords.length,
      todayVisits: normalizedRecords.filter((record) =>
        sameDate(record._visitDate, todayRef),
      ).length,
      inProgress: normalizedRecords.filter(
        (record) => record._status === "In Progress",
      ).length,
      followUp: normalizedRecords.filter(
        (record) => record._status === "Follow-up Needed",
      ).length,
      critical: normalizedRecords.filter(
        (record) => record._status === "Critical",
      ).length,
    };
  }, [normalizedRecords]);

  const resetFilters = () => {
    setSearchTerm("");
    setRecordTypeFilter("All Types");
    setStatusFilter("All Status");
    setStaffFilter("All Staff");
    setVisitDateFilter("");
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailRecord(null);
  };

  const openDetailById = useCallback(async (recordId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const response = await getMedicalRecordById(recordId);
      const raw =
        response?.data?.data?.record ||
        response?.data?.record ||
        response?.data ||
        null;
      if (!raw) {
        throw new Error("Medical record detail not found");
      }
      setDetailRecord(normalizeRecord(raw));
    } catch (detailError) {
      console.error("Failed to fetch medical record detail", detailError);
      setError(getApiErrorMessage(detailError, "Cannot load record detail"));
      closeDetail();
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openDetailModal = (record) => {
    if (!record?._id) return;
    openDetailById(record._id);
  };

  const releaseStagePreviewUrls = (stageDocs) => {
    STAGE_LIST.forEach((stage) => {
      (stageDocs?.[stage]?.files || []).forEach((item) => {
        if (item?.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    });
  };

  const closeFormModal = useCallback(() => {
    if (isFormDirty) {
      if (
        !window.confirm(
          "You have unsaved changes. Are you sure you want to discard them?",
        )
      ) {
        return;
      }
    }
    releaseStagePreviewUrls(formState.stageDocs);
    setFormMode(null);
    setFormState(getDefaultForm());
    setFormErrors({});
    setSubmitError("");
    setStageBaseline("received");
    setIsFormDirty(false);
  }, [formState.stageDocs, isFormDirty]);

  const openCreateModal = () => {
    closeDetail();
    setFormMode("create");
    setFormState(getDefaultForm());
    setFormErrors({});
    setSubmitError("");
    setStageBaseline("received");
    setIsFormDirty(false);
  };

  const openEditModal = (recordInput) => {
    const record = recordInput || detailRecord;
    if (!record) return;

    const petOption = petOptions.find(
      (item) => item.petId === String(record?.userPet?._id || ""),
    );

    setFormMode("edit");
    setStageBaseline(record.workflowStage || "received");
    setSubmitError("");
    setFormErrors({});
    setIsFormDirty(false);
    setFormState({
      id: record._id,
      petId: String(record?.userPet?._id || ""),
      ownerId: String(petOption?.ownerId || record?.user?._id || ""),
      ownerName: petOption?.ownerName || record?.user?.name || "",
      ownerEmail: petOption?.ownerEmail || record?.user?.email || "",
      recordType: record.recordType || "checkup",
      visitDate: record._visitDate
        ? new Date(record._visitDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      assignedStaffId: record._assignedStaffId || getCurrentStaff().id,
      assignedStaffName: record._assignedStaffName || getCurrentStaff().name,
      condition: record.condition || "",
      diagnosis: record.diagnosis || "",
      treatment: record.treatment || "",
      notes: record._cleanNotes || "",
      followUpDate: record.followUpDate
        ? new Date(record.followUpDate).toISOString().slice(0, 10)
        : "",
      reminder: Boolean(record?._meta?.reminder),
      status: record._status || "Active",
      stageDocs: {
        received: {
          note: record?._stageNotes?.received || "",
          files: [],
          existing: Array.isArray(record?.receivedPhotos)
            ? record.receivedPhotos
            : [],
        },
        processing: {
          note: record?._stageNotes?.processing || "",
          files: [],
          existing: Array.isArray(record?.processingPhotos)
            ? record.processingPhotos
            : [],
        },
        completed: {
          note: record?._stageNotes?.completed || "",
          files: [],
          existing: Array.isArray(record?.completedPhotos)
            ? record.completedPhotos
            : [],
        },
      },
    });
  };

  const updatePetInForm = (petId) => {
    const pet = petOptions.find((item) => item.petId === petId);
    setFormState((prev) => ({
      ...prev,
      petId,
      ownerId: pet?.ownerId || "",
      ownerName: pet?.ownerName || "",
      ownerEmail: pet?.ownerEmail || "",
    }));
    setIsFormDirty(true);
    if (formErrors.petId) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.petId;
        return next;
      });
    }
  };

  const updateAssignedStaffInForm = (staffId) => {
    const staff = staffOptions.find((item) => item.id === staffId);
    setFormState((prev) => ({
      ...prev,
      assignedStaffId: staffId,
      assignedStaffName: staff?.name || prev.assignedStaffName,
    }));
    setIsFormDirty(true);
    if (formErrors.assignedStaffId) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.assignedStaffId;
        return next;
      });
    }
  };

  const _updateStageNote = (stage, value) => {
    setFormState((prev) => ({
      ...prev,
      stageDocs: {
        ...prev.stageDocs,
        [stage]: {
          ...prev.stageDocs[stage],
          note: value,
        },
      },
    }));
  };

  const _appendStageFiles = (stage, fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const invalidType = incoming.find(
      (file) => !ALLOWED_IMAGE_TYPES.has(file.type),
    );
    if (invalidType) {
      setFormErrors((prev) => ({
        ...prev,
        [`${stage}Files`]: "Only JPG, PNG, and WEBP images are allowed.",
      }));
      return;
    }

    const tooLarge = incoming.find((file) => file.size > MAX_IMAGE_SIZE);
    if (tooLarge) {
      setFormErrors((prev) => ({
        ...prev,
        [`${stage}Files`]: "Each image must be smaller than 5MB.",
      }));
      return;
    }

    const entries = incoming.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setFormErrors((prev) => ({ ...prev, [`${stage}Files`]: undefined }));

    setFormState((prev) => ({
      ...prev,
      stageDocs: {
        ...prev.stageDocs,
        [stage]: {
          ...prev.stageDocs[stage],
          files: [...prev.stageDocs[stage].files, ...entries],
        },
      },
    }));
  };

  const _removeStageFile = (stage, id) => {
    setFormState((prev) => {
      const target = prev.stageDocs[stage].files.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return {
        ...prev,
        stageDocs: {
          ...prev.stageDocs,
          [stage]: {
            ...prev.stageDocs[stage],
            files: prev.stageDocs[stage].files.filter((item) => item.id !== id),
          },
        },
      };
    });
  };

  const validateForm = () => {
    try {
      recordSchema.parse(formState);
      setFormErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = {};
        err.errors.forEach((e) => {
          if (e.path[0]) errors[e.path[0]] = e.message;
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  const submitMedicalRecord = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const selectedPet = petOptions.find(
        (item) => item.petId === formState.petId,
      );
      if (!selectedPet) {
        throw new Error("Selected pet data could not be resolved");
      }

      const selectedStaff =
        staffOptions.find((item) => item.id === formState.assignedStaffId) ||
        getCurrentStaff();

      const metadata = {
        visitDate: formState.visitDate
          ? new Date(`${formState.visitDate}T09:00:00`).toISOString()
          : null,
        assignedStaffId: selectedStaff.id,
        assignedStaffName: selectedStaff.name,
        reminder: Boolean(formState.reminder),
        archived: formState.status === "Archived",
        status: formState.status,
        archivedAt:
          formState.status === "Archived" ? new Date().toISOString() : null,
      };

      const payload = {
        userPet: selectedPet.petId,
        user: selectedPet.ownerId,
        recordType: formState.recordType,
        condition: formState.condition.trim(),
        diagnosis: formState.diagnosis.trim(),
        treatment: formState.treatment.trim(),
        notes: writeMetaToNotes(formState.notes, metadata),
        followUpDate: formState.followUpDate
          ? new Date(`${formState.followUpDate}T09:00:00`).toISOString()
          : null,
      };

      let savedRecord = null;

      if (formMode === "create") {
        const createResponse = await createMedicalRecord(payload);
        savedRecord =
          createResponse?.data?.data?.record ||
          createResponse?.data?.record ||
          null;
      } else {
        const updateResponse = await updateMedicalRecord(formState.id, payload);
        savedRecord =
          updateResponse?.data?.data?.record ||
          updateResponse?.data?.record ||
          null;
      }

      const recordId = String(savedRecord?._id || formState.id || "");
      if (!recordId) {
        throw new Error("Medical record id is missing after save");
      }

      const desiredStage = statusToWorkflow(formState.status);
      let currentStage =
        savedRecord?.workflowStage || stageBaseline || "received";

      for (const stage of STAGE_LIST) {
        const targetRank = WORKFLOW_STAGE_ORDER[desiredStage];
        const stageRank = WORKFLOW_STAGE_ORDER[stage];
        const currentRank = WORKFLOW_STAGE_ORDER[currentStage] || 1;
        const stageDoc = formState.stageDocs[stage];

        const hasNewFiles = stageDoc.files.length > 0;
        const hasNote = Boolean(String(stageDoc.note || "").trim());
        const shouldMoveStage = stageRank <= targetRank;
        const shouldApply = hasNewFiles || hasNote || shouldMoveStage;

        if (!shouldApply) continue;
        if (stageRank < currentRank) continue;

        let photoUrls = [];
        if (hasNewFiles) {
          const uploaded = await uploadMultipleImages(
            stageDoc.files.map((item) => item.file),
          );
          photoUrls = (uploaded || [])
            .map((row) => (typeof row === "string" ? row : row?.url))
            .filter(Boolean);
        }

        const stageNote =
          String(stageDoc.note || "").trim() ||
          (shouldMoveStage
            ? `Workflow updated to ${WORKFLOW_STAGE_LABEL[stage]}.`
            : "");

        if (!stageNote && photoUrls.length === 0) continue;

        const stageResponse = await updateMedicalRecordStage(recordId, {
          stage,
          notes: stageNote,
          photos: photoUrls,
        });

        const stageRecord = stageResponse?.data?.data?.record;
        currentStage = stageRecord?.workflowStage || stage;
      }

      await loadMedicalData(true);

      if (detailOpen && detailRecord?._id === recordId) {
        await openDetailById(recordId);
      }

      toast.success(
        formMode === "create"
          ? "Record created successfully."
          : "Record updated successfully.",
      );
      setIsFormDirty(false);
      closeFormModal();
    } catch (submitErr) {
      console.error("Failed to submit medical record", submitErr);
      const errMsg = getApiErrorMessage(
        submitErr,
        "Cannot save medical record",
      );
      setSubmitError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const quickMarkCompleted = async () => {
    if (!detailRecord?._id) return;

    try {
      await updateMedicalRecordStage(detailRecord._id, {
        stage: "completed",
        notes: "Marked completed by staff quick action.",
        photos: [],
      });

      const nextMeta = {
        ...(detailRecord?._meta || {}),
        archived: false,
        status: "Completed",
        archivedAt: null,
      };

      await updateMedicalRecord(detailRecord._id, {
        notes: writeMetaToNotes(detailRecord?._cleanNotes || "", nextMeta),
      });

      await loadMedicalData(true);
      await openDetailById(detailRecord._id);
    } catch (quickError) {
      setError(
        getApiErrorMessage(quickError, "Cannot mark record as completed"),
      );
    }
  };

  const quickArchive = async () => {
    if (!detailRecord?._id) return;

    try {
      const currentStaff = getCurrentStaff();
      const nextMeta = {
        ...(detailRecord?._meta || {}),
        archived: true,
        status: "Archived",
        archivedAt: new Date().toISOString(),
        archivedBy: currentStaff.id,
      };

      await updateMedicalRecord(detailRecord._id, {
        notes: writeMetaToNotes(detailRecord?._cleanNotes || "", nextMeta),
      });

      await loadMedicalData(true);
      await openDetailById(detailRecord._id);
      toast.success("Record archived successfully.");
    } catch (quickError) {
      const message = getApiErrorMessage(
        quickError,
        "Cannot archive this record",
      );
      setError(message);
      toast.error(message);
    }
  };

  const isEmptyState = !loading && !error && normalizedRecords.length === 0;
  const isNoResultState =
    !loading &&
    !error &&
    normalizedRecords.length > 0 &&
    filteredRecords.length === 0;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#D97853]">
            Medical Record Management
          </h1>
          <p className="mt-1 text-sm text-[#2D3436]/60">
            Track pet health history, treatments, visits, and service progress
            across all customers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadMedicalData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E4DFD7] bg-[#FAF7F2] px-3.5 py-2 text-sm font-semibold text-[#2D3436]/75 transition-colors hover:border-[#D97853]/35 hover:text-[#D97853] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <RotateCcw size={15} />
            )}
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#D97853] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(217,120,83,0.9)] transition-colors hover:bg-[#C86A46]"
          >
            <Plus size={16} />
            Create Record
          </button>
        </div>
      </section>

      <AdminFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by pet name, owner, record ID..."
        filters={[
          {
            label: "RECORD TYPE",
            icon: Activity,
            options: ["All Types", ...RECORD_TYPE_OPTIONS.map((o) => o.label)],
            value: recordTypeFilter,
            onChange: setRecordTypeFilter,
          },
          {
            label: "STATUS",
            icon: CheckCircle2,
            options: ["All Status", ...STATUS_OPTIONS],
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            label: "STAFF",
            icon: UserRound,
            options: ["All Staff", ...staffOptions.map((s) => s.name)],
            value:
              staffFilter === "All Staff"
                ? "All Staff"
                : staffOptions.find((s) => s.id === staffFilter)?.name ||
                  "All Staff",
            onChange: (name) => {
              if (name === "All Staff") setStaffFilter("All Staff");
              else {
                const staff = staffOptions.find((s) => s.name === name);
                setStaffFilter(staff ? staff.id : "All Staff");
              }
            },
          },
        ]}
        dateValue={visitDateFilter ? new Date(visitDateFilter) : null}
        onDateChange={(date) => {
          if (date) {
            const offsetDate = new Date(
              date.getTime() - date.getTimezoneOffset() * 60000,
            );
            setVisitDateFilter(offsetDate.toISOString().split("T")[0]);
          } else {
            setVisitDateFilter("");
          }
        }}
        dateLabel="VISIT DATE"
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[20px] border border-[#2D3436]/10 bg-white p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2D3436]/50 mb-1">
              Total Records
            </p>
            <p className="text-2xl font-extrabold text-[#2D3436] leading-none">
              {summary.total}
            </p>
          </div>
          <FileText
            size={38}
            strokeWidth={1.5}
            className="text-[#D97853] opacity-80"
          />
        </div>

        <div className="rounded-[20px] border border-[#2D3436]/10 bg-white p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2D3436]/50 mb-1">
              Today Visits
            </p>
            <p className="text-2xl font-extrabold text-[#2D3436] leading-none">
              {summary.todayVisits}
            </p>
          </div>
          <CalendarClock
            size={38}
            strokeWidth={1.5}
            className="text-[#B7791F] opacity-80"
          />
        </div>

        <div className="rounded-[20px] border border-[#2D3436]/10 bg-white p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2D3436]/50 mb-1">
              In Progress
            </p>
            <p className="text-2xl font-extrabold text-[#2D3436] leading-none">
              {summary.inProgress}
            </p>
          </div>
          <Activity
            size={38}
            strokeWidth={1.5}
            className="text-[#B45309] opacity-80"
          />
        </div>

        <div className="rounded-[20px] border border-[#2D3436]/10 bg-white p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2D3436]/50 mb-1">
              Follow-up Needed
            </p>
            <p className="text-2xl font-extrabold text-[#2D3436] leading-none">
              {summary.followUp}
            </p>
          </div>
          <Clock3
            size={38}
            strokeWidth={1.5}
            className="text-[#9A6700] opacity-80"
          />
        </div>

        <div className="rounded-[20px] border border-[#2D3436]/10 bg-white p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2D3436]/50 mb-1">
              Critical Cases
            </p>
            <p className="text-2xl font-extrabold text-[#2D3436] leading-none">
              {summary.critical}
            </p>
          </div>
          <AlertTriangle
            size={38}
            strokeWidth={1.5}
            className="text-[#B42318] opacity-80"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#2D3436]/10 bg-white">
        <div className="flex items-center justify-between border-b border-[#2D3436]/10 px-4 py-3">
          <p className="text-sm font-semibold text-[#2D3436]">
            Medical Records
          </p>
          <span className="rounded-full bg-[#FFF2E8] px-3 py-1 text-xs font-semibold text-[#B45309]">
            {filteredRecords.length} item(s)
          </span>
        </div>

        {loading ? (
          <div className="p-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 size={30} className="animate-spin text-[#D97853]" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-12 animate-pulse rounded-2xl bg-[#F4EFE8]"
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-5">
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 md:flex-row md:items-center md:justify-between">
              <p className="inline-flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </p>
              <button
                onClick={() => loadMedicalData(true)}
                className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          </div>
        ) : isEmptyState ? (
          <div className="px-4 py-16 text-center">
            <Stethoscope size={30} className="mx-auto text-[#D3C8BC]" />
            <p className="mt-3 text-base font-semibold text-[#2D3436]">
              No medical records available
            </p>
            <p className="mt-1 text-sm text-[#2D3436]/55">
              Add the first medical record to start tracking treatment progress.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#D97853] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C86A46]"
            >
              <Plus size={15} />
              Create Record
            </button>
          </div>
        ) : isNoResultState ? (
          <div className="px-4 py-16 text-center">
            <Search size={30} className="mx-auto text-[#D3C8BC]" />
            <p className="mt-3 text-base font-semibold text-[#2D3436]">
              No matching medical records
            </p>
            <p className="mt-1 text-sm text-[#2D3436]/55">
              Try changing the active filters or reset to view all records.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#E4DFD7] bg-[#FAF7F2] px-4 py-2 text-sm font-semibold text-[#2D3436]/75 hover:border-[#D97853]/35 hover:text-[#D97853]"
            >
              <RotateCcw size={15} />
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[1200px] w-full text-sm">
                <thead className="bg-[#FCFAF6] text-left text-xs uppercase tracking-wide text-[#2D3436]/60">
                  <tr>
                    {[
                      "Pet",
                      "Owner",
                      "Record ID",
                      "Record Type",
                      "Diagnosis / Service Summary",
                      "Visit Date",
                      "Assigned Staff",
                      "Progress",
                      "Status",
                      "Actions",
                    ].map((label) => (
                      <th key={label} className="px-4 py-3.5 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={record._id}
                      className="border-b border-[#2D3436]/5 transition-colors hover:bg-[#FFFAF5]"
                    >
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF1E5] text-[#D97853]">
                            <PawPrint size={15} />
                          </span>
                          <div>
                            <p className="font-semibold text-[#2D3436]">
                              {record?.userPet?.petName || "Unknown Pet"}
                            </p>
                            <p className="text-xs text-[#2D3436]/55">
                              {record?.userPet?.petType || "-"} •{" "}
                              {record?.userPet?.breed || "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <p className="font-medium text-[#2D3436]">
                          {record?.user?.name || "Unknown Owner"}
                        </p>
                        <p className="text-xs text-[#2D3436]/55">
                          {record?.user?.email || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-top text-[#2D3436]/75">
                        #
                        {String(record?._id || "")
                          .slice(-8)
                          .toUpperCase()}
                      </td>
                      <td className="px-4 py-3.5 align-top text-[#2D3436]/75">
                        {getRecordTypeLabel(record.recordType)}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <p className="max-w-[240px] truncate text-[#2D3436]/75">
                          {record.diagnosis || record.treatment || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-top text-[#2D3436]/75">
                        {formatDateOnly(record._visitDate)}
                      </td>
                      <td className="px-4 py-3.5 align-top text-[#2D3436]/75">
                        {record._assignedStaffName}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            PROGRESS_STYLE[record.workflowStage] ||
                            PROGRESS_STYLE.received
                          }`}
                        >
                          {record._progressLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            STATUS_STYLE[record._status] || STATUS_STYLE.Active
                          }`}
                        >
                          {record._status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openDetailModal(record)}
                            className="rounded-lg p-2 text-[#2D3436]/60 transition-colors hover:bg-[#EAF2FF] hover:text-[#1D4ED8]"
                            aria-label="View medical record"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            className="rounded-lg p-2 text-[#2D3436]/60 transition-colors hover:bg-[#FFF4E8] hover:text-[#B45309]"
                            aria-label="Edit medical record"
                          >
                            <PenSquare size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 lg:hidden">
              {filteredRecords.map((record) => (
                <div
                  key={`mobile-${record._id}`}
                  className="rounded-2xl border border-[#EDE6DE] bg-[#FFFEFC] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#2D3436]">
                        {record?.userPet?.petName || "Unknown Pet"}
                      </p>
                      <p className="text-xs text-[#2D3436]/55">
                        {record?.user?.name || "Unknown Owner"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        STATUS_STYLE[record._status] || STATUS_STYLE.Active
                      }`}
                    >
                      {record._status}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-[#2D3436]/65">
                    {record.diagnosis || record.treatment || "-"}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-[#2D3436]/55">
                      {formatDateOnly(record._visitDate)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openDetailModal(record)}
                        className="rounded-lg border border-[#E4DFD7] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#2D3436]/70"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(record)}
                        className="rounded-lg border border-[#E4DFD7] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#2D3436]/70"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <AnimatePresence>
        {detailOpen && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/55 p-3 backdrop-blur-[2px]"
            onClick={closeDetail}
          >
            <Motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-[#E8DED2] bg-[#FFFEFD] shadow-[0_28px_90px_-38px_rgba(15,23,42,0.55)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-[#EFE6DB] bg-gradient-to-r from-[#FFF5EC] via-[#FFFDFB] to-[#FFF6EE] px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#D97853]">
                    Medical Record Detail
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-[#2D3436]">
                    {detailRecord?.userPet?.petName || "Medical Record"}
                  </h3>
                </div>
                <button
                  onClick={closeDetail}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8DED2] bg-white text-[#2D3436]/65 transition-colors hover:bg-[#F8F4EF] hover:text-[#2D3436]"
                  aria-label="Close medical record detail"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[calc(90vh-76px)] space-y-6 overflow-y-auto p-5 md:p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-14">
                    <Loader2
                      size={30}
                      className="animate-spin text-[#D97853]"
                    />
                  </div>
                ) : detailRecord ? (
                  <>
                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#EFE6DB] bg-[#FFFDF9] p-4">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#2D3436]">
                          <PawPrint size={15} className="text-[#D97853]" />
                          Pet Information
                        </h4>
                        <div className="space-y-1.5 text-sm text-[#2D3436]/75">
                          <p>
                            <span className="font-semibold text-[#2D3436]">
                              Name:
                            </span>{" "}
                            {detailRecord?.userPet?.petName || "-"}
                          </p>
                          <p>
                            <span className="font-semibold text-[#2D3436]">
                              Type:
                            </span>{" "}
                            {detailRecord?.userPet?.petType || "-"}
                          </p>
                          <p>
                            <span className="font-semibold text-[#2D3436]">
                              Breed:
                            </span>{" "}
                            {detailRecord?.userPet?.breed || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#EFE6DB] bg-[#FFFDF9] p-4">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#2D3436]">
                          <UserRound size={15} className="text-[#D97853]" />
                          Owner Information
                        </h4>
                        <div className="space-y-1.5 text-sm text-[#2D3436]/75">
                          <p>
                            <span className="font-semibold text-[#2D3436]">
                              Name:
                            </span>{" "}
                            {detailRecord?.user?.name || "-"}
                          </p>
                          <p>
                            <span className="font-semibold text-[#2D3436]">
                              Email:
                            </span>{" "}
                            {detailRecord?.user?.email || "-"}
                          </p>
                          <p>
                            <span className="font-semibold text-[#2D3436]">
                              Phone:
                            </span>{" "}
                            {detailRecord?.user?.phone || "-"}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-[#EFE6DB] bg-[#FFFDF9] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            STATUS_STYLE[detailRecord._status] ||
                            STATUS_STYLE.Active
                          }`}
                        >
                          {detailRecord._status}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            PROGRESS_STYLE[detailRecord.workflowStage] ||
                            PROGRESS_STYLE.received
                          }`}
                        >
                          {detailRecord._progressLabel}
                        </span>
                        <span className="rounded-full border border-[#E8DED2] bg-white px-2.5 py-1 text-xs font-semibold text-[#2D3436]/65">
                          {getRecordTypeLabel(detailRecord.recordType)}
                        </span>
                        <span className="rounded-full border border-[#E8DED2] bg-white px-2.5 py-1 text-xs font-semibold text-[#2D3436]/65">
                          Visit: {formatDateOnly(detailRecord._visitDate)}
                        </span>
                        <span className="rounded-full border border-[#E8DED2] bg-white px-2.5 py-1 text-xs font-semibold text-[#2D3436]/65">
                          Staff: {detailRecord._assignedStaffName}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-[#EFE6DB] bg-white p-3.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#2D3436]/55">
                            Condition
                          </p>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-[#2D3436]/75">
                            {detailRecord.condition || "Not available"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-[#EFE6DB] bg-white p-3.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#2D3436]/55">
                            Diagnosis
                          </p>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-[#2D3436]/75">
                            {detailRecord.diagnosis || "Not available"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl border border-[#EFE6DB] bg-white p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#2D3436]/55">
                          Treatment / Service Plan
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-[#2D3436]/75">
                          {detailRecord.treatment || "Not available"}
                        </p>
                      </div>

                      <div className="mt-3 rounded-2xl border border-[#EFE6DB] bg-white p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#2D3436]/55">
                          General Notes
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-[#2D3436]/75">
                          {detailRecord._cleanNotes || "No additional notes"}
                        </p>
                      </div>

                      <div className="mt-3 rounded-2xl border border-[#EFE6DB] bg-white p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#2D3436]/55">
                          Follow-up Date
                        </p>
                        <p className="mt-1.5 text-sm text-[#2D3436]/75">
                          {detailRecord.followUpDate
                            ? formatDateOnly(detailRecord.followUpDate)
                            : "No follow-up scheduled"}
                        </p>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-sm font-semibold text-[#2D3436]">
                        3-Stage Visual Documentation
                      </h4>
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                        {STAGE_LIST.map((stage) => {
                          const images = Array.isArray(
                            detailRecord?.[`${stage}Photos`],
                          )
                            ? detailRecord[`${stage}Photos`]
                            : [];
                          const note =
                            detailRecord?._stageNotes?.[stage] ||
                            "No stage note available.";

                          return (
                            <div
                              key={stage}
                              className="rounded-2xl border border-[#EFE6DB] bg-[#FFFDF9] p-3.5"
                            >
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#D97853]">
                                {WORKFLOW_STAGE_LABEL[stage]}
                              </p>

                              <div className="mt-2 min-h-[112px] rounded-2xl border border-dashed border-[#E0D8CC] bg-white p-2">
                                {images.length === 0 ? (
                                  <div className="flex h-[96px] items-center justify-center text-xs text-[#2D3436]/45">
                                    No images uploaded
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    {images
                                      .slice(0, 4)
                                      .map((imageUrl, index) => (
                                        <img
                                          key={`${stage}-image-${index}`}
                                          src={imageUrl}
                                          alt={`${stage} stage ${index + 1}`}
                                          className="h-20 w-full rounded-xl object-cover"
                                        />
                                      ))}
                                  </div>
                                )}
                              </div>

                              <p className="mt-2 text-xs text-[#2D3436]/65">
                                {note}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-[#EFE6DB] bg-[#FFFDF9] p-4">
                      <h4 className="text-sm font-semibold text-[#2D3436]">
                        Quick Actions
                      </h4>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(detailRecord)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#E4DFD7] bg-white px-3 py-2 text-xs font-semibold text-[#2D3436]/75 transition-colors hover:border-[#D97853]/35 hover:text-[#D97853]"
                        >
                          <PenSquare size={14} />
                          Edit Record
                        </button>

                        <button
                          type="button"
                          onClick={quickMarkCompleted}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#B9E4C9] bg-[#ECFDF3] px-3 py-2 text-xs font-semibold text-[#166534]"
                        >
                          <CheckCircle2 size={14} />
                          Mark Completed
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            openEditModal(detailRecord);
                            setFormState((prev) => ({
                              ...prev,
                              status: "Follow-up Needed",
                              followUpDate:
                                prev.followUpDate ||
                                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                  .toISOString()
                                  .slice(0, 10),
                            }));
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#F3DBA2] bg-[#FFF8E8] px-3 py-2 text-xs font-semibold text-[#9A6700]"
                        >
                          <Clock3 size={14} />
                          Add Follow-up
                        </button>

                        <button
                          type="button"
                          onClick={quickArchive}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#D6DEE7] bg-[#EEF2F7] px-3 py-2 text-xs font-semibold text-[#475569]"
                        >
                          <Archive size={14} />
                          Archive Record
                        </button>
                      </div>
                    </section>
                  </>
                ) : (
                  <div className="rounded-2xl border border-[#EFE6DB] bg-[#FFFDF9] p-6 text-center text-sm text-[#2D3436]/60">
                    Record detail is not available.
                  </div>
                )}
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFormOpen && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/55 p-3 backdrop-blur-[2px]"
            onClick={closeFormModal}
          >
            <Motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="w-full max-w-[1000px] overflow-hidden rounded-[28px] border border-[#E8DED2] bg-[#FFFEFD] shadow-[0_28px_90px_-38px_rgba(15,23,42,0.55)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#EFE6DB] bg-gradient-to-r from-[#FFF5EC] via-[#FFFDFB] to-[#FFF6EE] px-6 py-4">
                <div>
                  <h3 className="text-xl font-bold text-[#2D3436]">
                    {formMode === "create"
                      ? "Create Medical Record"
                      : "Update Medical Record"}
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#D97853]">
                    Medical Record Workspace
                  </p>
                </div>
                <button
                  onClick={closeFormModal}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E8DED2] bg-white text-[#2D3436]/65 transition-colors hover:bg-[#F8F4EF] hover:text-[#2D3436]"
                  aria-label="Close form"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={submitMedicalRecord}
                className="flex flex-col max-h-[85vh]"
              >
                <div className="space-y-6 overflow-y-auto p-6 md:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {submitError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}

                  {/* Section 1: Record Overview */}
                  <section>
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wide text-[#2D3436]">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D97853]/10 text-[#D97853]">
                        1
                      </span>
                      RECORD OVERVIEW
                    </h4>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <CustomSelect
                          label="Pet"
                          options={petOptions.map((pet) => ({
                            value: pet.petId,
                            label: `${pet.petName} (${pet.breed})`,
                          }))}
                          value={
                            petOptions.find((p) => p.petId === formState.petId)
                              ?.petName
                              ? `${petOptions.find((p) => p.petId === formState.petId)?.petName} (${petOptions.find((p) => p.petId === formState.petId)?.breed})`
                              : "Select a pet"
                          }
                          onChange={(val) => updatePetInForm(val)}
                          isOpen={isPetOpen}
                          setIsOpen={setIsPetOpen}
                        />
                        {formErrors.petId && (
                          <p className="mt-1 text-xs font-medium text-red-500">
                            {formErrors.petId}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[#2D3436]/50">
                          Owner
                        </label>
                        <input
                          value={formState.ownerName || ""}
                          readOnly
                          placeholder="Auto-filled"
                          className="mt-1.5 w-full rounded-2xl border border-[#2D3436]/5 bg-[#F5F3ED] px-4 py-3 text-sm text-[#2D3436]/60 outline-none"
                        />
                      </div>

                      <div>
                        <CustomSelect
                          label="Record Type"
                          options={RECORD_TYPE_OPTIONS}
                          value={
                            RECORD_TYPE_OPTIONS.find(
                              (o) => o.value === formState.recordType,
                            )?.label || "Select type"
                          }
                          onChange={(val) =>
                            handleFormChange("recordType", val)
                          }
                          isOpen={isRecordTypeOpen}
                          setIsOpen={setIsRecordTypeOpen}
                        />
                        {formErrors.recordType && (
                          <p className="mt-1 text-xs font-medium text-red-500">
                            {formErrors.recordType}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[#2D3436]/50">
                          Visit Date
                        </label>
                        <div className="relative mt-1.5">
                          <DatePicker
                            selected={
                              formState.visitDate
                                ? new Date(formState.visitDate + "T12:00:00")
                                : null
                            }
                            onChange={(date) =>
                              handleFormChange(
                                "visitDate",
                                date
                                  ? new Date(
                                      date.getTime() -
                                        date.getTimezoneOffset() * 60000,
                                    )
                                      .toISOString()
                                      .slice(0, 10)
                                  : "",
                              )
                            }
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Chọn ngày khám"
                            className={`w-full rounded-2xl border bg-[#FDFBF7] py-3 pl-4 pr-11 text-sm text-[#2D3436] outline-none transition-all focus:border-[#D97853] focus:ring-1 focus:ring-[#D97853]/30 ${formErrors.visitDate ? "border-red-300" : "border-[#2D3436]/10 hover:border-[#D97853]/50"}`}
                            wrapperClassName="w-full"
                            popperClassName="medical-record-datepicker-popper"
                            calendarClassName="medical-record-datepicker-calendar"
                            showPopperArrow={false}
                          />
                          <CalendarClock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2D3436]/50" />
                        </div>
                        {formErrors.visitDate && (
                          <p className="mt-1 text-xs font-medium text-red-500">
                            {formErrors.visitDate}
                          </p>
                        )}
                      </div>

                      <div>
                        <CustomSelect
                          label="Assigned Staff"
                          options={staffOptions.map((staff) => ({
                            value: staff.id,
                            label: staff.name,
                          }))}
                          value={
                            staffOptions.find(
                              (s) => s.id === formState.assignedStaffId,
                            )?.name || "Select staff"
                          }
                          onChange={(val) => updateAssignedStaffInForm(val)}
                          isOpen={isAssignedStaffOpen}
                          setIsOpen={setIsAssignedStaffOpen}
                        />
                        {formErrors.assignedStaffId && (
                          <p className="mt-1 text-xs font-medium text-red-500">
                            {formErrors.assignedStaffId}
                          </p>
                        )}
                      </div>

                      <div>
                        <CustomSelect
                          label="Status"
                          options={STATUS_OPTIONS}
                          value={formState.status}
                          onChange={(val) => handleFormChange("status", val)}
                          isOpen={isStatusOpen}
                          setIsOpen={setIsStatusOpen}
                        />
                      </div>
                    </div>
                  </section>

                  <hr className="border-[#EFE6DB]" />

                  {/* Section 2: Clinical Details */}
                  <section>
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wide text-[#2D3436]">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D97853]/10 text-[#D97853]">
                        2
                      </span>
                      CLINICAL DETAILS
                    </h4>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[#2D3436]/50">
                          Symptoms / Initial Condition
                        </label>
                        <textarea
                          rows={4}
                          value={formState.condition}
                          onChange={(e) =>
                            handleFormChange("condition", e.target.value)
                          }
                          placeholder="Describe the initial condition or symptoms..."
                          className={`mt-1.5 w-full resize-y rounded-2xl border bg-[#FDFBF7] px-4 py-3 text-sm text-[#2D3436] outline-none transition-all focus:border-[#D97853] focus:ring-1 focus:ring-[#D97853]/30 ${formErrors.condition ? "border-red-300" : "border-[#2D3436]/10 hover:border-[#D97853]/50"}`}
                        />
                        {formErrors.condition && (
                          <p className="mt-1 text-xs font-medium text-red-500">
                            {formErrors.condition}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[#2D3436]/50">
                          Diagnosis / Assessment
                        </label>
                        <textarea
                          rows={4}
                          value={formState.diagnosis}
                          onChange={(e) =>
                            handleFormChange("diagnosis", e.target.value)
                          }
                          placeholder="Enter diagnosis or assessment results..."
                          className={`mt-1.5 w-full resize-y rounded-2xl border bg-[#FDFBF7] px-4 py-3 text-sm text-[#2D3436] outline-none transition-all focus:border-[#D97853] focus:ring-1 focus:ring-[#D97853]/30 ${formErrors.diagnosis ? "border-red-300" : "border-[#2D3436]/10 hover:border-[#D97853]/50"}`}
                        />
                        {formErrors.diagnosis && (
                          <p className="mt-1 text-xs font-medium text-red-500">
                            {formErrors.diagnosis}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[#2D3436]/50">
                          Treatment / Service Plan
                        </label>
                        <textarea
                          rows={4}
                          value={formState.treatment}
                          onChange={(e) =>
                            handleFormChange("treatment", e.target.value)
                          }
                          placeholder="Detail the treatment or service plan..."
                          className={`mt-1.5 w-full resize-y rounded-2xl border bg-[#FDFBF7] px-4 py-3 text-sm text-[#2D3436] outline-none transition-all focus:border-[#D97853] focus:ring-1 focus:ring-[#D97853]/30 ${formErrors.treatment ? "border-red-300" : "border-[#2D3436]/10 hover:border-[#D97853]/50"}`}
                        />
                        {formErrors.treatment && (
                          <p className="mt-1 text-xs font-medium text-red-500">
                            {formErrors.treatment}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[#2D3436]/50">
                          General Notes
                        </label>
                        <textarea
                          rows={4}
                          value={formState.notes}
                          onChange={(e) =>
                            handleFormChange("notes", e.target.value)
                          }
                          placeholder="Any additional notes..."
                          className={`mt-1.5 w-full resize-y rounded-2xl border bg-[#FDFBF7] px-4 py-3 text-sm text-[#2D3436] outline-none transition-all focus:border-[#D97853] focus:ring-1 focus:ring-[#D97853]/30 ${formErrors.notes ? "border-red-300" : "border-[#2D3436]/10 hover:border-[#D97853]/50"}`}
                        />
                        {formErrors.notes && (
                          <p className="mt-1 text-xs font-medium text-red-500">
                            {formErrors.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#EFE6DB] bg-[#FFFCF8] px-6 py-4">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    disabled={submitting}
                    className="rounded-2xl border border-[#2D3436]/10 bg-white px-5 py-2.5 text-sm font-bold text-[#2D3436]/80 shadow-sm transition-all hover:border-[#D97853]/50 hover:text-[#D97853] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || Object.keys(formErrors).length > 0}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#D97853] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(217,120,83,0.35)] transition-all hover:bg-[#C86A46] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    {formMode === "create" ? "Create Record" : "Update Record"}
                  </button>
                </div>
              </form>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
};

export default StaffMedicalRecordManagement;
