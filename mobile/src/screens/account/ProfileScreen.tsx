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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getMyProfile, getProfileCompletion, updateMyProfile, updateProfileAvatar } from "../../api/modules/profileApi";

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

export function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(initialForm);

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
      setError(e instanceof Error ? e.message : "Khong tai duoc profile");
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
      setError("Ban can cap quyen thu vien anh de cap nhat avatar");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];

    setUploadingAvatar(true);
    try {
      const response = await updateProfileAvatar({
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        fileName: asset.fileName || `avatar-${Date.now()}.jpg`,
      });

      setAvatar(response.data.avatar);
      setMessage(response.message || "Cap nhat avatar thanh cong");
      const completionData = await getProfileCompletion();
      setCompletion(completionData.completionPercentage || completion);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload avatar that bai");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSave = async () => {
    if (!form.firstName || !form.lastName || !form.tel || !form.dob || !form.gender) {
      setError("First name, last name, phone, dob, gender la bat buoc");
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

      setMessage(response.message || "Cap nhat profile thanh cong");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cap nhat profile that bai");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.completionCard}>
        <Text style={styles.completionTitle}>Profile Completion</Text>
        <Text style={styles.completionValue}>{completion}%</Text>
      </View>

      <View style={styles.avatarCard}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>No Avatar</Text>
          </View>
        )}
        <Pressable style={[styles.avatarButton, uploadingAvatar && styles.disabledButton]} onPress={onPickAndUploadAvatar} disabled={uploadingAvatar}>
          {uploadingAvatar ? <ActivityIndicator color="#fff" /> : <Text style={styles.avatarButtonText}>Chon va upload avatar</Text>}
        </Pressable>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>First Name</Text>
        <TextInput style={styles.input} value={form.firstName} onChangeText={(v) => onChange("firstName", v)} />

        <Text style={styles.label}>Last Name</Text>
        <TextInput style={styles.input} value={form.lastName} onChangeText={(v) => onChange("lastName", v)} />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={form.tel} onChangeText={(v) => onChange("tel", v)} keyboardType="phone-pad" />

        <Text style={styles.label}>Date Of Birth (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={form.dob} onChangeText={(v) => onChange("dob", v)} placeholder="2000-12-31" />

        <Text style={styles.label}>Gender (male/female/other)</Text>
        <TextInput style={styles.input} value={form.gender} onChangeText={(v) => onChange("gender", v)} />

        <Text style={styles.label}>Bio</Text>
        <TextInput style={[styles.input, styles.multiline]} value={form.bio} onChangeText={(v) => onChange("bio", v)} multiline numberOfLines={3} />

        <Text style={styles.label}>Street</Text>
        <TextInput style={styles.input} value={form.street} onChangeText={(v) => onChange("street", v)} />

        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} value={form.city} onChangeText={(v) => onChange("city", v)} />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.successText}>{message}</Text> : null}

        <Pressable style={[styles.saveButton, saving && styles.disabledButton]} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Profile</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1EC" },
  content: { padding: 16, gap: 12 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  completionCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completionTitle: { fontSize: 15, color: "#334155", fontWeight: "600" },
  completionValue: { fontSize: 24, color: "#0F172A", fontWeight: "800" },
  avatarCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 14,
    alignItems: "center",
    gap: 12,
  },
  avatarImage: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  avatarFallback: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "#475569", fontWeight: "700" },
  avatarButton: {
    backgroundColor: "#0D9488",
    borderRadius: 10,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  avatarButtonText: { color: "#fff", fontWeight: "700" },
  formCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  label: { marginTop: 10, marginBottom: 5, color: "#334155", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#F4F1EC",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: { textAlignVertical: "top", minHeight: 80 },
  saveButton: {
    marginTop: 14,
    backgroundColor: "#D87D4A",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  disabledButton: { opacity: 0.65 },
  saveButtonText: { color: "#fff", fontWeight: "700" },
  errorText: { marginTop: 10, color: "#DC2626" },
  successText: { marginTop: 10, color: "#059669" },
});
