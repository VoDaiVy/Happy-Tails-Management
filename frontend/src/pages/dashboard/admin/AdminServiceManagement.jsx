import { useState, useEffect, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import useScrollLock from "../../../hooks/useScrollLock";
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
  UploadCloud,
  AlertCircle,
} from "lucide-react";
import AdminFilterBar from "../../../components/dashboard/AdminFilterBar";
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../../../api/serviceApi";
import { getAllCategories } from "../../../api/categoryApi";

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
  useScrollLock(showDetailModal || showFormModal || showDeleteModal);

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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const closeFormModal = () => {
    setShowFormModal(false);
    setIsCategoryOpen(false);
  };

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
    setIsCategoryOpen(false);
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
    setIsCategoryOpen(false);
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

      closeFormModal();
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
    setDeleteLoading(false);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await deleteService(selectedService._id);
      setShowDeleteModal(false);
      fetchServices();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa dịch vụ");
    } finally {
      setDeleteLoading(false);
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

  const isEditMode = formMode === "edit";
  const formTitle = isEditMode ? "Edit Service" : "Add New Service";
  const formSubtitle = isEditMode
    ? "Update service information"
    : "Create a new pet care service";
  const isFormSubmittable =
    formData.name.trim() &&
    formData.category &&
    Number(formData.price) >= 0 &&
    Number(formData.duration) >= 1 &&
    formData.petTypes.length > 0;

  return (
    <Motion.div
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
          <p className="text-[#2D3436]/60 text-sm">Manage pet care services</p>
        </div>
        <Motion.button
          onClick={handleOpenCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 shrink-0"
        >
          <Plus size={18} /> Add Service
        </Motion.button>
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
        ) : services.length === 0 ? (
          <div className="text-center py-20 text-[#2D3436]/40">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-[#2D3436]/20" />
            <p className="text-lg font-bold text-[#2D3436]">
              No services found
            </p>
            <p className="text-sm font-medium text-[#2D3436] mt-1">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FDFBF7] border-b border-[#2D3436]/5 text-xs font-bold text-[#2D3436]">
                    <th className="px-6 py-4 whitespace-nowrap">Service</th>
                    <th className="px-6 py-4 whitespace-nowrap">Category</th>
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
                <tbody className="divide-y divide-gray-100">
                  {services.map((service) => (
                    <Motion.tr
                      key={service._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
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
                        <span className="inline-block px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                          {getCategoryName(service)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-amber-600">
                          {formatCurrency(service.price)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          {formatDuration(service.duration)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-yellow-600">
                          <Star className="w-4 h-4 fill-current" />
                          {service.rating?.toFixed(1) || "0.0"}
                          <span className="text-[#2D3436]/40 text-xs font-medium">
                            ({service.totalReviews || 0})
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            service.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {service.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleViewDetail(service)} />
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
                    </Motion.tr>
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
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
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
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
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
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#121315]/55 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
            onClick={closeFormModal}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[860px] rounded-[28px] border border-[#EFDCD2] bg-[#FFFEFD] shadow-[0_24px_70px_rgba(17,24,39,0.32)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <form
                onSubmit={handleSubmitForm}
                className="flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="sticky top-0 z-30 border-b border-[#EFDCD2] px-5 md:px-6 py-4 bg-gradient-to-r from-[#FFF1E8] via-[#FFF7F1] to-[#FFFCFA]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-white/90 border border-[#F4D6C7] shadow-sm flex items-center justify-center shrink-0">
                        <Edit2 className="w-5 h-5 text-[#D97853]" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-[27px] leading-[1.1] font-extrabold tracking-[-0.01em] text-[#1F2933]">
                          {formTitle}
                        </h2>
                        <p className="mt-1 text-[13px] font-medium text-[#9D725F]">
                          {formSubtitle}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeFormModal}
                      className="p-2 rounded-xl text-[#7C6A6F] hover:text-[#2D3436] hover:bg-white/90 transition-colors"
                      aria-label="Close service modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {/* Body */}
                <div className="px-5 md:px-6 py-4 overflow-y-auto space-y-3.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <section className="bg-[#FFFFFF] border border-[#2D3436]/10 rounded-2xl p-4 md:p-5 space-y-3.5">
                    <h3 className="text-[12px] font-bold tracking-[0.08em] text-[#2D3436]/50 uppercase">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5">
                          Service Name <span className="text-[#D97853]">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleFormChange}
                          required
                          className="w-full h-11 px-3.5 bg-white border border-[#2D3436]/12 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 placeholder:text-[#2D3436]/35"
                          placeholder="E.g. Spa bath for dogs"
                        />
                      </div>

                      <div
                        className={`relative ${isCategoryOpen ? "z-[70]" : "z-10"}`}
                      >
                        <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5">
                          Category <span className="text-[#D97853]">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCategoryOpen((prev) => !prev)}
                          className="w-full h-11 px-3.5 border border-[#2D3436]/12 rounded-2xl bg-white text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853]"
                        >
                          <span
                            className={`text-sm font-medium ${formData.category ? "text-[#2D3436]" : "text-[#2D3436]/40"}`}
                          >
                            {formData.category
                              ? categories.find(
                                  (c) => c._id === formData.category,
                                )?.name || "Select category"
                              : "Select category"}
                          </span>
                          <ChevronDown
                            size={15}
                            className={`text-[#D97853] transition-transform ${
                              isCategoryOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

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
                              <Motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#FDFBF7] rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#2D3436]/5 overflow-hidden z-50 py-1.5 max-h-60 overflow-y-auto"
                              >
                                {categories.map((cat) => {
                                  const isSelected =
                                    formData.category === cat._id;
                                  return (
                                    <button
                                      key={cat._id}
                                      type="button"
                                      className={`w-full text-left px-4 py-2.5 text-[14px] transition-colors ${
                                        !isSelected
                                          ? "text-[#2D3436]/70 hover:bg-[#2D3436]/5 font-medium"
                                          : "border-l-[3px] border-[#D97853] bg-[#D97853]/10 text-[#D97853] font-bold"
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFormChange({
                                          target: {
                                            name: "category",
                                            value: cat._id,
                                          },
                                        });
                                        setIsCategoryOpen(false);
                                      }}
                                    >
                                      {cat.name}
                                    </button>
                                  );
                                })}
                              </Motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleFormChange}
                        rows={2}
                        className="w-full min-h-[84px] px-3.5 py-2.5 bg-white border border-[#2D3436]/12 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 placeholder:text-[#2D3436]/35 resize-none"
                        placeholder="Describe the service in detail..."
                      />
                    </div>
                  </section>

                  <section className="bg-[#FFFFFF] border border-[#2D3436]/10 rounded-2xl p-4 md:p-5 space-y-3.5">
                    <h3 className="text-[12px] font-bold tracking-[0.08em] text-[#2D3436]/50 uppercase">
                      Pricing & Capacity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5">
                          Price (VND) <span className="text-[#D97853]">*</span>
                        </label>
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleFormChange}
                          required
                          min="0"
                          className="w-full h-11 px-3.5 border border-[#2D3436]/12 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853]"
                          placeholder="100000"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5">
                          Duration (min){" "}
                          <span className="text-[#D97853]">*</span>
                        </label>
                        <input
                          type="number"
                          name="duration"
                          value={formData.duration}
                          onChange={handleFormChange}
                          required
                          min="1"
                          className="w-full h-11 px-3.5 border border-[#2D3436]/12 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853]"
                          placeholder="60"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5">
                          Max Capacity
                        </label>
                        <input
                          type="number"
                          name="maxCapacity"
                          value={formData.maxCapacity}
                          onChange={handleFormChange}
                          min="1"
                          className="w-full h-11 px-3.5 border border-[#2D3436]/12 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853]"
                          placeholder="1"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="bg-[#FFFFFF] border border-[#2D3436]/10 rounded-2xl p-4 md:p-5 space-y-3.5">
                    <h3 className="text-[12px] font-bold tracking-[0.08em] text-[#2D3436]/50 uppercase">
                      Applicable Pet Types
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {PET_TYPE_OPTIONS.map((opt) => {
                        const isSelected = formData.petTypes.includes(
                          opt.value,
                        );
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handlePetTypeToggle(opt.value)}
                            className={`h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl border text-sm font-semibold transition-colors ${
                              isSelected
                                ? "bg-[#FFF4ED] border-[#F0BFAC] text-[#B45F40]"
                                : "bg-[#F8FAFC] border-[#E4E9EE] text-[#5E6872] hover:bg-[#EEF2F5]"
                            }`}
                          >
                            <PawPrint size={13} className="shrink-0" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="bg-[#FFFFFF] border border-[#2D3436]/10 rounded-2xl p-4 md:p-5 space-y-3.5">
                    <h3 className="text-[12px] font-bold tracking-[0.08em] text-[#2D3436]/50 uppercase">
                      Features & Images
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2.5">
                        <label className="block text-[13px] font-semibold text-[#2D3436]">
                          Features
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={featureInput}
                            onChange={(e) => setFeatureInput(e.target.value)}
                            className="flex-1 h-11 px-3.5 bg-white border border-[#2D3436]/12 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 placeholder:text-[#2D3436]/35"
                            placeholder="Add a feature"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddFeature();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddFeature}
                            className="h-11 px-4 inline-flex items-center gap-1.5 bg-[#D97853] text-white rounded-xl hover:bg-[#C66A47] transition-colors text-sm font-semibold"
                          >
                            <Plus size={14} /> Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[40px]">
                          {formData.features.map((feat, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EAF8EE] text-[#2E7D4B] border border-[#CDEED8] rounded-full text-xs font-semibold"
                            >
                              {feat}
                              <button
                                type="button"
                                onClick={() => handleRemoveFeature(idx)}
                                className="text-[#2E7D4B] hover:text-[#C92E46]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <label className="block text-[13px] font-semibold text-[#2D3436]">
                          Images (URL)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={imageInput}
                            onChange={(e) => setImageInput(e.target.value)}
                            className="flex-1 h-11 px-3.5 bg-white border border-[#2D3436]/12 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 placeholder:text-[#2D3436]/35"
                            placeholder="Paste image URL"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddImage();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddImage}
                            className="h-11 px-4 inline-flex items-center gap-1.5 bg-[#F3F6F9] border border-[#DCE3EA] text-[#475565] rounded-xl hover:bg-[#EAEFF5] transition-colors text-sm font-semibold"
                          >
                            <UploadCloud size={14} /> Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[40px]">
                          {formData.images.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={img}
                                alt={`Preview ${idx + 1}`}
                                className="w-14 h-14 object-cover rounded-xl border border-[#E3E8ED]"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#C92E46] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="bg-[#FFFFFF] border border-[#2D3436]/10 rounded-2xl p-4 md:p-5 space-y-3.5">
                    <h3 className="text-[12px] font-bold tracking-[0.08em] text-[#2D3436]/50 uppercase">
                      Status
                    </h3>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.isActive}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          isActive: !prev.isActive,
                        }))
                      }
                      className={`h-11 w-full max-w-[260px] px-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                        formData.isActive
                          ? "bg-[#FFF4ED] border-[#F5CCB9]"
                          : "bg-white border-[#E6EAED] hover:bg-[#F8FAFB]"
                      }`}
                    >
                      <span
                        className={`text-sm font-semibold ${
                          formData.isActive
                            ? "text-[#AF6242]"
                            : "text-[#4F575D]"
                        }`}
                      >
                        Active service
                      </span>
                      <span
                        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                          formData.isActive ? "bg-[#D97853]" : "bg-[#D0D6DB]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            formData.isActive ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                    </button>
                  </section>
                </div>

                {/* Footer */}
                <div className="border-t border-[#E7E0DB] bg-white px-5 md:px-6 py-3.5 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="h-11 px-5 text-sm font-semibold text-[#5D656B] hover:bg-[#F2F5F7] rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading || !isFormSubmittable}
                    className={`h-11 min-w-[152px] inline-flex items-center justify-center gap-2 px-5 text-sm font-bold rounded-xl transition-all ${
                      formLoading || !isFormSubmittable
                        ? "bg-[#F2C9B8] text-white/90 cursor-not-allowed"
                        : "bg-[#D97853] text-white hover:bg-[#C66A47] active:scale-[0.99] shadow-[0_10px_24px_rgba(217,120,83,0.28)]"
                    }`}
                  >
                    {formLoading ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    {isEditMode ? "Update Service" : "Create Service"}
                  </button>
                </div>
              </form>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedService && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#121315]/55 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[560px] bg-[#FFFEFD] rounded-[26px] border border-[#F3DDE0] shadow-[0_24px_60px_rgba(17,24,39,0.35)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 bg-gradient-to-r from-white via-[#FFF9F9] to-[#FFF1F3] border-b border-[#F3E3E6] flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#FDEDEE] border border-[#F8D4D8] shadow-sm flex items-center justify-center shrink-0">
                    <Trash2 size={19} className="text-[#D73A4F]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[24px] leading-[1.1] font-extrabold tracking-[-0.01em] text-[#1F2933]">
                      Delete Service?
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[#7A6368]">
                      This action permanently removes the selected service.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="p-2 rounded-xl text-[#7C6A6F] hover:text-[#2D3436] hover:bg-white/90 transition-colors"
                  aria-label="Close delete service modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex gap-3 p-3.5 bg-[#FFF5F6] border border-[#F6D5D9] rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#F4CCD2] flex items-center justify-center shrink-0">
                    <AlertCircle size={16} className="text-[#CE3047]" />
                  </div>
                  <div className="text-sm leading-relaxed text-[#7A4048]">
                    <p className="font-semibold text-[#B8273F]">
                      This action cannot be undone.
                    </p>
                    <p className="mt-0.5">
                      Deleting this service may affect related bookings and
                      historical references.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-2xl">
                  <div className="w-11 h-11 rounded-full bg-[#FFF0EA] border border-[#F5D5C8] flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-[#B66342]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold text-[#1F2933] truncate leading-tight">
                      {selectedService.name}
                    </p>
                    <p className="text-sm font-medium text-[#66727F] truncate mt-0.5">
                      {getCategoryName(selectedService)}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-[#FFF0EA] text-[#B66342] border-[#F5D5C8]">
                    {selectedService.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <p className="text-sm text-[#5E6B75] leading-relaxed">
                  You are about to permanently delete service{" "}
                  <span className="font-semibold text-[#1F2933]">
                    {selectedService.name}
                  </span>
                  . This action cannot be undone.
                </p>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="h-11 px-5 border border-[#D8E0E7] bg-white text-[#435261] text-sm font-semibold rounded-2xl hover:bg-[#F4F7FA] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteLoading}
                    className={`h-11 min-w-[140px] px-5 text-sm font-semibold rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
                      deleteLoading
                        ? "bg-[#F3C1C9] text-white/90 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-[#E15065] to-[#C92E46] text-white hover:brightness-105 shadow-[0_10px_24px_rgba(201,46,70,0.35)]"
                    }`}
                  >
                    {deleteLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} /> Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}
