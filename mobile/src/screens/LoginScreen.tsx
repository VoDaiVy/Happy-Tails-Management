import { useState } from "react";
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
import { login } from "../api/modules/authApi";
import type { AuthUser } from "../types/auth";

interface LoginScreenProps {
  onLoggedIn: (payload: { user: AuthUser; accessToken: string }) => void;
}

export function LoginScreen({ onLoggedIn }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Vui long nhap email va mat khau");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const result = await login({
        email: email.trim(),
        password,
      });

      onLoggedIn({
        user: result.user,
        accessToken: result.tokens.accessToken,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dang nhap that bai");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.backdrop} />

      <View style={styles.card}>
        <View style={styles.closeRow}>
          <Pressable style={styles.closeButton}>
            <Text style={styles.closeButtonText}>x</Text>
          </Pressable>
        </View>

        <View style={styles.brandIcon}>
          <Text style={styles.brandIconText}>HT</Text>
        </View>

        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Log in to care for your furry friends</Text>

        <View style={styles.formSection}>
          <Text style={styles.label}>Email or Phone</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Enter your email or phone"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              secureTextEntry={!showPassword}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeButtonText}>{showPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          </View>

          <Text style={styles.forgotText}>Forgot Password?</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={handleLogin}
            disabled={submitting}
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.buttonPressed,
              submitting && styles.buttonDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialRow}>
            <Pressable style={styles.socialButton}>
              <Text style={styles.socialButtonText}>G  Google</Text>
            </Pressable>
            <Pressable style={styles.socialButton}>
              <Text style={styles.socialButtonText}>A  Apple</Text>
            </Pressable>
          </View>

          <Text style={styles.footerText}>
            Don't have an account? <Text style={styles.footerLink}>Sign up</Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DADADA",
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.35)",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#F7F3EE",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#E5DFD8",
  },
  closeRow: {
    alignItems: "flex-end",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F3F5",
    borderWidth: 1,
    borderColor: "#DFE2E8",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FB923C",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -6,
    marginBottom: 12,
  },
  brandIconText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: "#1F2A3D",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
    textAlign: "center",
    color: "#64748B",
    fontSize: 15,
  },
  formSection: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "600",
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D5DAE3",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#F9FBFF",
    fontSize: 16,
    color: "#1F2937",
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D5DAE3",
    borderRadius: 14,
    backgroundColor: "#F9FBFF",
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#1F2937",
  },
  eyeButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  eyeButtonText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 12,
  },
  forgotText: {
    marginTop: 2,
    textAlign: "right",
    color: "#F97316",
    fontWeight: "700",
    fontSize: 14,
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: "#FB923C",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: "#FB923C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.95,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  dividerRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#D8DEE6",
  },
  dividerText: {
    color: "#6B7280",
    fontSize: 13,
  },
  socialRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  socialButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D7DCE4",
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  socialButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 14,
  },
  footerText: {
    marginTop: 14,
    textAlign: "center",
    color: "#475569",
    fontSize: 14,
  },
  footerLink: {
    color: "#F97316",
    fontWeight: "700",
  },
  errorText: {
    marginTop: 2,
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
  },
});
