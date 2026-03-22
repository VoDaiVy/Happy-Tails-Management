import { useCallback, useMemo, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { AccountStackNavigator } from "./AccountStackNavigator";
import { InfoStackNavigator } from "./InfoStackNavigator";
import type { MainTabParamList } from "./types";
import { ManagementScreen } from "../screens/management/ManagementScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();
const BRAND_ICON = require("../../assets/icon.png");

interface StaffMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (tab: keyof MainTabParamList, nestedScreen?: string) => void;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
}

function StaffMenu({ visible, onClose, onNavigate, userName, userEmail, onSignOut }: StaffMenuProps) {
  if (!visible) return null;

  return (
    <View style={styles.menuOverlayRoot} pointerEvents="box-none">
      <Pressable style={styles.menuDimLayer} onPress={onClose} />

      <View style={styles.sheetPanel}>
        <View style={styles.sheetHandle} />

        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{userName.slice(0, 1).toUpperCase() || "U"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{userName || "Guest"}</Text>
            <Text style={styles.userEmail}>{userEmail || "No email"}</Text>
            <Text style={styles.userRole}>staff</Text>
          </View>
        </View>

        <View style={styles.menuBody}>
          <Pressable style={({ pressed }) => [styles.menuItem, styles.menuItemActive, pressed && styles.menuItemPressed]} onPress={() => onNavigate("ManagementTab")}>
            <View style={styles.menuItemIconWrap}><Text style={styles.menuItemIcon}>◫</Text></View>
            <View style={styles.menuItemTextCol}>
              <Text style={[styles.menuItemText, styles.menuItemTextActive]}>Management</Text>
              <Text style={styles.menuItemSubText}>Open staff dashboard</Text>
            </View>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]} onPress={() => onNavigate("InfoTab", "NewsPolicyHome")}>
            <View style={styles.menuItemIconWrap}><Text style={styles.menuItemIcon}>◉</Text></View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemText}>News & Policy</Text>
              <Text style={styles.menuItemSubText}>View latest news and policy</Text>
            </View>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]} onPress={() => onNavigate("AccountTab", "Profile")}>
            <View style={styles.menuItemIconWrap}><Text style={styles.menuItemIcon}>◌</Text></View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemText}>Profile</Text>
              <Text style={styles.menuItemSubText}>Account details and settings</Text>
            </View>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutBtnPressed]} onPress={onSignOut}>
            <Text style={styles.signOutIcon}>⎋</Text>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function StaffAdminTabNavigator() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [menuVisible, setMenuVisible] = useState(false);

  const userName = useMemo(() => String(user?.name || "User"), [user]);
  const userEmail = useMemo(() => String(user?.email || ""), [user]);

  const onNavigateFromMenu = useCallback(
    (tab: keyof MainTabParamList, nestedScreen?: string) => {
      setMenuVisible(false);

      if (nestedScreen) {
        navigation.navigate(tab, { screen: nestedScreen });
        return;
      }

      navigation.navigate(tab);
    },
    [navigation],
  );

  return (
    <View style={styles.root}>
      <Tab.Navigator
        initialRouteName="ManagementTab"
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          sceneStyle: { paddingTop: 92 },
        }}
      >
        <Tab.Screen name="ManagementTab" component={ManagementScreen} options={{ title: "Management" }} />
        <Tab.Screen name="InfoTab" component={InfoStackNavigator} options={{ title: "News & Policy" }} />
        <Tab.Screen name="AccountTab" component={AccountStackNavigator} options={{ title: "Tai khoan" }} />
      </Tab.Navigator>

      <View style={styles.floatingTopBar} pointerEvents="box-none">
        <View style={styles.floatingTopBarInner}>
          <View style={styles.brandWrap}>
            <Image source={BRAND_ICON} style={styles.brandIcon} resizeMode="cover" />
            <Text style={styles.brandText}>HappyTails Staff</Text>
          </View>
          <Pressable onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Text style={styles.menuBtnText}>☰</Text>
          </Pressable>
        </View>
      </View>

      <StaffMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigateFromMenu}
        userName={userName}
        userEmail={userEmail}
        onSignOut={() => {
          setMenuVisible(false);
          logout();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F1EB" },
  floatingTopBar: {
    position: "absolute",
    top: 58,
    left: 18,
    right: 18,
    zIndex: 40,
  },
  floatingTopBarInner: {
    backgroundColor: "#18243A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#263752",
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0A1528",
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#F08A40" },
  brandText: { color: "#FFFFFF", fontWeight: "900", fontSize: 20 },
  menuBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 24, lineHeight: 26 },
  menuOverlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
    justifyContent: "flex-end",
  },
  menuDimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.34)",
  },
  sheetPanel: {
    backgroundColor: "#FFF9F3",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#E9DBC9",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 12,
    shadowColor: "#1E150F",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D8C9B7",
    marginBottom: 4,
  },
  profileCard: {
    borderWidth: 1,
    borderColor: "#EFE9DF",
    borderRadius: 14,
    backgroundColor: "#FFFDFA",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuBody: { gap: 8 },
  menuDivider: { height: 1, backgroundColor: "#E7EAF0", marginVertical: 4 },
  menuItem: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#EFE2D5",
    backgroundColor: "#FFFCF8",
  },
  menuItemActive: {
    backgroundColor: "#FFF1E8",
    borderColor: "#F0C7A0",
  },
  menuItemPressed: {
    backgroundColor: "#FFF6ED",
  },
  menuItemIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#F7EEE4",
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemIcon: {
    color: "#C86542",
    fontSize: 12,
    fontWeight: "900",
  },
  menuItemTextCol: {
    flex: 1,
    gap: 1,
  },
  menuItemText: {
    color: "#344054",
    fontSize: 13,
    fontWeight: "700",
  },
  menuItemTextActive: {
    color: "#1F2D3D",
  },
  menuItemSubText: {
    color: "#6B7280",
    fontSize: 10,
  },
  closeBtn: {
    marginTop: 4,
    minHeight: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E7D8C7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFCF8",
  },
  closeBtnText: { color: "#4B5563", fontWeight: "800", fontSize: 12 },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D97853",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 20 },
  userName: { color: "#344054", fontWeight: "800", fontSize: 14 },
  userEmail: { marginTop: 1, color: "#667085", fontSize: 11 },
  userRole: {
    marginTop: 1,
    color: "#C86542",
    fontSize: 10,
    fontWeight: "700",
  },
  signOutBtn: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#F1D3CF",
    backgroundColor: "#FFF7F6",
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    marginTop: 2,
  },
  signOutBtnPressed: {
    backgroundColor: "#FEEEEB",
  },
  signOutIcon: {
    color: "#C94A4A",
    fontWeight: "800",
    fontSize: 13,
  },
  signOutText: { color: "#B73E3E", fontWeight: "800", fontSize: 13 },
});
