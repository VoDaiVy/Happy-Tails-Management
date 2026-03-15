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
} from "lucide-react";
import AdminFilterBar from "../../components/dashboard/AdminFilterBar";
import { getRoomsList, createRoom, updateRoom, deleteRoom } from "../../api/roomApi";
import { getErrorMessage } from "../../utils/apiResponseHandler";

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

// Filter tabs
const FILTER_TABS = [
  { key: "all", label: "All", icon: DoorOpen },
  { key: "available", label: "Available", icon: Check },
  { key: "unavailable", label: "In Use", icon: Bed },
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
  useScrollLock(showModal || showDeleteModal);
  
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
