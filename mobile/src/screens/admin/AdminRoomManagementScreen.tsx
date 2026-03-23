import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createAdminRoom,
  deleteAdminRoom,
  getAdminRooms,
  updateAdminRoom,
} from "../../api/modules/adminRoomApi";
import type { Room, RoomUpsertPayload } from "../../types/room";

const DEFAULT_FORM: RoomUpsertPayload = {
  roomNumber: "",
  name: "",
  type: "standard",
  serviceType: "boarding",
  group: "dry",
  capacity: 1,
  pricePerNight: 0,
  description: "",
  petTypes: ["dog", "cat"],
  amenities: [],
};

export function AdminRoomManagementScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<"all" | "service" | "boarding">("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomUpsertPayload>(DEFAULT_FORM);
  const [petTypeInput, setPetTypeInput] = useState("dog,cat");
  const [amenityInput, setAmenityInput] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextRooms = await getAdminRooms({
        isActive: "all",
        serviceType: serviceTypeFilter === "all" ? undefined : serviceTypeFilter,
      });
      setRooms(nextRooms);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Khong tai duoc room");
    } finally {
      setLoading(false);
    }
  }, [serviceTypeFilter]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const openCreateModal = () => {
    setEditingRoom(null);
    setForm(DEFAULT_FORM);
    setPetTypeInput("dog,cat");
    setAmenityInput("");
    setModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setForm({
      roomNumber: room.roomNumber,
      name: room.name,
      type: room.type,
      serviceType: room.serviceType,
      group: room.group || "dry",
      capacity: room.capacity,
      pricePerNight: room.pricePerNight,
      description: room.description || "",
      petTypes: room.petTypes || ["dog", "cat"],
      amenities: room.amenities || [],
    });
    setPetTypeInput((room.petTypes || []).join(","));
    setAmenityInput((room.amenities || []).join(","));
    setModalOpen(true);
  };

  const handleSubmit = useCallback(async () => {
    if (!form.roomNumber.trim() || !form.name.trim()) {
      setError("Room number va name la bat buoc");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload: RoomUpsertPayload = {
        ...form,
        roomNumber: form.roomNumber.trim(),
        name: form.name.trim(),
        petTypes: petTypeInput
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        amenities: amenityInput
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      };

      if (editingRoom) {
        const response = await updateAdminRoom(editingRoom._id, payload);
        setMessage(response.message || "Cap nhat room thanh cong");
      } else {
        const response = await createAdminRoom(payload);
        setMessage(response.message || "Tao room thanh cong");
      }

      setModalOpen(false);
      await loadRooms();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Luu room that bai");
    } finally {
      setSaving(false);
    }
  }, [amenityInput, editingRoom, form, loadRooms, petTypeInput]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room Management</Text>

      <View style={styles.filterRow}>
        {(["all", "service", "boarding"] as const).map((filter) => {
          const active = filter === serviceTypeFilter;
          return (
            <Pressable key={filter} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setServiceTypeFilter(filter)}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.createButton} onPress={openCreateModal}>
        <Text style={styles.createButtonText}>+ Tao room moi</Text>
      </Pressable>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Khong co room nao.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.itemTitle}>{item.roomNumber} - {item.name}</Text>
                <Text style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  {item.isActive ? "ACTIVE" : "INACTIVE"}
                </Text>
              </View>
              <Text style={styles.metaText}>Type: {item.type} | ServiceType: {item.serviceType}</Text>
              <Text style={styles.metaText}>Group: {item.group || "-"} | Capacity: {item.capacity}</Text>
              <Text style={styles.metaText}>Price/night: {item.pricePerNight.toLocaleString()} VND</Text>

              <View style={styles.actionRow}>
                <Pressable style={styles.actionButton} onPress={() => openEditModal(item)}>
                  <Text style={styles.actionText}>Sua</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, busyId === item._id && styles.disabled]}
                  disabled={busyId === item._id}
                  onPress={async () => {
                    setBusyId(item._id);
                    setError("");
                    setMessage("");
                    try {
                      const response = await updateAdminRoom(item._id, { isActive: !item.isActive });
                      setMessage(response.message || "Da doi trang thai room");
                      await loadRooms();
                    } catch (toggleError) {
                      setError(toggleError instanceof Error ? toggleError.message : "Khong doi duoc trang thai");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  <Text style={styles.actionText}>{item.isActive ? "Tat" : "Bat"}</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteButton, busyId === item._id && styles.disabled]}
                  disabled={busyId === item._id}
                  onPress={async () => {
                    setBusyId(item._id);
                    setError("");
                    setMessage("");
                    try {
                      const response = await deleteAdminRoom(item._id);
                      setMessage(response.message || "Da xoa room");
                      await loadRooms();
                    } catch (deleteError) {
                      setError(deleteError instanceof Error ? deleteError.message : "Khong xoa duoc room");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  <Text style={styles.deleteText}>Xoa</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.successText}>{message}</Text> : null}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingRoom ? "Cap nhat room" : "Tao room"}</Text>
            <TextInput value={form.roomNumber} onChangeText={(value) => setForm((prev) => ({ ...prev, roomNumber: value }))} placeholder="Room number" style={styles.modalInput} />
            <TextInput value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="Name" style={styles.modalInput} />
            <TextInput value={form.type} onChangeText={(value) => setForm((prev) => ({ ...prev, type: (value as RoomUpsertPayload["type"]) || "standard" }))} placeholder="Type standard/deluxe/suite/vip" style={styles.modalInput} />
            <TextInput
              value={form.serviceType}
              onChangeText={(value) =>
                setForm((prev) => ({
                  ...prev,
                  serviceType: value === "service" ? "service" : "boarding",
                }))
              }
              placeholder="Service type: service/boarding"
              style={styles.modalInput}
            />
            {form.serviceType === "service" ? (
              <TextInput
                value={form.group || "dry"}
                onChangeText={(value) => setForm((prev) => ({ ...prev, group: value === "wet" ? "wet" : "dry" }))}
                placeholder="Group wet/dry"
                style={styles.modalInput}
              />
            ) : null}
            <TextInput
              value={String(form.capacity)}
              onChangeText={(value) => setForm((prev) => ({ ...prev, capacity: Number(value) || 1 }))}
              placeholder="Capacity"
              keyboardType="numeric"
              style={styles.modalInput}
            />
            <TextInput
              value={String(form.pricePerNight)}
              onChangeText={(value) => setForm((prev) => ({ ...prev, pricePerNight: Number(value) || 0 }))}
              placeholder="Price per night"
              keyboardType="numeric"
              style={styles.modalInput}
            />
            <TextInput
              value={form.description || ""}
              onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
              placeholder="Description"
              style={styles.modalInput}
            />
            <TextInput value={petTypeInput} onChangeText={setPetTypeInput} placeholder="Pet types (dog,cat,...)" style={styles.modalInput} />
            <TextInput value={amenityInput} onChangeText={setAmenityInput} placeholder="Amenities (a,b,c)" style={styles.modalInput} />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelButton} onPress={() => setModalOpen(false)}>
                <Text style={styles.modalCancelText}>Huy</Text>
              </Pressable>
              <Pressable style={[styles.modalSaveButton, saving && styles.disabled]} onPress={handleSubmit} disabled={saving}>
                <Text style={styles.modalSaveText}>{saving ? "Dang luu..." : "Luu"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingTop: 12 },
  title: { paddingHorizontal: 16, fontSize: 24, fontWeight: "800", color: "#0F172A" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 12 },
  filterChip: { backgroundColor: "#E2E8F0", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: "#0F766E" },
  filterChipText: { color: "#334155", fontWeight: "600" },
  filterChipTextActive: { color: "#FFFFFF" },
  createButton: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#16A34A",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  createButtonText: { color: "#FFFFFF", fontWeight: "700" },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, gap: 10, paddingBottom: 20 },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 20 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", padding: 12, gap: 5 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { color: "#0F172A", fontWeight: "800", maxWidth: "72%" },
  statusBadge: {
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadge: { backgroundColor: "#DCFCE7", color: "#166534" },
  inactiveBadge: { backgroundColor: "#FEE2E2", color: "#B91C1C" },
  metaText: { color: "#475569", fontSize: 13 },
  actionRow: { marginTop: 8, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionButton: { backgroundColor: "#F1F5F9", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { color: "#0F172A", fontWeight: "700", fontSize: 12 },
  deleteButton: { backgroundColor: "#FEE2E2", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteText: { color: "#B91C1C", fontWeight: "700", fontSize: 12 },
  disabled: { opacity: 0.6 },
  errorText: { color: "#DC2626", paddingHorizontal: 16, paddingBottom: 6 },
  successText: { color: "#059669", paddingHorizontal: 16, paddingBottom: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  modalCancelButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: "#E2E8F0" },
  modalCancelText: { color: "#334155", fontWeight: "700" },
  modalSaveButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: "#2563EB" },
  modalSaveText: { color: "#FFFFFF", fontWeight: "700" },
});
