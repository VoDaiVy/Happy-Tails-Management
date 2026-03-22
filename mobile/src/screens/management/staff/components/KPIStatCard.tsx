import { StyleSheet, Text, View } from "react-native";
import { staffTheme } from "../../../../theme/staffTheme";

interface KPIStatCardProps {
  label: string;
  value: string;
  trend?: string;
  icon?: string;
}

export function KPIStatCard({ label, value, trend, icon = "•" }: KPIStatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={styles.iconCircle}><Text style={styles.iconText}>{icon}</Text></View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {trend ? <Text style={styles.trend}>{trend}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: staffTheme.colors.surface,
    borderRadius: staffTheme.radius.xl,
    borderWidth: 1,
    borderColor: staffTheme.colors.borderSoft,
    padding: staffTheme.spacing.md,
    ...staffTheme.shadow.card,
    gap: 6,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: staffTheme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 12,
    fontWeight: "800",
    color: staffTheme.colors.primaryStrong,
  },
  label: {
    color: staffTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  value: {
    color: staffTheme.colors.text,
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  trend: {
    color: staffTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
});
