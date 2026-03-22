import { useCallback, useEffect, useMemo, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getCart } from "../api/modules/cartApi";
import { AccountStackNavigator } from "./AccountStackNavigator";
import { BookingStackNavigator } from "./BookingStackNavigator";
import { InfoStackNavigator } from "./InfoStackNavigator";
import type { MainTabParamList } from "./types";
import { ManagementScreen } from "../screens/management/ManagementScreen";
import { canUseCustomerFeatures, isStaffOrAdminRole } from "../utils/role";
import { ServicesStackNavigator } from "./ServicesStackNavigator";
import { serviceHeaderScrollY } from "./serviceHeaderScroll";

const Tab = createBottomTabNavigator<MainTabParamList>();

const BRAND_ICON = require("../../assets/icon.png");

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (tab: keyof MainTabParamList, nestedScreen?: string) => void;
  showCustomerTabs: boolean;
  showManagementTab: boolean;
  cartCount: number;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
}

function SideMenu({
  visible,
  onClose,
  onNavigate,
  showCustomerTabs,
  showManagementTab,
  cartCount,
  userName,
  userEmail,
  onSignOut,
}: SideMenuProps) {
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
          <Pressable style={styles.menuItem} onPress={() => onNavigate("ServicesTab", "ServiceList")}>
            <Text style={styles.menuItemText}>Services</Text>
          </Pressable>
          {showCustomerTabs ? (
            <Pressable style={styles.menuItem} onPress={() => onNavigate("BookingTab", "MyBookings")}>
              <Text style={styles.menuItemText}>Booking</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.menuItem} onPress={() => onNavigate("InfoTab", "NewsPolicyHome")}>
            <Text style={styles.menuItemText}>News & Policy</Text>
          </Pressable>
          {showManagementTab ? (
            <Pressable style={styles.menuItem} onPress={() => onNavigate("ManagementTab")}>
              <Text style={styles.menuItemText}>Management</Text>
            </Pressable>
          ) : null}

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

          <Pressable style={styles.menuItem} onPress={() => onNavigate("AccountTab", "Profile")}>
            <Text style={styles.menuItemText}>Profile</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => onNavigate("AccountTab", "MyPets")}>
            <Text style={styles.menuItemText}>My Pets</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => onNavigate("AccountTab", "ShoppingCart")}>
            <View style={styles.menuItemRow}>
              <Text style={styles.menuItemText}>Shopping Cart</Text>
              {cartCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => onNavigate("AccountTab", "MyBookings")}>
            <Text style={styles.menuItemText}>Bookings</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => onNavigate("AccountTab", "Wallet")}>
            <Text style={styles.menuItemText}>Wallet</Text>
          </Pressable>

          <Pressable style={styles.signOutBtn} onPress={onSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function MainTabNavigator() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const showCustomerTabs = canUseCustomerFeatures(user?.role);
  const showManagementTab = isStaffOrAdminRole(user?.role);
  const [activeTab, setActiveTab] = useState<keyof MainTabParamList>("ServicesTab");
  const [menuVisible, setMenuVisible] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const userName = useMemo(() => {
    return String(user?.name || "User");
  }, [user]);

  const userEmail = useMemo(() => String(user?.email || ""), [user]);

  useEffect(() => {
    if (!menuVisible || !showCustomerTabs) return;

    let alive = true;
    getCart()
      .then((cart) => {
        if (!alive) return;
        setCartCount(Number(cart.totalItems || 0));
      })
      .catch(() => {
        if (!alive) return;
        setCartCount(0);
      });

    return () => {
      alive = false;
    };
  }, [menuVisible, showCustomerTabs]);

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

  const headerShrinkProgress = useMemo(
    () =>
      serviceHeaderScrollY.interpolate({
        inputRange: [0, 90],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [],
  );

  const animatedTopBarStyle = useMemo(
    () => ({
      transform: [
        {
          translateY: headerShrinkProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -8],
          }),
        },
        {
          scale: headerShrinkProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.93],
          }),
        },
      ],
    }),
    [headerShrinkProgress],
  );

  const animatedBrandStyle = useMemo(
    () => ({
      transform: [
        {
          scale: headerShrinkProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.88],
          }),
        },
      ],
      opacity: headerShrinkProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.94],
      }),
    }),
    [headerShrinkProgress],
  );

  return (
    <View style={styles.root}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { display: "none" },
          sceneStyle: { paddingTop: route.name === "ManagementTab" ? 0 : 98 },
        })}
        screenListeners={{
          state: (event) => {
            const state = event.data.state as { index?: number; routes?: Array<{ name?: keyof MainTabParamList }> } | undefined;
            const routeName = state?.routes?.[Number(state?.index ?? 0)]?.name;
            if (routeName) setActiveTab(routeName);
          },
        }}
      >
        <Tab.Screen name="ServicesTab" component={ServicesStackNavigator} options={{ title: "Services" }} />
        {showCustomerTabs ? <Tab.Screen name="BookingTab" component={BookingStackNavigator} options={{ title: "Booking" }} /> : null}
        <Tab.Screen name="InfoTab" component={InfoStackNavigator} options={{ title: "News & Policy" }} />
        {showManagementTab ? <Tab.Screen name="ManagementTab" component={ManagementScreen} options={{ title: "Management" }} /> : null}
        <Tab.Screen name="AccountTab" component={AccountStackNavigator} options={{ title: "Tai khoan" }} />
      </Tab.Navigator>

      {activeTab !== "ManagementTab" ? (
        <View style={styles.floatingTopBar} pointerEvents="box-none">
          <Animated.View style={[styles.floatingTopBarInner, animatedTopBarStyle]}>
            <Animated.View style={[styles.brandWrap, animatedBrandStyle]}>
              <View style={styles.brandIconWrap}>
                <Image source={BRAND_ICON} style={styles.brandIcon} resizeMode="cover" />
                <View style={styles.brandDot} />
              </View>
              <View>
                <Text style={styles.brandCaption}>PET SPA</Text>
                <Text style={styles.brandText}>
                  <Text style={styles.brandTextPrimary}>Happy</Text>
                  <Text style={styles.brandTextAccent}>Tails</Text>
                </Text>
              </View>
            </Animated.View>
            <Pressable onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
              <Text style={styles.menuBtnText}>☰</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}

      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigateFromMenu}
        showCustomerTabs={showCustomerTabs}
        showManagementTab={showManagementTab}
        cartCount={cartCount}
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
    backgroundColor: "#F7F7F6",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E7E8EA",
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#101828",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    overflow: "visible",
    justifyContent: "center",
    alignItems: "center",
  },
  brandIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#F08A40" },
  brandDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16C172",
    borderWidth: 1,
    borderColor: "#F7F7F6",
  },
  brandCaption: {
    color: "#9AA3B2",
    fontWeight: "700",
    fontSize: 9,
    letterSpacing: 2,
    lineHeight: 12,
  },
  brandText: { fontWeight: "900", fontSize: 31, lineHeight: 33 },
  brandTextPrimary: { color: "#18243A" },
  brandTextAccent: { color: "#F08A40" },
  menuBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuBtnText: { color: "#344054", fontWeight: "700", fontSize: 24, lineHeight: 26 },
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
  menuItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: {
    minWidth: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#F08A40",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
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
