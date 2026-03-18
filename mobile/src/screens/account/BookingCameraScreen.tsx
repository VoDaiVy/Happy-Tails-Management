import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { enableBookingCameraAccess, getBookingCameraStream, verifyBookingCameraAccess } from "../../api/modules/cameraApi";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import type { CameraItem } from "../../types/camera";
import { canUseCustomerFeatures } from "../../utils/role";

type Props = NativeStackScreenProps<AccountStackParamList, "BookingCamera">;

export function BookingCameraScreen({ route }: Props) {
  const { user } = useAuth();
  const canAccess = canUseCustomerFeatures(user?.role);

  const [bookingId, setBookingId] = useState(route.params?.bookingId || "");
  const [accessToken, setAccessToken] = useState("");
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!canAccess) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>Tinh nang camera chi danh cho customer.</Text>
      </View>
    );
  }

  const onEnable = async () => {
    if (!bookingId.trim()) {
      setError("Vui long nhap bookingId");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await enableBookingCameraAccess(bookingId.trim());
      setAccessToken(data.accessToken || "");
      setCameras(data.cameras || []);
      setMessage("Da kich hoat quyen camera cho booking");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong the bat camera access");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!bookingId.trim() || !accessToken.trim()) {
      setError("Can bookingId va accessToken");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await verifyBookingCameraAccess(bookingId.trim(), accessToken.trim());
      setCameras(data.cameras || []);
      setMessage("Xac minh camera access thanh cong");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xac minh camera access that bai");
    } finally {
      setLoading(false);
    }
  };

  const onOpenStream = async (camera: CameraItem) => {
    const cameraId = camera._id || camera.id;
    if (!cameraId || !bookingId.trim() || !accessToken.trim()) return;

    setLoading(true);
    setError("");
    try {
      const stream = await getBookingCameraStream(bookingId.trim(), cameraId, accessToken.trim());
      if (!stream.streamUrl) {
        setError("Khong lay duoc stream URL");
      } else {
        await Linking.openURL(stream.streamUrl);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong mo duoc stream");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Booking Camera</Text>
      <Text style={styles.subtitle}>Xem camera theo booking (customer scope)</Text>

      <TextInput style={styles.input} value={bookingId} onChangeText={setBookingId} placeholder="Booking ID" />
      <TextInput style={styles.input} value={accessToken} onChangeText={setAccessToken} placeholder="Access token" />

      <View style={styles.actionRow}>
        <Pressable style={[styles.btn, loading && styles.disabled]} onPress={onEnable} disabled={loading}>
          <Text style={styles.btnText}>Enable Access</Text>
        </Pressable>
        <Pressable style={[styles.btn, loading && styles.disabled]} onPress={onVerify} disabled={loading}>
          <Text style={styles.btnText}>Verify</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {message ? <Text style={styles.successText}>{message}</Text> : null}

      <FlatList
        data={cameras}
        keyExtractor={(item, index) => `${item._id || item.id || "cam"}-${index}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Chua co camera nao</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.cameraName || item.name || "Camera"}</Text>
            <Text style={styles.cardMeta}>{item.position || "main"} · {item.resolution || "1080p"}</Text>
            <Pressable style={styles.streamButton} onPress={() => onOpenStream(item)}>
              <Text style={styles.streamButtonText}>Open Stream</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B", marginTop: 4, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  actionRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    paddingVertical: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  listContent: { gap: 10, paddingTop: 12, paddingBottom: 18 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
    gap: 6,
  },
  cardTitle: { color: "#0F172A", fontWeight: "700" },
  cardMeta: { color: "#475569" },
  streamButton: {
    marginTop: 4,
    borderRadius: 8,
    backgroundColor: "#0D9488",
    alignItems: "center",
    paddingVertical: 9,
  },
  streamButtonText: { color: "#fff", fontWeight: "700" },
  errorText: { color: "#DC2626", marginTop: 8 },
  successText: { color: "#059669", marginTop: 8 },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 10 },
  disabled: { opacity: 0.65 },
});
