import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import useScrollLock from "../../../hooks/useScrollLock";
import {
  Plus,
  Search,
  FileText,
  Megaphone,
  Clock,
  Eye,
  Edit,
  Calendar,
  Trash2,
  MoreVertical,
  X,
  UploadCloud,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Monitor,
  Activity,
  AlertTriangle,
} from "lucide-react";
import DatePicker from "react-datepicker";
import {
  getAllNews,
  getNewsBySlug,
  uploadNewsImage as uploadNewsImageApi,
  createNews as createNewsApi,
  updateNews as updateNewsApi,
  deleteNews as deleteNewsApi,
} from "../../../api/newsApi";
import "react-datepicker/dist/react-datepicker.css";

const CustomSelect = ({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  isOpen,
  setIsOpen,
  rightIcon: RightIcon = ChevronDown,
  isModal = false,
  up = false,
}) => (
  <div
    className={`relative flex-col flex ${isModal ? "" : "min-w-[170px] lg:min-w-[180px]"} ${isOpen ? "z-[60]" : "z-10"}`}
  >
    {label && !isModal && (
      <span className="text-[11px] font-bold text-[#D97853] uppercase tracking-widest ml-1 mb-1.5">
        {label}
      </span>
    )}
    {label && isModal && (
      <label className="block text-sm font-bold text-[#2D3436] mb-2">
        {label}
      </label>
    )}

    <div
      className={`flex items-center justify-between px-4 ${isModal ? "py-3" : "py-2.5"} bg-[#FDFBF7] border ${isOpen && !isModal ? "border-[#D97853] ring-1 ring-[#D97853]/20" : isModal ? "border-[#D97853]" : "border-[#2D3436]/10"} ${isModal ? "rounded-2xl" : "rounded-full"} cursor-pointer hover:border-[#D97853] transition-all`}
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
      }}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon
            size={18}
            className={isOpen ? "text-[#D97853]" : "text-[#7FB069]"}
          />
        )}
        <span
          className={`text-sm ${isModal ? "font-medium" : "font-bold"} ${value.includes("Select") ? "text-gray-500" : "text-[#2D3436]"}`}
        >
          {value}
        </span>
      </div>
      <RightIcon
        size={isModal ? 14 : 16}
        className={`${isModal ? "text-[#D97853]" : "text-[#2D3436]/40"} transition-transform ${isOpen && RightIcon === ChevronDown ? "rotate-180" : ""}`}
      />
    </div>

    <AnimatePresence>
      {isOpen && (
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
            className={`absolute ${up ? "bottom-full mb-2" : isModal ? "top-[75px]" : "top-[100%] mt-2"} left-0 w-full bg-[#FDFBF7] rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#2D3436]/5 overflow-hidden z-50 py-1.5`}
          >
            {options.map((opt, idx) => {
              const isSelected = value === opt;
              return (
                <div
                  key={idx}
                  className={`px-4 py-2.5 text-[14px] cursor-pointer transition-colors ${!isSelected ? "text-[#2D3436]/70 hover:bg-[#2D3436]/5 font-medium" : "border-l-[3px] border-[#D97853] bg-[#D97853]/10 text-[#D97853] font-bold"}`}
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
      )}
    </AnimatePresence>
  </div>
);

const FALLBACK_NEWS_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='675' viewBox='0 0 1200 675'%3E%3Crect width='1200' height='675' fill='%23f4efe6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239b8c7c' font-family='Arial,sans-serif' font-size='42'%3ENo image uploaded%3C/text%3E%3C/svg%3E";
const CATEGORY_LABEL_BY_VALUE = {
  announcement: "Announcement",
  tips: "Tips",
  promotion: "Promotion",
  event: "Event",
  general: "General",
};

const CATEGORY_VALUE_BY_LABEL = {
  Announcement: "announcement",
  Tips: "tips",
  Promotion: "promotion",
  Event: "event",
  General: "general",
};

const CATEGORY_TAGS_BY_VALUE = {
  announcement: ["community", "announcement"],
  tips: ["wellness", "pet-care"],
  promotion: ["promotion", "deals"],
  event: ["event", "community"],
  general: ["pet-care", "happytails"],
};

const FIXED_AUDIENCE_LABEL = "All Customers";

const AUDIENCE_LABEL_CANONICAL = {
  allcustomers: "All Customers",
  dogowners: "Dog Owners",
  catowners: "Cat Owners",
  vipmembers: "VIP Members",
};

const AUDIENCE_TAG_BY_LABEL = {
  "All Customers": "all-customers",
  "Dog Owners": "dog-owners",
  "Cat Owners": "cat-owners",
  "VIP Members": "vip-members",
};

const AUDIENCE_LABEL_BY_TAG = Object.entries(AUDIENCE_TAG_BY_LABEL).reduce(
  (acc, [label, tag]) => {
    acc[tag] = label;
    return acc;
  },
  {},
);

const formatNewsDate = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const normalizeCategoryLabel = (value) => {
  if (!value) return "General";
  return CATEGORY_LABEL_BY_VALUE[value] || "General";
};

const normalizeCategoryValue = (label) => {
  if (!label || label === "Select Category") return "general";
  return CATEGORY_VALUE_BY_LABEL[label] || "general";
};

const normalizeAudienceLabel = (label) => {
  const key = String(label || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  return AUDIENCE_LABEL_CANONICAL[key] || "All Customers";
};

const buildExcerpt = (excerpt, content) => {
  return toPlainText(excerpt || content).slice(0, 500);
};

const buildNewsTags = (categoryValue, audienceLabel) => {
  const categoryTags =
    CATEGORY_TAGS_BY_VALUE[categoryValue] || CATEGORY_TAGS_BY_VALUE.general;
  const audienceTag =
    AUDIENCE_TAG_BY_LABEL[normalizeAudienceLabel(audienceLabel)];

  return [...new Set([...categoryTags, audienceTag].filter(Boolean))];
};

const getAudienceFromTags = (tags) => {
  if (!Array.isArray(tags)) {
    return "All Customers";
  }

  const matchedTag = tags
    .map((tag) =>
      String(tag || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-"),
    )
    .find((tag) => AUDIENCE_LABEL_BY_TAG[tag]);

  if (!matchedTag) {
    return "All Customers";
  }

  return AUDIENCE_LABEL_BY_TAG[matchedTag] || "All Customers";
};

const mapNewsToRow = (item) => {
  const dateSource = item.publishedAt || item.createdAt;
  const categoryValue = String(item.category || "general").toLowerCase();
  const coverImage =
    item.coverImage ||
    (Array.isArray(item.images) ? item.images[0] : "") ||
    FALLBACK_NEWS_IMAGE;

  return {
    id: item._id,
    slug: item.slug || "",
    title: item.title || "Untitled",
    category: normalizeCategoryLabel(categoryValue),
    audience: getAudienceFromTags(item.tags),
    status: item.isPublished ? "Published" : "Draft",
    date: formatNewsDate(dateSource),
    views: Number(item.views || 0).toLocaleString("en-US"),
    viewsCount: Number(item.views || 0),
    img: coverImage,
    content: item.content || "",
    excerpt: item.excerpt || "",
    categoryValue,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    raw: item,
  };
};

const formatRelativeTime = (value) => {
  if (!value) return "Just now";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "Just now";

  const diffMs = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} minutes ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hours ago`;
  return `${Math.floor(diffMs / day)} days ago`;
};

const toPlainText = (value) => {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getTimeValue = (value) => {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getPublishedOrderTime = (item) => {
  return getTimeValue(
    item?.raw?.publishedAt || item?.createdAt || item?.updatedAt,
  );
};

const StaffNewsManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  useScrollLock(
    isModalOpen ||
      isDetailOpen ||
      isEditOpen ||
      isDeleteOpen ||
      Boolean(previewImageUrl),
  );
  const [newsRows, setNewsRows] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingCreateImage, setIsUploadingCreateImage] = useState(false);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const createImageInputRef = useRef(null);
  const editImageInputRef = useRef(null);
  const [createForm, setCreateForm] = useState({
    title: "",
    content: "",
    coverImage: "",
    excerpt: "",
  });
  const [editForm, setEditForm] = useState({
    id: "",
    title: "",
    category: "General",
    audience: "All Customers",
    status: "Draft",
    date: "",
    content: "",
    coverImage: "",
    excerpt: "",
  });
  const [isEditCatOpen, setIsEditCatOpen] = useState(false);
  const [isEditAudOpen, setIsEditAudOpen] = useState(false);
  const [isEditStatOpen, setIsEditStatOpen] = useState(false);

  // In-page Toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const getErrorMessage = (error, fallback) => {
    const payload = error?.response?.data;
    const details =
      payload?.error?.details || payload?.details || payload?.errors;
    const firstDetail = Array.isArray(details) ? details[0] : null;
    const detailMessage =
      typeof firstDetail === "string" ? firstDetail : firstDetail?.message;

    return (
      payload?.message ||
      payload?.error?.message ||
      detailMessage ||
      error?.message ||
      fallback
    );
  };

  const anyModalOpen =
    isModalOpen || isDetailOpen || isEditOpen || isDeleteOpen;

  const resetCreateForm = () => {
    setCreateForm({
      title: "",
      content: "",
      coverImage: "",
      excerpt: "",
    });
    setModalCat("Select Category");
    setModalStat("Publish Now");
    setPublishDate(new Date());
    if (createImageInputRef.current) {
      createImageInputRef.current.value = "";
    }
  };

  const uploadCoverImage = async (file, target = "create") => {
    if (!file) return;

    if (target === "create") {
      setIsUploadingCreateImage(true);
    } else {
      setIsUploadingEditImage(true);
    }

    try {
      const response = await uploadNewsImageApi(file);
      const uploadedUrl = response?.data?.url;

      if (!uploadedUrl) {
        throw new Error("Upload response missing image URL");
      }

      if (target === "create") {
        setCreateForm((prev) => ({
          ...prev,
          coverImage: uploadedUrl,
        }));
      } else {
        setEditForm((prev) => ({
          ...prev,
          coverImage: uploadedUrl,
        }));
      }

      showToast("Image uploaded successfully");
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to upload image"), "error");
    } finally {
      if (target === "create") {
        setIsUploadingCreateImage(false);
        if (createImageInputRef.current) {
          createImageInputRef.current.value = "";
        }
      } else {
        setIsUploadingEditImage(false);
        if (editImageInputRef.current) {
          editImageInputRef.current.value = "";
        }
      }
    }
  };

  const loadNews = useCallback(async () => {
    setIsLoadingNews(true);
    try {
      const response = await getAllNews();
      const rows = (response?.data?.news || []).map(mapNewsToRow);
      setNewsRows(rows);
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to load news list"), "error");
    } finally {
      setIsLoadingNews(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (anyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [anyModalOpen]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const fetchNewsDetailBySlug = async (item) => {
    if (!item?.slug) return item;

    try {
      const response = await getNewsBySlug(item.slug);
      const freshNews = response?.data?.news;
      if (!freshNews) return item;

      const mapped = mapNewsToRow(freshNews);
      setNewsRows((current) =>
        current.map((row) => (row.id === mapped.id ? mapped : row)),
      );

      return mapped;
    } catch {
      return item;
    }
  };

  const openDetail = async (item) => {
    setSelectedNews(item);
    setIsDetailOpen(true);

    const refreshed = await fetchNewsDetailBySlug(item);
    setSelectedNews(refreshed);
  };
  const openEdit = (item) => {
    setSelectedNews(item);
    setEditForm({
      id: item.id,
      title: item.title,
      category: item.category,
      audience: item.audience,
      status: item.status,
      date: item.date,
      content: item.content || "",
      coverImage: item.img || "",
      excerpt: item.excerpt || "",
    });
    setIsEditOpen(true);
  };
  const openDelete = (item) => {
    setSelectedNews(item);
    setIsDeleteOpen(true);
  };

  // Top Filter States
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterCatOpen, setIsFilterCatOpen] = useState(false);
  const [isFilterStatusOpen, setIsFilterStatusOpen] = useState(false);

  const filterCategoryOpts = [
    "All Categories",
    "Announcement",
    "Tips",
    "Promotion",
    "Event",
    "General",
  ];
  const filterStatusOpts = ["All Status", "Published", "Draft"];

  // Modal Form States
  const [modalCat, setModalCat] = useState("Select Category");
  const [modalStat, setModalStat] = useState("Publish Now");
  const [publishDate, setPublishDate] = useState(new Date());
  const [isModalCatOpen, setIsModalCatOpen] = useState(false);
  const [isModalStatOpen, setIsModalStatOpen] = useState(false);

  const modalCatOpts = [
    "Select Category",
    "Announcement",
    "Tips",
    "Promotion",
    "Event",
    "General",
  ];
  const modalStatOpts = ["Publish Now", "Save as Draft", "Schedule Later"];
  const createActionLabel =
    modalStat === "Publish Now"
      ? "Publish Post"
      : modalStat === "Save as Draft"
        ? "Save Draft"
        : "Schedule Draft";

  const handleCreateNews = async () => {
    if (!createForm.title.trim() || !createForm.content.trim()) {
      showToast("Title and content are required", "error");
      return;
    }

    const coverImage = createForm.coverImage.trim();
    if (!coverImage) {
      showToast("Please upload a cover image before publishing", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const title = createForm.title.trim();
      const content = createForm.content.trim();
      const categoryValue = normalizeCategoryValue(modalCat);
      const audienceLabel = FIXED_AUDIENCE_LABEL;
      const isPublishNow = modalStat === "Publish Now";

      const payload = {
        title,
        content,
        excerpt: buildExcerpt(createForm.excerpt, content),
        coverImage,
        images: [coverImage],
        category: categoryValue,
        isPublished: isPublishNow,
        tags: buildNewsTags(categoryValue, audienceLabel),
      };

      await createNewsApi(payload);
      await loadNews();

      if (modalStat === "Schedule Later") {
        showToast(
          "Scheduling is not supported yet. Article was saved as draft.",
        );
      } else {
        showToast(
          isPublishNow
            ? "Article published successfully"
            : "Article saved as draft successfully",
        );
      }

      setIsModalOpen(false);
      resetCreateForm();
    } catch (error) {
      console.error("[News Create Error]", {
        status: error?.response?.status,
        data: error?.response?.data,
      });
      showToast(getErrorMessage(error, "Failed to create article"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNews = async () => {
    if (!editForm.id || !editForm.title.trim() || !editForm.content.trim()) {
      showToast("Title and content are required", "error");
      return;
    }

    const coverImage = editForm.coverImage.trim();
    if (!coverImage) {
      showToast("Please upload a cover image before saving", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const title = editForm.title.trim();
      const content = editForm.content.trim();
      const categoryValue = normalizeCategoryValue(editForm.category);
      const audienceLabel = normalizeAudienceLabel(editForm.audience);

      const payload = {
        title,
        content,
        excerpt: buildExcerpt(editForm.excerpt, content),
        coverImage,
        images: [coverImage],
        category: categoryValue,
        tags: buildNewsTags(categoryValue, audienceLabel),
        isPublished: editForm.status === "Published",
      };

      await updateNewsApi(editForm.id, payload);
      await loadNews();
      showToast("Article updated successfully");
      setIsEditOpen(false);
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to update article"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNews = async () => {
    if (!selectedNews?.id) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteNewsApi(selectedNews.id);
      await loadNews();
      showToast("Article deleted successfully");
      setIsDeleteOpen(false);
      setSelectedNews(null);
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to delete article"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter Logic
  const filteredNews = newsRows.filter((item) => {
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat =
      filterCategory === "All Categories" || item.category === filterCategory;
    const matchStatus =
      filterStatus === "All Status" || item.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  const promotionRows = newsRows.filter(
    (item) => item.categoryValue === "promotion",
  );

  const promotionCards = [...promotionRows]
    .sort((a, b) => b.viewsCount - a.viewsCount)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      badge: item.status === "Published" ? "LIVE" : "DRAFT",
      desc:
        toPlainText(item.excerpt || item.content || "No description") ||
        "No description",
    }));

  const recentActivityRows = [...newsRows]
    .sort(
      (a, b) =>
        getTimeValue(b.updatedAt || b.createdAt) -
        getTimeValue(a.updatedAt || a.createdAt),
    )
    .slice(0, 5)
    .map((item) => {
      const createdTime = getTimeValue(item.createdAt);
      const updatedTime = getTimeValue(item.updatedAt);
      const isEdited = updatedTime > createdTime + 60 * 1000;
      const isPromotion = item.categoryValue === "promotion";

      if (isEdited) {
        return {
          id: item.id,
          action: "Article updated",
          target: `"${item.title}"`,
          time: formatRelativeTime(item.updatedAt || item.createdAt),
          icon: Edit,
          color: "text-[#7FB069]",
          bg: "bg-[#7FB069]/15",
          item,
        };
      }

      if (isPromotion) {
        return {
          id: item.id,
          action:
            item.status === "Published"
              ? "Promotion activated"
              : "Promotion drafted",
          target: `"${item.title}"`,
          time: formatRelativeTime(item.createdAt),
          icon: Megaphone,
          color: "text-[#D97853]",
          bg: "bg-[#D97853]/15",
          item,
        };
      }

      return {
        id: item.id,
        action: "Staff created article",
        target: `"${item.title}"`,
        time: formatRelativeTime(item.createdAt),
        icon: FileText,
        color: "text-blue-500",
        bg: "bg-blue-100",
        item,
      };
    });

  const mostViewedArticle = [...newsRows].sort(
    (a, b) => b.viewsCount - a.viewsCount,
  )[0];

  const mostViewedPromotion = [...promotionRows].sort(
    (a, b) => b.viewsCount - a.viewsCount,
  )[0];

  const upcomingPromotion = [...promotionRows]
    .filter((item) => item.status === "Draft")
    .sort(
      (a, b) =>
        getTimeValue(b.updatedAt || b.createdAt) -
        getTimeValue(a.updatedAt || a.createdAt),
    )[0];

  const heroPublishedArticleId =
    [...newsRows]
      .filter((item) => item.status === "Published")
      .sort((a, b) => getPublishedOrderTime(b) - getPublishedOrderTime(a))[0]
      ?.id || "";

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-[1400px] mx-auto space-y-6 pb-10"
    >
      {/* ===== IN-PAGE TOAST ===== */}
      <AnimatePresence>
        {toast && (
          <Motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border ${
              toast.type === "success"
                ? "bg-[#7FB069] border-[#7FB069]/20 text-white"
                : "bg-red-500 border-red-400/20 text-white"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {toast.type === "success" ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
            </div>
            <span className="text-sm font-bold pr-2">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 opacity-70 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </Motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#D97853] mb-1">
            News Management
          </h1>
          <p className="text-sm text-[#2D3436]/60">
            Manage pet care articles, announcements, and promotional campaigns
          </p>
        </div>
        <Motion.button
          onClick={() => setIsModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 shrink-0"
        >
          <Plus size={18} /> Create News
        </Motion.button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap lg:flex-nowrap gap-3 items-end bg-white p-3 rounded-[24px] shadow-sm border border-[#2D3436]/5">
        <div className="relative flex-grow min-w-[150px] lg:min-w-[200px] flex-col flex">
          <span className="text-[11px] font-bold text-[#D97853] uppercase tracking-widest ml-1 mb-1.5">
            Search
          </span>
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D97853]"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or category..."
              className="w-full pl-11 pr-10 py-2.5 bg-[#FDFBF7] border border-[#2D3436]/10 rounded-full text-sm font-medium focus:outline-none focus:border-[#D97853] focus:ring-1 focus:ring-[#D97853]/50 transition-all placeholder:text-[#2D3436]/30 text-[#2D3436]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#D97853] text-white flex items-center justify-center hover:bg-[#c66846] transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <CustomSelect
          label="CATEGORY"
          icon={Monitor}
          options={filterCategoryOpts}
          value={filterCategory}
          onChange={setFilterCategory}
          isOpen={isFilterCatOpen}
          setIsOpen={setIsFilterCatOpen}
        />

        <CustomSelect
          label="STATUS"
          icon={Activity}
          options={filterStatusOpts}
          value={filterStatus}
          onChange={setFilterStatus}
          isOpen={isFilterStatusOpen}
          setIsOpen={setIsFilterStatusOpen}
        />
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Span 9) */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          {/* Table */}
          <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#2D3436]/5 overflow-hidden">
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FDFBF7] border-b border-[#2D3436]/5 text-xs font-bold text-[#2D3436]">
                    <th className="px-6 py-4 whitespace-nowrap">Thumbnail</th>
                    <th className="px-6 py-4 whitespace-nowrap">Title</th>
                    <th className="px-6 py-4 whitespace-nowrap">Category</th>
                    <th className="px-6 py-4 whitespace-nowrap">
                      Target Audience
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 whitespace-nowrap">News Feed</th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isLoadingNews ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center opacity-50">
                          <Clock size={36} className="mb-3 animate-pulse" />
                          <p className="text-base font-bold text-[#2D3436]">
                            Loading news...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredNews.length > 0 ? (
                    filteredNews.map((item, idx) => (
                      <Motion.tr
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + idx * 0.05 }}
                        key={item.id}
                        className="border-b border-[#2D3436]/5 hover:bg-[#FDFBF7] transition-colors group cursor-pointer"
                        onClick={() => openDetail(item)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#2D3436]/10 shadow-sm">
                            <img
                              src={item.img}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-[250px]">
                          <span
                            className="block font-bold text-[#2D3436] truncate w-[160px] xl:w-[220px] group-hover:text-[#D97853] transition-colors"
                            title={item.title}
                          >
                            {item.title}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-[#2D3436]/40 uppercase tracking-wide truncate">
                            <Calendar size={12} className="opacity-70" />{" "}
                            {item.date}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-[#2D3436]/60 whitespace-nowrap">
                          {item.category}
                        </td>
                        <td className="px-6 py-4 text-[#2D3436]/60 text-xs whitespace-nowrap">
                          {item.audience}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm border ${
                              item.status === "Published"
                                ? "bg-[#7FB069]/10 text-[#7FB069] border-[#7FB069]/20"
                                : item.status === "Draft"
                                  ? "bg-[#D97853]/10 text-[#D97853] border-[#D97853]/20"
                                  : "bg-blue-50 text-blue-600 border-blue-100"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.status !== "Published" ? (
                            <span className="px-3 py-1 text-[11px] font-bold rounded-full border border-[#2D3436]/10 bg-[#2D3436]/5 text-[#2D3436]/50">
                              Not in feed
                            </span>
                          ) : item.id === heroPublishedArticleId ? (
                            <span className="px-3 py-1 text-[11px] font-bold rounded-full border border-[#D97853]/20 bg-[#D97853]/10 text-[#D97853]">
                              Hero
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-[11px] font-bold rounded-full border border-[#7FB069]/20 bg-[#7FB069]/10 text-[#7FB069]">
                              In feed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3 text-[#2D3436]/40">
                            <Edit
                              size={16}
                              className="hover:text-[#D97853] transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(item);
                              }}
                            />
                            <Trash2
                              size={16}
                              className="hover:text-red-500 transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDelete(item);
                              }}
                            />
                          </div>
                        </td>
                      </Motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center opacity-40">
                          <Search size={40} className="mb-4" />
                          <p className="text-lg font-bold text-[#2D3436]">
                            No news found
                          </p>
                          <p className="text-sm font-medium text-[#2D3436] mt-1">
                            Try adjusting your filters or search query.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Promotions */}
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#2D3436]/5 p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#2D3436]">
                  Active Promotions
                </h2>
                <p className="text-sm text-[#2D3436]/50 font-medium">
                  Current promotional campaigns
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {promotionCards.length > 0 ? (
                promotionCards.map((promo) => (
                  <div
                    key={promo.id}
                    className="bg-[#FDFBF7] border border-[#2D3436]/5 rounded-[20px] overflow-hidden group hover:border-[#D97853]/40 hover:shadow-lg transition-all duration-300 flex flex-col"
                  >
                    <div className="relative h-36 overflow-hidden">
                      <img
                        src={promo.img}
                        alt={promo.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div
                        className={`absolute top-3 right-3 text-white text-[10px] font-black tracking-wider px-3 py-1.5 rounded-full shadow-md ${
                          promo.badge === "LIVE"
                            ? "bg-[#7FB069]"
                            : "bg-[#D97853]"
                        }`}
                      >
                        {promo.badge}
                      </div>
                    </div>
                    <div className="p-4 md:p-5 flex-grow flex flex-col">
                      <h3 className="font-bold text-[#2D3436] text-[15px] mb-2 leading-tight group-hover:text-[#D97853] transition-colors truncate">
                        {promo.title}
                      </h3>
                      <p className="text-xs text-[#2D3436]/60 line-clamp-2 mb-4 flex-grow leading-relaxed">
                        {promo.desc}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2D3436]/40 mb-4 bg-white self-start px-2.5 py-1 rounded-md border border-[#2D3436]/5">
                        <Calendar size={12} className="text-[#D97853]" />{" "}
                        {promo.date}
                      </div>
                      <button
                        onClick={() => openDetail(promo)}
                        className="w-full py-2.5 bg-white border border-[#2D3436]/5 text-[#D97853] font-bold text-xs rounded-xl hover:bg-[#D97853] hover:text-white transition-colors shadow-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="md:col-span-3 rounded-2xl border border-dashed border-[#2D3436]/15 bg-[#FDFBF7] p-8 text-center">
                  <p className="text-sm font-bold text-[#2D3436]">
                    No promotion news available
                  </p>
                  <p className="mt-1 text-xs text-[#2D3436]/50">
                    Create or publish a promotion article to show it here.
                  </p>
                </div>
              )}
            </div>
          </Motion.div>
        </div>

        {/* Right Column (Span 3) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Recent Activity */}
          <Motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#D97853]/10 rounded-[24px] shadow-sm border border-[#D97853]/20 p-5 md:p-6"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-lg font-bold text-[#2D3436]">
                  Recent Activity
                </h2>
                <p className="text-xs text-[#2D3436]/50 font-medium mt-0.5">
                  Latest staff actions
                </p>
              </div>
              <div className="w-10 h-10 rounded-full border border-[#2D3436]/10 flex items-center justify-center">
                <Clock size={16} className="text-[#2D3436]/40" />
              </div>
            </div>

            <div className="space-y-5">
              {recentActivityRows.length > 0 ? (
                recentActivityRows.map((item) => (
                  <div key={item.id} className="flex gap-4 relative group">
                    <div
                      className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 z-10 opacity-80`}
                    >
                      <item.icon size={18} />
                    </div>
                    <div className="pt-0.5 flex-1 min-w-0">
                      <h4 className="text-sm text-[#2D3436]/70 font-medium truncate">
                        {item.action}
                      </h4>
                      <p className="text-[13px] font-bold text-[#2D3436] mt-0.5 group-hover:text-[#D97853] transition-colors truncate">
                        {item.target}
                      </p>
                      <p className="text-[11px] font-medium text-[#2D3436]/40 mt-1">
                        {item.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#2D3436]/60">No activity yet.</p>
              )}
            </div>

            <button
              onClick={loadNews}
              className="w-full mt-6 py-2.5 bg-white border border-[#D97853]/20 rounded-xl text-sm font-bold text-[#D97853] hover:bg-[#D97853] hover:text-white transition-all shadow-sm"
            >
              Refresh Activity
            </button>
          </Motion.div>

          {/* Top Performing */}
          <Motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#2D3436] rounded-[24px] shadow-lg border border-[#2D3436] p-5 md:p-6"
          >
            <h2 className="text-lg font-bold text-white mb-1">
              Top Performing
            </h2>
            <p className="text-xs text-white/50 font-medium mb-6">
              Most Viewed Article & Promotion
            </p>

            <div className="space-y-6">
              <div className="group cursor-pointer">
                <span className="text-[11px] text-white/40 font-bold uppercase tracking-wider block truncate">
                  Most Viewed Article
                </span>
                <p className="font-bold text-white text-[15px] mt-1.5 group-hover:text-[#D97853] transition-colors leading-tight truncate">
                  {mostViewedArticle?.title || "No data"}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Eye size={14} className="text-[#7FB069]" />
                  <p className="text-sm text-[#7FB069] font-bold">
                    {mostViewedArticle
                      ? `${mostViewedArticle.views} views`
                      : "0 views"}
                  </p>
                </div>
              </div>
              <div className="w-full h-[1px] bg-white/10" />
              <div className="group cursor-pointer">
                <span className="text-[11px] text-white/40 font-bold uppercase tracking-wider block truncate">
                  Most Clicked Promotion
                </span>
                <p className="font-bold text-white text-[15px] mt-1.5 group-hover:text-[#D97853] transition-colors leading-tight truncate">
                  {mostViewedPromotion?.title || "No promotion data"}
                </p>
                <p className="text-sm text-[#D97853] font-bold mt-2">
                  {mostViewedPromotion
                    ? `${mostViewedPromotion.views} views`
                    : "0 views"}
                </p>
              </div>
              <div className="w-full h-[1px] bg-white/10" />
              <div className="group cursor-pointer">
                <span className="text-[11px] text-white/40 font-bold uppercase tracking-wider block truncate">
                  Upcoming
                </span>
                <p className="font-bold text-white text-[15px] mt-1.5 group-hover:text-[#D97853] transition-colors leading-tight truncate">
                  {upcomingPromotion?.title || "No draft promotion"}
                </p>
                <p className="text-xs text-white/40 font-bold mt-2 flex items-center gap-1">
                  <Calendar size={12} /> {upcomingPromotion?.date || "--"}
                </p>
              </div>
            </div>
          </Motion.div>
        </div>
      </div>

      {/* CREATE NEWS MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                resetCreateForm();
              }}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50 transition-opacity"
            />
            <Motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[94%] max-w-[1120px] max-h-[90vh] bg-[#FDFBF7] rounded-[24px] shadow-2xl z-50 flex flex-col overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-[#2D3436]/10 bg-white sticky top-0 z-30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D97853]/10 flex items-center justify-center">
                    <Edit size={20} className="text-[#D97853]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#2D3436] leading-tight">
                      Create New Post
                    </h2>
                    <p className="text-xs text-[#2D3436]/50 font-medium">
                      Draft a new article, news, or promotion
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetCreateForm();
                  }}
                  className="w-8 h-8 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#2D3436]/10 transition-colors text-[#2D3436]/50 hover:text-[#2D3436]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 flex-1">
                <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
                  <div className="lg:col-span-7 space-y-6">
                    {/* Thumbnail Upload */}
                    <div>
                      <label className="block text-sm font-bold text-[#2D3436] mb-2">
                        Cover Thumbnail{" "}
                        <span className="text-[#D97853]">*</span>
                      </label>
                      <input
                        ref={createImageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) =>
                          uploadCoverImage(e.target.files?.[0], "create")
                        }
                      />
                      <div
                        onClick={() => createImageInputRef.current?.click()}
                        className="w-full h-[116px] bg-white border-2 border-dashed border-[#2D3436]/15 rounded-[20px] flex flex-col items-center justify-center gap-2 hover:border-[#D97853]/50 hover:bg-[#D97853]/5 transition-colors cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#2D3436]/5 group-hover:bg-white flex items-center justify-center shadow-sm transition-colors">
                          {isUploadingCreateImage ? (
                            <Loader2
                              size={24}
                              className="text-[#D97853] animate-spin"
                            />
                          ) : (
                            <UploadCloud size={24} className="text-[#D97853]" />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-[#2D3436]">
                            {isUploadingCreateImage
                              ? "Uploading image..."
                              : "Click to upload or drag & drop"}
                          </p>
                          <p className="text-xs text-[#2D3436]/40 mt-1">
                            PNG, JPG, WEBP or GIF (max. 5MB)
                          </p>
                        </div>
                      </div>
                      {createForm.coverImage && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-[#2D3436]/10 bg-white">
                          <img
                            src={createForm.coverImage}
                            alt="Cover preview"
                            className="h-20 w-full object-cover"
                            onClick={() =>
                              setPreviewImageUrl(createForm.coverImage)
                            }
                            title="Click to preview"
                          />
                        </div>
                      )}
                      <p className="mt-3 text-xs font-medium text-[#2D3436]/50">
                        Cover image only supports file upload.
                      </p>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-sm font-bold text-[#2D3436] mb-2">
                        Post Title <span className="text-[#D97853]">*</span>
                      </label>
                      <input
                        type="text"
                        value={createForm.title}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            title: e.target.value,
                          })
                        }
                        placeholder="e.g. 5 Tips to Keep Your Dog Healthy..."
                        className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                      />
                    </div>

                    {/* Content Body */}
                    <div>
                      <label className="block text-sm font-bold text-[#2D3436] mb-2">
                        Content Body
                      </label>
                      <textarea
                        rows={4}
                        value={createForm.content}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            content: e.target.value,
                          })
                        }
                        placeholder="Write your article content here..."
                        className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm resize-none"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-5 lg:border-l lg:border-[#2D3436]/10 lg:pl-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-1">
                      {/* Category */}
                      <div className="relative">
                        <CustomSelect
                          label="Category"
                          isModal={true}
                          rightIcon={MoreVertical}
                          options={modalCatOpts}
                          value={modalCat}
                          onChange={setModalCat}
                          isOpen={isModalCatOpen}
                          setIsOpen={setIsModalCatOpen}
                        />
                      </div>

                      {/* Target Audience */}
                      <div className="relative">
                        <label className="block text-sm font-bold text-[#2D3436] mb-2">
                          Target Audience
                        </label>
                        <div className="w-full px-4 py-3 bg-[#F7F3EC] border border-[#D97853]/20 rounded-2xl text-sm font-bold text-[#2D3436]">
                          {FIXED_AUDIENCE_LABEL}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="relative">
                        <CustomSelect
                          label="Publish Status"
                          isModal={true}
                          up={true}
                          rightIcon={MoreVertical}
                          options={modalStatOpts}
                          value={modalStat}
                          onChange={setModalStat}
                          isOpen={isModalStatOpen}
                          setIsOpen={setIsModalStatOpen}
                        />
                      </div>

                      {/* Schedule Date */}
                      <div>
                        <label className="block text-sm font-bold text-[#2D3436] mb-2">
                          Publish Date
                        </label>
                        <div className="relative">
                          <DatePicker
                            selected={publishDate}
                            onChange={(date) => setPublishDate(date)}
                            dateFormat="dd/MM/yyyy"
                            className="w-full px-4 py-3 pl-11 bg-white border border-[#2D3436]/10 focus:border-[#D97853] hover:border-[#D97853] rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-1 focus:ring-[#D97853] transition-all shadow-sm cursor-pointer"
                            wrapperClassName="w-full"
                          />
                          <Calendar
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D3436]/40 pointer-events-none"
                            size={18}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 md:px-8 border-t border-[#2D3436]/10 bg-white flex items-center justify-end gap-3 sticky bottom-0 z-30">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetCreateForm();
                  }}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#2D3436]/70 hover:bg-[#2D3436]/5 hover:text-[#2D3436] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNews}
                  disabled={isSubmitting}
                  className="bg-[#D97853] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <CheckCircle2 size={18} />{" "}
                  {isSubmitting ? "Saving..." : createActionLabel}
                </button>
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== DETAIL MODAL ===== */}
      <AnimatePresence>
        {isDetailOpen && selectedNews && (
          <>
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50"
            />
            <Motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[650px] max-h-[90vh] bg-[#FDFBF7] rounded-[24px] shadow-2xl z-50 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Header */}
              <div className="relative">
                <img
                  src={selectedNews.img}
                  alt={selectedNews.title}
                  className="w-full h-[220px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2D3436]/80 via-transparent to-transparent" />
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                >
                  <X size={16} />
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  <span
                    className={`px-3 py-1 text-[11px] font-bold rounded-full border ${
                      selectedNews.status === "Published"
                        ? "bg-[#7FB069]/20 text-[#7FB069] border-[#7FB069]/30"
                        : selectedNews.status === "Draft"
                          ? "bg-[#D97853]/20 text-[#D97853] border-[#D97853]/30"
                          : "bg-blue-500/20 text-blue-300 border-blue-400/30"
                    }`}
                  >
                    {selectedNews.status}
                  </span>
                </div>
              </div>
              {/* Body */}
              <div className="p-6 md:p-8">
                <h2 className="text-xl font-bold text-[#2D3436] leading-tight">
                  {selectedNews.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[#2D3436]/50 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} /> {selectedNews.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye size={13} /> {selectedNews.views} views
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Monitor size={13} /> {selectedNews.category}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-4 border border-[#2D3436]/5">
                    <p className="text-[11px] text-[#2D3436]/40 font-bold uppercase tracking-wider">
                      Category
                    </p>
                    <p className="text-sm font-bold text-[#2D3436] mt-1">
                      {selectedNews.category}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-[#2D3436]/5">
                    <p className="text-[11px] text-[#2D3436]/40 font-bold uppercase tracking-wider">
                      Target Audience
                    </p>
                    <p className="text-sm font-bold text-[#2D3436] mt-1">
                      {selectedNews.audience}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-[#2D3436]/5">
                    <p className="text-[11px] text-[#2D3436]/40 font-bold uppercase tracking-wider">
                      Publish Date
                    </p>
                    <p className="text-sm font-bold text-[#2D3436] mt-1">
                      {selectedNews.date}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-[#2D3436]/5">
                    <p className="text-[11px] text-[#2D3436]/40 font-bold uppercase tracking-wider">
                      Views
                    </p>
                    <p className="text-sm font-bold text-[#2D3436] mt-1">
                      {selectedNews.views}
                    </p>
                  </div>
                </div>
                <div className="mt-5 bg-white rounded-2xl p-4 border border-[#2D3436]/5">
                  <p className="text-[11px] text-[#2D3436]/40 font-bold uppercase tracking-wider mb-2">
                    Content Preview
                  </p>
                  <p className="text-sm text-[#2D3436]/70 leading-relaxed">
                    {selectedNews.excerpt ||
                      selectedNews.content ||
                      "No content preview available."}
                  </p>
                </div>
              </div>
              {/* Footer */}
              <div className="px-6 py-4 md:px-8 border-t border-[#2D3436]/10 bg-white flex items-center justify-end gap-3 sticky bottom-0">
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    openEdit(selectedNews);
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#D97853] border border-[#D97853]/20 hover:bg-[#D97853]/5 transition-colors flex items-center gap-2"
                >
                  <Edit size={16} /> Edit
                </button>
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    openDelete(selectedNews);
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-red-500 border border-red-200 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== EDIT MODAL ===== */}
      <AnimatePresence>
        {isEditOpen && selectedNews && (
          <>
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50"
            />
            <Motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[94%] max-w-[1080px] max-h-[90vh] bg-[#FDFBF7] rounded-[24px] shadow-2xl z-50 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-[#2D3436]/10 bg-white sticky top-0 z-30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D97853]/10 flex items-center justify-center">
                    <Edit size={20} className="text-[#D97853]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#2D3436] leading-tight">
                      Upate News
                    </h2>
                    <p className="text-xs text-[#2D3436]/50 font-medium">
                      Update article details
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#2D3436]/10 transition-colors text-[#2D3436]/50 hover:text-[#2D3436]"
                >
                  <X size={16} />
                </button>
              </div>
              {/* Body */}
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
                  <div className="lg:col-span-7 space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-[#2D3436] mb-2">
                        Post Title <span className="text-[#D97853]">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#2D3436] mb-2">
                        Content Body <span className="text-[#D97853]">*</span>
                      </label>
                      <textarea
                        rows={7}
                        value={editForm.content}
                        onChange={(e) =>
                          setEditForm({ ...editForm, content: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all shadow-sm resize-none"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-5 lg:border-l lg:border-[#2D3436]/10 lg:pl-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-[#2D3436] mb-2">
                          Cover Image <span className="text-[#D97853]">*</span>
                        </label>
                        <input
                          ref={editImageInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) =>
                            uploadCoverImage(e.target.files?.[0], "edit")
                          }
                        />
                        <button
                          type="button"
                          onClick={() => editImageInputRef.current?.click()}
                          disabled={isUploadingEditImage}
                          className="mb-3 inline-flex items-center gap-2 rounded-xl border border-[#2D3436]/10 bg-white px-3 py-2 text-xs font-bold text-[#2D3436]/70 hover:border-[#D97853]/40 hover:text-[#D97853] transition-colors disabled:opacity-60"
                        >
                          {isUploadingEditImage ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <UploadCloud size={14} />
                          )}
                          {isUploadingEditImage
                            ? "Uploading..."
                            : "Upload New Image"}
                        </button>
                        <p className="text-xs font-medium text-[#2D3436]/50">
                          Manual image URL input is disabled. Please upload a
                          file.
                        </p>
                        {editForm.coverImage && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-[#2D3436]/10 bg-white">
                            <img
                              src={editForm.coverImage}
                              alt="Edit cover preview"
                              className="h-20 w-full object-cover"
                              onClick={() =>
                                setPreviewImageUrl(editForm.coverImage)
                              }
                              title="Click to preview"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1">
                        <CustomSelect
                          label="Category"
                          isModal={true}
                          options={[
                            "Announcement",
                            "Tips",
                            "Promotion",
                            "Event",
                            "General",
                          ]}
                          value={editForm.category}
                          onChange={(v) =>
                            setEditForm({ ...editForm, category: v })
                          }
                          isOpen={isEditCatOpen}
                          setIsOpen={(o) => {
                            setIsEditCatOpen(o);
                            if (o) {
                              setIsEditAudOpen(false);
                              setIsEditStatOpen(false);
                            }
                          }}
                        />
                        <CustomSelect
                          label="Target Audience"
                          isModal={true}
                          options={[
                            "All Customers",
                            "Dog Owners",
                            "Cat Owners",
                            "VIP Members",
                          ]}
                          value={editForm.audience}
                          onChange={(v) =>
                            setEditForm({ ...editForm, audience: v })
                          }
                          isOpen={isEditAudOpen}
                          setIsOpen={(o) => {
                            setIsEditAudOpen(o);
                            if (o) {
                              setIsEditCatOpen(false);
                              setIsEditStatOpen(false);
                            }
                          }}
                        />
                        <CustomSelect
                          label="Status"
                          isModal={true}
                          options={["Published", "Draft"]}
                          value={editForm.status}
                          onChange={(v) =>
                            setEditForm({ ...editForm, status: v })
                          }
                          isOpen={isEditStatOpen}
                          setIsOpen={(o) => {
                            setIsEditStatOpen(o);
                            if (o) {
                              setIsEditCatOpen(false);
                              setIsEditAudOpen(false);
                            }
                          }}
                        />
                        <div>
                          <label className="block text-sm font-bold text-[#2D3436] mb-2">
                            Publish Date
                          </label>
                          <div className="relative">
                            <Calendar
                              size={16}
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D97853]"
                            />
                            <input
                              type="text"
                              value={editForm.date}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  date: e.target.value,
                                })
                              }
                              className="w-full pl-10 pr-4 py-3 bg-white border border-[#D97853] rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 transition-all shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="px-6 py-4 md:px-8 border-t border-[#2D3436]/10 bg-white flex items-center justify-end gap-3 sticky bottom-0 z-30">
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#2D3436]/70 hover:bg-[#2D3436]/5 hover:text-[#2D3436] transition-colors"
                >
                  Cancel
                </button>
                <Motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleUpdateNews}
                  disabled={isSubmitting}
                  className="bg-[#D97853] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={18} />{" "}
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Motion.button>
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== IMAGE PREVIEW MODAL ===== */}
      <AnimatePresence>
        {previewImageUrl && (
          <>
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImageUrl("")}
              className="fixed inset-0 bg-[#2D3436]/60 backdrop-blur-sm z-[70]"
            />
            <Motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[71] w-[92%] max-w-[980px]"
            >
              <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/20 shadow-2xl">
                <button
                  type="button"
                  onClick={() => setPreviewImageUrl("")}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/65 transition-colors z-10"
                >
                  <X size={16} />
                </button>
                <img
                  src={previewImageUrl}
                  alt="Preview"
                  className="w-full max-h-[82vh] object-contain bg-[#1c1c1c]"
                />
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <AnimatePresence>
        {isDeleteOpen && selectedNews && (
          <>
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteOpen(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50"
            />
            <Motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[420px] bg-[#FDFBF7] rounded-[24px] shadow-2xl z-50 p-6 md:p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-[#2D3436]">Delete News?</h3>
              <p className="text-sm text-[#2D3436]/60 mt-2 leading-relaxed">
                Are you sure you want to delete{" "}
                <span className="font-bold text-[#2D3436]">
                  "{selectedNews.title}"
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setIsDeleteOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#2D3436]/70 border border-[#2D3436]/10 hover:bg-[#2D3436]/5 transition-colors"
                >
                  Cancel
                </button>
                <Motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDeleteNews}
                  disabled={isDeleting}
                  className="bg-red-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} /> {isDeleting ? "Deleting..." : "Delete"}
                </Motion.button>
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>
    </Motion.div>
  );
};

export default StaffNewsManagement;
