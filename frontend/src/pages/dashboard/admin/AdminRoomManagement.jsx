import React, { useState, useEffect, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import useScrollLock from "../../../hooks/useScrollLock";
import {
  DoorOpen,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  AlertCircle,
  Filter,
  ToggleLeft,
  ToggleRight,
  Bed,
  Users,
  PawPrint,
  Activity,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Waves,
  Wind,
} from "lucide-react";
import AdminFilterBar from "../../../components/dashboard/AdminFilterBar";
import {
  getRoomsList,
  createRoom,
  updateRoom,
  deleteRoom,
} from "../../../api/roomApi";
import {
  getGroupCapacities,
  initGroupCapacities,
  updateGroupCapacity,
} from "../../../api/groupCapacityApi";
import { getErrorMessage } from "../../../utils/apiResponseHandler";

// Room types
const ROOM_TYPES = [
  { value: "standard", label: "Standard", color: "bg-gray-100 text-gray-700" },
  { value: "deluxe", label: "Deluxe", color: "bg-blue-100 text-blue-700" },
  { value: "suite", label: "Suite", color: "bg-purple-100 text-purple-700" },
  { value: "vip", label: "VIP", color: "bg-amber-100 text-amber-700" },
];

const SERVICE_TYPES = [
  {
    value: "boarding",
    label: "Boarding",
    color: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    value: "service",
    label: "Service",
    color: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
];

const SERVICE_GROUPS = [
  {
    value: "dry",
    label: "Dry",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    value: "wet",
    label: "Wet",
    color: "bg-sky-50 text-sky-700 border-sky-100",
  },
];

// Pet types
const PET_TYPES = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "bird", label: "Bird" },
  { value: "rabbit", label: "Rabbit" },
  { value: "hamster", label: "Hamster" },
  { value: "fish", label: "Fish" },
  { value: "other", label: "Other" },
];

// Filter tabs
const FILTER_TABS = [
  { key: "all", label: "All", icon: DoorOpen },
  { key: "available", label: "Available", icon: Check },
  { key: "unavailable", label: "In Use", icon: Bed },
];

const deriveRoomCountFromConfig = (maxCapacity, slotsPerRoom) => {
  const normalizedCapacity = Math.max(1, Number(maxCapacity) || 1);
  const normalizedSlotsPerRoom = Math.max(1, Number(slotsPerRoom) || 1);
  return Math.max(1, Math.ceil(normalizedCapacity / normalizedSlotsPerRoom));
};

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create | edit
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [showGroupCapacityModal, setShowGroupCapacityModal] = useState(false);
  useScrollLock(showModal || showDeleteModal || showGroupCapacityModal);

  // Form state
  const [formData, setFormData] = useState({
    roomNumber: "",
    name: "",
    type: "standard",
    serviceType: "boarding",
    group: "",
    capacity: 1,
    amenities: [],
    petTypes: ["dog", "cat"],
    description: "",
    isAvailable: true,
    isActive: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  const [groupCapacities, setGroupCapacities] = useState({
    wet: { group: "wet", maxCapacity: 6, roomCount: 2, slotsPerRoom: 3 },
    dry: { group: "dry", maxCapacity: 6, roomCount: 2, slotsPerRoom: 3 },
  });
  const [groupCapacityLoading, setGroupCapacityLoading] = useState(true);
  const [groupCapacitySaving, setGroupCapacitySaving] = useState("");
  const [groupCapacityError, setGroupCapacityError] = useState("");

  const normalizeGroupCapacities = (response) => {
    const raw = Array.isArray(response?.data?.configs)
      ? response.data.configs
      : Array.isArray(response?.configs)
        ? response.configs
        : Array.isArray(response?.data)
          ? response.data
          : [];

    const normalized = {
      wet: { group: "wet", maxCapacity: 6, roomCount: 2, slotsPerRoom: 3 },
      dry: { group: "dry", maxCapacity: 6, roomCount: 2, slotsPerRoom: 3 },
    };

    raw.forEach((item) => {
      const key = String(item?.group || "").toLowerCase();
      if (!normalized[key]) return;
      normalized[key] = {
        ...normalized[key],
        ...item,
        maxCapacity: Number(item?.maxCapacity) || normalized[key].maxCapacity,
        roomCount: Number(item?.roomCount) || normalized[key].roomCount,
        slotsPerRoom: Number(item?.slotsPerRoom) || normalized[key].slotsPerRoom,
      };
    });

    return normalized;
  };

  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const updateFormField = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    clearFieldError(fieldName);
    setFormError(null);
  };

  const closeRoomModal = () => {
    setShowModal(false);
    setIsTypeOpen(false);
    setFieldErrors({});
    setFormError(null);
  };

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (activeTab === "available") params.isAvailable = "true";
      if (activeTab === "unavailable") params.isAvailable = "false";
      if (typeFilter) params.type = typeFilter;
      params.isActive = "true";

      const response = await getRoomsList(params);
      setRooms(response.data?.rooms || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách phòng");
    } finally {
      setLoading(false);
    }
  }, [activeTab, typeFilter]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const fetchGroupCapacityConfigs = useCallback(async () => {
    try {
      setGroupCapacityLoading(true);
      setGroupCapacityError("");

      let response = await getGroupCapacities();
      let normalized = normalizeGroupCapacities(response);
      const missingAny = !response?.data?.configs || response.data.configs.length === 0;

      if (missingAny) {
        await initGroupCapacities();
        response = await getGroupCapacities();
        normalized = normalizeGroupCapacities(response);
      }

      setGroupCapacities(normalized);
    } catch (err) {
      setGroupCapacityError(
        err?.response?.data?.message || "Không thể tải group capacity",
      );
    } finally {
      setGroupCapacityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroupCapacityConfigs();
  }, [fetchGroupCapacityConfigs]);

  // Filter rooms by search
  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      room.roomNumber?.toLowerCase().includes(query) ||
      room.name?.toLowerCase().includes(query)
    );
  });

  // Open create modal
  const handleCreate = () => {
    setModalMode("create");
    setSelectedRoom(null);
    setFormData({
      roomNumber: "",
      name: "",
      type: "standard",
      serviceType: "boarding",
      group: "",
      capacity: 1,
      pricePerNight: 10,
      amenities: [],
      petTypes: ["dog", "cat"],
      description: "",
      isAvailable: true,
      isActive: true,
    });
    setFieldErrors({});
    setFormError(null);
    setIsTypeOpen(false);
    setShowModal(true);
  };

  // Open edit modal
  const handleEdit = (room) => {
    setModalMode("edit");
    setSelectedRoom(room);
    setFormData({
      roomNumber: room.roomNumber || "",
      name: room.name || "",
      type: room.type || "standard",
      serviceType: room.serviceType || "boarding",
      group: room.group || "",
      capacity: room.capacity || 1,
      pricePerNight: room.pricePerNight ?? 0,
      amenities: room.amenities || [],
      petTypes: room.petTypes || ["dog", "cat"],
      description: room.description || "",
      isAvailable: room.isAvailable ?? true,
      isActive: room.isActive ?? true,
    });
    setFieldErrors({});
    setFormError(null);
    setIsTypeOpen(false);
    setShowModal(true);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const roomNumber = String(formData.roomNumber || "").trim();
    const roomName = String(formData.name || "").trim();
    const capacity = Number(formData.capacity);
    const pricePerNight = Number(formData.pricePerNight);

    const nextErrors = {};

    if (!roomNumber) nextErrors.roomNumber = "Vui lòng nhập mã phòng";
    if (!roomName) nextErrors.name = "Vui lòng nhập tên phòng";
    if (!formData.type) nextErrors.type = "Vui lòng chọn loại phòng";
    if (!formData.serviceType) {
      nextErrors.serviceType = "Vui lòng chọn service type";
    }
    if (formData.serviceType === "service" && !formData.group) {
      nextErrors.group = "Service room cần chọn group wet/dry";
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      nextErrors.capacity = "Sức chứa phải từ 1 trở lên";
    }
    if (!Number.isFinite(pricePerNight) || pricePerNight < 0) {
      nextErrors.pricePerNight = "Giá/đêm phải lớn hơn hoặc bằng 0";
    }
    if (!formData.petTypes?.length) {
      nextErrors.petTypes = "Chọn ít nhất 1 loại thú cưng";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Vui lòng kiểm tra lại các trường được tô đỏ");
      return;
    }

    setFormLoading(true);

    try {
      const submitData = {
        ...formData,
        roomNumber,
        name: roomName,
        capacity,
        pricePerNight,
        group: formData.serviceType === "service" ? formData.group : undefined,
      };

      if (modalMode === "create") {
        await createRoom(submitData);
      } else {
        await updateRoom(selectedRoom._id, submitData);
      }

      closeRoomModal();
      fetchRooms();
    } catch (err) {
      setFormError(getErrorMessage(err) || "Có lỗi xảy ra");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (!roomToDelete) return;

    try {
      setFormLoading(true);
      await deleteRoom(roomToDelete._id);
      setShowDeleteModal(false);
      setRoomToDelete(null);
      fetchRooms();
    } catch (err) {
      setFormError(getErrorMessage(err) || "Cannot delete room");
    } finally {
      setFormLoading(false);
    }
  };

  // Get room type badge
  const getRoomTypeBadge = (type) => {
    const roomType = ROOM_TYPES.find((t) => t.value === type);
    return roomType || ROOM_TYPES[0];
  };

  const getServiceTypeBadge = (serviceType) => {
    return (
      SERVICE_TYPES.find((type) => type.value === serviceType) ||
      SERVICE_TYPES[0]
    );
  };

  const getServiceGroupBadge = (group) => {
    return (
      SERVICE_GROUPS.find((item) => item.value === group) || SERVICE_GROUPS[0]
    );
  };

  const handleGroupCapacityFieldChange = (groupKey, field, value) => {
    const parsedValue = Math.max(1, Number(value) || 1);
    setGroupCapacities((prev) => ({
      ...prev,
      [groupKey]: (() => {
        const nextConfig = {
          ...prev[groupKey],
          [field]: parsedValue,
        };
        nextConfig.roomCount = deriveRoomCountFromConfig(
          nextConfig.maxCapacity,
          nextConfig.slotsPerRoom,
        );
        return nextConfig;
      })(),
    }));
  };

  const handleSaveGroupCapacity = async (groupKey) => {
    try {
      setGroupCapacitySaving(groupKey);
      setGroupCapacityError("");

      const target = groupCapacities[groupKey];
      await updateGroupCapacity(groupKey, {
        maxCapacity: Number(target.maxCapacity),
        slotsPerRoom: Number(target.slotsPerRoom),
      });

      await fetchGroupCapacityConfigs();
      await fetchRooms();
    } catch (err) {
      setGroupCapacityError(
        err?.response?.data?.message || "Không thể cập nhật group capacity",
      );
    } finally {
      setGroupCapacitySaving("");
    }
  };

  const selectedType = ROOM_TYPES.find((type) => type.value === formData.type);
  const isEditMode = modalMode === "edit";
  const modalTitle = isEditMode ? "Edit Room" : "Add New Room";
  const modalSubtitle = isEditMode
    ? "Update room details and availability"
    : "Create a comfortable room for pets";
  const HeaderIcon = isEditMode ? Edit : DoorOpen;

  const getInputClassName = (fieldName) =>
    `w-full h-11 px-3.5 bg-white border rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-2 transition-all placeholder:text-[#2D3436]/35 ${
      fieldErrors[fieldName]
        ? "border-red-300 focus:border-red-400 focus:ring-red-200"
        : "border-[#2D3436]/12 focus:border-[#D97853] focus:ring-[#D97853]/20"
    }`;

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
            Room Management
          </h1>
          <p className="text-sm text-[#2D3436]/60">
            Manage accommodation rooms for pets
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Motion.button
            type="button"
            onClick={() => setShowGroupCapacityModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-11 px-4 rounded-xl border border-[#E4D5CC] bg-white text-[#2D3436] text-sm font-semibold shadow-sm hover:bg-[#FDF8F5] transition-all inline-flex items-center gap-2"
          >
            <Activity size={16} className="text-[#D97853]" /> Group Capacity
          </Motion.button>
          <Motion.button
            onClick={handleCreate}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Add Room
          </Motion.button>
        </div>
      </div>

      {/* Filters */}
      <AdminFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by room number or name..."
        filters={[
          {
            label: "STATUS",
            icon: Activity,
            options: ["All", "Available", "In Use"],
            value:
              activeTab === "all"
                ? "All"
                : activeTab === "available"
                  ? "Available"
                  : "In Use",
            onChange: (opt) =>
              setActiveTab(
                opt === "All"
                  ? "all"
                  : opt === "Available"
                    ? "available"
                    : "unavailable",
              ),
          },
          {
            label: "TYPE",
            icon: Filter,
            options: ["All Types", ...ROOM_TYPES.map((t) => t.label)],
            value: typeFilter
              ? ROOM_TYPES.find((t) => t.value === typeFilter)?.label ||
                "All Types"
              : "All Types",
            onChange: (opt) =>
              setTypeFilter(
                opt === "All Types"
                  ? ""
                  : ROOM_TYPES.find((t) => t.label === opt)?.value || "",
              ),
          },
        ]}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#2D3436]/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#D97853] animate-spin" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#2D3436]/40">
            <DoorOpen size={48} className="mb-3" />
            <p>No rooms found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FDFBF7] border-b border-[#2D3436]/5 text-xs font-bold text-[#2D3436]">
                    <th className="px-6 py-4 whitespace-nowrap">Room</th>
                    <th className="px-6 py-4 whitespace-nowrap">Type</th>
                    <th className="px-6 py-4 whitespace-nowrap">Service Type</th>
                    <th className="px-6 py-4 whitespace-nowrap">Group</th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Capacity
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap">Pet Types</th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Status
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredRooms.map((room, index) => {
                    const typeBadge = getRoomTypeBadge(room.type);
                    const serviceTypeBadge = getServiceTypeBadge(room.serviceType);
                    const serviceGroupBadge = getServiceGroupBadge(room.group);
                    return (
                      <Motion.tr
                        key={room._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-[#2D3436]/5 hover:bg-[#FDFBF7] transition-colors"
                      >
                        {/* Room info */}
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[#2D3436]">
                            {room.roomNumber}
                          </p>
                          <p className="text-sm text-[#2D3436]/60">
                            {room.name}
                          </p>
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${typeBadge.color}`}
                          >
                            {typeBadge.label}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${serviceTypeBadge.color}`}
                          >
                            {serviceTypeBadge.label}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {room.serviceType === "service" ? (
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${serviceGroupBadge.color}`}
                            >
                              {serviceGroupBadge.label}
                            </span>
                          ) : (
                            <span className="text-xs text-[#2D3436]/35">-</span>
                          )}
                        </td>

                        {/* Capacity */}
                        <td className="px-6 py-4 text-center">
                          <span className="font-medium text-[#2D3436]">
                            {room.capacity}
                          </span>
                        </td>

                        {/* Pet types */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {room.petTypes?.slice(0, 2).map((pet) => (
                              <span
                                key={pet}
                                className="inline-flex items-center px-2 py-0.5 bg-[#F8F9FA] rounded text-xs text-[#2D3436]/70"
                              >
                                {PET_TYPES.find((p) => p.value === pet)
                                  ?.label || pet}
                              </span>
                            ))}
                            {room.petTypes?.length > 2 && (
                              <span className="text-xs text-[#2D3436]/40">
                                +{room.petTypes.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                              room.isAvailable
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {room.isAvailable ? "Available" : "In Use"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3 text-[#2D3436]/45">
                            <button
                              onClick={() => handleEdit(room)}
                              className="transition hover:text-[#D97853]"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setRoomToDelete(room);
                                setShowDeleteModal(true);
                              }}
                              className="transition hover:text-red-500"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </Motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showGroupCapacityModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4"
            onClick={() => setShowGroupCapacityModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[780px] bg-[#FFFEFD] rounded-[22px] border border-[#EEDFD5] shadow-[0_28px_68px_rgba(17,24,39,0.28)] overflow-hidden"
            >
              <div className="px-5 md:px-6 py-4 border-b border-[#EFE2DA] bg-white flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[31px] font-extrabold text-[#1F2933] leading-tight">
                    Group Capacity
                  </h3>
                  <p className="text-[13px] text-[#2D3436]/55 font-medium mt-1">
                    Configure max concurrent pets by service group (Wet / Dry)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroupCapacityModal(false)}
                  className="p-2 rounded-xl text-[#7C6A6F] hover:text-[#2D3436] hover:bg-[#F7F3F0]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 md:p-6">
                {groupCapacityError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">
                    {groupCapacityError}
                  </div>
                )}

                {groupCapacityLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[#2D3436]/55 py-8">
                    <Loader2 size={16} className="animate-spin" /> Loading group capacity...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(["wet", "dry"]).map((groupKey) => {
                      const config = groupCapacities[groupKey];
                      const isWet = groupKey === "wet";

                      return (
                        <div
                          key={groupKey}
                          className={`rounded-2xl border p-3.5 ${
                            isWet
                              ? "border-[#BFD9F2] bg-[#F3F8FF]"
                              : "border-[#F1D7BB] bg-[#FFF8EE]"
                          }`}
                        >
                          <div className="rounded-xl bg-white/70 px-3 py-2 border border-white/80 flex items-start gap-2.5 mb-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isWet ? "bg-[#DDEBFA] text-[#2B6FA3]" : "bg-[#FFE9CC] text-[#D77A28]"}`}>
                              {isWet ? <Waves size={14} /> : <Wind size={14} />}
                            </div>
                            <div>
                              <p className="text-[27px] leading-none font-black text-[#2D3436]">
                                {isWet ? "Wet Group" : "Dry Group"}
                              </p>
                              <p className="text-xs text-[#2D3436]/55">Active: Yes</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-[#2D3436]/75 mb-1">
                                Max Capacity
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={config?.maxCapacity ?? 1}
                                onChange={(e) =>
                                  handleGroupCapacityFieldChange(
                                    groupKey,
                                    "maxCapacity",
                                    e.target.value,
                                  )
                                }
                                className="w-full h-9 px-3 border border-[#2D3436]/12 rounded-xl text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#2D3436]/75 mb-1">
                                Room Count
                              </label>
                              <input
                                type="number"
                                value={config?.roomCount ?? 1}
                                disabled
                                className="w-full h-9 px-3 border border-[#2D3436]/10 rounded-xl text-sm bg-[#F5F6F8] text-[#2D3436]/60"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#2D3436]/75 mb-1">
                                Slots/Room
                              </label>
                              <input
                                type="number"
                                  min="1"
                                  max="20"
                                value={config?.slotsPerRoom ?? 1}
                                  onChange={(e) =>
                                    handleGroupCapacityFieldChange(
                                      groupKey,
                                      "slotsPerRoom",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full h-9 px-3 border border-[#2D3436]/12 rounded-xl text-sm bg-white"
                              />
                            </div>
                          </div>

                          <p className="text-[11px] text-[#2D3436]/48 mt-2.5 mb-2">
                              Note: Room Count is auto-calculated = ceil(Max Capacity / Slots per room).
                          </p>

                          <button
                            type="button"
                            onClick={() => handleSaveGroupCapacity(groupKey)}
                            disabled={groupCapacitySaving === groupKey}
                            className="h-9 px-3.5 rounded-xl bg-[#E19A79] text-white text-sm font-bold hover:bg-[#D88660] disabled:opacity-60 inline-flex items-center gap-1.5"
                          >
                            {groupCapacitySaving === groupKey ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={13} />
                            )}
                            Save
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Motion.div>
          </Motion.div>
        )}

        {showModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeRoomModal}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[760px] rounded-[28px] border border-[#EFDCD2] bg-[#FFFDFC] shadow-[0_24px_70px_rgba(45,52,54,0.22)] md:max-h-none md:overflow-visible max-h-[92vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Modal header */}
              <div className="sticky md:static top-0 z-30 flex items-start justify-between gap-4 px-5 md:px-6 py-4 border-b border-[#EFDCD2] bg-gradient-to-r from-[#FFF1E8] via-[#FFF7F1] to-[#FFFCFA] rounded-t-[28px]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 shrink-0 rounded-2xl bg-white/85 border border-[#F4D6C7] shadow-sm flex items-center justify-center">
                    <HeaderIcon className="w-5 h-5 text-[#D97853]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[28px] leading-[1.1] font-extrabold tracking-[-0.01em] text-[#22303A]">
                      {modalTitle}
                    </h2>
                    <p className="text-[13px] font-medium text-[#A97863] mt-1 truncate">
                      {modalSubtitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeRoomModal}
                  className="shrink-0 p-2.5 rounded-xl text-[#7A8084] hover:text-[#2D3436] hover:bg-white/90 transition-colors"
                  aria-label="Close room modal"
                >
                  <X size={20} className="text-[#2D3436]/60" />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                noValidate
                className="px-5 md:px-6 pt-4 pb-5 space-y-3.5"
              >
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-500 mt-0.5" />
                    <p className="text-sm font-medium text-red-700">
                      {formError}
                    </p>
                  </div>
                )}

                {/* Room number & Name */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5 tracking-[0.01em]">
                      Room Number <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.roomNumber}
                      onChange={(e) =>
                        updateFormField("roomNumber", e.target.value)
                      }
                      placeholder="P001"
                      className={getInputClassName("roomNumber")}
                    />
                    {fieldErrors.roomNumber && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {fieldErrors.roomNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5 tracking-[0.01em]">
                      Room Name <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormField("name", e.target.value)}
                      className={getInputClassName("name")}
                      placeholder="Sunny Room"
                    />
                    {fieldErrors.name && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Room Type */}
                  <div className={`relative ${isTypeOpen ? "z-[70]" : "z-10"}`}>
                    <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5 tracking-[0.01em]">
                      Room Type <span className="text-[#D97853]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTypeOpen((prev) => !prev)}
                      className={`w-full h-11 px-3.5 border rounded-2xl bg-white text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.type
                          ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                          : "border-[#2D3436]/12 focus:border-[#D97853] focus:ring-[#D97853]/20"
                      }`}
                      aria-haspopup="listbox"
                      aria-expanded={isTypeOpen}
                    >
                      <span className="text-sm font-medium text-[#2D3436] truncate">
                        {selectedType?.label || "Select room type"}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-[#D97853] transition-transform ${
                          isTypeOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isTypeOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(event) => {
                              event.stopPropagation();
                              setIsTypeOpen(false);
                            }}
                          />
                          <Motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#FDFBF7] rounded-[16px] shadow-[0_12px_30px_rgba(45,52,54,0.12)] border border-[#2D3436]/5 overflow-hidden z-50 py-1.5"
                            role="listbox"
                          >
                            {ROOM_TYPES.map((type) => {
                              const isSelected = formData.type === type.value;
                              return (
                                <button
                                  key={type.value}
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    updateFormField("type", type.value);
                                    setIsTypeOpen(false);
                                  }}
                                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                                    isSelected
                                      ? "border-l-[3px] border-[#D97853] bg-[#D97853]/10 text-[#D97853] font-bold"
                                      : "text-[#2D3436]/70 hover:bg-[#2D3436]/5 font-medium"
                                  }`}
                                  role="option"
                                  aria-selected={isSelected}
                                >
                                  {type.label}
                                </button>
                              );
                            })}
                          </Motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    {fieldErrors.type && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {fieldErrors.type}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5 tracking-[0.01em]">
                      Service Type <span className="text-[#D97853]">*</span>
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => {
                        const nextServiceType = e.target.value;
                        updateFormField("serviceType", nextServiceType);
                        if (nextServiceType !== "service") {
                          updateFormField("group", "");
                        }
                      }}
                      className={getInputClassName("serviceType")}
                    >
                      {SERVICE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.serviceType && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {fieldErrors.serviceType}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5 tracking-[0.01em]">
                      Group {formData.serviceType === "service" && <span className="text-[#D97853]">*</span>}
                    </label>
                    <select
                      value={formData.group}
                      disabled={formData.serviceType !== "service"}
                      onChange={(e) => updateFormField("group", e.target.value)}
                      className={getInputClassName("group")}
                    >
                      <option value="">None</option>
                      {SERVICE_GROUPS.map((group) => (
                        <option key={group.value} value={group.value}>
                          {group.label}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.group && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {fieldErrors.group}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5 tracking-[0.01em]">
                      Capacity <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) =>
                        updateFormField("capacity", e.target.value)
                      }
                      className={getInputClassName("capacity")}
                    />
                    {fieldErrors.capacity && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {fieldErrors.capacity}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5 tracking-[0.01em]">
                      Price / Night <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.pricePerNight}
                      onChange={(e) =>
                        updateFormField("pricePerNight", e.target.value)
                      }
                      step="0.01"
                      className={getInputClassName("pricePerNight")}
                      placeholder="10"
                    />
                    {fieldErrors.pricePerNight && (
                      <p className="mt-1.5 text-xs font-medium text-red-600">
                        {fieldErrors.pricePerNight}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pet types */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5 tracking-[0.01em]">
                    Pet Type <span className="text-[#D97853]">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PET_TYPES.map((pet) => (
                      <button
                        key={pet.value}
                        type="button"
                        onClick={() => {
                          const newPets = formData.petTypes.includes(pet.value)
                            ? formData.petTypes.filter((p) => p !== pet.value)
                            : [...formData.petTypes, pet.value];
                          updateFormField("petTypes", newPets);
                        }}
                        className={`h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl border text-sm font-semibold transition-colors ${
                          formData.petTypes.includes(pet.value)
                            ? "bg-[#D97853] border-[#D97853] text-white shadow-[0_8px_20px_rgba(217,120,83,0.22)]"
                            : "bg-[#F7F8FA] border-[#EDF0F2] text-[#5E656A] hover:bg-[#EEF1F5]"
                        }`}
                      >
                        <PawPrint size={14} className="shrink-0" />
                        {pet.label}
                      </button>
                    ))}
                  </div>
                  {fieldErrors.petTypes && (
                    <p className="mt-1.5 text-xs font-medium text-red-600">
                      {fieldErrors.petTypes}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#2D3436] mb-1.5 tracking-[0.01em]">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) =>
                      updateFormField("description", e.target.value)
                    }
                    placeholder="Detailed description of the room..."
                    className="w-full min-h-[88px] px-3.5 py-2.5 bg-white border border-[#2D3436]/12 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:text-[#2D3436]/35 resize-none"
                  />
                </div>

                {/* Status toggles */}
                {modalMode === "edit" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.isAvailable}
                      onClick={() =>
                        updateFormField("isAvailable", !formData.isAvailable)
                      }
                      className={`h-11 px-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                        formData.isAvailable
                          ? "bg-[#FFF4ED] border-[#F5CCB9]"
                          : "bg-white border-[#E6EAED] hover:bg-[#F8FAFB]"
                      }`}
                    >
                      <span
                        className={`text-sm font-semibold ${
                          formData.isAvailable
                            ? "text-[#AF6242]"
                            : "text-[#4F575D]"
                        }`}
                      >
                        Available for booking
                      </span>
                      <span
                        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                          formData.isAvailable ? "bg-[#D97853]" : "bg-[#D0D6DB]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            formData.isAvailable ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                    </button>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.isActive}
                      onClick={() =>
                        updateFormField("isActive", !formData.isActive)
                      }
                      className={`h-11 px-3.5 rounded-2xl border flex items-center justify-between transition-all ${
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
                        Active
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
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-1.5">
                  <button
                    type="button"
                    onClick={closeRoomModal}
                    className="h-11 px-5 text-sm font-semibold text-[#5D656B] hover:bg-[#F2F5F7] rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="h-11 min-w-[124px] inline-flex items-center justify-center gap-2 px-5 bg-[#D97853] text-white text-sm font-bold rounded-xl hover:bg-[#C66A47] active:scale-[0.99] shadow-[0_10px_24px_rgba(217,120,83,0.28)] transition-all disabled:opacity-50"
                  >
                    {formLoading ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Check size={17} />
                    )}
                    {modalMode === "create" ? "Create" : "Update"}
                  </button>
                </div>
              </form>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && roomToDelete && (
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
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[560px] bg-[#FFFEFD] rounded-[26px] border border-[#F3DDE0] shadow-[0_24px_60px_rgba(17,24,39,0.35)] overflow-hidden"
            >
              <div className="px-6 py-5 bg-gradient-to-r from-white via-[#FFF9F9] to-[#FFF1F3] border-b border-[#F3E3E6] flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#FDEDEE] border border-[#F8D4D8] shadow-sm flex items-center justify-center shrink-0">
                    <Trash2 size={19} className="text-[#D73A4F]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[24px] leading-[1.1] font-extrabold tracking-[-0.01em] text-[#1F2933]">
                      Delete Room
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[#7A6368]">
                      This deletion is permanent and cannot be reverted.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-2 rounded-xl text-[#7C6A6F] hover:text-[#2D3436] hover:bg-white/90 transition-colors"
                  aria-label="Close delete room modal"
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
                      The room and related data will be permanently removed.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-2xl">
                  <div className="w-11 h-11 rounded-full bg-[#FDEDEE] border border-[#F7D0D5] flex items-center justify-center shrink-0">
                    <DoorOpen size={18} className="text-[#CA3248]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold text-[#1F2933] truncate leading-tight">
                      {roomToDelete.roomNumber}
                    </p>
                    <p className="text-sm font-medium text-[#66727F] truncate mt-0.5">
                      {roomToDelete.name}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-[#FFF0EA] text-[#B66342] border-[#F5D5C8]">
                    {getRoomTypeBadge(roomToDelete.type).label}
                  </span>
                </div>

                <p className="text-sm text-[#5E6B75] leading-relaxed">
                  You are about to permanently delete room{" "}
                  <span className="font-semibold text-[#1F2933]">
                    {roomToDelete.roomNumber} - {roomToDelete.name}
                  </span>
                  . Hành động này không thể hoàn tác.
                </p>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="h-11 px-5 border border-[#D8E0E7] bg-white text-[#435261] text-sm font-semibold rounded-2xl hover:bg-[#F4F7FA] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={formLoading}
                    className={`h-11 min-w-[156px] px-5 text-sm font-semibold rounded-2xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      formLoading
                        ? "bg-[#F3C1C9] text-white/90 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-[#E15065] to-[#C92E46] text-white hover:brightness-105 shadow-[0_10px_24px_rgba(201,46,70,0.35)]"
                    }`}
                  >
                    {formLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
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
};

export default RoomManagement;
