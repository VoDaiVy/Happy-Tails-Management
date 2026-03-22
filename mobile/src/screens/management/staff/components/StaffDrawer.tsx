import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface StaffDrawerProps {
  visible: boolean;
  staffName: string;
  staffEmail: string;
  staffRole: string;
  onClose: () => void;
  onGoManagement: () => void;
  onGoNewsPolicy: () => void;
  onGoProfile: () => void;
  onSignOut: () => void;
}

const MENU_ITEMS: Array<{
  key: "management" | "news-policy" | "profile";
  label: string;
  subtitle: string;
  icon: string;
}> = [
  { key: "management", label: "Management", subtitle: "Open staff dashboard", icon: "◫" },
  { key: "news-policy", label: "News & Policy", subtitle: "View posts and policies", icon: "◉" },
  { key: "profile", label: "Profile", subtitle: "Account and personal details", icon: "◌" },
];

export function StaffDrawer({
  visible,
  staffName,
  staffEmail,
  staffRole,
  onClose,
  onGoManagement,
  onGoNewsPolicy,
  onGoProfile,
  onSignOut,
}: StaffDrawerProps) {
  const initial = (staffName || "S").slice(0, 1).toUpperCase();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }

    Animated.spring(progress, {
      toValue: 1,
      friction: 10,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [84, 0],
  });

  const dimOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.dim, { opacity: dimOpacity }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.handle} />

          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.profileTextCol}>
              <Text style={styles.profileName}>{staffName || "Staff"}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>{staffEmail || "No email"}</Text>
              <Text style={styles.profileRole}>{staffRole || "staff"}</Text>
            </View>
          </View>

          <View style={styles.menuList}>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.item,
                  item.key === "management" && styles.itemActive,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => {
                  if (item.key === "management") onGoManagement();
                  if (item.key === "news-policy") onGoNewsPolicy();
                  if (item.key === "profile") onGoProfile();
                  onClose();
                }}
              >
                <View style={styles.itemIconWrap}><Text style={styles.itemIcon}>{item.icon}</Text></View>
                <View style={styles.itemTextCol}>
                  <Text style={[styles.itemText, item.key === "management" && styles.itemTextActive]}>{item.label}</Text>
                  <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutPressed]}
            onPress={() => {
              onClose();
              onSignOut();
            }}
          >
            <Text style={styles.signOutIcon}>⎋</Text>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(19, 25, 34, 0.34)",
  },
  sheet: {
    backgroundColor: "#FFF9F3",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#E9DBC9",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 12,
    ...staffTheme.shadow.elevated,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D8C9B7",
    marginBottom: 4,
  },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEDFCF",
    backgroundColor: "#FFFDF9",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: staffTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  profileTextCol: {
    flex: 1,
    gap: 1,
  },
  profileName: {
    color: staffTheme.colors.text,
    fontWeight: "800",
    fontSize: 14,
  },
  profileEmail: {
    color: staffTheme.colors.textSecondary,
    fontSize: 11,
  },
  profileRole: {
    color: staffTheme.colors.primaryStrong,
    fontSize: 10,
    fontWeight: "700",
  },
  menuList: {
    gap: 8,
  },
  item: {
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
  itemActive: {
    backgroundColor: staffTheme.colors.primarySoft,
    borderWidth: 1,
    borderColor: "#F0C7A0",
  },
  itemPressed: {
    backgroundColor: "#FFF6ED",
  },
  itemIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#F7EEE4",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIcon: {
    color: staffTheme.colors.primaryStrong,
    fontSize: 12,
    fontWeight: "900",
  },
  itemText: {
    color: staffTheme.colors.textMuted,
    fontWeight: "700",
    fontSize: 13,
  },
  itemTextCol: {
    flex: 1,
    gap: 1,
  },
  itemSubtitle: {
    color: staffTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "500",
  },
  itemTextActive: {
    color: staffTheme.colors.text,
  },
  divider: {
    marginTop: 2,
    height: 1,
    backgroundColor: "#EADDCF",
  },
  signOutButton: {
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
  },
  signOutIcon: {
    color: "#C94A4A",
    fontSize: 13,
    fontWeight: "800",
  },
  signOutText: {
    color: "#B73E3E",
    fontSize: 13,
    fontWeight: "800",
  },
  signOutPressed: {
    backgroundColor: "#FEEEEB",
  },
});
