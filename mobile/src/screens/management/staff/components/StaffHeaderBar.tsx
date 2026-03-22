import { Pressable, StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface StaffHeaderBarProps {
  onOpenMenu: () => void;
}

export function StaffHeaderBar({ onOpenMenu }: StaffHeaderBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>●</Text>
        </View>
        <View style={styles.brandCol}>
          <Text style={styles.brandText}>HappyTails Staff</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Pressable style={styles.iconButton} onPress={onOpenMenu}>
          <Text style={styles.iconText}>☰</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: staffTheme.spacing.lg,
    marginTop: staffTheme.spacing.sm,
    paddingHorizontal: staffTheme.spacing.md,
    minHeight: 56,
    paddingVertical: 9,
    backgroundColor: staffTheme.colors.topBar,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: staffTheme.radius.lg,
    borderWidth: 1,
    borderColor: staffTheme.colors.topBarBorder,
    shadowColor: "#0D1620",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexShrink: 1,
  },
  logoBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(217,120,83,0.16)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(217,120,83,0.45)",
  },
  logoText: {
    color: "#F2A77D",
    fontSize: 13,
    fontWeight: "900",
  },
  brandCol: {
    gap: 0,
  },
  brandText: {
    color: "#FFF5EC",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.15,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  iconButton: {
    width: 33,
    height: 33,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 228, 216, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: "#FFF3E8",
    fontSize: 15,
    fontWeight: "800",
  },
});