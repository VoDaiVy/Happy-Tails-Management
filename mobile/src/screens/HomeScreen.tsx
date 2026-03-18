import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getApiHealth } from "../api/modules/healthApi";

export function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("Chua kiem tra ket noi backend");

  const handlePingBackend = async () => {
    setLoading(true);
    try {
      const health = await getApiHealth();
      setResult(`Backend OK: ${health.message}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Khong the ket noi backend";
      setResult(`Loi: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Happy Tails Mobile</Text>
      <Text style={styles.subtitle}>React Native + Axios + Backend API</Text>

      <Pressable style={styles.button} onPress={handlePingBackend} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Test /api/health</Text>}
      </Pressable>

      <Text style={styles.resultText}>{result}</Text>
      <Text style={styles.hint}>Cau hinh API trong file .env (EXPO_PUBLIC_API_URL)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F1EC",
    paddingHorizontal: 20,
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#EA580C",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  resultText: {
    fontSize: 14,
    color: "#111827",
    textAlign: "center",
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
});
