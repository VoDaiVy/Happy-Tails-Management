import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createPet, deletePet, getMyPets, updatePet } from "../../api/modules/petApi";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import type { Pet } from "../../types/pet";
import { canUseCustomerFeatures } from "../../utils/role";

type Props = NativeStackScreenProps<AccountStackParamList, "MyPets">;
type Gender = "male" | "female" | "unknown";
type PetFilter = "all" | "dog" | "cat" | "rabbit" | "other";

const FILTERS: Array<{ key: PetFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "dog", label: "Dog" },
  { key: "cat", label: "Cat" },
  { key: "rabbit", label: "Rabbit" },
  { key: "other", label: "Other" },
];

interface PetFormState {
  petName: string;
  petType: string;
  breed: string;
  gender: Gender;
  weight: string;
  dateOfBirth: string;
}

const initialPetForm: PetFormState = {
  petName: "",
  petType: "dog",
  breed: "",
  gender: "unknown",
  weight: "",
  dateOfBirth: "",
};

function normalizePetType(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "dog") return "dog";
  if (normalized === "cat") return "cat";
  if (normalized === "rabbit") return "rabbit";
  if (!normalized) return "other";
  return "other";
}

function formatPetType(value?: string) {
  const normalized = normalizePetType(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function MyPetsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState<PetFilter>("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [petForm, setPetForm] = useState<PetFormState>(initialPetForm);

  const canAccess = canUseCustomerFeatures(user?.role);
  const isEditing = Boolean(editingId);

  const loadPets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyPets("true");
      setPets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong tai duoc danh sach pets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    loadPets();
  }, [canAccess, loadPets]);

  const filteredPets = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return pets.filter((pet) => {
      const type = normalizePetType(pet.petType);
      const matchType = activeFilter === "all" ? true : type === activeFilter;
      if (!matchType) return false;

      if (!keyword) return true;
      const petName = String(pet.petName || "").toLowerCase();
      const breed = String(pet.breed || "").toLowerCase();
      const petType = String(pet.petType || "").toLowerCase();
      return petName.includes(keyword) || breed.includes(keyword) || petType.includes(keyword);
    });
  }, [pets, searchText, activeFilter]);

  const onChangePetForm = (key: keyof PetFormState, value: string) => {
    setPetForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetPetForm = () => {
    setEditingId(null);
    setPetForm(initialPetForm);
    setShowPetForm(false);
  };

  const onOpenCreate = () => {
    setEditingId(null);
    setPetForm(initialPetForm);
    setShowPetForm(true);
    setError("");
    setMessage("");
  };

  const onBeginEdit = (pet: Pet) => {
    setEditingId(pet._id);
    setPetForm({
      petName: pet.petName || "",
      petType: normalizePetType(pet.petType),
      breed: pet.breed || "",
      gender: pet.gender || "unknown",
      weight: String(pet.weight || ""),
      dateOfBirth: pet.dateOfBirth ? String(pet.dateOfBirth).slice(0, 10) : "",
    });
    setShowPetForm(true);
    setError("");
    setMessage("");
  };

  const onSubmitPet = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    const weight = Number(petForm.weight);
    if (!petForm.petName.trim() || !petForm.breed.trim() || !Number.isFinite(weight) || weight <= 0) {
      setSaving(false);
      setError("Pet name, breed va weight hop le la bat buoc");
      return;
    }

    try {
      const payload = {
        petName: petForm.petName.trim(),
        petType: normalizePetType(petForm.petType),
        breed: petForm.breed.trim(),
        gender: petForm.gender,
        weight,
        dateOfBirth: petForm.dateOfBirth || undefined,
      };

      if (isEditing && editingId) {
        await updatePet(editingId, payload);
        setMessage("Cap nhat pet thanh cong");
      } else {
        await createPet(payload);
        setMessage("Them pet thanh cong");
      }

      resetPetForm();
      await loadPets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Luu pet that bai");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (petId: string) => {
    setError("");
    setMessage("");
    try {
      await deletePet(petId);
      setMessage("Xoa pet thanh cong");
      await loadPets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xoa pet that bai");
    }
  };

  if (!canAccess) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Tinh nang nay chi danh cho tai khoan customer.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.decorOne} pointerEvents="none" />
      <View style={styles.decorTwo} pointerEvents="none" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.kickerRow}>
          <Text style={styles.kickerSpark}>✧</Text>
          <Text style={styles.pageKicker}>PET MANAGER</Text>
        </View>

        <View style={styles.titleRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.pageTitle}>My Pets</Text>
        </View>

        <Pressable style={styles.primaryAddButton} onPress={onOpenCreate}>
          <Text style={styles.primaryAddButtonText}>＋ Add New Pet</Text>
        </Pressable>

        {showPetForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{isEditing ? "Edit Pet" : "Create Pet"}</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Pet name"
              placeholderTextColor="#98A2B3"
              value={petForm.petName}
              onChangeText={(value) => onChangePetForm("petName", value)}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Type (dog/cat/rabbit/other)"
              placeholderTextColor="#98A2B3"
              value={petForm.petType}
              onChangeText={(value) => onChangePetForm("petType", value)}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Breed"
              placeholderTextColor="#98A2B3"
              value={petForm.breed}
              onChangeText={(value) => onChangePetForm("breed", value)}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Gender (male/female/unknown)"
              placeholderTextColor="#98A2B3"
              value={petForm.gender}
              onChangeText={(value) => onChangePetForm("gender", value as Gender)}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Weight"
              placeholderTextColor="#98A2B3"
              keyboardType="numeric"
              value={petForm.weight}
              onChangeText={(value) => onChangePetForm("weight", value)}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Date of birth (YYYY-MM-DD)"
              placeholderTextColor="#98A2B3"
              value={petForm.dateOfBirth}
              onChangeText={(value) => onChangePetForm("dateOfBirth", value)}
            />

            <View style={styles.formActionRow}>
              <Pressable style={[styles.formActionButton, saving && styles.disabled]} onPress={onSubmitPet} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.formActionButtonText}>{isEditing ? "Update" : "Create"}</Text>}
              </Pressable>
              <Pressable style={styles.formCancelButton} onPress={resetPetForm}>
                <Text style={styles.formCancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, breed, or color..."
            placeholderTextColor="#8A9AB4"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((item) => {
            const active = activeFilter === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(item.key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.counterText}>{filteredPets.length} pets registered</Text>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#D87D4A" />
          </View>
        ) : null}

        {!loading && filteredPets.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyIcon}>🐾</Text>
            </View>
            <Text style={styles.emptyTitle}>No pets yet</Text>
            <Text style={styles.emptySubtitle}>
              Start by adding your furry, feathery, or scaly friends to manage their health and care
            </Text>
            <Pressable style={styles.emptyActionButton} onPress={onOpenCreate}>
              <Text style={styles.emptyActionButtonText}>Add Your First Pet</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && filteredPets.length > 0 ? (
          <View style={styles.listWrap}>
            {filteredPets.map((item) => (
              <View key={item._id} style={styles.petCard}>
                <View style={styles.petAvatar}>
                  <Text style={styles.petAvatarText}>{String(item.petName || "P").slice(0, 1).toUpperCase()}</Text>
                </View>

                <View style={styles.petInfo}>
                  <Text style={styles.petName}>{item.petName}</Text>
                  <Text style={styles.petMeta}>{formatPetType(item.petType)} · {item.breed || "Unknown breed"}</Text>
                  <Text style={styles.petMeta}>Weight: {item.weight || 0} kg</Text>
                </View>

                <View style={styles.petActions}>
                  <Pressable style={styles.inlineEditButton} onPress={() => onBeginEdit(item)}>
                    <Text style={styles.inlineEditText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.inlineDeleteButton} onPress={() => onDelete(item._id)}>
                    <Text style={styles.inlineDeleteText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.successText}>{message}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1EC" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 34 },
  decorOne: {
    position: "absolute",
    top: 170,
    right: -38,
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: "rgba(230, 219, 204, 0.42)",
  },
  decorTwo: {
    position: "absolute",
    top: 330,
    left: -28,
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: "rgba(232, 223, 211, 0.38)",
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  kickerSpark: {
    color: "#D87D4A",
    fontSize: 14,
    lineHeight: 16,
    marginTop: -1,
  },
  pageKicker: {
    color: "#D87D4A",
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.3,
    fontWeight: "700",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F8F8F7",
    borderWidth: 1,
    borderColor: "#E4E5E7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1B1F28",
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  backButtonText: {
    color: "#4D5E78",
    fontSize: 24,
    marginTop: -1,
    fontWeight: "700",
  },
  pageTitle: {
    color: "#D67A4B",
    fontSize: 48,
    lineHeight: 50,
    fontWeight: "900",
  },
  primaryAddButton: {
    backgroundColor: "#D87D4A",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 14,
    shadowColor: "#D87D4A",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryAddButtonText: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "800",
  },
  formCard: {
    borderWidth: 1,
    borderColor: "#E6DDD0",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  formTitle: { color: "#293646", fontWeight: "800", fontSize: 16 },
  formInput: {
    borderWidth: 1,
    borderColor: "#E1E7EF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFD",
    color: "#0F172A",
  },
  formActionRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  formActionButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#D87D4A",
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  formActionButtonText: { color: "#fff", fontWeight: "800" },
  formCancelButton: {
    minWidth: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DEE3EA",
    backgroundColor: "#F5F7FA",
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  formCancelButtonText: { color: "#5A6678", fontWeight: "700" },
  searchWrap: {
    borderWidth: 1,
    borderColor: "#E3E5E9",
    borderRadius: 16,
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 14,
    paddingVertical: 4,
    minHeight: 54,
    justifyContent: "center",
    marginBottom: 12,
  },
  searchInput: {
    color: "#5B6B82",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    backgroundColor: "#F8F8F7",
    borderWidth: 1,
    borderColor: "#E7E8EA",
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: "#D87D4A",
    borderColor: "#D87D4A",
  },
  filterChipText: {
    color: "#4D5E78",
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  counterText: {
    color: "#8C9AB1",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  loadingCard: {
    borderWidth: 1,
    borderColor: "#E6E3DC",
    borderRadius: 24,
    backgroundColor: "#FAF8F5",
    paddingVertical: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#E5E5E3",
    borderRadius: 28,
    backgroundColor: "#F7F7F8",
    paddingTop: 42,
    paddingHorizontal: 18,
    paddingBottom: 28,
    alignItems: "center",
    minHeight: 430,
  },
  emptyIconBox: {
    width: 98,
    height: 98,
    borderRadius: 26,
    backgroundColor: "#F0E1BF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    marginTop: 20,
    color: "#2F3742",
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "900",
  },
  emptySubtitle: {
    marginTop: 10,
    color: "#8395B2",
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 280,
  },
  emptyActionButton: {
    marginTop: 24,
    minWidth: 230,
    borderRadius: 15,
    backgroundColor: "#D87D4A",
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#D87D4A",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  emptyActionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "800",
  },
  listWrap: { gap: 10 },
  petCard: {
    borderWidth: 1,
    borderColor: "#E4E6EA",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  petAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EEF2F9",
    alignItems: "center",
    justifyContent: "center",
  },
  petAvatarText: { color: "#4D5E78", fontSize: 18, fontWeight: "800" },
  petInfo: { flex: 1 },
  petName: { color: "#2F3742", fontSize: 18, fontWeight: "800" },
  petMeta: { marginTop: 2, color: "#8090A9", fontSize: 13, fontWeight: "600" },
  petActions: { gap: 6 },
  inlineEditButton: {
    borderRadius: 10,
    backgroundColor: "#EEF2F9",
    borderWidth: 1,
    borderColor: "#D7DFEA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  inlineEditText: { color: "#4C5C76", fontWeight: "700", fontSize: 12 },
  inlineDeleteButton: {
    borderRadius: 10,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FFD6DA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  inlineDeleteText: { color: "#D33B44", fontWeight: "700", fontSize: 12 },
  disabled: { opacity: 0.65 },
  errorText: { marginTop: 8, color: "#DC2626", fontWeight: "600" },
  successText: { marginTop: 8, color: "#059669", fontWeight: "600" },
});
