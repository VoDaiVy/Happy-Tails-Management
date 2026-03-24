import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { getMyProfile, getProfileCompletion, updateMyProfile, updateProfileAvatar } from "../../api/modules/profileApi";
import type { AccountStackParamList } from "../../navigation/types";
import type { UpdateProfilePayload } from "../../types/profile";

type Props = NativeStackScreenProps<AccountStackParamList, "Profile">;
type GenderValue = "male" | "female" | "other";

interface ProfileFormState {
  firstName: string;
  lastName: string;
  tel: string;
  dob: string;
  gender: GenderValue;
  bio: string;
  street: string;
  city: string;
}

const initialForm: ProfileFormState = {
  firstName: "",
  lastName: "",
  tel: "",
  dob: "",
  gender: "male",
  bio: "",
  street: "",
  city: "",
};

const GENDER_OPTIONS: Array<{ value: GenderValue; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

function formatDateLabel(value: string) {
  if (!value) return "dd/mm/yyyy";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "dd/mm/yyyy";
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateValue(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function toDate(value: string) {
  if (!value) return new Date();
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
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

function validateProfile(form: ProfileFormState) {
  if (!form.firstName.trim() || form.firstName.trim().length < 2) {
    return "First name must have at least 2 characters.";
  }

  if (!form.lastName.trim() || form.lastName.trim().length < 2) {
    return "Last name must have at least 2 characters.";
  }

  const vnPhone = /^(\+84|84|0)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-6|8|9]|9[0-4|6-9])[0-9]{7}$/;
  if (!vnPhone.test(form.tel.trim())) {
    return "Phone number is invalid. Use Vietnamese phone format.";
  }

  if (!form.dob) {
    return "Date of birth is required.";
  }

  const dob = new Date(`${form.dob}T00:00:00`);
  if (Number.isNaN(dob.getTime())) {
    return "Date of birth is invalid.";
  }

  const today = new Date();
  const minDate = new Date();
  minDate.setFullYear(today.getFullYear() - 120);
  const maxDate = new Date();
  maxDate.setFullYear(today.getFullYear() - 13);
  if (dob < minDate || dob > maxDate) {
    return "Age must be between 13 and 120 years old.";
  }

  return "";
}

export function ProfileScreen({ navigation }: Props) {
  const dobAnchorRef = useRef<View>(null);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [dobCalendarMonth, setDobCalendarMonth] = useState(new Date());
  const [dobAnchorFrame, setDobAnchorFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [form, setForm] = useState<ProfileFormState>(initialForm);

  const progressPercent = useMemo(() => {
    const safe = Number.isFinite(completion) ? completion : 0;
    return Math.max(0, Math.min(100, Math.round(safe)));
  }, [completion]);

  const minDobDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 120);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const maxDobDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 13);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const selectedDobDate = useMemo(() => parseDateInput(form.dob), [form.dob]);
  const selectedDobDateKey = useMemo(() => (selectedDobDate ? toDateKey(selectedDobDate) : ""), [selectedDobDate]);
  const calendarCells = useMemo(() => getCalendarCells(dobCalendarMonth), [dobCalendarMonth]);
  const useBottomSheetPicker = viewportHeight < 680 || !dobAnchorFrame;

  const openDobPicker = useCallback(() => {
    setDobCalendarMonth(selectedDobDate || maxDobDate);
    dobAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setDobAnchorFrame({ x, y, width, height });
      setDobPickerVisible(true);
    });
  }, [maxDobDate, selectedDobDate]);

  const closeDobPicker = useCallback(() => {
    setDobPickerVisible(false);
  }, []);

  const jumpDobCalendarMonth = useCallback((offset: number) => {
    setDobCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const selectDobDate = useCallback((date: Date) => {
    if (date < minDobDate || date > maxDobDate) return;
    onChange("dob", formatDateValue(date));
    setDobPickerVisible(false);
  }, [maxDobDate, minDobDate]);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [profileData, completionData] = await Promise.all([getMyProfile(), getProfileCompletion()]);

      setCompletion(completionData.completionPercentage || profileData.completionPercentage || 0);
      setAvatar(profileData.profile?.avatar || null);
      setForm({
        firstName: profileData.profile?.firstName || "",
        lastName: profileData.profile?.lastName || "",
        tel: profileData.profile?.tel || "",
        dob: profileData.profile?.dob ? String(profileData.profile.dob).slice(0, 10) : "",
        gender: (profileData.profile?.gender as GenderValue) || "male",
        bio: profileData.profile?.bio || "",
        street: profileData.profile?.address?.street || "",
        city: profileData.profile?.address?.city || "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onChange = (key: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildUpdatePayload = useCallback(
    (extra?: Partial<UpdateProfilePayload>): UpdateProfilePayload => ({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      tel: form.tel.trim(),
      dob: form.dob,
      gender: form.gender,
      bio: form.bio.trim(),
      address: {
        street: form.street.trim(),
        city: form.city.trim(),
      },
      ...(extra || {}),
    }),
    [form],
  );

  const onUploadAvatarFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Please allow photo library access to update avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];

    setUploadingAvatar(true);
    setError("");
    setMessage("");
    try {
      const response = await updateProfileAvatar({
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        fileName: asset.fileName || `avatar-${Date.now()}.jpg`,
      });

      setAvatar(response.data.avatar || null);
      setMessage(response.message || "Avatar updated successfully.");
      const completionData = await getProfileCompletion();
      setCompletion(completionData.completionPercentage || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload avatar failed.");
    } finally {
      setUploadingAvatar(false);
    }
  }, []);

  const onRemoveAvatar = useCallback(async () => {
    const validationError = validateProfile(form);
    if (validationError) {
      setError(`Please complete required profile fields before removing avatar. ${validationError}`);
      return;
    }

    setUploadingAvatar(true);
    setError("");
    setMessage("");
    try {
      const response = await updateMyProfile(buildUpdatePayload({ avatar: null }));
      setAvatar(response.data.profile.avatar || null);
      setMessage("Avatar removed.");
      const completionData = await getProfileCompletion();
      setCompletion(completionData.completionPercentage || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove avatar failed.");
    } finally {
      setUploadingAvatar(false);
    }
  }, [buildUpdatePayload, form]);

  const onAvatarAction = useCallback(() => {
    Alert.alert("Avatar", "Choose an action", [
      { text: "Select Photo", onPress: onUploadAvatarFromLibrary },
      ...(avatar ? [{ text: "Remove Avatar", style: "destructive" as const, onPress: onRemoveAvatar }] : []),
      { text: "Cancel", style: "cancel" },
    ]);
  }, [avatar, onRemoveAvatar, onUploadAvatarFromLibrary]);

  const onSave = async () => {
    const validationError = validateProfile(form);
    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await updateMyProfile(buildUpdatePayload());
      setMessage(response.message || "Profile updated successfully.");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Profile update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#D0712B" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.keyboardRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>          
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerBrand}>HappyTails</Text>
        </View>

        <View style={styles.completionCard}>
          <View style={styles.completionTopRow}>
            <Text style={styles.completionLabel}>PROFILE COMPLETION</Text>
            <Text style={styles.completionValue}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarOuterRing}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={46} color="#A5723E" />
              </View>
            )}
            <Pressable style={styles.avatarEditFab} onPress={onAvatarAction} disabled={uploadingAvatar}>
              {uploadingAvatar ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Feather name="edit-3" size={15} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
          <Pressable onPress={onAvatarAction} disabled={uploadingAvatar}>
            <Text style={styles.uploadAvatarText}>Upload Avatar</Text>
          </Pressable>
          {avatar ? (
            <Pressable onPress={onRemoveAvatar} disabled={uploadingAvatar}>
              <Text style={styles.removeAvatarText}>Remove current avatar</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.formCard}>
          <View style={styles.rowTwoCols}>
            <View style={styles.col}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John"
                placeholderTextColor="#D09A67"
                value={form.firstName}
                onChangeText={(v) => onChange("firstName", v)}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                placeholderTextColor="#D09A67"
                value={form.lastName}
                onChangeText={(v) => onChange("lastName", v)}
              />
            </View>
          </View>

          <Text style={styles.label}>Phone</Text>
          <View style={styles.inputWithIconWrap}>
            <Feather name="phone" size={16} color="#D39A64" style={styles.leftIcon} />
            <TextInput
              style={[styles.input, styles.inputWithLeftIcon]}
              placeholder="+84 9xxxxxxxx"
              placeholderTextColor="#D09A67"
              keyboardType="phone-pad"
              value={form.tel}
              onChangeText={(v) => onChange("tel", v)}
            />
          </View>

          <View style={styles.rowTwoCols}>
            <View style={styles.col} ref={dobAnchorRef} collapsable={false}>
              <Text style={styles.label}>Date Of Birth</Text>
              <Pressable style={[styles.input, styles.dateDropdownBtn, form.dob && styles.dateDropdownBtnActive]} onPress={openDobPicker}>
                <Feather name="calendar" size={14} color={form.dob ? "#C16A36" : "#98A4B4"} />
                <Text style={[styles.dateDropdownText, form.dob && styles.dateDropdownTextActive]}>
                  {formatDateLabel(form.dob)}
                </Text>
                <Feather name="chevron-down" size={14} color="#A3AFBF" />
              </Pressable>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Gender</Text>
              <Pressable style={styles.inputWithIconWrap} onPress={() => setGenderModalVisible(true)}>
                <Text style={[styles.input, styles.pressInput]}>
                  {GENDER_OPTIONS.find((item) => item.value === form.gender)?.label || "Select"}
                </Text>
                <Feather name="chevron-down" size={17} color="#D39A64" style={styles.rightIcon} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell us about your furry friend..."
            placeholderTextColor="#D09A67"
            multiline
            numberOfLines={4}
            value={form.bio}
            onChangeText={(v) => onChange("bio", v)}
          />

          <Text style={styles.label}>Street</Text>
          <View style={styles.inputWithIconWrap}>
            <Feather name="map-pin" size={16} color="#D39A64" style={styles.leftIcon} />
            <TextInput
              style={[styles.input, styles.inputWithLeftIcon]}
              placeholder="123 Puppy Lane"
              placeholderTextColor="#D09A67"
              value={form.street}
              onChangeText={(v) => onChange("street", v)}
            />
          </View>
        </View>

        <Pressable style={styles.securityCard} onPress={() => navigation.navigate("ChangePassword")}>
          <View style={styles.securityIconWrap}>
            <Feather name="lock" size={18} color="#A75827" />
          </View>
          <View style={styles.securityTextWrap}>
            <Text style={styles.securityTitle}>Security</Text>
            <Text style={styles.securityDesc}>Update your password to keep your account secure</Text>
          </View>
          <Feather name="chevron-right" size={19} color="#BB7C4C" />
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.successText}>{message}</Text> : null}

        <Pressable style={[styles.saveButton, saving && styles.disabledButton]} onPress={onSave} disabled={saving}>
          <LinearGradient colors={["#B15A1A", "#EFA25F"]} start={{ x: 0, y: 0.4 }} end={{ x: 1, y: 0.6 }} style={styles.saveButtonGradient}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Profile</Text>}
          </LinearGradient>
        </Pressable>
      </ScrollView>

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
                    const isToday = isSameDay(cell.date, toDate(new Date().toISOString().slice(0, 10)));
                    const isOutOfRange = cell.date < minDobDate || cell.date > maxDobDate;

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
                  {form.dob ? (
                    <Pressable
                      style={styles.calendarTextBtn}
                      onPress={() => {
                        onChange("dob", "");
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
                    const isToday = isSameDay(cell.date, toDate(new Date().toISOString().slice(0, 10)));
                    const isOutOfRange = cell.date < minDobDate || cell.date > maxDobDate;

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
                  {form.dob ? (
                    <Pressable
                      style={styles.calendarTextBtn}
                      onPress={() => {
                        onChange("dob", "");
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

      <Modal
        visible={genderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGenderModalVisible(false)}
      >
        <Pressable style={styles.genderModalOverlay} onPress={() => setGenderModalVisible(false)}>
          <View style={styles.genderModalCard}>
            <Text style={styles.genderModalTitle}>Select Gender</Text>
            {GENDER_OPTIONS.map((item) => {
              const selected = form.gender === item.value;
              return (
                <Pressable
                  key={item.value}
                  style={[styles.genderOptionRow, selected && styles.genderOptionRowActive]}
                  onPress={() => {
                    onChange("gender", item.value);
                    setGenderModalVisible(false);
                  }}
                >
                  <Text style={[styles.genderOptionText, selected && styles.genderOptionTextActive]}>{item.label}</Text>
                  {selected ? <Feather name="check" size={16} color="#B9612D" /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: { flex: 1, backgroundColor: "#F6F1ED" },
  container: { flex: 1, backgroundColor: "#F6F1ED" },
  content: { paddingHorizontal: 16, paddingBottom: 36, gap: 12 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F6F1ED" },

  headerRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4E5D7",
  },
  headerTitle: { color: "#A24514", fontSize: 34, fontWeight: "800", marginLeft: 20 },
  headerBrand: { color: "#A24514", fontSize: 30, fontWeight: "900", marginRight: 20 },

  completionCard: {
    marginTop: 4,
    backgroundColor: "#FBF4ED",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F0E0D0",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  completionTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  completionLabel: { color: "#855528", fontSize: 13, fontWeight: "800", letterSpacing: 1.2 },
  completionValue: { color: "#A24514", fontSize: 28, fontWeight: "900" },
  progressTrack: {
    marginTop: 10,
    width: "100%",
    height: 12,
    borderRadius: 999,
    backgroundColor: "#F0DFCF",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#D6844C", borderRadius: 999 },

  avatarSection: {
    marginTop: 8,
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  avatarOuterRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#9E6237",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    position: "relative",
  },
  avatarImage: { width: 158, height: 158, borderRadius: 79, backgroundColor: "#ECD7C3" },
  avatarPlaceholder: {
    width: 158,
    height: 158,
    borderRadius: 79,
    backgroundColor: "#ECD7C3",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditFab: {
    position: "absolute",
    right: 6,
    bottom: 8,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#CE7A38",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8F4D20",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  uploadAvatarText: {
    marginTop: 6,
    fontSize: 18,
    color: "#A64A17",
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  removeAvatarText: { color: "#AD5D2C", fontSize: 13, fontWeight: "600" },

  formCard: {
    marginTop: 6,
    backgroundColor: "#F7EFE7",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F0DECE",
    padding: 14,
  },
  rowTwoCols: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  label: {
    marginTop: 12,
    marginBottom: 6,
    color: "#7A4A23",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  input: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0E2D4",
    paddingHorizontal: 18,
    color: "#9D6738",
    fontSize: 18,
    fontWeight: "500",
  },
  pressInput: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingRight: 48,
  },
  placeholderLike: { color: "#D09A67" },
  dateDropdownBtn: {
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E7D8C9",
    backgroundColor: "#F0E2D4",
    paddingHorizontal: 14,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  dateDropdownBtnActive: {
    borderColor: "#E5C5AA",
    backgroundColor: "#FAEFE4",
  },
  dateDropdownText: {
    flex: 1,
    color: "#D09A67",
    fontSize: 18,
    fontWeight: "500",
  },
  dateDropdownTextActive: {
    color: "#9D6738",
  },
  bioInput: {
    minHeight: 128,
    borderRadius: 24,
    textAlignVertical: "top",
    paddingTop: 14,
    fontSize: 17,
    lineHeight: 23,
  },
  inputWithIconWrap: { position: "relative", justifyContent: "center" },
  inputWithLeftIcon: { paddingLeft: 48 },
  leftIcon: { position: "absolute", left: 18, zIndex: 2 },
  rightIcon: { position: "absolute", right: 16, zIndex: 2 },

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

  securityCard: {
    marginTop: 2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEDBCB",
    backgroundColor: "#FFF9F3",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  securityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F4E4D4",
    alignItems: "center",
    justifyContent: "center",
  },
  securityTextWrap: { flex: 1 },
  securityTitle: { color: "#3F2A1C", fontSize: 16, fontWeight: "800" },
  securityDesc: { color: "#8B6B53", marginTop: 2, fontSize: 12, lineHeight: 18 },

  errorText: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  successText: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  saveButton: {
    marginTop: 6,
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#8E5428",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  saveButtonGradient: {
    minHeight: 62,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: { opacity: 0.7 },
  saveButtonText: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },

  genderModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(35, 24, 15, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  genderModalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    backgroundColor: "#FFF9F2",
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1E0D0",
    gap: 8,
  },
  genderModalTitle: { color: "#5B371D", fontSize: 17, fontWeight: "800" },
  genderOptionRow: {
    borderRadius: 12,
    backgroundColor: "#F3E4D6",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  genderOptionRowActive: { backgroundColor: "#FBEADB" },
  genderOptionText: { color: "#7E4F2B", fontWeight: "700", fontSize: 15 },
  genderOptionTextActive: { color: "#B9612D" },
});
