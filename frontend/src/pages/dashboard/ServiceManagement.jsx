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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#D97853] flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-[#D97853]" />
            Service Management
          </h1>
          <p className="text-[#2D3436]/60 text-sm mt-1">
            Manage pet care services
          </p>
        </div>
      </div>

      {/* Filters */}
      <div>
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
          onCreateClick={handleOpenCreate}
          createLabel="Add Service"
        />
      </div>

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
          <div className="text-center py-20 text-gray-500">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No services found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      Service
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      Category
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                      Price
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      Duration
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      Rating
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
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
                          <span className="text-gray-400 text-xs">
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
                          {service.isActive ? (
                            <>
                              <ToggleRight className="w-4 h-4" />
                              Active
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetail(service)}
                            className="p-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(service)}
                            className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(service)}
                            className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-600">
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
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-amber-600" />
                  Service Details
                </h2>
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
                  <p className="text-gray-500 text-center py-8">
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
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-800">
                  {formMode === "create" ? "Add New Service" : "Edit Service"}
                </h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="E.g. Spa bath for dogs"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Describe the service in detail..."
                  />
                </div>

                {/* Price & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (VND) <span className="text-red-500">*</span>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (min) <span className="text-red-500">*</span>
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

                {/* Max Capacity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    name="maxCapacity"
                    value={formData.maxCapacity}
                    onChange={handleFormChange}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    placeholder="1"
                  />
                </div>

                {/* Pet Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Features
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
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
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
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
                  <label htmlFor="isActive" className="text-gray-700">
                    Active service
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 py-3 px-4 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {formLoading
                      ? "Saving..."
                      : formMode === "create"
                        ? "Create"
                        : "Update"}
                  </button>
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
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Delete Service?
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete{" "}
                  <strong>{selectedService.name}</strong>? This action cannot be
                  undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
