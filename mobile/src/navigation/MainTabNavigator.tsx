import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { getCart } from "../api/modules/cartApi";
import { getUnreadCount } from "../api/modules/notificationApi";
import { AccountStackNavigator } from "./AccountStackNavigator";
import { BookingStackNavigator } from "./BookingStackNavigator";
import { InfoStackNavigator } from "./InfoStackNavigator";
import type { MainTabParamList } from "./types";
import { ManagementScreen } from "../screens/management/ManagementScreen";
import { canUseCustomerFeatures, isStaffOrAdminRole } from "../utils/role";
import { ServicesStackNavigator } from "./ServicesStackNavigator";
import { serviceHeaderScrollY } from "./serviceHeaderScroll";
import { resolveImageUrl } from "../utils/image";

const Tab = createBottomTabNavigator<MainTabParamList>();

const BRAND_ICON = require("../../assets/icon.png");

type BottomTabKey = "home" | "service" | "bookings" | "pets" | "profile";
type CustomerMenuKey =
  | "services"
  | "booking"
  | "newsPolicy"
  | "management"
  | "profile"
  | "myPets"
  | "shoppingCart"
  | "bookings"
  | "wallet";

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (tab: keyof MainTabParamList, nestedScreen?: string) => void;
  showCustomerTabs: boolean;
  showManagementTab: boolean;
  cartCount: number;
  userName: string;
  userEmail: string;
  userAvatar: string;
  activeMenuKey: CustomerMenuKey;
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
  userAvatar,
  activeMenuKey,
  onSignOut,
}: SideMenuProps) {
  const insets = useSafeAreaInsets();
  const drawerWidth = 280;
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

  const iconColor = (active: boolean) => (active ? "#FFFFFF" : "#5F6B7D");

  const onMenuPress = (tab: keyof MainTabParamList, nestedScreen?: string) => {
    onNavigate(tab, nestedScreen);
  };

  const menuItemHitSlop = { top: 6, bottom: 6, left: 6, right: 6 };

  return (
    <View style={styles.menuOverlayRoot} pointerEvents="box-none">
      <Animated.View style={[styles.menuDimLayer, { opacity: dimOpacity }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.menuPanel, { transform: [{ translateX: panelTranslateX }] }]}>
        <View style={[styles.menuTopBar, { marginTop: Math.max(insets.top, 6) + 6 }]}> 
          <View style={styles.menuBrandWrap}>
            <Image source={BRAND_ICON} style={styles.menuBrandIcon} resizeMode="cover" />
            <View>
              <Text style={styles.roleBadge}>CUSTOMER</Text>
              <Text style={styles.menuBrandText}>HappyTails</Text>
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
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Main</Text>

            <Pressable
              style={[styles.menuItem, activeMenuKey === "services" && styles.menuItemActive]}
              onPress={() => onMenuPress("ServicesTab", "ServiceList")}
              hitSlop={menuItemHitSlop}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <View style={[styles.menuIconWrap, activeMenuKey === "services" && styles.menuIconWrapActive]}>
                <Feather name="briefcase" size={18} color={iconColor(activeMenuKey === "services")} />
              </View>
              <Text style={[styles.menuItemText, activeMenuKey === "services" && styles.menuItemTextActive]}>Services</Text>
            </Pressable>

            {showCustomerTabs ? (
              <Pressable
                style={[styles.menuItem, activeMenuKey === "booking" && styles.menuItemActive]}
                onPress={() => onMenuPress("BookingTab", "MyBookings")}
                hitSlop={menuItemHitSlop}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <View style={[styles.menuIconWrap, activeMenuKey === "booking" && styles.menuIconWrapActive]}>
                  <Feather name="calendar" size={18} color={iconColor(activeMenuKey === "booking")} />
                </View>
                <Text style={[styles.menuItemText, activeMenuKey === "booking" && styles.menuItemTextActive]}>Booking</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.menuItem, activeMenuKey === "newsPolicy" && styles.menuItemActive]}
              onPress={() => onMenuPress("InfoTab", "NewsPolicyHome")}
              hitSlop={menuItemHitSlop}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <View style={[styles.menuIconWrap, activeMenuKey === "newsPolicy" && styles.menuIconWrapActive]}>
                <Feather name="file-text" size={18} color={iconColor(activeMenuKey === "newsPolicy")} />
              </View>
              <Text style={[styles.menuItemText, activeMenuKey === "newsPolicy" && styles.menuItemTextActive]}>News & Policy</Text>
            </Pressable>

            {showManagementTab ? (
              <Pressable
                style={[styles.menuItem, activeMenuKey === "management" && styles.menuItemActive]}
                onPress={() => onMenuPress("ManagementTab")}
                hitSlop={menuItemHitSlop}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <View style={[styles.menuIconWrap, activeMenuKey === "management" && styles.menuIconWrapActive]}>
                  <Feather name="grid" size={18} color={iconColor(activeMenuKey === "management")} />
                </View>
                <Text style={[styles.menuItemText, activeMenuKey === "management" && styles.menuItemTextActive]}>Management</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Account</Text>

            <View style={styles.userCard}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatarCircleImage} resizeMode="cover" />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{userName.slice(0, 1).toUpperCase() || "U"}</Text>
                </View>
              )}
              <View style={styles.userInfoWrap}>
                <Text style={styles.userName}>{userName || "Guest"}</Text>
                <Text style={styles.userEmail}>{userEmail || "No email"}</Text>
              </View>
            </View>

            <Pressable
              style={[styles.menuItem, activeMenuKey === "profile" && styles.menuItemActive]}
              onPress={() => onMenuPress("AccountTab", "Profile")}
              hitSlop={menuItemHitSlop}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <View style={[styles.menuIconWrap, activeMenuKey === "profile" && styles.menuIconWrapActive]}>
                <Feather name="user" size={18} color={iconColor(activeMenuKey === "profile")} />
              </View>
              <Text style={[styles.menuItemText, activeMenuKey === "profile" && styles.menuItemTextActive]}>Profile</Text>
            </Pressable>

            <Pressable
              style={[styles.menuItem, activeMenuKey === "myPets" && styles.menuItemActive]}
              onPress={() => onMenuPress("AccountTab", "MyPets")}
              hitSlop={menuItemHitSlop}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <View style={[styles.menuIconWrap, activeMenuKey === "myPets" && styles.menuIconWrapActive]}>
                <Feather name="heart" size={18} color={iconColor(activeMenuKey === "myPets")} />
              </View>
              <Text style={[styles.menuItemText, activeMenuKey === "myPets" && styles.menuItemTextActive]}>My Pets</Text>
            </Pressable>

            <Pressable
              style={[styles.menuItem, activeMenuKey === "shoppingCart" && styles.menuItemActive]}
              onPress={() => onMenuPress("AccountTab", "ShoppingCart")}
              hitSlop={menuItemHitSlop}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <View style={[styles.menuIconWrap, activeMenuKey === "shoppingCart" && styles.menuIconWrapActive]}>
                <Feather name="shopping-cart" size={18} color={iconColor(activeMenuKey === "shoppingCart")} />
              </View>
              <View style={styles.menuItemRow}>
                <Text style={[styles.menuItemText, activeMenuKey === "shoppingCart" && styles.menuItemTextActive]}>Shopping Cart</Text>
                {cartCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartCount}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>

            <Pressable
              style={[styles.menuItem, activeMenuKey === "bookings" && styles.menuItemActive]}
              onPress={() => onMenuPress("AccountTab", "MyBookings")}
              hitSlop={menuItemHitSlop}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <View style={[styles.menuIconWrap, activeMenuKey === "bookings" && styles.menuIconWrapActive]}>
                <Feather name="clipboard" size={18} color={iconColor(activeMenuKey === "bookings")} />
              </View>
              <Text style={[styles.menuItemText, activeMenuKey === "bookings" && styles.menuItemTextActive]}>Bookings</Text>
            </Pressable>

            <Pressable
              style={[styles.menuItem, activeMenuKey === "wallet" && styles.menuItemActive]}
              onPress={() => onMenuPress("AccountTab", "Wallet")}
              hitSlop={menuItemHitSlop}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <View style={[styles.menuIconWrap, activeMenuKey === "wallet" && styles.menuIconWrapActive]}>
                <Feather name="credit-card" size={18} color={iconColor(activeMenuKey === "wallet")} />
              </View>
              <Text style={[styles.menuItemText, activeMenuKey === "wallet" && styles.menuItemTextActive]}>Wallet</Text>
            </Pressable>
          </View>

          <Pressable style={styles.signOutBtn} onPress={onSignOut} hitSlop={menuItemHitSlop} android_ripple={{ color: "rgba(198,40,40,0.08)" }}>
            <Feather name="log-out" size={18} color="#C62828" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function BottomNavItem({
  label,
  icon,
  active,
  badgeCount,
  onPress,
}: {
  label: string;
  icon: "home" | "briefcase" | "calendar" | "heart" | "user";
  active: boolean;
  badgeCount?: number;
  onPress: () => void;
}) {
  const showBadge = Boolean(badgeCount && badgeCount > 0);

  return (
    <Pressable style={styles.bottomNavItem} onPress={onPress}>
      <View style={[styles.bottomNavItemSurface, active && styles.bottomNavItemSurfaceActive]}>
        <View style={styles.bottomNavIconOuter}>
          <Feather name={icon} size={18} color={active ? "#B35B28" : "#6B5342"} />
          {showBadge ? (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{badgeCount! > 99 ? "99+" : badgeCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.bottomNavLabel, active && styles.bottomNavLabelActive]} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}

export function MainTabNavigator() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const showCustomerTabs = canUseCustomerFeatures(user?.role);
  const showManagementTab = isStaffOrAdminRole(user?.role);
  const [menuVisible, setMenuVisible] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [activeScreenName, setActiveScreenName] = useState("ServiceList");
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTabKey>("home");

  const activeMenuKey = useMemo<CustomerMenuKey>(() => {
    if (["ServiceList", "ServiceDetail"].includes(activeScreenName)) return "services";
    if (["BookingDetail", "BookingCamera"].includes(activeScreenName)) return "booking";
    if (activeScreenName === "MyBookings") return "bookings";
    if (["NewsPolicyHome", "NewsDetail", "PolicyDetail"].includes(activeScreenName)) return "newsPolicy";
    if (["Profile", "ChangePassword"].includes(activeScreenName)) return "profile";
    if (activeScreenName === "MyPets") return "myPets";
    if (activeScreenName === "ShoppingCart") return "shoppingCart";
    if (activeScreenName === "Wallet" || activeScreenName === "WalletTransactionDetail") return "wallet";
    if (["ManagementHome", "Management"].includes(activeScreenName)) return "management";
    return "services";
  }, [activeScreenName]);

  const userName = useMemo(() => {
    return String(user?.name || "User");
  }, [user]);

  const userEmail = useMemo(() => String(user?.email || ""), [user]);
  const userAvatar = useMemo(() => resolveImageUrl(user?.avatar), [user?.avatar]);

  const refreshCartCount = useCallback(async () => {
    if (!showCustomerTabs) {
      setCartCount(0);
      return;
    }

    try {
      const cart = await getCart();
      setCartCount(Number(cart.totalItems || 0));
    } catch {
      // Keep previous badge value if fetching fails.
    }
  }, [showCustomerTabs]);

  const refreshUnreadAlertCount = useCallback(async () => {
    if (!showCustomerTabs) {
      setUnreadAlertCount(0);
      return;
    }

    try {
      const count = await getUnreadCount();
      setUnreadAlertCount(Number(count || 0));
    } catch {
      // Keep the previous badge value if fetching fails.
    }
  }, [showCustomerTabs]);

  useEffect(() => {
    refreshUnreadAlertCount();
  }, [refreshUnreadAlertCount]);

  const refreshHeaderBadges = useCallback(async () => {
    await Promise.all([refreshCartCount(), refreshUnreadAlertCount()]);
  }, [refreshCartCount, refreshUnreadAlertCount]);

  useEffect(() => {
    if (!showCustomerTabs) return;

    refreshHeaderBadges();

    const timer = setInterval(() => {
      refreshHeaderBadges();
    }, 15000);

    return () => clearInterval(timer);
  }, [refreshHeaderBadges, showCustomerTabs]);

  useEffect(() => {
    if (!menuVisible || !showCustomerTabs) return;
    refreshHeaderBadges();
  }, [menuVisible, refreshHeaderBadges, showCustomerTabs]);

  const onNavigateFromMenu = useCallback(
    (tab: keyof MainTabParamList, nestedScreen?: string) => {
      setMenuVisible(false);

      if (tab === "ServicesTab") {
        setActiveBottomTab("service");
      } else if (tab === "BookingTab") {
        setActiveBottomTab("bookings");
      } else if (tab === "InfoTab") {
        setActiveBottomTab("home");
      } else if (tab === "AccountTab") {
        if (nestedScreen === "MyPets") {
          setActiveBottomTab("pets");
        } else {
          setActiveBottomTab("profile");
        }
      }

      requestAnimationFrame(() => {
        if (nestedScreen) {
          navigation.navigate(tab, { screen: nestedScreen });
          return;
        }
        navigation.navigate(tab);
      });
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
            outputRange: [1, 0.94],
          }),
        },
      ],
    }),
    [headerShrinkProgress],
  );

  const getDeepestRoute = useCallback((state: any) => {
    if (!state?.routes || typeof state.index !== "number") {
      return { tabName: "ServicesTab", screenName: "ServiceList" };
    }

    let route = state.routes[state.index];
    const tabName = route?.name;

    while (route?.state?.routes && typeof route.state.index === "number") {
      route = route.state.routes[route.state.index];
    }

    return {
      tabName: String(tabName || "ServicesTab"),
      screenName: String(route?.name || "ServiceList"),
    };
  }, []);

  const syncBottomTabByRoute = useCallback((tabName?: string, screenName?: string) => {
    if (tabName === "BookingTab") {
      setActiveBottomTab("bookings");
      return;
    }

    if (tabName === "InfoTab") {
      setActiveBottomTab("home");
      return;
    }

    if (tabName === "AccountTab") {
      if (screenName === "MyPets") {
        setActiveBottomTab("pets");
      } else {
        setActiveBottomTab("profile");
      }
      return;
    }

    if (tabName === "ServicesTab") {
      setActiveBottomTab("service");
    }
  }, []);

  const onBottomNavigate = useCallback(
    (tab: BottomTabKey) => {
      if (tab === "home") {
        setActiveBottomTab("home");
        navigation.navigate("InfoTab", { screen: "NewsPolicyHome" });
        return;
      }

      if (tab === "service") {
        setActiveBottomTab("service");
        navigation.navigate("ServicesTab", { screen: "ServiceList" });
        return;
      }

      if (tab === "bookings") {
        setActiveBottomTab("bookings");
        navigation.navigate("BookingTab", { screen: "MyBookings" });
        return;
      }

      if (tab === "pets") {
        setActiveBottomTab("pets");
        navigation.navigate("AccountTab", { screen: "MyPets" });
        return;
      }

      setActiveBottomTab("profile");
      navigation.navigate("AccountTab", { screen: "Profile" });
    },
    [navigation],
  );

  const showFloatingTopBar = showCustomerTabs && activeScreenName !== "ServiceDetail";

  return (
    <View style={styles.root}>
      <Tab.Navigator
        screenListeners={{
          state: (event) => {
            const route = getDeepestRoute(event.data.state);
            setActiveScreenName(route.screenName);
            syncBottomTabByRoute(route.tabName, route.screenName);
            refreshHeaderBadges();
          },
        }}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          sceneStyle: {
            paddingTop: showFloatingTopBar ? 98 : 0,
            paddingBottom: showCustomerTabs ? Math.max(insets.bottom + 88, 96) : 0,
          },
        }}
      >
        <Tab.Screen name="ServicesTab" component={ServicesStackNavigator} options={{ title: "Services" }} />
        {showCustomerTabs ? <Tab.Screen name="BookingTab" component={BookingStackNavigator} options={{ title: "Booking" }} /> : null}
        <Tab.Screen name="InfoTab" component={InfoStackNavigator} options={{ title: "News & Policy" }} />
        {showManagementTab ? <Tab.Screen name="ManagementTab" component={ManagementScreen} options={{ title: "Management" }} /> : null}
        <Tab.Screen name="AccountTab" component={AccountStackNavigator} options={{ title: "Account" }} />
      </Tab.Navigator>

      {showFloatingTopBar ? (
        <View style={styles.floatingTopBar} pointerEvents="box-none">
          <Animated.View style={[styles.floatingTopBarInner, animatedTopBarStyle]}>
            <Pressable onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
              <Feather name="menu" size={19} color="#314760" />
            </Pressable>
            <Animated.View style={[styles.headerBrandWrap, animatedBrandStyle]}>
              <Text style={styles.headerCaption}>CUSTOMER</Text>
              <Text style={styles.headerBrandText}>Happy Tails</Text>
            </Animated.View>
            <View style={styles.headerRightGroup}>
              <Pressable
                style={styles.headerCartButton}
                onPress={() => {
                  setActiveBottomTab("profile");
                  navigation.navigate("AccountTab", { screen: "ShoppingCart" });
                }}
              >
                <Feather name="shopping-cart" size={17} color="#7B8DA6" />
                {cartCount > 0 ? (
                  <View style={styles.headerCartDotBadge} />
                ) : null}
              </Pressable>

              <Pressable
                style={styles.headerBellButton}
                onPress={() => {
                  setActiveBottomTab("profile");
                  navigation.navigate("AccountTab", { screen: "NotificationCenter" });
                }}
              >
                <Feather name="bell" size={17} color="#7B8DA6" />
                {unreadAlertCount > 0 ? (
                  <View style={styles.headerCountBadge}>
                    <Text style={styles.headerCountBadgeText}>{unreadAlertCount > 99 ? "99+" : unreadAlertCount}</Text>
                  </View>
                ) : null}
              </Pressable>

              <View style={styles.headerAvatar}>
                {userAvatar ? (
                  <Image source={{ uri: userAvatar }} style={styles.headerAvatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.headerAvatarText}>{userName.slice(0, 1).toUpperCase() || "C"}</Text>
                )}
              </View>
            </View>
          </Animated.View>
        </View>
      ) : null}

      {showCustomerTabs && !menuVisible ? (
        <View style={styles.bottomNavWrap} pointerEvents="box-none">
          <View style={[styles.bottomNavInner, { paddingBottom: Math.max(insets.bottom, 8) + 6 }]}>
            <BottomNavItem
              label="News"
              icon="home"
              active={activeBottomTab === "home"}
              onPress={() => onBottomNavigate("home")}
            />
            <BottomNavItem
              label="Service"
              icon="briefcase"
              active={activeBottomTab === "service"}
              onPress={() => onBottomNavigate("service")}
            />
            <BottomNavItem
              label="My Booking"
              icon="calendar"
              active={activeBottomTab === "bookings"}
              onPress={() => onBottomNavigate("bookings")}
            />
            <BottomNavItem
              label="My Pets"
              icon="heart"
              active={activeBottomTab === "pets"}
              onPress={() => onBottomNavigate("pets")}
            />
            <BottomNavItem
              label="Profile"
              icon="user"
              active={activeBottomTab === "profile"}
              onPress={() => onBottomNavigate("profile")}
            />
          </View>
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
        userAvatar={userAvatar}
        activeMenuKey={activeMenuKey}
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
  headerBrandWrap: { flex: 1, alignItems: "flex-start", marginLeft: 10 },
  headerCaption: { color: "#A46944", fontSize: 10, fontWeight: "700", letterSpacing: 1.1 },
  headerBrandText: { color: "#22354C", fontWeight: "800", fontSize: 18 },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerCartButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F3F6FB",
    borderWidth: 1,
    borderColor: "#E6ECF4",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerBellButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F3F6FB",
    borderWidth: 1,
    borderColor: "#E6ECF4",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F26A00",
    borderWidth: 1,
    borderColor: "#FFFDF9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  headerCountBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    lineHeight: 10,
    fontWeight: "900",
  },
  headerCartDotBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F26A00",
    borderWidth: 1,
    borderColor: "#FFFDF9",
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#EEB37D",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatarImage: { width: "100%", height: "100%" },
  headerAvatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  bottomNavWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 35,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#FB923C",
    borderBottomWidth: 0,
    backgroundColor: "#F9F7F4",
    overflow: "hidden",
    shadowColor: "#4C3523",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bottomNavInner: {
    minHeight: 78,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    paddingHorizontal: 10,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNavItemSurface: {
    minWidth: 64,
    minHeight: 60,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bottomNavItemSurfaceActive: {
    backgroundColor: "#F5D8C8",
  },
  bottomNavIconOuter: { width: 28, height: 24, alignItems: "center", justifyContent: "center" },
  bottomNavLabel: {
    marginTop: 5,
    color: "#6A5445",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  bottomNavLabelActive: {
    color: "#B35B28",
    fontWeight: "800",
  },
  alertBadge: {
    position: "absolute",
    top: -3,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: "#F26A00",
    borderWidth: 1,
    borderColor: "#FFF6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  alertBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
  },
  menuOverlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
    flexDirection: "row",
  },
  menuDimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(21, 33, 53, 0.24)",
    zIndex: 1,
  },
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
    zIndex: 2,
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
  roleBadge: {
    alignSelf: "flex-start",
    color: "#8A562E",
    fontWeight: "800",
    fontSize: 9,
    letterSpacing: 0.9,
    marginBottom: 1,
  },
  menuBrandText: { color: "#6C3E20", fontSize: 13, fontWeight: "800" },
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
    marginBottom: 4,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.65,
    color: "#7B8799",
    textTransform: "uppercase",
    marginLeft: 3,
  },
  menuDivider: { height: 1, backgroundColor: "#ECE4D8", marginVertical: 10 },
  menuItem: {
    minHeight: 41,
    width: "100%",
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
  menuItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flex: 1 },
  badge: {
    minWidth: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: "#F08A40",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
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
  avatarCircleImage: { width: 33, height: 33, borderRadius: 9 },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  userName: { color: "#243449", fontWeight: "800", fontSize: 13 },
  userEmail: { marginTop: 1, color: "#6B7787", fontSize: 11 },
  signOutBtn: {
    minHeight: 40,
    paddingVertical: 8,
    marginTop: 6,
    borderRadius: 12,
    paddingHorizontal: 11,
    backgroundColor: "#FEEBEC",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  signOutText: { color: "#C62828", fontWeight: "800", fontSize: 14 },
});
