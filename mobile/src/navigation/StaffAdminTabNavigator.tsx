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

      <View style={styles.menuPanel}>
        <View style={styles.menuTopBar}>
          <View style={styles.brandWrap}>
            <Image source={BRAND_ICON} style={styles.brandIcon} resizeMode="cover" />
            <Text style={styles.brandText}>HappyTails</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>X</Text>
          </Pressable>
        </View>

        <View style={styles.menuBody}>
          <Pressable style={styles.menuItem} onPress={() => onNavigate("ManagementTab")}>
            <Text style={styles.menuItemText}>Management</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => onNavigate("InfoTab", "NewsPolicyHome")}>
            <Text style={styles.menuItemText}>News & Policy</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => onNavigate("AccountTab", "Profile")}>
            <Text style={styles.menuItemText}>Profile</Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <View style={styles.userCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userName.slice(0, 1).toUpperCase() || "U"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{userName || "Guest"}</Text>
              <Text style={styles.userEmail}>{userEmail || "No email"}</Text>
            </View>
          </View>

          <Pressable style={styles.signOutBtn} onPress={onSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
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
    flexDirection: "row",
  },
  menuDimLayer: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.42)" },
  menuPanel: {
    width: "72%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    overflow: "hidden",
  },
  menuTopBar: {
    marginTop: 10,
    marginHorizontal: 10,
    marginBottom: 8,
    backgroundColor: "#1B263B",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2E3B55",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  closeBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
  menuBody: { paddingHorizontal: 16, paddingBottom: 20 },
  menuDivider: { height: 1, backgroundColor: "#E7EAF0", marginVertical: 10 },
  menuItem: { paddingVertical: 12 },
  menuItemText: { color: "#344054", fontSize: 17, fontWeight: "700" },
  userCard: {
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#EFE9DF",
    borderRadius: 14,
    backgroundColor: "#F7F2EA",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 20 },
  userName: { color: "#344054", fontWeight: "800", fontSize: 18 },
  userEmail: { marginTop: 2, color: "#667085", fontSize: 13 },
  signOutBtn: { paddingVertical: 14, marginTop: 6 },
  signOutText: { color: "#F04438", fontWeight: "800", fontSize: 17 },
});
