import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Formik } from "formik";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Yup from "yup";
import { resetPassword } from "../../api/modules/authApi";
import type { AuthStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

const PasswordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,128}$/;

const ResetSchema = Yup.object({
  resetToken: Yup.string().trim().required("Reset token la bat buoc"),
  password: Yup.string()
    .matches(PasswordRule, "Password must be 8-128 characters, including uppercase, lowercase, number, and special character")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Password confirmation is required"),
});

export function ResetPasswordScreen({ navigation, route }: Props) {
  const [apiMessage, setApiMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={30}
    >
      <ScrollView contentContainerStyle={styles.centerWrap} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </Pressable>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter reset token and new password</Text>

          <Formik
            initialValues={{
              resetToken: route.params?.resetToken || "",
              password: "",
              confirmPassword: "",
            }}
            validationSchema={ResetSchema}
            onSubmit={async (values, { setSubmitting, resetForm }) => {
              setApiMessage("");
              setSuccessMessage("");
              try {
                const result = await resetPassword(values.resetToken.trim(), values.password);
                setSuccessMessage(result.message || "Password reset successful");
                resetForm({ values: { resetToken: values.resetToken.trim(), password: "", confirmPassword: "" } });
              } catch (error) {
                setApiMessage(error instanceof Error ? error.message : "Password reset failed");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ handleChange, handleSubmit, values, errors, touched, isSubmitting }) => (
              <View style={styles.form}>
                <Text style={styles.label}>Reset Token</Text>
                <TextInput
                  style={styles.input}
                  value={values.resetToken}
                  onChangeText={handleChange("resetToken")}
                  autoCapitalize="none"
                  placeholder="Paste reset token"
                  placeholderTextColor="#94A3B8"
                />
                {touched.resetToken && errors.resetToken ? <Text style={styles.errorText}>{errors.resetToken}</Text> : null}

                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={values.password}
                  onChangeText={handleChange("password")}
                  secureTextEntry
                  placeholder="Enter new password"
                  placeholderTextColor="#94A3B8"
                />
                {touched.password && errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={values.confirmPassword}
                  onChangeText={handleChange("confirmPassword")}
                  secureTextEntry
                  placeholder="Confirm new password"
                  placeholderTextColor="#94A3B8"
                />
                {touched.confirmPassword && errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

                {apiMessage ? <Text style={styles.errorText}>{apiMessage}</Text> : null}
                {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

                <Pressable style={[styles.submitButton, isSubmitting && styles.disabled]} onPress={() => handleSubmit()} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Reset Password</Text>}
                </Pressable>

                <Pressable style={styles.loginButton} onPress={() => navigation.replace("Login")}>
                  <Text style={styles.loginText}>Back to Login</Text>
                </Pressable>
              </View>
            )}
          </Formik>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FB923C" },
  centerWrap: { flexGrow: 1, justifyContent: "center", padding: 16 },
  card: {
    backgroundColor: "#F4F1EC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E6E1D8",
    padding: 18,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  backText: { fontSize: 18, color: "#334155", fontWeight: "700" },
  title: { marginTop: 14, fontSize: 30, fontWeight: "800", color: "#1E293B" },
  subtitle: { marginTop: 4, color: "#64748B" },
  form: { marginTop: 14, gap: 8 },
  label: { color: "#334155", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#CED6E0",
    borderRadius: 12,
    backgroundColor: "#F4F1EC",
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  submitButton: {
    marginTop: 6,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FB923C",
  },
  submitText: { color: "#fff", fontWeight: "700" },
  loginButton: {
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  loginText: { color: "#334155", fontWeight: "700" },
  errorText: { color: "#DC2626" },
  successText: { color: "#059669" },
  disabled: { opacity: 0.65 },
});
