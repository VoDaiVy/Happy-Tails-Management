import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Briefcase,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  Clock,
  DollarSign,
  Star,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Tag,
  PawPrint,
  Image as ImageIcon,
  ListChecks,
  Activity,
  Loader2,
  CheckCircle2,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import AdminFilterBar from "../../components/dashboard/AdminFilterBar";
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../../api/serviceApi";
import { getAllCategories } from "../../api/categoryApi";

// Pet type labels
const PET_TYPE_LABELS = {
  dog: "Dog",
  cat: "Cat",
  bird: "Bird",
  fish: "Fish",
  rabbit: "Rabbit",
  hamster: "Hamster",
  other: "Other",
};

// Pet type options
const PET_TYPE_OPTIONS = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "bird", label: "Bird" },
  { value: "fish", label: "Fish" },
  { value: "rabbit", label: "Rabbit" },
  { value: "hamster", label: "Hamster" },
  { value: "other", label: "Other" },
];

export default function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Selected item
  const [selectedService, setSelectedService] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state
  const [formMode, setFormMode] = useState("create");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    duration: "",
    petTypes: ["dog", "cat"],
    features: [],
    images: [],
    maxCapacity: 1,
    isActive: true,
  });
  const [featureInput, setFeatureInput] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await getAllCategories({ isActive: true });
      setCategories(response.data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, []);

  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (activeTab === "active") {
        params.isActive = true;
      } else if (activeTab === "inactive") {
        params.isActive = false;
      }

      if (categoryFilter !== "all") {
        params.category = categoryFilter;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await getAllServices(params);
      setServices(response.data || []);
      if (response.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.pagination.total || 0,
          pages: response.pagination.pages || 1,
        }));
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Không thể tải danh sách dịch vụ",
      );
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    activeTab,
    categoryFilter,
    searchTerm,
  ]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Reset page when filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [activeTab, categoryFilter, searchTerm]);

  // View detail
  const handleViewDetail = async (service) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const response = await getServiceById(service._id);
      setSelectedService(response.data);
    } catch (err) {
      console.error("Error fetching service detail:", err);
      setError("Không thể tải chi tiết dịch vụ");
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open create modal
  const handleOpenCreate = () => {
    setFormMode("create");
    setFormData({
      name: "",
      description: "",
      category: categories[0]?._id || "",
      price: "",
      duration: "",
      petTypes: ["dog", "cat"],
      features: [],
      images: [],
      maxCapacity: 1,
      isActive: true,
    });
    setFeatureInput("");
    setImageInput("");
    setShowFormModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (service) => {
    setFormMode("edit");
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      category: service.category?._id || service.category || "",
      price: service.price,
      duration: service.duration,
      petTypes: service.petTypes || ["dog", "cat"],
      features: service.features || [],
      images: service.images || [],
      maxCapacity: service.maxCapacity || 1,
      isActive: service.isActive !== false,
    });
    setFeatureInput("");
    setImageInput("");
    setShowFormModal(true);
  };

  // Handle form input change
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle pet types change
  const handlePetTypeToggle = (petType) => {
    setFormData((prev) => {
      const newPetTypes = prev.petTypes.includes(petType)
        ? prev.petTypes.filter((pt) => pt !== petType)
        : [...prev.petTypes, petType];
      return { ...prev, petTypes: newPetTypes };
    });
  };

  // Add feature
  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, featureInput.trim()],
      }));
      setFeatureInput("");
    }
  };

  // Remove feature
  const handleRemoveFeature = (index) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  // Add image URL
  const handleAddImage = () => {
    if (imageInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, imageInput.trim()],
      }));
      setImageInput("");
    }
  };

  // Remove image
  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Submit form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);

      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: Number(formData.price),
        duration: Number(formData.duration),
        petTypes: formData.petTypes,
        features: formData.features,
        images: formData.images,
        maxCapacity: Number(formData.maxCapacity),
        isActive: formData.isActive,
      };

      if (formMode === "create") {
        await createService(payload);
      } else {
        await updateService(selectedService._id, payload);
      }

      setShowFormModal(false);
      fetchServices();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể lưu dịch vụ");
    } finally {
      setFormLoading(false);
    }
  };

  // Open delete modal
  const handleOpenDelete = (service) => {
    setSelectedService(service);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    try {
      await deleteService(selectedService._id);
      setShowDeleteModal(false);
      fetchServices();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa dịch vụ");
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}p`;
    } else if (hours > 0) {
      return `${hours}h`;
    }
    return `${mins}p`;
  };

  // Get category name
  const getCategoryName = (service) => {
    if (service.category?.name) return service.category.name;
    const cat = categories.find((c) => c._id === service.category);
    return cat?.name || "-";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-[1400px] mx-auto space-y-6 pb-10"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#D97853] mb-1">
            Service Management
          </h1>
          <p className="text-[#2D3436]/60 text-sm">
            Manage pet care services
          </p>
        </div>
        <motion.button
          onClick={handleOpenCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 shrink-0"
        >
          <Plus size={18} /> Add Service
        </motion.button>
      </div>

      {/* Filters */}
      <AdminFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by service name or category..."
        filters={[
          {
            label: "CATEGORY",
            icon: Tag,
            options: ["All Categories", ...categories.map((c) => c.name)],
            value:
              categoryFilter === "all"
                ? "All Categories"
                : categories.find((c) => c._id === categoryFilter)?.name ||
                  "All Categories",
            onChange: (opt) =>
              setCategoryFilter(
                opt === "All Categories"
                  ? "all"
                  : categories.find((c) => c.name === opt)?._id || "all",
              ),
          },
          {
            label: "STATUS",
            icon: Activity,
            options: ["All Status", "Active", "Inactive"],
            value:
              activeTab === "all"
                ? "All Status"
                : activeTab === "active"
                  ? "Active"
                  : "Inactive",
            onChange: (opt) =>
              setActiveTab(
                opt === "All Status"
                  ? "all"
                  : opt === "Active"
                    ? "active"
                    : "inactive",
              ),
          },
        ]}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#2D3436]/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D97853]"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-20 text-[#2D3436]/40">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-[#2D3436]/20" />
            <p className="text-lg font-bold text-[#2D3436]">No services found</p>
            <p className="text-sm font-medium text-[#2D3436] mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FDFBF7] border-b border-[#2D3436]/5 text-xs font-bold text-[#2D3436]">
                    <th className="px-6 py-4 whitespace-nowrap">
                      Service
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap">
                      Category
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-right">
                      Price
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Duration
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Rating
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Status
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {services.map((service, idx) => (
                    <motion.tr
                      key={service._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.03 }}
                      className="border-b border-[#2D3436]/5 hover:bg-[#FDFBF7] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center overflow-hidden">
                            {service.images?.[0] ? (
                              <img
                                src={service.images[0]}
                                alt={service.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Briefcase className="w-6 h-6 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {service.name}
                            </p>
                            <div className="flex gap-1 mt-1">
                              {service.petTypes?.slice(0, 3).map((pt) => (
                                <span
                                  key={pt}
                                  className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded"
                                >
                                  {PET_TYPE_LABELS[pt] || pt}
                                </span>
                              ))}
                              {service.petTypes?.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{service.petTypes.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-bold rounded-full shadow-sm border bg-purple-50 text-purple-700 border-purple-100">
                          {getCategoryName(service)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-[#D97853]">
                          {formatCurrency(service.price)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[#2D3436]/60 font-medium">
                          <Clock className="w-4 h-4" />
                          {formatDuration(service.duration)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[#D97853] font-bold">
                          <Star className="w-4 h-4 fill-current" />
                          {service.rating?.toFixed(1) || "0.0"}
                          <span className="text-[#2D3436]/40 text-xs font-medium">
                            ({service.totalReviews || 0})
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm border ${
                            service.isActive
                              ? "bg-[#7FB069]/10 text-[#7FB069] border-[#7FB069]/20"
                              : "bg-[#2D3436]/5 text-[#2D3436]/50 border-[#2D3436]/10"
                          }`}
                        >
                          {service.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3 text-[#2D3436]/40">
                          <Eye
                            size={16}
                            className="hover:text-[#D97853] transition-colors cursor-pointer"
                            onClick={() => handleViewDetail(service)}
                          />
                          <Edit2
                            size={16}
                            className="hover:text-[#7FB069] transition-colors cursor-pointer"
                            onClick={() => handleOpenEdit(service)}
                          />
                          <Trash2
                            size={16}
                            className="hover:text-red-500 transition-colors cursor-pointer"
                            onClick={() => handleOpenDelete(service)}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-[#2D3436]/5 flex items-center justify-between">
              <p className="text-sm font-medium text-[#2D3436]/60">
                Showing {services.length} of {pagination.total} services
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-xl border border-[#2D3436]/10 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#D97853] hover:text-[#D97853] transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-4 py-2 text-[#2D3436] font-bold">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  disabled={pagination.page >= pagination.pages}
                  className="p-2 rounded-xl border border-[#2D3436]/10 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#D97853] hover:text-[#D97853] transition-colors"
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
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailModal(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[700px] max-h-[90vh] bg-[#FDFBF7] rounded-[24px] shadow-2xl z-50 flex flex-col overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-[#2D3436]/10 px-6 py-4 flex items-center justify-between z-30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D97853]/10 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-[#D97853]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#2D3436] leading-tight">
                      Service Details
                    </h2>
                    <p className="text-xs text-[#2D3436]/50 font-medium">
                      View service information
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-8 h-8 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#2D3436]/10 transition-colors text-[#2D3436]/50 hover:text-[#2D3436]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D97853]"></div>
                  </div>
                ) : selectedService ? (
                  <div className="space-y-6">
                    {/* Images */}
                    {selectedService.images?.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedService.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`${selectedService.name} ${idx + 1}`}
                            className="w-32 h-32 object-cover rounded-xl flex-shrink-0"
                          />
                        ))}
                      </div>
                    )}

                    {/* Name & Category */}
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        {selectedService.name}
                      </h3>
                      <span className="inline-block mt-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                        {getCategoryName(selectedService)}
                      </span>
                    </div>

                    {/* Price, Duration, Rating */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-amber-50 rounded-xl p-4 text-center">
                        <DollarSign className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                        <p className="text-sm text-amber-700">Price</p>
                        <p className="font-bold text-lg text-amber-800">
                          {formatCurrency(selectedService.price)}
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-4 text-center">
                        <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                        <p className="text-sm text-blue-700">Duration</p>
                        <p className="font-bold text-lg text-blue-800">
                          {formatDuration(selectedService.duration)}
                        </p>
                      </div>
                      <div className="bg-yellow-50 rounded-xl p-4 text-center">
                        <Star className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                        <p className="text-sm text-yellow-700">Rating</p>
                        <p className="font-bold text-lg text-yellow-800">
                          {selectedService.rating?.toFixed(1) || "0.0"} (
                          {selectedService.totalReviews || 0})
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedService.description && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-700 mb-2">
                          Description
                        </h4>
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {selectedService.description}
                        </p>
                      </div>
                    )}

                    {/* Pet Types */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
                        <PawPrint className="w-5 h-5" />
                        Pet Types
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedService.petTypes?.map((pt) => (
                          <span
                            key={pt}
                            className="px-3 py-1 bg-white text-blue-700 rounded-full text-sm"
                          >
                            {PET_TYPE_LABELS[pt] || pt}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Features */}
                    {selectedService.features?.length > 0 && (
                      <div className="bg-green-50 rounded-xl p-4">
                        <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
                          <ListChecks className="w-5 h-5" />
                          Features
                        </h4>
                        <ul className="space-y-1">
                          {selectedService.features.map((feat, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-2 text-green-700"
                            >
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                              {feat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Status & Capacity */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <span className="text-gray-600">Status: </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedService.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {selectedService.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        Capacity:{" "}
                        <span className="font-medium">
                          {selectedService.maxCapacity || 1}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#2D3436]/50 text-center py-8 font-medium">
                    Service not found
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFormModal(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[700px] max-h-[90vh] bg-[#FDFBF7] rounded-[24px] shadow-2xl z-50 flex flex-col overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-[#2D3436]/10 px-6 py-4 flex items-center justify-between z-30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D97853]/10 flex items-center justify-center">
                    <Edit2 className="w-5 h-5 text-[#D97853]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#2D3436] leading-tight">
                      {formMode === "create" ? "Add New Service" : "Edit Service"}
                    </h2>
                    <p className="text-xs text-[#2D3436]/50 font-medium">
                      {formMode === "create" ? "Create a new pet care service" : "Update service information"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="w-8 h-8 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#2D3436]/10 transition-colors text-[#2D3436]/50 hover:text-[#2D3436]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmitForm} className="p-6 md:p-8 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Service Name <span className="text-[#D97853]">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30"
                    placeholder="E.g. Spa bath for dogs"
                  />
                </div>

                {/* Category */}
                <div className={`relative ${isCategoryOpen ? "z-[60]" : "z-10"}`}>
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Category <span className="text-[#D97853]">*</span>
                  </label>
                  <div
                    className={`flex items-center justify-between px-4 py-3 bg-[#FDFBF7] border ${isCategoryOpen ? "border-[#D97853] ring-1 ring-[#D97853]/20" : "border-[#D97853]"} rounded-2xl cursor-pointer hover:border-[#D97853] transition-all`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCategoryOpen(!isCategoryOpen);
                    }}
                  >
                    <span className={`text-sm font-medium ${formData.category ? "text-[#2D3436]" : "text-gray-500"}`}>
                      {formData.category
                        ? categories.find((c) => c._id === formData.category)?.name || "Select category"
                        : "Select category"}
                    </span>
                    <MoreVertical size={14} className="text-[#D97853]" />
                  </div>
                  <AnimatePresence>
                    {isCategoryOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCategoryOpen(false);
                          }}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#FDFBF7] rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#2D3436]/5 overflow-hidden z-50 py-1.5 max-h-60 overflow-y-auto"
                        >
                          {categories.map((cat) => {
                            const isSelected = formData.category === cat._id;
                            return (
                              <div
                                key={cat._id}
                                className={`px-4 py-2.5 text-[14px] cursor-pointer transition-colors ${!isSelected ? "text-[#2D3436]/70 hover:bg-[#2D3436]/5 font-medium" : "border-l-[3px] border-[#D97853] bg-[#D97853]/10 text-[#D97853] font-bold"}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFormChange({ target: { name: "category", value: cat._id } });
                                  setIsCategoryOpen(false);
                                }}
                              >
                                {cat.name}
                              </div>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 resize-none"
                    placeholder="Describe the service in detail..."
                  />
                </div>

                {/* Price & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Price (VND) <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleFormChange}
                      required
                      min="0"
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all"
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Duration (min) <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleFormChange}
                      required
                      min="1"
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all"
                      placeholder="60"
                    />
                  </div>
                </div>

                {/* Max Capacity */}
                <div>
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    name="maxCapacity"
                    value={formData.maxCapacity}
                    onChange={handleFormChange}
                    min="1"
                    className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all"
                    placeholder="1"
                  />
                </div>

                {/* Pet Types */}
                <div>
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Applicable Pet Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PET_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handlePetTypeToggle(opt.value)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                          formData.petTypes.includes(opt.value)
                            ? "bg-[#D97853] text-white shadow-[0_3px_10px_rgba(217,120,83,0.3)]"
                            : "bg-white border border-[#2D3436]/10 text-[#2D3436]/70 hover:border-[#D97853] hover:text-[#D97853]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Features
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-white border border-[#2D3436]/10 rounded-xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-1 focus:ring-[#D97853]/20"
                      placeholder="Enter feature..."
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleAddFeature())
                      }
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="px-4 py-2.5 bg-[#7FB069] text-white rounded-xl font-bold text-sm hover:bg-[#6a9a57] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7FB069]/10 text-[#7FB069] rounded-full text-sm font-medium border border-[#7FB069]/20"
                      >
                        {feat}
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Images (URL)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={imageInput}
                      onChange={(e) => setImageInput(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-white border border-[#2D3436]/10 rounded-xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-1 focus:ring-[#D97853]/20"
                      placeholder="Enter image URL..."
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleAddImage())
                      }
                    />
                    <button
                      type="button"
                      onClick={handleAddImage}
                      className="px-4 py-2.5 bg-[#7FB069] text-white rounded-xl font-bold text-sm hover:bg-[#6a9a57] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Preview ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-xl border border-[#2D3436]/10"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3 bg-white border border-[#2D3436]/10 rounded-2xl p-4">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleFormChange}
                    className="w-5 h-5 rounded border-[#2D3436]/20 text-[#D97853] focus:ring-[#D97853]"
                  />
                  <label htmlFor="isActive" className="text-[#2D3436] font-medium">
                    Active service
                  </label>
                </div>
              </form>

              {/* Modal Footer */}
              <div className="px-6 py-4 md:px-8 border-t border-[#2D3436]/10 bg-white flex items-center justify-end gap-3 sticky bottom-0 z-30">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#2D3436]/70 hover:bg-[#2D3436]/5 hover:text-[#2D3436] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmitForm}
                  disabled={formLoading}
                  className="bg-[#D97853] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  {formLoading
                    ? "Saving..."
                    : formMode === "create"
                      ? "Create Service"
                      : "Update Service"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedService && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] bg-[#FDFBF7] rounded-[24px] shadow-2xl z-50 p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2D3436] mb-2">
                Delete Service?
              </h3>
              <p className="text-[#2D3436]/60 mb-6 font-medium">
                Are you sure you want to delete{" "}
                <strong className="text-[#2D3436]">{selectedService.name}</strong>? This action cannot be
                undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 px-4 bg-white border border-[#2D3436]/10 rounded-xl font-bold text-[#2D3436]/70 hover:border-[#2D3436]/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
