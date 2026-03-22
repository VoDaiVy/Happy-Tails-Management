import { Pressable, StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface StaffHeaderBarProps {
  activeModuleLabel: string;
  staffName: string;
  onOpenMenu: () => void;
}

export function StaffHeaderBar({ activeModuleLabel, staffName, onOpenMenu }: StaffHeaderBarProps) {
  const firstName = staffName.split(" ")[0] || "Staff";

  return (
    <View style={styles.wrap}>
      <View style={styles.glow} />

      <View style={styles.left}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>HT</Text>
        </View>
        <View style={styles.brandCol}>
          <Text style={styles.eyebrow}>HAPPYTAILS OPS</Text>
          <Text style={styles.brandText}>Xin chao, {firstName}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <View style={styles.moduleBadge}>
          <Text style={styles.moduleBadgeText}>{activeModuleLabel}</Text>
        </View>
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
    marginTop: staffTheme.spacing.xs,
    paddingHorizontal: 14,
    minHeight: 64,
    paddingVertical: 10,
    backgroundColor: "#1F3041",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#395066",
    overflow: "hidden",
    shadowColor: "#0D1620",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  glow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -65,
    top: -95,
    backgroundColor: "rgba(217, 120, 83, 0.3)",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(217,120,83,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(242, 167, 125, 0.5)",
  },
  logoText: {
    color: "#F2A77D",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  brandCol: {
    gap: 1,
  },
  eyebrow: {
    color: "rgba(255, 233, 213, 0.7)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  brandText: {
    color: "#FFF5EC",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.15,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginLeft: 8,
  },
  moduleBadge: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(239, 228, 216, 0.28)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleBadgeText: {
    color: "#FFEFE1",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 228, 216, 0.35)",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: "#FFF3E8",
    fontSize: 15,
    fontWeight: "800",
  },
});