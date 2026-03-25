import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, Modal, TouchableOpacity, Animated, Dimensions } from "react-native";
import { useState, useRef } from "react";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Landing">;

const BRAND_ICON = require("../../../assets/icon.png");

const SERVICE_ITEMS = ["Organic Spa", "AI Health Scan", "Luxury Boarding", "Styling and Groom"];
const COMPANY_ITEMS = ["About Us", "Our Team", "Blog and News", "Careers"];

export function LandingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").width)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };
  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").width,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  return (
    <View style={styles.screen}>
      {/* Menu Drawer */}
      <Modal visible={menuVisible} animationType="none" transparent onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={closeMenu} />
        <Animated.View style={[styles.menuDrawer, { transform: [{ translateX: slideAnim }] }]}>  
          <View style={[styles.menuHeader, { paddingTop: Math.max(insets.top + 12, 18) }]}>
            <View style={styles.menuBrandWrap}>
              <Image source={BRAND_ICON} style={styles.menuBrandIcon} resizeMode="cover" />
              <View>
                <Text style={styles.menuCaption}>PET SPA</Text>
                <Text style={styles.menuTitle}>
                  <Text style={styles.menuTitleDark}>Happy</Text>
                  <Text style={styles.menuTitleAccent}>Tails</Text>
                </Text>
              </View>
            </View>
            <Pressable style={styles.menuCloseBtn} onPress={closeMenu} hitSlop={10}>
              <Text style={styles.menuCloseText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.menuList}>
          </View>
          <View style={styles.menuFooter}>
            <Pressable style={styles.menuSignInBtn} onPress={() => { closeMenu(); navigation.navigate("Login"); }}>
              <Text style={styles.menuSignInText}>Sign In</Text>
            </Pressable>
            <Pressable style={styles.menuGetStartedBtn} onPress={() => { closeMenu(); navigation.navigate("Register"); }}>
              <Text style={styles.menuGetStartedText}>Get Started</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.topLightBar, { marginTop: Math.max(insets.top + 8, 18) }]}>
          <View style={styles.topLightBrandWrap}>
            <Image source={BRAND_ICON} style={styles.topLightIcon} resizeMode="cover" />
            <View style={styles.topLightTextWrap}>
              <Text style={styles.topLightCaption}>PET SPA</Text>
              <Text style={styles.topLightTitle}>
                <Text style={styles.topLightTitleDark}>Happy</Text>
                <Text style={styles.topLightTitleAccent}>Tails</Text>
              </Text>
            </View>
          </View>
          <Pressable onPress={openMenu} hitSlop={10} style={styles.topLightMenuBtn}>
            <Feather name="menu" size={22} color="#314760" />
          </Pressable>
        </View>

        <View style={styles.heroWrap}>
          <View style={styles.kickerPill}>
            <Text style={styles.kickerDot}>•</Text>
            <Text style={styles.kickerText}>THE FUTURE OF PET WELLNESS</Text>
          </View>

          <Text style={styles.heroTitle}>Sanctuary for</Text>
          <Text style={styles.heroTitleAccent}>Paws and Soul.</Text>

          <Text style={styles.heroDescription}>
            Experience the perfect blend of luxurious spa treatments and cutting-edge AI health diagnostics.
          </Text>

          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.primaryButtonText}>Book Appointment</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.secondaryPlay}>▶</Text>
            <Text style={styles.secondaryButtonText}>Our Story</Text>
          </Pressable>

          <View style={styles.trustRow}>
            <View style={styles.avatarGroup}>
              <View style={[styles.avatarDot, styles.avatarOne]} />
              <View style={[styles.avatarDot, styles.avatarTwo]} />
              <View style={[styles.avatarDot, styles.avatarThree]} />
              <View style={[styles.avatarDot, styles.avatarFour]} />
            </View>
            <View>
              <Text style={styles.stars}>★★★★★</Text>
              <Text style={styles.trustText}>Trusted by 2,000+ Owners</Text>
            </View>
          </View>
        </View>

        <View style={styles.imageSection}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?auto=format&fit=crop&w=1200&q=80" }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Đã xóa darkFloatBar theo yêu cầu */}

          <View style={styles.healthCard}>
            <View style={styles.healthIconCircle}>
              <Text style={styles.healthIcon}>∿</Text>
            </View>
            <View>
              <Text style={styles.healthLabel}>AI HEALTH SCAN</Text>
              <Text style={styles.healthTitle}>Rex is completely healthy!</Text>
            </View>
          </View>
        </View>

        <View style={styles.marqueeBar}>
          <Text style={styles.marqueeText}>AI DIAGNOSIS   ★   LUXURY HOTEL   ★   GROOMING ART   ★   PREMIUM SPA   ★</Text>
        </View>

        <View style={styles.quoteBlock}>
          <Text style={styles.quoteText}>
            We believe pets are family, and family deserves the <Text style={styles.quoteAccent}>ultimate relaxation.</Text>
          </Text>
        </View>

        <View style={styles.featuresWrap}>
          <View style={styles.featureItem}>
            <Text style={styles.featureTitle}>Organic Products</Text>
            <Text style={styles.featureDesc}>100% natural, chemical-free shampoos.</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureTitle}>Stress-Free Zone</Text>
            <Text style={styles.featureDesc}>Sound-proofed rooms with calming pheromones.</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureTitle}>AI Transparency</Text>
            <Text style={styles.featureDesc}>Real-time health updates sent to your phone.</Text>
          </View>
        </View>

        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Drawer menu styles
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 100,
  },
  menuDrawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 320,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: -2, height: 0 },
    elevation: 12,
    zIndex: 101,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#F2F2F2',
    backgroundColor: '#fff',
  },
  menuBrandWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBrandIcon: { width: 44, height: 44, borderRadius: 13, marginRight: 4 },
  menuCaption: { color: '#9AA3B2', fontWeight: '700', fontSize: 10, letterSpacing: 1.5, lineHeight: 12 },
  menuTitle: { fontSize: 18, lineHeight: 20, fontWeight: '900' },
  menuTitleDark: { color: '#1B2940' },
  menuTitleAccent: { color: '#F08A40' },
  menuCloseBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F6F6' },
  menuCloseText: { color: '#344054', fontSize: 26, fontWeight: '900', lineHeight: 28 },
  menuList: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 },
  menuItem: { paddingVertical: 10 },
  menuItemText: { color: '#232B3A', fontSize: 17, fontWeight: '700' },
  menuFooter: { marginTop: 18, paddingHorizontal: 18 },
  menuSignInBtn: {
    borderWidth: 1,
    borderColor: '#E7DED1',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  menuSignInText: { color: '#232B3A', fontWeight: '700', fontSize: 16 },
  menuGetStartedBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    marginBottom: 8,
    shadowColor: '#FF8C42',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  menuGetStartedText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  screen: {
    flex: 1,
    backgroundColor: "#F4F1EC",
  },
  content: {
    paddingBottom: 36,
  },
  topLightBar: {
    marginTop: 18,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#EFE5D8",
    backgroundColor: "#FFFDF9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#58452E",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  topLightBrandWrap: { flexDirection: "row", alignItems: "center", gap: 9 },
  topLightIcon: { width: 38, height: 38, borderRadius: 12 },
  topLightTextWrap: { justifyContent: "center" },
  topLightCaption: {
    color: "#A46944",
    fontWeight: "700",
    fontSize: 9,
    letterSpacing: 1.1,
    lineHeight: 11,
  },
  topLightTitle: { fontSize: 31, lineHeight: 32, fontWeight: "900" },
  topLightTitleDark: { color: "#22354C" },
  topLightTitleAccent: { color: "#E37D35" },
  topLightMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9EFE4",
    borderWidth: 1,
    borderColor: "#F2E2D3",
  },

  heroWrap: { marginTop: 24, paddingHorizontal: 24, gap: 14 },
  kickerPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#D4D9E2",
    borderRadius: 999,
    backgroundColor: "#F8F8F7",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  kickerDot: { color: "#D87D4A", fontSize: 14, lineHeight: 16 },
  kickerText: { color: "#637189", fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },
  heroTitle: {
    color: "#1F2E39",
    fontSize: 58,
    lineHeight: 62,
    fontWeight: "900",
    marginTop: 10,
  },
  heroTitleAccent: {
    color: "#D67A4B",
    fontSize: 56,
    lineHeight: 58,
    fontWeight: "800",
    marginTop: -10,
    fontStyle: "italic",
    fontFamily: "serif",
  },
  heroDescription: {
    marginTop: 8,
    color: "#4D5E78",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
    maxWidth: 342,
  },
  primaryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#26323A",
    paddingHorizontal: 24,
    paddingVertical: 13,
    shadowColor: "#101828",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D6D9E1",
    backgroundColor: "#F8F8F7",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryPlay: { color: "#3E4A5E", fontSize: 12, lineHeight: 14, fontWeight: "700" },
  secondaryButtonText: {
    color: "#3E4A5E",
    fontSize: 14,
    lineHeight: 16,
    fontWeight: "700",
  },
  trustRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarGroup: { flexDirection: "row" },
  avatarDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#F4F1EC",
    marginRight: -8,
  },
  avatarOne: { backgroundColor: "#A35D5D" },
  avatarTwo: { backgroundColor: "#7A647C" },
  avatarThree: { backgroundColor: "#7F6A57" },
  avatarFour: { backgroundColor: "#B9845D" },
  stars: { color: "#D67A4B", fontSize: 16, lineHeight: 18, fontWeight: "800" },
  trustText: { color: "#6B7A90", fontSize: 13, lineHeight: 15, fontWeight: "600" },

  imageSection: {
    marginTop: 20,
    marginHorizontal: 4,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: 338,
  },
  darkFloatBar: {
    position: "absolute",
    top: 12,
    left: 14,
    right: 14,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(15, 31, 61, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  darkFloatBrandWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  darkLogoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F37A24",
    alignItems: "center",
    justifyContent: "center",
  },
  darkLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  darkBrandText: { fontSize: 12, lineHeight: 14, fontWeight: "900" },
  darkBrandPrimary: { color: "#ECF0F8" },
  darkBrandAccent: { color: "#F08A40" },
  darkMenu: { color: "#ECF0F8", fontSize: 25, lineHeight: 28, fontWeight: "700" },

  healthCard: {
    position: "absolute",
    left: 10,
    bottom: 16,
    backgroundColor: "#F8F6F3",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 200,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  healthIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DDEFCF",
    alignItems: "center",
    justifyContent: "center",
  },
  healthIcon: {
    color: "#5C9154",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "700",
  },
  healthLabel: {
    color: "#9EA6A8",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  healthTitle: {
    marginTop: 2,
    color: "#2C3943",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
  },

  marqueeBar: {
    marginTop: 34,
    marginHorizontal: -2,
    paddingVertical: 11,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#29333A",
    backgroundColor: "#D67A4B",
  },
  marqueeText: {
    color: "#1F2E39",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    fontStyle: "italic",
    textAlign: "center",
  },

  quoteBlock: {
    marginTop: 54,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  quoteText: {
    color: "#1F2E39",
    fontSize: 22,
    lineHeight: 36,
    textAlign: "center",
    fontFamily: "serif",
  },
  quoteAccent: {
    color: "#608845",
    fontStyle: "italic",
  },

  featuresWrap: {
    marginTop: 36,
    gap: 24,
    paddingHorizontal: 24,
  },
  featureItem: {
    borderLeftWidth: 2,
    borderLeftColor: "#D87D4A",
    paddingLeft: 16,
  },
  featureTitle: {
    color: "#1F2E39",
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "800",
  },
  featureDesc: {
    marginTop: 6,
    color: "#5F6F85",
    fontSize: 13,
    lineHeight: 20,
  },

  lowerPanel: {
    marginTop: 38,
    backgroundColor: "#F6F6F5",
    paddingBottom: 28,
    paddingHorizontal: 16,
    position: "relative",
    overflow: "hidden",
  },
  darkFloatBarLower: {
    marginTop: 4,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(15, 31, 61, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  lowerBrandRow: {
    marginTop: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lowerBrandLogoBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#2E3740",
    alignItems: "center",
    justifyContent: "center",
  },
  lowerBrandLogoImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  lowerBrandTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
  },
  lowerBrandTitlePrimary: {
    color: "#102B45",
  },
  lowerBrandTitleAccent: {
    color: "#DF7756",
  },
  lowerIntroText: {
    marginTop: 18,
    color: "#6D798B",
    fontSize: 14,
    lineHeight: 26,
    maxWidth: 320,
  },
  socialRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  socialChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECECEA",
    alignItems: "center",
    justifyContent: "center",
  },
  socialText: {
    color: "#6D798B",
    fontSize: 15,
    lineHeight: 17,
    fontWeight: "500",
  },
  sectionWrap: {
    marginTop: 36,
  },
  sectionTitle: {
    color: "#0F2740",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionLink: {
    color: "#607084",
    fontSize: 17,
    lineHeight: 24,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 5,
    paddingRight: 16,
  },
  contactIcon: {
    width: 18,
    textAlign: "center",
    color: "#E77E4D",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 3,
  },
  contactText: {
    flex: 1,
    color: "#677688",
    fontSize: 16,
    lineHeight: 24,
  },
  circle: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15, 39, 64, 0.04)",
    backgroundColor: "rgba(15, 39, 64, 0.02)",
  },
  circleOne: {
    width: 98,
    height: 98,
    right: 6,
    bottom: 134,
  },
  circleTwo: {
    width: 160,
    height: 160,
    left: -18,
    bottom: 18,
  },
  circleThree: {
    width: 68,
    height: 68,
    right: 16,
    bottom: 46,
  },
  circleFour: {
    width: 120,
    height: 120,
    left: 66,
    bottom: 84,
  },
});
