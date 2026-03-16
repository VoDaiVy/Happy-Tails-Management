import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export function AccountScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Khong co thong tin nguoi dung.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Tai khoan</Text>
      <View style={styles.card}>
        <Text style={styles.row}>Ho ten: {user.name}</Text>
        <Text style={styles.row}>Email: {user.email}</Text>
        <Text style={styles.row}>Role: {user.role}</Text>
      </View>

      <Pressable
        style={styles.refreshButton}
        onPress={async () => {
          setLoading(true);
          setMessage("");
          try {
            await refreshProfile();
            setMessage("Da dong bo profile moi nhat");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Khong tai duoc profile");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Tai lai profile</Text>}
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.buttonText}>Dang xuat</Text>
      </Pressable>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
  title: { fontSize: 26, fontWeight: "700", color: "#111827" },
  card: {
    marginTop: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  row: { color: "#374151", fontSize: 15 },
  refreshButton: {
    marginTop: 20,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  logoutButton: {
    marginTop: 10,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  message: { marginTop: 10, color: "#374151" },
});
