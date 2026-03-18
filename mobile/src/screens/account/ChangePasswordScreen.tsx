import { Formik } from "formik";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Yup from "yup";
import { changePassword } from "../../api/modules/authApi";
import { useAuth } from "../../context/AuthContext";

const PasswordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,128}$/;

const ChangePasswordSchema = Yup.object({
  currentPassword: Yup.string().required("Mat khau hien tai la bat buoc"),
  newPassword: Yup.string()
    .matches(PasswordRule, "Mat khau 8-128 ky tu, gom hoa/thuong/so/ky tu dac biet")
    .required("Mat khau moi la bat buoc"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Mat khau nhap lai khong khop")
    .required("Xac nhan mat khau la bat buoc"),
});

export function ChangePasswordScreen() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { user, updateSessionTokens } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Password</Text>
      <Text style={styles.subtitle}>Cap nhat mat khau de bao mat tai khoan</Text>

      <Formik
        initialValues={{ currentPassword: "", newPassword: "", confirmPassword: "" }}
        validationSchema={ChangePasswordSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          setError("");
          setMessage("");

          try {
            const response = await changePassword(values.currentPassword, values.newPassword);
            if (user) {
              await updateSessionTokens({
                user,
                accessToken: response.data.tokens.accessToken,
                refreshToken: response.data.tokens.refreshToken,
              });
            }
            setMessage(response.message || "Doi mat khau thanh cong");
            resetForm();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Doi mat khau that bai");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ handleChange, handleSubmit, values, errors, touched, isSubmitting }) => (
          <View style={styles.form}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={values.currentPassword}
              onChangeText={handleChange("currentPassword")}
              secureTextEntry
              placeholder="Nhap mat khau hien tai"
              placeholderTextColor="#94A3B8"
            />
            {touched.currentPassword && errors.currentPassword ? <Text style={styles.error}>{errors.currentPassword}</Text> : null}

            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={values.newPassword}
              onChangeText={handleChange("newPassword")}
              secureTextEntry
              placeholder="Nhap mat khau moi"
              placeholderTextColor="#94A3B8"
            />
            {touched.newPassword && errors.newPassword ? <Text style={styles.error}>{errors.newPassword}</Text> : null}

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={values.confirmPassword}
              onChangeText={handleChange("confirmPassword")}
              secureTextEntry
              placeholder="Nhap lai mat khau moi"
              placeholderTextColor="#94A3B8"
            />
            {touched.confirmPassword && errors.confirmPassword ? <Text style={styles.error}>{errors.confirmPassword}</Text> : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.success}>{message}</Text> : null}

            <Pressable style={[styles.submitButton, isSubmitting && styles.disabled]} onPress={() => handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Update Password</Text>}
            </Pressable>
          </View>
        )}
      </Formik>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1EC", padding: 16 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { marginTop: 4, color: "#64748B" },
  form: { marginTop: 14, gap: 8 },
  label: { color: "#334155", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#0F172A",
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#D87D4A",
    alignItems: "center",
    paddingVertical: 12,
  },
  submitText: { color: "#fff", fontWeight: "700" },
  error: { color: "#DC2626" },
  success: { color: "#059669" },
  disabled: { opacity: 0.65 },
});
