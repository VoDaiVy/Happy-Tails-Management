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
import { resendVerification, verifyEmail } from "../../api/modules/authApi";
import type { AuthStackParamList } from "../../navigation/types";

const VerifySchema = Yup.object({
  otp: Yup.string().matches(/^\d{6}$/, "OTP gom dung 6 chu so").required("OTP la bat buoc"),
});

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyOtp">;

export function VerifyOtpScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [apiMessage, setApiMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={30}
    >
      <View style={styles.backdrop} />
      <ScrollView contentContainerStyle={styles.centerWrap} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={[styles.paw, styles.pawTopLeft]}>*</Text>
          <Text style={[styles.paw, styles.pawRightMid]}>*</Text>

          <View style={styles.closeRow}>
            <Pressable
              style={styles.closeButton}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Quay lai"
            >
              <Text style={styles.closeText}>x</Text>
            </Pressable>
          </View>

          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>HT</Text>
          </View>

          <Text accessibilityRole="header" style={styles.title}>Join Our Family</Text>
          <Text style={styles.subtitle}>Create an account to get started</Text>

          <View style={styles.stepCard}>
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepHeaderLeft}>Step 2 of 2</Text>
              <Text style={styles.stepHeaderRight}>100%</Text>
            </View>
            <View style={styles.stepTrack}>
              <View style={styles.stepProgress} />
              <View style={styles.stepThumb}>
                <Text style={styles.stepThumbText}>HT</Text>
              </View>
            </View>
          </View>

          <View style={styles.formShell}>
            <View style={styles.mailIconWrap}>
              <Text style={styles.mailIconText}>[]</Text>
            </View>

            <Text style={styles.formTitle}>Verify Your Email</Text>
            <Text style={styles.formSubtitle}>We've sent a verification code to</Text>
            <Text style={styles.formEmail}>{email}</Text>

            <Formik
              initialValues={{ otp: "" }}
              validationSchema={VerifySchema}
              onSubmit={async (values, { setSubmitting }) => {
                setApiMessage("");
                setSuccessMessage("");
                try {
                  const response = await verifyEmail(email, values.otp);
                  setSuccessMessage(response.message || "Xac thuc thanh cong");
                  navigation.replace("Login");
                } catch (error) {
                  setApiMessage(error instanceof Error ? error.message : "Xac thuc that bai");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ handleChange, handleSubmit, values, errors, touched, isSubmitting }) => (
                <View style={styles.form}>
                  <Text style={styles.label}>Verification Code</Text>
                  <TextInput
                    style={styles.input}
                    value={values.otp}
                    onChangeText={handleChange("otp")}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#94A3B8"
                    accessibilityLabel="Nhap ma OTP 6 chu so"
                  />
                  {touched.otp && errors.otp ? <Text style={styles.error}>{errors.otp}</Text> : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Gui lai OTP"
                    disabled={isResending}
                    style={styles.resendButton}
                    onPress={async () => {
                      setApiMessage("");
                      setSuccessMessage("");
                      setIsResending(true);
                      try {
                        const response = await resendVerification(email);
                        setSuccessMessage(response.message || "Da gui lai OTP");
                      } catch (error) {
                        setApiMessage(error instanceof Error ? error.message : "Khong gui lai OTP duoc");
                      } finally {
                        setIsResending(false);
                      }
                    }}
                  >
                    {isResending ? <ActivityIndicator size="small" color="#F97316" /> : <Text style={styles.resendText}>Resend Code</Text>}
                  </Pressable>

                  {apiMessage ? <Text style={styles.errorCenter}>{apiMessage}</Text> : null}
                  {successMessage ? <Text style={styles.successCenter}>{successMessage}</Text> : null}

                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.backActionButton}
                      onPress={() => navigation.goBack()}
                      accessibilityRole="button"
                      accessibilityLabel="Quay lai"
                    >
                      <Text style={styles.backActionText}>Back</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Xac thuc OTP"
                      onPress={() => handleSubmit()}
                      disabled={isSubmitting}
                      style={({ pressed }) => [
                        styles.verifyButton,
                        pressed && styles.buttonPressed,
                        isSubmitting && styles.buttonDisabled,
                      ]}
                    >
                      {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyButtonText}>Verify</Text>}
                    </Pressable>
                  </View>

                  <Pressable onPress={() => navigation.replace("Login")} style={styles.linkRow}>
                    <Text style={styles.linkText}>
                      Already have an account? <Text style={styles.linkHighlight}>Log in</Text>
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
    backgroundColor: "#1F2937",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.56)",
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
    overflow: "hidden",
    position: "relative",
  },
  paw: {
    position: "absolute",
    fontSize: 30,
    opacity: 0.18,
    color: "#C7D3C8",
  },
  pawTopLeft: {
    top: 46,
    left: 28,
  },
  pawRightMid: {
    top: 126,
    right: 24,
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
    width: "100%",
    height: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 8,
  },
  stepThumb: {
    position: "absolute",
    right: 0,
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
  mailIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F7DCC8",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  mailIconText: {
    color: "#EA580C",
    fontWeight: "800",
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
  },
  formEmail: {
    textAlign: "center",
    marginTop: 2,
    color: "#F97316",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  form: {
    gap: 8,
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
    letterSpacing: 1,
    textAlign: "center",
  },
  resendButton: {
    alignSelf: "center",
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resendText: {
    color: "#F97316",
    fontWeight: "700",
    fontSize: 16,
  },
  actionRow: {
    marginTop: 4,
    flexDirection: "row",
    gap: 10,
  },
  backActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C8D0DA",
    backgroundColor: "#EFF2F6",
    alignItems: "center",
  },
  backActionText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 16,
  },
  verifyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F5B88F",
    alignItems: "center",
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonPressed: { opacity: 0.95 },
  buttonDisabled: { opacity: 0.6 },
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
    fontSize: 33,
    lineHeight: 34,
  },
  error: { marginTop: 3, color: "#DC2626", fontSize: 12 },
  errorCenter: { marginTop: 3, color: "#DC2626", fontSize: 13, textAlign: "center" },
  successCenter: { marginTop: 3, color: "#059669", fontSize: 13, textAlign: "center" },
});
