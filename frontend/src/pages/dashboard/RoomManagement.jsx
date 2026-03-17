import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useScrollLock from '../../hooks/useScrollLock';
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
  MoreVertical,
  Loader2,
  CheckCircle2,
  Settings,
  Droplets,
  Wind,
  Save,
  RotateCcw,
} from "lucide-react";
import AdminFilterBar from "../../components/dashboard/AdminFilterBar";
import { getRoomsList, createRoom, updateRoom, deleteRoom } from "../../api/roomApi";
import {
  getGroupCapacities,
  initGroupCapacities,
  updateGroupCapacity,
} from "../../api/groupCapacityApi";
import { getErrorMessage } from "../../utils/apiResponseHandler";

// Room types
const ROOM_TYPES = [
  { value: "standard", label: "Standard", color: "bg-gray-100 text-gray-700" },
  { value: "deluxe", label: "Deluxe", color: "bg-blue-100 text-blue-700" },
  { value: "suite", label: "Suite", color: "bg-purple-100 text-purple-700" },
  { value: "vip", label: "VIP", color: "bg-amber-100 text-amber-700" },
];

// Service type options
const SERVICE_TYPES = [
  { value: "boarding", label: "Boarding", color: "bg-indigo-100 text-indigo-700" },
  { value: "service", label: "Grooming/Service", color: "bg-teal-100 text-teal-700" },
];

// Group options (wet/dry – only for service rooms)
const GROUP_OPTIONS = [
  { value: "", label: "None" },
  { value: "wet", label: "Wet", color: "bg-blue-100 text-blue-700" },
  { value: "dry", label: "Dry", color: "bg-orange-100 text-orange-700" },
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

const CAPACITY_GROUP_META = {
  wet: {
    label: "Wet Group",
    icon: Droplets,
    border: "border-blue-200",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  dry: {
    label: "Dry Group",
    icon: Wind,
    border: "border-orange-200",
    bg: "bg-orange-50",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
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
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [capacityConfigs, setCapacityConfigs] = useState([]);
  const [capacityEdits, setCapacityEdits] = useState({});
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [capacityError, setCapacityError] = useState(null);
  const [capacitySaving, setCapacitySaving] = useState({});
  useScrollLock(showModal || showDeleteModal || showCapacityModal);
  
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
    setFormError(null);
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
    setFormError(null);
    setShowModal(true);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const roomNumber = String(formData.roomNumber || "").trim();
      const roomName = String(formData.name || "").trim();
      const capacity = Number(formData.capacity);
      const pricePerNight = Number(formData.pricePerNight);

      if (!roomNumber) {
        setFormError("Room Number là bắt buộc");
        return;
      }
      if (!roomName) {
        setFormError("Room Name là bắt buộc");
        return;
      }
      if (!Number.isFinite(capacity) || capacity < 1) {
        setFormError("Capacity phải lớn hơn hoặc bằng 1");
        return;
      }
      if (!Number.isFinite(pricePerNight) || pricePerNight < 0) {
        setFormError("Giá/đêm phải lớn hơn hoặc bằng 0");
        return;
      }
      if (formData.serviceType === "service" && !String(formData.group || "").trim()) {
        setFormError("Service room bắt buộc chọn Group (Wet hoặc Dry)");
        return;
      }

      const submitData = {
        ...formData,
        roomNumber,
        name: roomName,
        capacity,
        pricePerNight,
      };

      if (modalMode === "create") {
        await createRoom(submitData);
      } else {
        await updateRoom(selectedRoom._id, submitData);
      }

      setShowModal(false);
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

  // Toggle availability
  const handleToggleAvailability = async (room) => {
    try {
      await updateRoom(room._id, { isAvailable: !room.isAvailable });
      fetchRooms();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  // Get room type badge
  const getRoomTypeBadge = (type) => {
    const roomType = ROOM_TYPES.find((t) => t.value === type);
    return roomType || ROOM_TYPES[0];
  };

  const fetchCapacityConfigs = useCallback(async () => {
    setCapacityLoading(true);
    setCapacityError(null);
    try {
      const res = await getGroupCapacities();
      const list = Array.isArray(res?.data?.configs)
        ? res.data.configs
        : Array.isArray(res?.configs)
          ? res.configs
          : [];

      setCapacityConfigs(list);
      const initialEdits = {};
      list.forEach((cfg) => {
        initialEdits[cfg.group] = {
          maxCapacity: cfg.maxCapacity,
          roomCount: cfg.roomCount,
          slotsPerRoom: cfg.slotsPerRoom,
        };
      });
      setCapacityEdits(initialEdits);
    } catch (err) {
      setCapacityError(err?.response?.data?.message || "Failed to load capacity configs");
      setCapacityConfigs([]);
    } finally {
      setCapacityLoading(false);
    }
  }, []);

  const openCapacityModal = async () => {
    setShowCapacityModal(true);
    await fetchCapacityConfigs();
  };

  const handleInitCapacityConfigs = async () => {
    try {
      await initGroupCapacities();
      await fetchCapacityConfigs();
    } catch (err) {
      setCapacityError(err?.response?.data?.message || "Failed to initialize default configs");
    }
  };

  const isCapacityDirty = (group) => {
    const cfg = capacityConfigs.find((item) => item.group === group);
    const edit = capacityEdits[group];
    if (!cfg || !edit) return false;

    return (
      Number(edit.maxCapacity) !== Number(cfg.maxCapacity) ||
      Number(edit.roomCount) !== Number(cfg.roomCount) ||
      Number(edit.slotsPerRoom) !== Number(cfg.slotsPerRoom)
    );
  };

  const handleResetCapacityGroup = (group) => {
    const cfg = capacityConfigs.find((item) => item.group === group);
    if (!cfg) return;

    setCapacityEdits((prev) => ({
      ...prev,
      [group]: {
        maxCapacity: cfg.maxCapacity,
        roomCount: cfg.roomCount,
        slotsPerRoom: cfg.slotsPerRoom,
      },
    }));
  };

  const handleSaveCapacityGroup = async (group) => {
    const edit = capacityEdits[group];
    if (!edit) return;

    const maxCapacity = Number(edit.maxCapacity);
    const roomCount = Number(edit.roomCount);
    const slotsPerRoom = Number(edit.slotsPerRoom);

    if (!maxCapacity || maxCapacity < 1 || maxCapacity > 20) {
      setCapacityError("Max capacity must be between 1 and 20");
      return;
    }
    if (!roomCount || roomCount < 1) {
      setCapacityError("Room count must be at least 1");
      return;
    }
    if (!slotsPerRoom || slotsPerRoom < 1) {
      setCapacityError("Slots per room must be at least 1");
      return;
    }

    setCapacitySaving((prev) => ({ ...prev, [group]: true }));
    setCapacityError(null);
    try {
      await updateGroupCapacity(group, { maxCapacity, roomCount, slotsPerRoom });
      await fetchCapacityConfigs();
    } catch (err) {
      setCapacityError(err?.response?.data?.message || "Failed to save capacity config");
    } finally {
      setCapacitySaving((prev) => ({ ...prev, [group]: false }));
    }
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
            Room Management
          </h1>
          <p className="text-sm text-[#2D3436]/60">
            Manage accommodation rooms for pets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={openCapacityModal}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white text-[#2D3436] px-4 py-2.5 rounded-xl font-bold text-sm border border-[#2D3436]/10 hover:bg-[#F8F9FA] transition-all flex items-center gap-2 shrink-0"
          >
            <Settings size={16} /> Group Capacity
          </motion.button>

          <motion.button
            onClick={handleCreate}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 shrink-0"
          >
            <Plus size={18} /> Add Room
          </motion.button>
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
            value: typeFilter ? ROOM_TYPES.find((t) => t.value === typeFilter)?.label || "All Types" : "All Types",
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
                    <th className="px-6 py-4 whitespace-nowrap">
                      Room
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap">
                      Type
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap">
                      Service Type
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap">
                      Group
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">
                      Capacity
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap">
                      Pet Types
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
                  {filteredRooms.map((room, index) => {
                    const typeBadge = getRoomTypeBadge(room.type);
                    return (
                      <motion.tr
                        key={room._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-[#2D3436]/5 hover:bg-[#FDFBF7] transition-colors"
                      >
                        {/* Room info */}
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[#2D3436]">{room.roomNumber}</p>
                          <p className="text-sm text-[#2D3436]/60">{room.name}</p>
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${typeBadge.color}`}
                          >
                            {typeBadge.label}
                          </span>
                        </td>

                        {/* Service Type */}
                        <td className="px-6 py-4">
                          {(() => {
                            const st = SERVICE_TYPES.find(s => s.value === room.serviceType);
                            return st ? (
                              <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${st.color}`}>{st.label}</span>
                            ) : <span className="text-[#2D3436]/30 text-xs">—</span>;
                          })()}
                        </td>

                        {/* Group */}
                        <td className="px-6 py-4">
                          {room.group ? (
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                              room.group === 'wet' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {room.group === 'wet' ? 'Wet' : 'Dry'}
                            </span>
                          ) : (
                            <span className="text-[#2D3436]/30 text-xs">—</span>
                          )}
                        </td>

                        {/* Capacity */}
                        <td className="px-6 py-4 text-center">
                          <span className="font-medium text-[#2D3436]">{room.capacity}</span>
                        </td>

                        {/* Pet types */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {room.petTypes?.slice(0, 2).map((pet) => (
                              <span
                                key={pet}
                                className="inline-flex items-center px-2 py-0.5 bg-[#F8F9FA] rounded text-xs text-[#2D3436]/70"
                              >
                                {PET_TYPES.find((p) => p.value === pet)?.label || pet}
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
                      </motion.tr>
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
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-6 border-b border-[#2D3436]/5">
                <h2 className="text-xl font-bold text-[#2D3436]">
                  {modalMode === "create" ? "Add New Room" : "Edit Room"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-[#F8F9FA] rounded-lg transition-colors"
                >
                  <X size={20} className="text-[#2D3436]/60" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" />
                    <p className="text-sm text-red-700">{formError}</p>
                  </div>
                )}

                {/* Room number & Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Room Number <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.roomNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, roomNumber: e.target.value })
                      }
                      placeholder="P001"
                      className="w-full px-3 py-2 border border-[#2D3436]/10 rounded-lg focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                      Room Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                      placeholder="Sunny Room"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Room Type */}
                  <div className="relative">
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Room Type <span className="text-[#D97853]">*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#2D3436]/10 rounded-lg focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853]"
                    >
                      {ROOM_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Capacity <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData({ ...formData, capacity: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#2D3436]/10 rounded-lg focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Price / Night <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.pricePerNight}
                      onChange={(e) =>
                        setFormData({ ...formData, pricePerNight: e.target.value })
                      }
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                      placeholder="10"
                    />
                  </div>
                </div>

                {/* Service Type + Group */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Service Type <span className="text-[#D97853]">*</span>
                    </label>
                    <select
                      required
                      value={formData.serviceType}
                      onChange={(e) =>
                        setFormData({ ...formData, serviceType: e.target.value, group: e.target.value === 'boarding' ? '' : formData.group })
                      }
                      className="w-full px-3 py-2 border border-[#2D3436]/10 rounded-lg focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853]"
                    >
                      {SERVICE_TYPES.map((st) => (
                        <option key={st.value} value={st.value}>{st.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Group
                      {formData.serviceType === 'service' && (
                        <span className="ml-1 text-xs font-normal text-[#2D3436]/50">(Wet/Dry for service rooms)</span>
                      )}
                    </label>
                    <select
                      value={formData.group}
                      disabled={formData.serviceType === 'boarding'}
                      onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                      className="w-full px-3 py-2 border border-[#2D3436]/10 rounded-lg focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {GROUP_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pet types */}
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                    Pet Type
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
                          setFormData({ ...formData, petTypes: newPets });
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          formData.petTypes.includes(pet.value)
                            ? "bg-[#D97853] text-white"
                            : "bg-[#F8F9FA] text-[#2D3436]/70 hover:bg-[#2D3436]/10"
                        }`}
                      >
                        <PawPrint size={14} />
                        {pet.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Detailed description of the room..."
                    className="w-full px-3 py-2 border border-[#2D3436]/10 rounded-lg focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853] resize-none"
                  />
                </div>

                {/* Status toggles */}
                {modalMode === "edit" && (
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-3 bg-white border border-[#2D3436]/10 rounded-2xl p-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isAvailable}
                        onChange={(e) =>
                          setFormData({ ...formData, isAvailable: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-[#2D3436]/20 text-[#D97853] focus:ring-[#D97853]/20"
                      />
                      <span className="text-sm text-[#2D3436]">Available for booking</span>
                    </label>
                    <label className="flex items-center gap-3 bg-white border border-[#2D3436]/10 rounded-2xl p-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({ ...formData, isActive: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-[#2D3436]/20 text-[#D97853] focus:ring-[#D97853]/20"
                      />
                      <span className="text-sm text-[#2D3436]">Active</span>
                    </label>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-[#2D3436]/70 hover:bg-[#F8F9FA] rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#D97853] text-white rounded-lg hover:bg-[#C26843] transition-colors disabled:opacity-50"
                  >
                    {formLoading ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                    {modalMode === "create" ? "Create" : "Update"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Capacity Modal */}
      <AnimatePresence>
        {showCapacityModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCapacityModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#2D3436]/5">
                <div>
                  <h2 className="text-xl font-bold text-[#2D3436]">Group Capacity</h2>
                  <p className="text-sm text-[#2D3436]/60 mt-0.5">
                    Configure max concurrent pets by service group (Wet / Dry)
                  </p>
                </div>
                <button
                  onClick={() => setShowCapacityModal(false)}
                  className="p-2 hover:bg-[#F8F9FA] rounded-lg transition-colors"
                >
                  <X size={20} className="text-[#2D3436]/60" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {capacityError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" />
                    <p className="text-sm text-red-700">{capacityError}</p>
                  </div>
                )}

                {capacityLoading ? (
                  <div className="flex items-center justify-center py-14">
                    <RefreshCw className="w-8 h-8 text-[#D97853] animate-spin" />
                  </div>
                ) : capacityConfigs.length === 0 ? (
                  <div className="border border-[#2D3436]/10 rounded-xl p-6 text-center space-y-3">
                    <p className="text-[#2D3436]/70">No group capacity configuration found</p>
                    <button
                      onClick={handleInitCapacityConfigs}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#D97853] text-white rounded-lg hover:bg-[#C26843] transition-colors"
                    >
                      <Settings size={16} /> Initialize Defaults (Wet=6, Dry=6)
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(["wet", "dry"]).map((group) => {
                      const config = capacityConfigs.find((item) => item.group === group);
                      const edit = capacityEdits[group] || {};
                      const meta = CAPACITY_GROUP_META[group];
                      if (!config || !meta) return null;

                      const Icon = meta.icon;
                      const dirty = isCapacityDirty(group);
                      const saving = capacitySaving[group];

                      return (
                        <div key={group} className={`rounded-xl border ${meta.border} overflow-hidden`}>
                          <div className={`px-4 py-3 border-b ${meta.border} ${meta.bg} flex items-center gap-3`}>
                            <div className={`w-9 h-9 rounded-lg ${meta.iconBg} flex items-center justify-center`}>
                              <Icon size={18} className={meta.iconColor} />
                            </div>
                            <div>
                              <p className="font-semibold text-[#2D3436]">{meta.label}</p>
                              <p className="text-xs text-[#2D3436]/55">
                                Active: {config.isActive ? "Yes" : "No"}
                              </p>
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            <div>
                              <label className="block text-xs font-bold text-[#2D3436] mb-1.5">Max Capacity</label>
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={edit.maxCapacity ?? ""}
                                onChange={(e) =>
                                  setCapacityEdits((prev) => ({
                                    ...prev,
                                    [group]: { ...prev[group], maxCapacity: e.target.value },
                                  }))
                                }
                                className="w-full px-3 py-2 border border-[#2D3436]/10 rounded-lg focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853]"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-bold text-[#2D3436] mb-1.5">Room Count</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={edit.roomCount ?? ""}
                                  onChange={(e) =>
                                    setCapacityEdits((prev) => ({
                                      ...prev,
                                      [group]: { ...prev[group], roomCount: e.target.value },
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-[#2D3436]/10 rounded-lg focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-[#2D3436] mb-1.5">Slots/Room</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={edit.slotsPerRoom ?? ""}
                                  onChange={(e) =>
                                    setCapacityEdits((prev) => ({
                                      ...prev,
                                      [group]: { ...prev[group], slotsPerRoom: e.target.value },
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-[#2D3436]/10 rounded-lg focus:ring-2 focus:ring-[#D97853]/20 focus:border-[#D97853]"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleSaveCapacityGroup(group)}
                                disabled={!dirty || saving}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-[#D97853] text-white rounded-lg hover:bg-[#C26843] transition-colors text-sm disabled:opacity-50"
                              >
                                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                Save
                              </button>
                              {dirty && (
                                <button
                                  onClick={() => handleResetCapacityGroup(group)}
                                  className="inline-flex items-center gap-2 px-3 py-2 border border-[#2D3436]/10 rounded-lg text-sm text-[#2D3436]/70 hover:bg-[#F8F9FA]"
                                >
                                  <RotateCcw size={14} /> Reset
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && roomToDelete && (
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
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-[#2D3436]">Delete Room</h3>
              </div>

              <p className="text-[#2D3436]/70 mb-6">
                Are you sure you want to delete room{" "}
                <span className="font-semibold text-[#2D3436]">
                  {roomToDelete.roomNumber} - {roomToDelete.name}
                </span>
                ? Hành động này không thể hoàn tác.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-[#2D3436]/70 hover:bg-[#F8F9FA] rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={formLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {formLoading ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RoomManagement;
