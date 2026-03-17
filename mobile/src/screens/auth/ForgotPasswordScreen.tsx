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
import { forgotPassword } from "../../api/modules/authApi";
import type { AuthStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

const ForgotPasswordSchema = Yup.object({
  email: Yup.string().email("Email khong hop le").required("Email la bat buoc"),
});

export function ForgotPasswordScreen({ navigation, route }: Props) {
  const [apiMessage, setApiMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [devResetToken, setDevResetToken] = useState("");

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

          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Nhap email de nhan reset token</Text>

          <Formik
            initialValues={{ email: route.params?.email || "" }}
            validationSchema={ForgotPasswordSchema}
            onSubmit={async (values, { setSubmitting }) => {
              setApiMessage("");
              setSuccessMessage("");
              setDevResetToken("");

              try {
                const result = await forgotPassword(values.email.trim());
                setSuccessMessage(result.message || "Da gui yeu cau reset password");

                if (result.devOnly?.resetToken) {
                  setDevResetToken(result.devOnly.resetToken);
                }
              } catch (error) {
                setApiMessage(error instanceof Error ? error.message : "Gui yeu cau that bai");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ handleChange, handleSubmit, values, errors, touched, isSubmitting }) => (
              <View style={styles.form}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={values.email}
                  onChangeText={handleChange("email")}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Enter your email"
                  placeholderTextColor="#94A3B8"
                />
                {touched.email && errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

                {apiMessage ? <Text style={styles.errorText}>{apiMessage}</Text> : null}
                {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

                <Pressable style={[styles.submitButton, isSubmitting && styles.disabled]} onPress={() => handleSubmit()} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send Reset Link</Text>}
                </Pressable>

                {devResetToken ? (
                  <View style={styles.devBox}>
                    <Text style={styles.devTitle}>Dev reset token:</Text>
                    <Text style={styles.devToken}>{devResetToken}</Text>
                    <Pressable
                      style={styles.goResetButton}
                      onPress={() => navigation.navigate("ResetPassword", { resetToken: devResetToken })}
                    >
                      <Text style={styles.goResetText}>Go to Reset Password</Text>
                    </Pressable>
                  </View>
                ) : null}
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
    backgroundColor: "#F8FAFC",
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
  errorText: { color: "#DC2626" },
  successText: { color: "#059669" },
  devBox: {
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    backgroundColor: "#FFFBEB",
    padding: 10,
    gap: 6,
  },
  devTitle: { color: "#92400E", fontWeight: "700" },
  devToken: { color: "#78350F" },
  goResetButton: {
    marginTop: 2,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#F59E0B",
  },
  goResetText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.65 },
});
