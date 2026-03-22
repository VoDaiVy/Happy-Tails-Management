import { StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface StatusBadgeProps {
  value: string;
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const normalized = value.toLowerCase();
  const tone = normalized.includes("cancel") || normalized.includes("failed")
    ? "danger"
    : normalized.includes("pending") || normalized.includes("draft")
      ? "warning"
      : normalized.includes("progress") || normalized.includes("scheduled")
        ? "info"
        : "success";

  return (
    <View style={[styles.badge, tone === "success" && styles.success, tone === "warning" && styles.warning, tone === "danger" && styles.danger, tone === "info" && styles.info]}>
      <Text style={styles.text}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: staffTheme.colors.textMuted,
    letterSpacing: 0.15,
  },
  success: { backgroundColor: "#EAF7F1", borderColor: "#C8EAD9" },
  warning: { backgroundColor: "#FFF5E8", borderColor: "#F7DAB2" },
  danger: { backgroundColor: "#FEEEEE", borderColor: "#F2C3C3" },
  info: { backgroundColor: "#ECF3FF", borderColor: "#CCDDFF" },
});
