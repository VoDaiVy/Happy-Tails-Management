import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useScrollLock from '../../hooks/useScrollLock';
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
import AdminFilterBar from "../../components/dashboard/AdminFilterBar";
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../../api/serviceApi";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../api/categoryApi";
import { uploadMultipleImages } from "../../api/uploadApi";

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

const SERVICE_GROUP_OPTIONS = [
  { value: "dry", label: "Dry" },
  { value: "wet", label: "Wet" },
];

const SERVICE_GROUP_LABELS = {
  dry: "Dry",
  wet: "Wet",
};

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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategoryDeleteModal, setShowCategoryDeleteModal] = useState(false);
  useScrollLock(showDetailModal || showFormModal || showDeleteModal || showCategoryModal || showCategoryDeleteModal);

  // Selected item
  const [selectedService, setSelectedService] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state
  const [formMode, setFormMode] = useState("create");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    group: "dry",
    price: "",
    duration: "",
    petTypes: ["dog", "cat"],
    features: [],
    images: [],
    isActive: true,
  });
  const [featureInput, setFeatureInput] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categoryFormMode, setCategoryFormMode] = useState("create");
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [categoryEditingId, setCategoryEditingId] = useState("");
  const [categoryFormLoading, setCategoryFormLoading] = useState(false);
  const [selectedCategoryToDelete, setSelectedCategoryToDelete] = useState(null);

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
      group: "dry",
      price: "",
      duration: "",
      petTypes: ["dog", "cat"],
      features: [],
      images: [],
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
      group: service.group || "dry",
      price: service.price,
      duration: service.duration,
      petTypes: service.petTypes || ["dog", "cat"],
      features: service.features || [],
      images: service.images || [],
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

  const handleUploadImages = async (filesInput) => {
    const files = Array.from(filesInput || []).filter((file) =>
      file.type?.startsWith("image/"),
    );

    if (!files.length) return;

    try {
      setImageUploading(true);
      console.log("Starting upload for files:", files);
      const uploadedUrls = await uploadMultipleImages(files);
      console.log("Uploaded URLs received:", uploadedUrls);

      setFormData((prev) => ({
        ...prev,
        images: Array.from(new Set([...(prev.images || []), ...uploadedUrls])),
      }));
      
      console.log("FormData images updated");
      setToast({ type: 'success', message: `${uploadedUrls.length} ảnh đã upload thành công` });
    } catch (err) {
      console.error("Upload error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Không thể upload ảnh";
      setError(errorMsg);
      setToast({ type: 'error', message: errorMsg });
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageDrop = async (event) => {
    event.preventDefault();
    await handleUploadImages(event.dataTransfer.files);
  };

  const handleImageInputChange = async (event) => {
    await handleUploadImages(event.target.files);
    event.target.value = "";
  };

  const handleOpenCategoryCreate = () => {
    setCategoryFormMode("create");
    setCategoryEditingId("");
    setCategoryFormData({
      name: "",
      description: "",
      isActive: true,
    });
    setShowCategoryModal(true);
  };

  const handleOpenCategoryEdit = () => {
    const categoryId = formData.category || categories[0]?._id || "";
    const targetCategory = categories.find((cat) => cat._id === categoryId);

    if (!targetCategory) {
      setToast({ type: "error", message: "Vui lòng chọn category để chỉnh sửa" });
      return;
    }

    setCategoryFormMode("edit");
    setCategoryEditingId(targetCategory._id);
    setCategoryFormData({
      name: targetCategory.name || "",
      description: targetCategory.description || "",
      isActive: targetCategory.isActive !== false,
    });
    setShowCategoryModal(true);
  };

  const handleCategoryFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCategoryFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    const trimmedName = categoryFormData.name.trim();
    if (!trimmedName) {
      setToast({ type: "error", message: "Tên category không được để trống" });
      return;
    }

    try {
      setCategoryFormLoading(true);
      const payload = {
        name: trimmedName,
        description: categoryFormData.description.trim(),
        isActive: categoryFormData.isActive,
      };

      if (categoryFormMode === "create") {
        const created = await createCategory(payload);
        await fetchCategories();
        if (created?.data?._id) {
          setFormData((prev) => ({ ...prev, category: created.data._id }));
        }
        setToast({ type: "success", message: "Tạo category thành công" });
      } else {
        await updateCategory(categoryEditingId, payload);
        await fetchCategories();
        setToast({ type: "success", message: "Cập nhật category thành công" });
      }

      setShowCategoryModal(false);
    } catch (err) {
      const message = err.response?.data?.message || "Không thể lưu category";
      setToast({ type: "error", message });
    } finally {
      setCategoryFormLoading(false);
    }
  };

  const handleOpenCategoryEditByFilter = (option) => {
    const targetCategory = categories.find((cat) => cat._id === option.value);
    if (!targetCategory) {
      setToast({ type: "error", message: "Không tìm thấy category để chỉnh sửa" });
      return;
    }

    setCategoryFormMode("edit");
    setCategoryEditingId(targetCategory._id);
    setCategoryFormData({
      name: targetCategory.name || "",
      description: targetCategory.description || "",
      isActive: targetCategory.isActive !== false,
    });
    setShowCategoryModal(true);
  };

  const handleDeleteCategoryByFilter = async (option) => {
    const targetCategory = categories.find((cat) => cat._id === option.value);
    if (!targetCategory) {
      setToast({ type: "error", message: "Không tìm thấy category để xóa" });
      return;
    }

    setSelectedCategoryToDelete(targetCategory);
    setShowCategoryDeleteModal(true);
  };

  const handleConfirmCategoryDelete = async () => {
    if (!selectedCategoryToDelete?._id) return;

    try {
      await deleteCategory(selectedCategoryToDelete._id);
      await fetchCategories();
      if (categoryFilter === selectedCategoryToDelete._id) {
        setCategoryFilter("all");
      }
      if (formData.category === selectedCategoryToDelete._id) {
        setFormData((prev) => ({ ...prev, category: "" }));
      }
      setShowCategoryDeleteModal(false);
      setSelectedCategoryToDelete(null);
      setToast({ type: "success", message: "Xóa category thành công" });
      fetchServices();
    } catch (err) {
      const message = err.response?.data?.message || "Không thể xóa category";
      setToast({ type: "error", message });
    }
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
        group: formData.group,
        price: Number(formData.price),
        duration: Number(formData.duration),
        petTypes: formData.petTypes,
        features: formData.features,
        images: formData.images,
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
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={handleOpenCategoryCreate}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white border border-[#2D3436]/10 text-[#2D3436] px-4 py-2.5 rounded-xl font-bold text-sm hover:border-[#D97853] hover:text-[#D97853] transition-all flex items-center gap-2 shrink-0"
          >
            <Tag size={16} /> Add Category
          </motion.button>
          <motion.button
            type="button"
            onClick={handleOpenCreate}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 shrink-0"
          >
            <Plus size={18} /> Add Service
          </motion.button>
        </div>
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
            options: [
              { label: "All Categories", value: "all" },
              ...categories.map((c) => ({ label: c.name, value: c._id })),
            ],
            value: categoryFilter,
            onChange: (opt) => setCategoryFilter(opt || "all"),
            optionActions: {
              hideForValues: ["all"],
              onEdit: handleOpenCategoryEditByFilter,
              onDelete: handleDeleteCategoryByFilter,
            },
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
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Group
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
                <tbody className="divide-y divide-gray-100">
                  {services.map((service) => (
                    <motion.tr
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
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full border ${
                            service.group === "wet"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}
                        >
                          {SERVICE_GROUP_LABELS[service.group] || "Dry"}
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
                          <button
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
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
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-block px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                          {getCategoryName(selectedService)}
                        </span>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm ${
                            selectedService.group === "wet"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {SERVICE_GROUP_LABELS[selectedService.group] || "Dry"} Service
                        </span>
                      </div>
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

                    {/* Status & Capacity Source */}
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
                      <div className="text-gray-600 text-sm">
                        Capacity by group (Wet/Dry) in Room Management modal
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowFormModal(false)}
          >
            <motion.div
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
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
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
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="block text-sm font-bold text-[#2D3436]">
                      Category <span className="text-[#D97853]">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenCategoryCreate}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#7FB069]/40 bg-[#7FB069]/10 px-2 py-1 text-[11px] font-bold text-[#5f8e4e] hover:bg-[#7FB069]/20 transition-colors"
                      >
                        <Plus size={12} /> Add
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenCategoryEdit}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#D97853]/40 bg-[#D97853]/10 px-2 py-1 text-[11px] font-bold text-[#D97853] hover:bg-[#D97853]/20 transition-colors"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                    </div>
                  </div>
                  <div
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 flex items-center justify-between cursor-pointer bg-white"
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                      placeholder="60"
                    />
                  </div>
                </div>

                {/* Service Group */}
                <div>
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Service Group <span className="text-[#D97853]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {SERVICE_GROUP_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          handleFormChange({
                            target: { name: "group", value: opt.value },
                          })
                        }
                        className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                          formData.group === opt.value
                            ? "border-[#D97853] bg-[#D97853]/10 text-[#D97853]"
                            : "border-[#2D3436]/10 bg-white text-[#2D3436]/70 hover:border-[#D97853]/60"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[#2D3436]/50">
                    Dry: Cắt tỉa/Cắt móng... | Wet: Tắm/Sấy/Massage...
                  </p>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                  Group capacity (Wet/Dry) is managed in <strong>Room Management</strong> via the capacity modal.
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
                        className={`px-3 py-2 rounded-lg border-2 transition-all ${
                          formData.petTypes.includes(opt.value)
                            ? "border-amber-500 bg-amber-50 text-amber-700"
                            : "border-gray-200 hover:border-gray-300"
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
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
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
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
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
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleFormChange}
                    className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="isActive" className="text-[#2D3436] font-medium">
                    Active service
                  </label>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Delete Modal */}
      <AnimatePresence>
        {showCategoryDeleteModal && selectedCategoryToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCategoryDeleteModal(false);
                setSelectedCategoryToDelete(null);
              }}
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
                Delete Category?
              </h3>
              <p className="text-[#2D3436]/60 mb-6 font-medium">
                Are you sure you want to delete{" "}
                <strong className="text-[#2D3436]">{selectedCategoryToDelete.name}</strong>? This action cannot be
                undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCategoryDeleteModal(false);
                    setSelectedCategoryToDelete(null);
                  }}
                  className="flex-1 py-3 px-4 bg-white border border-[#2D3436]/10 rounded-xl font-bold text-[#2D3436]/70 hover:border-[#2D3436]/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCategoryDelete}
                  className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryModal(false)}
              className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[520px] bg-[#FDFBF7] rounded-[24px] shadow-2xl z-50 overflow-hidden"
            >
              <div className="bg-white border-b border-[#2D3436]/10 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#2D3436]">
                    {categoryFormMode === "create" ? "Add Category" : "Edit Category"}
                  </h3>
                  <p className="text-xs text-[#2D3436]/50 font-medium mt-0.5">
                    {categoryFormMode === "create"
                      ? "Create a new category from backend"
                      : "Update selected category"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="w-8 h-8 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#2D3436]/10 transition-colors text-[#2D3436]/50"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmitCategory} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Category Name <span className="text-[#D97853]">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={categoryFormData.name}
                    onChange={handleCategoryFormChange}
                    className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all"
                    placeholder="E.g. Grooming"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    value={categoryFormData.description}
                    onChange={handleCategoryFormChange}
                    className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all resize-none"
                    placeholder="Describe this category..."
                  />
                </div>

                <div className="flex items-center gap-3 bg-white border border-[#2D3436]/10 rounded-2xl p-4">
                  <input
                    type="checkbox"
                    id="categoryIsActive"
                    name="isActive"
                    checked={categoryFormData.isActive}
                    onChange={handleCategoryFormChange}
                    className="w-5 h-5 rounded border-[#2D3436]/20 text-[#D97853] focus:ring-[#D97853]"
                  />
                  <label htmlFor="categoryIsActive" className="text-[#2D3436] font-medium">
                    Active category
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#2D3436]/70 hover:bg-[#2D3436]/5 hover:text-[#2D3436] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={categoryFormLoading}
                    className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {categoryFormLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {categoryFormMode === "create" ? "Create Category" : "Update Category"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
