import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
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
  CheckCircle2,
  ChevronDown,
  Monitor,
  Activity,
  AlertTriangle,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getAllNews, deleteNews as deleteNewsApi, createNews as createNewsApi } from "../../../api/newsApi";

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
          <motion.div
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  </div>
);

const newsData = [
  {
    id: 1,
    title: "How to Prevent Skin Problems in Dogs",
    category: "Pet Health",
    audience: "All customers",
    status: "Published",
    date: "Mar 5, 2026",
    views: "3,240",
    img: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200",
  },
  {
    id: 2,
    title: "Weekend Grooming Special – 20% OFF",
    category: "Promotion",
    audience: "Dog owners",
    status: "Active",
    date: "Mar 6, 2026",
    views: "5,120",
    img: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200",
  },
  {
    id: 3,
    title: "Free Health Check Week",
    category: "Campaign",
    audience: "All customers",
    status: "Scheduled",
    date: "Mar 10, 2026",
    views: "--",
    img: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=200",
  },
  {
    id: 4,
    title: "Best Indoor Activities for Cats",
    category: "Pet Lifestyle",
    audience: "Cat owners",
    status: "Published",
    date: "Mar 3, 2026",
    views: "2,890",
    img: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200",
  },
  {
    id: 5,
    title: "Understanding Pet Nutrition: A Complete Guide",
    category: "Nutrition",
    audience: "All customers",
    status: "Published",
    date: "Mar 1, 2026",
    views: "4,560",
    img: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200",
  },
  {
    id: 6,
    title: "Christmas Grooming Promotion",
    category: "Promotion",
    audience: "All customers",
    status: "Scheduled",
    date: "Dec 24, 2026",
    views: "--",
    img: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=200",
  },
];

const promoData = [
  {
    id: 1,
    title: "Bring 5 Pets – Get 20% Spa Discount",
    desc: "Special offer for multiple pet owners. Book now and save!",
    badge: "20% OFF",
    date: "Mar 1 - Mar 31",
    img: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400",
  },
  {
    id: 2,
    title: "Free Health Check Week",
    desc: "Complimentary health checkups for all pets this week.",
    badge: "FREE",
    date: "Mar 10 - Mar 17",
    img: "https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=400",
  },
  {
    id: 3,
    title: "Weekend Grooming Special",
    desc: "Get 20% off on all grooming services this weekend!",
    badge: "20% OFF",
    date: "Mar 8 - Mar 9",
    img: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400",
  },
];

const activityData = [
  {
    id: 1,
    type: "article",
    action: "Admin created article",
    target: '"Best Indoor Activities for Cats"',
    time: "2 hours ago",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-100",
  },
  {
    id: 2,
    type: "promo",
    action: "Promotion activated",
    target: '"Weekend Grooming Special"',
    time: "5 hours ago",
    icon: Megaphone,
    color: "text-[#D97853]",
    bg: "bg-[#D97853]/15",
  },
  {
    id: 3,
    type: "edit",
    action: "Article updated",
    target: '"How to Prevent Parasites"',
    time: "1 day ago",
    icon: Edit,
    color: "text-[#7FB069]",
    bg: "bg-[#7FB069]/15",
  },
  {
    id: 4,
    type: "article",
    action: "Admin created article",
    target: '"Understanding Pet Nutrition"',
    time: "2 days ago",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-100",
  },
  {
    id: 5,
    type: "promo",
    action: "Campaign scheduled",
    target: '"Free Health Check Week"',
    time: "3 days ago",
    icon: Megaphone,
    color: "text-[#D97853]",
    bg: "bg-[#D97853]/15",
  },
];

const AdminNewsManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    audience: "",
    status: "",
    date: "",
  });
  const [isEditCatOpen, setIsEditCatOpen] = useState(false);
  const [isEditAudOpen, setIsEditAudOpen] = useState(false);
  const [isEditStatOpen, setIsEditStatOpen] = useState(false);

  // Fetch news data from backend
  useEffect(() => {
    fetchNewsData();
  }, []);

  const fetchNewsData = async () => {
    try {
      setLoading(true);
      const response = await getAllNews();
      const newsArray = response.data?.news || [];
      const transformedNews = newsArray.map((item) => ({
        id: item._id,
        title: item.title,
        category: item.category || "General",
        audience: item.tags?.join(", ") || "All customers",
        status: item.isPublished ? "Published" : "Draft",
        date: new Date(item.publishedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        views: item.views || 0,
        img: item.coverImage,
      }));
      setNewsData(transformedNews);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch news:", err);
      setError("Failed to load news");
      setNewsData([]);
    } finally {
      setLoading(false);
    }
  };

  // In-page Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const anyModalOpen =
    isModalOpen || isDetailOpen || isEditOpen || isDeleteOpen;

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

  const openDetail = (item) => {
    setSelectedNews(item);
    setIsDetailOpen(true);
  };
  const openEdit = (item) => {
    setSelectedNews(item);
    setEditForm({
      title: item.title,
      category: item.category,
      audience: item.audience,
      status: item.status,
      date: item.date,
    });
    setIsEditOpen(true);
  };
  const openDelete = (item) => {
    setSelectedNews(item);
    setIsDeleteOpen(true);
  };

  const handleDeleteNews = async () => {
    if (!selectedNews) return;
    try {
      await deleteNewsApi(selectedNews.id);
      showToast("Article deleted successfully!", "success");
      setIsDeleteOpen(false);
      fetchNewsData(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete news:", err);
      showToast("Failed to delete article", "error");
    }
  };

  // Top Filter States
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterCatOpen, setIsFilterCatOpen] = useState(false);
  const [isFilterStatusOpen, setIsFilterStatusOpen] = useState(false);

  const filterCategoryOpts = [
    "All Categories",
    "Pet Health",
    "Promotion",
    "Campaign",
    "Pet Lifestyle",
    "Nutrition",
  ];
  const filterStatusOpts = ["All Status", "Published", "Scheduled", "Active"];

  // Modal Form States
  const [modalCat, setModalCat] = useState("Select Category");
  const [modalAud, setModalAud] = useState("All Customers");
  const [modalStat, setModalStat] = useState("Save as Draft");
  const [publishDate, setPublishDate] = useState(new Date());
  const [isModalCatOpen, setIsModalCatOpen] = useState(false);
  const [isModalAudOpen, setIsModalAudOpen] = useState(false);
  const [isModalStatOpen, setIsModalStatOpen] = useState(false);

  const modalCatOpts = [
    "Select Category",
    "Pet Health",
    "Nutrition",
    "Promotion",
    "Campaign",
  ];
  const modalAudOpts = [
    "All Customers",
    "Dog Owners",
    "Cat Owners",
    "VIP Members",
  ];
  const modalStatOpts = ["Save as Draft", "Publish Now", "Schedule Later"];

  // Map frontend category to backend enum
  const categoryMap = {
    "Select Category": "general",
    "Pet Health": "tips",
    "Nutrition": "tips",
    "Promotion": "promotion",
    "Campaign": "announcement",
  };

  // Create News Form States
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");
  const [modalCoverImage, setModalCoverImage] = useState("");
  const [isCreatingNews, setIsCreatingNews] = useState(false);

  const handleCreateNews = async () => {
    // Validate input
    if (!modalTitle.trim()) {
      showToast("Title is required", "error");
      return;
    }
    if (modalCat === "Select Category") {
      showToast("Please select a category", "error");
      return;
    }
    if (!modalContent.trim()) {
      showToast("Content is required", "error");
      return;
    }

    try {
      setIsCreatingNews(true);
      
      // Map frontend category to backend enum value
      const backendCategory = categoryMap[modalCat] || "general";
      
      // Build form data
      const newsData = {
        title: modalTitle.trim(),
        content: modalContent.trim(),
        excerpt: modalContent.substring(0, 500).trim(),
        coverImage: modalCoverImage || null,
        category: backendCategory,
        tags: modalAud ? [modalAud.toLowerCase()] : [],
        images: [],
        isPublished: modalStat === "Publish Now",
      };

      console.log("Creating news with data:", newsData);
      console.log("Backend category mapped from '", modalCat, "' to '", backendCategory, "'");
      
      const response = await createNewsApi(newsData);
      console.log("Create response:", response);
      
      showToast("Article created successfully!", "success");
      setIsModalOpen(false);
      
      // Reset form
      setModalTitle("");
      setModalContent("");
      setModalCoverImage("");
      setModalCat("Select Category");
      setModalAud("All Customers");
      setModalStat("Save as Draft");
      setPublishDate(new Date());
      
      // Refresh news list
      fetchNewsData();
    } catch (err) {
      console.error("Error creating news:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to create article";
      showToast(errorMessage, "error");
    } finally {
      setIsCreatingNews(false);
    }
  };

  // Filter Logic
  const filteredNews = newsData.filter((item) => {
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat =
      filterCategory === "All Categories" || item.category === filterCategory;
    const matchStatus =
      filterStatus === "All Status" || item.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-[1400px] mx-auto space-y-6 pb-10"
    >
      {/* ===== IN-PAGE TOAST ===== */}
      <AnimatePresence>
        {toast && (
          <motion.div
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
          </motion.div>
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
        <motion.button
          onClick={() => setIsModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 shrink-0"
        >
          <Plus size={18} /> Create News
        </motion.button>
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
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D97853] mb-4"></div>
                          <p className="text-sm font-bold text-[#2D3436]">
                            Loading news...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredNews.length > 0 ? (
                    filteredNews.map((item, idx) => (
                      <motion.tr
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + idx * 0.05 }}
                        key={item.id}
                        className="border-b border-[#2D3436]/5 hover:bg-[#FDFBF7] transition-colors group cursor-pointer"
                        onClick={() => openDetail(item)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#2D3436]/10 shadow-sm bg-[#FDFBF7]">
                            {item.img ? (
                              <img
                                src={item.img}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#2D3436]/20">
                                <FileText size={24} />
                              </div>
                            )}
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
                                : item.status === "Active"
                                  ? "bg-[#D97853]/10 text-[#D97853] border-[#D97853]/20"
                                  : "bg-blue-50 text-blue-600 border-blue-100"
                            }`}
                          >
                            {item.status}
                          </span>
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
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
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
          <motion.div
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
              {promoData.map((promo) => (
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
                    <div className="absolute top-3 right-3 bg-[#D97853] text-white text-[10px] font-black tracking-wider px-3 py-1.5 rounded-full shadow-md">
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
                    <button className="w-full py-2.5 bg-white border border-[#2D3436]/5 text-[#D97853] font-bold text-xs rounded-xl hover:bg-[#D97853] hover:text-white transition-colors shadow-sm">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column (Span 3) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Recent Activity */}
          <motion.div
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
                  Latest admin actions
                </p>
              </div>
              <div className="w-10 h-10 rounded-full border border-[#2D3436]/10 flex items-center justify-center">
                <Clock size={16} className="text-[#2D3436]/40" />
              </div>
            </div>

            <div className="space-y-5">
              {activityData.map((item, idx) => (
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
              ))}
            </div>

            <button className="w-full mt-6 py-2.5 bg-white border border-[#D97853]/20 rounded-xl text-sm font-bold text-[#D97853] hover:bg-[#D97853] hover:text-white transition-all shadow-sm">
              View All Activity
            </button>
          </motion.div>

          {/* Top Performing */}
          <motion.div
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
                  Weekend Grooming Special
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Eye size={14} className="text-[#7FB069]" />
                  <p className="text-sm text-[#7FB069] font-bold">
                    5,120 views
                  </p>
                </div>
              </div>
              <div className="w-full h-[1px] bg-white/10" />
              <div className="group cursor-pointer">
                <span className="text-[11px] text-white/40 font-bold uppercase tracking-wider block truncate">
                  Most Clicked Promotion
                </span>
                <p className="font-bold text-white text-[15px] mt-1.5 group-hover:text-[#D97853] transition-colors leading-tight truncate">
                  20% Spa Discount
                </p>
                <p className="text-sm text-[#D97853] font-bold mt-2">
                  842 clicks
                </p>
              </div>
              <div className="w-full h-[1px] bg-white/10" />
              <div className="group cursor-pointer">
                <span className="text-[11px] text-white/40 font-bold uppercase tracking-wider block truncate">
                  Upcoming
                </span>
                <p className="font-bold text-white text-[15px] mt-1.5 group-hover:text-[#D97853] transition-colors leading-tight truncate">
                  Christmas Grooming Promotion
                </p>
                <p className="text-xs text-white/40 font-bold mt-2 flex items-center gap-1">
                  <Calendar size={12} /> Dec 24, 2026
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* CREATE NEWS MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50 transition-opacity"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[700px] h-[90vh] md:h-auto max-h-[90vh] bg-[#FDFBF7] rounded-[24px] shadow-2xl z-50 flex flex-col overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#2D3436]/10 transition-colors text-[#2D3436]/50 hover:text-[#2D3436]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 flex-1 space-y-6">
                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Cover Thumbnail <span className="text-[#D97853]">*</span>
                  </label>
                  <div className="w-full h-[180px] bg-white border-2 border-dashed border-[#2D3436]/15 rounded-[20px] flex flex-col items-center justify-center gap-3 hover:border-[#D97853]/50 hover:bg-[#D97853]/5 transition-colors cursor-pointer group relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setModalCoverImage(event.target?.result || "");
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    />
                    <div className="w-12 h-12 rounded-full bg-[#2D3436]/5 group-hover:bg-white flex items-center justify-center shadow-sm transition-colors pointer-events-none">
                      <UploadCloud size={24} className="text-[#D97853]" />
                    </div>
                    <div className="text-center pointer-events-none">
                      <p className="text-sm font-bold text-[#2D3436]">
                        Click to upload or drag & drop
                      </p>
                      <p className="text-xs text-[#2D3436]/40 mt-1">
                        SVG, PNG, JPG or WEBP (max. 5MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Post Title <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="text"
                      value={modalTitle}
                      onChange={(e) => setModalTitle(e.target.value)}
                      placeholder="e.g. 5 Tips to Keep Your Dog Healthy..."
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                    />
                  </div>

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
                    <CustomSelect
                      label="Target Audience"
                      isModal={true}
                      rightIcon={MoreVertical}
                      options={modalAudOpts}
                      value={modalAud}
                      onChange={setModalAud}
                      isOpen={isModalAudOpen}
                      setIsOpen={setIsModalAudOpen}
                    />
                  </div>

                  {/* Content Editor Preview (Dummy Textarea) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Content Body
                    </label>
                    <textarea
                      rows={5}
                      value={modalContent}
                      onChange={(e) => setModalContent(e.target.value)}
                      placeholder="Write your article content here..."
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm resize-none"
                    ></textarea>
                  </div>

                  {/* Status */}
                  <div className="relative mb-4">
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

              {/* Modal Footer */}
              <div className="px-6 py-4 md:px-8 border-t border-[#2D3436]/10 bg-white flex items-center justify-end gap-3 sticky bottom-0 z-30">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#2D3436]/70 hover:bg-[#2D3436]/5 hover:text-[#2D3436] transition-colors disabled:opacity-50"
                  disabled={isCreatingNews}
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleCreateNews}
                  disabled={isCreatingNews}
                  whileHover={{ scale: isCreatingNews ? 1 : 1.02 }}
                  whileTap={{ scale: isCreatingNews ? 1 : 0.98 }}
                  className="bg-[#D97853] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isCreatingNews ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> Publish Post
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== DETAIL MODAL ===== */}
      <AnimatePresence>
        {isDetailOpen && selectedNews && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50"
            />
            <motion.div
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
                        : selectedNews.status === "Active"
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
                    This is a preview of the article content. The full content
                    will be loaded from the backend API when integrated...
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== EDIT MODAL ===== */}
      <AnimatePresence>
        {isEditOpen && selectedNews && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[600px] max-h-[90vh] bg-[#FDFBF7] rounded-[24px] shadow-2xl z-50 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-[#2D3436]/10 bg-white sticky top-0 z-30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D97853]/10 flex items-center justify-center">
                    <Edit size={20} className="text-[#D97853]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#2D3436] leading-tight">
                      Edit News
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
              <div className="p-6 md:p-8 space-y-5">
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
                <div className="grid grid-cols-2 gap-5">
                  <CustomSelect
                    label="Category"
                    isModal={true}
                    options={[
                      "Pet Health",
                      "Promotion",
                      "Campaign",
                      "Pet Lifestyle",
                      "Nutrition",
                    ]}
                    value={editForm.category}
                    onChange={(v) => setEditForm({ ...editForm, category: v })}
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
                      "All customers",
                      "Dog owners",
                      "Cat owners",
                      "VIP Members",
                    ]}
                    value={editForm.audience}
                    onChange={(v) => setEditForm({ ...editForm, audience: v })}
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
                    options={["Published", "Active", "Scheduled", "Draft"]}
                    value={editForm.status}
                    onChange={(v) => setEditForm({ ...editForm, status: v })}
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
                          setEditForm({ ...editForm, date: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 bg-white border border-[#D97853] rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 transition-all shadow-sm"
                      />
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
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    showToast("Article updated successfully!");
                    setIsEditOpen(false);
                  }}
                  className="bg-[#D97853] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2"
                >
                  <CheckCircle2 size={18} /> Save Changes
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <AnimatePresence>
        {isDeleteOpen && selectedNews && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteOpen(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50"
            />
            <motion.div
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
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDeleteNews}
                  className="bg-red-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-all flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminNewsManagement;
