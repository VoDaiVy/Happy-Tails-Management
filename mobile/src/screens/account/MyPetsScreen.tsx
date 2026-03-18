import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createPet, deletePet, getMyPets, updatePet } from "../../api/modules/petApi";
import { useAuth } from "../../context/AuthContext";
import type { Pet } from "../../types/pet";
import { canUseCustomerFeatures } from "../../utils/role";

type Gender = "male" | "female" | "unknown";

interface PetFormState {
  petName: string;
  petType: string;
  breed: string;
  gender: Gender;
  weight: string;
  dateOfBirth: string;
}

const initialForm: PetFormState = {
  petName: "",
  petType: "dog",
  breed: "",
  gender: "unknown",
  weight: "",
  dateOfBirth: "",
};

export function MyPetsScreen() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PetFormState>(initialForm);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);
  const canAccess = canUseCustomerFeatures(user?.role);

  const loadPets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await getMyPets("true");
      setPets(list);
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

  if (!canAccess) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Tinh nang nay chi danh cho tai khoan customer.</Text>
      </View>
    );
  }

  const onChange = (key: keyof PetFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const onSubmit = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    const weight = Number(form.weight);
    if (!form.petName || !form.breed || !Number.isFinite(weight) || weight <= 0) {
      setSaving(false);
      setError("Pet name, breed, weight hop le la bat buoc");
      return;
    }

    try {
      if (isEditing && editingId) {
        await updatePet(editingId, {
          petName: form.petName.trim(),
          petType: form.petType.trim(),
          breed: form.breed.trim(),
          gender: form.gender,
          weight,
          dateOfBirth: form.dateOfBirth || undefined,
        });
        setMessage("Cap nhat pet thanh cong");
      } else {
        await createPet({
          petName: form.petName.trim(),
          petType: form.petType.trim(),
          breed: form.breed.trim(),
          gender: form.gender,
          weight,
          dateOfBirth: form.dateOfBirth || undefined,
        });
        setMessage("Them pet thanh cong");
      }

      resetForm();
      await loadPets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Luu pet that bai");
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (pet: Pet) => {
    setEditingId(pet._id);
    setForm({
      petName: pet.petName || "",
      petType: pet.petType || "",
      breed: pet.breed || "",
      gender: (pet as Pet & { gender?: Gender }).gender || "unknown",
      weight: String((pet as Pet & { weight?: number }).weight || ""),
      dateOfBirth: (pet as Pet & { dateOfBirth?: string }).dateOfBirth ? String((pet as Pet & { dateOfBirth?: string }).dateOfBirth).slice(0, 10) : "",
    });
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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{isEditing ? "Edit Pet" : "Add Pet"}</Text>

      <View style={styles.formCard}>
        <TextInput style={styles.input} placeholder="Pet name" value={form.petName} onChangeText={(v) => onChange("petName", v)} />
        <TextInput style={styles.input} placeholder="Pet type (dog/cat)" value={form.petType} onChangeText={(v) => onChange("petType", v)} />
        <TextInput style={styles.input} placeholder="Breed" value={form.breed} onChangeText={(v) => onChange("breed", v)} />
        <TextInput style={styles.input} placeholder="Gender (male/female/unknown)" value={form.gender} onChangeText={(v) => onChange("gender", v as Gender)} />
        <TextInput style={styles.input} placeholder="Weight" keyboardType="numeric" value={form.weight} onChangeText={(v) => onChange("weight", v)} />
        <TextInput style={styles.input} placeholder="Date of birth YYYY-MM-DD" value={form.dateOfBirth} onChangeText={(v) => onChange("dateOfBirth", v)} />

        <View style={styles.actionRow}>
          <Pressable style={[styles.primaryButton, saving && styles.disabledButton]} onPress={onSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{isEditing ? "Update" : "Create"}</Text>}
          </Pressable>
          {isEditing ? (
            <Pressable style={styles.secondaryButton} onPress={resetForm}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.successText}>{message}</Text> : null}
      </View>

      <Text style={styles.listTitle}>My Pets</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Chua co thu cung nao</Text>}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.petName}</Text>
                <Text style={styles.itemMeta}>{item.petType || "pet"} · {item.breed || "N/A"}</Text>
              </View>

              <Pressable style={styles.inlineButton} onPress={() => beginEdit(item)}>
                <Text style={styles.inlineButtonText}>Edit</Text>
              </Pressable>
              <Pressable style={[styles.inlineButton, styles.inlineDanger]} onPress={() => onDelete(item._id)}>
                <Text style={[styles.inlineButtonText, styles.inlineDangerText]}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
  header: { fontSize: 20, fontWeight: "700", color: "#0F172A", marginBottom: 10 },
  formCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  primaryButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 11,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 11,
  },
  secondaryButtonText: { color: "#334155", fontWeight: "700" },
  disabledButton: { opacity: 0.65 },
  errorText: { color: "#DC2626", marginTop: 4 },
  successText: { color: "#059669", marginTop: 4 },
  listTitle: { marginTop: 16, marginBottom: 8, fontSize: 18, fontWeight: "700", color: "#0F172A" },
  centerBox: { paddingVertical: 20, alignItems: "center" },
  listContent: { paddingBottom: 20, gap: 10 },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 10 },
  itemCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  itemMeta: { marginTop: 2, color: "#64748B", fontSize: 13 },
  inlineButton: {
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineButtonText: { color: "#1D4ED8", fontWeight: "600", fontSize: 12 },
  inlineDanger: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  inlineDangerText: { color: "#B91C1C" },
});
