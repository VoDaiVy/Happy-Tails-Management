import { Formik } from "formik";
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Yup from "yup";
import { changePassword } from "../../api/modules/authApi";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";

const PasswordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,128}$/;

const ChangePasswordSchema = Yup.object({
  currentPassword: Yup.string().required("Current password is required"),
  newPassword: Yup.string()
    .matches(PasswordRule, "Password must be 8-128 characters, including uppercase, lowercase, number, and special character")
    .required("New password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords do not match")
    .required("Password confirmation is required"),
});

type Props = NativeStackScreenProps<AccountStackParamList, "ChangePassword">;

export function ChangePasswordScreen({ navigation }: Props) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { user, updateSessionTokens } = useAuth();

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheetContainer}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Change Password</Text>
              <Text style={styles.subtitle}>Update your password to secure your account</Text>
            </View>

            <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Feather name="x" size={16} color="#7B8EA4" />
            </Pressable>
          </View>

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
                setMessage(response.message || "Password changed successfully");
                resetForm();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to change password");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ handleBlur, handleChange, handleSubmit, values, errors, touched, isSubmitting }) => (
              <View style={styles.form}>
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    style={styles.input}
                    value={values.currentPassword}
                    onChangeText={handleChange("currentPassword")}
                    onBlur={handleBlur("currentPassword")}
                    secureTextEntry={!showCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor="#A99887"
                  />
                  <Pressable style={styles.visibilityButton} onPress={() => setShowCurrentPassword((prev) => !prev)}>
                    <Feather name={showCurrentPassword ? "eye-off" : "eye"} size={16} color="#A17859" />
                  </Pressable>
                </View>
                {touched.currentPassword && errors.currentPassword ? <Text style={styles.fieldError}>{errors.currentPassword}</Text> : null}

                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    style={styles.input}
                    value={values.newPassword}
                    onChangeText={handleChange("newPassword")}
                    onBlur={handleBlur("newPassword")}
                    secureTextEntry={!showNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#A99887"
                  />
                  <Pressable style={styles.visibilityButton} onPress={() => setShowNewPassword((prev) => !prev)}>
                    <Feather name={showNewPassword ? "eye-off" : "eye"} size={16} color="#A17859" />
                  </Pressable>
                </View>
                {touched.newPassword && errors.newPassword ? <Text style={styles.fieldError}>{errors.newPassword}</Text> : null}

                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    style={styles.input}
                    value={values.confirmPassword}
                    onChangeText={handleChange("confirmPassword")}
                    onBlur={handleBlur("confirmPassword")}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#A99887"
                  />
                  <Pressable style={styles.visibilityButton} onPress={() => setShowConfirmPassword((prev) => !prev)}>
                    <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={16} color="#A17859" />
                  </Pressable>
                </View>
                {touched.confirmPassword && errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}

                {error ? (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={15} color="#BA3C4B" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {message ? (
                  <View style={styles.successBox}>
                    <Feather name="check-circle" size={15} color="#2C8C4D" />
                    <Text style={styles.successText}>{message}</Text>
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.secondaryButton, isSubmitting && styles.disabledButton]}
                    onPress={() => navigation.goBack()}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.secondaryText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
                    onPress={() => handleSubmit()}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Update Password</Text>}
                  </Pressable>
                </View>
              </View>
            )}
          </Formik>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(26, 22, 17, 0.34)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    width: "100%",
    paddingHorizontal: 12,
    paddingBottom: 14,
    justifyContent: "flex-end",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E3CEB9",
    marginBottom: 8,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EDDCCB",
    backgroundColor: "#FFF8F1",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: "#5A3D24",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 24, fontWeight: "900", color: "#A24C1E" },
  subtitle: { marginTop: 2, color: "#7F6C5C", fontSize: 12.5 },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9DACC",
    backgroundColor: "#FFFDF9",
    alignItems: "center",
    justifyContent: "center",
  },
  form: { marginTop: 12, gap: 6 },
  label: {
    marginTop: 6,
    color: "#845734",
    fontWeight: "800",
    fontSize: 11.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  inputShell: {
    borderWidth: 1,
    borderColor: "#EADACB",
    borderRadius: 14,
    backgroundColor: "#FFFEFC",
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    color: "#4E3E30",
    fontSize: 14,
    paddingVertical: 10,
    paddingRight: 8,
  },
  visibilityButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7EEE4",
  },
  fieldError: {
    color: "#BC3A50",
    fontSize: 11,
    marginTop: 2,
  },
  errorBox: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0C5CB",
    backgroundColor: "#FFF1F3",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorText: { color: "#B83A4F", fontSize: 12, flex: 1 },
  successBox: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CDEDD8",
    backgroundColor: "#ECFAF1",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  successText: { color: "#2A7E46", fontSize: 12, flex: 1 },
  actionRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  secondaryButton: {
    minHeight: 44,
    minWidth: 102,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E8D7C7",
    backgroundColor: "#FFFDF9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryText: { color: "#876B54", fontSize: 13, fontWeight: "700" },
  primaryButton: {
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: "#D57741",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 148,
    paddingHorizontal: 16,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  disabledButton: { opacity: 0.65 },
});
