import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getUnreadCount } from "../../api/modules/notificationApi";
import { useAuth } from "../../context/AuthContext";
import type { AccountStackParamList } from "../../navigation/types";
import { canUseCustomerFeatures } from "../../utils/role";

type Props = NativeStackScreenProps<AccountStackParamList, "AccountHome">;

type AccountMenuRoute =
  | "Profile"
  | "MyPets"
  | "ShoppingCart"
  | "MyBookings"
  | "BookingCamera"
  | "Wallet"
  | "ChangePassword"
  | "NotificationCenter"
  | "Feedback";

const MENU_ITEMS: Array<{ label: string; route: AccountMenuRoute; customerOnly?: boolean }> = [
  { label: "Profile", route: "Profile" },
  { label: "My Pets", route: "MyPets", customerOnly: true },
  { label: "Shopping Cart", route: "ShoppingCart", customerOnly: true },
  { label: "Bookings", route: "MyBookings", customerOnly: true },
  { label: "Booking Camera", route: "BookingCamera", customerOnly: true },
  { label: "Wallet", route: "Wallet", customerOnly: true },
  { label: "Change Password", route: "ChangePassword" },
  { label: "Notifications", route: "NotificationCenter" },
  { label: "Feedback", route: "Feedback", customerOnly: true },
];

export function AccountScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Khong co thong tin nguoi dung.</Text>
      </View>
    );
  }

  const avatarText = (user.name || user.email || "U").trim().charAt(0).toUpperCase();
  const showCustomerFeatures = canUseCustomerFeatures(user.role);
  const visibleMenuItems = MENU_ITEMS.filter((item) => !item.customerOnly || showCustomerFeatures);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

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
        {visibleMenuItems.map((item) => (
          <Pressable
            key={item.route}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.route)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <View style={styles.menuLeftWrap}>
              <Text style={styles.menuItemText}>{item.label}</Text>
              {item.route === "NotificationCenter" && unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              ) : null}
            </View>
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
  container: { flex: 1, backgroundColor: "#F4F1EC", padding: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#2F3742" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DED1",
    borderRadius: 16,
    padding: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#D87D4A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 22 },
  nameText: { fontSize: 18, fontWeight: "800", color: "#2F3742" },
  emailText: { marginTop: 2, color: "#8291A8", fontSize: 13 },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DED1",
    borderRadius: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EBE3",
  },
  menuLeftWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuItemText: { fontSize: 15, fontWeight: "700", color: "#3D4655" },
  badge: {
    minWidth: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  menuArrow: { fontSize: 20, color: "#98A2B3" },
  logoutButton: {
    backgroundColor: "#D87D4A",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 13,
  },
  logoutText: { color: "#fff", fontWeight: "800" },
  emptyText: { color: "#8291A8" },
});
