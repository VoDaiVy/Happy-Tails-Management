import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { AccountStackNavigator } from "./AccountStackNavigator";
import { InfoStackNavigator } from "./InfoStackNavigator";
import type { MainTabParamList } from "./types";
import { StaffManagementStackNavigator } from "./StaffManagementStackNavigator";

const Tab = createBottomTabNavigator<MainTabParamList>();
const BRAND_ICON = require("../../assets/icon.png");

type FeatherIconName = ComponentProps<typeof Feather>["name"];
type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
type MenuIcon =
  | { pack: "feather"; name: FeatherIconName }
  | { pack: "mci"; name: MaterialIconName };

type MenuItemKey =
  | "overview"
  | "bookings"
  | "schedule"
  | "feedback"
  | "notifications"
  | "medicalRecords"
  | "news";

type DrawerRoute = {
  tab: keyof MainTabParamList;
  nestedScreen?: string;
  nestedParams?: Record<string, unknown>;
};

type DrawerMenuItem = {
  key: MenuItemKey;
  label: string;
  icon: MenuIcon;
  route: DrawerRoute;
};

type DrawerMenuSection = {
  title: string;
  items: DrawerMenuItem[];
};

type BottomTabKey = "home" | "schedule" | "profile";

const STAFF_MENU_SECTIONS: DrawerMenuSection[] = [
  {
    title: "Overview",
    items: [
      {
        key: "overview",
        label: "Overview",
        icon: { pack: "feather", name: "grid" },
        route: { tab: "ManagementTab", nestedScreen: "StaffOverview" },
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        key: "bookings",
        label: "Bookings",
        icon: { pack: "mci", name: "calendar-check-outline" },
        route: { tab: "ManagementTab", nestedScreen: "StaffBookings" },
      },
      {
        key: "schedule",
        label: "Schedule",
        icon: { pack: "feather", name: "calendar" },
        route: { tab: "ManagementTab", nestedScreen: "StaffSchedule" },
      },
      {
        key: "feedback",
        label: "Feedback",
        icon: { pack: "feather", name: "message-square" },
        route: { tab: "AccountTab", nestedScreen: "Feedback" },
      },
      {
        key: "notifications",
        label: "Notifications",
        icon: { pack: "feather", name: "bell" },
        route: { tab: "AccountTab", nestedScreen: "NotificationCenter" },
      },
      {
        key: "medicalRecords",
        label: "Medical Records",
        icon: { pack: "mci", name: "file-document-outline" },
        route: { tab: "ManagementTab", nestedScreen: "StaffMedicalRecords" },
      },
    ],
  },
  {
    title: "News",
    items: [
      {
        key: "news",
        label: "News",
        icon: { pack: "feather", name: "file-text" },
        route: { tab: "ManagementTab", nestedScreen: "StaffNewsManagement" },
      },
    ],
  },
];

interface StaffMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (tab: keyof MainTabParamList, nestedScreen?: string, nestedParams?: Record<string, unknown>) => void;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
  activeItem: MenuItemKey;
  onSelectItem: (item: MenuItemKey) => void;
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function MenuIconView({ icon, active }: { icon: MenuIcon; active: boolean }) {
  const iconColor = active ? "#FFFFFF" : "#5F6B7D";
  if (icon.pack === "mci") {
    return <MaterialCommunityIcons name={icon.name} size={19} color={iconColor} />;
  }
  return <Feather name={icon.name} size={18} color={iconColor} />;
}

function MenuActionItem({ item, active, onPress }: { item: DrawerMenuItem; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.menuItem, active && styles.menuItemActive]}
      onPress={onPress}
    >
      <View style={[styles.menuIconWrap, active && styles.menuIconWrapActive]}>
        <MenuIconView icon={item.icon} active={active} />
      </View>
      <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>{item.label}</Text>
    </Pressable>
  );
}

function BottomNavItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: FeatherIconName;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.bottomNavItem} onPress={onPress}>
      <View style={[styles.bottomNavIconWrap, active && styles.bottomNavIconWrapActive]}>
        <Feather name={icon} size={18} color={active ? "#FFFFFF" : "#7F8B9A"} />
      </View>
      <Text style={[styles.bottomNavLabel, active && styles.bottomNavLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function StaffMenu({
  visible,
  onClose,
  onNavigate,
  userName,
  userEmail,
  onSignOut,
  activeItem,
  onSelectItem,
}: StaffMenuProps) {
  const drawerWidth = 280;
  const insets = useSafeAreaInsets();
  const [shouldRender, setShouldRender] = useState(visible);
  const panelTranslateX = useRef(new Animated.Value(visible ? 0 : -drawerWidth)).current;
  const dimOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(panelTranslateX, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(dimOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(panelTranslateX, {
        toValue: -drawerWidth,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(dimOpacity, {
        toValue: 0,
        duration: 170,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setShouldRender(false);
      }
    });
  }, [visible, panelTranslateX, dimOpacity, drawerWidth]);

  if (!shouldRender) return null;

  return (
    <View style={styles.menuOverlayRoot} pointerEvents="box-none">
      <Animated.View style={[styles.menuPanel, { transform: [{ translateX: panelTranslateX }] }]}> 
        <View style={[styles.menuTopBar, { marginTop: Math.max(insets.top, 6) + 6 }]}> 
          <View style={styles.menuBrandWrap}>
            <Image source={BRAND_ICON} style={styles.menuBrandIcon} resizeMode="cover" />
            <View>
              <Text style={styles.roleBadge}>STAFF</Text>
              <Text style={styles.menuBrandText}>HappyTails Staff</Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.menuBody}
          contentContainerStyle={[styles.menuBodyContent, { paddingBottom: Math.max(insets.bottom, 8) + 12 }]}
          showsVerticalScrollIndicator={false}
        >
          {STAFF_MENU_SECTIONS.map((section) => (
            <View key={section.title} style={styles.sectionWrap}>
              <SectionTitle title={section.title} />
              {section.items.map((item) => {
                const isActive = activeItem === item.key;
                return (
                  <MenuActionItem
                    key={item.key}
                    item={item}
                    active={isActive}
                    onPress={() => {
                      onSelectItem(item.key);
                      onNavigate(item.route.tab, item.route.nestedScreen, item.route.nestedParams);
                    }}
                  />
                );
              })}
            </View>
          ))}

          <View style={styles.menuDivider} />

          <View style={styles.userCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userName.slice(0, 1).toUpperCase() || "S"}</Text>
            </View>
            <View style={styles.userInfoWrap}>
              <Text style={styles.userName}>{userName || "Guest"}</Text>
              <Text style={styles.userEmail}>{userEmail || "No email"}</Text>
            </View>
          </View>

          <Pressable style={styles.signOutBtn} onPress={onSignOut}>
            <MaterialCommunityIcons name="logout" size={18} color="#C62828" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>

      </Animated.View>

      <Animated.View style={[styles.menuDimLayer, { opacity: dimOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>
    </View>
  );
}

export function StaffAdminTabNavigator() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeItem, setActiveItem] = useState<MenuItemKey>("overview");
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTabKey>("home");

  const userName = useMemo(() => String(user?.name || "User"), [user]);
  const userEmail = useMemo(() => String(user?.email || ""), [user]);

  const syncActiveFromRoute = useCallback((tabName?: string, nestedScreen?: string) => {
    if (tabName === "ManagementTab") {
      if (nestedScreen === "StaffBookings") {
        setActiveBottomTab("home");
        setActiveItem("bookings");
        return;
      }

      if (nestedScreen === "StaffSchedule" || nestedScreen === "StaffScheduleDetail") {
        setActiveBottomTab("schedule");
        setActiveItem("schedule");
        return;
      }

      if (nestedScreen === "StaffMedicalRecords") {
        setActiveItem("medicalRecords");
        return;
      }

      if (nestedScreen === "StaffNewsManagement") {
        setActiveItem("news");
        return;
      }

      setActiveBottomTab("home");
      setActiveItem("overview");
      return;
    }

    if (tabName === "AccountTab") {
      if (nestedScreen === "NotificationCenter") {
        setActiveItem("notifications");
        return;
      }

      if (nestedScreen === "Profile") {
        setActiveBottomTab("profile");
        setActiveItem("overview");
        return;
      }

      if (nestedScreen === "MyBookings") {
        setActiveItem("bookings");
        return;
      }

      if (nestedScreen === "Feedback") {
        setActiveItem("feedback");
      }
      return;
    }

    if (tabName === "InfoTab") {
      if (nestedScreen === "NewsPolicyHome") {
        setActiveItem("news");
      }
    }
  }, []);

  const extractDeepestRoute = useCallback((state: any) => {
    if (!state?.routes || typeof state.index !== "number") return { tabName: undefined, nestedScreen: undefined };
    let route = state.routes[state.index];
    const tabName = route?.name;

    while (route?.state?.routes && typeof route.state.index === "number") {
      route = route.state.routes[route.state.index];
    }

    return { tabName, nestedScreen: route?.name };
  }, []);

  const onNavigateFromMenu = useCallback(
    (tab: keyof MainTabParamList, nestedScreen?: string, nestedParams?: Record<string, unknown>) => {
      setMenuVisible(false);

      syncActiveFromRoute(tab, nestedScreen);

      if (nestedScreen) {
        navigation.navigate(tab, { screen: nestedScreen, params: nestedParams });
        return;
      }

      navigation.navigate(tab);
    },
    [navigation, syncActiveFromRoute],
  );

  const onBottomNavigate = useCallback(
    (key: BottomTabKey) => {
      if (key === "home") {
        onNavigateFromMenu("ManagementTab", "StaffOverview");
        return;
      }

      if (key === "schedule") {
        onNavigateFromMenu("ManagementTab", "StaffSchedule");
        return;
      }

      onNavigateFromMenu("AccountTab", "Profile");
    },
    [onNavigateFromMenu],
  );

  return (
    <View style={styles.root}>
      <Tab.Navigator
        screenListeners={{
          state: (event) => {
            const { tabName, nestedScreen } = extractDeepestRoute(event.data.state);
            syncActiveFromRoute(tabName, nestedScreen);
          },
        }}
        initialRouteName="ManagementTab"
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          sceneStyle: { paddingTop: 96, paddingBottom: Math.max(insets.bottom + 74, 80) },
        }}
      >
        <Tab.Screen name="ManagementTab" component={StaffManagementStackNavigator} options={{ title: "Management" }} />
        <Tab.Screen name="InfoTab" component={InfoStackNavigator} options={{ title: "News & Policy" }} />
        <Tab.Screen name="AccountTab" component={AccountStackNavigator} options={{ title: "Account" }} />
      </Tab.Navigator>

      <View style={styles.floatingTopBar} pointerEvents="box-none">
        <View style={styles.floatingTopBarInner}>
          <Pressable onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Feather name="menu" size={19} color="#314760" />
          </Pressable>

          <View style={styles.brandWrap}>
            <View>
              <Text style={styles.brandText}>Happy Tails</Text>
              <Text style={styles.headerCaption}>STAFF</Text>
            </View>
          </View>

          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{userName.slice(0, 1).toUpperCase() || "S"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomNavWrap} pointerEvents="box-none">
        <View style={[styles.bottomNavInner, { marginBottom: Math.max(insets.bottom, 8) }]}> 
          <BottomNavItem label="Home" icon="home" active={activeBottomTab === "home"} onPress={() => onBottomNavigate("home")} />
          <BottomNavItem
            label="Schedule"
            icon="calendar"
            active={activeBottomTab === "schedule"}
            onPress={() => onBottomNavigate("schedule")}
          />
          <BottomNavItem label="Profile" icon="user" active={activeBottomTab === "profile"} onPress={() => onBottomNavigate("profile")} />
        </View>
      </View>

      <StaffMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigateFromMenu}
        userName={userName}
        userEmail={userEmail}
        activeItem={activeItem}
        onSelectItem={setActiveItem}
        onSignOut={() => {
          setMenuVisible(false);
          logout();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBF7F1" },
  floatingTopBar: {
    position: "absolute",
    top: 40,
    left: 18,
    right: 18,
    zIndex: 40,
  },
  floatingTopBarInner: {
    backgroundColor: "#FFFDF9",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE5D8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#58452E",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  brandWrap: { flex: 1, alignItems: "flex-start", marginLeft: 10 },
  headerCaption: { color: "#A46944", fontSize: 10, fontWeight: "700", letterSpacing: 1.1 },
  brandText: { color: "#22354C", fontWeight: "800", fontSize: 18 },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9EFE4",
    borderWidth: 1,
    borderColor: "#F2E2D3",
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#EEB37D",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  bottomNavWrap: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 0,
    zIndex: 35,
  },
  bottomNavInner: {
    minHeight: 66,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EFE3D5",
    backgroundColor: "#FFFEFC",
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#5A4A35",
    shadowOpacity: 0.06,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  bottomNavIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNavIconWrapActive: {
    backgroundColor: "#DD8450",
  },
  bottomNavLabel: {
    color: "#7F8D9F",
    fontSize: 10,
    fontWeight: "600",
  },
  bottomNavLabelActive: {
    color: "#B15F2E",
    fontWeight: "800",
  },
  menuOverlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
    flexDirection: "row",
  },
  menuDimLayer: { flex: 1, backgroundColor: "rgba(21, 33, 53, 0.24)" },
  menuPanel: {
    width: 280,
    maxWidth: "84%",
    backgroundColor: "#FFFCF8",
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#1F2E43",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 2, height: 0 },
    elevation: 6,
  },
  menuTopBar: {
    marginHorizontal: 12,
    marginBottom: 6,
    backgroundColor: "#F6D0AF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8B991",
    paddingHorizontal: 11,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuBrandWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  menuBrandIcon: { width: 28, height: 28, borderRadius: 8 },
  menuBrandText: { color: "#6C3E20", fontSize: 13, fontWeight: "800" },
  roleBadge: {
    alignSelf: "flex-start",
    color: "#8A562E",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    marginBottom: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EBA978",
  },
  menuBody: { flex: 1, paddingHorizontal: 12 },
  menuBodyContent: { paddingTop: 2 },
  sectionWrap: { marginTop: 8 },
  sectionTitle: {
    color: "#7B8799",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.65,
    textTransform: "uppercase",
    marginBottom: 4,
    marginLeft: 3,
  },
  menuDivider: { height: 1, backgroundColor: "#ECE4D8", marginVertical: 10 },
  menuItem: {
    minHeight: 41,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  menuItemActive: {
    backgroundColor: "#D87D4A",
  },
  menuIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF1F5",
  },
  menuIconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  menuItemText: { color: "#27354B", fontSize: 14, fontWeight: "700" },
  menuItemTextActive: { color: "#FFFFFF" },
  userCard: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#F7EFE5",
    paddingHorizontal: 9,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userInfoWrap: { flex: 1 },
  avatarCircle: {
    width: 33,
    height: 33,
    borderRadius: 9,
    backgroundColor: "#E98E54",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  userName: { color: "#243449", fontWeight: "800", fontSize: 13 },
  userEmail: { marginTop: 1, color: "#6B7787", fontSize: 11 },
  signOutBtn: {
    minHeight: 40,
    paddingVertical: 8,
    borderRadius: 12,
    paddingHorizontal: 11,
    backgroundColor: "#FEEBEC",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  signOutText: { color: "#C62828", fontWeight: "800", fontSize: 14 },
});
