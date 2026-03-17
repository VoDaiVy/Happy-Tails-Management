import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getMyProfile, getProfileCompletion, updateMyProfile } from "../../api/modules/profileApi";

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
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
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: { textAlignVertical: "top", minHeight: 80 },
  saveButton: {
    marginTop: 14,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  disabledButton: { opacity: 0.65 },
  saveButtonText: { color: "#fff", fontWeight: "700" },
  errorText: { marginTop: 10, color: "#DC2626" },
  successText: { marginTop: 10, color: "#059669" },
});
