import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createPet, deletePet, getMyPets, updatePet } from "../../api/modules/petApi";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import type { Pet, PetGender, PetType } from "../../types/pet";
import { canUseCustomerFeatures } from "../../utils/role";

type Props = NativeStackScreenProps<AccountStackParamList, "MyPets">;
type PetFilter = "all" | "dog" | "cat" | "bird" | "fish" | "rabbit" | "hamster" | "other";

const PET_TYPES: PetType[] = ["dog", "cat", "bird", "fish", "rabbit", "hamster", "other"];
const GENDERS: PetGender[] = ["male", "female", "unknown"];

const FILTERS: Array<{ key: PetFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "dog", label: "Dog" },
  { key: "cat", label: "Cat" },
  { key: "bird", label: "Bird" },
  { key: "fish", label: "Fish" },
  { key: "rabbit", label: "Rabbit" },
  { key: "hamster", label: "Hamster" },
  { key: "other", label: "Other" },
];

interface PetFormState {
  petName: string;
  petType: PetType;
  breed: string;
  gender: PetGender;
  weight: string;
  dateOfBirth: string;
  color: string;
}

const initialPetForm: PetFormState = {
  petName: "",
  petType: "dog",
  breed: "",
  gender: "unknown",
  weight: "",
  dateOfBirth: "",
  color: "",
};

function normalizePetType(value?: string): PetType {
  const normalized = String(value || "").trim().toLowerCase();
  if (PET_TYPES.includes(normalized as PetType)) return normalized as PetType;
  if (!normalized) return "dog";
  return "other";
}

function normalizeGender(value?: string): PetGender {
  const normalized = String(value || "").trim().toLowerCase();
  if (GENDERS.includes(normalized as PetGender)) return normalized as PetGender;
  return "unknown";
}

function formatPetType(value?: string) {
  const normalized = normalizePetType(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatGender(value?: PetGender) {
  const gender = normalizeGender(value);
  if (gender === "male") return "Male";
  if (gender === "female") return "Female";
  return "Unknown";
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(value: string) {
  const parsed = parseDateInput(value);
  if (!parsed) return "dd/mm/yyyy";
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getCalendarCells(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startWeekDay = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startWeekDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function validatePetForm(form: PetFormState) {
  const petName = form.petName.trim();
  const breed = form.breed.trim();
  const color = form.color.trim();
  const weight = Number(form.weight);

  if (!petName) return "Pet name is required.";
  if (petName.length < 2 || petName.length > 50) return "Pet name must be from 2 to 50 characters.";
  if (!/^[a-zA-ZA-ỹ0-9\s\-.]+$/.test(petName)) {
    return "Pet name only allows letters, numbers, spaces, hyphens and dots.";
  }

  if (!PET_TYPES.includes(form.petType)) return "Pet type is invalid.";

  if (!breed) return "Breed is required.";
  if (breed.length > 100) return "Breed must be at most 100 characters.";

  if (!GENDERS.includes(form.gender)) return "Gender is invalid.";

  if (!Number.isFinite(weight) || weight < 0.1 || weight > 200) {
    return "Weight must be between 0.1 and 200 kg.";
  }

  if (form.dateOfBirth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth)) {
      return "Date of birth must be YYYY-MM-DD.";
    }

    const dob = new Date(`${form.dateOfBirth}T00:00:00`);
    if (Number.isNaN(dob.getTime())) {
      return "Date of birth is invalid.";
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 30);
    minDate.setHours(0, 0, 0, 0);

    if (dob > today || dob < minDate) {
      return "Pet age must be between 0 and 30 years.";
    }
  }

  if (color.length > 100) return "Color must be at most 100 characters.";

  return "";
}

export function MyPetsScreen({ navigation }: Props) {
  const dobAnchorRef = useRef<View>(null);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState<PetFilter>("all");
  const [typeFilterVisible, setTypeFilterVisible] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [petForm, setPetForm] = useState<PetFormState>(initialPetForm);
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [dobCalendarMonth, setDobCalendarMonth] = useState(new Date());
  const [dobAnchorFrame, setDobAnchorFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const todayDate = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const minDobDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 30);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const selectedDobDate = useMemo(() => parseDateInput(petForm.dateOfBirth), [petForm.dateOfBirth]);
  const selectedDobDateKey = useMemo(() => (selectedDobDate ? toDateKey(selectedDobDate) : ""), [selectedDobDate]);
  const calendarCells = useMemo(() => getCalendarCells(dobCalendarMonth), [dobCalendarMonth]);
  const useBottomSheetPicker = viewportHeight < 680 || !dobAnchorFrame;
  const activeFilterLabel = useMemo(() => FILTERS.find((item) => item.key === activeFilter)?.label || "All", [activeFilter]);

  const openDobPicker = useCallback(() => {
    setDobCalendarMonth(selectedDobDate || todayDate);
    dobAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setDobAnchorFrame({ x, y, width, height });
      setDobPickerVisible(true);
    });
  }, [selectedDobDate, todayDate]);

  const closeDobPicker = useCallback(() => {
    setDobPickerVisible(false);
  }, []);

  const jumpDobCalendarMonth = useCallback((offset: number) => {
    setDobCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const selectDobDate = useCallback((date: Date) => {
    if (date < minDobDate || date > todayDate) return;
    setPetForm((prev) => ({ ...prev, dateOfBirth: formatDateInput(date) }));
    setDobPickerVisible(false);
  }, [minDobDate, todayDate]);

  const dobPopoverMetrics = useMemo(() => {
    const baseWidth = 286;

    if (!dobAnchorFrame) {
      return {
        width: baseWidth,
        left: 16,
        top: 88,
      };
    }

    const width = Math.max(264, Math.min(304, Math.floor(dobAnchorFrame.width + 38)));
    const left = Math.max(12, Math.min(dobAnchorFrame.x, viewportWidth - width - 12));
    const belowTop = dobAnchorFrame.y + dobAnchorFrame.height + 6;
    const estimatedHeight = 322;
    const top = belowTop + estimatedHeight < viewportHeight - 16
      ? belowTop
      : Math.max(82, dobAnchorFrame.y - estimatedHeight - 8);

    return { width, left, top };
  }, [dobAnchorFrame, viewportHeight, viewportWidth]);

  const canAccess = canUseCustomerFeatures(user?.role);
  const isEditing = Boolean(editingId);

  const loadPets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyPets("true");
      setPets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load pet list");
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
      const color = String(pet.color || "").toLowerCase();
      return petName.includes(keyword) || breed.includes(keyword) || petType.includes(keyword) || color.includes(keyword);
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
      gender: normalizeGender(pet.gender),
      weight: String(pet.weight || ""),
      dateOfBirth: pet.dateOfBirth ? String(pet.dateOfBirth).slice(0, 10) : "",
      color: pet.color || "",
    });
    setShowPetForm(true);
    setError("");
    setMessage("");
  };

  const onSubmitPet = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    const validationMessage = validatePetForm(petForm);
    if (validationMessage) {
      setSaving(false);
      setError(validationMessage);
      return;
    }

    const weight = Number(petForm.weight);

    try {
      const payload = {
        petName: petForm.petName.trim(),
        petType: normalizePetType(petForm.petType),
        breed: petForm.breed.trim(),
        gender: normalizeGender(petForm.gender),
        weight,
        dateOfBirth: petForm.dateOfBirth || undefined,
        color: petForm.color.trim() || undefined,
      };

      if (isEditing && editingId) {
        await updatePet(editingId, payload);
        setMessage("Pet updated successfully.");
      } else {
        await createPet(payload);
        setMessage("Pet added successfully.");
      }

      resetPetForm();
      await loadPets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save pet.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (petId: string) => {
    setError("");
    setMessage("");
    try {
      await deletePet(petId);
      setMessage("Pet removed successfully.");
      await loadPets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove pet.");
    }
  };

  if (!canAccess) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>This feature is only available for customer accounts.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.decorOne} pointerEvents="none" />
      <View style={styles.decorTwo} pointerEvents="none" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          
          <Text style={styles.headerTitle}>My Pets</Text>
          <Pressable style={styles.headerIconButton} onPress={onOpenCreate}>
            <Feather name="plus" size={18} color="#4A280F" />
          </Pressable>
        </View>

       

        <View style={styles.searchFilterRow}>
          <View style={styles.searchWrap}>
            <Feather name="search" size={16} color="#9E7C5F" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, breed, or color..."
              placeholderTextColor="#B4977D"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <Pressable style={styles.filterDropdownTrigger} onPress={() => setTypeFilterVisible(true)}>
            <Text style={styles.filterDropdownTriggerText}>{activeFilterLabel}</Text>
            <Feather name="chevron-down" size={16} color="#A96331" />
          </Pressable>
        </View>

        <Pressable style={styles.addSectionCard} onPress={onOpenCreate}>
          <View style={styles.addSectionIconWrap}>
            <Feather name="plus-circle" size={16} color="#8F3C0B" />
          </View>
          <View style={styles.addSectionTextWrap}>
            <Text style={styles.addSectionTitle}>{isEditing ? "Edit Member" : "Add a Member"}</Text>
            <Text style={styles.addSectionDesc}>Create a polished profile for your furry family.</Text>
          </View>
        </Pressable>

        {showPetForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{isEditing ? "Update Pet" : "Register Pet"}</Text>
            <Text style={styles.formSubtitle}>Pet profile details</Text>

            <Text style={styles.selectorLabel}>Pet Name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Luna"
              placeholderTextColor="#B79A83"
              value={petForm.petName}
              onChangeText={(value) => onChangePetForm("petName", value)}
            />

            <View style={styles.formGridRow}>
              <View style={styles.formGridCol}>
                <Text style={styles.selectorLabel}>Breed</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Golden Retriever"
                  placeholderTextColor="#B79A83"
                  value={petForm.breed}
                  onChangeText={(value) => onChangePetForm("breed", value)}
                />
              </View>

              <View style={styles.formGridCol}>
                <Text style={styles.selectorLabel}>Color</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Golden"
                  placeholderTextColor="#B79A83"
                  value={petForm.color}
                  onChangeText={(value) => onChangePetForm("color", value)}
                />
              </View>
            </View>

            <View style={styles.formGridRow}>
              <View style={styles.formGridCol}>
                <Text style={styles.selectorLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="12"
                  placeholderTextColor="#B79A83"
                  keyboardType="numeric"
                  value={petForm.weight}
                  onChangeText={(value) => onChangePetForm("weight", value)}
                />
              </View>

              <View style={styles.formGridCol} ref={dobAnchorRef} collapsable={false}>
                <Text style={styles.selectorLabel}>Birth Date</Text>
                <Pressable style={[styles.formInput, styles.dateDropdownBtn, petForm.dateOfBirth && styles.dateDropdownBtnActive]} onPress={openDobPicker}>
                  <Text style={[styles.dateDropdownText, petForm.dateOfBirth && styles.dateDropdownTextActive]}>
                    {formatDateDisplay(petForm.dateOfBirth)}
                  </Text>
                  <Feather name="calendar" size={14} color={petForm.dateOfBirth ? "#A65B2A" : "#BBA28D"} />
                </Pressable>
              </View>
            </View>

            <View>
              <Text style={styles.selectorLabel}>Pet Type</Text>
              <View style={styles.selectorRow}>
                {PET_TYPES.map((type) => {
                  const active = petForm.petType === type;
                  return (
                    <Pressable
                      key={type}
                      style={[styles.selectorChip, active && styles.selectorChipActive]}
                      onPress={() => onChangePetForm("petType", type)}
                    >
                      <Text style={[styles.selectorChipText, active && styles.selectorChipTextActive]}>{formatPetType(type)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={styles.selectorLabel}>Gender</Text>
              <View style={styles.selectorRow}>
                {GENDERS.map((gender) => {
                  const active = petForm.gender === gender;
                  return (
                    <Pressable
                      key={gender}
                      style={[styles.selectorChip, active && styles.selectorChipActive]}
                      onPress={() => onChangePetForm("gender", gender)}
                    >
                      <Text style={[styles.selectorChipText, active && styles.selectorChipTextActive]}>{formatGender(gender)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.formActionRow}>
              <Pressable style={[styles.formActionButton, saving && styles.disabled]} onPress={onSubmitPet} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.formActionButtonText}>{isEditing ? "Update Pet" : "Register Pet"}</Text>}
              </Pressable>
              <Pressable style={styles.formCancelButton} onPress={resetPetForm}>
                <Text style={styles.formCancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.registeredHeaderRow}>
          <Text style={styles.registeredTitle}>Registered Pets</Text>
          <Text style={styles.counterText}>{filteredPets.length} Total</Text>
        </View>

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
                <View style={styles.petTopRow}>
                  <View style={styles.petAvatar}>
                    <Text style={styles.petAvatarText}>{String(item.petName || "P").slice(0, 1).toUpperCase()}</Text>
                  </View>

                  <View style={styles.petInfo}>
                    <Text style={styles.petName}>{item.petName}</Text>
                    <Text style={styles.petMetaPrimary}>{item.breed || "Unknown breed"} • {formatGender(item.gender)} • {item.weight || 0}kg</Text>

                    <View style={styles.petMetaPillRow}>
                      <View style={styles.petMetaPill}>
                        <Text style={styles.petMetaPillText}>{formatPetType(item.petType)}</Text>
                      </View>
                      {item.color ? (
                        <View style={styles.petMetaPill}>
                          <Text style={styles.petMetaPillText}>{String(item.color).toUpperCase()}</Text>
                        </View>
                      ) : null}
                      {item.dateOfBirth ? (
                        <View style={styles.petMetaPill}>
                          <Text style={styles.petMetaPillText}>{formatDateDisplay(String(item.dateOfBirth).slice(0, 10))}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.petActions}>
                    <Pressable style={styles.inlineEditButton} onPress={() => onBeginEdit(item)}>
                      <Feather name="edit-3" size={14} color="#86512B" />
                      <Text style={styles.inlineEditText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.inlineDeleteButton} onPress={() => onDelete(item._id)}>
                      <Feather name="trash-2" size={14} color="#C7372F" />
                      <Text style={styles.inlineDeleteText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.successText}>{message}</Text> : null}
      </ScrollView>

      <Modal visible={typeFilterVisible} transparent animationType="fade" onRequestClose={() => setTypeFilterVisible(false)}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setTypeFilterVisible(false)}>
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>Filter by pet type</Text>
            {FILTERS.map((item) => {
              const selected = activeFilter === item.key;
              return (
                <Pressable
                  key={item.key}
                  style={[styles.dropdownOption, selected && styles.dropdownOptionActive]}
                  onPress={() => {
                    setActiveFilter(item.key);
                    setTypeFilterVisible(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, selected && styles.dropdownOptionTextActive]}>{item.label}</Text>
                  {selected ? <Feather name="check" size={15} color="#B15A22" /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={dobPickerVisible} transparent animationType="fade" onRequestClose={closeDobPicker}>
        {useBottomSheetPicker ? (
          <View style={styles.filterPickerOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeDobPicker} />

            <View style={styles.filterBottomSheet}>
              <View style={styles.filterBottomHandle} />
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeaderRow}>
                  <Text style={styles.calendarMonthTitle}>
                    {dobCalendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
                  </Text>

                  <View style={styles.calendarNavWrap}>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpDobCalendarMonth(-1)}>
                      <Feather name="chevron-left" size={15} color="#7C889A" />
                    </Pressable>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpDobCalendarMonth(1)}>
                      <Feather name="chevron-right" size={15} color="#7C889A" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.calendarWeekRow}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <Text key={`${day}-${index}`} style={styles.calendarWeekText}>{day}</Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarCells.map((cell) => {
                    const active = selectedDobDateKey === toDateKey(cell.date);
                    const isToday = isSameDay(cell.date, todayDate);
                    const isOutOfRange = cell.date < minDobDate || cell.date > todayDate;

                    return (
                      <Pressable
                        key={cell.date.toISOString()}
                        style={[
                          styles.calendarDayCell,
                          active && styles.calendarDayCellActive,
                          isToday && !active && styles.calendarDayCellToday,
                        ]}
                        onPress={() => selectDobDate(cell.date)}
                        disabled={isOutOfRange}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            !cell.inMonth && styles.calendarDayTextMuted,
                            active && styles.calendarDayTextActive,
                            isToday && !active && styles.calendarDayTextToday,
                            isOutOfRange && styles.calendarDayTextDisabled,
                          ]}
                        >
                          {cell.date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.calendarFooterRow}>
                  {petForm.dateOfBirth ? (
                    <Pressable
                      style={styles.calendarTextBtn}
                      onPress={() => {
                        onChangePetForm("dateOfBirth", "");
                        setDobPickerVisible(false);
                      }}
                    >
                      <Text style={styles.calendarTextBtnLabel}>Clear</Text>
                    </Pressable>
                  ) : <View />}

                  <Pressable style={styles.calendarTextBtn} onPress={closeDobPicker}>
                    <Text style={styles.calendarTextBtnLabel}>Done</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.filterPickerPopoverContainer}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeDobPicker} />

            <View
              style={[
                styles.filterPickerPopoverCard,
                {
                  top: dobPopoverMetrics.top,
                  left: dobPopoverMetrics.left,
                  width: dobPopoverMetrics.width,
                },
              ]}
            >
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeaderRow}>
                  <Text style={styles.calendarMonthTitle}>
                    {dobCalendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
                  </Text>

                  <View style={styles.calendarNavWrap}>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpDobCalendarMonth(-1)}>
                      <Feather name="chevron-left" size={15} color="#7C889A" />
                    </Pressable>
                    <Pressable style={styles.calendarNavBtn} onPress={() => jumpDobCalendarMonth(1)}>
                      <Feather name="chevron-right" size={15} color="#7C889A" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.calendarWeekRow}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <Text key={`${day}-${index}`} style={styles.calendarWeekText}>{day}</Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarCells.map((cell) => {
                    const active = selectedDobDateKey === toDateKey(cell.date);
                    const isToday = isSameDay(cell.date, todayDate);
                    const isOutOfRange = cell.date < minDobDate || cell.date > todayDate;

                    return (
                      <Pressable
                        key={cell.date.toISOString()}
                        style={[
                          styles.calendarDayCell,
                          active && styles.calendarDayCellActive,
                          isToday && !active && styles.calendarDayCellToday,
                        ]}
                        onPress={() => selectDobDate(cell.date)}
                        disabled={isOutOfRange}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            !cell.inMonth && styles.calendarDayTextMuted,
                            active && styles.calendarDayTextActive,
                            isToday && !active && styles.calendarDayTextToday,
                            isOutOfRange && styles.calendarDayTextDisabled,
                          ]}
                        >
                          {cell.date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.calendarFooterRow}>
                  {petForm.dateOfBirth ? (
                    <Pressable
                      style={styles.calendarTextBtn}
                      onPress={() => {
                        onChangePetForm("dateOfBirth", "");
                        setDobPickerVisible(false);
                      }}
                    >
                      <Text style={styles.calendarTextBtnLabel}>Clear</Text>
                    </Pressable>
                  ) : <View />}

                  <Pressable style={styles.calendarTextBtn} onPress={closeDobPicker}>
                    <Text style={styles.calendarTextBtnLabel}>Close</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F2EC" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 40 },
  decorOne: {
    position: "absolute",
    top: 160,
    right: -34,
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: "rgba(241, 219, 195, 0.34)",
  },
  decorTwo: {
    position: "absolute",
    top: 420,
    left: -26,
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "rgba(242, 230, 217, 0.52)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7EEDF",
    borderWidth: 1,
    borderColor: "#F0DFC8",
  },
  headerTitle: {
    color: "#8B3E0B",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
  },
  heroTitle: {
    color: "#8B3E0B",
    fontSize: 46,
    lineHeight: 48,
    fontWeight: "900",
    marginBottom: 18,
  },
  searchFilterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  searchWrap: {
    flex: 1,
    minHeight: 54,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EEDCC7",
    backgroundColor: "#FAF2E7",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#6F4A2D",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  filterDropdownTrigger: {
    minWidth: 118,
    minHeight: 54,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7CDB2",
    backgroundColor: "#FFF3E4",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterDropdownTriggerText: {
    color: "#9A4E1D",
    fontSize: 14,
    fontWeight: "800",
  },
  addSectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F0DDC8",
    backgroundColor: "#FFF8F1",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  addSectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F8C892",
    alignItems: "center",
    justifyContent: "center",
  },
  addSectionTextWrap: { flex: 1 },
  addSectionTitle: {
    color: "#2E1708",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  addSectionDesc: {
    marginTop: 2,
    color: "#8A674E",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  formCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#F1E1D1",
    backgroundColor: "#FFFBF6",
    padding: 16,
    gap: 8,
    marginBottom: 20,
  },
  formTitle: { color: "#2D1709", fontWeight: "900", fontSize: 34, lineHeight: 36 },
  formSubtitle: { color: "#9A7559", fontWeight: "700", fontSize: 12, lineHeight: 18, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 },
  selectorLabel: {
    color: "#9C7354",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#EFD8C1",
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    backgroundColor: "#F5E8DB",
    color: "#433124",
    fontSize: 20,
    fontWeight: "500",
  },
  formGridRow: {
    flexDirection: "row",
    gap: 10,
  },
  formGridCol: {
    flex: 1,
  },
  dateDropdownBtn: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    gap: 8,
  },
  dateDropdownBtnActive: {
    borderColor: "#E2BFA3",
    backgroundColor: "#FAECDD",
  },
  dateDropdownText: {
    flex: 1,
    color: "#A68A72",
    fontSize: 20,
    fontWeight: "500",
  },
  dateDropdownTextActive: {
    color: "#6F4323",
  },
  filterPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 31, 49, 0.08)",
    justifyContent: "flex-end",
  },
  filterBottomSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#FFFCF8",
    borderWidth: 1,
    borderColor: "#EADFCC",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  filterBottomHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDCDBD",
    marginBottom: 8,
  },
  filterPickerPopoverContainer: {
    flex: 1,
    backgroundColor: "rgba(20, 31, 49, 0.08)",
  },
  filterPickerPopoverCard: {
    position: "absolute",
    borderRadius: 13,
    overflow: "hidden",
  },
  calendarCard: {
    width: "100%",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#ECDFD2",
    backgroundColor: "#FFFEFB",
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 7,
    shadowColor: "#5E4A39",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  calendarMonthTitle: {
    color: "#3D536E",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  calendarNavWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calendarNavBtn: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#ECE0D4",
    backgroundColor: "#FFF9F2",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarWeekRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  calendarWeekText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#9AA6B5",
    fontSize: 10,
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  calendarDayCellToday: {
    borderWidth: 1,
    borderColor: "#E7D3C2",
    backgroundColor: "#FFF6EC",
  },
  calendarDayCellActive: {
    borderWidth: 1,
    borderColor: "#E2BFA3",
    backgroundColor: "#F4D9C3",
  },
  calendarDayText: {
    color: "#415773",
    fontSize: 12,
    fontWeight: "700",
  },
  calendarDayTextMuted: {
    color: "#C7CED8",
    opacity: 0.42,
  },
  calendarDayTextToday: {
    color: "#C16936",
  },
  calendarDayTextActive: {
    color: "#8E4E2A",
  },
  calendarDayTextDisabled: {
    color: "#D1D7DF",
    opacity: 0.55,
  },
  calendarFooterRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calendarTextBtn: {
    minHeight: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEE2D6",
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFAF4",
  },
  calendarTextBtnLabel: {
    color: "#6F8094",
    fontSize: 10,
    fontWeight: "700",
  },
  selectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  selectorChip: {
    borderWidth: 1,
    borderColor: "#E3B98F",
    borderRadius: 11,
    backgroundColor: "#FFFCF8",
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  selectorChipActive: {
    borderColor: "#D07238",
    backgroundColor: "#FFE9D6",
  },
  selectorChipText: {
    color: "#744A2A",
    fontWeight: "700",
    fontSize: 18,
  },
  selectorChipTextActive: {
    color: "#B45C20",
  },
  formActionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  formActionButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#DF6118",
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#B14D15",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  formActionButtonText: { color: "#fff", fontWeight: "900", fontSize: 17, letterSpacing: 0.8 },
  formCancelButton: {
    minWidth: 104,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5CCB2",
    backgroundColor: "#FFF3E6",
    minHeight: 54,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  formCancelButtonText: { color: "#915832", fontWeight: "800", fontSize: 15 },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(31, 20, 10, 0.24)",
    justifyContent: "flex-end",
    padding: 14,
  },
  dropdownCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDD8C1",
    backgroundColor: "#FFFBF6",
    padding: 12,
    gap: 6,
  },
  dropdownTitle: {
    color: "#6A3B19",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  dropdownOption: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1E1D0",
    backgroundColor: "#FFF7EE",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownOptionActive: {
    borderColor: "#E6BF9B",
    backgroundColor: "#FFEEDC",
  },
  dropdownOptionText: {
    color: "#744B2B",
    fontSize: 14,
    fontWeight: "700",
  },
  dropdownOptionTextActive: {
    color: "#AF5925",
  },
  registeredHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  registeredTitle: {
    color: "#2B1609",
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "900",
  },
  counterText: {
    color: "#A85A25",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  loadingCard: {
    borderWidth: 1,
    borderColor: "#EEDFCF",
    borderRadius: 24,
    backgroundColor: "#FFFAF4",
    paddingVertical: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#F0DFCF",
    borderRadius: 26,
    backgroundColor: "#FFFBF6",
    paddingTop: 34,
    paddingHorizontal: 18,
    paddingBottom: 24,
    alignItems: "center",
    minHeight: 320,
  },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "#F9E9D6",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: { fontSize: 34 },
  emptyTitle: {
    marginTop: 14,
    color: "#312113",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
  },
  emptySubtitle: {
    marginTop: 8,
    color: "#8D6B52",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 290,
  },
  emptyActionButton: {
    marginTop: 18,
    minWidth: 210,
    borderRadius: 999,
    backgroundColor: "#DF6118",
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#BA4F16",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  emptyActionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
  },
  listWrap: { gap: 12 },
  petCard: {
    borderWidth: 1,
    borderColor: "#F0DDCB",
    borderRadius: 20,
    backgroundColor: "#FFFBF7",
    padding: 14,
  },
  petTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  petAvatar: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: "#F9D8B6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EDC7A3",
  },
  petAvatarText: { color: "#713E1F", fontSize: 22, fontWeight: "900" },
  petInfo: { flex: 1 },
  petName: { color: "#2A160A", fontSize: 30, lineHeight: 34, fontWeight: "900" },
  petMetaPrimary: { marginTop: 2, color: "#7E5940", fontSize: 13, lineHeight: 18, fontWeight: "700" },
  petMetaPillRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  petMetaPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EBCFB2",
    backgroundColor: "#FFF1E2",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  petMetaPillText: { color: "#94562F", fontWeight: "800", fontSize: 11 },
  petActions: { gap: 7, paddingTop: 2 },
  inlineEditButton: {
    borderRadius: 999,
    backgroundColor: "#FFF1E2",
    borderWidth: 1,
    borderColor: "#E7C6A7",
    minHeight: 32,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  inlineEditText: { color: "#86512B", fontWeight: "800", fontSize: 12 },
  inlineDeleteButton: {
    borderRadius: 999,
    backgroundColor: "#FFF3F1",
    borderWidth: 1,
    borderColor: "#F2CBC7",
    minHeight: 32,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  inlineDeleteText: { color: "#C7372F", fontWeight: "800", fontSize: 12 },
  disabled: { opacity: 0.65 },
  errorText: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  successText: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
