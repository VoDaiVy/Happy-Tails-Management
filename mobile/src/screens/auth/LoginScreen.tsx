import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Formik } from "formik";
import { useEffect, useState } from "react";
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
import { env } from "../../config/env";
import { useAuth } from "../../context/AuthContext";
import type { AuthStackParamList } from "../../navigation/types";

WebBrowser.maybeCompleteAuthSession();

const LoginSchema = Yup.object({
  email: Yup.string().email("Email khong hop le").required("Email la bat buoc"),
  password: Yup.string().required("Mat khau la bat buoc"),
});

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login, loginWithGoogle } = useAuth();
  const [apiMessage, setApiMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const [googleRequest, googleResponse, promptGoogleLogin] = Google.useIdTokenAuthRequest({
    clientId: env.googleWebClientId,
    androidClientId: env.googleAndroidClientId || undefined,
    iosClientId: env.googleIosClientId || undefined,
  });

  useEffect(() => {
    const runGoogleAuth = async () => {
      if (googleResponse?.type !== "success") {
        if (googleResponse?.type === "error") {
          setApiMessage("Google login that bai. Vui long thu lai.");
        }
        return;
      }

      const idToken = googleResponse.params?.id_token;
      if (!idToken) {
        setApiMessage("Khong lay duoc Google ID token.");
        return;
      }

      setGoogleSubmitting(true);
      setApiMessage("");
      try {
        await loginWithGoogle(idToken);
      } catch (error) {
        setApiMessage(error instanceof Error ? error.message : "Dang nhap Google that bai");
      } finally {
        setGoogleSubmitting(false);
      }
    };

    void runGoogleAuth();
  }, [googleResponse, loginWithGoogle]);

  const onGooglePress = async () => {
    if (!env.googleWebClientId) {
      setApiMessage("Thieu EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID trong file .env");
      return;
    }

    setApiMessage("");
    await promptGoogleLogin({
      showInRecents: true,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={30}
    >
      <ScrollView contentContainerStyle={styles.centerWrap} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Pressable style={styles.backButton} onPress={() => navigation.navigate("Landing")}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>

          <Text style={[styles.paw, styles.pawTopLeft]}>🐾</Text>
          <Text style={[styles.paw, styles.pawRightMid]}>🐾</Text>
          <Text style={[styles.paw, styles.pawBottomMid]}>🐾</Text>
          <Text style={[styles.paw, styles.pawBottomLeft]}>🐾</Text>       

          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>🐾</Text>
          </View>

          <Text accessibilityRole="header" style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Log in to care for your furry friends</Text>

          <Formik
            initialValues={{ email: "", password: "" }}
            validationSchema={LoginSchema}
            onSubmit={async (values, { setSubmitting }) => {
              setApiMessage("");
              try {
                await login({
                  email: values.email.trim(),
                  password: values.password,
                });
              } catch (error) {
                setApiMessage(error instanceof Error ? error.message : "Dang nhap that bai");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ handleChange, handleSubmit, values, errors, touched, isSubmitting }) => (
              <View style={styles.form}>
                <Text style={styles.label}>Email or Phone</Text>
                <TextInput
                  style={styles.input}
                  value={values.email}
                  onChangeText={handleChange("email")}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Enter your email or phone"
                  placeholderTextColor="#94A3B8"
                  accessibilityLabel="Nhap email"
                />
                {touched.email && errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    style={styles.passwordInput}
                    value={values.password}
                    onChangeText={handleChange("password")}
                    secureTextEntry={!showPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    accessibilityLabel="Nhap mat khau"
                  />
                  <Pressable style={styles.eyeButton} onPress={() => setShowPassword((prev) => !prev)}>
                    <Text style={styles.eyeText}>◉</Text>
                  </Pressable>
                </View>
                {touched.password && errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

                <Pressable
                  style={styles.forgotWrap}
                  onPress={() => navigation.navigate("ForgotPassword", { email: values.email.trim() || undefined })}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </Pressable>

                {apiMessage ? <Text style={styles.errorCenter}>{apiMessage}</Text> : null}
                {__DEV__ ? <Text style={styles.debugApiText}>API: {env.apiBaseUrl}</Text> : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dang nhap"
                  onPress={() => handleSubmit()}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                    isSubmitting && styles.buttonDisabled,
                  ]}
                >
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
                </Pressable>

                <View style={styles.separatorRow}>
                  <View style={styles.separator} />
                  <Text style={styles.separatorText}>Or continue with</Text>
                  <View style={styles.separator} />
                </View>

                <View style={styles.socialRow}>
                  <Pressable style={styles.socialButton} onPress={onGooglePress} disabled={!googleRequest || googleSubmitting || isSubmitting}>
                    <Text style={styles.socialButtonText}>{googleSubmitting ? "Dang xu ly..." : "G  Google"}</Text>
                  </Pressable>
                  <Pressable style={styles.socialButton}>
                    <Text style={styles.socialButtonText}>  Apple</Text>
                  </Pressable>
                </View>

                <Pressable style={styles.signupWrap} onPress={() => navigation.navigate("Register")}>
                  <Text style={styles.signupText}>
                    Don't have an account? <Text style={styles.signupLink}>Sign up</Text>
                  </Text>
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
  screen: {
    flex: 1,
    backgroundColor: "#FB923C",
  },
//   backdrop: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(15, 23, 42, 0.56)",
//   },
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
    fontSize: 42,
    opacity: 0.16,
  },
  pawTopLeft: {
    top: 30,
    left: 28,
    color: "#D6B89A",
  },
  pawRightMid: {
    top: 128,
    right: 24,
    color: "#C7D3C8",
  },
  pawBottomMid: {
    top: 296,
    left: 148,
    color: "#E4C2A8",
  },
  pawBottomLeft: {
    bottom: 40,
    left: 26,
    color: "#E8D2B5",
  },
  backButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D9DFE8",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  backText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 16,
    fontWeight: "700",
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
    fontSize: 24,
    lineHeight: 24,
    color: "#64748B",
    marginTop: -2,
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
    fontSize: 20,
  },
  title: {
    textAlign: "center",
    fontSize: 43,
    lineHeight: 48,
    fontWeight: "800",
    color: "#1E293B",
  },
  subtitle: {
    marginTop: 2,
    marginBottom: 18,
    textAlign: "center",
    color: "#64748B",
    fontSize: 15,
  },
  form: {
    gap: 6,
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
    color: "#334155",
    fontWeight: "600",
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CED6E0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: "#F4F1EC",
    fontSize: 16,
    color: "#0F172A",
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CED6E0",
    borderRadius: 16,
    backgroundColor: "#F4F1EC",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: "#0F172A",
  },
  eyeButton: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeText: {
    color: "#64748B",
    fontSize: 16,
  },
  forgotWrap: {
    alignItems: "flex-end",
    marginTop: 3,
  },
  forgotText: {
    color: "#F97316",
    fontWeight: "700",
    fontSize: 14,
  },
  button: {
    marginTop: 8,
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
  buttonText: { color: "#fff", fontSize: 29, fontWeight: "700", lineHeight: 33 },
  separatorRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  separator: {
    flex: 1,
    height: 1,
    backgroundColor: "#D6DCE5",
  },
  separatorText: {
    fontSize: 13,
    color: "#64748B",
  },
  socialRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  socialButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CCD4DE",
    borderRadius: 13,
    alignItems: "center",
    backgroundColor: "#F4F1EC",
  },
  socialButtonText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  signupWrap: {
    marginTop: 14,
    alignItems: "center",
  },
  signupText: {
    color: "#475569",
    fontSize: 15,
  },
  signupLink: {
    color: "#F97316",
    fontSize: 15,
    lineHeight: 34,
    fontWeight: "700",
  },
  error: { marginTop: 2, color: "#DC2626", fontSize: 13 },
  errorCenter: { marginTop: 2, color: "#DC2626", fontSize: 13, textAlign: "center" },
  debugApiText: { marginTop: 2, color: "#64748B", fontSize: 11, textAlign: "center" },
});
