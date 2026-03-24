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

      <Pressable
        style={styles.secondaryButton}
        onPress={() => navigation.getParent()?.navigate("AccountTab", { screen: "MyBookings" })}
      >
        <Text style={styles.secondaryText}>Xem bookings cua toi</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1EC", justifyContent: "center", padding: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#2F3742", textAlign: "center" },
  message: { marginTop: 8, textAlign: "center", color: "#6C7A90" },
  infoCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E7DED1",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  row: { color: "#4D5E78", fontWeight: "700" },
  primaryButton: {
    marginTop: 24,
    backgroundColor: "#D87D4A",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 13,
  },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E3E5E9",
    backgroundColor: "#F8F8F7",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 13,
  },
  secondaryText: { color: "#4D5E78", fontWeight: "700", fontSize: 15 },
});
