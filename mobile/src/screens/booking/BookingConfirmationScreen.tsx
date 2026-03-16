import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BookingStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<BookingStackParamList, "BookingConfirmation">;

export function BookingConfirmationScreen({ route, navigation }: Props) {
  const { bookingId, message, totalAmount } = route.params;

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Dat lich thanh cong</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.infoCard}>
        <Text style={styles.row}>Booking ID: {bookingId}</Text>
        {typeof totalAmount === "number" ? <Text style={styles.row}>Tong thanh toan: {totalAmount.toLocaleString()} VND</Text> : null}
      </View>

      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("BookingCheckout")}>
        <Text style={styles.primaryText}>Tao booking moi</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", justifyContent: "center", padding: 16 },
  title: { fontSize: 26, fontWeight: "700", color: "#065F46", textAlign: "center" },
  message: { marginTop: 8, textAlign: "center", color: "#374151" },
  infoCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  row: { color: "#064E3B", fontWeight: "600" },
  primaryButton: {
    marginTop: 24,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
