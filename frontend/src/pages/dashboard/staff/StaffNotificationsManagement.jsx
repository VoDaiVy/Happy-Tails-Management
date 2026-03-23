import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import useScrollLock from "../../../hooks/useScrollLock";
import {
  AlertTriangle,
  Archive,
  BellRing,
  CalendarClock,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  PenSquare,
  Plus,
  RotateCcw,
  Search,
  Send,
  Target,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import {
  sendNotification as sendNotificationApi,
  broadcastNotification as broadcastNotificationApi,
  deleteNotification as deleteNotificationApi,
  getStaffOutbox as getStaffOutboxApi,
  getStaffCustomers as getStaffCustomersApi,
} from "../../../api/notificationApi";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { uploadSingleImage } from "../../../api/uploadApi";
import AdminFilterBar from "../../../components/dashboard/AdminFilterBar";

const AUDIENCE_OPTIONS = [
  "All Customers",
  "VIP Customers",
  "New Customers",
  "Specific Users",
];

const TYPE_OPTIONS = [
  "Promotion",
  "Reminder",
  "System Update",
  "Booking Alert",
  "Service Announcement",
];

const STATUS_OPTIONS = ["Draft", "Scheduled", "Sent", "Failed", "Archived"];
const PRIORITY_OPTIONS = ["Low", "Normal", "High"];

const UI_TO_API_NOTIFICATION_TYPE = {
  Promotion: "promotion",
  Reminder: "account",
  "System Update": "system",
  "Booking Alert": "order",
  "Service Announcement": "system",
};

const API_TO_UI_NOTIFICATION_TYPE = {
  promotion: "Promotion",
  account: "Reminder",
  system: "System Update",
  order: "Booking Alert",
  payment: "Reminder",
};

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const CustomSelect = ({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  isOpen,
  setIsOpen,
  rightIcon: RightIcon = MoreVertical,
  isModal = true,
  up = false,
  disabled = false,
}) => {
  const triggerRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: up ? rect.top : rect.bottom,
      left: rect.left,
      width: rect.width,
    });
  }, [isOpen, up]);

  const dropdownContent =
    isOpen && !disabled ? (
      <AnimatePresence>
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <Motion.div
            initial={{ opacity: 0, y: up ? 8 : -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: up ? 8 : -8, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "fixed",
              top: up ? undefined : position.top + 6,
              bottom: up ? window.innerHeight - position.top + 6 : undefined,
              left: position.left,
              width: position.width,
            }}
            className={`bg-[#FFFEFB] rounded-xl shadow-[0_14px_36px_rgba(36,27,20,0.12)] border border-[#E8DED2]/85 overflow-hidden z-[9999] py-1 max-h-56 overflow-y-auto [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D8D0C4]/50`}
          >
            {options.map((opt, idx) => {
              const isSelected = value === opt;
              return (
                <div
                  key={idx}
                  className={`px-3.5 py-2 text-[13px] cursor-pointer transition-colors ${!isSelected ? "text-[#2D3436]/70 hover:bg-[#F8F4EF] hover:text-[#2D3436] font-medium" : "border-l-[3px] border-[#D97853] bg-[#FFF5EC] text-[#D97853] font-semibold"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt);
                    setIsOpen(false);
                  }}
                >
                  {opt}
                </div>
              );
            })}
          </Motion.div>
        </>
      </AnimatePresence>
    ) : null;

  return (
    <div className={`relative flex-col flex ${isOpen ? "z-[60]" : "z-10"}`}>
      {label && (
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
          {label}
        </label>
      )}

      <div
        ref={triggerRef}
        className={`flex min-h-[42px] items-center justify-between px-3.5 py-2 bg-[#FDFBF7] border ${isOpen ? "border-[#D97853] ring-2 ring-[#D97853]/10" : "border-[#D8D0C4]/45"} rounded-xl cursor-pointer transition-all ${disabled ? "cursor-not-allowed bg-[#F8F5F0]" : "hover:border-[#D97853]/50"}`}
        onClick={(e) => {
          if (!disabled) {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center gap-2.5">
          {Icon && (
            <Icon
              size={14}
              className={isOpen ? "text-[#D97853]" : "text-[#2D3436]/40"}
            />
          )}
          <span className="text-sm font-semibold text-[#2D3436]">{value}</span>
        </div>
        <ChevronDown
          size={13}
          className={`text-[#D97853] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isModal &&
        dropdownContent &&
        createPortal(dropdownContent, document.body)}
      {!isModal && dropdownContent}
    </div>
  );
};

const DEFAULT_FORM = {
  title: "",
  type: "Promotion",
  summary: "",
  content: "",
  bannerImage: "",
  audienceMode: "All Customers",
  audienceUsers: [],
  deliveryMode: "Send now",
  scheduledAt: "",
  priority: "Normal",
  status: "Draft",
};

const CONTROL_CLASS =
  "w-full min-h-[42px] rounded-xl border border-[#D8D0C4]/45 bg-[#FDFBF7] px-3.5 py-2 text-sm font-medium text-[#2D3436] outline-none transition-all placeholder:text-[#2D3436]/35 focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/12";

const CONTROL_READONLY_CLASS = "bg-[#F9F4EE] border-[#E9DFD3] text-[#3F4B53]";

const STATUS_STYLE = {
  Draft: "border border-[#CBD2D9] bg-[#F5F7FA] text-[#52606D]",
  Scheduled: "border border-[#F8D27A] bg-[#FFF8E1] text-[#9C6B00]",
  Sent: "border border-[#B6E6C4] bg-[#ECFDF3] text-[#166534]",
  Failed: "border border-[#F7B4B4] bg-[#FFF1F1] text-[#B42318]",
  Archived: "border border-[#D8DEE9] bg-[#EEF2F7] text-[#4B5563]",
};

const ACTIVITY_ICON_STYLE = {
  created: "bg-[#E8F4EC] text-[#2F855A]",
  updated: "bg-[#FFF5E8] text-[#B45309]",
  deleted: "bg-[#FFF1F1] text-[#B42318]",
  sent: "bg-[#EAF2FF] text-[#1D4ED8]",
  default: "bg-[#F4F1ED] text-[#5B6470]",
};

const getCurrentStaffName = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.name || user?.email || "Staff Team";
  } catch {
    return "Staff Team";
  }
};

const getCurrentStaffId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return String(user?._id || user?.id || "");
  } catch {
    return "";
  }
};

const getApiErrorMessage = (
  error,
  fallback = "Unable to process notification request",
) => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const isObjectId = (value) => OBJECT_ID_REGEX.test(String(value || ""));

const getDateTimeInputValue = (value = null) => {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 16);
};

const toScheduledAtString = (date) => {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime()))
    return "";
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 16);
};

const toScheduledAtDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTime = (value) => {
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

const formatRelativeTime = (value) => {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "Just now";
  const diff = Date.now() - ts;
  if (diff < 60 * 1000) return "Just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} min ago`;
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))} hr ago`;
  }
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))} days ago`;
};

const generateNotificationId = () => {
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `NTF-${new Date().getFullYear()}-${suffix}`;
};

const getAudienceSize = (audienceMode, specificUsersCount) => {
  if (audienceMode === "All Customers") return 120;
  if (audienceMode === "VIP Customers") return 32;
  if (audienceMode === "New Customers") return 54;
  return specificUsersCount || 0;
};

/** Map an API outbox item (aggregated) to a UI table row */
const mapOutboxToRow = (item) => {
  const meta =
    item?.metadata && typeof item.metadata === "object" ? item.metadata : {};
  const uiType = API_TO_UI_NOTIFICATION_TYPE[item?.type] || "System Update";
  const total = Number(item?.totalRecipients || 0);
  const expectedRecipients = Number(meta?.expectedRecipients || 0);
  const recipientCount = expectedRecipients > 0 ? expectedRecipients : total;
  const delivered = item?.deliveredCount || 0;
  const read = item?.readCount || 0;

  let status = "Sent";
  let delivery = `Sent to ${recipientCount} users`;
  if (
    meta.status === "Draft" ||
    meta.status === "Scheduled" ||
    meta.status === "Failed"
  ) {
    status = meta.status;
    delivery = meta.delivery || meta.status;
  } else if (total > 0 && delivered === 0) {
    delivery = "Pending delivery";
  }

  return {
    id: String(item?._id || `api-${Date.now()}`),
    _apiId: String(item?._id || ""),
    _source: "api",
    title: item?.title || "Untitled",
    summary: meta.summary || String(item?.body || "").slice(0, 120),
    content: item?.body || "",
    type: uiType,
    targetAudience: meta.targetAudience || "All Customers",
    audienceUsers: Array.isArray(meta.audienceUsers) ? meta.audienceUsers : [],
    createdBy: meta.createdBy || "Staff Team",
    createdDate: item?.createdAt || new Date().toISOString(),
    scheduledAt: meta.scheduledAt || "",
    status,
    delivery,
    priority: meta.priority || "Normal",
    bannerImage: item?.imageUrl || meta.bannerImage || "",
    totalRecipients: recipientCount,
    deliveredCount: delivered,
    readCount: read,
  };
};

const NotificationSkeletonRow = () => (
  <tr className="animate-pulse border-b border-[#2D3436]/5 last:border-b-0">
    {Array.from({ length: 9 }).map((_, idx) => (
      <td key={idx} className="px-4 py-4">
        <div className="h-4 rounded-full bg-[#F1ECE5]" />
      </td>
    ))}
  </tr>
);

const StaffNotificationsManagement = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("All Audiences");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [dateMode, setDateMode] = useState("Created Date");
  const [dateFilter, setDateFilter] = useState("");

  const [modalMode, setModalMode] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [formState, setFormState] = useState({
    ...DEFAULT_FORM,
    scheduledAt: getDateTimeInputValue(),
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Customer users for audience picker
  const [customerUsers, setCustomerUsers] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const customerSearchTimer = useRef(null);

  const bannerInputRef = useRef(null);

  // Modal dropdown states
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isAudienceOpen, setIsAudienceOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const isModalOpen = Boolean(modalMode);
  useScrollLock(isModalOpen || Boolean(deleteTarget));

  // Fetch customer users for the audience picker
  const fetchCustomers = useCallback(async (search = "") => {
    setIsLoadingCustomers(true);
    try {
      const res = await getStaffCustomersApi(search ? { search } : {});
      const data = res?.data?.data ?? [];
      setCustomerUsers(
        data.map((u) => ({
          id: u._id,
          name: u.name || u.email,
          email: u.email,
          avatar: u.avatar,
        })),
      );
    } catch (err) {
      console.error("Failed to load customers", err);
      setCustomerUsers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  // Load customers when audience mode becomes "Specific Users"
  useEffect(() => {
    if (formState.audienceMode === "Specific Users" && isModalOpen) {
      fetchCustomers();
    }
  }, [formState.audienceMode, isModalOpen, fetchCustomers]);

  // Debounced customer search
  useEffect(() => {
    if (formState.audienceMode !== "Specific Users") return;
    clearTimeout(customerSearchTimer.current);
    customerSearchTimer.current = setTimeout(() => {
      fetchCustomers(customerSearch);
    }, 350);
    return () => clearTimeout(customerSearchTimer.current);
  }, [customerSearch, formState.audienceMode, fetchCustomers]);

  const hydrateNotifications = useCallback(async () => {
    try {
      const res = await getStaffOutboxApi({ page: 1, limit: 50 });
      const apiData = res?.data?.data ?? [];
      const rows = apiData.map(mapOutboxToRow);

      rows.sort(
        (a, b) =>
          new Date(b.createdDate || 0).getTime() -
          new Date(a.createdDate || 0).getTime(),
      );

      setNotifications(rows);
      setError(null);
    } catch (apiError) {
      console.error("Failed to load outbox from API", apiError);
      setNotifications([]);
      setError(
        getApiErrorMessage(
          apiError,
          "Unable to load notifications from server.",
        ),
      );
    }
  }, []);

  const handleRefreshNotifications = useCallback(async () => {
    setLoading(true);
    await hydrateNotifications();
    setLoading(false);
  }, [hydrateNotifications]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      await hydrateNotifications();
      if (!isMounted) return;
      setLoading(false);
    }, 320);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hydrateNotifications]);

  const resetForm = useCallback(() => {
    setSelectedNotification(null);
    setFormState({
      ...DEFAULT_FORM,
      scheduledAt: getDateTimeInputValue(),
    });
    setFormErrors({});
  }, []);

  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
  };

  const openEditModal = (notification) => {
    setSelectedNotification(notification);
    setFormErrors({});
    setFormState({
      title: notification.title || "",
      type: notification.type || "Promotion",
      summary: notification.summary || "",
      content: notification.content || "",
      bannerImage: notification.bannerImage || "",
      audienceMode: notification.targetAudience || "All Customers",
      audienceUsers: Array.isArray(notification.audienceUsers)
        ? notification.audienceUsers
        : [],
      deliveryMode: notification.scheduledAt ? "Schedule later" : "Send now",
      scheduledAt: notification.scheduledAt
        ? getDateTimeInputValue(notification.scheduledAt)
        : getDateTimeInputValue(),
      priority: notification.priority || "Normal",
      status: notification.status || "Draft",
    });
    setModalMode("edit");
  };

  const openViewModal = (notification) => {
    setSelectedNotification(notification);
    setFormErrors({});
    setFormState({
      title: notification.title || "",
      type: notification.type || "Promotion",
      summary: notification.summary || "",
      content: notification.content || "",
      bannerImage: notification.bannerImage || "",
      audienceMode: notification.targetAudience || "All Customers",
      audienceUsers: Array.isArray(notification.audienceUsers)
        ? notification.audienceUsers
        : [],
      deliveryMode: notification.scheduledAt ? "Schedule later" : "Send now",
      scheduledAt: notification.scheduledAt
        ? getDateTimeInputValue(notification.scheduledAt)
        : getDateTimeInputValue(),
      priority: notification.priority || "Normal",
      status: notification.status || "Draft",
    });
    setModalMode("view");
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalMode(null);
    resetForm();
  };

  const handleBannerUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormErrors((prev) => ({
        ...prev,
        bannerImage: "Please upload an image file.",
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        bannerImage: "Image must be less than 5MB.",
      }));
      return;
    }

    try {
      setIsUploadingBanner(true);
      setFormErrors((prev) => ({ ...prev, bannerImage: undefined }));
      const uploadedUrl = await uploadSingleImage(file);
      if (!uploadedUrl) {
        throw new Error("Upload response missing image URL");
      }
      setFormState((prev) => ({ ...prev, bannerImage: uploadedUrl }));
    } catch (uploadError) {
      console.error("Failed to upload notification banner", uploadError);
      setFormErrors((prev) => ({
        ...prev,
        bannerImage: "Failed to upload image. Please try again.",
      }));
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = "";
      }
    }
  };

  const validateForm = (intent = "send") => {
    const nextErrors = {};

    if (!formState.title.trim()) {
      nextErrors.title = "Notification title is required.";
    }
    if (!formState.content.trim()) {
      nextErrors.content = "Message content is required.";
    }
    if (!formState.audienceMode) {
      nextErrors.audienceMode = "Please choose a target audience.";
    }
    if (
      formState.audienceMode === "Specific Users" &&
      (!Array.isArray(formState.audienceUsers) ||
        formState.audienceUsers.length === 0)
    ) {
      nextErrors.audienceUsers = "Select at least one specific user.";
    }

    if (formState.deliveryMode === "Schedule later") {
      if (!formState.scheduledAt) {
        nextErrors.scheduledAt = "Scheduled date & time is required.";
      } else {
        const scheduleTime = new Date(formState.scheduledAt).getTime();
        if (Number.isNaN(scheduleTime) || scheduleTime < Date.now()) {
          nextErrors.scheduledAt = "Scheduled time cannot be in the past.";
        }
      }
    }

    if (intent === "send" && formState.status === "Failed") {
      nextErrors.status = "Failed status cannot be sent directly.";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resolveStatusByIntent = (intent) => {
    if (intent === "draft") return "Draft";
    if (formState.deliveryMode === "Schedule later") return "Scheduled";
    return "Sent";
  };

  const resolveDeliveryLabel = (statusValue) => {
    if (statusValue === "Draft") return "Draft";
    if (statusValue === "Scheduled") return "Pending";
    if (statusValue === "Failed") return "Failed: 8 users";
    const audienceSize = getAudienceSize(
      formState.audienceMode,
      formState.audienceUsers?.length || 0,
    );
    return `Sent to ${audienceSize} users`;
  };

  const handleSubmitForm = async (intent = "send") => {
    if (modalMode === "view") {
      closeModal();
      return;
    }

    if (!validateForm(intent)) {
      return;
    }

    setIsSaving(true);
    try {
      const apiType = UI_TO_API_NOTIFICATION_TYPE[formState.type] || "system";
      const selectedAudienceUsers =
        formState.audienceMode === "Specific Users"
          ? formState.audienceUsers
          : [];
      const expectedRecipients = getAudienceSize(
        formState.audienceMode,
        selectedAudienceUsers.length,
      );

      let statusValue = resolveStatusByIntent(intent);
      const currentStaffId = getCurrentStaffId();

      if (
        (statusValue === "Draft" || statusValue === "Scheduled") &&
        !isObjectId(currentStaffId)
      ) {
        throw new Error("Cannot identify current staff account");
      }

      const commonMetadata = {
        summary: formState.summary.trim(),
        targetAudience: formState.audienceMode,
        audienceUsers: selectedAudienceUsers,
        scheduledAt:
          formState.deliveryMode === "Schedule later"
            ? new Date(formState.scheduledAt).toISOString()
            : "",
        priority: formState.priority,
        bannerImage: formState.bannerImage,
        createdBy: getCurrentStaffName(),
        expectedRecipients,
        status: statusValue,
        delivery: resolveDeliveryLabel(statusValue),
      };

      const apiPayload = {
        title: formState.title.trim(),
        body: formState.content.trim(),
        type: apiType,
        imageUrl: formState.bannerImage || undefined,
        metadata: commonMetadata,
      };

      if (statusValue === "Sent") {
        if (formState.audienceMode === "Specific Users") {
          await Promise.all(
            selectedAudienceUsers.map((userId) =>
              sendNotificationApi({ ...apiPayload, userId }),
            ),
          );
        } else {
          await broadcastNotificationApi(apiPayload);
        }
        toast.success("Notification sent successfully!");
      } else if (statusValue === "Draft") {
        await sendNotificationApi({ ...apiPayload, userId: currentStaffId });
        toast.success("Draft saved to server.");
      } else if (statusValue === "Scheduled") {
        await sendNotificationApi({ ...apiPayload, userId: currentStaffId });
        toast.success("Notification scheduled and saved to server.");
      }

      // Refresh list from API to stay in sync
      await hydrateNotifications();
      closeModal();
    } catch (submitError) {
      console.error("Failed to save notification", submitError);
      toast.error(
        getApiErrorMessage(
          submitError,
          "Failed to save notification. Please try again.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAudienceUser = (userId) => {
    setFormState((prev) => {
      const exists = prev.audienceUsers.includes(userId);
      return {
        ...prev,
        audienceUsers: exists
          ? prev.audienceUsers.filter((item) => item !== userId)
          : [...prev.audienceUsers, userId],
      };
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    // If it has an API ID, try to delete from API too
    if (deleteTarget._apiId && isObjectId(deleteTarget._apiId)) {
      try {
        await deleteNotificationApi(deleteTarget._apiId);
      } catch {
        /* ignore - might be already deleted */
      }
    }

    setDeleteTarget(null);
    // Refresh from API
    await hydrateNotifications();
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const query = searchTerm.trim().toLowerCase();
      const queryPass =
        !query ||
        item.title?.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query) ||
        item.targetAudience?.toLowerCase().includes(query) ||
        item.id?.toLowerCase().includes(query);

      const audiencePass =
        audienceFilter === "All Audiences" ||
        item.targetAudience === audienceFilter;

      const typePass = typeFilter === "All Types" || item.type === typeFilter;
      const statusPass =
        statusFilter === "All Status" || item.status === statusFilter;

      const datePass = (() => {
        if (!dateFilter) return true;
        const baseDate =
          dateMode === "Scheduled Date"
            ? item.scheduledAt || ""
            : item.createdDate || "";
        if (!baseDate) return false;

        const itemDate = new Date(baseDate);
        if (Number.isNaN(itemDate.getTime())) return false;
        const pickedDate = new Date(`${dateFilter}T00:00:00`);
        return (
          itemDate.getFullYear() === pickedDate.getFullYear() &&
          itemDate.getMonth() === pickedDate.getMonth() &&
          itemDate.getDate() === pickedDate.getDate()
        );
      })();

      return queryPass && audiencePass && typePass && statusPass && datePass;
    });
  }, [
    notifications,
    searchTerm,
    audienceFilter,
    typeFilter,
    statusFilter,
    dateMode,
    dateFilter,
  ]);

  const summary = useMemo(() => {
    const today = new Date();
    const totalNotifications = notifications.length;
    const sentToday = notifications.filter((item) => {
      if (item.status !== "Sent") return false;
      const itemDate = new Date(item.createdDate || item.scheduledAt || "");
      if (Number.isNaN(itemDate.getTime())) return false;
      return (
        itemDate.getFullYear() === today.getFullYear() &&
        itemDate.getMonth() === today.getMonth() &&
        itemDate.getDate() === today.getDate()
      );
    }).length;

    return {
      totalNotifications,
      sentToday,
      scheduled: notifications.filter((item) => item.status === "Scheduled")
        .length,
      drafts: notifications.filter((item) => item.status === "Draft").length,
    };
  }, [notifications]);

  const isEmptyState = !loading && !error && notifications.length === 0;
  const isNoResultState =
    !loading &&
    !error &&
    notifications.length > 0 &&
    filteredNotifications.length === 0;

  const handleResetFilters = () => {
    setSearchTerm("");
    setAudienceFilter("All Audiences");
    setTypeFilter("All Types");
    setStatusFilter("All Status");
    setDateMode("Created Date");
    setDateFilter("");
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <section className="flex flex-col gap-3 rounded-2xl border border-[#E8DDD0]/70 bg-[#FFFCF8] px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[27px] leading-[1.1] font-black text-[#D97853]">
            Notification Management
          </h1>
          <p className="mt-1 text-sm text-[#2D3436]/58">
            Create, schedule, and track customer notifications in one place.
          </p>
        </div>

        <Motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#D97853] px-4.5 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(217,120,83,0.78)] transition-colors hover:bg-[#C86A46]"
        >
          <Plus size={17} />
          Create Notification
        </Motion.button>
      </section>

      <AdminFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by title, content, audience, ID..."
        filters={[
          {
            label: "AUDIENCE",
            icon: Target,
            value: audienceFilter,
            options: ["All Audiences", ...AUDIENCE_OPTIONS],
            onChange: setAudienceFilter,
          },
          {
            label: "TYPE",
            icon: FileText,
            value: typeFilter,
            options: ["All Types", ...TYPE_OPTIONS],
            onChange: setTypeFilter,
          },
          {
            label: "STATUS",
            icon: CheckCircle2,
            value: statusFilter,
            options: ["All Status", ...STATUS_OPTIONS],
            onChange: setStatusFilter,
          },
          {
            label: "DATE MODE",
            icon: CalendarClock,
            value: dateMode,
            options: ["Created Date", "Scheduled Date"],
            onChange: setDateMode,
          },
        ]}
        dateValue={dateFilter ? new Date(dateFilter) : null}
        onDateChange={(date) => {
          if (date) {
            const offsetDate = new Date(
              date.getTime() - date.getTimezoneOffset() * 60000,
            );
            setDateFilter(offsetDate.toISOString().split("T")[0]);
          } else {
            setDateFilter("");
          }
        }}
        dateLabel={
          dateMode === "Created Date" ? "CREATED DATE" : "SCHEDULED DATE"
        }
        extraActions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshNotifications}
              className="flex items-center justify-center min-w-[38px] h-[38px] rounded-xl border border-[#E4D9CD]/75 bg-[#FFFCF8] text-[#6B7C92] hover:border-[#D97853]/35 hover:text-[#D97853] transition-all flex-shrink-0"
              title="Refresh"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={handleResetFilters}
              className="flex items-center justify-center min-w-[38px] h-[38px] rounded-xl border border-[#E4D9CD]/75 bg-[#FFFCF8] text-[#6B7C92] hover:border-[#D97853]/35 hover:text-[#D97853] transition-all flex-shrink-0"
              title="Reset Filters"
            >
              <Archive size={15} />
            </button>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Notifications",
            value: summary.totalNotifications,
            icon: BellRing,
            iconClass: "text-[#C76E3F] bg-[#FFF2E8]",
          },
          {
            label: "Sent Today",
            value: summary.sentToday,
            icon: Send,
            iconClass: "text-[#2D7A4A] bg-[#EBF8F0]",
          },
          {
            label: "Scheduled",
            value: summary.scheduled,
            icon: CalendarClock,
            iconClass: "text-[#AD7321] bg-[#FFF8E7]",
          },
          {
            label: "Drafts",
            value: summary.drafts,
            icon: Archive,
            iconClass: "text-[#55677C] bg-[#EEF2F7]",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[#E8DED2]/80 bg-[#FFFEFB] px-4 py-3.5 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.55)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6F7E92]">
                    {card.label}
                  </p>
                  <p className="mt-1 text-[28px] leading-none font-black text-[#24364D]">
                    {card.value}
                  </p>
                </div>
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.iconClass}`}
                >
                  <Icon size={16} strokeWidth={2} />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <div className="overflow-hidden rounded-2xl border border-[#E8DED2]/85 bg-[#FFFEFB]">
          <div className="flex items-center justify-between border-b border-[#EFE5DA] px-4 py-2.5">
            <p className="text-sm font-semibold text-[#2D3436]">
              Notification List
            </p>
            <span className="rounded-full border border-[#F2DCC7] bg-[#FFF4EA] px-2.5 py-1 text-[11px] font-semibold text-[#AF642F]">
              {filteredNotifications.length} item(s)
            </span>
          </div>

          {loading ? (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full">
                <thead className="bg-[#FCF7F2] text-left text-[11px] uppercase tracking-wide text-[#67788F]">
                  <tr>
                    {[
                      "Title",
                      "Type",
                      "Target Audience",
                      "Created By",
                      "Created Date",
                      "Scheduled At",
                      "Status",
                      "Delivery",
                      "Actions",
                    ].map((label) => (
                      <th key={label} className="px-4 py-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <NotificationSkeletonRow
                      key={`notification-skeleton-${idx}`}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : error ? (
            <div className="p-5">
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 md:flex-row md:items-center md:justify-between">
                <p className="inline-flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {error}
                </p>
                <button
                  onClick={handleRefreshNotifications}
                  className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : isEmptyState ? (
            <div className="px-4 py-16 text-center">
              <BellRing size={30} className="mx-auto text-[#D3C8BC]" />
              <p className="mt-3 text-base font-semibold text-[#2D3436]">
                No notifications found
              </p>
              <p className="mt-1 text-sm text-[#2D3436]/55">
                Create your first notification to start customer communication.
              </p>
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#D97853] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C86A46]"
              >
                <Plus size={15} />
                Create Notification
              </button>
            </div>
          ) : isNoResultState ? (
            <div className="px-4 py-16 text-center">
              <Search size={30} className="mx-auto text-[#D3C8BC]" />
              <p className="mt-3 text-base font-semibold text-[#2D3436]">
                No results matched your filters
              </p>
              <p className="mt-1 text-sm text-[#2D3436]/55">
                Try adjusting search terms or reset all filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#E4DFD7] bg-[#FAF7F2] px-4 py-2 text-sm font-semibold text-[#2D3436]/75 hover:border-[#D97853]/35 hover:text-[#D97853]"
              >
                <RotateCcw size={15} />
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full">
                <thead className="bg-[#FCF7F2] text-left text-[11px] uppercase tracking-wide text-[#67788F]">
                  <tr>
                    {[
                      "Title",
                      "Type",
                      "Target Audience",
                      "Created By",
                      "Created Date",
                      "Scheduled At",
                      "Status",
                      "Delivery",
                      "Actions",
                    ].map((label) => (
                      <th key={label} className="px-4 py-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredNotifications.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[#F0E7DC] text-sm transition-colors hover:bg-[#FFFAF5]"
                    >
                      <td className="px-4 py-3 align-top">
                        <p className="max-w-[270px] truncate font-semibold text-[#2D3436]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 max-w-[270px] truncate text-xs text-[#2D3436]/55">
                          {item.id} • {item.summary || "No preview available"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[#2D3436]/75">
                        {item.type}
                      </td>
                      <td className="px-4 py-3 text-[#2D3436]/75">
                        {item.targetAudience}
                      </td>
                      <td className="px-4 py-3 text-[#2D3436]/75">
                        {item.createdBy}
                      </td>
                      <td className="px-4 py-3 text-[#2D3436]/75">
                        {formatDateTime(item.createdDate)}
                      </td>
                      <td className="px-4 py-3 text-[#2D3436]/75">
                        {formatDateTime(item.scheduledAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${STATUS_STYLE[item.status] || STATUS_STYLE.Draft}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#2D3436]/70 text-[13px]">
                        {item.delivery || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openViewModal(item)}
                            className="rounded-lg border border-transparent p-1.5 text-[#2D3436]/55 transition-colors hover:border-[#DCE7FB] hover:bg-[#EAF2FF] hover:text-[#1D4ED8]"
                            aria-label="View notification"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="rounded-lg border border-transparent p-1.5 text-[#2D3436]/55 transition-colors hover:border-[#F4DFC8] hover:bg-[#FFF4E8] hover:text-[#B45309]"
                            aria-label="Edit notification"
                          >
                            <PenSquare size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="rounded-lg border border-transparent p-1.5 text-[#2D3436]/55 transition-colors hover:border-[#F5D8D8] hover:bg-[#FFF1F1] hover:text-[#B42318]"
                            aria-label="Delete notification"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {isModalOpen && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/42 p-4 backdrop-blur-[3px]"
            onClick={closeModal}
          >
            <Motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-[1040px] overflow-hidden rounded-[22px] border border-[#E8DED2]/85 bg-[#FFFEFB] shadow-[0_30px_90px_-42px_rgba(15,23,42,0.52)]"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#EEE5D9] bg-gradient-to-r from-[#FFF8F2] via-[#FFFDFB] to-[#FFF7F0] px-6 py-4.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D97853]/10">
                    <BellRing size={16} className="text-[#D97853]" />
                  </div>
                  <div>
                    <h2 className="text-[19px] font-bold text-[#2D3436]">
                      {modalMode === "create"
                        ? "Create Notification"
                        : modalMode === "edit"
                          ? "Update Notification"
                          : "Notification Detail"}
                    </h2>
                    <p className="text-xs font-medium text-[#2D3436]/50">
                      Compose and send push notifications to your audience
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-[#E8DED2] bg-white text-[#2D3436]/55 transition-all hover:bg-[#F8F4EF] hover:border-[#D97853]/30 hover:text-[#D97853]"
                  aria-label="Close modal"
                >
                  <X size={17} />
                </button>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSubmitForm("send");
                }}
                className="flex flex-col max-h-[84vh]"
              >
                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D8D0C4]/40 [&::-webkit-scrollbar-thumb:hover]:bg-[#D8D0C4]/60">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.06fr_0.94fr] lg:gap-5">
                    {/* Section 1: Basic Information */}
                    <div className="mb-7 lg:mb-0">
                      <div className="mb-4 flex items-center gap-2.5">
                        <span className="flex h-5.5 w-5.5 items-center justify-center rounded-md bg-[#D97853]/12 text-[10px] font-bold text-[#D97853]">
                          1
                        </span>
                        <h3 className="text-xs font-bold tracking-[0.11em] text-[#44566F]">
                          BASIC INFORMATION
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {/* Notification Title - Full Width */}
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
                            Notification Title
                          </label>
                          <input
                            value={formState.title}
                            disabled={modalMode === "view"}
                            onChange={(event) =>
                              setFormState((prev) => ({
                                ...prev,
                                title: event.target.value,
                              }))
                            }
                            className={`${CONTROL_CLASS} ${modalMode === "view" ? CONTROL_READONLY_CLASS : ""}`}
                            placeholder="e.g. Vaccination Reminder for Premium Members"
                          />
                          {formErrors.title && (
                            <p className="mt-1.5 text-xs font-medium text-red-500">
                              {formErrors.title}
                            </p>
                          )}
                        </div>

                        {/* Type + Preview - 2 Column Row */}
                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
                              Notification Type
                            </label>
                            <CustomSelect
                              options={TYPE_OPTIONS}
                              value={formState.type}
                              onChange={(val) =>
                                setFormState((prev) => ({ ...prev, type: val }))
                              }
                              isOpen={isTypeOpen}
                              setIsOpen={setIsTypeOpen}
                              disabled={modalMode === "view"}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
                              Short Preview
                            </label>
                            <input
                              value={formState.summary}
                              disabled={modalMode === "view"}
                              onChange={(event) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  summary: event.target.value,
                                }))
                              }
                              className={`${CONTROL_CLASS} ${modalMode === "view" ? CONTROL_READONLY_CLASS : ""}`}
                              placeholder="One-line preview text"
                            />
                          </div>
                        </div>

                        {/* Message Content - Move to left below Basic Information */}
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
                            Message Content
                          </label>
                          <textarea
                            value={formState.content}
                            disabled={modalMode === "view"}
                            onChange={(event) =>
                              setFormState((prev) => ({
                                ...prev,
                                content: event.target.value,
                              }))
                            }
                            rows={6}
                            className={`${CONTROL_CLASS} ${modalMode === "view" ? CONTROL_READONLY_CLASS : ""} min-h-[148px] resize-none leading-relaxed`}
                            placeholder="Write clear and concise notification content..."
                          />
                          {formErrors.content && (
                            <p className="mt-1.5 text-xs font-medium text-red-500">
                              {formErrors.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Content & Audience */}
                    <div className="mt-0 lg:border-l lg:border-[#E8DED2]/65 lg:pl-5">
                      <div className="mb-4 flex items-center gap-2.5">
                        <span className="flex h-5.5 w-5.5 items-center justify-center rounded-md bg-[#D97853]/12 text-[10px] font-bold text-[#D97853]">
                          2
                        </span>
                        <h3 className="text-xs font-bold tracking-[0.11em] text-[#44566F]">
                          CONTENT & AUDIENCE
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {/* Banner Upload + Preview - 2 Column Row */}
                        <div className="grid grid-cols-[1fr_198px] gap-3.5">
                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
                              Banner Image
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                ref={bannerInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleBannerUpload}
                                className="hidden"
                                disabled={
                                  modalMode === "view" || isUploadingBanner
                                }
                              />
                              <button
                                type="button"
                                disabled={
                                  modalMode === "view" || isUploadingBanner
                                }
                                onClick={() => bannerInputRef.current?.click()}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#D8D0C4]/55 bg-white px-3.5 text-xs font-semibold text-[#2D3436]/70 shadow-sm transition-all hover:border-[#D97853]/45 hover:text-[#D97853] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isUploadingBanner ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <UploadCloud size={14} />
                                )}
                                {isUploadingBanner
                                  ? "Uploading..."
                                  : "Upload Banner"}
                              </button>

                              {formState.bannerImage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormState((prev) => ({
                                      ...prev,
                                      bannerImage: "",
                                    }))
                                  }
                                  disabled={modalMode === "view"}
                                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#F2D6D6]/70 bg-[#FFF8F8] px-3 text-xs font-semibold text-[#B42318]/80 transition-all hover:bg-[#FFF1F1] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <X size={12} />
                                  Remove
                                </button>
                              )}
                            </div>
                            {formErrors.bannerImage && (
                              <p className="mt-1.5 text-xs font-medium text-red-500">
                                {formErrors.bannerImage}
                              </p>
                            )}
                          </div>

                          {/* Banner Preview */}
                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
                              Preview
                            </label>
                            {formState.bannerImage ? (
                              <div className="h-[64px] w-full overflow-hidden rounded-lg border border-[#E8DED2]/60 bg-[#F8F6F2]">
                                <img
                                  src={formState.bannerImage}
                                  alt="Banner preview"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-[64px] w-full items-center justify-center rounded-lg border border-dashed border-[#D8D0C4]/45 bg-[#FAF8F5] text-[10px] font-semibold uppercase tracking-widest text-[#2D3436]/30">
                                No banner
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Audience + Priority - 2 Column Row */}
                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
                              Send To (Audience)
                            </label>
                            <CustomSelect
                              options={AUDIENCE_OPTIONS}
                              value={formState.audienceMode}
                              onChange={(val) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  audienceMode: val,
                                }))
                              }
                              isOpen={isAudienceOpen}
                              setIsOpen={setIsAudienceOpen}
                              disabled={modalMode === "view"}
                            />
                            {formErrors.audienceMode && (
                              <p className="mt-1.5 text-xs font-medium text-red-500">
                                {formErrors.audienceMode}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
                              Priority Level
                            </label>
                            <CustomSelect
                              options={PRIORITY_OPTIONS}
                              value={formState.priority}
                              onChange={(val) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  priority: val,
                                }))
                              }
                              isOpen={isPriorityOpen}
                              setIsOpen={setIsPriorityOpen}
                              disabled={modalMode === "view"}
                            />
                          </div>
                        </div>

                        {/* Delivery Mode + Scheduled Date/Time - 2 Column Row */}
                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
                              Delivery Mode
                            </label>
                            <CustomSelect
                              options={["Send now", "Schedule later"]}
                              value={formState.deliveryMode}
                              onChange={(val) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  deliveryMode: val,
                                }))
                              }
                              isOpen={isDeliveryOpen}
                              setIsOpen={setIsDeliveryOpen}
                              disabled={modalMode === "view"}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
                              Schedule Date & Time
                            </label>
                            <div className="relative">
                              <DatePicker
                                selected={toScheduledAtDate(
                                  formState.scheduledAt,
                                )}
                                onChange={(date) =>
                                  setFormState((prev) => ({
                                    ...prev,
                                    scheduledAt: toScheduledAtString(date),
                                  }))
                                }
                                showTimeSelect
                                timeIntervals={15}
                                timeCaption="Time"
                                dateFormat="dd/MM/yyyy HH:mm"
                                placeholderText="Select date and time"
                                disabled={
                                  modalMode === "view" ||
                                  formState.deliveryMode !== "Schedule later"
                                }
                                minDate={new Date()}
                                className={`${CONTROL_CLASS} ${modalMode === "view" ? CONTROL_READONLY_CLASS : ""}`}
                                wrapperClassName="w-full"
                                popperClassName="notification-datepicker-popper"
                                calendarClassName="notification-datepicker-calendar"
                                showPopperArrow={false}
                              />
                              <CalendarClock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2D3436]/40" />
                            </div>
                            {formErrors.scheduledAt && (
                              <p className="mt-1.5 text-xs font-medium text-red-500">
                                {formErrors.scheduledAt}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status (for edit mode) */}
                        {modalMode === "edit" && (
                          <div className="max-w-[280px]">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2D3436]/55">
                              Status
                            </label>
                            <CustomSelect
                              options={STATUS_OPTIONS}
                              value={formState.status}
                              onChange={(val) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  status: val,
                                }))
                              }
                              isOpen={isStatusOpen}
                              setIsOpen={setIsStatusOpen}
                              disabled={modalMode === "view"}
                            />
                            {formErrors.status && (
                              <p className="mt-1.5 text-xs font-medium text-red-500">
                                {formErrors.status}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Specific Users Selection */}
                        {formState.audienceMode === "Specific Users" && (
                          <div className="rounded-xl border border-dashed border-[#D8D0C4]/50 bg-[#FAF8F5] p-3.5">
                            <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-[#D97853]">
                              Select Specific Users
                            </label>

                            {/* Search customers */}
                            <div className="relative mb-3">
                              <Search
                                size={13}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2D3436]/35"
                              />
                              <input
                                value={customerSearch}
                                onChange={(e) =>
                                  setCustomerSearch(e.target.value)
                                }
                                placeholder="Search by name or email..."
                                className="w-full rounded-lg border border-[#D8D0C4]/45 bg-white py-2 pl-8 pr-3 text-xs text-[#2D3436] outline-none transition-all focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/12"
                              />
                            </div>

                            {isLoadingCustomers ? (
                              <div className="grid grid-cols-2 gap-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="animate-pulse rounded-lg border border-[#E8DED2]/30 bg-white p-2.5"
                                  >
                                    <div className="h-2.5 w-20 rounded bg-[#EDE6DB]" />
                                    <div className="mt-1.5 h-2 w-28 rounded bg-[#F5F0EA]" />
                                  </div>
                                ))}
                              </div>
                            ) : customerUsers.length === 0 ? (
                              <p className="py-4 text-center text-xs text-[#2D3436]/40">
                                {customerSearch
                                  ? "No customers found matching your search."
                                  : "No customers available."}
                              </p>
                            ) : (
                              <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D8D0C4]/40">
                                {customerUsers.map((user) => {
                                  const selected =
                                    formState.audienceUsers.includes(user.id);
                                  return (
                                    <label
                                      key={user.id}
                                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 transition-colors ${
                                        selected
                                          ? "border-[#D97853] bg-[#FFF5EC]"
                                          : "border-[#E8DED2]/50 bg-white hover:border-[#D97853]/40"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        disabled={modalMode === "view"}
                                        onChange={() =>
                                          handleToggleAudienceUser(user.id)
                                        }
                                        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[#D4CDC4] text-[#D97853] focus:ring-[#D97853]/25"
                                      />
                                      <span className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-[#2D3436]">
                                          {user.name}
                                        </p>
                                        <p className="truncate text-[10px] text-[#2D3436]/50">
                                          {user.email}
                                        </p>
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            {formState.audienceUsers.length > 0 && (
                              <p className="mt-2.5 text-[11px] font-semibold text-[#D97853]">
                                {formState.audienceUsers.length} user(s)
                                selected
                              </p>
                            )}
                            {formErrors.audienceUsers && (
                              <p className="mt-2 text-xs font-medium text-red-500">
                                {formErrors.audienceUsers}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer - Sticky */}
                <div className="flex items-center justify-end gap-2.5 border-t border-[#EEE5D9] bg-[#FFFDFB] px-6 py-3.5">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSaving}
                    className="h-10 rounded-xl border border-[#E8DED2] bg-white px-4 text-sm font-semibold text-[#2D3436]/70 shadow-sm transition-all hover:border-[#D97853]/40 hover:text-[#D97853] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  {modalMode !== "view" && (
                    <button
                      type="button"
                      onClick={() => handleSubmitForm("draft")}
                      disabled={isSaving}
                      className="h-10 rounded-xl border border-[#D8DEE9] bg-white px-4 text-sm font-semibold text-[#64748B] shadow-sm transition-all hover:border-[#A7B6C7] hover:text-[#475569] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save Draft
                    </button>
                  )}

                  {modalMode !== "view" ? (
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#D97853] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(217,120,83,0.3)] transition-all hover:bg-[#C86A46] hover:shadow-[0_6px_18px_rgba(217,120,83,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                      Send Notification
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2D3436] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(45,52,54,0.25)] transition-all hover:bg-[#1D2224]"
                    >
                      <CheckCircle2 size={15} />
                      Close
                    </button>
                  )}
                </div>
              </form>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/42 p-4 backdrop-blur-[2px]"
            onClick={() => setDeleteTarget(null)}
          >
            <Motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="w-full max-w-[430px] rounded-2xl border border-[#F1D9D9] bg-[#FFFEFB] p-4.5 shadow-[0_22px_60px_-30px_rgba(15,23,42,0.5)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF1F1] text-[#B42318]">
                  <AlertTriangle size={17} />
                </span>

                <div>
                  <h3 className="text-base font-semibold text-[#2D3436]">
                    Delete notification?
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#2D3436]/65">
                    This removes the item from management history. If already
                    sent, delivered logs remain unchanged in customer tracking.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#2D3436] truncate max-w-[300px]">
                    {deleteTarget.title}
                  </p>
                </div>
              </div>

              <div className="mt-4.5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="h-9 rounded-xl border border-[#E4DFD7] bg-[#FAF7F2] px-3.5 text-sm font-semibold text-[#2D3436]/75 transition-colors hover:border-[#D97853]/35 hover:text-[#D97853]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#F1B6B6] bg-[#FFF1F1] px-3.5 text-sm font-semibold text-[#B42318] transition-colors hover:bg-[#FFE7E7]"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
};

export default StaffNotificationsManagement;
