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
import { register } from "../../api/modules/authApi";
import type { AuthStackParamList } from "../../navigation/types";

const PasswordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,128}$/;

const RegisterSchema = Yup.object({
  fullName: Yup.string().trim().min(2, "Full name must be at least 2 characters").max(100, "Full name must be at most 100 characters").required("Full name is required"),
  email: Yup.string().email("Invalid email format").required("Email is required"),
  password: Yup.string()
    .matches(PasswordRule, "Password must be 8-128 characters, including uppercase, lowercase, number, and special character")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Password confirmation is required"),
});

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const [apiMessage, setApiMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={30}
    >
    
      <ScrollView contentContainerStyle={styles.centerWrap} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.closeRow}>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.closeText}>←</Text>
            </Pressable>
          </View>

          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>HT</Text>
          </View>

          <Text accessibilityRole="header" style={styles.title}>Join Our Family</Text>
          <Text style={styles.subtitle}>Create an account to get started</Text>

          <View style={styles.stepCard}>
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepHeaderLeft}>Step 1 of 2</Text>
              <Text style={styles.stepHeaderRight}>50%</Text>
            </View>
            <View style={styles.stepTrack}>
              <View style={styles.stepProgress} />
              <View style={styles.stepThumb}>
                <Text style={styles.stepThumbText}>HT</Text>
              </View>
            </View>
          </View>

          <View style={styles.formShell}>
            <Text style={styles.formTitle}>Account Details</Text>
            <Text style={styles.formSubtitle}>Tell us about yourself</Text>

            <Formik
              initialValues={{ fullName: "", email: "", password: "", confirmPassword: "" }}
              validationSchema={RegisterSchema}
              onSubmit={async (values, { setSubmitting }) => {
                setApiMessage("");
                setSuccessMessage("");

                try {
                  const response = await register({
                    name: values.fullName.trim(),
                    email: values.email.trim(),
                    password: values.password,
                  });

                  setSuccessMessage(response.message || "Registration successful");
                  navigation.navigate("VerifyOtp", {
                    email: values.email.trim(),
                    canAutoLogin: false,
                  });
                } catch (error) {
                  setApiMessage(error instanceof Error ? error.message : "Registration failed");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ handleChange, handleSubmit, values, errors, touched, isSubmitting }) => (
                <View style={styles.form}>
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldCol}>
                      <Text style={styles.label}>Full Name</Text>
                      <TextInput
                        style={styles.input}
                        value={values.fullName}
                        onChangeText={handleChange("fullName")}
                        placeholder="Enter your full name"
                        placeholderTextColor="#94A3B8"
                        accessibilityLabel="Enter full name"
                      />
                      {touched.fullName && errors.fullName ? <Text style={styles.error}>{errors.fullName}</Text> : null}
                    </View>

                    <View style={styles.fieldCol}>
                      <Text style={styles.label}>Email Address</Text>
                      <TextInput
                        style={styles.input}
                        value={values.email}
                        onChangeText={handleChange("email")}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="Enter your email"
                        placeholderTextColor="#94A3B8"
                        accessibilityLabel="Enter registration email"
                      />
                      {touched.email && errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
                    </View>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldCol}>
                      <Text style={styles.label}>Password</Text>
                      <View style={styles.passwordWrap}>
                        <TextInput
                          style={styles.passwordInput}
                          value={values.password}
                          onChangeText={handleChange("password")}
                          secureTextEntry={!showPassword}
                          placeholder="Enter your password"
                          placeholderTextColor="#94A3B8"
                          accessibilityLabel="Enter password"
                        />
                        <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
                          <Text style={styles.eyeText}>o</Text>
                        </Pressable>
                      </View>
                      {touched.password && errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
                    </View>

                    <View style={styles.fieldCol}>
                      <Text style={styles.label}>Confirm Password</Text>
                      <View style={styles.passwordWrap}>
                        <TextInput
                          style={styles.passwordInput}
                          value={values.confirmPassword}
                          onChangeText={handleChange("confirmPassword")}
                          secureTextEntry={!showConfirmPassword}
                          placeholder="Confirm your password"
                          placeholderTextColor="#94A3B8"
                          accessibilityLabel="Re-enter password"
                        />
                        <Pressable onPress={() => setShowConfirmPassword((prev) => !prev)} style={styles.eyeButton}>
                          <Text style={styles.eyeText}>o</Text>
                        </Pressable>
                      </View>
                      {touched.confirmPassword && errors.confirmPassword ? <Text style={styles.error}>{errors.confirmPassword}</Text> : null}
                    </View>
                  </View>

                  {apiMessage ? <Text style={styles.errorCenter}>{apiMessage}</Text> : null}
                  {successMessage ? <Text style={styles.successCenter}>{successMessage}</Text> : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sign Up"
                    onPress={() => handleSubmit()}
                    disabled={isSubmitting}
                    style={({ pressed }) => [
                      styles.button,
                      pressed && styles.buttonPressed,
                      isSubmitting && styles.buttonDisabled,
                    ]}
                  >
                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
                  </Pressable>

                  <Pressable onPress={() => navigation.navigate("Login")} style={styles.linkRow}>
                    <Text style={styles.linkText}>
                      Already have an account? <Text style={styles.linkHighlight}>Sign in</Text>
                    </Text>
                  </Pressable>
                </View>
              )}
            </Formik>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FB923C",
  },

  centerWrap: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#F4F1EC",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E6E1D8",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  closeRow: {
    alignItems: "flex-end",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DEE3EA",
    backgroundColor: "#F4F1EC",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  closeText: {
    fontSize: 20,
    lineHeight: 20,
    color: "#64748B",
    fontWeight: "600",
    marginTop: -1,
  },
  logoWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FB923C",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -4,
    marginBottom: 10,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  title: {
    textAlign: "center",
    fontSize: 48,
    lineHeight: 50,
    fontWeight: "800",
    color: "#1E293B",
  },
  subtitle: {
    marginTop: 2,
    marginBottom: 16,
    textAlign: "center",
    color: "#64748B",
    fontSize: 15,
  },
  stepCard: {
    borderWidth: 1,
    borderColor: "#DCE2EA",
    borderRadius: 14,
    backgroundColor: "#F4F1EC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepHeaderLeft: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  stepHeaderRight: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
  },
  stepTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    position: "relative",
  },
  stepProgress: {
    width: "50%",
    height: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 8,
  },
  stepThumb: {
    position: "absolute",
    left: "50%",
    marginLeft: -12,
    top: -7,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FB923C",
    alignItems: "center",
    justifyContent: "center",
  },
  stepThumbText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  formShell: {
    borderWidth: 1,
    borderColor: "#DDE3EB",
    borderRadius: 16,
    backgroundColor: "#F4F1EC",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  formTitle: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
  },
  formSubtitle: {
    textAlign: "center",
    marginTop: 2,
    color: "#64748B",
    fontSize: 16,
    marginBottom: 8,
  },
  form: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },
  fieldCol: {
    flex: 1,
  },
  label: {
    marginTop: 4,
    marginBottom: 4,
    color: "#334155",
    fontWeight: "600",
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CED6E0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#F4F1EC",
    color: "#0F172A",
    fontSize: 16,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CED6E0",
    borderRadius: 14,
    backgroundColor: "#F4F1EC",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#0F172A",
    fontSize: 16,
  },
  eyeButton: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "700",
  },
  button: {
    marginTop: 6,
    backgroundColor: "#FB923C",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#FB923C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonPressed: { opacity: 0.95 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 32, lineHeight: 34, fontWeight: "700" },
  linkRow: {
    marginTop: 8,
    alignItems: "center",
  },
  linkText: {
    color: "#475569",
    fontSize: 15,
  },
  linkHighlight: {
    color: "#F97316",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 34,
  },
  error: { marginTop: 3, color: "#DC2626", fontSize: 12 },
  errorCenter: { marginTop: 3, color: "#DC2626", fontSize: 13, textAlign: "center" },
  successCenter: { marginTop: 3, color: "#059669", fontSize: 13, textAlign: "center" },
});
