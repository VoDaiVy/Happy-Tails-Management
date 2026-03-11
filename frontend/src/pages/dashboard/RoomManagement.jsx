import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Loader2,
  CheckCircle2,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import {
  getRoomsList,
  createRoom,
  updateRoom,
  deleteRoom,
} from "../../api/roomApi";
import AdminFilterBar from "../../components/dashboard/AdminFilterBar";

// Room types
const ROOM_TYPES = [
  { value: "standard", label: "Standard", color: "bg-gray-100 text-gray-700" },
  { value: "deluxe", label: "Deluxe", color: "bg-blue-100 text-blue-700" },
  { value: "suite", label: "Suite", color: "bg-purple-100 text-purple-700" },
  { value: "vip", label: "VIP", color: "bg-amber-100 text-amber-700" },
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

  // Form state
  const [formData, setFormData] = useState({
    roomNumber: "",
    name: "",
    type: "standard",
    capacity: 1,
    amenities: [],
    petTypes: ["dog", "cat"],
    description: "",
    isAvailable: true,
    isActive: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isRoomTypeOpen, setIsRoomTypeOpen] = useState(false);

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (activeTab === "available") params.isAvailable = "true";
      if (activeTab === "unavailable") params.isAvailable = "false";
      if (typeFilter) params.type = typeFilter;
      params.isActive = "all";

      const response = await getRoomsList(params);
      setRooms(response.data || []);
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
      capacity: 1,
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
      capacity: room.capacity || 1,
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
      const submitData = {
        ...formData,
        capacity: Number(formData.capacity),
      };

      if (modalMode === "create") {
        await createRoom(submitData);
      } else {
        await updateRoom(selectedRoom._id, submitData);
      }

      setShowModal(false);
      fetchRooms();
    } catch (err) {
      setFormError(err.response?.data?.message || "Có lỗi xảy ra");
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
      setFormError(err.response?.data?.message || "Cannot delete room");
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
        <motion.button
          onClick={handleCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-[#D97853] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all flex items-center gap-2 shrink-0"
        >
          <Plus size={18} /> Add Room
        </motion.button>
      </div>

      {/* Filters */}
      <AdminFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by room number, name..."
        filters={[
          {
            label: "AVAILABILITY",
            icon: DoorOpen,
            options: ["All Rooms", "Available", "In Use"],
            value:
              activeTab === "all"
                ? "All Rooms"
                : activeTab === "available"
                  ? "Available"
                  : "In Use",
            onChange: (opt) =>
              setActiveTab(
                opt === "All Rooms"
                  ? "all"
                  : opt === "Available"
                    ? "available"
                    : "unavailable",
              ),
          },
          {
            label: "TYPE",
            icon: Activity,
            options: ["All Types", "Standard", "Deluxe", "Suite", "VIP"],
            value:
              typeFilter === ""
                ? "All Types"
                : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1),
            onChange: (opt) =>
              setTypeFilter(opt === "All Types" ? "" : opt.toLowerCase()),
          },
        ]}
        extraActions={
          <button
            onClick={fetchRooms}
            disabled={loading}
            className="p-2.5 text-[#2D3436]/60 hover:text-[#D97853] hover:bg-[#D97853]/10 rounded-xl border border-[#2D3436]/10 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#2D3436]/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#D97853]/20 border-b-2 border-b-[#D97853] rounded-full animate-spin" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-[#FDFBF7] rounded-full flex items-center justify-center mb-4">
              <DoorOpen size={32} className="text-[#D97853]" />
            </div>
            <p className="text-lg font-bold text-[#2D3436]">No rooms found</p>
            <p className="text-sm font-medium text-[#2D3436]/60 mt-1">Try adjusting filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#FDFBF7] border-b border-[#2D3436]/5">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#2D3436] uppercase tracking-wider">
                  Room
                </th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#2D3436] uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#2D3436] uppercase tracking-wider">
                  Capacity
                </th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#2D3436] uppercase tracking-wider">
                  Pet Type
                </th>
                <th className="text-center px-6 py-4 text-xs font-bold text-[#2D3436] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-4 text-xs font-bold text-[#2D3436] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room, idx) => {
                const typeBadge = getRoomTypeBadge(room.type);
                return (
                  <motion.tr
                    key={room._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.03 }}
                    className="border-b border-[#2D3436]/5 hover:bg-[#FDFBF7] transition-colors"
                  >
                    {/* Room info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#D97853]/10 rounded-lg flex items-center justify-center">
                          <DoorOpen className="w-5 h-5 text-[#D97853]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#2D3436]">
                            {room.roomNumber}
                          </p>
                          <p className="text-sm text-[#2D3436]/60">
                            {room.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${typeBadge.color}`}
                      >
                        {typeBadge.label}
                      </span>
                    </td>

                    {/* Capacity */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[#2D3436]">
                        <Users size={16} className="text-[#2D3436]/40" />
                        <span>{room.capacity}</span>
                      </div>
                    </td>

                    {/* Pet types */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {room.petTypes?.slice(0, 3).map((pet) => (
                          <span
                            key={pet}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F8F9FA] rounded text-xs text-[#2D3436]/70"
                          >
                            <PawPrint size={10} />
                            {PET_TYPES.find((p) => p.value === pet)?.label ||
                              pet}
                          </span>
                        ))}
                        {room.petTypes?.length > 3 && (
                          <span className="text-xs text-[#2D3436]/40">
                            +{room.petTypes.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleAvailability(room)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          room.isAvailable
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {room.isAvailable ? (
                          <>
                            <ToggleRight size={14} />
                            Available
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={14} />
                            In Use
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(room)}
                          className="p-2 text-[#2D3436]/60 hover:text-[#D97853] hover:bg-[#D97853]/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setRoomToDelete(room);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-[#2D3436]/60 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#2D3436]/5"
        >
          <p className="text-sm font-medium text-[#2D3436]/60">Total Rooms</p>
          <p className="text-2xl font-bold text-[#2D3436] mt-1">{rooms.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#2D3436]/5"
        >
          <p className="text-sm font-medium text-[#2D3436]/60">Available</p>
          <p className="text-2xl font-bold text-[#7FB069] mt-1">
            {rooms.filter((r) => r.isAvailable).length}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#2D3436]/5"
        >
          <p className="text-sm font-medium text-[#2D3436]/60">In Use</p>
          <p className="text-2xl font-bold text-red-500 mt-1">
            {rooms.filter((r) => !r.isAvailable).length}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#2D3436]/5"
        >
          <p className="text-sm font-medium text-[#2D3436]/60">VIP Rooms</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">
            {rooms.filter((r) => r.type === "vip").length}
          </p>
        </motion.div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
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
                    <DoorOpen size={20} className="text-[#D97853]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#2D3436] leading-tight">
                      {modalMode === "create" ? "Add New Room" : "Edit Room"}
                    </h2>
                    <p className="text-xs text-[#2D3436]/50 font-medium">
                      {modalMode === "create" ? "Create a new accommodation room" : "Update room information"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-[#2D3436]/5 flex items-center justify-center hover:bg-[#2D3436]/10 transition-colors text-[#2D3436]/50 hover:text-[#2D3436]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6 md:p-8 flex-1 space-y-6">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle size={18} className="text-red-500" />
                    <p className="text-sm text-red-700 font-medium">{formError}</p>
                  </div>
                )}

                {/* Form Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Room Number */}
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Room No. <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.roomNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, roomNumber: e.target.value })
                      }
                      placeholder="e.g. P001"
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                    />
                  </div>

                  {/* Room Name */}
                  <div>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Room Name <span className="text-[#D97853]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g. Sunny Room"
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm"
                    />
                  </div>

                  {/* Room Type */}
                  <div className={`relative ${isRoomTypeOpen ? "z-[60]" : "z-10"}`}>
                    <label className="block text-sm font-bold text-[#2D3436] mb-2">
                      Room Type
                    </label>
                    <div
                      className={`flex items-center justify-between px-4 py-3 bg-[#FDFBF7] border ${isRoomTypeOpen ? "border-[#D97853] ring-1 ring-[#D97853]/20" : "border-[#D97853]"} rounded-2xl cursor-pointer hover:border-[#D97853] transition-all`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRoomTypeOpen(!isRoomTypeOpen);
                      }}
                    >
                      <span className="text-sm font-medium text-[#2D3436]">
                        {ROOM_TYPES.find((t) => t.value === formData.type)?.label || "Standard"}
                      </span>
                      <MoreVertical size={14} className="text-[#D97853]" />
                    </div>
                    <AnimatePresence>
                      {isRoomTypeOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsRoomTypeOpen(false);
                            }}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#FDFBF7] rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#2D3436]/5 overflow-hidden z-50 py-1.5"
                          >
                            {ROOM_TYPES.map((type) => {
                              const isSelected = formData.type === type.value;
                              return (
                                <div
                                  key={type.value}
                                  className={`px-4 py-2.5 text-[14px] cursor-pointer transition-colors ${!isSelected ? "text-[#2D3436]/70 hover:bg-[#2D3436]/5 font-medium" : "border-l-[3px] border-[#D97853] bg-[#D97853]/10 text-[#D97853] font-bold"}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData({ ...formData, type: type.value });
                                    setIsRoomTypeOpen(false);
                                  }}
                                >
                                  {type.label}
                                </div>
                              );
                            })}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Capacity */}
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
                      className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-2xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Pet Types */}
                <div>
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Pet Types
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
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          formData.petTypes.includes(pet.value)
                            ? "bg-[#D97853] text-white shadow-[0_3px_10px_rgba(217,120,83,0.3)]"
                            : "bg-white border border-[#2D3436]/10 text-[#2D3436]/70 hover:border-[#D97853] hover:text-[#D97853]"
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
                  <label className="block text-sm font-bold text-[#2D3436] mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Detailed description of the room..."
                    className="w-full px-4 py-3 bg-white border border-[#2D3436]/10 rounded-xl text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853] focus:ring-2 focus:ring-[#D97853]/20 transition-all placeholder:font-normal placeholder:text-[#2D3436]/30 shadow-sm resize-none"
                  />
                </div>

                {/* Status toggles */}
                {modalMode === "edit" && (
                  <div className="flex items-center gap-6 bg-white border border-[#2D3436]/10 rounded-2xl p-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isAvailable}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isAvailable: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded border-[#2D3436]/20 text-[#D97853] focus:ring-[#D97853]"
                      />
                      <span className="text-sm font-medium text-[#2D3436]">Available</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded border-[#2D3436]/20 text-[#D97853] focus:ring-[#D97853]"
                      />
                      <span className="text-sm font-medium text-[#2D3436]">Active</span>
                    </label>
                  </div>
                )}
              </form>

              {/* Modal Footer */}
              <div className="px-6 py-4 md:px-8 border-t border-[#2D3436]/10 bg-white flex items-center justify-end gap-3 sticky bottom-0 z-30">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#2D3436]/70 hover:bg-[#2D3436]/5 hover:text-[#2D3436] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
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
                    : modalMode === "create"
                      ? "Create Room"
                      : "Update Room"}
                </button>
              </div>
            </motion.div>
          </>
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
                <h3 className="text-lg font-bold text-[#2D3436]">
                  Delete Room
                </h3>
              </div>

              <p className="text-[#2D3436]/70 mb-6">
                Are you sure you want to delete room{" "}
                <span className="font-semibold text-[#2D3436]">
                  {roomToDelete.roomNumber} - {roomToDelete.name}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-[#2D3436]/70 hover:bg-[#F8F9FA] rounded-lg transition-colors"
                >
                  Cancel
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
