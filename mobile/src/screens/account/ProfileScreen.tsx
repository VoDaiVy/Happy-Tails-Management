import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";

import { getMyProfile, getProfileCompletion, updateMyProfile, updateProfileAvatar } from "../../api/modules/profileApi";
import { changePassword } from "../../api/modules/authApi";

interface ProfileFormState {
  firstName: string;
  lastName: string;
  tel: string;
  dob: string;
  gender: string;
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

const COLORS = {
  bg: "#FFF9F5",
  inputBg: "#FFF1E6",
  primary: "#D47741",
  primaryDark: "#B05D2E",
  primaryLight: "#EEA67B",
  textHeader: "#4A2F20",
  textBody: "#7A5A46",
  textLabel: "#A17E66",
  textInput: "#4A2F20",
  placeholder: "#CFB4A2",
  white: "#FFFFFF",
  error: "#E56060",
  success: "#4CAF50",
  barTrack: "#FEE2D1",
};

const GENDER_OPTIONS = {
  male: "Male",
  female: "Female",
  other: "Other",
} as Record<string, string>;

export function ProfileScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(initialForm);

  // Pickers Modals Native State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  // Password Modal
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", new: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [profileData, completionData] = await Promise.all([
        getMyProfile(),
        getProfileCompletion(),
      ]);

      setCompletion(completionData.completionPercentage || profileData.completionPercentage || 0);
      setAvatar(profileData.profile?.avatar || null);
      setForm({
        firstName: profileData.profile?.firstName || "",
        lastName: profileData.profile?.lastName || "",
        tel: profileData.profile?.tel || "",
        dob: profileData.profile?.dob ? String(profileData.profile.dob).slice(0, 10) : "",
        gender: profileData.profile?.gender || "male",
        bio: profileData.profile?.bio || "",
        street: profileData.profile?.address?.street || "",
        city: profileData.profile?.address?.city || "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot load profile data.");
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

  const onPickAndUploadAvatar = async () => {
    setError("");
    setMessage("");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Camera roll permissions are required to upload an avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    setUploadingAvatar(true);
    try {
      const response = await updateProfileAvatar({
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        fileName: asset.fileName || `avatar-${Date.now()}.jpg`,
      });

      setAvatar(response.data.avatar);
      setMessage("Avatar updated successfully.");
      const completionData = await getProfileCompletion();
      setCompletion(completionData.completionPercentage || completion);

      // Auto clear message after few seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Avatar upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      onChange("dob", selectedDate.toISOString().split("T")[0]);
    }
  };

  const onSave = async () => {
    if (!form.firstName || !form.lastName || !form.tel || !form.dob || !form.gender) {
      setError("First name, last name, phone, date of birth, and gender are required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await updateMyProfile({
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
      });

      setMessage("Profile saved successfully.");
      await loadData();

      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    setPwError("");
    if (!pwForm.current || !pwForm.new || !pwForm.confirm) {
      setPwError("Please fill out all password fields.");
      return;
    }
    if (pwForm.new !== pwForm.confirm) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwLoading(true);
    try {
      await changePassword(pwForm.current, pwForm.new);
      Alert.alert("Success", "Password changed successfully!");
      setPwModal(false);
      setPwForm({ current: "", new: "", confirm: "" });
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Password change failed.");
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerBox]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {navigation.canGoBack() && (
              <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Feather name="arrow-left" size={20} color={COLORS.primary} />
              </Pressable>
            )}
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
        </View>

        {/* Completion */}
        <View style={styles.completionContainer}>
          <View style={styles.completionHeader}>
            <Text style={styles.completionLabel}>PROFILE COMPLETION</Text>
            <Text style={styles.completionPercent}>{completion}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${completion}%` }]} />
          </View>
        </View>

        {/* Avatar Area */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Feather name="user" size={42} color={COLORS.primaryLight} />
              </View>
            )}
            <Pressable style={styles.editAvatarBtn} onPress={onPickAndUploadAvatar} disabled={uploadingAvatar}>
              {uploadingAvatar ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="edit-2" size={14} color="#FFF" />}
            </Pressable>
          </View>
          <Pressable onPress={onPickAndUploadAvatar}>
            <Text style={styles.uploadText}>UPLOAD AVATAR</Text>
          </Pressable>
        </View>

        {/* Global Feedback */}
        {error ? <Text style={[styles.infoText, { color: COLORS.error }]}>{error}</Text> : null}
        {message ? <Text style={[styles.infoText, { color: COLORS.success }]}>{message}</Text> : null}

        {/* Form */}
        <View style={styles.formSection}>
          <View style={styles.formRow}>
            <View style={styles.inputGrpHalf}>
              <Text style={styles.inputLabel}>First Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.inputText}
                  value={form.firstName}
                  onChangeText={(v) => onChange("firstName", v)}
                  placeholder="John"
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>
            </View>
            <View style={styles.inputGrpHalf}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.inputText}
                  value={form.lastName}
                  onChangeText={(v) => onChange("lastName", v)}
                  placeholder="Doe"
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGrp}>
            <Text style={styles.inputLabel}>Phone</Text>
            <View style={styles.inputContainer}>
              <Feather name="phone" size={16} color={COLORS.primaryLight} style={styles.inputIconLeft} />
              <TextInput
                style={styles.inputText}
                value={form.tel}
                onChangeText={(v) => onChange("tel", v)}
                keyboardType="phone-pad"
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.inputGrpHalf}>
              <Text style={styles.inputLabel}>Date of Birth</Text>
              <Pressable style={styles.inputContainer} onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.inputText, !form.dob && { color: COLORS.placeholder }]}>
                  {form.dob || "MM/DD/YYYY"}
                </Text>
                <Feather name="calendar" size={16} color={COLORS.primaryLight} />
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={form.dob ? new Date(form.dob) : new Date(2000, 0, 1)}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}
            </View>

            <View style={styles.inputGrpHalf}>
              <Text style={styles.inputLabel}>Gender</Text>
              <Pressable style={styles.inputContainer} onPress={() => setShowGenderPicker(true)}>
                <Text style={styles.inputText}>{GENDER_OPTIONS[form.gender] || "Select"}</Text>
                <Feather name="chevron-down" size={16} color={COLORS.primaryLight} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGrp}>
            <Text style={styles.inputLabel}>Bio</Text>
            <View style={styles.textareaContainer}>
              <TextInput
                style={styles.textarea}
                value={form.bio}
                onChangeText={(v) => onChange("bio", v)}
                multiline
                placeholder="Tell us about your furry friends..."
                placeholderTextColor={COLORS.placeholder}
              />
            </View>
          </View>

          <View style={styles.inputGrp}>
            <Text style={styles.inputLabel}>Location / Street</Text>
            <View style={styles.inputContainer}>
              <Feather name="map-pin" size={16} color={COLORS.primaryLight} style={styles.inputIconLeft} />
              <TextInput
                style={styles.inputText}
                value={form.street}
                onChangeText={(v) => onChange("street", v)}
                placeholder="123 Puppy Lane"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.securitySection}>
          <Text style={styles.securityTitle}>Security</Text>
          <Pressable style={styles.changePasswordCard} onPress={() => setPwModal(true)}>
            <View style={styles.changePasswordLeft}>
              <View style={styles.changePasswordIconBox}>
                <Feather name="lock" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.changePasswordTitle}>Change Password</Text>
                <Text style={styles.changePasswordDesc}>Update your password to keep your account secure.</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.primaryLight} />
          </Pressable>
        </View>

        {/* Save Action */}
        <View style={styles.saveBtnBox}>
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={onSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save Profile</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Gender Selection Modal / ActionSheet */}
      <Modal visible={showGenderPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.actionSheet}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            <Text style={styles.modalDesc}>Choose how you identify yourself.</Text>
            
            {Object.keys(GENDER_OPTIONS).map((key) => (
              <Pressable
                key={key}
                style={styles.modalOptionBtn}
                onPress={() => {
                  onChange("gender", key);
                  setShowGenderPicker(false);
                }}
              >
                <Text style={[styles.modalOptionText, form.gender === key && styles.modalOptionTextActive]}>
                  {GENDER_OPTIONS[key]}
                </Text>
                {form.gender === key && <Feather name="check" size={20} color={COLORS.primary} />}
              </Pressable>
            ))}

            <Pressable style={styles.modalCancelBtn} onPress={() => setShowGenderPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={pwModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
          <View style={[styles.modalOverlay, { justifyContent: "center" }]}>
            <View style={[styles.actionSheet, { borderRadius: 32, marginHorizontal: 20 }]}>
              <Text style={styles.modalTitle}>Update Password</Text>
              <Text style={styles.modalDesc}>Secure your account with a new password.</Text>
              
              {pwError ? <Text style={[styles.infoText, { color: COLORS.error, marginTop: -10, marginBottom: 16 }]}>{pwError}</Text> : null}

              <View style={styles.pwInputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={[styles.inputContainer, { backgroundColor: COLORS.white }]}>
                  <TextInput
                    style={styles.inputText}
                    secureTextEntry
                    value={pwForm.current}
                    onChangeText={(t) => setPwForm({ ...pwForm, current: t })}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.placeholder}
                  />
                </View>
              </View>

              <View style={styles.pwInputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={[styles.inputContainer, { backgroundColor: COLORS.white }]}>
                  <TextInput
                    style={styles.inputText}
                    secureTextEntry
                    value={pwForm.new}
                    onChangeText={(t) => setPwForm({ ...pwForm, new: t })}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.placeholder}
                  />
                </View>
              </View>

              <View style={styles.pwInputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={[styles.inputContainer, { backgroundColor: COLORS.white }]}>
                  <TextInput
                    style={styles.inputText}
                    secureTextEntry
                    value={pwForm.confirm}
                    onChangeText={(t) => setPwForm({ ...pwForm, confirm: t })}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.placeholder}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelBtn}
                  disabled={pwLoading}
                  onPress={() => {
                    setPwModal(false);
                    setPwError("");
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSubmitBtn} disabled={pwLoading} onPress={onChangePassword}>
                  {pwLoading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.modalSubmitText}>Confirm</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centerBox: { justifyContent: "center", alignItems: "center" },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.textHeader,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.primary,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  completionContainer: {
    marginBottom: 36,
  },
  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  completionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textLabel,
    letterSpacing: 1.2,
  },
  completionPercent: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textHeader,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: COLORS.barTrack,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  avatarWrapper: {
    position: "relative",
    width: 124,
    height: 124,
    marginBottom: 14,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 62,
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 62,
    backgroundColor: COLORS.inputBg,
    borderWidth: 4,
    borderColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: -2,
    right: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.5,
    textDecorationLine: "underline",
    textDecorationColor: COLORS.primaryLight,
  },
  formSection: {
    gap: 22,
  },
  formRow: {
    flexDirection: "row",
    gap: 16,
  },
  inputGrpHalf: {
    flex: 1,
  },
  inputGrp: {
    width: "100%",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textLabel,
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    minHeight: 58,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textInput,
    paddingVertical: 14,
  },
  inputIconLeft: {
    marginRight: 10,
  },
  textareaContainer: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    minHeight: 120,
  },
  textarea: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textInput,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  securitySection: {
    marginTop: 40,
    marginBottom: 10,
  },
  securityTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.textHeader,
    marginBottom: 16,
  },
  changePasswordCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  changePasswordLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  changePasswordIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  changePasswordTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textHeader,
    marginBottom: 4,
  },
  changePasswordDesc: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textLabel,
    maxWidth: 200,
    lineHeight: 18,
  },
  saveBtnBox: {
    marginTop: 40,
    marginBottom: 30,
  },
  saveBtn: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  infoText: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 16,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    backgroundColor: COLORS.inputBg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textHeader,
    textAlign: "center",
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textBody,
    textAlign: "center",
    marginBottom: 28,
  },
  modalOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textBody,
  },
  modalOptionTextActive: {
    color: COLORS.primary,
  },
  pwInputGroup: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
  },
  modalCancelText: {
    color: COLORS.textBody,
    fontSize: 16,
    fontWeight: "800",
  },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSubmitText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },
});
