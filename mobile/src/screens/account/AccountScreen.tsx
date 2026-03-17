import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AccountStackParamList, "AccountHome">;

type AccountMenuRoute = "Profile" | "MyPets" | "ShoppingCart" | "MyBookings" | "Wallet";

const MENU_ITEMS: Array<{ label: string; route: AccountMenuRoute }> = [
  { label: "Profile", route: "Profile" },
  { label: "My Pets", route: "MyPets" },
  { label: "Shopping Cart", route: "ShoppingCart" },
  { label: "Bookings", route: "MyBookings" },
  { label: "Wallet", route: "Wallet" },
];

export function AccountScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Khong co thong tin nguoi dung.</Text>
      </View>
    );
  }

  const avatarText = (user.name || user.email || "U").trim().charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Account</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{avatarText}</Text>
        </View>
        <View>
          <Text style={styles.nameText}>{user.name}</Text>
          <Text style={styles.emailText}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.route}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.route)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <Text style={styles.menuItemText}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16, gap: 14 },
  title: { fontSize: 26, fontWeight: "700", color: "#111827" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FB923C",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 22 },
  nameText: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  emailText: { marginTop: 2, color: "#64748B", fontSize: 13 },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuItemText: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
  menuArrow: { fontSize: 20, color: "#94A3B8" },
  logoutButton: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  logoutText: { color: "#fff", fontWeight: "700" },
  emptyText: { color: "#64748B" },
});
